
// 128x128 ~=32x32 per coord
const screen_x = 128;
const screen_y = 128;
const grid_x = 4;
const grid_y = 4;
const max_info = 2;
const x_remainder = 4;
const y_remainder = 4;
const pris = 3;
var pri_cap = pris;
 
const date = new Date();
var x_offset = Math.floor(date.getHours() / 23.0 * x_remainder);
var y_offset = Math.floor(date.getMinutes() / 59.0 * y_remainder);
 
 
// icon: min, max, font/cols, info: min, max, font/cols
const layouts = [
    { "icon": { "min": 1, "max": 1, "font": 1, "cols": 1, "pixels": 120 }, "info": { "min": 0, "max": 0 } },
    { "icon": { "min": 1, "max": 4, "font": 2, "cols": 2, "pixels": 64 }, "info": { "min": 0, "max": 0 } },
    { "icon": { "min": 5, "max": 9, "font": 3, "cols": 3, "pixels": 42 }, "info": { "min": 0, "max": 0 } },
    { "icon": { "min": 10, "max": 16, "font": 4, "cols": 4, "pixels": 32 }, "info": { "min": 0, "max": 0 } },
 
    { "icon": { "min": 1, "max": 4, "font": 4, "cols": 4, "pixels": 32 }, "info": { "min": 2, "max": 3 } },
    { "icon": { "min": 5, "max": 8, "font": 4, "cols": 4, "pixels": 32 }, "info": { "min": 2, "max": 2 } },
    { "icon": { "min": 1, "max": 3, "font": 3, "cols": 3, "pixels": 42 }, "info": { "min": 2, "max": 2 } },
 
    { "icon": { "min": 10, "max": 12, "font": 4, "cols": 4, "pixels": 32 }, "info": { "min": 1, "max": 1 } },
    { "icon": { "min": 7, "max": 9, "font": 4, "cols": 3, "pixels": 32 }, "info": { "min": 1, "max": 1 } },
    { "icon": { "min": 4, "max": 4, "font": 3, "cols": 2, "pixels": 42 }, "info": { "min": 1, "max": 1 } },
    { "icon": { "min": 4, "max": 6, "font": 3, "cols": 3, "pixels": 42 }, "info": { "min": 1, "max": 1 } },
    { "icon": { "min": 1, "max": 2, "font": 2, "cols": 2, "pixels": 64 }, "info": { "min": 1, "max": 2 } },
    //{ "icon": { "min": 1, "max": 3, "font": 3, "cols": 2, "pixels": 42 }, "info": { "min": 1, "max": 1 } },
    { "icon": { "min": 1, "max": 3, "font": 3, "cols": 3, "pixels": 42 }, "info": { "min": 1, "max": 2 } },
    { "icon": { "min": 0, "max": 0, "font": 2, "cols": 2, "pixels": 64 }, "info": { "min": 1, "max": 4 } }
 
];
const layout_info_row_height = 32;
 
var row_entries = [];
 
const homeassistant = global.get("homeassistant");
const states = homeassistant.homeAssistant.states;
 
var pri_entries = [];
var pri_info = [];
var pri_total_icons = [];
var pri_total_infos = [];
for (let pri = 0; pri < pris; pri++) {
    pri_entries.push([]);
    pri_info.push([]);
    pri_total_icons.push(0);
    pri_total_infos.push(0);
}
var info = "";
 
var grouped_icons = {};
 
msg.payload = {
    "data": {
        "x": [],
        "y": [],
        "r": [],
        "g": [],
        "b": [],
        "glyph": [],
        "glyph_font": grid_y,
        "info_glyph_font": grid_y,
        "info_text": [],
        "info_text_x": [],
        "info_text_r": [],
        "info_text_g": [],
        "info_text_b": [],
        "info_text_y": [],
        "info_glyph": [],
        "info_glyph_x": [],
        "info_glyph_r": [],
        "info_glyph_g": [],
        "info_glyph_b": [],
        "info_glyph_y": [],
        "draw_shape": [],
        "draw_shape_x": [],
        "draw_shape_y": [],
        "draw_shape_d2": [],
        "draw_shape_d3": [],
        "draw_shape_r": [],
        "draw_shape_g": [],
        "draw_shape_b": [],
        "error": false,
        "icon_scroll": true,
        "info_scroll": true
    }
};
 
 
msg.pack_info = {
    "pri_entries": pri_entries,
    "pri_info": pri_info
};
 
