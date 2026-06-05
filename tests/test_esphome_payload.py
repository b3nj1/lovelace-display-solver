import pytest

from python_solver.types import (
    DisplayProfile,
    GlyphEntry,
    GlyphSize,
    InfoEntry,
    LayoutEntry,
    SeverityBarEntry,
    SolverResult,
    ZoneEntry,
)
from appdaemon.apps.display_solver.esphome import pack_esphome_payload


def _make_profile(info_max: int = 2) -> DisplayProfile:
    """Construct a minimal DisplayProfile for testing."""
    layout = LayoutEntry(
        icon_min=1,
        icon_max=4,
        size="medium",
        cols=2,
        info_min=0,
        info_max=info_max,
    )
    return DisplayProfile(
        id="test_display",
        type="esphome",
        screen_px=(320, 240),
        margin_px=(4, 4),
        viewing_distance="near",
        idle_glyph="home",
        glyph_sizes={"medium": GlyphSize(px=24, fits_cols=1)},
        layouts=[layout],
        service="esphome.test_set_display_glyphs",
    )


def _make_layout(info_max: int = 2) -> LayoutEntry:
    return LayoutEntry(
        icon_min=1,
        icon_max=4,
        size="medium",
        cols=2,
        info_min=0,
        info_max=info_max,
    )


def test_pack_full_result():
    """Pack a SolverResult with 2 glyphs, 1 info line, 1 zone, 1 severity bar."""
    glyphs = [
        GlyphEntry(glyph_name="garage", x=10, y=20, size_px=24, r=255, g=0, b=0),
        GlyphEntry(glyph_name="home", x=50, y=20, size_px=24, r=0, g=255, b=0),
    ]
    info = [
        InfoEntry(text="CO2: 800 ppm", x=5, y=100, r=200, g=200, b=200),
    ]
    zones = [
        ZoneEntry(zone_id="kitchen", x=0, y=0, w=40, h=20, r=255, g=255, b=0, shape="filled_rectangle"),
    ]
    severity_bar = SeverityBarEntry(x=0, y=236, w=100, h=4, r=255, g=0, b=0)

    layout = _make_layout(info_max=2)
    result = SolverResult(
        profile_id="test_display",
        glyphs=glyphs,
        info=info,
        zones=zones,
        severity_bar=severity_bar,
        layout=layout,
    )
    profile = _make_profile(info_max=2)
    payload = pack_esphome_payload(result, profile)

    # Glyph arrays — all length 2
    for key in ("x", "y", "r", "g", "b", "glyph", "glyph_font"):
        assert len(payload[key]) == 2, f"Expected glyph array '{key}' length 2, got {len(payload[key])}"

    # Info arrays — all length 1
    for key in ("info_glyph", "info_glyph_y", "info_glyph_x",
                "info_glyph_r", "info_glyph_g", "info_glyph_b",
                "info_text", "info_text_y", "info_text_x",
                "info_text_r", "info_text_g", "info_text_b"):
        assert len(payload[key]) == 1, f"Expected info array '{key}' length 1, got {len(payload[key])}"

    # Draw shape arrays — zone + severity bar = length 2
    for key in ("draw_shape", "draw_shape_x", "draw_shape_y",
                "draw_shape_d2", "draw_shape_d3",
                "draw_shape_r", "draw_shape_g", "draw_shape_b"):
        assert len(payload[key]) == 2, f"Expected draw_shape array '{key}' length 2, got {len(payload[key])}"

    # 1 info line with info_max=2 — no scroll
    assert payload["info_scroll"] is False

    assert payload["error"] is False

    # All glyph arrays equal length
    glyph_lengths = {k: len(payload[k]) for k in ("x", "y", "r", "g", "b", "glyph", "glyph_font")}
    assert len(set(glyph_lengths.values())) == 1, f"Glyph arrays have inconsistent lengths: {glyph_lengths}"

    # All info arrays equal length
    info_keys = ("info_glyph", "info_glyph_y", "info_glyph_x",
                 "info_glyph_r", "info_glyph_g", "info_glyph_b",
                 "info_text", "info_text_y", "info_text_x",
                 "info_text_r", "info_text_g", "info_text_b")
    info_lengths = {k: len(payload[k]) for k in info_keys}
    assert len(set(info_lengths.values())) == 1, f"Info arrays have inconsistent lengths: {info_lengths}"

    # All draw_shape arrays equal length
    shape_keys = ("draw_shape", "draw_shape_x", "draw_shape_y",
                  "draw_shape_d2", "draw_shape_d3",
                  "draw_shape_r", "draw_shape_g", "draw_shape_b")
    shape_lengths = {k: len(payload[k]) for k in shape_keys}
    assert len(set(shape_lengths.values())) == 1, f"Shape arrays have inconsistent lengths: {shape_lengths}"


def test_idle_result():
    """Pack an idle SolverResult (empty glyphs, no info, no zones, no severity bar)."""
    layout = _make_layout(info_max=2)
    result = SolverResult(
        profile_id="test_display",
        glyphs=[],
        info=[],
        zones=[],
        severity_bar=None,
        layout=layout,
        error=False,
    )
    profile = _make_profile(info_max=2)
    payload = pack_esphome_payload(result, profile)

    # All glyph arrays empty
    for key in ("x", "y", "r", "g", "b", "glyph", "glyph_font"):
        assert payload[key] == [], f"Expected glyph array '{key}' to be empty"

    # All info arrays empty
    for key in ("info_glyph", "info_glyph_y", "info_glyph_x",
                "info_glyph_r", "info_glyph_g", "info_glyph_b",
                "info_text", "info_text_y", "info_text_x",
                "info_text_r", "info_text_g", "info_text_b"):
        assert payload[key] == [], f"Expected info array '{key}' to be empty"

    # All draw_shape arrays empty
    for key in ("draw_shape", "draw_shape_x", "draw_shape_y",
                "draw_shape_d2", "draw_shape_d3",
                "draw_shape_r", "draw_shape_g", "draw_shape_b"):
        assert payload[key] == [], f"Expected draw_shape array '{key}' to be empty"

    assert payload["error"] is False


def test_info_scroll_when_over_max():
    """info_scroll is True when info count exceeds layout info_max."""
    info_lines = [
        InfoEntry(text=f"Line {i}", x=5, y=20 + i * 12, r=200, g=200, b=200)
        for i in range(3)
    ]
    layout = _make_layout(info_max=1)
    result = SolverResult(
        profile_id="test_display",
        glyphs=[],
        info=info_lines,
        zones=[],
        severity_bar=None,
        layout=layout,
    )
    profile = _make_profile(info_max=1)
    payload = pack_esphome_payload(result, profile)

    assert payload["info_scroll"] is True
    assert len(payload["info_text"]) == 3
