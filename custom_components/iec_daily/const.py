"""Constants for IEC Daily."""

from datetime import timedelta
from zoneinfo import ZoneInfo

DOMAIN = "iec_daily"
PLATFORMS = ["sensor"]

CONF_USER_ID = "user_id"
CONF_BP_NUMBER = "bp_number"
CONF_CONTRACT_ID = "contract_id"
CONF_TOKEN = "token"
CONF_PERIOD_FROM = "period_from"
CONF_PERIOD_TO = "period_to"

ATTR_METER_SERIAL = "meter_serial"
ATTR_METER_CODE = "meter_code"
ATTR_METER_KIND = "meter_kind"
ATTR_DAY = "day"
ATTR_PERIOD_FROM = "period_from"
ATTR_PERIOD_TO = "period_to"
ATTR_DAYS_COUNT = "days_count"
ATTR_KWH_TARIFF = "kwh_tariff"
ATTR_PROJECTED_KWH = "projected_kwh"
ATTR_CONSUMPTION_COST = "consumption_cost"
ATTR_FIXED_COST = "fixed_cost"
ATTR_BILL_DAYS = "bill_days"
ATTR_METHOD = "method"

DEFAULT_SCAN_INTERVAL = timedelta(hours=6)
TIMEZONE = ZoneInfo("Asia/Jerusalem")

ILS = "₪"
SERVICE_SET_PERIOD = "set_period"
SERVICE_REFRESH = "refresh"

STATIC_PATH = "/iec_daily_static"
CARD_FILENAME = "iec-daily-card.js"
