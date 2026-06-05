from __future__ import annotations

import sys
import os
from typing import Any

import yaml

# Allow importing python_solver from parent directories when run standalone
_HERE = os.path.dirname(os.path.abspath(__file__))
_PROJECT_ROOT = os.path.abspath(os.path.join(_HERE, "..", "..", ".."))
if _PROJECT_ROOT not in sys.path:
    sys.path.insert(0, _PROJECT_ROOT)

from python_solver.types import (
    CrossEntityCondition,
    Defaults,
    DisplayProfile,
    EntityConfig,
    GlyphSize,
    GroupConfig,
    LayoutEntry,
    Rule,
    SeverityBarConfig,
    ThresholdStep,
    ThenAction,
    WhenCondition,
    ZoneSlot,
    validate_entity_config,
)

_VALID_PROFILE_TYPES = {"esphome", "canvas"}


def _parse_when(d: dict[str, Any], entity_id: str, rule_idx: int, errors: list[str]) -> WhenCondition:
    state = d.get("state")
    range_val = d.get("range")
    above = d.get("above")
    time_range = d.get("time_range")
    also_raw = d.get("also")

    parsed_range: tuple[float | None, float | None] | None = None
    if range_val is not None:
        try:
            lo, hi = range_val
            parsed_range = (
                float(lo) if lo is not None else None,
                float(hi) if hi is not None else None,
            )
        except (TypeError, ValueError) as exc:
            errors.append(
                f"Entity '{entity_id}', rule {rule_idx}: 'when.range' must be a two-element list; got {range_val!r} ({exc})"
            )

    parsed_above: float | None = None
    if above is not None:
        try:
            parsed_above = float(above)
        except (TypeError, ValueError) as exc:
            errors.append(
                f"Entity '{entity_id}', rule {rule_idx}: 'when.above' must be a number; got {above!r} ({exc})"
            )

    parsed_time_range: tuple[str, str] | None = None
    if time_range is not None:
        try:
            start, end = time_range
            parsed_time_range = (str(start), str(end))
        except (TypeError, ValueError) as exc:
            errors.append(
                f"Entity '{entity_id}', rule {rule_idx}: 'when.time_range' must be a two-element list; got {time_range!r} ({exc})"
            )

    parsed_also: list[CrossEntityCondition] | None = None
    if also_raw is not None:
        parsed_also = []
        for j, cond in enumerate(also_raw):
            if not isinstance(cond, dict):
                errors.append(
                    f"Entity '{entity_id}', rule {rule_idx}, also[{j}]: must be a mapping"
                )
                continue
            parsed_also.append(
                CrossEntityCondition(
                    entity_id=str(cond.get("entity_id", "")),
                    state=str(cond.get("state", "")),
                )
            )

    return WhenCondition(
        state=str(state) if state is not None else None,
        range=parsed_range,
        above=parsed_above,
        time_range=parsed_time_range,
        also=parsed_also,
    )


def _parse_then(d: dict[str, Any], entity_id: str, rule_idx: int, errors: list[str]) -> ThenAction:
    return ThenAction(
        action=str(d.get("action", "show")),
        tier=str(d["tier"]) if "tier" in d else None,
        color=str(d["color"]) if "color" in d else None,
        show_info=bool(d["show_info"]) if "show_info" in d else None,
        indicator=bool(d.get("indicator", False)),
        focus_mode=bool(d.get("focus_mode", False)),
    )


def _parse_entity_config(raw: dict[str, Any], errors: list[str]) -> EntityConfig | None:
    entity_id_str = str(raw.get("id", ""))
    if not entity_id_str.strip():
        errors.append("Entity config has empty 'id' field; every entity config must have a unique non-empty id")
        return None

    rules: list[Rule] | None = None
    if "rules" in raw:
        rules = []
        for i, rule_raw in enumerate(raw["rules"]):
            if not isinstance(rule_raw, dict):
                errors.append(f"Entity '{entity_id_str}', rule {i}: must be a mapping")
                continue
            when_raw = rule_raw.get("when", {})
            then_raw = rule_raw.get("then", {})
            when = _parse_when(when_raw, entity_id_str, i, errors)
            then = _parse_then(then_raw, entity_id_str, i, errors)
            rules.append(Rule(when=when, then=then))

    thresholds: list[ThresholdStep] | None = None
    if "thresholds" in raw:
        thresholds = []
        for i, step_raw in enumerate(raw["thresholds"]):
            if not isinstance(step_raw, dict):
                errors.append(f"Entity '{entity_id_str}', threshold {i}: must be a mapping")
                continue
            try:
                above = float(step_raw["above"])
            except (KeyError, TypeError, ValueError) as exc:
                errors.append(f"Entity '{entity_id_str}', threshold {i}: 'above' must be a number ({exc})")
                continue
            thresholds.append(
                ThresholdStep(
                    above=above,
                    tier=str(step_raw.get("tier", "")),
                    color=str(step_raw["color"]) if "color" in step_raw else None,
                )
            )

    cfg = EntityConfig(
        id=entity_id_str,
        entity_id=str(raw.get("entity_id", "")),
        glyph=str(raw["glyph"]) if "glyph" in raw else None,
        label=str(raw["label"]) if "label" in raw else None,
        value_format=str(raw["value_format"]) if "value_format" in raw else None,
        zone=str(raw["zone"]) if "zone" in raw else None,
        group=str(raw["group"]) if "group" in raw else None,
        rules=rules,
        thresholds=thresholds,
        color_scale=list(raw["color_scale"]) if "color_scale" in raw else None,
    )
    return cfg


