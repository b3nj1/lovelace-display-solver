from __future__ import annotations

from datetime import datetime

import pytest

from python_solver.solver import solve, solve_all
from python_solver.types import (
    ActiveEntry,
    Defaults,
    DisplayProfile,
    EntityConfig,
    GlyphSize,
    GroupConfig,
    LayoutEntry,
    Rule,
    SeverityBarConfig,
    StateObject,
    ThenAction,
    WhenCondition,
    ZoneSlot,
)

_NOW = datetime(2024, 6, 1, 12, 0)


def _glyph_resolver(name: str) -> str:
    table = {"home": "", "warning": "", "alert": "", "idle": ""}
    return table.get(name, name)


def _make_profile(
    pid: str = "p1",
    viewing_distance: str = "near",
    screen_px: tuple[int, int] = (320, 240),
    layouts: list[LayoutEntry] | None = None,
    zones: list[ZoneSlot] | None = None,
    severity_bar: SeverityBarConfig | None = None,
    font_glyphs: list[str] | None = None,
    ptype: str = "canvas",
) -> DisplayProfile:
    return DisplayProfile(
        id=pid,
        type=ptype,
        screen_px=screen_px,
        margin_px=(8, 8),
        viewing_distance=viewing_distance,
        idle_glyph="idle",
        glyph_sizes={
            "large": GlyphSize(px=48, fits_cols=4),
            "medium": GlyphSize(px=32, fits_cols=6),
            "small": GlyphSize(px=24, fits_cols=8),
        },
        layouts=layouts or [
            LayoutEntry(icon_min=0, icon_max=8, size="large", cols=4, info_min=0, info_max=4),
        ],
        zones=zones or [],
        severity_bar=severity_bar,
        font_glyphs=font_glyphs or [],
    )


def _make_config(
    cid: str = "c1",
    entity_id: str = "sensor.test",
    glyph: str = "home",
    tier: str = "warning",
    color: str = "#ff8800",
    state_val: str = "on",
    zone: str | None = None,
    group: str | None = None,
    show_info: bool = True,
    focus_mode: bool = False,
) -> tuple[EntityConfig, dict[str, StateObject]]:
    cfg = EntityConfig(
        id=cid,
        entity_id=entity_id,
        glyph=glyph,
        label=cid,
        zone=zone,
        group=group,
        rules=[
            Rule(
                when=WhenCondition(state=state_val),
                then=ThenAction(
                    tier=tier, color=color, show_info=show_info, focus_mode=focus_mode
                ),
            )
        ],
    )
    states = {entity_id: StateObject(state=state_val)}
    return cfg, states


# ── single entity ──────────────────────────────────────────────────────────


def test_single_entity_active():
    cfg, states = _make_config()
    result = solve(
        entity_configs=[cfg],
        states=states,
        tiers=["critical", "warning", "info"],
        defaults=Defaults(),
        profile=_make_profile(),
        glyph_resolver=_glyph_resolver,
        groups=[],
        now=_NOW,
    )
    assert not result.error
    assert len(result.glyphs) == 1
    assert result.glyphs[0].glyph_name == "home"


# ── multi-display ──────────────────────────────────────────────────────────


def test_multi_display_different_layouts():
    cfg, states = _make_config()
    far_profile = _make_profile(
        pid="far",
        viewing_distance="far",
        layouts=[
            LayoutEntry(icon_min=0, icon_max=4, size="large", cols=2, info_min=0, info_max=0),
        ],
    )
    near_profile = _make_profile(
        pid="near",
        viewing_distance="near",
        screen_px=(480, 320),
        layouts=[
            LayoutEntry(icon_min=0, icon_max=8, size="medium", cols=4, info_min=0, info_max=4),
        ],
    )
    results = solve_all(
        entity_configs=[cfg],
        states=states,
        tiers=["critical", "warning", "info"],
        defaults=Defaults(),
        profiles=[far_profile, near_profile],
        glyph_resolver=_glyph_resolver,
        groups=[],
        now=_NOW,
    )
    assert len(results) == 2
    assert results[0].layout.size == "large"
    assert results[1].layout.size == "medium"


# ── focus mode ─────────────────────────────────────────────────────────────


def test_focus_mode_suppresses_non_critical():
    cfg_critical, states1 = _make_config(
        cid="c1", entity_id="sensor.a", tier="critical",
        color="#ff0000", state_val="on", focus_mode=True
    )
    cfg_warning, states2 = _make_config(
        cid="c2", entity_id="sensor.b", tier="warning",
        color="#ff8800", state_val="on"
    )
    states = {**states1, **states2}
    result = solve(
        entity_configs=[cfg_critical, cfg_warning],
        states=states,
        tiers=["critical", "warning", "info"],
        defaults=Defaults(),
        profile=_make_profile(),
        glyph_resolver=_glyph_resolver,
        groups=[],
        now=_NOW,
    )
    assert not result.error
    assert all(g.glyph_name == "home" for g in result.glyphs)
    assert len(result.glyphs) == 1


