export const MDI_FALLBACK = '?';

/**
 * Maps MDI icon names to Material Symbols Sharp (MSS) equivalents.
 * Only unambiguous mappings are included.
 */
export const MDI_TO_MSS: Record<string, string> = {
  'mdi:molecule-co2':   'co2',
  'mdi:pool':           'pool',
  'mdi:thermometer':    'thermostat',
  'mdi:water':          'water_drop',
  'mdi:car-electric':   'electric_car',
  'mdi:fan':            'mode_fan',
  'mdi:lightbulb':      'lightbulb',
  'mdi:lock':           'lock',
  'mdi:door':           'door_open',
  'mdi:garage':               'garage',
  'mdi:garage-open':          'door_open',
  'mdi:garage-open-variant':  'door_open',
  'mdi:garage-variant':       'garage',
  'mdi:garage-lock':          'lock',
  'mdi:security':       'security',
  'mdi:air-filter':     'air',
  'mdi:factory':        'factory',
  'mdi:grill':          'outdoor_grill',
  'mdi:thermometer-auto': 'device_thermostat',
  'mdi:arrow-up':       'arrow_upward',
  'mdi:arrow-down':     'arrow_downward',
  'mdi:check-circle':   'check_circle',
  'mdi:chef-hat':       'kitchen',
  // Additional unambiguous mappings
  'mdi:smoke-detector': 'detector_smoke',
  'mdi:motion-sensor':  'motion_sensor_active',
  'mdi:window-open':    'window',
  'mdi:door-open':      'door_open',
  'mdi:fire':           'local_fire_department',
  'mdi:alarm':          'alarm',
  'mdi:bell':           'notifications',
  'mdi:home':           'home',
  'mdi:weather-sunny':  'sunny',
  'mdi:weather-rainy':  'rainy',
  'mdi:weather-snowy':  'ac_unit',
  'mdi:weather-cloudy': 'cloud',
  'mdi:weather-windy':  'air',
  'mdi:lightning-bolt': 'bolt',
  'mdi:power-plug':     'power',
  'mdi:battery':        'battery_full',
  'mdi:battery-low':    'battery_1_bar',
  'mdi:wifi':           'wifi',
  'mdi:wifi-off':       'wifi_off',
  'mdi:bluetooth':      'bluetooth',
  'mdi:volume-high':    'volume_up',
  'mdi:volume-off':     'volume_off',
  'mdi:play':           'play_arrow',
  'mdi:pause':          'pause',
  'mdi:stop':           'stop',
  'mdi:camera':         'camera_alt',
  'mdi:video':          'videocam',
  'mdi:microphone':     'mic',
  'mdi:speaker':        'speaker',
  'mdi:television':     'tv',
  'mdi:phone':          'call',
  'mdi:message':        'message',
  'mdi:email':          'email',
  'mdi:calendar':       'calendar_today',
  'mdi:clock':          'schedule',
  'mdi:map-marker':     'location_on',
  'mdi:car':            'directions_car',
  'mdi:bus':            'directions_bus',
  'mdi:train':          'train',
  'mdi:walk':           'directions_walk',
  'mdi:run':            'directions_run',
  'mdi:bicycle':        'directions_bike',
  'mdi:alert':          'warning',
  'mdi:alert-circle':   'error',
  'mdi:information':    'info',
  'mdi:help-circle':    'help',
  'mdi:star':           'star',
  'mdi:heart':          'favorite',
  'mdi:trash-can':      'delete',
  'mdi:pencil':         'edit',
  'mdi:magnify':        'search',
  'mdi:close':          'close',
  'mdi:plus':           'add',
  'mdi:minus':          'remove',
  'mdi:refresh':        'refresh',
  'mdi:download':       'download',
  'mdi:upload':         'upload',
  'mdi:share':          'share',
  'mdi:cog':            'settings',
  'mdi:account':        'person',
  'mdi:account-group':  'group',
  'mdi:shield':         'shield',
  'mdi:key':            'key',
  'mdi:window':         'window',
  'mdi:power':          'power_settings_new',
  'mdi:shield-lock':    'lock',
  'mdi:shield-home':    'home',
  'mdi:lightbulb-on':           'lightbulb',
  'mdi:lightbulb-off':          'lightbulb',
  'mdi:lightbulb-group':        'lightbulb',
  'mdi:lightbulb-group-off':    'lightbulb',
  'mdi:ceiling-light':          'lightbulb',
  'mdi:ceiling-light-multiple': 'lightbulb',
  'mdi:floor-lamp':             'lightbulb',
  'mdi:desk-lamp':              'lightbulb',
  'mdi:lamp':                   'lightbulb',
  'mdi:string-lights':          'lightbulb',
  'mdi:led-strip':              'lightbulb',
  'mdi:led-strip-variant':      'lightbulb',
  'mdi:led-on':                 'lightbulb',
  // Cover icons
  'mdi:blinds':                 'window',
  'mdi:blinds-open':            'window',
  'mdi:curtains':               'window',
  'mdi:curtains-closed':        'window',
  'mdi:window-closed':          'window',
  'mdi:window-closed-variant':  'window',
  'mdi:window-open-variant':    'window',
  'mdi:roller-shade':           'window',
  'mdi:roller-shade-closed':    'window',
  'mdi:window-shutter':         'window',
  'mdi:window-shutter-open':    'window',
  'mdi:gate':                   'garage',
  'mdi:gate-open':              'garage',
  // Binary sensor state-variant icons
  'mdi:door-closed':            'door_open',
  'mdi:lock-open':              'lock',
  'mdi:lock-open-variant':      'lock',
  'mdi:motion-sensor-off':      'motion_sensor_active',
  'mdi:smoke-detector-off':     'detector_smoke',
  'mdi:smoke-detector-variant': 'detector_smoke',
  'mdi:water-off':              'water_drop',
};

