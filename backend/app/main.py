"""
restin.ai - Enterprise Hospitality OS
Clean server.py with modular route architecture
"""
from fastapi import FastAPI, APIRouter, Request, Depends
# Trigger Reload (Updated)
from fastapi.responses import FileResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from starlette.middleware.cors import CORSMiddleware
from starlette.middleware.gzip import GZipMiddleware
import os
import logging
from pathlib import Path

# Core imports
from core.config import FRONTEND_BUILD_DIR, STATIC_DIR, INDEX_FILE
from core.database import db, client
from core.middleware import RequestIDMiddleware, setup_exception_handlers
from core.idempotency_middleware import IdempotencyMiddleware
from core.security_middleware import RateLimitMiddleware
from core.dependencies import get_current_user, check_venue_access
from core.subdomain import subdomain_middleware, get_subdomain_context

# Models & Services
from models import UserRole
from services.id_service import ensure_ids
from services.permission_service import effective_permissions
from services.reporting_service import register_builtin_reports

# Event-Driven Architecture
from services.event_bus import event_bus
from services.service_registry import service_registry
from services.order_service_events import order_service
from services.inventory_service_events import inventory_service
from services.analytics_service_events import analytics_service
from services.email_service_events import email_service
from services.notification_service_events import notification_service
from services.payment_service_events import payment_service
from services.payroll_service_events import payroll_service

# Import event handlers to register them
import services.accounting_mt.journal_service
import services.analytics.metrics_service
import services.loyalty.earn_service
import services.inventory_suppliers.ledger_bridge
import services.inventory_suppliers.reporting_hooks
import services.observability_listeners  # Auto-capture errors

from utils.helpers import log_event

# Import all modular routers
from hr_routes import create_hr_router
from routes.auth_routes import create_auth_router
from app.routes.auth_jwks import jwks_router  # JWKS endpoint for RS256 public keys
from routes.system_routes import create_system_router
from routes.venue_routes import create_venue_router
from routes.menu_routes import create_menu_router
from routes.order_routes import create_order_router
from routes.guest_routes import create_guest_router
from routes.stats_routes import create_stats_router
from routes.finance_routes import create_finance_router
from routes.report_routes import create_report_router
from routes.document_routes import create_document_router
from routes.device_routes import create_device_router
from routes.admin_routes import create_admin_router
from routes.rbac_routes import create_rbac_router
from routes.event_routes import create_event_router
from routes.inventory_routes import create_inventory_router
from routes.order_ops_routes import create_order_ops_router
from routes.log_routes import create_log_router
from routes.procurement_routes import create_procurement_router
from routes.shift_routes import create_shift_router
from routes.manager_override_routes import create_manager_override_router
from routes.floor_plan_routes import create_floor_plan_router
from routes.utils_routes import create_utils_router
from routes.print_routes import create_print_router
from routes.telemetry_routes import create_telemetry_router
from routes.guide_routes import create_guide_router
from routes.menu_import_routes import create_menu_import_router
from routes.review_routes import create_review_router
from routes.audit_routes import create_audit_router
from routes.employee_routes import create_employee_router
from routes.inventory_suppliers import create_inventory_suppliers_router
from routes.inventory_data import create_inventory_data_router
from routes.inventory_purchase_orders import create_inventory_purchase_orders_router
from routes.inventory_receiving import create_inventory_receiving_router
from routes.inventory_items import create_inventory_items_router
from routes.inventory_counts import create_inventory_counts_router
from routes.chat_routes import create_chat_router
from routes.aggregators import create_aggregator_router
from routes.analytics import create_analytics_router
from routes.backup_routes import create_backup_router
from routes.public_content_routes import create_public_content_router
from routes.table_preferences_routes import create_table_preferences_router
from routes.table_presets_routes import create_table_presets_router
from routes.hr_feature_flags_routes import create_hr_feature_flags_router
from routes.hr_audit_routes import create_hr_audit_router
from routes.updates_routes import create_updates_router
from routes.bill_split_routes import create_bill_split_router
from routes.table_merge_routes import create_table_merge_router
from routes.observability_routes import create_observability_router
from routes.payroll_mt import create_payroll_mt_router
from routes.accounting_mt import create_accounting_mt_router
from routes.crm import create_crm_router
from routes.studio_routes import create_studio_router
from routes.web_routes import create_web_router
from routes.marketing_routes import create_marketing_router
from routes.loyalty import create_loyalty_router
from routes.automations import create_automations_router
from routes.connectors import create_connectors_router
from routes.voice_routes import router as voice_router
from routes.media_routes import router as media_router
from routes.radar_routes import router as radar_router
from routes.ops_routes import create_ops_router
from routes.billing_routes import create_billing_router
from routes.smart_home_routes import create_smart_home_router
from routes.nuki_oauth_routes import create_nuki_oauth_router
from routes.fintech_routes import create_fintech_router
from routes.pay_routes import router as pay_router
from routes.production_routes import create_production_router
from routes.pos_session_routes import create_pos_session_router
from routes.haccp_routes import router as haccp_router
from routes.data_export_routes import router as data_export_router
from routes.print_templates import router as print_templates_router
from app.domains.reporting.routes.reports_summary import create_summary_report_router
from routes.venue_config import create_venue_config_router
from routes.reservation_routes import router as reservation_router
from routes.inventory_adjustments import create_inventory_adjustments_router
from routes.reporting_rebuild import create_reporting_rebuild_router
from uix.routes.view_state import create_uix_view_state_router
from uix.routes.drilldown import create_uix_drilldown_router
from trust.routes.risk import create_trust_risk_router
from trust.routes.kill_switches import create_trust_kill_switches_router
from trust.routes.overrides import create_trust_overrides_router
from system_health.routes.health import create_system_health_router
from system_health.routes.integrity import create_system_integrity_router
from system_health.routes.jobs import create_system_jobs_router
from system_health.routes.observability import create_system_observability_router
from system_health.routes.diagnostics import create_system_diagnostic_router
from ops.routes.service_day_close import create_ops_service_day_close_router
from ops.routes.pre_go_live import create_ops_pre_go_live_router
from ops.routes.known_issues import create_ops_known_issues_router
from collab.routes.tasks import create_collab_tasks_router
from collab.routes.tickets import create_collab_tickets_router
from collab.routes.inbox import create_collab_inbox_router
from collab.routes.ptt import create_collab_ptt_router
from integrations.routes.integrations import create_integrations_router
from integrations_v2.routes.integrations_v2 import create_integrations_v2_router
from finance_provider.routes.provider import create_finance_provider_router
from fin_mt.routes.payroll import create_fin_mt_router
from ap.routes.ap import create_ap_router
from bank.routes.bank import create_bank_router
from cash.routes.cash import create_cash_router
from forecast.routes.forecast import create_forecast_router
from legal.routes.legal import create_legal_router
from google.routes.google import create_google_router
from google.routes.google_personal_routes import create_google_personal_router
from google.routes.google_sync_routes import create_google_sync_router
from reputation.routes.reputation import create_reputation_router
from res_ch.routes.res_ch import create_res_ch_router
from payments.routes.payments import create_payments_router
from devices_iot.routes.devices_iot import create_devices_iot_router
from workforce.routes.workforce import create_workforce_router
from apple.routes.apple import create_apple_router
from meta.routes.meta import create_meta_router
from routes.venue_group_routes import create_venue_group_router
from routes.user_settings_routes import create_2fa_router
from routes.venue_integrations_routes import create_venue_integrations_router
from routes.global_search_routes import create_global_search_router
from routes.pos_report_routes import create_pos_report_router
from routes.migration_routes import router as migration_router # Quick Sync
from routes.websocket_routes import create_websocket_router  # Real-time Notifications
from routes.fcm_routes import create_fcm_router  # Mobile Push Notifications
from routes.orders_routes import create_orders_router  # Frontend /api/orders compatibility
from routes.google_sso_routes import create_google_sso_router  # Google Workspace SSO
from google.routes.workspace_routes import create_workspace_routes  # Workspace domain mgmt
from routes.template_routes import create_template_router  # Template Wizard
from routes.template_assets_routes import create_template_assets_router  # Template Assets
from routes.import_template_routes import router as import_template_router  # Import Templates
from routes.crm_enhanced import router as crm_enhanced_router  # CRM 360 Guest Profiles
from routes.spotify_routes import create_spotify_router  # Spotify Music Control
from routes.notification_routes import create_notification_badge_router  # Notification Badges

