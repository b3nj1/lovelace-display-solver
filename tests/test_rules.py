"""Rule evaluation tests for python_solver/rules.py."""

from datetime import datetime

import pytest
from python_solver.rules import apply_focus_mode, evaluate_entity
from python_solver.types import (
    ActiveEntry,
    CrossEntityCondition,
    Defaults,
    EntityConfig,
    Rule,
    StateObject,
    ThresholdStep,
    ThenAction,
    WhenCondition,
    validate_entity_config,
)

TIERS = ["critical", "alert", "status", "ambient"]
DEFAULTS = Defaults(unavailable_action="hide", show_info=True)


def _state(s: str, **attrs) -> StateObject:
    return StateObject(state=s, attributes=attrs)


def _rule(when: WhenCondition, then: ThenAction) -> Rule:
    return Rule(when=when, then=then)


def _show(tier: str, color: str = "red", **kwargs) -> ThenAction:
    return ThenAction(action="show", tier=tier, color=color, **kwargs)


def _hide() -> ThenAction:
    return ThenAction(action="hide")


# ── boolean entity ─────────────────────────────────────────────────────────────


def test_boolean_on_shows():
    cfg = EntityConfig(
        id="door",
        entity_id="binary_sensor.door",
        glyph="garage",
        rules=[
            _rule(WhenCondition(state="off"), _hide()),
            _rule(WhenCondition(state="on"), _show("critical", "red")),
        ],
    )
    states = {"binary_sensor.door": _state("on")}
    entry = evaluate_entity(cfg, states, TIERS, DEFAULTS)
    assert entry is not None
    assert entry.tier == "critical"
    assert entry.color == "red"
    assert entry.glyph_name == "garage"


def test_boolean_off_hides():
    cfg = EntityConfig(
        id="door",
        entity_id="binary_sensor.door",
        glyph="garage",
        rules=[
            _rule(WhenCondition(state="off"), _hide()),
            _rule(WhenCondition(state="on"), _show("critical")),
        ],
    )
    states = {"binary_sensor.door": _state("off")}
    result = evaluate_entity(cfg, states, TIERS, DEFAULTS)
    assert result is None


# ── unavailable entity ─────────────────────────────────────────────────────────


def test_unavailable_hides_by_default():
    cfg = EntityConfig(
        id="sensor",
        entity_id="sensor.co2",
        rules=[_rule(WhenCondition(state="on"), _show("alert"))],
    )
    states = {"sensor.co2": _state("unavailable")}
    result = evaluate_entity(cfg, states, TIERS, DEFAULTS)
    assert result is None


def test_missing_entity_hides_by_default():
    cfg = EntityConfig(
        id="sensor",
        entity_id="sensor.co2",
        rules=[_rule(WhenCondition(state="on"), _show("alert"))],
    )
    result = evaluate_entity(cfg, {}, TIERS, DEFAULTS)
    assert result is None


def test_unknown_state_hides_by_default():
    cfg = EntityConfig(
        id="sensor",
        entity_id="sensor.co2",
        rules=[_rule(WhenCondition(state="on"), _show("alert"))],
    )
    states = {"sensor.co2": _state("unknown")}
    result = evaluate_entity(cfg, states, TIERS, DEFAULTS)
    assert result is None


def test_unavailable_explicit_override_shows():
    cfg = EntityConfig(
        id="pool",
        entity_id="switch.pool",
        glyph="pool",
        rules=[
            _rule(WhenCondition(state="unavailable"), _show("critical", "red")),
            _rule(WhenCondition(state="on"), ThenAction(action="indicator", tier="ambient", color="blue")),
        ],
    )
    states = {"switch.pool": _state("unavailable")}
    entry = evaluate_entity(cfg, states, TIERS, DEFAULTS)
    assert entry is not None
    assert entry.tier == "critical"


def test_unavailable_action_show_returns_entry():
    cfg = EntityConfig(
        id="sensor",
        entity_id="sensor.x",
        rules=[_rule(WhenCondition(state="on"), _show("alert"))],
    )
    defaults = Defaults(unavailable_action="show")
    states = {"sensor.x": _state("unavailable")}
    entry = evaluate_entity(cfg, states, TIERS, defaults)
    assert entry is not None
    assert entry.tier == TIERS[-1]


# ── thresholds ─────────────────────────────────────────────────────────────────


def _co2_config(color_scale: list[str] | None = None) -> EntityConfig:
    return EntityConfig(
        id="co2",
        entity_id="sensor.co2",
        glyph="mdi:molecule-co2",
        color_scale=color_scale,
        thresholds=[
            ThresholdStep(above=1000, tier="alert"),
            ThresholdStep(above=2000, tier="critical"),
            ThresholdStep(above=4500, tier="critical"),
        ],
    )


def test_threshold_below_first_hides():
    cfg = _co2_config()
    states = {"sensor.co2": _state("999")}
    result = evaluate_entity(cfg, states, TIERS, DEFAULTS)
    assert result is None


