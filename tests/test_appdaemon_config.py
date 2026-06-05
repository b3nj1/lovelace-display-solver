# Note: app.py AppDaemon-specific code (initialize, _on_state_change) cannot be
# unit tested without a running HA instance. Only config loading and payload packing
# are tested here.

import pytest
import textwrap

from appdaemon.apps.display_solver.config import load_config
from python_solver.types import DisplayProfile, EntityConfig, Defaults, GroupConfig


MINIMAL_VALID_YAML = textwrap.dedent("""\
    tiers:
      - warning
      - critical

    entities:
      - id: co2_sensor
        entity_id: sensor.co2
        glyph: cloud
        rules:
          - when:
              state: "above_threshold"
            then:
              tier: warning

    display_profiles:
      - id: living_room
        type: esphome
        screen_px: [320, 240]
        margin_px: [4, 4]
        viewing_distance: near
        idle_glyph: home
        glyph_sizes:
          medium:
            px: 24
            fits_cols: 1
        layouts:
          - icon_min: 1
            icon_max: 4
            size: medium
            cols: 2
            info_min: 0
            info_max: 2
""")


def test_valid_config_loads(tmp_path):
    """A minimal valid YAML loads without error and returns the correct 5-tuple."""
    config_file = tmp_path / "config.yaml"
    config_file.write_text(MINIMAL_VALID_YAML)

    result = load_config(str(config_file))
    assert isinstance(result, tuple)
    assert len(result) == 5

    entity_configs, display_profiles, tiers, defaults, groups = result
    assert isinstance(entity_configs, list)
    assert isinstance(display_profiles, list)
    assert isinstance(tiers, list)
    assert isinstance(defaults, Defaults)
    assert isinstance(groups, list)

    assert tiers == ["warning", "critical"]
    assert len(entity_configs) == 1
    assert isinstance(entity_configs[0], EntityConfig)
    assert len(display_profiles) == 1
    assert isinstance(display_profiles[0], DisplayProfile)


def test_missing_tiers_raises(tmp_path):
    """Config without 'tiers' key raises ValueError."""
    yaml_content = textwrap.dedent("""\
        entities:
          - id: co2_sensor
            entity_id: sensor.co2
    """)
    config_file = tmp_path / "config.yaml"
    config_file.write_text(yaml_content)

    with pytest.raises(ValueError, match="tiers"):
        load_config(str(config_file))


def test_invalid_tier_reference_in_rule_raises(tmp_path):
    """A rule referencing a tier not listed in 'tiers' raises ValueError."""
    yaml_content = textwrap.dedent("""\
        tiers:
          - warning

        entities:
          - id: co2_sensor
            entity_id: sensor.co2
            glyph: cloud
            rules:
              - when:
                  state: "on"
                then:
                  tier: nonexistent_tier
    """)
    config_file = tmp_path / "config.yaml"
    config_file.write_text(yaml_content)

    with pytest.raises(ValueError, match="nonexistent_tier"):
        load_config(str(config_file))


def test_thresholds_not_strictly_increasing_raises(tmp_path):
    """Threshold 'above' values that are not strictly increasing raise ValueError."""
    yaml_content = textwrap.dedent("""\
        tiers:
          - warning
          - critical

        entities:
          - id: co2_sensor
            entity_id: sensor.co2
            glyph: cloud
            thresholds:
              - above: 50
                tier: warning
              - above: 30
                tier: critical
    """)
    config_file = tmp_path / "config.yaml"
    config_file.write_text(yaml_content)

    with pytest.raises(ValueError, match="strictly increasing"):
        load_config(str(config_file))


def test_unknown_profile_type_raises(tmp_path):
    """A display profile with an unknown type (e.g. 'mqtt') raises ValueError."""
    yaml_content = textwrap.dedent("""\
        tiers:
          - warning

        display_profiles:
          - id: bad_profile
            type: mqtt
            screen_px: [320, 240]
            margin_px: [4, 4]
            viewing_distance: near
            idle_glyph: home
    """)
    config_file = tmp_path / "config.yaml"
    config_file.write_text(yaml_content)

    with pytest.raises(ValueError, match="mqtt"):
        load_config(str(config_file))
