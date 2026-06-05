from __future__ import annotations

import re
from dataclasses import dataclass, field
from typing import Any, Literal, Optional

_TIME_RE = re.compile(r'^(?:[01]\d|2[0-3]):[0-5]\d$')


@dataclass
class StateObject:
    state: str
    attributes: dict[str, Any] = field(default_factory=dict)


@dataclass
class CrossEntityCondition:
    entity_id: str
    state: str


@dataclass
class WhenCondition:
    state: str | None = None
    range: tuple[float | None, float | None] | None = None
    above: float | None = None
    time_range: tuple[str, str] | None = None
    also: list[CrossEntityCondition] | None = None


@dataclass
class ThenAction:
    action: Literal["show", "hide", "indicator"] = "show"
    tier: str | None = None
    color: str | None = None
    show_info: bool | None = None
    # True = drive zone indicator while still showing the glyph (distinct from action="indicator" which hides the glyph)
    indicator: bool = False
    focus_mode: bool = False


@dataclass
class Rule:
    when: WhenCondition
    then: ThenAction


@dataclass
class ThresholdStep:
    above: float
    tier: str
    color: str | None = None


@dataclass
class EntityConfig:
    id: str
    entity_id: str
    glyph: str | None = None
    label: str | None = None
    value_format: str | None = None
    zone: str | None = None
    group: str | None = None
    rules: list[Rule] | None = None
    thresholds: list[ThresholdStep] | None = None
    color_scale: list[str] | None = None


@dataclass
class Defaults:
    unavailable_action: Literal["hide", "show"] = "hide"
    show_info: bool = True
    color_scale: list[str] = field(default_factory=lambda: ["orange", "red", "purple"])


@dataclass
class ActiveEntry:
    entity_config: EntityConfig
    tier: str
    color: str | None
    glyph_name: str
    show_info: bool
    focus_mode: bool
    indicator_only: bool
    drive_zone_indicator: bool


@dataclass
class GroupConfig:
    id: str
    collapse: Literal["overlay", "separate"] = "overlay"
    color_policy: Literal["most_urgent", "first_active", "member"] = "most_urgent"


@dataclass
class GlyphSize:
    px: int
    fits_cols: int


@dataclass
class LayoutEntry:
    icon_min: int
    icon_max: int
    size: str
    cols: int
    info_min: int
    info_max: int


@dataclass
class ZoneSlot:
    id: str
    position: str | dict[str, int]  # named shortcut or explicit {x, y, w, h}


@dataclass
class SeverityBarConfig:
    edge: str
    thickness_px: int
    color: str
    hide_when_idle: bool = True


@dataclass
class DisplayProfile:
    id: str
    type: str
    screen_px: tuple[int, int]
    margin_px: tuple[int, int]
    viewing_distance: str
    idle_glyph: str
    glyph_sizes: dict[str, GlyphSize]
    layouts: list[LayoutEntry]
    service: str | None = None
    burn_in_drift: bool = False
    zones: list[ZoneSlot] = field(default_factory=list)
    severity_bar: SeverityBarConfig | None = None
    font_glyphs: list[str] = field(default_factory=list)
    page_dwell_s: float = 5.0


@dataclass
class GlyphEntry:
    glyph_name: str
    x: int
    y: int
    size_px: int
    r: int
    g: int
    b: int


@dataclass
class InfoEntry:
    text: str
    x: int
    y: int
    r: int
    g: int
    b: int


@dataclass
class ZoneEntry:
    zone_id: str
    x: int
    y: int
    w: int
    h: int
    r: int
    g: int
    b: int
    shape: str


@dataclass
class SeverityBarEntry:
    x: int
    y: int
    w: int
    h: int
    r: int
    g: int
    b: int


@dataclass
class SolverResult:
    profile_id: str
    glyphs: list[GlyphEntry]
    info: list[InfoEntry]
    zones: list[ZoneEntry]
    severity_bar: SeverityBarEntry | None
    layout: LayoutEntry
    error: bool = False
    warnings: list[str] = field(default_factory=list)
    page_count: int = 1


def _is_empty_when(when: WhenCondition) -> bool:
    return (when.state is None and when.range is None
            and when.above is None and when.time_range is None
            and not when.also)


def validate_entity_config(config: EntityConfig) -> list[str]:
    errors: list[str] = []

    if not config.id.strip():
        errors.append(
            f"Entity config has empty 'id' field; every entity config must have a unique non-empty id"
        )

    if not config.entity_id.strip():
        errors.append(f"Entity '{config.id}': 'entity_id' must be a non-empty string")

    if config.rules and config.thresholds:
        errors.append(
            f"Entity '{config.id}': 'rules' and 'thresholds' are mutually exclusive"
        )

    if config.rules:
        for i, rule in enumerate(config.rules):
            if _is_empty_when(rule.when) and i < len(config.rules) - 1:
                errors.append(
                    f"Entity '{config.id}', rule {i}: 'when' has no conditions (always matches);"
                    f" subsequent rules will never be evaluated"
                )
            if rule.then.tier is not None and not rule.then.tier.strip():
                errors.append(
                    f"Entity '{config.id}', rule {i}: 'tier' must be a non-empty string"
                )
            if rule.then.action not in {"show", "hide", "indicator"}:
                errors.append(
                    f"Entity '{config.id}', rule {i}: 'action' must be one of 'show', 'hide', 'indicator'; got '{rule.then.action}'"
                )
            if rule.when.range is not None:
                lo, hi = rule.when.range
                if lo is not None and hi is not None and lo > hi:
                    errors.append(
                        f"Entity '{config.id}', rule {i}: 'range' lower bound {lo} is greater than upper bound {hi} — this will never match"
                    )
            if rule.when.state is not None and (rule.when.range is not None or rule.when.above is not None):
                errors.append(
                    f"Entity '{config.id}', rule {i}: 'when.state' and 'when.range'/'when.above' are"
                    f" incompatible in the same rule — 'state' is a string match, range/above require a float"
                )
            if rule.when.time_range is not None:
                start, end = rule.when.time_range
                if not _TIME_RE.match(start) or not _TIME_RE.match(end):
                    errors.append(
                        f"Entity '{config.id}', rule {i}: 'time_range' values must be in HH:MM format"
                        f" (got '{start}', '{end}')"
                    )
            if rule.when.also:
                for j, cond in enumerate(rule.when.also):
                    if not cond.entity_id.strip():
                        errors.append(
                            f"Entity '{config.id}', rule {i}, also[{j}]: 'entity_id' must be a non-empty string"
                        )

    if config.thresholds:
        prev: float | None = None
        for i, step in enumerate(config.thresholds):
            if not step.tier.strip():
                errors.append(
                    f"Entity '{config.id}', threshold {i}: 'tier' must be a non-empty string"
                )
            if prev is not None and step.above <= prev:
                errors.append(
                    f"Entity '{config.id}': threshold 'above' values must be strictly increasing"
                    f" (step {i} value {step.above} is not greater than {prev})"
                )
            prev = step.above

    return errors
