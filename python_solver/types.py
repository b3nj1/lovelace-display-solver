from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Literal


@dataclass
class StateObject:
    state: str
    attributes: dict[str, Any] = field(default_factory=dict)


@dataclass
class CrossEntityCondition:
    entity: str
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
    color: str
    glyph_name: str
    show_info: bool
    focus_mode: bool
    indicator_only: bool
    drive_zone_indicator: bool


def validate_entity_config(config: EntityConfig) -> list[str]:
    errors: list[str] = []

    if config.rules and config.thresholds:
        errors.append(
            f"Entity '{config.id}': 'rules' and 'thresholds' are mutually exclusive"
        )

    if config.rules:
        for i, rule in enumerate(config.rules):
            if rule.then.tier is not None and not rule.then.tier.strip():
                errors.append(
                    f"Entity '{config.id}', rule {i}: 'tier' must be a non-empty string"
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