# ── groups ─────────────────────────────────────────────────────────────────


def test_groups_overlay_two_members_one_slot():
    cfg1, states1 = _make_config(cid="c1", entity_id="sensor.a", group="g1")
    cfg2, states2 = _make_config(cid="c2", entity_id="sensor.b", group="g1")
    cfg1.group = "g1"
    cfg2.group = "g1"
    states = {**states1, **states2}
    group = GroupConfig(id="g1", collapse="overlay")
    result = solve(
        entity_configs=[cfg1, cfg2],
        states=states,
        tiers=["critical", "warning", "info"],
        defaults=Defaults(),
        profile=_make_profile(),
        glyph_resolver=_glyph_resolver,
        groups=[group],
        now=_NOW,
    )
    assert not result.error
    # Both members placed at same slot — 2 GlyphEntry objects (overlay) but 1 slot counted
    assert result.page_count == 1


def test_groups_separate_two_members_two_slots():
    cfg1, states1 = _make_config(cid="c1", entity_id="sensor.a", group="g2")
    cfg2, states2 = _make_config(cid="c2", entity_id="sensor.b", group="g2")
    cfg1.group = "g2"
    cfg2.group = "g2"
    states = {**states1, **states2}
    group = GroupConfig(id="g2", collapse="separate", color_policy="member")
    result = solve(
        entity_configs=[cfg1, cfg2],
        states=states,
        tiers=["critical", "warning", "info"],
        defaults=Defaults(),
        profile=_make_profile(),
        glyph_resolver=_glyph_resolver,
        groups=[group],
        now=_NOW,
    )
    assert not result.error
    assert len(result.glyphs) == 2


# ── info lines ─────────────────────────────────────────────────────────────


def test_info_lines_sorted_by_tier():
    cfg1, states1 = _make_config(cid="c1", entity_id="sensor.a", tier="info", state_val="5")
    cfg2, states2 = _make_config(cid="c2", entity_id="sensor.b", tier="critical", state_val="3")
    states = {**states1, **states2}
    result = solve(
        entity_configs=[cfg1, cfg2],
        states=states,
        tiers=["critical", "warning", "info"],
        defaults=Defaults(),
        profile=_make_profile(),
        glyph_resolver=_glyph_resolver,
        groups=[],
        now=_NOW,
    )
    assert len(result.info) == 2
    # Critical should come first
    assert "c2" in result.info[0].text


# ── zone indicators ────────────────────────────────────────────────────────


def test_zone_indicator_highest_tier_wins():
    zone_slot = ZoneSlot(id="z1", position="top-left")
    cfg1, states1 = _make_config(
        cid="c1", entity_id="sensor.a", tier="critical", color="#ff0000",
        state_val="on", zone="z1"
    )
    cfg2, states2 = _make_config(
        cid="c2", entity_id="sensor.b", tier="info", color="#0088ff",
        state_val="on", zone="z1"
    )
    states = {**states1, **states2}
    result = solve(
        entity_configs=[cfg1, cfg2],
        states=states,
        tiers=["critical", "warning", "info"],
        defaults=Defaults(),
        profile=_make_profile(zones=[zone_slot]),
        glyph_resolver=_glyph_resolver,
        groups=[],
        now=_NOW,
    )
    assert len(result.zones) == 1
    assert result.zones[0].zone_id == "z1"
    assert result.zones[0].r == 255  # #ff0000 = critical color


def test_inactive_zone_no_entry():
    zone_slot = ZoneSlot(id="z1", position="top-left")
    cfg, states = _make_config(cid="c1", entity_id="sensor.a", zone=None)
    result = solve(
        entity_configs=[cfg],
        states=states,
        tiers=["critical", "warning", "info"],
        defaults=Defaults(),
        profile=_make_profile(zones=[zone_slot]),
        glyph_resolver=_glyph_resolver,
        groups=[],
        now=_NOW,
    )
    assert result.zones == []


# ── severity bar ───────────────────────────────────────────────────────────


def test_severity_bar_fill_ratio_per_tier():
    tiers = ["critical", "warning", "info"]
    sbar = SeverityBarConfig(edge="bottom", thickness_px=4, color="entity", hide_when_idle=True)
    profile = _make_profile(severity_bar=sbar)

    for i, tier in enumerate(tiers):
        cfg, states = _make_config(cid="c1", entity_id="sensor.a", tier=tier, state_val="on")
        result = solve(
            entity_configs=[cfg],
            states=states,
            tiers=tiers,
            defaults=Defaults(),
            profile=profile,
            glyph_resolver=_glyph_resolver,
            groups=[],
            now=_NOW,
        )
        assert result.severity_bar is not None
        n = len(tiers)
        expected_ratio = (n - i) / n
        sw = profile.screen_px[0]
        assert result.severity_bar.w == int(sw * expected_ratio)