function color2rgb(c, rgb = null) {
    if (rgb === null) {
        rgb = {};
    }
    if (c == "orange") {
        rgb["r"] = 255; rgb["g"] = 127; rgb["b"] = 0;
    } else if (c == "red") {
        rgb["r"] = 255; rgb["g"] = 0; rgb["b"] = 0;
    } else if (c == "green") {
        rgb["r"] = 0; rgb["g"] = 255; rgb["b"] = 0;
    } else if (c == "blue") {
        rgb["r"] = 0; rgb["g"] = 100; rgb["b"] = 255;
    } else if (c == "yellow") {
        rgb["r"] = 255; rgb["g"] = 255; rgb["b"] = 0;
    } else if (c == "purple") {
        rgb["r"] = 255; rgb["g"] = 0; rgb["b"] = 255;
    } else if (c == "black") {
        rgb["r"] = 0; rgb["g"] = 0; rgb["b"] = 0;
    } else if (c == "grey") {
        rgb["r"] = 150; rgb["g"] = 150; rgb["b"] = 150;
    } else {
        rgb["r"] = 255; rgb["g"] = 255; rgb["b"] = 255;
    }
    return rgb;
}
 
var brightness = global.get("max_brightness") / 100.0;
if (msg.living_room_occupied) {
    brightness = Math.min(100.0, brightness * 2.2);
}
msg.brightness = brightness;
function cscale(level) {
    return Math.min(255, Math.floor(brightness * level));
}
 
 
function add_shape(shape, color, x, y, d2, d3) {
    msg.payload.data.draw_shape.push(shape);
    msg.payload.data.draw_shape_x.push(x);
    msg.payload.data.draw_shape_y.push(y);
    msg.payload.data.draw_shape_d2.push(d2);
    msg.payload.data.draw_shape_d3.push(d3);
    let crgb = color2rgb(color);
    msg.payload.data.draw_shape_r.push(cscale(crgb.r));
    msg.payload.data.draw_shape_g.push(cscale(crgb.g));
    msg.payload.data.draw_shape_b.push(cscale(crgb.b));
}
 
 
function set_color(c, pri, gptr, info = null) {
    gptr["placed"] = false;
    if (info !== null) {
        gptr["info"] = info;
        pri_info[pri].push(gptr);
        pri_total_infos[pri] += info.length;
    } else {
        pri_entries[pri].push(gptr);
        pri_total_icons[pri] += 1;
        if ("group" in gptr) {
            if (gptr.group in grouped_icons) {
                grouped_icons[gptr.group].push(gptr);
            } else {
                grouped_icons[gptr.group] = [gptr];
            }
        }
    }
    gptr["on"] = true;
    color2rgb(c, gptr);
}
 
var grid = {
    "garage": { "on": false, "glyph": "\ue714" },
    "door": { "on": false, "glyph": "\ue77c" },
    "lock": { "on": false, "glyph": "\ue898" },
    "security_away": { "on": false, "glyph": "\ue9e0" },
    "security_home": { "on": false, "glyph": "\ue786" },
    "co2": { "on": false, "glyph": "\ue7b0" },
    "voc": { "on": false, "glyph": "\uf55b" },
    "pm2_5": { "on": false, "glyph": "\uebbc" },
    "fan": { "on": false, "glyph": "\uf168" },
    "hvac": { "on": false, "glyph": "\uf10e" },
    "water": { "on": false, "glyph": "\ue798" },
    "grill": { "on": false, "glyph": "\uea47" },
    "pool": { "on": false, "glyph": "\ueb48" },
    "pool_occupied": { "on": false, "glyph": "\ueb48" },
    "pool_accessory": { "on": false, "glyph": "\ueb48" },
    "pool_temperature": { "on": false, "glyph": "\ue284" },
    "lights_upstairs": { "on": false, "glyph": "\ue5d8", "group": "lights" },
    "lights_downstairs": { "on": false, "glyph": "\ue5db", "group": "lights" },
    "lights_exterior": { "on": false, "glyph": "\uef4a", "group": "lights" },
    "lights_wled": { "on": false, "glyph": "\ueb36", "group": "lights" },
    "refrigerator": { "on": false, "glyph": "\ueb47" },
 
    "EV": { "on": false, "glyph": "\ue209" },
 
    "OK": { "on": false, "glyph": "\ue7f2" }
 
};
for (var k in grid) {
    grid[k]["name"] = k;
}
 
// check states
var state = global.get("dg_garage_door");
var gptr = grid["garage"];
if (state != "closed") {
    if (state == "open_timer") {
        info = ["" + states["input_number.alert_pause"].state];
        set_color("yellow", 2, gptr, info);
    } else {
        set_color("red", 0, gptr);
    }
}
 
