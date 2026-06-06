**Display Solver Card** is a Home Assistant frontend card that evaluates your entities against priority rules and automatically selects the best icon layout for your display — whether that's a browser canvas preview, an ESPHome OLED display, or a Chromecast.

Configure your entities and alert levels once. The card handles layout, icon sizing, severity bars, and icon overflow across multiple pages automatically. When any entity changes state, the solver re-evaluates and sends the updated icons to all configured display targets.

Supports Material Symbols Sharp and MDI icon names, configurable viewing distances (close / near / far), per-entity color rules, info line display, and burn-in drift for OLED displays.
