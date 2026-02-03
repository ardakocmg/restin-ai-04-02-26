from datetime import datetime, timezone
import uuid
import re

from core.database import db
from models.updates import UpdateChange, ReleaseNote


class UpdatesService:
    def __init__(self):
        self.db = db

    async def get_next_version(self):
        today = datetime.now(timezone.utc)
        base = f"v{today.year}.{today.month:02d}.{today.day:02d}"
        regex = f"^{re.escape(base)}"
        last = await self.db.release_notes.find({"version_code": {"$regex": regex}}, {"_id": 0}).sort("created_at", -1).to_list(1)
        if last:
            last_code = last[0].get("version_code", "")
            try:
                increment = int(last_code.split('.')[-1]) + 1
            except Exception:
                increment = 1
        else:
            increment = 1
        return f"{base}.{increment:02d}"

    async def create_change(self, payload: dict):
        now = datetime.now(timezone.utc).isoformat()
        change = UpdateChange(
            id=str(uuid.uuid4()),
            title=payload.get("title", "Untitled"),
            change_type=payload.get("change_type", "Changed"),
            domain=payload.get("domain"),
            user_summary=payload.get("user_summary"),
            technical_summary=payload.get("technical_summary"),
            created_at=now,
            published=False
        )
        await self.db.update_changes.insert_one(change.model_dump())
        return change.model_dump()

    async def publish_release(self, actor_id: str = None, actor_role: str = None, auto_published: bool = False):
        pending = await self.db.update_changes.find({"published": False}, {"_id": 0}).sort("created_at", 1).to_list(500)
        if not pending:
            return None

        version_code = await self.get_next_version()
        now = datetime.now(timezone.utc).isoformat()
        user_notes = {"Added": [], "Changed": [], "Fixed": [], "Removed": []}
        technical_notes = {"Added": [], "Changed": [], "Fixed": [], "Removed": []}

        for change in pending:
            change_type = change.get("change_type", "Changed").title()
            if change_type not in user_notes:
                change_type = "Changed"
            user_notes[change_type].append(change.get("user_summary") or change.get("title"))
            technical_notes[change_type].append(change.get("technical_summary") or change.get("title"))

        release = ReleaseNote(
            id=str(uuid.uuid4()),
            version_code=version_code,
            created_at=now,
            user_notes=user_notes,
            technical_notes=technical_notes,
            changes=pending,
            published_by=actor_id,
            published_role=actor_role,
            auto_published=auto_published
        )
        await self.db.release_notes.insert_one(release.model_dump())
        await self.db.update_changes.update_many({"published": False}, {"$set": {"published": True, "release_id": release.id}})
        return release.model_dump()