if (global.get("dg_door") === true) {
    set_color("red", 0, grid["door"], global.get("dg_door_list"));
}
 
if (global.get("dg_lock") === true) {
    set_color("red", 0, grid["lock"], global.get("dg_lock_list"));
} else if (global.get("dg_door") === true) {
    set_color("red", 1, grid["lock"]);
}
 
 
state = global.get("dg_house_security");
if (state == "armed_away") {
    set_color("red", 0, grid["security_away"]);
    pri_cap = Math.min(pri_cap, 1);
} else if (state != "disarmed") {
    if (state == "armed_night") {
        set_color("purple", 2, grid["security_home"]);
    } else {
        set_color("green", 2, grid["security_home"]);
    }
}
 
var idle_like = ["idle", "cool", "heat"];
msg.hvac_debug = {"idle_like": idle_like,
"down": msg.downstairs_hvac,
    "up": msg.upstairs_hvac,
    "idown": idle_like.includes(msg.downstairs_hvac),
    "udown": idle_like.includes(msg.upstairs_hvac)
};
 
if (msg.downstairs_hvac == "cooling" || msg.upstairs_hvac == "cooling") {
    set_color("blue", 2, grid["hvac"]);
} else if (msg.downstairs_hvac == "heating" || msg.upstairs_hvac == "heating") {
    set_color("red", 2, grid["hvac"]);
} else if (idle_like.includes(msg.downstairs_hvac) && idle_like.includes(msg.upstairs_hvac)) {
} else {
    set_color("purple", 2, grid["hvac"]);
}
const fan_on = msg.upstairs_fan != 0 || msg.downstairs_fan != 0 || msg.iaq_fan == "on";
if (fan_on) {
    if (msg.downstairs_fan != 0) {
        set_color("red", 1, grid["fan"]);
    } else if (msg.upstairs_fan != 0) {
        set_color("orange", 1, grid["fan"]);
    } else {
        set_color("green", 2, grid["fan"]);
    }
}
 
state = msg.indoor_co2;
if (fan_on || (state > global.get("co2_threshold"))) {
    info = ["" + state + " " + states[msg.indoor_co2_entity].attributes.friendly_name];
    gptr = grid["co2"];
    if (state <= global.get("co2_threshold")) {
        set_color("yellow", 2, gptr, info);
    } else if (state <= 2000) {
        set_color("orange", 1, gptr, info);
    } else if (state <= 4500) {
        set_color("red", 0, gptr), info;
    } else {
        set_color("purple", 0, gptr, info);
    }
}
 
state = msg.indoor_voc;
if (state > 750 /* 300 is the green max, but it is too common */) {
    gptr = grid["voc"];
    info = ["" + state + " " + states[msg.indoor_voc_entity].attributes.friendly_name];
    if (state <= 500) {
        set_color("yellow", 2, gptr, info);
    } else if (state <= 3000) {
        set_color("orange", 1, gptr, info);
    } else if (state <= 25000) {
        set_color("red", 0, gptr, info);
    } else {
        set_color("purple", 0, gptr, info);
    }
}
 
state = msg.indoor_pm2_5;
if (state > 12) {
    gptr = grid["pm2_5"];
    info = ["" + state + " " + states[msg.indoor_pm2_5_entity].attributes.friendly_name];
    if (state <= 35.4) {
        set_color("yellow", 2, gptr, info);
    } else if (state <= 55.44) {
        set_color("orange", 1, gptr, info);
    } else if (state <= 150.4) {
        set_color("red", 0, gptr, info);
    } else {
        set_color("purple", 0, gptr, info);
    }
}
 
if (msg.grill) {
    if (msg.grill_data.timeSinceChangedMs >= 9000000) {
        set_color("red", 0, grid["grill"]);
        pri_cap = Math.min(pri_cap, 1);
    } else {
        set_color("orange", 1, grid["grill"]);
    }
}
if (msg.water > 0) {
    set_color("blue", 1, grid["water"], ["" + msg.water.toFixed(1) + " gal/min"]);
}
 
if ((msg.pool_person_count > 0) || (msg.pool_dog_count > 0)) {
    set_color("red", 0, grid["pool_occupied"]);
    pri_cap = Math.min(pri_cap, 1);
 
}
if (global.get("dg_pool_accessory")) {
    set_color("purple", 1, grid["pool_accessory"]);
} else if (global.get("dg_pool_filter")) {
    set_color("blue", 1, grid["pool"]);
}
 