// Source: https://fonts.google.com/icons?icon.style=Sharp
// TODO: verify codepoints from official Material Symbols metadata — source: https://fonts.google.com/icons?icon.style=Sharp
export const MSS_CODEPOINTS: Record<string, string> = {
  garage:              '',
  door_open:           '',
  lock:                '',
  security:            '',
  co2:                 '',
  air:                 '',
  factory:             '',
  mode_fan_off:        '',
  mode_fan:            '',
  power_settings_new:  '',
  thermostat:          '',
  water_drop:          '',
  outdoor_grill:       '',
  pool:                '',
  device_thermostat:   '',
  lightbulb:           '',
  arrow_upward:        '',
  arrow_downward:      '',
  check_circle:        '',
  kitchen:             '',
  electric_car:        '',
  // Additional glyphs referenced by MDI_TO_MSS values
  detector_smoke:      '',
  motion_sensor_active:'',
  window:              '',
  local_fire_department: '',
  alarm:               '',
  notifications:       '',
  home:                '',
  sunny:               '',
  rainy:               '',
  ac_unit:             '',
  cloud:               '',
  bolt:                '',
  power:               '',
  battery_full:        '',
  battery_1_bar:       '',
  wifi:                '',
  wifi_off:            '',
  bluetooth:           '',
  volume_up:           '',
  volume_off:          '',
  play_arrow:          '',
  pause:               '',
  stop:                '',
  camera_alt:          '',
  videocam:            '',
  mic:                 '',
  speaker:             '',
  tv:                  '',
  call:                '',
  message:             '',
  email:               '',
  calendar_today:      '',
  schedule:            '',
  location_on:         '',
  directions_car:      '',
  directions_bus:      '',
  train:               '',
  directions_walk:     '',
  directions_run:      '',
  directions_bike:     '',
  warning:             '',
  error:               '',
  info:                '',
  help:                '',
  star:                '',
  favorite:            '',
  delete:              '',
  edit:                '',
  search:              '',
  close:               '',
  add:                 '',
  remove:              '',
  refresh:             '',
  download:            '',
  upload:              '',
  share:               '',
  settings:            '',
  person:              '',
  group:               '',
  shield:              '',
  key:                 '',
};

/**
 * Returns the default MSS glyph name for an entity when no explicit icon is set
 * in attributes. Uses the domain extracted from entity_id and, for domains with
 * device classes, the device_class attribute.
 */
export function entityDefaultGlyph(entityId: string, deviceClass?: string): string {
  const domain = entityId.split('.')[0];
  switch (domain) {
    case 'light':
      return 'lightbulb';
    case 'cover':
      switch (deviceClass) {
        case 'garage': return 'garage';
        case 'gate':   return 'garage';
        case 'door':   return 'door_open';
        default:       return 'window';
      }
    case 'binary_sensor':
      switch (deviceClass) {
        case 'battery':         return 'battery_full';
        case 'carbon_monoxide': return 'detector_smoke';
        case 'cold':            return 'ac_unit';
        case 'connectivity':    return 'wifi';
        case 'door':            return 'door_open';
        case 'garage_door':     return 'garage';
        case 'gas':             return 'detector_smoke';
        case 'heat':            return 'local_fire_department';
        case 'light':           return 'sunny';
        case 'lock':            return 'lock';
        case 'moisture':        return 'water_drop';
        case 'motion':          return 'motion_sensor_active';
        case 'moving':          return 'motion_sensor_active';
        case 'occupancy':       return 'home';
        case 'opening':         return 'door_open';
        case 'plug':            return 'power';
        case 'presence':        return 'home';
        case 'problem':         return 'error';
        case 'running':         return 'play_arrow';
        case 'safety':          return 'shield';
        case 'smoke':           return 'detector_smoke';
        case 'sound':           return 'volume_up';
        case 'tamper':          return 'shield';
        case 'window':          return 'window';
        default:                return 'info';
      }
    case 'switch':
      return 'power';
    case 'lock':
      return 'lock';
    case 'alarm_control_panel':
      return 'security';
    case 'climate':
      return 'thermostat';
    case 'media_player':
      return 'tv';
    case 'fan':
      return 'mode_fan';
    case 'sensor':
      switch (deviceClass) {
        case 'temperature': return 'thermostat';
        case 'humidity':    return 'water_drop';
        case 'co2':         return 'co2';
        case 'pm25':
        case 'pm10':        return 'air';
        default:            return 'info';
      }
    default:
      return 'info';
  }
}

