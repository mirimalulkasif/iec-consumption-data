"""Data update coordinator for IEC Daily."""

from __future__ import annotations

import calendar
import logging
from dataclasses import dataclass
from datetime import date, datetime, timedelta
from typing import Any

from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.helpers.aiohttp_client import async_create_clientsession
from homeassistant.helpers.update_coordinator import DataUpdateCoordinator, UpdateFailed
from iec_api.iec_client import IecClient
from iec_api.models.exceptions import IECError
from iec_api.models.jwt import JWT
from iec_api.models.remote_reading import ReadingResolution

from .const import (
    ATTR_BILL_DAYS,
    ATTR_CONSUMPTION_COST,
    ATTR_DAY,
    ATTR_DAYS_COUNT,
    ATTR_FIXED_COST,
    ATTR_KWH_TARIFF,
    ATTR_METER_CODE,
    ATTR_METER_KIND,
    ATTR_METER_SERIAL,
    ATTR_METHOD,
    ATTR_PERIOD_FROM,
    ATTR_PERIOD_TO,
    ATTR_PROJECTED_KWH,
    CONF_BP_NUMBER,
    CONF_CONTRACT_ID,
    CONF_PERIOD_FROM,
    CONF_PERIOD_TO,
    CONF_TOKEN,
    CONF_USER_ID,
    DEFAULT_SCAN_INTERVAL,
    DOMAIN,
    TIMEZONE,
)

_LOGGER = logging.getLogger(__name__)


@dataclass
class DailyPoint:
    """One calendar day of consumption."""

    day: date
    kwh: float


@dataclass
class IecDailyData:
    """Coordinator payload."""

    latest: DailyPoint | None
    period_days: list[DailyPoint]
    period_kwh: float
    period_from: date
    period_to: date
    predicted_bill: float | None
    bill_attrs: dict[str, Any]
    meter_serial: str
    meter_code: str
    meter_kind: str
    contract_id: str
    customer_name: str
    kwh_tariff: float
    warnings: list[str]


def _today() -> date:
    return datetime.now(TIMEZONE).date()


def _first_of_month(d: date) -> date:
    return d.replace(day=1)


def _parse_ymd(value: str | None) -> date | None:
    if not value:
        return None
    try:
        return date.fromisoformat(value)
    except ValueError:
        return None


def _month_starts(span_from: date, span_to: date) -> list[date]:
    starts: list[date] = []
    cursor = _first_of_month(span_from)
    end = _first_of_month(span_to)
    while cursor <= end and len(starts) < 6:
        starts.append(cursor)
        if cursor.month == 12:
            cursor = date(cursor.year + 1, 1, 1)
        else:
            cursor = date(cursor.year, cursor.month + 1, 1)
    return starts


def _map_meter_kind(raw: str | None, producer_type: int | None) -> str:
    if producer_type == 1:
        return "Backstream"
    value = (raw or "Consumption").strip()
    if value.isdigit():
        return "Backstream" if int(value) == 2 else "Consumption"
    lowered = value.lower()
    if value == "צריכה" or lowered == "consumption":
        return "Consumption"
    if "דו" in value or lowered == "backstream":
        return "Backstream"
    return "Consumption"