def _parse_glyph_sizes(raw: dict[str, Any], profile_id: str, errors: list[str]) -> dict[str, GlyphSize]:
    result: dict[str, GlyphSize] = {}
    for size_name, size_val in raw.items():
        if not isinstance(size_val, dict):
            errors.append(f"Profile '{profile_id}': glyph_size '{size_name}' must be a mapping")
            continue
        try:
            result[str(size_name)] = GlyphSize(
                px=int(size_val["px"]),
                fits_cols=int(size_val.get("fits_cols", 1)),
            )
        except (KeyError, TypeError, ValueError) as exc:
            errors.append(f"Profile '{profile_id}': glyph_size '{size_name}' is invalid ({exc})")
    return result


def _parse_zones(raw: list[Any], profile_id: str, errors: list[str]) -> list[ZoneSlot]:
    result: list[ZoneSlot] = []
    for i, zone_raw in enumerate(raw):
        if not isinstance(zone_raw, dict):
            errors.append(f"Profile '{profile_id}', zone {i}: must be a mapping")
            continue
        zone_id = str(zone_raw.get("id", ""))
        position = zone_raw.get("position", "full")
        result.append(ZoneSlot(id=zone_id, position=position))
    return result


def _parse_severity_bar(raw: dict[str, Any], profile_id: str, errors: list[str]) -> SeverityBarConfig | None:
    try:
        return SeverityBarConfig(
            edge=str(raw.get("edge", "bottom")),
            thickness_px=int(raw.get("thickness_px", 4)),
            color=str(raw.get("color", "entity")),
            hide_when_idle=bool(raw.get("hide_when_idle", True)),
        )
    except (TypeError, ValueError) as exc:
        errors.append(f"Profile '{profile_id}': severity_bar is invalid ({exc})")
        return None


def _parse_display_profile(raw: dict[str, Any], errors: list[str]) -> DisplayProfile | None:
    profile_id = str(raw.get("id", ""))
    if not profile_id.strip():
        errors.append("Display profile has empty 'id' field")
        return None

    profile_type = str(raw.get("type", ""))
    if profile_type not in _VALID_PROFILE_TYPES:
        errors.append(
            f"Profile '{profile_id}': unknown type '{profile_type}'; valid types are {sorted(_VALID_PROFILE_TYPES)}"
        )

    screen_raw = raw.get("screen_px", [0, 0])
    margin_raw = raw.get("margin_px", [0, 0])
    try:
        screen_px = (int(screen_raw[0]), int(screen_raw[1]))
        margin_px = (int(margin_raw[0]), int(margin_raw[1]))
    except (TypeError, ValueError, IndexError) as exc:
        errors.append(f"Profile '{profile_id}': screen_px/margin_px must be two-element integer lists ({exc})")
        screen_px = (0, 0)
        margin_px = (0, 0)

    glyph_sizes_raw = raw.get("glyph_sizes", {})
    glyph_sizes = _parse_glyph_sizes(glyph_sizes_raw, profile_id, errors)

    layouts: list[LayoutEntry] = []
    for i, layout_raw in enumerate(raw.get("layouts", [])):
        if not isinstance(layout_raw, dict):
            errors.append(f"Profile '{profile_id}', layout {i}: must be a mapping")
            continue
        try:
            layouts.append(LayoutEntry.from_dict(layout_raw))
        except (ValueError, KeyError) as exc:
            errors.append(f"Profile '{profile_id}', layout {i}: {exc}")

    zones = _parse_zones(raw.get("zones", []), profile_id, errors)

    severity_bar: SeverityBarConfig | None = None
    if "severity_bar" in raw:
        severity_bar = _parse_severity_bar(raw["severity_bar"], profile_id, errors)

    return DisplayProfile(
        id=profile_id,
        type=profile_type,
        screen_px=screen_px,
        margin_px=margin_px,
        viewing_distance=str(raw.get("viewing_distance", "near")),
        idle_glyph=str(raw.get("idle_glyph", "")),
        glyph_sizes=glyph_sizes,
        layouts=layouts,
        service=str(raw["service"]) if "service" in raw else None,
        burn_in_drift=bool(raw.get("burn_in_drift", False)),
        zones=zones,
        severity_bar=severity_bar,
        font_glyphs=list(raw.get("font_glyphs", [])),
        page_dwell_s=float(raw.get("page_dwell_s", 5.0)),
    )


