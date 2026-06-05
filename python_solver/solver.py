from __future__ import annotations

from collections import defaultdict
from datetime import datetime
from math import ceil
from typing import Callable

from .layout import _parse_color, compute_coordinates, select_layout
from .rules import apply_focus_mode, evaluate_entity
from .types import (
    ActiveEntry,
    Defaults,
    DisplayProfile,
    EntityConfig,
    GlyphEntry,
    GroupConfig,
    InfoEntry,
    LayoutEntry,
    SeverityBarConfig,
    SeverityBarEntry,
    SolverResult,
    StateObject,
    ZoneEntry,
    ZoneSlot,
)

_EMPTY_LAYOUT = LayoutEntry(
    icon_min=0, icon_max=0, size="medium", cols=1, info_min=0, info_max=0
)


def _evaluate_and_resolve(
    entity_configs: list[EntityConfig],
    states: dict[str, StateObject],
    tiers: list[str],
    defaults: Defaults,
    profile: DisplayProfile,
    glyph_resolver: Callable[[str], str],
    now: datetime,
) -> tuple[list[ActiveEntry], list[str]]:
    """Steps 1-4 of solve(): evaluate entities, sort by tier, apply focus mode,
    resolve glyphs with warnings.

    Returns (resolved_entries, warnings).
    """
    warnings: list[str] = []

    # Step 1: evaluate each entity config
    raw_entries: list[ActiveEntry] = []
    for cfg in entity_configs:
        entry = evaluate_entity(cfg, states, tiers, defaults, now)
        if entry is not None:
            raw_entries.append(entry)

    # Step 2: bucket by tier order (preserves user-declared order within tier)
    tier_index: dict[str, int] = {t: i for i, t in enumerate(tiers)}
    raw_entries.sort(key=lambda e: tier_index.get(e.tier, len(tiers)))

    # Step 3: apply focus mode
    active_entries = apply_focus_mode(raw_entries, tiers)

    # Step 4: resolve glyphs; warn on missing codepoint and on missing from font_glyphs
    resolved: list[ActiveEntry] = []
    for entry in active_entries:
        codepoint = glyph_resolver(entry.glyph_name)
        if not codepoint:
            warnings.append(
                f"Glyph '{entry.glyph_name}' (entity '{entry.entity_config.entity_id}')"
                f" could not be resolved to a codepoint — check the glyph name in your"
                f" entity config."
            )
            # Fall back to original name so the entry is still emitted
            effective_name = entry.glyph_name
        else:
            effective_name = codepoint
            if (
                profile.type == "esphome"
                and entry.glyph_name
                and entry.glyph_name not in profile.font_glyphs
            ):
                warnings.append(
                    f"Glyph '{entry.glyph_name}' is not listed in profile '{profile.id}'"
                    f" font_glyphs; it may not render on the ESPHome display."
                )

        from dataclasses import replace as dc_replace
        resolved.append(dc_replace(entry, glyph_name=effective_name))

    return resolved, warnings


def solve(
    entity_configs: list[EntityConfig],
    states: dict[str, StateObject],
    tiers: list[str],
    defaults: Defaults,
    profile: DisplayProfile,
    glyph_resolver: Callable[[str], str],
    groups: list[GroupConfig],
    current_page: int = 0,
    now: datetime | None = None,
) -> SolverResult:
    if now is None:
        now = datetime.now()

    # Steps 1-4: evaluate, sort, focus-filter, resolve glyphs
    resolved, warnings = _evaluate_and_resolve(
        entity_configs, states, tiers, defaults, profile, glyph_resolver, now
    )

    # Step 5: count visible icon slots (groups collapse)
    group_map: dict[str, GroupConfig] = {g.id: g for g in groups}
    visible_slots = _count_visible_slots(resolved, group_map)

    # Step 6: select layout
    has_info = any(e.show_info for e in resolved)
    layout = select_layout(profile, visible_slots, has_info)
    if layout is None:
        reason = (
            f"No layout matched {visible_slots} icon(s) on profile '{profile.id}'"
            f" (viewing_distance='{profile.viewing_distance}', has_info={has_info})."
            f" Profile defines {len(profile.layouts)} layout(s);"
            f" check icon_min/icon_max ranges."
        )
        warnings.append(reason)
        return SolverResult(
            profile_id=profile.id,
            glyphs=[],
            info=[],
            zones=[],
            severity_bar=None,
            layout=_EMPTY_LAYOUT,
            error=True,
            warnings=warnings,
            page_count=1,
            error_reason=reason,
        )

    # Step 7: paging
    page_count = max(1, ceil(visible_slots / layout.icon_max)) if layout.icon_max > 0 else 1
    paged_entries = _slice_page(resolved, group_map, current_page, layout.icon_max)

    # Step 8: compute glyph coordinates
    glyphs = compute_coordinates(profile, layout, paged_entries, now, warnings=warnings)

    # Step 9: collect info lines (all active entries, not just paged)
    # Caller must pass entries in tier order (most-urgent first); see solve() step 2.
    info_entries = _collect_info(resolved, tiers, states, profile, warnings=warnings)

    # Step 10: zone indicators
    zone_entries = _resolve_zones(resolved, tiers, profile)

    # Step 11: severity bar
    severity_bar = _compute_severity_bar(resolved, tiers, profile, now, warnings=warnings)

    # Step 12: idle glyph when active set is empty
    if not resolved and not glyphs:
        glyphs = _make_idle_glyph(profile, glyph_resolver, now)

    return SolverResult(
        profile_id=profile.id,
        glyphs=glyphs,
        info=info_entries,
        zones=zone_entries,
        severity_bar=severity_bar,
        layout=layout,
        error=False,
        warnings=warnings,
        page_count=page_count,
    )