class IecDailyCoordinator(DataUpdateCoordinator[IecDailyData]):
    """Fetch IEC remote readings and compute bill projection."""

    def __init__(self, hass: HomeAssistant, entry: ConfigEntry) -> None:
        super().__init__(
            hass,
            _LOGGER,
            name=DOMAIN,
            update_interval=DEFAULT_SCAN_INTERVAL,
        )
        self.entry = entry
        self._session = async_create_clientsession(hass)
        self.api = IecClient(entry.data[CONF_USER_ID], self._session)
        self._period_from = _parse_ymd(entry.options.get(CONF_PERIOD_FROM))
        self._period_to = _parse_ymd(entry.options.get(CONF_PERIOD_TO))

    async def async_set_period(self, period_from: date, period_to: date) -> None:
        """Update selected period and refresh."""
        if period_from > period_to:
            period_from, period_to = period_to, period_from
        today = _today()
        if period_to > today:
            period_to = today
        self._period_from = period_from
        self._period_to = period_to
        self.hass.config_entries.async_update_entry(
            self.entry,
            options={
                **self.entry.options,
                CONF_PERIOD_FROM: period_from.isoformat(),
                CONF_PERIOD_TO: period_to.isoformat(),
            },
        )
        await self.async_request_refresh()

    async def _ensure_token(self) -> None:
        token_data = self.entry.data.get(CONF_TOKEN)
        if not token_data:
            raise UpdateFailed("Missing IEC token — reconfigure the integration")
        try:
            await self.api.load_jwt_token(JWT.from_dict(token_data))
            await self.api.check_token()
        except IECError as err:
            raise UpdateFailed(f"IEC login expired: {err}") from err

        # Persist refreshed token if available
        try:
            jwt = self.api.get_token()
            refreshed = {
                "access_token": jwt.access_token,
                "refresh_token": jwt.refresh_token,
                "id_token": jwt.id_token,
                "token_type": jwt.token_type,
                "expires_in": jwt.expires_in,
                "scope": jwt.scope,
            }
            if refreshed != token_data:
                data = {**self.entry.data, CONF_TOKEN: refreshed}
                self.hass.config_entries.async_update_entry(self.entry, data=data)
        except Exception:  # noqa: BLE001
            _LOGGER.debug("Could not persist refreshed IEC token", exc_info=True)

    async def _async_update_data(self) -> IecDailyData:
        await self._ensure_token()

        warnings: list[str] = []
        bp_number = str(int(self.entry.data[CONF_BP_NUMBER]))
        contract_id = str(int(self.entry.data[CONF_CONTRACT_ID]))

        try:
            customer = await self.api.get_customer()
        except IECError as err:
            raise UpdateFailed(f"Customer fetch failed: {err}") from err

        customer_name = "IEC"
        if customer:
            customer_name = " ".join(
                part
                for part in [customer.first_name, customer.last_name]
                if part
            ).strip() or customer_name

        producer_type = 0
        try:
            contracts = await self.api.get_contracts(bp_number) or []
            for contract in contracts:
                if str(int(contract.contract_id)) == contract_id:
                    producer_type = getattr(contract, "producer_type", 0) or 0
                    break
        except IECError:
            warnings.append("Could not load contracts for meter kind")

        meter_serial = ""
        meter_code = ""
        meter_kind = _map_meter_kind(None, producer_type)

        try:
            device_in = await self.api.get_device_in(contract_id)
            devices = getattr(device_in, "devices", None) if device_in else None
            if devices:
                active = next((d for d in devices if d.is_active), devices[0])
                meter_serial = active.device_number
                meter_code = str(active.device_code)
                meter_kind = _map_meter_kind(
                    getattr(active, "meter_kind", None), producer_type
                )
        except (IECError, AttributeError, TypeError):
            devices = await self.api.get_devices(contract_id) or []
            if not devices:
                raise UpdateFailed("No IEC devices on this contract") from None
            active = next((d for d in devices if d.is_active), devices[0])
            meter_serial = active.device_number or ""
            meter_code = str(active.device_code or "")
            if not meter_serial or not meter_code:
                raise UpdateFailed("Meter serial/code missing") from None

        today = _today()
        period_to = self._period_to or today
        period_from = self._period_from or _first_of_month(today)
        if period_to > today:
            period_to = today
        if period_from > period_to:
            period_from = _first_of_month(period_to)

        # Always include current month so "latest" stays fresh even for old periods
        fetch_from = min(period_from, _first_of_month(today))
        fetch_to = max(period_to, today)

        by_day: dict[date, float] = {}
        future_consumption = 0.0
        invoice_anchor: date | None = None

        try:
            invoices_body = await self.api.get_billing_invoices(bp_number, contract_id)
            invoices = getattr(invoices_body, "invoices", None) if invoices_body else None
            if invoices:
                electric = [
                    inv
                    for inv in invoices
                    if str(getattr(inv, "document_id", "")) == "1"
                ] or list(invoices)
                electric.sort(
                    key=lambda inv: inv.full_date or datetime.min,
                    reverse=True,
                )
                top = electric[0]
                if top.full_date:
                    # HA: day after last invoice fullDate unlocks export / future data
                    invoice_anchor = (top.full_date + timedelta(days=1)).date()
                elif top.to_date:
                    invoice_anchor = (
                        top.to_date.date()
                        if hasattr(top.to_date, "date")
                        else top.to_date
                    )
        except IECError:
            warnings.append("No invoices — bill estimate uses calendar month")

        for month_start in _month_starts(fetch_from, fetch_to):
            # Never send 2000-01-01 — that stalls RemoteReadingRange
            last_invoice = invoice_anchor or month_start
            try:
                reading = await self.api.get_remote_reading(
                    meter_kind,
                    meter_serial,
                    int(meter_code),
                    datetime.combine(last_invoice, datetime.min.time()),
                    datetime.combine(month_start, datetime.min.time()),
                    ReadingResolution.MONTHLY,
                    contract_id,
                )
            except IECError as err:
                warnings.append(f"{month_start.isoformat()}: {err}")
                continue

            if not reading or not reading.meter_list:
                warnings.append(f"{month_start.isoformat()}: empty meterList")
                continue

            for meter in reading.meter_list:
                info = meter.future_consumption_info
                if info and info.future_consumption:
                    future_consumption = max(
                        future_consumption, float(info.future_consumption)
                    )
                for period in meter.period_consumptions or []:
                    day = period.interval.astimezone(TIMEZONE).date()
                    by_day[day] = by_day.get(day, 0.0) + float(period.consumption or 0)

        if not by_day:
            raise UpdateFailed(
                warnings[0]
                if warnings
                else "IEC returned no daily readings for this meter"
            )

        all_days = [
            DailyPoint(day=day, kwh=round(kwh, 3))
            for day, kwh in sorted(by_day.items())
        ]
        latest = all_days[-1]

        period_days = [
            point
            for point in all_days
            if period_from <= point.day <= period_to
        ]
        period_kwh = round(sum(point.kwh for point in period_days), 3)

        kwh_tariff = 0.0
        delivery_tariff = 0.0
        distribution_tariff = 0.0
        kva_tariff = 0.0
        try:
            kwh_tariff = float(await self.api.get_kwh_tariff())
        except IECError:
            warnings.append("Could not fetch kWh tariff")
        try:
            delivery_tariff = float(await self.api.get_delivery_tariff(1))
        except IECError:
            pass
        try:
            distribution_tariff = float(await self.api.get_distribution_tariff(1))
        except IECError:
            pass
        try:
            kva_tariff = float(await self.api.get_kva_tariff())
        except IECError:
            pass

        # Projection: prefer IEC futureConsumption (since last invoice); else MTD + avg
        method = "future_consumption"
        projected_kwh = future_consumption
        bill_days = today.day

        if projected_kwh <= 0:
            method = "mtd_average"
            month_points = [
                p for p in all_days if p.day.year == today.year and p.day.month == today.month
            ]
            mtd = sum(p.kwh for p in month_points)
            days_with_data = max(len(month_points), 1)
            days_in_month = calendar.monthrange(today.year, today.month)[1]
            avg = mtd / days_with_data
            projected_kwh = avg * days_in_month
            bill_days = days_in_month

        consumption_cost = round(projected_kwh * kwh_tariff, 2) if kwh_tariff else 0.0
        days_in_month = calendar.monthrange(today.year, today.month)[1]
        fixed = 0.0
        if delivery_tariff:
            fixed += (delivery_tariff / days_in_month) * bill_days
        if distribution_tariff:
            fixed += (distribution_tariff / days_in_month) * bill_days
        if kva_tariff:
            # Assume 1× connection size when unknown — still useful order-of-magnitude
            fixed += (kva_tariff / 365) * bill_days
        fixed = round(fixed, 2)
        predicted = round(consumption_cost + fixed, 2) if kwh_tariff else None
        if predicted is None:
            warnings.append("No tariff — cannot predict bill amount")

        return IecDailyData(
            latest=latest,
            period_days=period_days,
            period_kwh=period_kwh,
            period_from=period_from,
            period_to=period_to,
            predicted_bill=predicted,
            bill_attrs={
                ATTR_PROJECTED_KWH: round(projected_kwh, 3),
                ATTR_CONSUMPTION_COST: consumption_cost,
                ATTR_FIXED_COST: fixed,
                ATTR_BILL_DAYS: bill_days,
                ATTR_KWH_TARIFF: kwh_tariff,
                ATTR_METHOD: method,
            },
            meter_serial=meter_serial,
            meter_code=meter_code,
            meter_kind=meter_kind,
            contract_id=contract_id,
            customer_name=customer_name,
            kwh_tariff=kwh_tariff,
            warnings=warnings,
        )