def _parse_defaults(raw: dict[str, Any]) -> Defaults:
    return Defaults(
        unavailable_action=raw.get("unavailable_action", "hide"),  # type: ignore[arg-type]
        show_info=bool(raw.get("show_info", True)),
        color_scale=list(raw.get("color_scale", ["orange", "red", "purple"])),
    )


def _parse_group_config(raw: dict[str, Any], errors: list[str]) -> GroupConfig | None:
    group_id = str(raw.get("id", ""))
    if not group_id.strip():
        errors.append("Group config has empty 'id' field")
        return None
    return GroupConfig(
        id=group_id,
        collapse=raw.get("collapse", "overlay"),  # type: ignore[arg-type]
        color_policy=raw.get("color_policy", "most_urgent"),  # type: ignore[arg-type]
    )


def load_config(path: str) -> tuple[list[EntityConfig], list[DisplayProfile], list[str], Defaults, list[GroupConfig]]:
    """
    Load and validate the solver YAML config file.
    Returns (entity_configs, display_profiles, tiers, defaults, groups).
    Raises ValueError with a clear message on schema errors (collect all, raise once).
    """
    with open(path, "r") as f:
        data = yaml.safe_load(f)

    if not isinstance(data, dict):
        raise ValueError("Config file must be a YAML mapping at the top level")

    errors: list[str] = []

    # Required: tiers
    if "tiers" not in data:
        errors.append("Missing required top-level key 'tiers'")
        tiers: list[str] = []
    else:
        tiers = [str(t) for t in data["tiers"]]

    # Defaults
    defaults_raw = data.get("defaults", {})
    defaults = _parse_defaults(defaults_raw) if isinstance(defaults_raw, dict) else Defaults()

    # Entity configs
    entity_configs: list[EntityConfig] = []
    for i, raw in enumerate(data.get("entities", [])):
        if not isinstance(raw, dict):
            errors.append(f"Entity {i}: must be a mapping")
            continue
        cfg = _parse_entity_config(raw, errors)
        if cfg is not None:
            entity_configs.append(cfg)

    # Validate tier references in entity rules
    if tiers:
        for cfg in entity_configs:
            if cfg.rules:
                for i, rule in enumerate(cfg.rules):
                    if rule.then.tier is not None and rule.then.tier not in tiers:
                        errors.append(
                            f"Entity '{cfg.id}', rule {i}: tier '{rule.then.tier}' is not declared in 'tiers' {tiers}"
                        )
            if cfg.thresholds:
                for i, step in enumerate(cfg.thresholds):
                    if step.tier and step.tier not in tiers:
                        errors.append(
                            f"Entity '{cfg.id}', threshold {i}: tier '{step.tier}' is not declared in 'tiers' {tiers}"
                        )

    # Validate each entity config (checks threshold monotonicity, etc.)
    for cfg in entity_configs:
        config_errors = validate_entity_config(cfg)
        errors.extend(config_errors)

    # Display profiles
    display_profiles: list[DisplayProfile] = []
    for i, raw in enumerate(data.get("display_profiles", [])):
        if not isinstance(raw, dict):
            errors.append(f"Display profile {i}: must be a mapping")
            continue
        profile = _parse_display_profile(raw, errors)
        if profile is not None:
            display_profiles.append(profile)

    # Groups
    groups: list[GroupConfig] = []
    for i, raw in enumerate(data.get("groups", [])):
        if not isinstance(raw, dict):
            errors.append(f"Group {i}: must be a mapping")
            continue
        grp = _parse_group_config(raw, errors)
        if grp is not None:
            groups.append(grp)

    if errors:
        formatted = "\n".join(f"  - {e}" for e in errors)
        raise ValueError(f"Config validation failed with {len(errors)} error(s):\n{formatted}")

    return entity_configs, display_profiles, tiers, defaults, groups