def test_threshold_at_first_boundary():
    cfg = _co2_config()
    states = {"sensor.co2": _state("1001")}
    entry = evaluate_entity(cfg, states, TIERS, DEFAULTS)
    assert entry is not None
    assert entry.tier == "alert"
    assert entry.color == DEFAULTS.color_scale[0]  # "orange"


def test_threshold_at_second_boundary():
    cfg = _co2_config()
    states = {"sensor.co2": _state("2001")}
    entry = evaluate_entity(cfg, states, TIERS, DEFAULTS)
    assert entry is not None
    assert entry.tier == "critical"
    assert entry.color == DEFAULTS.color_scale[1]  # "red"


def test_threshold_at_third_boundary():
    cfg = _co2_config()
    states = {"sensor.co2": _state("5000")}
    entry = evaluate_entity(cfg, states, TIERS, DEFAULTS)
    assert entry is not None
    assert entry.tier == "critical"
    assert entry.color == DEFAULTS.color_scale[2]  # "purple"


def test_threshold_exact_boundary_not_exceeded():
    # value == above means strictly greater than is NOT satisfied → use previous step
    cfg = _co2_config()
    states = {"sensor.co2": _state("1000")}
    result = evaluate_entity(cfg, states, TIERS, DEFAULTS)
    assert result is None  # 1000 is not > 1000


def test_threshold_explicit_color_overrides_scale():
    cfg = EntityConfig(
        id="co2",
        entity_id="sensor.co2",
        thresholds=[ThresholdStep(above=1000, tier="alert", color="blue")],
    )
    states = {"sensor.co2": _state("1500")}
    entry = evaluate_entity(cfg, states, TIERS, DEFAULTS)
    assert entry is not None
    assert entry.color == "blue"


def test_threshold_entity_color_scale_overrides_defaults():
    cfg = _co2_config(color_scale=["yellow", "orange", "red"])
    states = {"sensor.co2": _state("1001")}
    entry = evaluate_entity(cfg, states, TIERS, DEFAULTS)
    assert entry is not None
    assert entry.color == "yellow"


def test_threshold_strictly_increasing_validation():
    cfg = EntityConfig(
        id="co2",
        entity_id="sensor.co2",
        thresholds=[
            ThresholdStep(above=2000, tier="critical"),
            ThresholdStep(above=1000, tier="alert"),
        ],
    )
    errors = validate_entity_config(cfg)
    assert any("strictly increasing" in e for e in errors)


# ── when.also (cross-entity conditions) ───────────────────────────────────────


def test_when_also_both_met_matches():
    cfg = EntityConfig(
        id="lock",
        entity_id="lock.front",
        glyph="lock",
        rules=[
            _rule(
                WhenCondition(
                    state="unlocked",
                    also=[CrossEntityCondition(entity="binary_sensor.front_door", state="on")],
                ),
                _show("critical"),
            ),
            _rule(WhenCondition(state="unlocked"), _show("alert")),
            _rule(WhenCondition(state="locked"), _hide()),
        ],
    )
    states = {
        "lock.front": _state("unlocked"),
        "binary_sensor.front_door": _state("on"),
    }
    entry = evaluate_entity(cfg, states, TIERS, DEFAULTS)
    assert entry is not None
    assert entry.tier == "critical"


def test_when_also_one_condition_fails_falls_to_next_rule():
    cfg = EntityConfig(
        id="lock",
        entity_id="lock.front",
        glyph="lock",
        rules=[
            _rule(
                WhenCondition(
                    state="unlocked",
                    also=[CrossEntityCondition(entity="binary_sensor.front_door", state="on")],
                ),
                _show("critical"),
            ),
            _rule(WhenCondition(state="unlocked"), _show("alert")),
        ],
    )
    states = {
        "lock.front": _state("unlocked"),
        "binary_sensor.front_door": _state("off"),  # door closed
    }
    entry = evaluate_entity(cfg, states, TIERS, DEFAULTS)
    assert entry is not None
    assert entry.tier == "alert"


def test_when_also_missing_entity_fails():
    cfg = EntityConfig(
        id="lock",
        entity_id="lock.front",
        rules=[
            _rule(
                WhenCondition(
                    state="unlocked",
                    also=[CrossEntityCondition(entity="binary_sensor.front_door", state="on")],
                ),
                _show("critical"),
            ),
        ],
    )
    states = {"lock.front": _state("unlocked")}  # front_door missing
    result = evaluate_entity(cfg, states, TIERS, DEFAULTS)
    assert result is None


# ── when.time_range ────────────────────────────────────────────────────────────


_NIGHT_NOW = datetime(2025, 1, 15, 23, 0)   # 23:00
_MORNING_NOW = datetime(2025, 1, 15, 3, 0)   # 03:00
_DAY_NOW = datetime(2025, 1, 15, 12, 0)      # 12:00


def _time_range_cfg(start: str, end: str) -> EntityConfig:
    return EntityConfig(
        id="night",
        entity_id="sensor.light",
        glyph="light",
        rules=[
            _rule(
                WhenCondition(state="on", time_range=(start, end)),
                _show("status", "yellow"),
            ),
        ],
    )