state = global.get("dg_pool_temperature");
if (state != "off") {
    if (state == "freeze") {
        set_color("blue", 2, grid["pool_temperature"]);
    } else {
        set_color("red", 2, grid["pool_temperature"]);
    }
}
 
 
//add_shape("filled_rectangle", "blue", 0, 0, 128, 128);
//add_shape("rectangle", "black", 1, 1, 126, 126);
 
 
const light_bar_a = 3;
const light_bar_b = screen_x - x_remainder - 2 * light_bar_a;
 
if (msg.downstairs_lights) {
    add_shape("filled_rectangle", "yellow",
        x_offset + light_bar_a,
        screen_y - light_bar_a - y_remainder + y_offset,
        light_bar_b,
        light_bar_a);
    //set_color("yellow", 2, grid["lights_downstairs"]);
}
 
if (msg.upstairs_lights) {
    add_shape("filled_rectangle", "yellow",
        x_offset + light_bar_a,
        y_offset,
        light_bar_b,
        light_bar_a);
 
    //set_color("yellow", 2, grid["lights_upstairs"]);
}
 
if (msg.wled_lights || msg.front_exterior_lights) {
    let color = "yellow";
    if (msg.wled_lights) {
        color = "orange";
    }
    add_shape("filled_rectangle", color,
        x_offset,
        y_offset + light_bar_a,
        light_bar_a,
        light_bar_b);
 
    //set_color(color, 2, grid["lights_exterior"]);
}
if (msg.rear_exterior_lights) {
    add_shape("filled_rectangle", "yellow",
        screen_x - light_bar_a - x_remainder + x_offset,
        y_offset + light_bar_a,
        light_bar_a,
        light_bar_b);
 
    //set_color(color, 2, grid["lights_exterior"]);
}
 
 
var fridge_info = [];
var fridge_temp = [];
if (msg.kitchen_refrigerator) {
    fridge_info.push(msg.kitchen_refrigerator_data)
    fridge_temp.push(msg.kitchen_refrigerator_temperature)
}
if (msg.kitchen_freezer) {
    fridge_info.push(msg.kitchen_freezer_data)
    fridge_temp.push(msg.kitchen_freezer_temperature)
}
if (msg.laundry_room_refrigerator) {
    fridge_info.push(msg.laundry_room_refrigerator_data)
    fridge_temp.push(msg.laundry_room_refrigerator_temperature)
}
if (msg.laundry_room_freezer) {
    fridge_info.push(msg.laundry_room_freezer_data)
    fridge_temp.push(msg.laundry_room_freezer_temperature)
}
if (fridge_info.length > 0) {
    for (let i in fridge_info) {
        fridge_info[i] = " " + fridge_temp[i] + " " + fridge_info[i].attributes.friendly_name;
    }
    set_color("blue", 2, grid["refrigerator"], fridge_info);
 
}
 
state = msg.cph50_charger_state;
gptr = grid["EV"];
if ((state == "Not Charging") || (state == "Waiting")) {
    if (msg.cph50_charging_cable == "Plugged In") {
        set_color("grey", 2, gptr);
    }
} else if (state == "Done") {
    set_color("green", 2, gptr);
} else if (state == "Fully Charged") {
    set_color("green", 2, gptr);
} else if (state == "In Use") {
    set_color("blue", 0, gptr);
} else { //??
    set_color("red", 0, gptr);
 
}
 
var total_icons = 0;
var total_infos = 0;
for (let pri = 0; pri < pri_cap; pri++) {
    total_icons += pri_total_icons[pri];
    total_infos += pri_total_infos[pri];
}
 
// create screen
if (total_icons == 0 && total_infos == 0) {
    set_color("red", 0, grid["OK"]);
    grid["OK"]["r"] = Math.floor(Math.random() * 256);
    grid["OK"]["g"] = Math.floor(Math.random() * 256);
    grid["OK"]["b"] = Math.floor(Math.random() * 256);
} else {
    //set_color("red", 0, grid["OK"], ["foo's bar"]);
 
}
msg.pack_info.total_icons = total_icons;
msg.pack_info.grouped_icons = grouped_icons;
msg.pack_info.total_infos = total_infos;
 
if (total_icons == 0 && total_infos == 0) {
    msg.sensor = { "state": 0, "attributes": [] };
    return msg;
}
 
var layout = null;
var total_visible_icons = total_icons;
for (let igroup in grouped_icons) {
    if (grouped_icons[igroup].length > 1) {
        total_visible_icons -= (grouped_icons[igroup].length - 1);
    }
}
msg.pack_info.total_visible_icons = total_visible_icons;
 
