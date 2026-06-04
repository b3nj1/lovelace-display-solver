# ESPHome Service Contract — v1.0

This document defines the stable, versioned API surface for the
`set_display_glyphs` ESPHome service used by the display-solver system.
Breaking changes increment the version label.

---

## Stable Parameter Contract

Service name: `esphome.<device_name>_set_display_glyphs`

All array parameters on each call must be the same length. The card does not
assume any particular array length from a previous call — ESPHome stores the
full arrays and overwrites them on each call.

### Icon glyph arrays

| Parameter | Type | Array | Description |
|---|---|---|---|
| `x` | int[] | yes | X pixel coordinate (top-left) of each icon glyph |
| `y` | int[] | yes | Y pixel coordinate (top-left) of each icon glyph |
| `r` | int[] | yes | Red channel (0–255) of each icon glyph |
| `g` | int[] | yes | Green channel (0–255) of each icon glyph |
| `b` | int[] | yes | Blue channel (0–255) of each icon glyph |
| `glyph` | int[] | yes | Codepoint of each icon glyph (Material Symbols Sharp) |
| `glyph_font` | int | no | Font index for all icon glyphs (e.g. `2` for the 58px font) |

### Info glyph arrays

| Parameter | Type | Array | Description |
|---|---|---|---|
| `info_glyph` | int[] | yes | Codepoint of each info-row glyph |
| `info_glyph_y` | int[] | yes | Y pixel coordinate of each info-row glyph |
| `info_glyph_x` | int[] | yes | X pixel coordinate of each info-row glyph |
| `info_glyph_r` | int[] | yes | Red channel (0–255) of each info-row glyph |
| `info_glyph_g` | int[] | yes | Green channel (0–255) of each info-row glyph |
| `info_glyph_b` | int[] | yes | Blue channel (0–255) of each info-row glyph |

### Info text arrays

| Parameter | Type | Array | Description |
|---|---|---|---|
| `info_text` | string[] | yes | Pre-rendered info line strings (e.g. "1423 ppm CO₂") |
| `info_text_y` | int[] | yes | Y pixel coordinate of each info text line |
| `info_text_x` | int[] | yes | X pixel coordinate of each info text line |
| `info_text_r` | int[] | yes | Red channel (0–255) of each info text line |
| `info_text_g` | int[] | yes | Green channel (0–255) of each info text line |
| `info_text_b` | int[] | yes | Blue channel (0–255) of each info text line |

### Info scroll

| Parameter | Type | Array | Description |
|---|---|---|---|
| `info_scroll` | bool | no | When true, ESPHome scrolls through info lines that exceed the display area |

### Draw shape arrays

Used for zone indicators and the severity bar. All draw_shape arrays must be
the same length as each other (independent of the icon/info array lengths).

| Parameter | Type | Array | Description |
|---|---|---|---|
| `draw_shape` | int[] | yes | Shape type code: `0` = filled_rectangle, `1` = circle, `2` = filled_circle |
| `draw_shape_x` | int[] | yes | X pixel coordinate (top-left or center for circles) |
| `draw_shape_y` | int[] | yes | Y pixel coordinate (top-left or center for circles) |
| `draw_shape_d2` | int[] | yes | Width (rectangles) or radius (circles) in pixels |
| `draw_shape_d3` | int[] | yes | Height in pixels (rectangles); unused for circles (set to 0) |
| `draw_shape_r` | int[] | yes | Red channel (0–255) |
| `draw_shape_g` | int[] | yes | Green channel (0–255) |
| `draw_shape_b` | int[] | yes | Blue channel (0–255) |

### Diagnostics

| Parameter | Type | Array | Description |
|---|---|---|---|
| `error` | bool | no | True when the solver could not find a matching layout; display should show an error state |

---

## Icon Page Cycling — No New Parameters Required

When the number of active icons exceeds the selected layout's `icon.max`, the
solver partitions the sorted active-entry list into pages of `icon.max` entries.
The ESPHome service is called with only the **current page's** glyph slice —
the same `x[]`, `y[]`, `r[]`, `g[]`, `b[]`, `glyph[]` arrays as normal, just
containing `icon.max` entries instead of the full active set.

ESPHome requires no new parameters and no lambda changes for paging. The
display lambda draws whatever glyphs it receives. Paging state (current page,
page count, dwell timer) is managed entirely in the solver host layer
(AppDaemon or Lovelace card). A state change always resets to page 0.

---

## Removed Parameters

The following parameters were present in pre-v1.0 versions of the service and
have been removed. Sending them to the updated ESPHome firmware causes a
runtime warning.

| Parameter | Reason for removal |
|---|---|
| `icon_scroll` | Accepted by the service but never read by the display lambda. Icon page cycling is handled entirely by the solver (see above) — no ESPHome-side scroll is needed. |
| `info_glyph_font` | Always sent as the hardcoded value `3` by the solver; never varies. Font index is now hardcoded in the ESPHome lambda directly, eliminating a parameter that provided no flexibility. |

---

## Migration from pre-v1.0

If your solver (Node-RED flow, AppDaemon app, or Lovelace card) was sending
the removed parameters, you must stop sending them before flashing the updated
ESPHome firmware. Sending unknown parameters to an ESPHome service causes an
ESPHome runtime warning on every call; the service still executes but the
warning fills the log.

### Steps

1. **Remove `icon_scroll`** from your solver's service call payload.
   ESPHome YAML change: delete the `icon_scroll` variable declaration from the
   `api: services:` block and remove any reference to it in the display lambda
   (there should be none — it was never read).

   ```yaml
   # Remove this line from api: services: variables:
   - name: icon_scroll
     type: bool
   ```

2. **Remove `info_glyph_font`** from your solver's service call payload.
   ESPHome YAML change: delete the `info_glyph_font` variable declaration and
   replace any use of the variable in the display lambda with the literal `font3`
   (or whatever font object corresponds to index 3 in your configuration).

   ```yaml
   # Remove this line from api: services: variables:
   - name: info_glyph_font
     type: int

   # In the display lambda, replace:
   #   id(info_glyph_font_global)
   # with the literal font id, e.g.:
   #   font3
   ```

3. Reflash the ESPHome device with the updated YAML.
4. Deploy the updated solver. No further changes are needed — all other
   parameters remain identical to pre-v1.0.
