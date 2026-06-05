from __future__ import annotations

from datetime import datetime

import pytest

from python_solver.layout import compute_coordinates, expand_viewing_distance, select_layout
from python_solver.types import (
    ActiveEntry,
    DisplayProfile,
    EntityConfig,
    GlyphSize,
    LayoutEntry,
    Rule,
    ThenAction,
    WhenCondition,
)


def _make_profile(
    viewing_distance: str = "near",
    layouts: list[LayoutEntry] | None = None,
    burn_in_drift: bool = False,
) -> DisplayProfile:
    return DisplayProfile(
        id="test",
        type="canvas",
        screen_px=(320, 240),
        margin_px=(8, 8),
        viewing_distance=viewing_distance,
        idle_glyph="home",
        glyph_sizes={
            "large": GlyphSize(px=48, fits_cols=4),
            "medium": GlyphSize(px=32, fits_cols=6),
            "small": GlyphSize(px=24, fits_cols=8),
        },
        layouts=layouts or [],
        burn_in_drift=burn_in_drift,
    )


def _make_entry(glyph: str = "home", tier: str = "warning", color: str = "#ff8800") -> ActiveEntry:
    cfg = EntityConfig(
        id="e1",
        entity_id="sensor.test",
        glyph=glyph,
        rules=[Rule(when=WhenCondition(state="on"), then=ThenAction(tier=tier, color=color))],
    )
    return ActiveEntry(
        entity_config=cfg,
        tier=tier,
        color=color,
        glyph_name=glyph,
        show_info=False,
        focus_mode=False,
        indicator_only=False,
        drive_zone_indicator=False,
    )


# ── expand_viewing_distance ─────────────────────────────────────────────────


def test_expand_far_has_max_info_rows_zero():
    profile = _make_profile("far")
    constraints = expand_viewing_distance(profile)
    assert constraints["max_info_rows"] == 0


def test_expand_near_has_max_info_rows_four():
    profile = _make_profile("near")
    constraints = expand_viewing_distance(profile)
    assert constraints["max_info_rows"] == 4


def test_expand_close_has_max_info_rows_six():
    profile = _make_profile("close")
    constraints = expand_viewing_distance(profile)
    assert constraints["max_info_rows"] == 6


# ── select_layout ───────────────────────────────────────────────────────────


def _layouts_standard() -> list[LayoutEntry]:
    return [
        LayoutEntry(icon_min=1, icon_max=2, size="large", cols=2, info_min=0, info_max=0),
        LayoutEntry(icon_min=3, icon_max=6, size="medium", cols=3, info_min=0, info_max=2),
        LayoutEntry(icon_min=1, icon_max=4, size="small", cols=2, info_min=1, info_max=4),
    ]


def test_select_layout_far_icon_count_zero_no_match():
    profile = _make_profile("far", _layouts_standard())
    result = select_layout(profile, icon_count=0, has_info=False)
    assert result is None


def test_select_layout_far_filters_info_min_layouts():
    # Only layout with info_min=0 should be eligible for "far"
    profile = _make_profile("far", _layouts_standard())
    # icon_count=2: first layout (icon_min=1, icon_max=2, info_min=0) should match
    result = select_layout(profile, icon_count=2, has_info=False)
    assert result is not None
    assert result.size == "large"


def test_select_layout_far_skips_info_requiring_layout():
    # The third layout (info_min=1) must never match for "far"
    layouts = [
        LayoutEntry(icon_min=1, icon_max=4, size="small", cols=2, info_min=1, info_max=4),
        LayoutEntry(icon_min=1, icon_max=4, size="medium", cols=2, info_min=0, info_max=0),
    ]
    profile = _make_profile("far", layouts)
    result = select_layout(profile, icon_count=2, has_info=True)
    assert result is not None
    assert result.size == "medium"


def test_select_layout_info_min_skipped_when_no_info():
    layouts = [
        LayoutEntry(icon_min=1, icon_max=4, size="small", cols=2, info_min=1, info_max=4),
        LayoutEntry(icon_min=1, icon_max=4, size="medium", cols=2, info_min=0, info_max=2),
    ]
    profile = _make_profile("near", layouts)
    result = select_layout(profile, icon_count=2, has_info=False)
    assert result is not None
    assert result.size == "medium"


def test_select_layout_info_min_selected_when_has_info():
    layouts = [
        LayoutEntry(icon_min=1, icon_max=4, size="small", cols=2, info_min=1, info_max=4),
        LayoutEntry(icon_min=1, icon_max=4, size="medium", cols=2, info_min=0, info_max=2),
    ]
    profile = _make_profile("near", layouts)
    result = select_layout(profile, icon_count=2, has_info=True)
    assert result is not None
    assert result.size == "small"


def test_select_layout_icon_count_lower_bound():
    # Layouts ordered with a high icon_min first; icon_count=1 should skip it and pick second
    layouts = [
        LayoutEntry(icon_min=5, icon_max=8, size="small", cols=4, info_min=0, info_max=0),
        LayoutEntry(icon_min=1, icon_max=4, size="large", cols=2, info_min=0, info_max=0),
    ]
    profile = _make_profile("near", layouts)
    result = select_layout(profile, icon_count=2, has_info=False)
    assert result is not None
    assert result.size == "large"


def test_select_layout_no_match_returns_none():
    # All layouts require icon_min >= 1; icon_count=0 gives effective=0 → no match
    profile = _make_profile("near", _layouts_standard())
    result = select_layout(profile, icon_count=0, has_info=False)
    assert result is None


# ── compute_coordinates ─────────────────────────────────────────────────────


def test_compute_coordinates_4_icons_2_cols():
    profile = _make_profile("near")
    layout = LayoutEntry(icon_min=1, icon_max=4, size="large", cols=2, info_min=0, info_max=0)
    entries = [_make_entry() for _ in range(4)]
    glyphs = compute_coordinates(profile, layout, entries, burn_in_now=datetime(2024, 1, 1, 0, 0))
    size_px = 48  # large
    margin = 8
    assert len(glyphs) == 4
    assert glyphs[0].x == margin and glyphs[0].y == margin
    assert glyphs[1].x == margin + size_px and glyphs[1].y == margin
    assert glyphs[2].x == margin and glyphs[2].y == margin + size_px
    assert glyphs[3].x == margin + size_px and glyphs[3].y == margin + size_px


def test_burn_in_drift_hour23_minute59_equals_margin():
    profile = _make_profile("near", burn_in_drift=True)
    layout = LayoutEntry(icon_min=1, icon_max=1, size="large", cols=1, info_min=0, info_max=0)
    entries = [_make_entry()]
    now = datetime(2024, 1, 1, 23, 59)
    glyphs = compute_coordinates(profile, layout, entries, burn_in_now=now)
    assert len(glyphs) == 1
    # At hour=23, minute=59: x_offset=margin_px[0], y_offset=margin_px[1]
    assert glyphs[0].x == 8 + 8   # margin + x_offset
    assert glyphs[0].y == 8 + 8   # margin + y_offset


def test_burn_in_drift_hour0_minute0_no_offset():
    profile = _make_profile("near", burn_in_drift=True)
    layout = LayoutEntry(icon_min=1, icon_max=1, size="large", cols=1, info_min=0, info_max=0)
    entries = [_make_entry()]
    now = datetime(2024, 1, 1, 0, 0)
    glyphs = compute_coordinates(profile, layout, entries, burn_in_now=now)
    assert glyphs[0].x == 8  # margin only, no drift
    assert glyphs[0].y == 8
