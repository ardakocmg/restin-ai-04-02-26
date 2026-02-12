# Permission System for restin.ai

# Permission keys (server-authoritative)
PERMISSION_KEYS = [
    "FINANCE_VIEW",
    "FINANCE_EXPORT",
    "FINANCE_VIEW_MONEY",
    "ORDERS_VIEW_OPEN",
    "ORDERS_VIEW_CLOSED",
    "CHECKS_VIEW",
    "CHECKS_EXPORT",
    "INVENTORY_VIEW_COST",
    "MENU_VIEW_COST",
    "PEOPLE_VIEW_PII",
    "LOGS_VIEW",
    "LOGS_VIEW_SYSTEM",
    "SETTINGS_EDIT",
    "ID_EDIT",
    "ACCOUNTING_VIEW",
    "ACCOUNTING_EDIT",
    # HR PHASE 1 Permissions
    "HR_VIEW",
    "HR_EDIT",
    "HR_VIEW_PAY",
    "HR_EDIT_PAY",
    "EMPLOYEES_VIEW_ALL",
    "EMPLOYEES_VIEW_SELF",
    "SHIFTS_VIEW_ALL",
    "SHIFTS_VIEW_SELF",
    "SHIFTS_EDIT",
    "LEAVE_VIEW_ALL",
    "LEAVE_APPROVE",
    "DOCUMENTS_VIEW_ALL",
    "DOCUMENTS_UPLOAD",
    "ATTENDANCE_VIEW",
    "SKILLS_VIEW",
    "SKILLS_VERIFY",
    "PAYROLL_VIEW",
    "PAYROLL_EDIT",
    "PAYROLL_APPROVE",
    # Reporting & CRM Permissions
    "REPORTS_VIEW",
    "REPORTS_RUN",
    "REPORTS_EXPORT",
    "REPORTS_ADMIN",
    "CRM_VIEW",
    "CRM_EXPORT",
    "CRM_PII_VIEW",
    "OBS_ERROR_INBOX_VIEW",
    "OBS_ERROR_INBOX_ACTIONS",
    "OBS_TESTPANEL_RUN",
    # Template Wizard Permissions
    "TEMPLATE_VIEW",
    "TEMPLATE_EDIT",
    "TEMPLATE_PUBLISH",
    "TEMPLATE_DELETE",
    "TEMPLATE_RENDER_DEBUG",
    "TEMPLATE_ASSETS"
]