def solve_all(
    entity_configs: list[EntityConfig],
    states: dict[str, StateObject],
    tiers: list[str],
    defaults: Defaults,
    profiles: list[DisplayProfile],
    glyph_resolver: Callable[[str], str],
    groups: list[GroupConfig],
    current_pages: dict[str, int] | None = None,
    now: datetime | None = None,
) -> list[SolverResult]:
    pages = current_pages or {}
    return [
        solve(
            entity_configs=entity_configs,
            states=states,
            tiers=tiers,
            defaults=defaults,
            profile=p,
            glyph_resolver=glyph_resolver,
            groups=groups,
            current_page=pages.get(p.id, 0),
            now=now,
        )
        for p in profiles
    ]


# ── private helpers ────────────────────────────────────────────────────────────


def _count_visible_slots(
    entries: list[ActiveEntry], group_map: dict[str, GroupConfig]
) -> int:
    seen_groups: set[str] = set()
    slots = 0
    for entry in entries:
        if entry.indicator_only:
            continue
        gid = entry.entity_config.group
        if gid and gid in group_map:
            gc = group_map[gid]
            if gc.collapse == "overlay":
                if gid not in seen_groups:
                    seen_groups.add(gid)
                    slots += 1
            else:
                slots += 1
        else:
            slots += 1
    return slots


def _slice_page(
    entries: list[ActiveEntry],
    group_map: dict[str, GroupConfig],
    page: int,
    icon_max: int,
) -> list[ActiveEntry]:
    """Return entries for the given page, respecting group slot counting."""
    if icon_max <= 0:
        return entries

    non_indicators = [e for e in entries if not e.indicator_only]
    seen_groups: set[str] = set()
    slot_to_entries: list[list[ActiveEntry]] = []

    for entry in non_indicators:
        gid = entry.entity_config.group
        gc = group_map.get(gid) if gid else None
        if gc and gc.collapse == "overlay":
            if gid not in seen_groups:
                seen_groups.add(gid)
                slot_to_entries.append([entry])
            else:
                # Add to the existing slot for this group
                for slot in slot_to_entries:
                    if slot and slot[0].entity_config.group == gid:
                        slot.append(entry)
                        break
        else:
            slot_to_entries.append([entry])

    start = page * icon_max
    end = start + icon_max
    paged_slots = slot_to_entries[start:end]

    result: list[ActiveEntry] = []
    for slot in paged_slots:
        result.extend(slot)

    # Keep indicator-only entries always
    result.extend(e for e in entries if e.indicator_only)
    return result


def _collect_info(
    entries: list[ActiveEntry],
    tiers: list[str],
    states: dict[str, StateObject],
    profile: DisplayProfile,
    warnings: list[str] | None = None,
) -> list[InfoEntry]:
    # Caller must pass entries in tier order (most-urgent first); see solve() step 2.
    info_entries: list[InfoEntry] = []

    for entry in entries:
        if not entry.show_info:
            continue
        cfg = entry.entity_config
        state_obj = states.get(cfg.entity_id)
        state_val = state_obj.state if state_obj else ""
        fmt = cfg.value_format or "{state}"
        try:
            text_val = fmt.format(state=state_val)
        except (KeyError, ValueError):
            text_val = state_val
        label = cfg.label or cfg.entity_id
        text = f"{text_val} {label}"
        r, g, b = _parse_color(entry.color, warnings=warnings)
        info_entries.append(InfoEntry(text=text, x=0, y=0, r=r, g=g, b=b))

    return info_entries


def _resolve_zones(
    entries: list[ActiveEntry],
    tiers: list[str],
    profile: DisplayProfile,
) -> list[ZoneEntry]:
    tier_index: dict[str, int] = {t: i for i, t in enumerate(tiers)}

    # Find highest-tier entry per zone
    best: dict[str, ActiveEntry] = {}
    for entry in entries:
        zid = entry.entity_config.zone
        if not zid:
            continue
        current = best.get(zid)
        if current is None or tier_index.get(entry.tier, len(tiers)) < tier_index.get(current.tier, len(tiers)):
            best[zid] = entry

    zone_entries: list[ZoneEntry] = []
    for slot in profile.zones:
        entry = best.get(slot.id)
        if entry is None:
            continue
        x, y, w, h = _resolve_zone_rect(slot, profile)
        r, g, b = _parse_color(entry.color)
        zone_entries.append(
            ZoneEntry(zone_id=slot.id, x=x, y=y, w=w, h=h, r=r, g=g, b=b, shape="rectangle")
        )

    return zone_entries