# HR Parity Routes
from routes.summary_dashboard import router as summary_dashboard_router
from routes.employee_portal import router as employee_portal_router
from routes.scheduler import router as scheduler_router
from routes.clocking_data import router as clocking_data_router
from routes.approval_routes import router as approval_router
from routes.approval_settings_routes import router as approval_settings_router
from routes.employee_setup import router as employee_setup_router
# Legacy HR Analytics Routes removed (migrated to hr_analytics_advanced)
from routes.sick_leave_analysis import router as sick_leave_analysis_router
from routes.payroll_costs import router as payroll_costs_router
from routes.forecasting_costs import router as forecasting_costs_router
from routes.esg import router as esg_router
from routes.reporting import router as reporting_router
from routes.employee_detail import router as employee_detail_router
from routes.payroll import router as payroll_router
from routes.bank_export import router as bank_export_router
from routes.gov_reports import router as gov_reports_router
from routes.leave_parity import router as leave_parity_router

# New Unified Compliance Router
from routes.hr_compliance_mt import create_hr_compliance_mt_router

# New Ultimate & HR Advanced Routes
from routes.procurement_advanced import create_procurement_advanced_router
from routes.invoice_ai import create_invoice_ai_router
from routes.forecasting import create_forecasting_router
from routes.central_kitchen import create_central_kitchen_router
from routes.recipe_engineering import create_recipe_engineering_router
from routes.quality_control import create_quality_control_router
from routes.hr_leave_advanced import create_hr_leave_advanced_router
from routes.hr_payroll_advanced import create_hr_payroll_advanced_router
from routes.hr_expense import create_hr_expense_router
from routes.hr_performance import create_hr_performance_router
from routes.hr_documents_advanced import create_hr_documents_advanced_router
from routes.hr_sfm_accounting import create_hr_sfm_accounting_router
from routes.hr_analytics_advanced import create_hr_analytics_advanced_router
from routes.hr_employee_analytics import create_hr_employee_analytics_router
from routes.content_editor import create_content_editor_router
from routes.analytics_routes import create_analytics_routes as create_dashboard_analytics_router

# Print Bridge for Network Printing (Rule #30)
from devices.print_bridge import router as print_bridge_router

# KDS System Imports
from devices.routes import create_devices_router, create_pairing_router
from kds.routes import create_kds_admin_router, create_kds_runtime_router
from kds.routes.kds_test import create_kds_test_router
from pricing.routes import create_pricing_admin_router
from reporting_kds.routes import create_kds_reports_router

# POS System Imports
from pos.routes import create_pos_runtime_router
from pos.routes.pos_snapshots import create_pos_snapshot_router
from pos.routes.pos_discount_routes import create_pos_discount_router
from pos.routes.pos_split_bill_routes import create_pos_split_bill_router

# Inventory System Imports
from inventory.routes import create_inventory_routes

# ==================== APP SETUP ====================
app = FastAPI(title="restin.ai API", version="1.0.0")

# ==================== MIDDLEWARE (Order is critical) ====================
# In FastAPI, the LAST middleware added is the OUTERMOST layer.
# We want CORS to be the absolute first to see requests and last to see responses.

