# Default Venue Settings and Module Registry

DEFAULT_VENUE_SETTINGS = {
    "modules": {
        "operations": {"enabled": True},
        "people": {"enabled": True},
        "menu": {"enabled": True},
        "inventory": {"enabled": True},
        "reservations": {"enabled": True},
        "devices": {"enabled": True},
        "observability": {"enabled": True},
        "analytics": {"enabled": False},
        "payroll": {"enabled": False},
        "accounting": {"enabled": False},
        "crm": {"enabled": False},
        "loyalty": {"enabled": False},
        "automations": {"enabled": False},
        "exports": {"enabled": True},
        "api_connectors": {"enabled": False}
    },
    "ui": {
        "notice_bar": {"enabled": True},
        "app_icons": {"pos_color": "#F59E0B", "kds_color": "#EF4444"},
        "bottom_nav_enabled": True,
        "palette": {
            "NEW": "#3B82F6",
            "PREPARING": "#F59E0B",
            "READY": "#22C55E",
            "DONE": "#6B7280",
            "HELD": "#EF4444",
            "PASS": "#A855F7"
        }
    },
    "pos": {
        "send_default_print_only": True,
        "send_checkbox_kds": True,
        "send_checkbox_stock": True,
        "send_checkbox_print": True,
        "bill_require_done": True,
        "bill_require_done_message": "Some items are not completed yet. Please wait for DONE items before printing the bill."
    },
    "kds": {
        "item_mode": True,
        "show_seat": True,
        "show_course": True,
        "show_round_badge": True,
        "require_pass_approval": True,
        "allow_done_only_on_deliver": True
    },
    "ops": {
        "auto_complimentary_on_open": True,
        "complimentary_items": ["Bread", "Amuse Bouche"],
        "specials_enabled": True,
        "specials_list": [],
        "push_low_stock_enabled": True,
        "low_stock_threshold": 3
    },
    "logs": {
        "retention_days": 90,
        "visibility": {
            "OWNER": "all",
            "PRODUCT_OWNER": "all",
            "GENERAL_MANAGER": "venue",
            "MANAGER": "venue",
            "SUPERVISOR": "limited",
            "FINANCE": "finance_only",
            "IT_ADMIN": "system_only"
        }
    },
    "security": {
        "pin_attempts": {"max": 6, "window_sec": 300, "lock_sec": 900},
        "session": {"clock_skew_sec": 120}
    },
    "integrations": {}
}

MODULE_REGISTRY = [
    {"key": "operations", "title": "Operations", "desc": "Complimentary items, specials, low stock push", "status": "active", "enabled_by_default": True},
    {"key": "people", "title": "People", "desc": "Staff, users, roles, shifts", "status": "active", "enabled_by_default": True},
    {"key": "menu", "title": "Menu", "desc": "Menu management, modifiers, pricing", "status": "active", "enabled_by_default": True},
    {"key": "inventory", "title": "Inventory", "desc": "Stock, recipes, FIFO ledger", "status": "active", "enabled_by_default": True},
    {"key": "reservations", "title": "Reservations", "desc": "Guest bookings, floor plan", "status": "active", "enabled_by_default": True},
    {"key": "devices", "title": "Devices", "desc": "POS, KDS, printers, device hub", "status": "active", "enabled_by_default": True},
    {"key": "observability", "title": "Observability", "desc": "System health, logs, metrics", "status": "active", "enabled_by_default": True},
    {"key": "exports", "title": "Exports", "desc": "Data exports, reports", "status": "active", "enabled_by_default": True},
    {"key": "finance", "title": "Finance", "desc": "Open orders, closed checks, financial analysis", "status": "active", "enabled_by_default": True},
    {"key": "analytics", "title": "Analytics", "desc": "Sales pace, KDS timing, revenue insights", "status": "planned", "enabled_by_default": False},
    {"key": "payroll", "title": "Payroll (Malta)", "desc": "Payroll processing, tax compliance", "status": "planned", "enabled_by_default": False},
    {"key": "accounting", "title": "Accounting (Malta)", "desc": "General ledger, accounts", "status": "active", "enabled_by_default": True},
    {"key": "crm", "title": "CRM", "desc": "Guest preferences, allergies, anniversaries", "status": "planned", "enabled_by_default": False},
    {"key": "loyalty", "title": "Loyalty", "desc": "Tiers, points, rewards", "status": "planned", "enabled_by_default": False},
    {"key": "automations", "title": "Automations", "desc": "Email/WhatsApp/Telegram responders", "status": "planned", "enabled_by_default": False},
    {"key": "api_connectors", "title": "API Connectors", "desc": "Admin-configurable integrations", "status": "planned", "enabled_by_default": False}
]
