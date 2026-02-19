"""
Google Sync Service — Deep integration between Restin.ai modules and Google services.

Handles:
  - Calendar ↔ HR: Shifts/Leaves auto-sync to Google Calendar
  - Drive ↔ Payroll: Auto-export payroll reports to Google Drive
  - Gmail ↔ CRM: AI email management and auto-proposals
"""

import logging
from datetime import datetime, timezone
from typing import Optional

from googleapiclient.errors import HttpError

from core.database import db

logger = logging.getLogger("google.sync")


# ═══════════════════════════════════════════════════════════════
# Credential helpers (shared with google_personal_routes)
# ═══════════════════════════════════════════════════════════════

async def _get_user_creds(user_id: str):
    """Get Google OAuth credentials for a user, with auto-refresh."""
    import os
    from google.oauth2.credentials import Credentials

    token_doc = await db.user_google_tokens.find_one({"user_id": user_id, "active": True})
    if not token_doc:
        return None

    creds = Credentials(
        token=token_doc.get("access_token"),
        refresh_token=token_doc.get("refresh_token"),
        token_uri="https://oauth2.googleapis.com/token",
        client_id=os.getenv("GOOGLE_CLIENT_ID", ""),
        client_secret=os.getenv("GOOGLE_CLIENT_SECRET", ""),
        scopes=token_doc.get("scopes", []),
    )

    if creds.expired and creds.refresh_token:
        try:
            from google.auth.transport.requests import Request as GoogleRequest
            creds.refresh(GoogleRequest())
            await db.user_google_tokens.update_one(
                {"user_id": user_id},
                {"$set": {"access_token": creds.token, "updated_at": datetime.now(timezone.utc).isoformat()}},
            )
        except Exception as e:
            logger.error("Token refresh failed for %s: %s", user_id, e)
            return None

    return creds


def _build(creds, service: str, version: str):
    from googleapiclient.discovery import build
    return build(service, version, credentials=creds, cache_discovery=False)


# ═══════════════════════════════════════════════════════════════
# CALENDAR SYNC — Shifts & Leaves
# ═══════════════════════════════════════════════════════════════

async def sync_shift_to_calendar(
    user_id: str,
    shift: dict,
    venue_name: str = "",
    action: str = "create",
) -> Optional[str]:
    """
    Sync a shift to the employee's Google Calendar.
    Returns the calendar event ID if successful.
    """
    creds = await _get_user_creds(user_id)
    if not creds:
        logger.info("No Google creds for user %s — skip calendar sync", user_id)
        return None

    try:
        service = _build(creds, "calendar", "v3")

        event_body = {
            "summary": f"🏢 Shift — {venue_name}" if venue_name else "🏢 Shift",
            "description": (
                f"Work Area: {shift.get('work_area', 'General')}\n"
                f"Position: {shift.get('position', '')}\n"
                f"Venue: {venue_name}\n"
                f"— Synced by Restin.ai"
            ),
            "start": {"dateTime": _ensure_rfc3339(shift.get("start_time", "")), "timeZone": "Europe/Malta"},
            "end": {"dateTime": _ensure_rfc3339(shift.get("end_time", "")), "timeZone": "Europe/Malta"},
            "colorId": "9",  # Blue
            "reminders": {"useDefault": False, "overrides": [{"method": "popup", "minutes": 30}]},
            "extendedProperties": {
                "private": {
                    "restin_type": "shift",
                    "restin_shift_id": shift.get("id", ""),
                    "restin_venue_id": shift.get("venue_id", ""),
                }
            },
        }

        if action == "create":
            event = service.events().insert(calendarId="primary", body=event_body).execute()
            event_id = event.get("id", "")

            # Store the calendar event ID on the shift record
            await db.shifts.update_one(
                {"id": shift.get("id")},
                {"$set": {"google_calendar_event_id": event_id}},
            )
            logger.info("Created calendar event %s for shift %s", event_id, shift.get("id"))
            return event_id

        elif action == "update":
            existing_event_id = shift.get("google_calendar_event_id")
            if existing_event_id:
                service.events().update(
                    calendarId="primary", eventId=existing_event_id, body=event_body
                ).execute()
                logger.info("Updated calendar event %s", existing_event_id)
                return existing_event_id
            else:
                # No existing event, create a new one
                return await sync_shift_to_calendar(user_id, shift, venue_name, "create")

        elif action == "delete":
            existing_event_id = shift.get("google_calendar_event_id")
            if existing_event_id:
                service.events().delete(calendarId="primary", eventId=existing_event_id).execute()
                await db.shifts.update_one(
                    {"id": shift.get("id")},
                    {"$unset": {"google_calendar_event_id": ""}},
                )
                logger.info("Deleted calendar event %s", existing_event_id)
            return None

    except HttpError as e:
        logger.error("Calendar sync failed for shift %s: %s", shift.get("id"), e)
        return None