# 1. Request logging & identification (Inner-most among wraps)
app.add_middleware(RequestIDMiddleware)

# 2. Parse Subdomains (injects request.state.subdomain)
app.middleware("http")(subdomain_middleware)

# 3. Idempotency (prevents duplicates)
# app.add_middleware(IdempotencyMiddleware)

# 4. Rate Limiting
app.add_middleware(RateLimitMiddleware, requests_per_minute=2000)

# 4.5. GZip Compression (compress JSON responses >500 bytes)
app.add_middleware(GZipMiddleware, minimum_size=500)

# 5. Outermost: CORS (processes response LAST)
cors_origins_env = os.environ.get('CORS_ORIGINS', 'http://localhost:3000,http://127.0.0.1:3000').split(',')
cors_origins = [o.strip() for o in cors_origins_env if o.strip()]

# Standard dev origins
dev_origins = [
    "http://localhost:3000", "http://127.0.0.1:3000", 
    "http://localhost:8000", "http://127.0.0.1:8000",
    "http://localhost:3001", "http://127.0.0.1:3001",
    "http://192.168.31.243:3000", "http://192.168.31.243:8000",
    # Production origins
    "https://restin.ai", "https://www.restin.ai",
    "http://restin.ai", "http://www.restin.ai",
]
for dev in dev_origins:
    if dev not in cors_origins:
        cors_origins.append(dev)

# Add origins with trailing slashes
for origin in list(cors_origins):
    if not origin.endswith('/'):
        with_slash = origin + '/'
        if with_slash not in cors_origins:
            cors_origins.append(with_slash)

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
    max_age=600,  # Cache OPTIONS preflight for 10 minutes
)

# GZip compression — shrinks JSON responses by ~60-80%
from starlette.middleware.gzip import GZipMiddleware
app.add_middleware(GZipMiddleware, minimum_size=500)  # Only compress responses > 500 bytes

# Exception Handlers
setup_exception_handlers(app)


# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# ==================== CREATE ALL ROUTERS ====================
hr_router = create_hr_router(db, ensure_ids, log_event, check_venue_access, get_current_user, effective_permissions, UserRole)
auth_router = create_auth_router()
system_router = create_system_router()
venue_router = create_venue_router()
report_router = create_report_router()
rbac_router = create_rbac_router()
pos_report_router = create_pos_report_router()
menu_router = create_menu_router()
order_router = create_order_router()
guest_router = create_guest_router()
stats_router = create_stats_router()
finance_router = create_finance_router()
document_router = create_document_router()
device_router = create_device_router()
admin_router_new = create_admin_router()
event_router = create_event_router()
inventory_router = create_inventory_router()
order_ops_router = create_order_ops_router()
log_router = create_log_router()
procurement_router = create_procurement_router()
shift_router = create_shift_router()
manager_override_router = create_manager_override_router()
floor_plan_router = create_floor_plan_router()
utils_router = create_utils_router()
print_router = create_print_router()
telemetry_router = create_telemetry_router()
guide_router = create_guide_router()
menu_import_router = create_menu_import_router()
review_router = create_review_router()
audit_router = create_audit_router()
employee_router = create_employee_router()
inventory_suppliers_router = create_inventory_suppliers_router()
inventory_data_router = create_inventory_data_router()
inventory_purchase_orders_router = create_inventory_purchase_orders_router()
inventory_receiving_router = create_inventory_receiving_router()
inventory_items_router = create_inventory_items_router()
inventory_counts_router = create_inventory_counts_router()
chat_router = create_chat_router()
aggregator_router = create_aggregator_router()
analytics_router = create_analytics_router()
payroll_mt_router = create_payroll_mt_router()
accounting_mt_router = create_accounting_mt_router()
crm_router = create_crm_router()
studio_router_inst = create_studio_router()
web_router_inst = create_web_router()
marketing_router_inst = create_marketing_router()
loyalty_router = create_loyalty_router()
automations_router = create_automations_router()
connectors_router = create_connectors_router()
venue_config_router = create_venue_config_router()
inventory_adjustments_router = create_inventory_adjustments_router()
reporting_rebuild_router = create_reporting_rebuild_router()
uix_view_state_router = create_uix_view_state_router()
uix_drilldown_router = create_uix_drilldown_router()
trust_risk_router = create_trust_risk_router()
trust_kill_switches_router = create_trust_kill_switches_router()
trust_overrides_router = create_trust_overrides_router()
system_health_router = create_system_health_router()
system_integrity_router = create_system_integrity_router()
system_jobs_router = create_system_jobs_router()
system_observability_router = create_system_observability_router()
system_diagnostic_router = create_system_diagnostic_router()
ops_service_day_close_router = create_ops_service_day_close_router()
ops_pre_go_live_router = create_ops_pre_go_live_router()
ops_known_issues_router = create_ops_known_issues_router()
collab_tasks_router = create_collab_tasks_router()
collab_tickets_router = create_collab_tickets_router()
collab_inbox_router = create_collab_inbox_router()
collab_ptt_router = create_collab_ptt_router()
integrations_router = create_integrations_router()
integrations_v2_router = create_integrations_v2_router()
finance_provider_router = create_finance_provider_router()
fin_mt_router = create_fin_mt_router()
ap_router = create_ap_router()
bank_router = create_bank_router()
cash_router = create_cash_router()
forecast_router = create_forecast_router()
legal_router = create_legal_router()
google_router = create_google_router()
reputation_router = create_reputation_router()
res_ch_router = create_res_ch_router()
payments_router = create_payments_router()
devices_iot_router = create_devices_iot_router()
workforce_router = create_workforce_router()
apple_router = create_apple_router()
meta_router = create_meta_router()
venue_group_router = create_venue_group_router()
user_settings_router = create_2fa_router()
venue_integrations_router = create_venue_integrations_router()
global_search_router = create_global_search_router()
google_sso_router = create_google_sso_router()
workspace_router = create_workspace_routes()
backup_router = create_backup_router()
public_content_router = create_public_content_router()
table_preferences_router = create_table_preferences_router()
template_router = create_template_router()
template_assets_router = create_template_assets_router()
table_presets_router = create_table_presets_router()
hr_feature_flags_router = create_hr_feature_flags_router()
hr_audit_router = create_hr_audit_router()
updates_router = create_updates_router()
bill_split_router = create_bill_split_router()
table_merge_router = create_table_merge_router()
observability_router = create_observability_router()

