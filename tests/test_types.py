"""Instantiation and validation tests for python_solver/types.py."""

import pytest
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


# ── instantiation ──────────────────────────────────────────────────────────────


def test_state_object_defaults():
    obj = StateObject(state="on")
    assert obj.state == "on"
    assert obj.attributes == {}


def test_when_condition_all_none_by_default():
    when = WhenCondition()
    assert when.state is None
    assert when.range is None
    assert when.above is None
    assert when.time_range is None
    assert when.also is None


def test_then_action_defaults():
    then = ThenAction()
    assert then.action == "show"
    assert then.tier is None
    assert then.color is None
    assert then.show_info is None
    assert then.indicator is False
    assert then.focus_mode is False


def test_entity_config_minimal():
    cfg = EntityConfig(id="x", entity_id="sensor.x")
    assert cfg.glyph is None
    assert cfg.rules is None
    assert cfg.thresholds is None
    assert cfg.color_scale is None


def test_defaults_mutable_field_isolation():
    d1 = Defaults()
    d2 = Defaults()
    d1.color_scale.append("blue")
    assert "blue" not in d2.color_scale, "default_factory must not share list instances"


def test_active_entry_fields():
    cfg = EntityConfig(id="a", entity_id="sensor.a")
    entry = ActiveEntry(
        entity_config=cfg,
        tier="alert",
        color="red",
        glyph_name="fire",
        show_info=True,
        focus_mode=False,
        indicator_only=False,
        drive_zone_indicator=False,
    )
    assert entry.tier == "alert"
    assert entry.color == "red"


# ── validate_entity_config ─────────────────────────────────────────────────────


def _make_rule(state: str = "on", action: str = "show", tier: str = "alert") -> Rule:
    return Rule(
        when=WhenCondition(state=state),
        then=ThenAction(action=action, tier=tier),
    )


def _make_threshold(above: float, tier: str = "alert") -> ThresholdStep:
    return ThresholdStep(above=above, tier=tier)


def test_validate_clean_rules_config():
    cfg = EntityConfig(
        id="door",
        entity_id="binary_sensor.door",
        rules=[_make_rule("on"), _make_rule("off", "hide", None)],
    )
    assert validate_entity_config(cfg) == []


def test_validate_clean_thresholds_config():
    cfg = EntityConfig(
        id="co2",
        entity_id="sensor.co2",
        thresholds=[_make_threshold(1000), _make_threshold(2000, "critical")],
    )
    assert validate_entity_config(cfg) == []


def test_validate_rules_and_thresholds_mutual_exclusion():
    cfg = EntityConfig(
        id="bad",
        entity_id="sensor.bad",
        rules=[_make_rule()],
        thresholds=[_make_threshold(500)],
    )
    errors = validate_entity_config(cfg)
    assert len(errors) == 1
    assert "mutually exclusive" in errors[0]
    assert "bad" in errors[0]


def test_validate_thresholds_strictly_increasing():
    cfg = EntityConfig(
        id="co2",
        entity_id="sensor.co2",
        thresholds=[
            _make_threshold(2000),
            _make_threshold(1000),  # not increasing
        ],
    )
    errors = validate_entity_config(cfg)
    assert any("strictly increasing" in e for e in errors)


def test_validate_thresholds_equal_values_rejected():
    cfg = EntityConfig(
        id="co2",
        entity_id="sensor.co2",
        thresholds=[_make_threshold(1000), _make_threshold(1000)],
    )
    errors = validate_entity_config(cfg)
    assert any("strictly increasing" in e for e in errors)


def test_validate_empty_tier_in_threshold():
    cfg = EntityConfig(
        id="co2",
        entity_id="sensor.co2",
        thresholds=[ThresholdStep(above=1000, tier="  ")],
    )
    errors = validate_entity_config(cfg)
    assert any("non-empty" in e for e in errors)


def test_validate_empty_tier_in_rule():
    cfg = EntityConfig(
        id="door",
        entity_id="binary_sensor.door",
        rules=[Rule(when=WhenCondition(state="on"), then=ThenAction(tier="   "))],
    )
    errors = validate_entity_config(cfg)
    assert any("non-empty" in e for e in errors)


def test_validate_no_rules_no_thresholds_is_valid():
    cfg = EntityConfig(id="x", entity_id="sensor.x")
    assert validate_entity_config(cfg) == []


def test_validate_invalid_action_value():
    cfg = EntityConfig(
        id="light",
        entity_id="light.bedroom",
        rules=[Rule(when=WhenCondition(state="on"), then=ThenAction(action="fly"))],
    )
    errors = validate_entity_config(cfg)
    assert len(errors) > 0
    assert any("light" in e and "fly" in e for e in errors)


def test_validate_range_lo_gt_hi():
    cfg = EntityConfig(
        id="temp",
        entity_id="sensor.temperature",
        rules=[Rule(when=WhenCondition(range=(50.0, 10.0)), then=ThenAction())],
    )
    errors = validate_entity_config(cfg)
    assert len(errors) > 0
    assert any("50.0" in e and "10.0" in e for e in errors)


def test_validate_time_range_invalid_format():
    cfg = EntityConfig(
        id="sched",
        entity_id="sensor.sched",
        rules=[Rule(when=WhenCondition(time_range=("25:99", "06:00")), then=ThenAction())],
    )
    errors = validate_entity_config(cfg)
    assert len(errors) > 0
    assert any("HH:MM" in e for e in errors)


def test_validate_empty_entity_id():
    cfg = EntityConfig(id="empty", entity_id="")
    errors = validate_entity_config(cfg)
    assert len(errors) > 0
    assert any("entity_id" in e for e in errors)


def test_validate_empty_id():
    cfg = EntityConfig(id="", entity_id="sensor.x")
    errors = validate_entity_config(cfg)
    assert len(errors) > 0
    assert any("id" in e for e in errors)


def test_validate_state_and_range_combined():
    cfg = EntityConfig(
        id="conflict",
        entity_id="sensor.conflict",
        rules=[Rule(when=WhenCondition(state="on", range=(0.0, 100.0)), then=ThenAction())],
    )
    errors = validate_entity_config(cfg)
    assert len(errors) > 0


def test_also_only_rule_not_empty_when_warning():
    """A rule with only 'also' conditions must not trigger the always-matches warning."""
    cfg = EntityConfig(
        id="also_test",
        entity_id="sensor.also_test",
        rules=[
            Rule(
                when=WhenCondition(also=[CrossEntityCondition(entity_id="x", state="on")]),
                then=ThenAction(tier="alert"),
            ),
            _make_rule("off", "hide", None),
        ],
    )
    errors = validate_entity_config(cfg)
    assert errors == []


def test_validate_also_empty_entity_id():
    """An also condition with an empty entity_id must produce a validation error."""
    cfg = EntityConfig(
        id="also_empty",
        entity_id="sensor.also_empty",
        rules=[
            Rule(
                when=WhenCondition(also=[CrossEntityCondition(entity_id="", state="on")]),
                then=ThenAction(tier="alert"),
            ),
        ],
    )
    errors = validate_entity_config(cfg)
    assert len(errors) > 0
    assert any("entity_id" in e for e in errors)
