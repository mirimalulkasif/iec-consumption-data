"""Diagnostics for IEC Daily."""

from __future__ import annotations

from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant

from .const import CONF_TOKEN, CONF_USER_ID
from .coordinator import IecDailyCoordinator


async def async_get_config_entry_diagnostics(
    hass: HomeAssistant, entry: ConfigEntry
) -> dict:
    """Return diagnostics (no secrets)."""
    coordinator: IecDailyCoordinator | None = getattr(entry, "runtime_data", None)
    data = coordinator.data if coordinator else None
    return {
        "entry": {
            "title": entry.title,
            "user_id_len": len(str(entry.data.get(CONF_USER_ID, ""))),
            "has_token": bool(entry.data.get(CONF_TOKEN)),
            "contract_id": entry.data.get("contract_id"),
            "options": dict(entry.options),
        },
        "data": None
        if data is None
        else {
            "latest": None
            if not data.latest
            else {"day": data.latest.day.isoformat(), "kwh": data.latest.kwh},
            "period_from": data.period_from.isoformat(),
            "period_to": data.period_to.isoformat(),
            "period_kwh": data.period_kwh,
            "period_days": len(data.period_days),
            "predicted_bill": data.predicted_bill,
            "bill_attrs": data.bill_attrs,
            "meter_serial": data.meter_serial,
            "warnings": data.warnings,
        },
    }