# Ultimate & HR Advanced Routers
procurement_advanced_router = create_procurement_advanced_router()
invoice_ai_router = create_invoice_ai_router()
forecasting_router = create_forecasting_router()
central_kitchen_router = create_central_kitchen_router()
recipe_engineering_router = create_recipe_engineering_router()
quality_control_router = create_quality_control_router()
hr_leave_advanced_router = create_hr_leave_advanced_router()
hr_payroll_advanced_router = create_hr_payroll_advanced_router()
hr_expense_router = create_hr_expense_router()
hr_performance_router = create_hr_performance_router()
hr_documents_advanced_router = create_hr_documents_advanced_router()
hr_sfm_accounting_router = create_hr_sfm_accounting_router()
hr_analytics_advanced_router = create_hr_analytics_advanced_router()
hr_employee_analytics_router = create_hr_employee_analytics_router()
content_editor_router = create_content_editor_router()
hr_compliance_mt_router = create_hr_compliance_mt_router()
dashboard_analytics_router = create_dashboard_analytics_router()

# KDS System Routers
devices_router = create_devices_router()
pairing_router = create_pairing_router()
kds_admin_router = create_kds_admin_router()
kds_runtime_router = create_kds_runtime_router()
kds_test_router = create_kds_test_router()
pricing_router = create_pricing_admin_router()
kds_reports_router = create_kds_reports_router()

# POS System Routers
pos_runtime_router = create_pos_runtime_router()
pos_snapshot_router = create_pos_snapshot_router()

# Inventory System Routers
inventory_router_new = create_inventory_routes()
production_router = create_production_router()
pos_session_router = create_pos_session_router()

# ==================== MOUNT ALL ROUTERS ====================
# ==================== MOUNT ALL ROUTERS ON API PREFIX ====================
api_main = APIRouter(prefix="/api")

# Foundational routers
api_main.include_router(auth_router)
api_main.include_router(jwks_router)  # JWKS (.well-known/jwks.json)
api_main.include_router(system_router)
api_main.include_router(venue_router)
api_main.include_router(menu_router)
api_main.include_router(radar_router)
api_main.include_router(create_ops_router())
api_main.include_router(create_billing_router())
api_main.include_router(create_smart_home_router())
api_main.include_router(create_nuki_oauth_router())
api_main.include_router(create_fintech_router())
api_main.include_router(pay_router)
api_main.include_router(create_aggregator_router(), prefix="/aggregators")
api_main.include_router(guest_router)
api_main.include_router(stats_router)
api_main.include_router(finance_router)
api_main.include_router(report_router)
api_main.include_router(pos_report_router)
api_main.include_router(document_router)
api_main.include_router(device_router)
api_main.include_router(inventory_router)
api_main.include_router(log_router)
api_main.include_router(procurement_router)
api_main.include_router(shift_router)
api_main.include_router(manager_override_router)
api_main.include_router(floor_plan_router)
api_main.include_router(utils_router)
api_main.include_router(print_router)
api_main.include_router(print_bridge_router)  # TCP Socket Print Bridge
api_main.include_router(telemetry_router)
api_main.include_router(guide_router)
api_main.include_router(menu_import_router)
api_main.include_router(migration_router)  # Quick Sync Migration
api_main.include_router(review_router)
api_main.include_router(audit_router)
api_main.include_router(event_router)
api_main.include_router(employee_router)
api_main.include_router(inventory_suppliers_router)
api_main.include_router(inventory_data_router)
api_main.include_router(inventory_purchase_orders_router)
api_main.include_router(inventory_receiving_router)
api_main.include_router(inventory_items_router)
api_main.include_router(inventory_counts_router)
api_main.include_router(chat_router)
api_main.include_router(aggregator_router)
api_main.include_router(analytics_router)
api_main.include_router(payroll_mt_router)
api_main.include_router(accounting_mt_router)
api_main.include_router(crm_router)
api_main.include_router(studio_router_inst)
api_main.include_router(web_router_inst)
api_main.include_router(marketing_router_inst)
api_main.include_router(loyalty_router)
api_main.include_router(automations_router)
api_main.include_router(connectors_router)
api_main.include_router(voice_router)
api_main.include_router(media_router)
# api_main.include_router(radar_router) # Already mounted at line 423
api_main.include_router(venue_config_router)
api_main.include_router(reservation_router)
api_main.include_router(inventory_adjustments_router)
api_main.include_router(reporting_rebuild_router)
api_main.include_router(uix_view_state_router)
api_main.include_router(uix_drilldown_router)
api_main.include_router(trust_risk_router)
api_main.include_router(trust_kill_switches_router)
api_main.include_router(trust_overrides_router)
api_main.include_router(system_health_router)
api_main.include_router(system_integrity_router)
api_main.include_router(system_jobs_router)
api_main.include_router(haccp_router)
api_main.include_router(data_export_router)
api_main.include_router(print_templates_router)
api_main.include_router(system_observability_router)
api_main.include_router(system_diagnostic_router)
api_main.include_router(ops_service_day_close_router)
api_main.include_router(ops_pre_go_live_router)
api_main.include_router(ops_known_issues_router)
api_main.include_router(collab_tasks_router)
api_main.include_router(collab_tickets_router)
api_main.include_router(collab_inbox_router)
api_main.include_router(collab_ptt_router)
api_main.include_router(integrations_router)
api_main.include_router(integrations_v2_router)
api_main.include_router(finance_provider_router)
api_main.include_router(fin_mt_router)
api_main.include_router(ap_router)
api_main.include_router(bank_router)
api_main.include_router(cash_router)
api_main.include_router(forecast_router)
api_main.include_router(legal_router)
api_main.include_router(google_router)
google_personal_router = create_google_personal_router()
api_main.include_router(google_personal_router)
google_sync_router = create_google_sync_router()
api_main.include_router(google_sync_router)
api_main.include_router(reputation_router)
api_main.include_router(res_ch_router)
api_main.include_router(payments_router)
api_main.include_router(devices_iot_router)
api_main.include_router(workforce_router)
api_main.include_router(apple_router)
api_main.include_router(meta_router)
api_main.include_router(venue_group_router)
api_main.include_router(user_settings_router)
api_main.include_router(venue_integrations_router)
api_main.include_router(global_search_router)
api_main.include_router(google_sso_router)
api_main.include_router(workspace_router)
api_main.include_router(backup_router)
api_main.include_router(public_content_router)
api_main.include_router(table_preferences_router)
api_main.include_router(table_presets_router)
api_main.include_router(hr_feature_flags_router)
api_main.include_router(hr_audit_router)
api_main.include_router(updates_router)
api_main.include_router(bill_split_router)
api_main.include_router(table_merge_router)
api_main.include_router(observability_router)
api_main.include_router(migration_router, tags=["Migration"])
api_main.include_router(user_settings_router)

