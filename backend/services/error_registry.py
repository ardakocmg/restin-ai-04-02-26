"""
Error Code Registry - Server-authoritative error documentation
All known error codes with descriptions and remediation steps
"""

ERROR_CODE_REGISTRY = {
    # AUTH ERRORS
    "TOKEN_EXPIRED": {
        "title": "Token Expired",
        "description": "JWT token has expired and needs refresh",
        "likely_causes": [
            "Session timeout after 12 hours",
            "Clock skew between client and server",
            "Token refresh failed"
        ],
        "operator_action": [
            "User should re-authenticate via PIN",
            "Check if auth modal appeared"
        ],
        "dev_action": [
            "Check JWT_EXPIRATION_HOURS setting",
            "Verify token refresh mechanism",
            "Review clock skew tolerance (120s)"
        ]
    },
    "TOKEN_INVALID_SIGNATURE": {
        "title": "Invalid Token Signature",
        "description": "JWT signature verification failed",
        "likely_causes": [
            "JWT_SECRET changed during deployment",
            "Token from different environment",
            "Tampered token"
        ],
        "operator_action": [
            "Clear browser cache and re-login",
            "Check if deployment just occurred"
        ],
        "dev_action": [
            "Verify JWT_SECRET matches across instances",
            "Check deployment guard logic",
            "Review build_id tracking"
        ]
    },
    "TOKEN_MALFORMED": {
        "title": "Malformed Token",
        "description": "Token format is invalid",
        "likely_causes": [
            "Corrupted localStorage",
            "Invalid token format from client"
        ],
        "operator_action": ["Clear browser storage and re-login"],
        "dev_action": ["Check token creation logic", "Verify JWT library version"]
    },
    "TOKEN_MISSING": {
        "title": "Token Missing",
        "description": "No authentication token provided",
        "likely_causes": ["User not logged in", "Token cleared from storage"],
        "operator_action": ["Login required"],
        "dev_action": ["Check auth interceptor", "Verify token storage logic"]
    },
    "TOKEN_REFRESH_FAILED": {
        "title": "Token Refresh Failed",
        "description": "Unable to refresh expired token",
        "likely_causes": ["Refresh token expired", "Server unavailable"],
        "operator_action": ["Re-login required"],
        "dev_action": ["Check refresh token endpoint", "Review request queue logic"]
    },
    
    # ORDER/POS/KDS ERRORS
    "ORDER_NOT_FOUND": {
        "title": "Order Not Found",
        "description": "Requested order does not exist",
        "likely_causes": ["Invalid order ID", "Order already deleted", "Database sync issue"],
        "operator_action": ["Verify order ID", "Check if order was closed/deleted"],
        "dev_action": ["Check order creation logic", "Verify database queries"]
    },
    "ORDER_EMPTY": {
        "title": "Order Empty",
        "description": "Cannot send order with no items",
        "likely_causes": ["Order has no items", "All items removed"],
        "operator_action": ["Add items before sending"],
        "dev_action": ["Check item validation logic"]
    },
    "TABLE_ID_REQUIRED": {
        "title": "Table ID Required",
        "description": "Order must be assigned to a table",
        "likely_causes": ["Table not selected", "Table ID lost during creation"],
        "operator_action": ["Select a table before sending order"],
        "dev_action": ["Check table selection flow", "Verify order creation includes table_id"]
    },
    "ROUTING_FAILED": {
        "title": "Routing Failed",
        "description": "Unable to route items to prep stations",
        "likely_causes": ["Menu items missing prep_area", "Invalid station configuration"],
        "operator_action": ["Contact support"],
        "dev_action": ["Check menu item prep_area values", "Verify routing logic"]
    },
    "KDS_CREATE_FAILED": {
        "title": "KDS Ticket Creation Failed",
        "description": "Failed to create kitchen ticket",
        "likely_causes": ["Database error", "Invalid ticket data", "Missing required fields"],
        "operator_action": ["Retry order send", "Contact support if persists"],
        "dev_action": ["Check KDS ticket model validation", "Review database logs", "Verify ensure_ids service"]
    },
    "SEND_ORDER_FAILED": {
        "title": "Send Order Failed",
        "description": "Order send pipeline failed unexpectedly",
        "likely_causes": ["Database error", "Network issue", "Validation failure"],
        "operator_action": ["Retry send", "Check network connection"],
        "dev_action": ["Review send_order logs", "Check pipeline stages", "Verify error handling"]
    },
    "PRINT_FAILED_NONBLOCKING": {
        "title": "Print Job Failed (Non-blocking)",
        "description": "Print job creation failed but order still sent",
        "likely_causes": ["Printer offline", "Database error"],
        "operator_action": ["Manual print if needed"],
        "dev_action": ["Check print_jobs collection", "Verify printer configuration"]
    },
    "STOCK_FAILED_NONBLOCKING": {
        "title": "Stock Deduction Failed (Non-blocking)",
        "description": "Stock deduction failed but order still sent",
        "likely_causes": ["Insufficient stock", "Recipe missing", "Database error"],
        "operator_action": ["Manual stock adjustment may be needed"],
        "dev_action": ["Check inventory_items", "Verify recipe configuration"]
    },
    
    # SYSTEM ERRORS
    "INTERNAL_ERROR": {
        "title": "Internal Server Error",
        "description": "Unexpected error occurred",
        "likely_causes": ["Unhandled exception", "Database connectivity", "Resource exhaustion"],
        "operator_action": ["Retry operation", "Contact support if persists"],
        "dev_action": ["Check error logs", "Review stack trace", "Verify database connection"]
    },
    "NOT_FOUND": {
        "title": "Resource Not Found",
        "description": "Requested resource does not exist",
        "likely_causes": ["Invalid ID", "Resource deleted", "Incorrect endpoint"],
        "operator_action": ["Verify resource exists"],
        "dev_action": ["Check database queries", "Verify ID format"]
    },
    "VALIDATION_ERROR": {
        "title": "Validation Error",
        "description": "Request data failed validation",
        "likely_causes": ["Missing required fields", "Invalid data format", "Type mismatch"],
        "operator_action": ["Check input data"],
        "dev_action": ["Review Pydantic models", "Check request payload"]
    },
    "RATE_LIMITED": {
        "title": "Rate Limited",
        "description": "Too many requests from this client",
        "likely_causes": ["Exceeded rate limit", "Multiple failed login attempts"],
        "operator_action": ["Wait 5 minutes before retrying"],
        "dev_action": ["Review rate limit configuration", "Check login attempt tracking"]
    },
    "FORBIDDEN": {
        "title": "Forbidden",
        "description": "User lacks permission for this operation",
        "likely_causes": ["Insufficient permissions", "Role restriction"],
        "operator_action": ["Request access from administrator"],
        "dev_action": ["Check permission system", "Verify role assignments"]
    },
    
    # HR ERRORS
    "EMPLOYEE_NOT_FOUND": {
        "title": "Employee Not Found",
        "description": "Requested employee does not exist",
        "likely_causes": ["Invalid employee ID", "Employee deleted"],
        "operator_action": ["Verify employee ID"],
        "dev_action": ["Check employees collection"]
    },
    "LEAVE_APPROVAL_REQUIRED": {
        "title": "Leave Approval Required",
        "description": "Leave request requires manager approval",
        "likely_causes": ["Manager approval pending"],
        "operator_action": ["Wait for manager approval"],
        "dev_action": ["Check approval workflow"]
    },
    
    # REPORTING ERRORS
    "REPORT_NOT_FOUND": {
        "title": "Report Not Found",
        "description": "Requested report definition does not exist",
        "likely_causes": ["Invalid report key", "Report not registered"],
        "operator_action": ["Check available reports"],
        "dev_action": ["Verify report registration", "Check report_defs collection"]
    },
    "REPORT_EXECUTION_FAILED": {
        "title": "Report Execution Failed",
        "description": "Report query failed during execution",
        "likely_causes": ["Invalid parameters", "Database error", "Missing data"],
        "operator_action": ["Check report parameters"],
        "dev_action": ["Review report query logic", "Check database indexes"]
    },
    "REPORT_PARAMS_INVALID": {
        "title": "Invalid Report Parameters",
        "description": "Report parameters failed validation",
        "likely_causes": ["Missing required parameter", "Invalid parameter format"],
        "operator_action": ["Check parameter values"],
        "dev_action": ["Review parameter validation"]
    },
    
    # DOCUMENT ERRORS
    "UNSUPPORTED_FILE_TYPE": {
        "title": "Unsupported File Type",
        "description": "File type not allowed for upload",
        "likely_causes": ["Invalid MIME type", "Unsupported format"],
        "operator_action": ["Upload PDF, Image, or Office document"],
        "dev_action": ["Check ALLOWED_MIME list"]
    },
    "DOCUMENT_UPLOAD_FAILED": {
        "title": "Document Upload Failed",
        "description": "Failed to save document",
        "likely_causes": ["Disk space", "Permission error", "Database error"],
        "operator_action": ["Retry upload"],
        "dev_action": ["Check /data/uploads permissions", "Verify disk space"]
    },
    "DOCUMENT_NOT_FOUND": {
        "title": "Document Not Found",
        "description": "Requested document does not exist",
        "likely_causes": ["Invalid document ID", "Document deleted"],
        "operator_action": ["Verify document ID"],
        "dev_action": ["Check documents collection"]
    }
}

def get_error_info(code: str) -> dict:
    """Get error code information from registry"""
    return ERROR_CODE_REGISTRY.get(code, {
        "title": code,
        "description": "Unknown error code",
        "likely_causes": [],
        "operator_action": ["Contact support"],
        "dev_action": ["Add to error registry"]
    })

def list_all_error_codes() -> list:
    """Get all registered error codes"""
    return [
        {"code": code, **info}
        for code, info in ERROR_CODE_REGISTRY.items()
    ]
