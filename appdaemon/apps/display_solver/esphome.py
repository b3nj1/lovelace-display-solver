from __future__ import annotations

# TODO: replace with TypeScript adapter (Step 11)

import sys
import os

_HERE = os.path.dirname(os.path.abspath(__file__))
_PROJECT_ROOT = os.path.abspath(os.path.join(_HERE, "..", "..", ".."))
if _PROJECT_ROOT not in sys.path:
    sys.path.insert(0, _PROJECT_ROOT)

from python_solver.types import DisplayProfile, SolverResult


def pack_esphome_payload(result: SolverResult, profile: DisplayProfile) -> dict:
    """Pack a SolverResult into the flat arrays for the ESPHome service call."""

    # Determine font index for each glyph size (largest size -> index 0)
    # Sort glyph_sizes by px descending so the largest maps to index 0.
    size_order = sorted(profile.glyph_sizes.items(), key=lambda kv: -kv[1].px)
    size_to_font_index: dict[str, int] = {name: idx for idx, (name, _) in enumerate(size_order)}

    # --- Glyph arrays ---
    glyph_x: list[int] = []
    glyph_y: list[int] = []
    glyph_r: list[int] = []
    glyph_g: list[int] = []
    glyph_b: list[int] = []
    glyph_name: list[str] = []
    glyph_font: list[int] = []

    for entry in result.glyphs:
        glyph_x.append(entry.x)
        glyph_y.append(entry.y)
        glyph_r.append(entry.r)
        glyph_g.append(entry.g)
        glyph_b.append(entry.b)
        glyph_name.append(entry.glyph_name)
        # Find the matching size name by pixel count
        font_idx = 0
        for size_name, gs in profile.glyph_sizes.items():
            if gs.px == entry.size_px:
                font_idx = size_to_font_index.get(size_name, 0)
                break
        glyph_font.append(font_idx)

    # --- Info arrays ---
    info_glyph: list[str] = []
    info_glyph_y: list[int] = []
    info_glyph_x: list[int] = []
    info_glyph_r: list[int] = []
    info_glyph_g: list[int] = []
    info_glyph_b: list[int] = []
    info_text: list[str] = []
    info_text_y: list[int] = []
    info_text_x: list[int] = []
    info_text_r: list[int] = []
    info_text_g: list[int] = []
    info_text_b: list[int] = []

    for entry in result.info:
        # info_glyph has no data source in InfoEntry; send empty string as placeholder
        info_glyph.append("")
        info_glyph_y.append(entry.y)
        info_glyph_x.append(entry.x)
        info_glyph_r.append(entry.r)
        info_glyph_g.append(entry.g)
        info_glyph_b.append(entry.b)
        info_text.append(entry.text)
        info_text_y.append(entry.y)
        info_text_x.append(entry.x)
        info_text_r.append(entry.r)
        info_text_g.append(entry.g)
        info_text_b.append(entry.b)

    info_scroll = len(result.info) > result.layout.info_max

    # --- Shape arrays (zones + severity bar) ---
    draw_shape: list[str] = []
    draw_shape_x: list[int] = []
    draw_shape_y: list[int] = []
    draw_shape_d2: list[int] = []
    draw_shape_d3: list[int] = []
    draw_shape_r: list[int] = []
    draw_shape_g: list[int] = []
    draw_shape_b: list[int] = []

    for zone in result.zones:
        draw_shape.append("filled_rectangle")
        draw_shape_x.append(zone.x)
        draw_shape_y.append(zone.y)
        draw_shape_d2.append(zone.w)
        draw_shape_d3.append(zone.h)
        draw_shape_r.append(zone.r)
        draw_shape_g.append(zone.g)
        draw_shape_b.append(zone.b)

    if result.severity_bar is not None:
        bar = result.severity_bar
        draw_shape.append("filled_rectangle")
        draw_shape_x.append(bar.x)
        draw_shape_y.append(bar.y)
        draw_shape_d2.append(bar.w)
        draw_shape_d3.append(bar.h)
        draw_shape_r.append(bar.r)
        draw_shape_g.append(bar.g)
        draw_shape_b.append(bar.b)

    return {
        "x": glyph_x,
        "y": glyph_y,
        "r": glyph_r,
        "g": glyph_g,
        "b": glyph_b,
        "glyph": glyph_name,
        "glyph_font": glyph_font,
        "info_glyph": info_glyph,
        "info_glyph_y": info_glyph_y,
        "info_glyph_x": info_glyph_x,
        "info_glyph_r": info_glyph_r,
        "info_glyph_g": info_glyph_g,
        "info_glyph_b": info_glyph_b,
        "info_text": info_text,
        "info_text_y": info_text_y,
        "info_text_x": info_text_x,
        "info_text_r": info_text_r,
        "info_text_g": info_text_g,
        "info_text_b": info_text_b,
        "info_scroll": info_scroll,
        "draw_shape": draw_shape,
        "draw_shape_x": draw_shape_x,
        "draw_shape_y": draw_shape_y,
        "draw_shape_d2": draw_shape_d2,
        "draw_shape_d3": draw_shape_d3,
        "draw_shape_r": draw_shape_r,
        "draw_shape_g": draw_shape_g,
        "draw_shape_b": draw_shape_b,
        "error": result.error,
    }