# Gamification (Leaderboard, Quests, XP)
from routes.gamification_routes import create_gamification_router
gamification_router = create_gamification_router()
api_main.include_router(gamification_router)

# WebSocket for real-time notifications
websocket_router = create_websocket_router()
api_main.include_router(websocket_router)

# FCM for mobile push notifications
fcm_router = create_fcm_router()
api_main.include_router(fcm_router)

# Notification badge counts for sidebar/header
from routes.notification_routes import create_notification_badge_router
notif_badge_router = create_notification_badge_router()
api_main.include_router(notif_badge_router)

# Orders API for frontend compatibility (/api/orders)
orders_router = create_orders_router()
api_main.include_router(orders_router)

# User Sync utility
from routes.user_sync import create_user_sync_router
user_sync_router = create_user_sync_router()
api_main.include_router(user_sync_router)

# Admin User Management (CRUD, Archive, PIN Reset, Employee Linking)
from routes.admin_user_routes import create_admin_user_router
admin_user_router = create_admin_user_router()
api_main.include_router(admin_user_router)

# RBAC (Roles, Context Switching, Audit)
from routes.rbac_routes import create_rbac_router
rbac_router = create_rbac_router()
api_main.include_router(rbac_router)

# Restin AI Module Settings (Copilot, Voice, Studio, Radar, CRM)
from routes.restin_settings_routes import router as restin_settings_router
api_main.include_router(restin_settings_router)

# AI Provider Key Management (Multi-Provider Integration)
from routes.ai_keys_routes import router as ai_keys_router
api_main.include_router(ai_keys_router)

# AI Free Model Seed & Setup Guide
from routes.ai_seed_routes import router as ai_seed_router
api_main.include_router(ai_seed_router)

from routes.clocking_seeder import create_clocking_seeder_router
clocking_seeder_router = create_clocking_seeder_router()
api_main.include_router(clocking_seeder_router)

# Ultimate & HR Advanced Routers
api_main.include_router(procurement_advanced_router)
api_main.include_router(invoice_ai_router)
api_main.include_router(forecasting_router)
api_main.include_router(central_kitchen_router)
api_main.include_router(recipe_engineering_router)
api_main.include_router(quality_control_router)
api_main.include_router(hr_leave_advanced_router)
api_main.include_router(hr_payroll_advanced_router)

# HR Bridge: maps frontend hyphenated URLs to existing collections
from routes.hr_bridge_routes import create_hr_bridge_router
api_main.include_router(create_hr_bridge_router())
api_main.include_router(hr_expense_router)
api_main.include_router(migration_router)
api_main.include_router(recipe_engineering_router)

api_main.include_router(hr_performance_router)
api_main.include_router(crm_enhanced_router)  # CRM Enhanced (Guest 360)
api_main.include_router(create_spotify_router())  # Spotify Music Control
api_main.include_router(hr_documents_advanced_router)
api_main.include_router(hr_sfm_accounting_router)
api_main.include_router(hr_analytics_advanced_router)
api_main.include_router(hr_employee_analytics_router)
api_main.include_router(content_editor_router)
api_main.include_router(dashboard_analytics_router)

# HR Parity Routers
api_main.include_router(summary_dashboard_router)
api_main.include_router(employee_portal_router)
api_main.include_router(scheduler_router)
api_main.include_router(clocking_data_router)
api_main.include_router(approval_router)
api_main.include_router(approval_settings_router)
api_main.include_router(employee_setup_router)
# Migrated: api_main.include_router(headcount_router)
# Migrated: api_main.include_router(turnover_router)
api_main.include_router(sick_leave_analysis_router)
api_main.include_router(payroll_costs_router)
api_main.include_router(forecasting_costs_router)
api_main.include_router(esg_router)
api_main.include_router(reporting_router)
api_main.include_router(employee_detail_router)
# api_main.include_router(payroll_router) # Redundant: merged into hr_payroll_advanced_router
api_main.include_router(bank_export_router)
api_main.include_router(gov_reports_router)
api_main.include_router(hr_compliance_mt_router)

