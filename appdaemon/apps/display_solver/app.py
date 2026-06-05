from __future__ import annotations

import sys
import os
from dataclasses import dataclass, field
from typing import Any

_HERE = os.path.dirname(os.path.abspath(__file__))
_PROJECT_ROOT = os.path.abspath(os.path.join(_HERE, "..", "..", ".."))
if _PROJECT_ROOT not in sys.path:
    sys.path.insert(0, _PROJECT_ROOT)

try:
    import appdaemon.plugins.hass.hassapi as hass
except ImportError:
    hass = None
    _Hass = object  # fallback base class for type checking
else:
    _Hass = hass.Hass

BaseClass = _Hass

from python_solver.solver import solve, solve_all
from python_solver.types import (
    Defaults,
    DisplayProfile,
    EntityConfig,
    GroupConfig,
    SolverResult,
    StateObject,
)
from .config import load_config
from .esphome import pack_esphome_payload


@dataclass
class PageState:
    current_page: int = 0
    page_count: int = 1
    last_active_set_hash: str = ""
    dwell_timer: Any = None
    debounce_timer: Any = None


def _identity_glyph_resolver(name: str) -> str:
    """Pass-through glyph resolver: returns the name unchanged."""
    return name


class DisplaySolverApp(BaseClass):  # type: ignore[misc,valid-type]

    def initialize(self) -> None:
        config_path: str = self.args["config_path"]

        (
            self._entity_configs,
            self._display_profiles,
            self._tiers,
            self._defaults,
            self._groups,
        ) = load_config(config_path)

        self._page_states: dict[str, PageState] = {
            p.id: PageState() for p in self._display_profiles
        }
        self._last_states: dict[str, StateObject] = {}
        self._debounce_handle: Any = None

        # Subscribe to state changes for all configured entity_ids
        seen_entity_ids: set[str] = set()
        for cfg in self._entity_configs:
            if cfg.entity_id not in seen_entity_ids:
                seen_entity_ids.add(cfg.entity_id)
                self.listen_state(self._on_state_change, cfg.entity_id)

        # Run full solve immediately on startup
        self._run_solve()

    def _on_state_change(
        self,
        entity: str,
        attribute: str,
        old: Any,
        new: Any,
        kwargs: dict[str, Any],
    ) -> None:
        # Cancel any pending debounce timer
        if self._debounce_handle is not None:
            self.cancel_timer(self._debounce_handle)
            self._debounce_handle = None

        # Cancel all profile dwell timers on any state change — any entity change
        # potentially affects all profiles, so resetting all is conservative and correct.
        for profile_id, ps in self._page_states.items():
            if ps.dwell_timer is not None:
                self.cancel_timer(ps.dwell_timer)
                ps.dwell_timer = None
            ps.current_page = 0

        # Schedule debounced solve
        self._debounce_handle = self.run_in(self._debounced_solve, 0.5)

    def _debounced_solve(self, kwargs: dict[str, Any]) -> None:
        self._debounce_handle = None
        self._run_solve()

    def _run_solve(self) -> None:
        # Capture fresh state snapshot
        states: dict[str, StateObject] = {}
        for cfg in self._entity_configs:
            raw = self.get_state(cfg.entity_id, attribute="all")
            if raw is not None and isinstance(raw, dict):
                states[cfg.entity_id] = StateObject(
                    state=str(raw.get("state", "unavailable")),
                    attributes=raw.get("attributes", {}),
                )
            else:
                states[cfg.entity_id] = StateObject(state="unavailable")

        self._last_states = states

        current_pages = {pid: ps.current_page for pid, ps in self._page_states.items()}

        results = solve_all(
            entity_configs=self._entity_configs,
            states=states,
            tiers=self._tiers,
            defaults=self._defaults,
            profiles=self._display_profiles,
            glyph_resolver=_identity_glyph_resolver,
            groups=self._groups,
            current_pages=current_pages,
        )

        self._dispatch(results)

    def _dispatch(self, results: list[SolverResult]) -> None:
        profile_map: dict[str, DisplayProfile] = {p.id: p for p in self._display_profiles}

        for result in results:
            try:
                # Log warnings
                for warning in result.warnings:
                    self.log(warning, level="WARNING")

                # Log errors and skip dispatch if the solver errored
                if result.error:
                    self.log(
                        f"Solver error for profile '{result.profile_id}': {result.error_reason}",
                        level="ERROR",
                    )
                    continue

                profile = profile_map.get(result.profile_id)
                if profile is None:
                    self.log(
                        f"No profile found for profile_id '{result.profile_id}'",
                        level="ERROR",
                    )
                    continue

                if profile.type == "esphome" and profile.service:
                    payload = pack_esphome_payload(result, profile)
                    # Split service string "domain.service_name" into domain + service
                    parts = profile.service.split(".", 1)
                    if len(parts) == 2:
                        domain, service_name = parts
                        self.call_service(f"{domain}/{service_name}", **payload)
                    else:
                        self.log(
                            f"Profile '{profile.id}': service '{profile.service}' is not in 'domain.service' format",
                            level="ERROR",
                        )

                # Update page state and schedule dwell if needed
                ps = self._page_states.get(result.profile_id)
                if ps is not None:
                    ps.page_count = result.page_count
                    if result.page_count > 1:
                        if ps.dwell_timer is not None:
                            self.cancel_timer(ps.dwell_timer)
                            ps.dwell_timer = None
                        ps.dwell_timer = self.run_in(
                            self._dwell_callback,
                            profile.page_dwell_s,
                            profile_id=result.profile_id,
                        )

            except Exception as e:
                self.log(
                    f"Exception dispatching profile '{result.profile_id}': {e}",
                    level="ERROR",
                )

    def _dwell_callback(self, kwargs: dict[str, Any]) -> None:
        profile_id: str = kwargs.get("profile_id", "")
        ps = self._page_states.get(profile_id)
        if ps is None:
            return

        ps.dwell_timer = None

        # Increment page, wrap around
        ps.current_page = (ps.current_page + 1) % max(ps.page_count, 1)

        # Re-run solver for this profile only using the last known state snapshot
        profile_map: dict[str, DisplayProfile] = {p.id: p for p in self._display_profiles}
        profile = profile_map.get(profile_id)
        if profile is None:
            return

        try:
            result = solve(
                entity_configs=self._entity_configs,
                states=self._last_states,
                tiers=self._tiers,
                defaults=self._defaults,
                profile=profile,
                glyph_resolver=_identity_glyph_resolver,
                groups=self._groups,
                current_page=ps.current_page,
            )
            self._dispatch([result])
        except Exception as e:
            self.log(
                f"Exception during dwell re-solve for profile '{profile_id}': {e}",
                level="ERROR",
            )
