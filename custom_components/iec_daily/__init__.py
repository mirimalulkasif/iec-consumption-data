"""IEC Daily Home Assistant integration."""

from __future__ import annotations

import logging
from pathlib import Path

import voluptuous as vol
from homeassistant.config_entries import ConfigEntry
from homeassistant.const import Platform
from homeassistant.core import HomeAssistant, ServiceCall
from homeassistant.helpers import config_validation as cv
from homeassistant.helpers.typing import ConfigType

from .const import (
    CARD_FILENAME,
    DOMAIN,
    SERVICE_REFRESH,
    SERVICE_SET_PERIOD,
    STATIC_PATH,
)
from .coordinator import IecDailyCoordinator

_LOGGER = logging.getLogger(__name__)

PLATFORMS = [Platform.SENSOR]

SET_PERIOD_SCHEMA = vol.Schema(
    {
        vol.Required("from"): cv.date,
        vol.Required("to"): cv.date,
        vol.Optional("entry_id"): cv.string,
    }
)


async def async_setup(hass: HomeAssistant, config: ConfigType) -> bool:
    """Set up static frontend card once."""
    await _async_register_card(hass)
    return True


async def _async_register_card(hass: HomeAssistant) -> None:
    """Serve the Lovelace card and register it as a resource."""
    if hass.data.get(DOMAIN, {}).get("card_registered"):
        return

    www = Path(__file__).parent / "www"
    card_path = www / CARD_FILENAME
    if not card_path.exists():
        _LOGGER.warning("Lovelace card missing at %s", card_path)
        return

    try:
        from homeassistant.components.http import StaticPathConfig

        await hass.http.async_register_static_paths(
            [
                StaticPathConfig(STATIC_PATH, str(www), False),
            ]
        )
    except Exception:  # noqa: BLE001
        _LOGGER.debug("Static path registration skipped", exc_info=True)
        return

    url = f"{STATIC_PATH}/{CARD_FILENAME}"
    try:
        # Auto-add Lovelace resource if lovelace is available
        resources = hass.data.get("lovelace", {}).get("resources")
        if resources is not None:
            already = any(
                getattr(item, "url", None) == url
                or (isinstance(item, dict) and item.get("url") == url)
                for item in getattr(resources, "async_items", lambda: [])()
            )
            if not already and hasattr(resources, "async_create_item"):
                await resources.async_create_item({"res_type": "module", "url": url})
    except Exception:  # noqa: BLE001
        _LOGGER.debug(
            "Could not auto-register Lovelace resource %s — add it manually",
            url,
            exc_info=True,
        )

    hass.data.setdefault(DOMAIN, {})["card_registered"] = True
    hass.data[DOMAIN]["card_url"] = url


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Set up IEC Daily from a config entry."""
    await _async_register_card(hass)

    coordinator = IecDailyCoordinator(hass, entry)
    entry.runtime_data = coordinator
    await coordinator.async_config_entry_first_refresh()
    await hass.config_entries.async_forward_entry_setups(entry, PLATFORMS)

    async def _handle_set_period(call: ServiceCall) -> None:
        target = _resolve_coordinator(hass, call.data.get("entry_id"))
        await target.async_set_period(call.data["from"], call.data["to"])

    async def _handle_refresh(call: ServiceCall) -> None:
        target = _resolve_coordinator(hass, call.data.get("entry_id"))
        await target.async_request_refresh()

    if not hass.services.has_service(DOMAIN, SERVICE_SET_PERIOD):
        hass.services.async_register(
            DOMAIN,
            SERVICE_SET_PERIOD,
            _handle_set_period,
            schema=SET_PERIOD_SCHEMA,
        )
        hass.services.async_register(
            DOMAIN,
            SERVICE_REFRESH,
            _handle_refresh,
            schema=vol.Schema({vol.Optional("entry_id"): cv.string}),
        )

    return True


def _resolve_coordinator(
    hass: HomeAssistant, entry_id: str | None
) -> IecDailyCoordinator:
    entries = hass.config_entries.async_entries(DOMAIN)
    if entry_id:
        for entry in entries:
            if entry.entry_id == entry_id and entry.runtime_data:
                return entry.runtime_data
        raise ValueError(f"No iec_daily entry {entry_id}")
    for entry in entries:
        if entry.runtime_data:
            return entry.runtime_data
    raise ValueError("No active iec_daily integration")


async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Unload a config entry."""
    unload_ok = await hass.config_entries.async_unload_platforms(entry, PLATFORMS)
    if unload_ok:
        entry.runtime_data = None  # type: ignore[assignment]
        remaining = [
            e for e in hass.config_entries.async_entries(DOMAIN) if e.state.value == "loaded"
        ]
        if not remaining:
            hass.services.async_remove(DOMAIN, SERVICE_SET_PERIOD)
            hass.services.async_remove(DOMAIN, SERVICE_REFRESH)
    return unload_ok