# ── Shireburn Indigo Parity Routers (Gap Closure) ──
from routes.hiring import create_hiring_router
hiring_router = create_hiring_router()
api_main.include_router(hiring_router)

from routes.hr_calendar import create_hr_calendar_router
hr_calendar_router = create_hr_calendar_router()
api_main.include_router(hr_calendar_router)

from routes.hr_onboarding import create_hr_onboarding_router
hr_onboarding_router = create_hr_onboarding_router()
api_main.include_router(hr_onboarding_router)

from routes.salary_benchmarks import create_salary_benchmarks_router
salary_benchmarks_router = create_salary_benchmarks_router()
api_main.include_router(salary_benchmarks_router)

from routes.employee_tags import create_employee_tags_router
employee_tags_router = create_employee_tags_router()
api_main.include_router(employee_tags_router)

from routes.webhook_audit import create_webhook_audit_router
webhook_audit_router = create_webhook_audit_router()
api_main.include_router(webhook_audit_router)

# AI Copilot Routes
from routes.ai_routes import router as ai_copilot_router
api_main.include_router(ai_copilot_router)

# Studio Routes (Pillar 5)
from routes.studio_routes import create_studio_router
api_main.include_router(create_studio_router())

# Voice AI Routes (Pillar 4)
from routes.voice_routes import router as voice_router
api_main.include_router(voice_router)

# Market Radar Routes (Pillar 6)
from routes.radar_routes import router as radar_router
api_main.include_router(radar_router)

# CRM Routes (Pillar 3)
from routes.crm import create_crm_router
api_main.include_router(create_crm_router())

# Loyalty Routes
from routes.loyalty import create_loyalty_router
api_main.include_router(create_loyalty_router())

# Payroll Malta Routes
from routes.payroll_mt import create_payroll_mt_router
api_main.include_router(create_payroll_mt_router())

# Web Architect Routes (Pillar 2)
from routes.web_routes import create_web_router
api_main.include_router(create_web_router())

# Ops Routes (Pillar 7)
from routes.ops_routes import create_ops_router
api_main.include_router(create_ops_router())

# Fintech Routes (Pillar 8)
from routes.fintech_routes import create_fintech_router
api_main.include_router(create_fintech_router())

# Tip Presets Routes (Lightspeed Parity)
from routes.tip_presets_routes import create_tip_presets_router
api_main.include_router(create_tip_presets_router())

# Combo / Item Group Routes (Lightspeed Parity)
from routes.combo_routes import create_combo_router
api_main.include_router(create_combo_router())

# Order Anywhere Routes (Lightspeed Parity Phase 2)
from routes.order_anywhere_routes import create_order_anywhere_router
api_main.include_router(create_order_anywhere_router())

# Tableside Ordering Routes (Lightspeed Parity Phase 3)
from routes.tableside_routes import create_tableside_router
api_main.include_router(create_tableside_router())

# Pulse Analytics Routes (Lightspeed Parity Phase 4)
from routes.pulse_analytics_routes import create_pulse_analytics_router
api_main.include_router(create_pulse_analytics_router())

# Finance Routes (Kiosk, Split, Reports)
from routes.finance_routes import create_finance_router
api_main.include_router(create_finance_router())

# Aggregator Routes (Wolt/Uber/Bolt)
from routes.aggregators import create_aggregator_router
api_main.include_router(create_aggregator_router())
api_main.include_router(leave_parity_router)
api_main.include_router(create_summary_report_router())

# Main HR factory router
api_main.include_router(hr_router)

# System specific
api_main.include_router(devices_router)
api_main.include_router(pairing_router)
api_main.include_router(kds_admin_router)
api_main.include_router(kds_runtime_router)
api_main.include_router(kds_test_router)
api_main.include_router(pricing_router)
api_main.include_router(kds_reports_router)
api_main.include_router(pos_runtime_router)
api_main.include_router(pos_snapshot_router)
api_main.include_router(create_pos_discount_router())
api_main.include_router(create_pos_split_bill_router())
api_main.include_router(inventory_router_new)
api_main.include_router(production_router)
api_main.include_router(pos_session_router)

# POS/KDS Theme Builder API
from routes.pos_theme_routes import router as pos_theme_router
api_main.include_router(pos_theme_router)
api_main.include_router(admin_router_new)
api_main.include_router(template_router)
api_main.include_router(template_assets_router)
api_main.include_router(import_template_router)  # Import Template CRUD

rbac_router = create_rbac_router()
api_main.include_router(rbac_router)

# Group-level integration overview (cross-venue matrix)
from routes.group_integrations import create_group_integrations_router
group_integrations_router = create_group_integrations_router()
api_main.include_router(group_integrations_router)

# NEW: Version endpoint for system health
@api_main.get("/system/version")
async def get_system_version():
    return {"version": "1.0.0-restin", "status": "healthy"}

# Hive Communication Hub (Chat, Tasks, Staff)
from routes.hive_routes import router as hive_router
api_main.include_router(hive_router, prefix="/hive", tags=["hive"])

# Deployment Monitor (Vercel/Render Health Check & Auto-Redeploy)
from routes.monitor_routes import router as monitor_router
api_main.include_router(monitor_router)

# Finally, mount api_main onto the app
app.include_router(api_main)

# Access Control (Nuki) — has /api/access-control prefix baked in, mount on app directly
from app.domains.access_control.routes import router as access_control_router
app.include_router(access_control_router)

# ==================== APP.DOMAINS MODULE ROUTERS ====================
# These are domain-driven modules under app/domains/ that complement
# the routes/ directory with additional or refactored implementations.
try:
    from app.domains.hr import router as hr_domain_router
    app.include_router(hr_domain_router)
except ImportError:
    logger.warning("app.domains.hr not available")

