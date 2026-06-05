from __future__ import annotations

from datetime import datetime

from .types import (
    ActiveEntry,
    Defaults,
    EntityConfig,
    StateObject,
    ThresholdStep,
    WhenCondition,
)

_UNAVAILABLE_STATES = frozenset(("unavailable", "unknown"))


def evaluate_entity(
    config: EntityConfig,
    states: dict[str, StateObject],
    tiers: list[str],
    defaults: Defaults,
    now: datetime | None = None,
) -> ActiveEntry | None:
    if now is None:
        now = datetime.now()

    glyph_name = _resolve_glyph(config, states)
    state_obj = states.get(config.entity_id)
    state_str: str | None = state_obj.state if state_obj is not None else None
    is_unavailable = state_str is None or state_str in _UNAVAILABLE_STATES

    if is_unavailable and not _has_unavailable_override(config, state_str, states):
        if defaults.unavailable_action == "hide":
            return None
        fallback_tier = tiers[-1] if tiers else "status"
        return ActiveEntry(
            entity_config=config,
            tier=fallback_tier,
            color=None,
            glyph_name=glyph_name,
            show_info=defaults.show_info,
            focus_mode=False,
            indicator_only=False,
            drive_zone_indicator=False,
        )

    if config.rules:
        return _evaluate_rules(
            config, state_str or "", states, tiers, defaults, now, glyph_name
        )

    if config.thresholds:
        return _evaluate_thresholds(config, state_str or "", defaults, glyph_name)

    return None


def apply_focus_mode(
    entries: list[ActiveEntry], tiers: list[str]
) -> list[ActiveEntry]:
    # Caller must supply tiers in most-urgent-first order; tiers[0] is treated as the critical tier.
    if not any(e.focus_mode for e in entries):
        return list(entries)
    most_urgent = tiers[0] if tiers else ""
    return [e for e in entries if e.tier == most_urgent]


# ── private helpers ────────────────────────────────────────────────────────────


def _resolve_glyph(config: EntityConfig, states: dict[str, StateObject]) -> str:
    if config.glyph == "entity":
        obj = states.get(config.entity_id)
        return obj.attributes.get("icon", "") if obj is not None else ""
    return config.glyph or ""


def _has_unavailable_override(
    config: EntityConfig,
    state_str: str | None,
    states: dict[str, StateObject],
) -> bool:
    if not config.rules:
        return False
    check = {state_str} if state_str is not None else _UNAVAILABLE_STATES
    # When state is None (entity missing), any explicit unavailable/unknown rule is an override.
    # When state is a concrete string, only an exact-match rule is an override.
    # A rule with 'also' conditions is only a reliable override when those conditions currently hold.
    for r in config.rules:
        if r.when.state not in check:
            continue
        if r.when.also:
            if all(
                (obj := states.get(cond.entity_id)) is not None and obj.state == cond.state
                for cond in r.when.also
            ):
                return True
        else:
            return True
    return False


def _match_when(
    when: WhenCondition,
    state_str: str,
    states: dict[str, StateObject],
    now: datetime,
) -> bool:
    if when.state is not None and state_str != when.state:
        return False

    if when.range is not None:
        try:
            val = float(state_str)
        except ValueError:
            return False
        lo, hi = when.range
        if lo is not None and val < lo:
            return False
        if hi is not None and val > hi:
            return False

    if when.above is not None:
        try:
            val = float(state_str)
        except ValueError:
            return False
        if val <= when.above:
            return False

    if when.time_range is not None and not _check_time_range(when.time_range, now):
        return False

    if when.also:
        for cond in when.also:
            other = states.get(cond.entity_id)
            if other is None or other.state != cond.state:
                return False

    return True


def _check_time_range(time_range: tuple[str, str], now: datetime) -> bool:
    current = now.strftime("%H:%M")
    start, end = time_range
    if start <= end:
        return start <= current < end
    # Midnight-crossing window (e.g. "22:00" to "06:00")
    return current >= start or current < end


def _evaluate_rules(
    config: EntityConfig,
    state_str: str,
    states: dict[str, StateObject],
    tiers: list[str],
    defaults: Defaults,
    now: datetime,
    glyph_name: str,
) -> ActiveEntry | None:
    assert config.rules is not None
    for rule in config.rules:
        if not _match_when(rule.when, state_str, states, now):
            continue
        then = rule.then
        if then.action == "hide":
            return None
        tier = then.tier or (tiers[-1] if tiers else "status")
        color = then.color
        show_info = then.show_info if then.show_info is not None else defaults.show_info
        indicator_only = then.action == "indicator"
        # indicator_only: glyph hidden; then.indicator: glyph shown but zone still driven
        drive_zone = indicator_only or then.indicator
        return ActiveEntry(
            entity_config=config,
            tier=tier,
            color=color,
            glyph_name=glyph_name,
            show_info=show_info,
            focus_mode=then.focus_mode,
            indicator_only=indicator_only,
            drive_zone_indicator=drive_zone,
        )
    return None


def _evaluate_thresholds(
    config: EntityConfig,
    state_str: str,
    defaults: Defaults,
    glyph_name: str,
) -> ActiveEntry | None:
    assert config.thresholds is not None
    try:
        val = float(state_str)
    except ValueError:
        return None

    color_scale = config.color_scale or defaults.color_scale
    matched_step: ThresholdStep | None = None
    matched_index = -1

    # Thresholds must be in strictly ascending 'above' order (validated by validate_entity_config).
    # Iterating forward and keeping the last match gives the highest threshold the value has crossed.
    for i, step in enumerate(config.thresholds):
        if val > step.above:
            matched_step = step
            matched_index = i

    if matched_step is None:
        return None

    if matched_step.color is not None:
        color = matched_step.color
    elif color_scale:
        color = color_scale[matched_index % len(color_scale)]
    else:
        color = None

    return ActiveEntry(
        entity_config=config,
        tier=matched_step.tier,
        color=color,
        glyph_name=glyph_name,
        show_info=defaults.show_info,
        focus_mode=False,
        indicator_only=False,
        drive_zone_indicator=False,
    )