def test_time_range_within_window_matches():
    cfg = _time_range_cfg("22:00", "06:00")
    states = {"sensor.light": _state("on")}
    entry = evaluate_entity(cfg, states, TIERS, DEFAULTS, now=_NIGHT_NOW)
    assert entry is not None


def test_time_range_outside_window_no_match():
    cfg = _time_range_cfg("22:00", "06:00")
    states = {"sensor.light": _state("on")}
    result = evaluate_entity(cfg, states, TIERS, DEFAULTS, now=_DAY_NOW)
    assert result is None


def test_time_range_midnight_crossing_morning_matches():
    cfg = _time_range_cfg("22:00", "06:00")
    states = {"sensor.light": _state("on")}
    entry = evaluate_entity(cfg, states, TIERS, DEFAULTS, now=_MORNING_NOW)
    assert entry is not None


def test_time_range_non_crossing_within():
    cfg = _time_range_cfg("08:00", "18:00")
    states = {"sensor.light": _state("on")}
    entry = evaluate_entity(cfg, states, TIERS, DEFAULTS, now=_DAY_NOW)
    assert entry is not None


def test_time_range_non_crossing_outside():
    cfg = _time_range_cfg("08:00", "18:00")
    states = {"sensor.light": _state("on")}
    result = evaluate_entity(cfg, states, TIERS, DEFAULTS, now=_NIGHT_NOW)
    assert result is None


# ── glyph: "entity" resolution ────────────────────────────────────────────────


def test_glyph_entity_resolved_from_attributes():
    cfg = EntityConfig(
        id="alarm",
        entity_id="alarm_control_panel.house",
        glyph="entity",
        rules=[_rule(WhenCondition(state="armed_away"), _show("critical"))],
    )
    states = {
        "alarm_control_panel.house": StateObject(
            state="armed_away", attributes={"icon": "mdi:shield-lock"}
        )
    }
    entry = evaluate_entity(cfg, states, TIERS, DEFAULTS)
    assert entry is not None
    assert entry.glyph_name == "mdi:shield-lock"


def test_glyph_entity_missing_attribute_falls_back_to_empty():
    cfg = EntityConfig(
        id="alarm",
        entity_id="alarm_control_panel.house",
        glyph="entity",
        rules=[_rule(WhenCondition(state="armed_away"), _show("critical"))],
    )
    states = {"alarm_control_panel.house": _state("armed_away")}
    entry = evaluate_entity(cfg, states, TIERS, DEFAULTS)
    assert entry is not None
    assert entry.glyph_name == ""


def test_glyph_literal_name_passed_through():
    cfg = EntityConfig(
        id="door",
        entity_id="binary_sensor.door",
        glyph="garage",
        rules=[_rule(WhenCondition(state="on"), _show("critical"))],
    )
    states = {"binary_sensor.door": _state("on")}
    entry = evaluate_entity(cfg, states, TIERS, DEFAULTS)
    assert entry is not None
    assert entry.glyph_name == "garage"


# ── apply_focus_mode ──────────────────────────────────────────────────────────


def _make_entry(tier: str, focus_mode: bool = False) -> ActiveEntry:
    cfg = EntityConfig(id=tier, entity_id=f"sensor.{tier}")
    return ActiveEntry(
        entity_config=cfg,
        tier=tier,
        color="red",
        glyph_name="icon",
        show_info=False,
        focus_mode=focus_mode,
        indicator_only=False,
        drive_zone_indicator=False,
    )


def test_focus_mode_suppresses_non_critical():
    entries = [
        _make_entry("critical", focus_mode=True),
        _make_entry("alert"),
        _make_entry("status"),
    ]
    result = apply_focus_mode(entries, TIERS)
    assert len(result) == 1
    assert result[0].tier == "critical"


def test_focus_mode_inactive_returns_all():
    entries = [
        _make_entry("critical"),
        _make_entry("alert"),
        _make_entry("status"),
    ]
    result = apply_focus_mode(entries, TIERS)
    assert len(result) == 3


def test_focus_mode_multiple_focus_entries_kept():
    entries = [
        _make_entry("critical", focus_mode=True),
        _make_entry("critical"),
        _make_entry("status"),
    ]
    result = apply_focus_mode(entries, TIERS)
    assert len(result) == 2
    assert all(e.tier == "critical" for e in result)


def test_focus_mode_uses_tiers_0_not_hardcoded():
    custom_tiers = ["urgent", "normal", "low"]
    entries = [
        _make_entry("urgent", focus_mode=True),
        _make_entry("normal"),
        _make_entry("low"),
    ]
    result = apply_focus_mode(entries, custom_tiers)
    assert len(result) == 1
    assert result[0].tier == "urgent"


# ── mutual exclusion validation ───────────────────────────────────────────────


def test_rules_and_thresholds_are_mutually_exclusive():
    cfg = EntityConfig(
        id="bad",
        entity_id="sensor.bad",
        rules=[_rule(WhenCondition(state="on"), _show("alert"))],
        thresholds=[ThresholdStep(above=100, tier="critical")],
    )
    errors = validate_entity_config(cfg)
    assert len(errors) >= 1
    assert any("mutually exclusive" in e for e in errors)