def _resolve_zone_rect(
    slot: ZoneSlot, profile: DisplayProfile
) -> tuple[int, int, int, int]:
    sw, sh = profile.screen_px
    mx, my = profile.margin_px
    pos = slot.position
    if isinstance(pos, dict):
        x = int(pos.get("x", 0))
        y = int(pos.get("y", 0))
        w = int(pos.get("w", sw // 4))
        h = int(pos.get("h", sh // 4))
        return x, y, w, h
    # Named shortcuts: divide screen into quadrants, respecting margin_px.
    # Right-half width uses sw - sw//2 to avoid 1-pixel gaps on odd screen widths.
    # Bottom-half height uses sh - sh//2 for the same reason.
    named = {
        "top-left":     (mx,       my,       sw // 2 - mx,          sh // 2 - my),
        "top-right":    (sw // 2,  my,       sw - sw // 2 - mx,     sh // 2 - my),
        "bottom-left":  (mx,       sh // 2,  sw // 2 - mx,          sh - sh // 2 - my),
        "bottom-right": (sw // 2,  sh // 2,  sw - sw // 2 - mx,     sh - sh // 2 - my),
        "top":          (mx,       my,       sw - 2 * mx,           sh // 4),
        "bottom":       (mx,       3*sh//4,  sw - 2 * mx,           sh // 4),
        "left":         (mx,       my,       sw // 4,               sh - 2 * my),
        "right":        (3*sw//4,  my,       sw // 4,               sh - 2 * my),
        "center":       (sw // 4,  sh // 4,  sw // 2,               sh // 2),
        "full":         (mx,       my,       sw - 2 * mx,           sh - 2 * my),
    }
    return named.get(pos, (0, 0, sw // 4, sh // 4))


def _compute_severity_bar(
    entries: list[ActiveEntry],
    tiers: list[str],
    profile: DisplayProfile,
    now: datetime,
    warnings: list[str] | None = None,
) -> SeverityBarEntry | None:
    cfg = profile.severity_bar
    if cfg is None:
        return None

    active = [e for e in entries if not e.indicator_only]
    idle = not active

    # Single gate: when idle, respect hide_when_idle; when not idle, always render.
    if idle:
        if cfg.hide_when_idle:
            return None
        # Idle with hide_when_idle=False: emit a zero-width bar
        sw, sh = profile.screen_px
        t = cfg.thickness_px
        color_str = None if cfg.color == "entity" else cfg.color
        r, g, b = _parse_color(color_str, warnings=warnings)
        if cfg.edge == "bottom":
            return SeverityBarEntry(x=0, y=sh - t, w=0, h=t, r=r, g=g, b=b)
        elif cfg.edge == "top":
            return SeverityBarEntry(x=0, y=0, w=0, h=t, r=r, g=g, b=b)
        elif cfg.edge == "left":
            return SeverityBarEntry(x=0, y=0, w=t, h=0, r=r, g=g, b=b)
        elif cfg.edge == "right":
            return SeverityBarEntry(x=sw - t, y=0, w=t, h=0, r=r, g=g, b=b)
        return None

    tier_index: dict[str, int] = {t: i for i, t in enumerate(tiers)}
    best = min(active, key=lambda e: tier_index.get(e.tier, len(tiers)))
    best_index = tier_index.get(best.tier, len(tiers))
    n = len(tiers) or 1
    fill_ratio = (n - best_index) / n

    sw, sh = profile.screen_px
    t = cfg.thickness_px

    color_str = cfg.color
    if color_str == "entity":
        color_str = best.color
    r, g, b = _parse_color(color_str, warnings=warnings)

    if cfg.edge == "bottom":
        bar_x = 0
        bar_y = sh - t
        bar_w = int(sw * fill_ratio)
        bar_h = t
    elif cfg.edge == "top":
        bar_x = 0
        bar_y = 0
        bar_w = int(sw * fill_ratio)
        bar_h = t
    elif cfg.edge == "left":
        bar_x = 0
        bar_y = 0
        bar_w = t
        bar_h = int(sh * fill_ratio)
    elif cfg.edge == "right":
        bar_x = sw - t
        bar_y = 0
        bar_w = t
        bar_h = int(sh * fill_ratio)
    else:
        return None

    return SeverityBarEntry(x=bar_x, y=bar_y, w=bar_w, h=bar_h, r=r, g=g, b=b)


def _make_idle_glyph(
    profile: DisplayProfile,
    glyph_resolver: Callable[[str], str],
    now: datetime,
) -> list[GlyphEntry]:
    if not profile.idle_glyph:
        return []

    sw, sh = profile.screen_px
    # Pick a default size
    size_key = next(iter(profile.glyph_sizes), None)
    if size_key is None:
        return []
    size_px = profile.glyph_sizes[size_key].px
    x = sw // 2 - size_px // 2
    y = sh // 2 - size_px // 2

    return [
        GlyphEntry(
            glyph_name=profile.idle_glyph,
            x=x,
            y=y,
            size_px=size_px,
            r=128,
            g=128,
            b=128,
        )
    ]