# Role → Default Permissions Mapping
ROLE_DEFAULT_PERMISSIONS = {
    "product_owner": set(PERMISSION_KEYS),  # All permissions
    "owner": set(PERMISSION_KEYS),  # All permissions
    "hr_admin": {
        "HR_VIEW", "HR_EDIT", "HR_VIEW_PAY", "HR_EDIT_PAY", "EMPLOYEES_VIEW_ALL",
        "SHIFTS_VIEW_ALL", "SHIFTS_EDIT", "LEAVE_VIEW_ALL", "LEAVE_APPROVE",
        "DOCUMENTS_VIEW_ALL", "DOCUMENTS_UPLOAD", "ATTENDANCE_VIEW", "SKILLS_VIEW", "SKILLS_VERIFY",
        "PEOPLE_VIEW_PII", "LOGS_VIEW"
    },
    # Template Wizard: GM can view/edit/publish/assets, Manager can view/edit/assets only
    "general_manager": {
        "FINANCE_VIEW", "FINANCE_VIEW_MONEY", "ORDERS_VIEW_OPEN", "ORDERS_VIEW_CLOSED",
        "CHECKS_VIEW", "INVENTORY_VIEW_COST", "MENU_VIEW_COST", "PEOPLE_VIEW_PII",
        "LOGS_VIEW", "SETTINGS_EDIT", "ACCOUNTING_VIEW",
        "HR_VIEW", "EMPLOYEES_VIEW_ALL", "SHIFTS_VIEW_ALL", "SHIFTS_EDIT", 
        "LEAVE_VIEW_ALL", "LEAVE_APPROVE", "ATTENDANCE_VIEW",
        "REPORTS_VIEW", "REPORTS_RUN", "REPORTS_EXPORT", "CRM_VIEW", "CRM_PII_VIEW",
        "OBS_ERROR_INBOX_VIEW", "OBS_ERROR_INBOX_ACTIONS", "OBS_TESTPANEL_RUN",
        "TEMPLATE_VIEW", "TEMPLATE_EDIT", "TEMPLATE_PUBLISH", "TEMPLATE_ASSETS"
    },
    "manager": {
        "FINANCE_VIEW", "FINANCE_VIEW_MONEY", "ORDERS_VIEW_OPEN", "ORDERS_VIEW_CLOSED",
        "CHECKS_VIEW", "INVENTORY_VIEW_COST", "MENU_VIEW_COST", "LOGS_VIEW", "ACCOUNTING_VIEW",
        "HR_VIEW", "EMPLOYEES_VIEW_ALL", "SHIFTS_VIEW_ALL", "SHIFTS_EDIT",
        "LEAVE_VIEW_ALL", "LEAVE_APPROVE", "ATTENDANCE_VIEW",
        "REPORTS_VIEW", "REPORTS_RUN", "CRM_VIEW",
        "OBS_ERROR_INBOX_VIEW", "OBS_TESTPANEL_RUN",
        "TEMPLATE_VIEW", "TEMPLATE_EDIT", "TEMPLATE_ASSETS"
    },
    "finance": {
        "FINANCE_VIEW", "FINANCE_VIEW_MONEY", "FINANCE_EXPORT", "ORDERS_VIEW_CLOSED",
        "CHECKS_VIEW", "CHECKS_EXPORT", "ACCOUNTING_VIEW", "ACCOUNTING_EDIT",
        "HR_VIEW_PAY", "PAYROLL_VIEW", "PAYROLL_EDIT", "PAYROLL_APPROVE"
    },
    "supervisor": {"ORDERS_VIEW_OPEN", "CHECKS_VIEW", "SHIFTS_VIEW_ALL", "ATTENDANCE_VIEW", "TEMPLATE_VIEW"},
    "it_admin": {"LOGS_VIEW", "LOGS_VIEW_SYSTEM", "SETTINGS_EDIT", "OBS_ERROR_INBOX_VIEW", "OBS_ERROR_INBOX_ACTIONS", "OBS_TESTPANEL_RUN", "TEMPLATE_VIEW", "TEMPLATE_RENDER_DEBUG"},
    "waiter": {"EMPLOYEES_VIEW_SELF", "SHIFTS_VIEW_SELF"},
    "runner": {"EMPLOYEES_VIEW_SELF", "SHIFTS_VIEW_SELF"},
    "bartender": {"EMPLOYEES_VIEW_SELF", "SHIFTS_VIEW_SELF"},
    "kitchen": {"EMPLOYEES_VIEW_SELF", "SHIFTS_VIEW_SELF"},
    "staff": {"EMPLOYEES_VIEW_SELF", "SHIFTS_VIEW_SELF"},
    "host": {"EMPLOYEES_VIEW_SELF", "SHIFTS_VIEW_SELF"}
}

def effective_permissions(user_role: str, venue_settings: dict = None) -> set:
    """
    Calculate effective permissions for a user role
    1. Start with role defaults
    2. Apply venue-specific overrides (deny first, then grant)
    """
    # Get base permissions for role
    base_perms = ROLE_DEFAULT_PERMISSIONS.get(user_role.lower(), set()).copy()
    
    # Apply venue overrides if present
    if venue_settings:
        overrides = venue_settings.get("policy", {}).get("permissions_overrides", {}).get(user_role, {})
        deny = set(overrides.get("deny", []))
        grant = set(overrides.get("grant", []))
        
        # Apply deny first
        base_perms -= deny
        # Then apply grant
        base_perms |= grant
    
    return base_perms