try:
    from app.domains.inventory import router as inventory_domain_router
    app.include_router(inventory_domain_router)
except ImportError:
    logger.warning("app.domains.inventory not available")

try:
    from app.domains.pos.routes import router as pos_domain_router
    app.include_router(pos_domain_router, prefix="/api/pos", tags=["pos-domain"])
except ImportError:
    logger.warning("app.domains.pos not available")

try:
    from app.domains.billing.routes import router as billing_domain_router
    app.include_router(billing_domain_router, prefix="/api/billing", tags=["billing-domain"])
except ImportError:
    logger.warning("app.domains.billing not available")

try:
    from app.domains.auth import router as auth_domain_router
    app.include_router(auth_domain_router)
except ImportError:
    logger.warning("app.domains.auth not available")

try:
    from app.domains.auth.routes import admin_router as auth_admin_router
    app.include_router(auth_admin_router)
except ImportError:
    logger.warning("app.domains.auth.routes admin not available")

try:
    from app.domains.analytics.routes import router as analytics_domain_router
    app.include_router(analytics_domain_router)
except ImportError:
    logger.warning("app.domains.analytics not available")

try:
    from app.domains.venues import router as venues_domain_router
    app.include_router(venues_domain_router)
except ImportError:
    logger.warning("app.domains.venues not available")

try:
    from app.domains.migrations import router as migrations_domain_router
    app.include_router(migrations_domain_router)
except ImportError:
    logger.warning("app.domains.migrations not available")

try:
    from app.domains.uploads import router as uploads_domain_router
    app.include_router(uploads_domain_router)
except ImportError:
    logger.warning("app.domains.uploads not available")

try:
    from app.domains.voice import router as voice_domain_router
    app.include_router(voice_domain_router)
except ImportError:
    logger.warning("app.domains.voice not available")

try:
    from app.domains.crm import router as crm_domain_router
    app.include_router(crm_domain_router)
except ImportError:
    logger.warning("app.domains.crm not available")

try:
    from app.domains.web import router as web_domain_router
    app.include_router(web_domain_router)
except ImportError:
    logger.warning("app.domains.web not available")

try:
    from app.domains.studio import router as studio_domain_router
    app.include_router(studio_domain_router)
except ImportError:
    logger.warning("app.domains.studio not available")

try:
    from app.domains.radar import router as radar_domain_router
    app.include_router(radar_domain_router)
except ImportError:
    logger.warning("app.domains.radar not available")

try:
    from app.domains.fintech import router as fintech_domain_router
    app.include_router(fintech_domain_router)
except ImportError:
    logger.warning("app.domains.fintech not available")

try:
    from app.domains.ops import router as ops_domain_router
    app.include_router(ops_domain_router)
except ImportError:
    logger.warning("app.domains.ops not available")

try:
    from app.domains.forecasting import router as forecasting_domain_router
    app.include_router(forecasting_domain_router)
except ImportError:
    logger.warning("app.domains.forecasting not available")

try:
    from app.domains.tables import router as tables_domain_router
    app.include_router(tables_domain_router)
except ImportError:
    logger.warning("app.domains.tables not available")

try:
    from app.domains.system import router as system_domain_router
    app.include_router(system_domain_router)
except ImportError:
    logger.warning("app.domains.system not available")

try:
    from app.domains.catchall import router as catchall_domain_router
    app.include_router(catchall_domain_router)
except ImportError:
    logger.warning("app.domains.catchall not available")

try:
    from app.domains.integrations.smart_home_routes import router as smart_home_domain_router
    app.include_router(smart_home_domain_router, prefix="/api/smart-home", tags=["smart-home-domain"])
except ImportError:
    logger.warning("app.domains.integrations.smart_home not available")

try:
    from app.domains.integrations.routes import router as integrations_domain_router
    app.include_router(integrations_domain_router, prefix="/api/v1/integrations", tags=["integrations-domain"])
except ImportError:
    logger.warning("app.domains.integrations not available")

# Hive Chat
try:
    from routes.hive_routes import router as hive_api_router
    app.include_router(hive_api_router, prefix="/api/hive", tags=["hive"])
except ImportError:
    logger.warning("routes.hive_routes not available")

# Legal Entities
try:
    from routes.legal_entities import router as legal_entities_api_router
    app.include_router(legal_entities_api_router)
except ImportError:
    logger.warning("routes.legal_entities not available")

# ==================== UNIQUE ENDPOINTS (from old app/main.py) ====================
from fastapi import Body, Header as FastAPIHeader

# ── Secure Vault (PII Encryption) ──
@app.post("/api/employees/secure-vault")
async def create_secret_vault(
    emp_id: str = Body(...),
    secrets: dict = Body(...)
):
    try:
        from app.core.crypto.envelope import EnvelopeCrypto
        encrypted = EnvelopeCrypto.encrypt(secrets)
        vault_db = db
        await vault_db.secrets.update_one(
            {"emp_id": emp_id},
            {"$set": {"emp_id": emp_id, "data": encrypted}},
            upsert=True
        )
        logger.info(f"Vault created for employee {emp_id}")
        return {"status": "secured", "emp_id": emp_id}
    except Exception as e:
        logger.error(f"Vault creation failed: {e}")
        from fastapi import HTTPException as VaultHTTPException
        raise VaultHTTPException(status_code=500, detail="Encryption failure")