async def sync_leave_to_calendar(
    user_id: str,
    leave: dict,
    employee_name: str = "",
    venue_name: str = "",
    action: str = "create",
) -> Optional[str]:
    """
    Sync a leave request to the employee's Google Calendar as an all-day OOO event.
    """
    creds = await _get_user_creds(user_id)
    if not creds:
        logger.info("No Google creds for user %s — skip calendar sync", user_id)
        return None

    try:
        service = _build(creds, "calendar", "v3")

        leave_type = leave.get("leave_type", "Leave")
        start_date = leave.get("start_date", "")[:10]  # YYYY-MM-DD
        end_date = leave.get("end_date", "")[:10]

        event_body = {
            "summary": f"🏖️ {leave_type.title()} — {employee_name}" if employee_name else f"🏖️ {leave_type.title()}",
            "description": (
                f"Leave Type: {leave_type}\n"
                f"Duration: {leave.get('days', 0)} days\n"
                f"Reason: {leave.get('reason', 'N/A')}\n"
                f"Venue: {venue_name}\n"
                f"— Synced by Restin.ai"
            ),
            "start": {"date": start_date},
            "end": {"date": end_date},
            "colorId": "4",  # Flamingo/pink
            "transparency": "opaque",
            "reminders": {"useDefault": False},
            "extendedProperties": {
                "private": {
                    "restin_type": "leave",
                    "restin_leave_id": leave.get("id", ""),
                    "restin_venue_id": leave.get("venue_id", ""),
                }
            },
        }

        if action == "create":
            event = service.events().insert(calendarId="primary", body=event_body).execute()
            event_id = event.get("id", "")
            await db.leave_requests.update_one(
                {"id": leave.get("id")},
                {"$set": {"google_calendar_event_id": event_id}},
            )
            logger.info("Created leave calendar event %s for leave %s", event_id, leave.get("id"))
            return event_id

        elif action == "delete":
            existing_event_id = leave.get("google_calendar_event_id")
            if existing_event_id:
                service.events().delete(calendarId="primary", eventId=existing_event_id).execute()
                await db.leave_requests.update_one(
                    {"id": leave.get("id")},
                    {"$unset": {"google_calendar_event_id": ""}},
                )
            return None

    except HttpError as e:
        logger.error("Calendar sync for leave %s failed: %s", leave.get("id"), e)
        return None


# ═══════════════════════════════════════════════════════════════
# DRIVE SYNC — Payroll & Document Export
# ═══════════════════════════════════════════════════════════════

async def ensure_drive_folder(creds, folder_name: str, parent_id: str = None) -> Optional[str]:
    """Create or find a folder in Google Drive. Returns folder ID."""
    try:
        service = _build(creds, "drive", "v3")

        q = f"name='{folder_name}' and mimeType='application/vnd.google-apps.folder' and trashed=false"
        if parent_id:
            q += f" and '{parent_id}' in parents"

        result = service.files().list(q=q, fields="files(id)", pageSize=1).execute()
        files = result.get("files", [])
        if files:
            return files[0]["id"]

        # Create the folder
        metadata = {
            "name": folder_name,
            "mimeType": "application/vnd.google-apps.folder",
        }
        if parent_id:
            metadata["parents"] = [parent_id]

        folder = service.files().create(body=metadata, fields="id").execute()
        logger.info("Created Drive folder '%s' -> %s", folder_name, folder.get("id"))
        return folder.get("id")

    except HttpError as e:
        logger.error("Drive folder creation failed: %s", e)
        return None


async def upload_to_drive(
    user_id: str,
    file_content: bytes,
    file_name: str,
    mime_type: str = "application/pdf",
    folder_path: list[str] = None,
) -> Optional[dict]:
    """
    Upload a file to Google Drive, creating nested folders as needed.
    folder_path = ["Restin.ai", "Payroll", "Don Royale", "2026-02"]
    """
    creds = await _get_user_creds(user_id)
    if not creds:
        return None

    try:
        from googleapiclient.http import MediaInMemoryUpload

        # Build folder hierarchy
        parent_id = None
        if folder_path:
            for folder_name in folder_path:
                parent_id = await ensure_drive_folder(creds, folder_name, parent_id)
                if not parent_id:
                    return None

        service = _build(creds, "drive", "v3")
        metadata = {"name": file_name}
        if parent_id:
            metadata["parents"] = [parent_id]

        media = MediaInMemoryUpload(file_content, mimetype=mime_type)
        file_result = service.files().create(
            body=metadata, media_body=media, fields="id,webViewLink"
        ).execute()

        result = {
            "id": file_result.get("id", ""),
            "web_link": file_result.get("webViewLink", ""),
            "name": file_name,
        }
        logger.info("Uploaded '%s' to Drive -> %s", file_name, result["id"])
        return result

    except HttpError as e:
        logger.error("Drive upload failed: %s", e)
        return None