def test_severity_bar_none_when_idle_hide_when_idle():
    sbar = SeverityBarConfig(edge="bottom", thickness_px=4, color="#ffffff", hide_when_idle=True)
    profile = _make_profile(severity_bar=sbar)
    # No active entries — empty state
    result = solve(
        entity_configs=[],
        states={},
        tiers=["critical", "warning", "info"],
        defaults=Defaults(),
        profile=profile,
        glyph_resolver=_glyph_resolver,
        groups=[],
        now=_NOW,
    )
    assert result.severity_bar is None


# ── idle glyph ─────────────────────────────────────────────────────────────


def test_idle_glyph_emitted_when_empty():
    result = solve(
        entity_configs=[],
        states={},
        tiers=["critical", "warning", "info"],
        defaults=Defaults(),
        profile=_make_profile(),
        glyph_resolver=_glyph_resolver,
        groups=[],
        now=_NOW,
    )
    assert len(result.glyphs) == 1
    assert result.glyphs[0].glyph_name == "idle"


# ── no layout match ────────────────────────────────────────────────────────


def test_no_layout_match_error_true():
    profile = _make_profile(
        layouts=[LayoutEntry(icon_min=5, icon_max=8, size="large", cols=4, info_min=0, info_max=0)]
    )
    cfg, states = _make_config()  # 1 active icon → won't match icon_min=5
    result = solve(
        entity_configs=[cfg],
        states=states,
        tiers=["critical", "warning", "info"],
        defaults=Defaults(),
        profile=profile,
        glyph_resolver=_glyph_resolver,
        groups=[],
        now=_NOW,
    )
    assert result.error is True


# ── icon paging ────────────────────────────────────────────────────────────


def _make_n_configs(n: int) -> tuple[list[EntityConfig], dict[str, StateObject]]:
    configs = []
    states = {}
    for i in range(n):
        eid = f"sensor.e{i}"
        cfg = EntityConfig(
            id=f"c{i}",
            entity_id=eid,
            glyph="home",
            rules=[Rule(when=WhenCondition(state="on"), then=ThenAction(tier="warning", color="#ff8800"))],
        )
        configs.append(cfg)
        states[eid] = StateObject(state="on")
    return configs, states


def test_paging_5_icons_max4_page_count_2():
    configs, states = _make_n_configs(5)
    profile = _make_profile(
        layouts=[LayoutEntry(icon_min=0, icon_max=4, size="large", cols=4, info_min=0, info_max=0)]
    )
    result = solve(
        entity_configs=configs,
        states=states,
        tiers=["critical", "warning", "info"],
        defaults=Defaults(),
        profile=profile,
        glyph_resolver=_glyph_resolver,
        groups=[],
        current_page=0,
        now=_NOW,
    )
    assert result.page_count == 2
    assert len(result.glyphs) == 4


def test_paging_page1_returns_remaining():
    configs, states = _make_n_configs(5)
    profile = _make_profile(
        layouts=[LayoutEntry(icon_min=0, icon_max=4, size="large", cols=4, info_min=0, info_max=0)]
    )
    result = solve(
        entity_configs=configs,
        states=states,
        tiers=["critical", "warning", "info"],
        defaults=Defaults(),
        profile=profile,
        glyph_resolver=_glyph_resolver,
        groups=[],
        current_page=1,
        now=_NOW,
    )
    assert result.page_count == 2
    assert len(result.glyphs) == 1


def test_paging_exact_max_page_count_1():
    configs, states = _make_n_configs(4)
    profile = _make_profile(
        layouts=[LayoutEntry(icon_min=0, icon_max=4, size="large", cols=4, info_min=0, info_max=0)]
    )
    result = solve(
        entity_configs=configs,
        states=states,
        tiers=["critical", "warning", "info"],
        defaults=Defaults(),
        profile=profile,
        glyph_resolver=_glyph_resolver,
        groups=[],
        current_page=0,
        now=_NOW,
    )
    assert result.page_count == 1
    assert len(result.glyphs) == 4


def test_error_only_on_no_layout_match_not_overflow():
    configs, states = _make_n_configs(5)
    profile = _make_profile(
        layouts=[LayoutEntry(icon_min=0, icon_max=4, size="large", cols=4, info_min=0, info_max=0)]
    )
    result = solve(
        entity_configs=configs,
        states=states,
        tiers=["critical", "warning", "info"],
        defaults=Defaults(),
        profile=profile,
        glyph_resolver=_glyph_resolver,
        groups=[],
        current_page=0,
        now=_NOW,
    )
    assert result.error is False


# ── ESPHome font_glyphs warning ────────────────────────────────────────────


def test_esphome_missing_glyph_warning():
    cfg, states = _make_config(glyph="missing_glyph")
    profile = _make_profile(ptype="esphome", font_glyphs=["home", "warning"])
    result = solve(
        entity_configs=[cfg],
        states=states,
        tiers=["critical", "warning", "info"],
        defaults=Defaults(),
        profile=profile,
        glyph_resolver=_glyph_resolver,
        groups=[],
        now=_NOW,
    )
    assert any("missing_glyph" in w for w in result.warnings)