@app.get("/api/employees/{emp_id}/reveal")
async def reveal_sensitive_data(
    emp_id: str,
    type: str,
    user_agent: str = FastAPIHeader(None)
):
    from datetime import datetime as dt
    logger.info(f"[ALERT] AUDIT LOG: Access to {type} for Employee {emp_id} at {dt.now()} [UA: {user_agent}]")
    vault_db = db
    record = await vault_db.secrets.find_one({"emp_id": emp_id})
    if not record or not record.get("data"):
        logger.warning(f"Vault access denied: Not found for {emp_id}")
        from fastapi import HTTPException as VaultHTTPException
        raise VaultHTTPException(404, "Vault not found")
    try:
        from app.core.crypto.envelope import EnvelopeCrypto
        full_data = EnvelopeCrypto.decrypt(record["data"])
    except Exception as e:
        logger.critical(f"Security integrity breach attempt or error: {e}")
        from fastapi import HTTPException as VaultHTTPException
        raise VaultHTTPException(500, "Security Integrity Error")
    if type == "SALARY":
        return {"gross_annual": full_data.get("salary_gross")}
    elif type == "MEDICAL":
        return {"notes": full_data.get("medical_notes")}
    elif type == "FULL":
        return full_data
    return {"error": "Invalid data type"}

# ── Malta Payroll Calculator ──
@app.post("/api/payroll/calculate")
async def calculate_payroll_endpoint(request: dict = Body(...)):
    try:
        from app.services.malta_payroll import MaltaPayrollEngine
        from app.models.schemas import PayrollRequest
        req = PayrollRequest(**request)
        return MaltaPayrollEngine.calculate(req.gross_annual, req.tax_category, req.cola_eligible)
    except Exception as e:
        logger.error(f"Payroll calculation error: {e}")
        return {"error": str(e)}

# ── AI Gateway (Mock) ──
@app.post("/ai/generate")
async def generate_ai_content(
    provider: str = Body(...),
    model: str = Body(...),
    prompt: str = Body(...)
):
    """Master Protocol v18.0 AI Gateway"""
    logger.info(f"AI Generation Request: {provider}/{model} - Length: {len(prompt)}")
    import time
    time.sleep(0.5)
    return {
        "text": f"**[AI Generated Content]**\nBased on your request for '{prompt[:30]}...', here is a simulated response from {model}. In production, this would connect to Vertex AI.",
        "usage": {"prompt_tokens": 50, "candidate_tokens": 100, "total_tokens": 150},
        "citationMetadata": {"citations": []}
    }

# ── Health Check (root level) ──
@app.api_route("/health", methods=["GET", "HEAD"])
def read_health():
    return {"status": "System Operational", "region": "Malta", "config": "Secure"}



# ==================== STARTUP/SHUTDOWN EVENTS ====================
@app.on_event("startup")
async def startup_event():
    """Initialize services on startup"""
    try:
        # Debug: Print all registered routes
        logger.info("🗺️ REGISTERED ROUTES:")
        for route in app.routes:
            if hasattr(route, "path"):
                methods = ", ".join(route.methods) if hasattr(route, "methods") else "ALL"
                logger.info(f"   [{methods}] {route.path}")

        # Register built-in reports
        await register_builtin_reports(db, venue_id="GLOBAL")
        logger.info("✓ Built-in reports registered")
        
        # Initialize all microservices
        if hasattr(db, 'initialize'):
             logger.info("Initializing MongoDB...")
             await db.initialize()
        
        await order_service.initialize()
        await inventory_service.initialize()
        await analytics_service.initialize()
        await email_service.initialize()
        await notification_service.initialize()
        await payment_service.initialize()
        await payroll_service.initialize()
        logger.info("✓ Event-driven services initialized (7 microservices)")
        
        # Start event bus processor
        event_bus.start()
        import asyncio
        asyncio.create_task(event_bus.process_pending_events())
        logger.info("✓ Event bus started")
        
        # Start outbox consumer
        from workers.outbox_consumer import run_outbox_consumer
        asyncio.create_task(run_outbox_consumer())
        logger.info("✓ Outbox consumer started")
        
        # Start scheduled tasks
        from services.scheduled_tasks import get_scheduled_tasks
        tasks_service = get_scheduled_tasks(db)
        tasks_service.start()
        logger.info("✓ Scheduled tasks started (backup, cleanup)")
        
    except Exception as e:
        logger.error(f"Startup error: {e}")

# Force reload hook - User Sync Added (Unique PINs)

@app.on_event("shutdown")
async def shutdown_event():
    # Stop scheduled tasks
    from services.scheduled_tasks import get_scheduled_tasks
    tasks_service = get_scheduled_tasks(db)
    tasks_service.stop()
    logger.info("✓ Scheduled tasks stopped")
    
    event_bus.stop()
    logger.info("✓ Event bus stopped")
    client.close()
    logger.info("✓ Database connection closed")

# ==================== FRONTEND SPA SERVING ====================
def frontend_available() -> bool:
    return INDEX_FILE.exists()

if frontend_available():
    # Serve static assets
    app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")
    
    @app.get("/favicon.ico", include_in_schema=False)
    async def favicon():
        favicon_path = Path(FRONTEND_BUILD_DIR) / "favicon.ico"
        if favicon_path.exists():
            return FileResponse(favicon_path)
        return FileResponse(INDEX_FILE)
    
    @app.get("/manifest.json", include_in_schema=False)
    async def manifest():
        manifest_path = Path(FRONTEND_BUILD_DIR) / "manifest.json"
        if manifest_path.exists():
            return FileResponse(manifest_path)
        return FileResponse(INDEX_FILE)
    
    # Root health redirect
    @app.get("/health", include_in_schema=False)
    async def root_health():
        return RedirectResponse(url="/api/health")
    
    # SPA fallback
    @app.get("/{full_path:path}", include_in_schema=False)
    async def spa_fallback(full_path: str):
        if full_path.startswith("api") or full_path == "api":
            from fastapi import HTTPException
            raise HTTPException(status_code=404, detail="Not Found")
        
        return FileResponse(INDEX_FILE)
else:
    logger.warning("Frontend build not found - SPA serving disabled")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)

# Trigger reload - Real Migration API Active