async def export_payroll_to_drive(
    user_id: str,
    venue_name: str,
    month: str,
    payroll_data: list[dict],
) -> Optional[dict]:
    """
    Export payroll summary as a CSV to Google Drive.
    month format: "2026-02"
    """
    import csv
    import io

    if not payroll_data:
        return None

    # Build CSV
    output = io.StringIO()
    if payroll_data:
        fieldnames = list(payroll_data[0].keys())
        writer = csv.DictWriter(output, fieldnames=fieldnames)
        writer.writeheader()
        for row in payroll_data:
            writer.writerow(row)

    csv_bytes = output.getvalue().encode("utf-8")
    file_name = f"Payroll_{venue_name}_{month}.csv"

    return await upload_to_drive(
        user_id=user_id,
        file_content=csv_bytes,
        file_name=file_name,
        mime_type="text/csv",
        folder_path=["Restin.ai", "Payroll", venue_name, month],
    )


async def import_from_drive(
    user_id: str,
    file_id: str,
) -> Optional[dict]:
    """Download file content from Google Drive."""
    creds = await _get_user_creds(user_id)
    if not creds:
        return None

    try:
        service = _build(creds, "drive", "v3")

        # Get file metadata
        meta = service.files().get(fileId=file_id, fields="id,name,mimeType,size").execute()

        # Download content
        from googleapiclient.http import MediaIoBaseDownload
        import io

        request = service.files().get_media(fileId=file_id)
        buffer = io.BytesIO()
        downloader = MediaIoBaseDownload(buffer, request)
        done = False
        while not done:
            _, done = downloader.next_chunk()

        return {
            "id": meta.get("id", ""),
            "name": meta.get("name", ""),
            "mime_type": meta.get("mimeType", ""),
            "content": buffer.getvalue(),
        }

    except HttpError as e:
        logger.error("Drive import failed for %s: %s", file_id, e)
        return None


# ═══════════════════════════════════════════════════════════════
# GMAIL — Send & AI Analyze
# ═══════════════════════════════════════════════════════════════

async def send_email(
    user_id: str,
    to: str,
    subject: str,
    body_html: str,
    cc: str = "",
    bcc: str = "",
) -> Optional[str]:
    """Send an email via Gmail API. Returns message ID."""
    creds = await _get_user_creds(user_id)
    if not creds:
        return None

    try:
        import base64
        from email.mime.text import MIMEText

        service = _build(creds, "gmail", "v1")

        message = MIMEText(body_html, "html")
        message["to"] = to
        message["subject"] = subject
        if cc:
            message["cc"] = cc
        if bcc:
            message["bcc"] = bcc

        raw = base64.urlsafe_b64encode(message.as_bytes()).decode()
        result = service.users().messages().send(
            userId="me", body={"raw": raw}
        ).execute()

        msg_id = result.get("id", "")
        logger.info("Sent email to %s, msg_id=%s", to, msg_id)
        return msg_id

    except HttpError as e:
        logger.error("Gmail send failed: %s", e)
        return None


async def reply_to_email(
    user_id: str,
    thread_id: str,
    message_id: str,
    to: str,
    subject: str,
    body_html: str,
) -> Optional[str]:
    """Reply to an existing email thread."""
    creds = await _get_user_creds(user_id)
    if not creds:
        return None

    try:
        import base64
        from email.mime.text import MIMEText

        service = _build(creds, "gmail", "v1")

        message = MIMEText(body_html, "html")
        message["to"] = to
        message["subject"] = subject
        message["In-Reply-To"] = message_id
        message["References"] = message_id

        raw = base64.urlsafe_b64encode(message.as_bytes()).decode()
        result = service.users().messages().send(
            userId="me",
            body={"raw": raw, "threadId": thread_id}
        ).execute()

        return result.get("id", "")

    except HttpError as e:
        logger.error("Gmail reply failed: %s", e)
        return None


