"""Sensors for IEC Daily."""

from __future__ import annotations

from homeassistant.components.sensor import (
    SensorDeviceClass,
    SensorEntity,
    SensorEntityDescription,
    SensorStateClass,
)
from homeassistant.config_entries import ConfigEntry
from homeassistant.const import UnitOfEnergy
from homeassistant.core import HomeAssistant
from homeassistant.helpers.device_registry import DeviceInfo
from homeassistant.helpers.entity_platform import AddEntitiesCallback
from homeassistant.helpers.update_coordinator import CoordinatorEntity

from .const import (
    ATTR_DAY,
    ATTR_DAYS_COUNT,
    ATTR_METER_CODE,
    ATTR_METER_KIND,
    ATTR_METER_SERIAL,
    ATTR_PERIOD_FROM,
    ATTR_PERIOD_TO,
    DOMAIN,
    ILS,
)
from .coordinator import IecDailyCoordinator, IecDailyData


async def async_setup_entry(
    hass: HomeAssistant,
    entry: ConfigEntry,
    async_add_entities: AddEntitiesCallback,
) -> None:
    """Set up IEC Daily sensors."""
    coordinator: IecDailyCoordinator = entry.runtime_data
    async_add_entities(
        [
            LatestDailySensor(coordinator, entry),
            PeriodConsumptionSensor(coordinator, entry),
            PredictedBillSensor(coordinator, entry),
            KwhTariffSensor(coordinator, entry),
        ]
    )


class IecDailyEntity(CoordinatorEntity[IecDailyCoordinator], SensorEntity):
    """Base entity."""

    _attr_has_entity_name = True

    def __init__(
        self,
        coordinator: IecDailyCoordinator,
        entry: ConfigEntry,
        description: SensorEntityDescription,
    ) -> None:
        super().__init__(coordinator)
        self.entity_description = description
        self._entry = entry
        contract = entry.data.get("contract_id", "iec")
        self._attr_unique_id = f"{entry.entry_id}_{description.key}"
        self._attr_device_info = DeviceInfo(
            identifiers={(DOMAIN, str(contract))},
            name=f"IEC Daily ({contract})",
            manufacturer="Israel Electric Corporation",
            model="Smart meter",
        )

    @property
    def data(self) -> IecDailyData | None:
        return self.coordinator.data


class LatestDailySensor(IecDailyEntity):
    """Latest available daily kWh."""

    def __init__(self, coordinator: IecDailyCoordinator, entry: ConfigEntry) -> None:
        super().__init__(
            coordinator,
            entry,
            SensorEntityDescription(
                key="latest_daily_consumption",
                name="Latest daily consumption",
                device_class=SensorDeviceClass.ENERGY,
                native_unit_of_measurement=UnitOfEnergy.KILO_WATT_HOUR,
                state_class=SensorStateClass.TOTAL,
                suggested_display_precision=2,
                icon="mdi:flash",
            ),
        )

    @property
    def native_value(self) -> float | None:
        if not self.data or not self.data.latest:
            return None
        return self.data.latest.kwh

    @property
    def extra_state_attributes(self) -> dict:
        if not self.data or not self.data.latest:
            return {}
        return {
            ATTR_DAY: self.data.latest.day.isoformat(),
            ATTR_METER_SERIAL: self.data.meter_serial,
            ATTR_METER_CODE: self.data.meter_code,
            ATTR_METER_KIND: self.data.meter_kind,
            "warnings": self.data.warnings,
        }


class PeriodConsumptionSensor(IecDailyEntity):
    """Sum of kWh for the selected period."""

    def __init__(self, coordinator: IecDailyCoordinator, entry: ConfigEntry) -> None:
        super().__init__(
            coordinator,
            entry,
            SensorEntityDescription(
                key="period_consumption",
                name="Period consumption",
                device_class=SensorDeviceClass.ENERGY,
                native_unit_of_measurement=UnitOfEnergy.KILO_WATT_HOUR,
                state_class=SensorStateClass.TOTAL,
                suggested_display_precision=2,
                icon="mdi:calendar-range",
            ),
        )

    @property
    def native_value(self) -> float | None:
        if not self.data:
            return None
        return self.data.period_kwh

    @property
    def extra_state_attributes(self) -> dict:
        if not self.data:
            return {}
        return {
            ATTR_PERIOD_FROM: self.data.period_from.isoformat(),
            ATTR_PERIOD_TO: self.data.period_to.isoformat(),
            ATTR_DAYS_COUNT: len(self.data.period_days),
            "days": [
                {"date": p.day.isoformat(), "kwh": p.kwh} for p in self.data.period_days
            ],
        }


class PredictedBillSensor(IecDailyEntity):
    """Predicted next bill amount in ILS."""

    def __init__(self, coordinator: IecDailyCoordinator, entry: ConfigEntry) -> None:
        super().__init__(
            coordinator,
            entry,
            SensorEntityDescription(
                key="predicted_bill",
                name="Predicted bill",
                device_class=SensorDeviceClass.MONETARY,
                native_unit_of_measurement=ILS,
                suggested_display_precision=2,
                icon="mdi:cash",
            ),
        )

    @property
    def native_value(self) -> float | None:
        if not self.data:
            return None
        return self.data.predicted_bill

    @property
    def extra_state_attributes(self) -> dict:
        if not self.data:
            return {}
        return dict(self.data.bill_attrs)


class KwhTariffSensor(IecDailyEntity):
    """Current kWh tariff."""

    def __init__(self, coordinator: IecDailyCoordinator, entry: ConfigEntry) -> None:
        super().__init__(
            coordinator,
            entry,
            SensorEntityDescription(
                key="kwh_tariff",
                name="kWh tariff",
                native_unit_of_measurement=f"{ILS}/kWh",
                suggested_display_precision=4,
                icon="mdi:tag",
            ),
        )

    @property
    def native_value(self) -> float | None:
        if not self.data:
            return None
        return self.data.kwh_tariff or None