/**
 * Resolve a glyph name to a Material Symbols Sharp ligature string for canvas rendering.
 *
 * Returns the MSS icon name (e.g. "garage") which the MSS variable font renders via
 * OpenType ligature substitution. MDI names are mapped to their MSS equivalent.
 */
export function resolveGlyphForCanvas(name: string): string {
  if (!name) return MDI_FALLBACK;
  if (name === 'entity') {
    throw new Error('resolveGlyphForCanvas: "entity" must be resolved to a concrete name before calling');
  }
  if (name.startsWith('mdi:')) {
    const mssName = MDI_TO_MSS[name];
    if (mssName === undefined) {
      console.warn(`resolveGlyphForCanvas: no MDI→MSS mapping for "${name}" — add it to MDI_TO_MSS or use a Material Symbols Sharp name directly`);
      return MDI_FALLBACK;
    }
    return mssName;
  }
  // Raw unicode passthrough
  if (name.length === 1 && (name.codePointAt(0) ?? 0) > 127) return name;
  if (name.length === 2 && (name.codePointAt(0) ?? 0) > 0xFFFF) return name;
  // MSS name — return as-is; font ligature maps it to the correct icon
  return name;
}

/**
 * Resolve a glyph name to its Unicode codepoint character for ESPHome rendering.
 *
 * Cases:
 *   1. Empty string         -> MDI_FALLBACK ('?')
 *   2. 'mdi:...'            -> look up MDI_TO_MSS, then MSS_CODEPOINTS; fallback on miss
 *   3. 'entity'             -> throws — must be resolved before calling this function
 *   4. Single char > U+007F -> return as-is (raw unicode passthrough)
 *   5. Otherwise            -> look up MSS_CODEPOINTS; fallback on miss with console.warn
 */
export function resolveGlyph(name: string): string {
  // Case 1: empty string
  if (name.length === 0) {
    return MDI_FALLBACK;
  }

  // Case 3: sentinel that must be resolved upstream
  if (name === 'entity') {
    throw new Error('resolveGlyph: "entity" must be resolved to a concrete name before calling resolveGlyph');
  }

  // Case 2: MDI name
  if (name.startsWith('mdi:')) {
    const mssName = MDI_TO_MSS[name];
    if (mssName === undefined) {
      console.warn(
        `resolveGlyph: no MDI→MSS mapping for "${name}" — add the icon to MDI_TO_MSS or use a Material Symbols Sharp name directly`
      );
      return MDI_FALLBACK;
    }
    const codepoint = MSS_CODEPOINTS[mssName];
    if (!codepoint) {
      console.warn(
        `resolveGlyph: MDI "${name}" maps to MSS "${mssName}" but "${mssName}" is not in MSS_CODEPOINTS — add "${mssName}" to your ESPHome firmware's font_glyphs list`
      );
      return MDI_FALLBACK;
    }
    return codepoint;
  }

  // Case 4: single character with codepoint > 127 (raw unicode passthrough)
  if (name.length === 1) {
    const cp = name.codePointAt(0);
    if (cp !== undefined && cp > 127) {
      return name;
    }
  }
  // Also handle surrogate pairs (emoji / supplementary plane chars stored as 2 JS chars)
  if (name.length === 2) {
    const cp = name.codePointAt(0);
    if (cp !== undefined && cp > 0xFFFF) {
      return name;
    }
  }

  // Case 5: MSS name lookup
  const codepoint = MSS_CODEPOINTS[name];
  if (codepoint) {
    return codepoint;
  }
  console.warn(
    `resolveGlyph: glyph "${name}" not found in MSS_CODEPOINTS — add "${name}" to your ESPHome firmware's font_glyphs list`
  );
  return MDI_FALLBACK;
}
