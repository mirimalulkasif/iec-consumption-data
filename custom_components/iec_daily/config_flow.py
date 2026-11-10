"""Config flow for IEC Daily."""

from __future__ import annotations

import logging
from typing import Any

import voluptuous as vol
from homeassistant import config_entries
from homeassistant.helpers.aiohttp_client import async_create_clientsession
from iec_api.iec_client import IecClient
from iec_api.models.exceptions import IECError

from .const import CONF_BP_NUMBER, CONF_CONTRACT_ID, CONF_TOKEN, CONF_USER_ID, DOMAIN

_LOGGER = logging.getLogger(__name__)

STEP_USER = vol.Schema(
    {
        vol.Required(CONF_USER_ID): str,
        vol.Required("prefer_sms", default=True): bool,
    }
)

STEP_OTP = vol.Schema({vol.Required("otp"): str})


def _digits(value: str) -> str:
    return "".join(ch for ch in value if ch.isdigit())


async def _pick_contract(api: IecClient) -> tuple[str, str]:
    customer = await api.get_customer()
    if not customer or not customer.bp_number:
        raise IECError(-1, "No customer / BP number")
    bp = str(int(customer.bp_number))
    contracts = await api.get_contracts(bp) or []
    if not contracts:
        raise IECError(-1, "No contracts on this account")
    smart = next((c for c in contracts if getattr(c, "smart_meter", False)), None)
    chosen = smart or contracts[0]
    return bp, str(int(chosen.contract_id))


class IecDailyConfigFlow(config_entries.ConfigFlow, domain=DOMAIN):
    """Handle IEC Daily config flow."""

    VERSION = 1

    def __init__(self) -> None:
        self._user_id: str | None = None
        self._api: IecClient | None = None
        self._factor_type: str | None = None

    async def async_step_user(
        self, user_input: dict[str, Any] | None = None
    ):
        errors: dict[str, str] = {}
        if user_input:
            self._user_id = _digits(user_input[CONF_USER_ID])
            prefer_sms = bool(user_input.get("prefer_sms", True))
            await self.async_set_unique_id(self._user_id)
            self._abort_if_unique_id_configured()

            session = async_create_clientsession(self.hass)
            self._api = IecClient(self._user_id, session)
            try:
                self._factor_type = await self._api.login_with_id(prefer_sms=prefer_sms)
                return await self.async_step_otp()
            except IECError:
                _LOGGER.exception("IEC login failed")
                errors["base"] = "invalid_auth"
            except Exception:  # noqa: BLE001
                _LOGGER.exception("IEC connect failed")
                errors["base"] = "cannot_connect"

        return self.async_show_form(
            step_id="user",
            data_schema=STEP_USER,
            errors=errors,
        )

    async def async_step_otp(
        self, user_input: dict[str, Any] | None = None
    ):
        errors: dict[str, str] = {}
        assert self._api and self._user_id

        if user_input:
            otp = _digits(user_input["otp"])
            try:
                await self._api.verify_otp(otp)
                await self._api.check_token()
                bp, contract_id = await _pick_contract(self._api)
                jwt = self._api.get_token()
                return self.async_create_entry(
                    title=f"IEC Daily ({contract_id})",
                    data={
                        CONF_USER_ID: self._user_id,
                        CONF_BP_NUMBER: bp,
                        CONF_CONTRACT_ID: contract_id,
                        CONF_TOKEN: {
                            "access_token": jwt.access_token,
                            "refresh_token": jwt.refresh_token,
                            "id_token": jwt.id_token,
                            "token_type": jwt.token_type,
                            "expires_in": jwt.expires_in,
                            "scope": jwt.scope,
                        },
                    },
                )
            except IECError:
                _LOGGER.exception("OTP verify failed")
                errors["base"] = "invalid_auth"
            except Exception:  # noqa: BLE001
                _LOGGER.exception("Contract discovery failed")
                errors["base"] = "cannot_connect"

        return self.async_show_form(
            step_id="otp",
            data_schema=STEP_OTP,
            errors=errors,
            description_placeholders={
                "factor": self._factor_type or "sms",
            },
        )