async def modify_email(
    user_id: str,
    message_id: str,
    add_labels: list[str] = None,
    remove_labels: list[str] = None,
) -> bool:
    """Add/remove labels from a Gmail message (star, archive, mark read, etc)."""
    creds = await _get_user_creds(user_id)
    if not creds:
        return False

    try:
        service = _build(creds, "gmail", "v1")
        body = {}
        if add_labels:
            body["addLabelIds"] = add_labels
        if remove_labels:
            body["removeLabelIds"] = remove_labels

        service.users().messages().modify(
            userId="me", id=message_id, body=body
        ).execute()
        return True

    except HttpError as e:
        logger.error("Gmail modify failed: %s", e)
        return False


async def trash_email(user_id: str, message_id: str) -> bool:
    """Move an email to trash."""
    creds = await _get_user_creds(user_id)
    if not creds:
        return False

    try:
        service = _build(creds, "gmail", "v1")
        service.users().messages().trash(userId="me", id=message_id).execute()
        return True
    except HttpError as e:
        logger.error("Gmail trash failed: %s", e)
        return False


# ═══════════════════════════════════════════════════════════════
# SHEETS — Export / Import
# ═══════════════════════════════════════════════════════════════

async def export_to_sheet(
    user_id: str,
    title: str,
    headers: list[str],
    rows: list[list],
) -> Optional[dict]:
    """Create a new Google Sheet with data. Returns sheet metadata."""
    creds = await _get_user_creds(user_id)
    if not creds:
        return None

    try:
        service = _build(creds, "sheets", "v4")

        spreadsheet = service.spreadsheets().create(
            body={"properties": {"title": title}},
            fields="spreadsheetId,spreadsheetUrl",
        ).execute()

        sheet_id = spreadsheet.get("spreadsheetId", "")
        sheet_url = spreadsheet.get("spreadsheetUrl", "")

        # Write data
        values = [headers] + rows
        service.spreadsheets().values().update(
            spreadsheetId=sheet_id,
            range="Sheet1!A1",
            valueInputOption="USER_ENTERED",
            body={"values": values},
        ).execute()

        logger.info("Created sheet '%s' -> %s", title, sheet_id)
        return {"id": sheet_id, "url": sheet_url, "title": title}

    except HttpError as e:
        logger.error("Sheets export failed: %s", e)
        return None


async def import_from_sheet(
    user_id: str,
    spreadsheet_id: str,
    sheet_range: str = "Sheet1",
) -> Optional[list[dict]]:
    """Import data from a Google Sheet. Returns list of row dicts."""
    creds = await _get_user_creds(user_id)
    if not creds:
        return None

    try:
        service = _build(creds, "sheets", "v4")

        result = service.spreadsheets().values().get(
            spreadsheetId=spreadsheet_id,
            range=sheet_range,
        ).execute()

        values = result.get("values", [])
        if len(values) < 2:
            return []

        headers = values[0]
        rows = []
        for row in values[1:]:
            row_dict = {}
            for i, header in enumerate(headers):
                row_dict[header] = row[i] if i < len(row) else ""
            rows.append(row_dict)

        return rows

    except HttpError as e:
        logger.error("Sheets import failed: %s", e)
        return None


# ═══════════════════════════════════════════════════════════════
# SYNC CONFIG — Per-user/venue sync preferences
# ═══════════════════════════════════════════════════════════════

async def get_sync_config(user_id: str) -> dict:
    """Get the user's Google sync configuration."""
    doc = await db.google_sync_config.find_one({"user_id": user_id}, {"_id": 0})
    if not doc:
        return {
            "user_id": user_id,
            "calendar_shift_sync": False,
            "calendar_leave_sync": False,
            "drive_payroll_auto_export": False,
            "drive_folder_structure": "Restin.ai/{type}/{venue}/{period}",
            "gmail_ai_enabled": False,
            "sheets_auto_export": False,
        }
    return doc


async def update_sync_config(user_id: str, updates: dict) -> dict:
    """Update the user's Google sync configuration."""
    now = datetime.now(timezone.utc).isoformat()
    updates["updated_at"] = now

    await db.google_sync_config.update_one(
        {"user_id": user_id},
        {"$set": updates, "$setOnInsert": {"user_id": user_id, "created_at": now}},
        upsert=True,
    )

    return await get_sync_config(user_id)


# ═══════════════════════════════════════════════════════════════
# HELPERS
# ═══════════════════════════════════════════════════════════════

def _ensure_rfc3339(dt_str: str) -> str:
    """Ensure a datetime string is RFC 3339 compliant for Google Calendar."""
    if not dt_str:
        return datetime.now(timezone.utc).isoformat()
    # If already has timezone, return as-is
    if "+" in dt_str or "Z" in dt_str:
        return dt_str
    # Assume UTC
    return dt_str + "+01:00"  # Europe/Malta