for (let li = 0; li < layouts.length; li++) {
    let lo = layouts[li];
    if (total_visible_icons >= lo.icon.min && total_visible_icons <= lo.icon.max) {
        if (total_infos > 0) {
            if ((lo.info.min == 0) || (total_infos < lo.info.min)) { continue; }
        }
        layout = lo;
        msg.pack_info.layout = {
            "match": lo,
            "match_i": li
        }
        break;
    }
}
if (layout === null) {
    msg.payload.data.error = true;
    node.error(JSON.stringify(msg));
    return msg;
}
 
 
const icon_cols = layout.icon.cols;
const info_lines = layout.info.max;
const x_scale = layout.icon.pixels;
const y_scale = layout.icon.pixels;
 
var dptr = msg["payload"]["data"];
 
var sensor_info = "";
var sensor_info_rows = [];
 
var row = 0;
var col = 0;
let wlevel = cscale(255);
for (let pri = 0; pri < pri_cap; pri++) {
    for (let entry in pri_entries[pri]) {
        let pptr = pri_entries[pri][entry];
        if (pptr.placed) {
            continue;
        }
        pptr.placed = true;
        pptr.place_with_next = false;
        if (row_entries.length <= row) {
            row_entries.push([]);
        }
        if ("group" in pptr) {
            let i = 0;
            for (let gentry in grouped_icons[pptr.group]) {
                let g_pptr = grouped_icons[pptr.group][gentry];
                row_entries[row].push(g_pptr);
                g_pptr.placed = true;
                if (i < (grouped_icons[pptr.group].length - 1)) {
                    g_pptr.place_with_next = true;
                }
                i += 1;
            }
        } else {
            row_entries[row].push(pptr);
        }
        col += 1;
        if (col >= icon_cols) {
            row += 1;
            col = 0;
        }
    }
    for (let entry in pri_info[pri]) {
        let gptr = pri_info[pri][entry];
        for (let info_line in gptr.info) {
            dptr.info_glyph.push(gptr.glyph);
            dptr.info_glyph_r.push(cscale(gptr.r));
            dptr.info_glyph_g.push(cscale(gptr.g));
            dptr.info_glyph_b.push(cscale(gptr.b));
            dptr.info_text.push(gptr.info[info_line]);
            dptr.info_text_r.push(wlevel);
            dptr.info_text_g.push(wlevel);
            dptr.info_text_b.push(wlevel);
            sensor_info += gptr.name + ":" + gptr.info[info_line] + "\n";
            sensor_info_rows.push(gptr.name + ":" + gptr.info[info_line]);
        }
    }
}
 
msg.payload.data.glyph_font = layout.icon.font;
 
msg["pack_info"]["info_lines"] = info_lines;
msg["pack_info"]["icon_cols"] = icon_cols;
msg["pack_info"]["pixel_scale"] = [x_scale, y_scale];
msg["pack_info"]["row_entries"] = row_entries;
msg["active"] = [];
 
 
var entries = 0;
 
msg.payload.data.info_glyph_font = 3;
 
var text_start_y = (screen_y - y_remainder - info_lines * layout_info_row_height) + y_offset;
for (let i = 0; i < Math.min(info_lines, total_infos); i++) {
    dptr.info_glyph_y.push(text_start_y + i * layout_info_row_height);
    dptr.info_glyph_x.push(x_offset);
    dptr.info_text_y.push(4 + text_start_y + i * layout_info_row_height);
    dptr.info_text_x.push(x_offset + layout_info_row_height);
}
 
var sensor_glyph = "";
var sensor_glyph_rows = [];
 
for (let row = 0; row < row_entries.length; row++) {
    let sg_row = "";
    let place_col = 0;
    for (let col = 0; col < row_entries[row].length; col++) {
        gptr = row_entries[row][col];
        msg["active"][entries] = gptr;
        sensor_glyph += gptr["name"] + "|";
        sg_row += gptr["name"] + "|";
        for (var p in dptr) {
            if (["r", "g", "b"].includes(p)) {
                dptr[p][entries] = cscale(gptr[p]);
            } else if (p == "x") {
                dptr["x"][entries] = Math.floor(place_col * x_scale + x_offset);
            } else if (p == "y") {
                dptr["y"][entries] = Math.floor(row * y_scale + y_offset);
            } else if ((p in gptr)) {
                dptr[p][entries] = gptr[p];
            }
        }
        if (!gptr.place_with_next) {
            place_col += 1;
        }
 
        entries = entries + 1;
    }
    sensor_glyph += "\n";
    sensor_glyph_rows.push(sg_row);
}
msg.entries = total_icons;
 
msg.sensor = {
    "state": sensor_glyph_rows.length + sensor_info_rows.length,
    "attributes": { "values": sensor_glyph_rows.concat(sensor_info_rows) }
};
 
return msg;