# ==================== TABLE SCHEMAS (Permission-gated columns) ====================
TABLE_SCHEMAS = {
    "orders_open": {
        "required_permission": "ORDERS_VIEW_OPEN",
        "columns": [
            {"key": "order_display_id", "label": "Order", "type": "text", "permission": None},
            {"key": "table_display_id", "label": "Table", "type": "text", "permission": None},
            {"key": "server_display_id", "label": "Staff", "type": "text", "permission": "PEOPLE_VIEW_PII"},
            {"key": "server_name", "label": "Server", "type": "text", "permission": None},
            {"key": "created_at", "label": "Opened", "type": "datetime", "permission": None},
            {"key": "status", "label": "Status", "type": "badge", "permission": None},
            {"key": "items_count", "label": "Items", "type": "number", "permission": None},
            {"key": "subtotal", "label": "Subtotal", "type": "money", "permission": "FINANCE_VIEW_MONEY"},
            {"key": "tax", "label": "Tax", "type": "money", "permission": "FINANCE_VIEW_MONEY"},
            {"key": "total", "label": "Total", "type": "money", "permission": "FINANCE_VIEW_MONEY"}
        ]
    },
    "checks_closed": {
        "required_permission": "CHECKS_VIEW",
        "columns": [
            {"key": "order_display_id", "label": "Check", "type": "text", "permission": None},
            {"key": "table_display_id", "label": "Table", "type": "text", "permission": None},
            {"key": "server_display_id", "label": "Staff", "type": "text", "permission": "PEOPLE_VIEW_PII"},
            {"key": "server_name", "label": "Server", "type": "text", "permission": None},
            {"key": "closed_at", "label": "Closed", "type": "datetime", "permission": None},
            {"key": "payment_method", "label": "Payment", "type": "text", "permission": None},
            {"key": "subtotal", "label": "Subtotal", "type": "money", "permission": "FINANCE_VIEW_MONEY"},
            {"key": "tax", "label": "Tax", "type": "money", "permission": "FINANCE_VIEW_MONEY"},
            {"key": "total", "label": "Total", "type": "money", "permission": "FINANCE_VIEW_MONEY"},
            {"key": "tip", "label": "Tip", "type": "money", "permission": "FINANCE_VIEW_MONEY"}
        ]
    },
    "inventory_value": {
        "required_permission": "INVENTORY_VIEW_COST",
        "columns": [
            {"key": "item_display_id", "label": "Item", "type": "text", "permission": None},
            {"key": "name", "label": "Name", "type": "text", "permission": None},
            {"key": "current_stock", "label": "Stock", "type": "number", "permission": None},
            {"key": "unit", "label": "Unit", "type": "text", "permission": None},
            {"key": "unit_cost", "label": "Unit Cost", "type": "money", "permission": "INVENTORY_VIEW_COST"},
            {"key": "total_value", "label": "Total Value", "type": "money", "permission": "INVENTORY_VIEW_COST"}
        ]
    },
    "accounting_journal": {
        "required_permission": "ACCOUNTING_VIEW",
        "columns": [
            {"key": "entry_id", "label": "Entry", "type": "text", "permission": None},
            {"key": "date", "label": "Date", "type": "datetime", "permission": None},
            {"key": "account", "label": "Account", "type": "text", "permission": None},
            {"key": "description", "label": "Description", "type": "text", "permission": None},
            {"key": "debit", "label": "Debit", "type": "money", "permission": "ACCOUNTING_VIEW"},
            {"key": "credit", "label": "Credit", "type": "money", "permission": "ACCOUNTING_VIEW"}
        ]
    }
}

def get_allowed_schema(table_key: str, user_perms: set, currency: str = "EUR") -> dict:
    """
    Return table schema with only columns user has permission to see
    Server-authoritative: if no permission, omit column entirely
    """
    schema_def = TABLE_SCHEMAS.get(table_key)
    if not schema_def:
        return None
    
    # Check if user has permission to access this table at all
    required_perm = schema_def.get("required_permission")
    if required_perm and required_perm not in user_perms:
        return None
    
    # Filter columns based on permissions
    allowed_columns = []
    for col in schema_def["columns"]:
        col_perm = col.get("permission")
        if col_perm is None or col_perm in user_perms:
            allowed_columns.append(col)
    
    return {
        "table_key": table_key,
        "columns": allowed_columns,
        "currency": currency
    }

def filter_row_by_schema(row: dict, schema: dict) -> dict:
    """
    Filter a data row to only include columns from schema
    Server-authoritative: fields not in schema are OMITTED
    """
    if not schema or not schema.get("columns"):
        return {}
    
    allowed_keys = {col["key"] for col in schema["columns"]}
    return {k: v for k, v in row.items() if k in allowed_keys}
