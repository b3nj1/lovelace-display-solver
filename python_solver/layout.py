from __future__ import annotations

from datetime import datetime
from math import floor

from .types import ActiveEntry, DisplayProfile, GlyphEntry, LayoutEntry

VIEWING_DISTANCE_PRESETS: dict[str, dict] = {
    "far": {
        "max_size": "medium",
        "max_info_rows": 0,
        "prefer_fewer_icons": True,
    },
    "near": {
        "max_size": "tiny",
        "max_info_rows": 4,
        "prefer_fewer_icons": False,
    },
    "close": {
        "max_size": "tiny",
        "max_info_rows": 6,
        "prefer_fewer_icons": False,
    },
}


def expand_viewing_distance(profile: DisplayProfile) -> dict:
    return dict(VIEWING_DISTANCE_PRESETS.get(profile.viewing_distance, {}))


def select_layout(
    profile: DisplayProfile,
    icon_count: int,
    has_info: bool,
) -> LayoutEntry | None:
    constraints = expand_viewing_distance(profile)
    max_info_rows = constraints.get("max_info_rows", None)
    far_mode = max_info_rows == 0

    for layout in profile.layouts:
        # For far viewing distance: filter out layouts that require info rows
        if far_mode and layout.info_min > 0:
            continue

        # Filter by icon count range; icon_max is a per-page capacity so overflow pages,
        # meaning we only need at least icon_min icons (not at most icon_max total).
        effective = min(icon_count, layout.icon_max)
        if effective < layout.icon_min:
            continue

        # Skip layouts requiring info when no info is available
        if layout.info_min > 0 and not has_info:
            continue

        return layout

    return None


_NAMED_COLORS: dict[str, tuple[int, int, int]] = {
    "white":  (255, 255, 255),
    "orange": (255, 165,   0),
    "red":    (255,   0,   0),
    "purple": (128,   0, 128),
    "green":  (  0, 128,   0),
    "blue":   (  0,   0, 255),
    "yellow": (255, 255,   0),
}


def compute_coordinates(
    profile: DisplayProfile,
    layout: LayoutEntry,
    entries: list[ActiveEntry],
    burn_in_now: datetime | None = None,
    warnings: list[str] | None = None,
) -> list[GlyphEntry]:
    if burn_in_now is None:
        burn_in_now = datetime.now()

    x_offset = 0
    y_offset = 0
    if profile.burn_in_drift:
        x_offset = floor(burn_in_now.hour / 23 * profile.margin_px[0])
        y_offset = floor(burn_in_now.minute / 59 * profile.margin_px[1])

    glyph_size = profile.glyph_sizes.get(layout.size)
    size_px = glyph_size.px if glyph_size is not None else 24

    origin_x = profile.margin_px[0] + x_offset
    origin_y = profile.margin_px[1] + y_offset

    result: list[GlyphEntry] = []
    col = 0
    row = 0

    for entry in entries:
        if entry.indicator_only:
            continue

        x = origin_x + col * size_px
        y = origin_y + row * size_px

        r, g, b = _parse_color(entry.color, warnings=warnings)

        result.append(
            GlyphEntry(
                glyph_name=entry.glyph_name,
                x=x,
                y=y,
                size_px=size_px,
                r=r,
                g=g,
                b=b,
            )
        )

        col += 1
        if col >= layout.cols:
            col = 0
            row += 1

    return result


def _parse_color(
    color: str | None,
    warnings: list[str] | None = None,
) -> tuple[int, int, int]:
    """Minimal color parser.

    Supports:
    - ``#rrggbb`` hex strings
    - Named colors from ``_NAMED_COLORS``

    Falls back to white for unrecognized values. When ``warnings`` is provided,
    appends a warning for unrecognized color strings instead of silently falling
    back.
    """
    if not color:
        return (255, 255, 255)
    stripped = color.strip()
    if stripped.startswith("#") and len(stripped) == 7:
        try:
            r = int(stripped[1:3], 16)
            g = int(stripped[3:5], 16)
            b = int(stripped[5:7], 16)
            return r, g, b
        except ValueError:
            pass
    named = _NAMED_COLORS.get(stripped.lower())
    if named is not None:
        return named
    if warnings is not None:
        warnings.append(
            f"Unrecognized color '{color}'; falling back to white. "
            f"Use a #rrggbb hex value or one of: {', '.join(sorted(_NAMED_COLORS))}."
        )
    return (255, 255, 255)
