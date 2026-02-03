"""
Scheduled Tasks Service - Background Jobs

Tasks:
1. Idempotency key cleanup (daily)
2. Backup snapshots (daily)
3. Cache cleanup (hourly)
4. Analytics aggregation (hourly)
5. Audit log rotation (weekly)
"""

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from apscheduler.triggers.interval import IntervalTrigger
from apscheduler.triggers.cron import CronTrigger
from datetime import datetime, timezone
import logging
from services.updates_service import UpdatesService

logger = logging.getLogger(__name__)

class ScheduledTasksService:
    def __init__(self, db):
        self.db = db
        self.scheduler = AsyncIOScheduler()
        
    def start(self):
        """Start all scheduled tasks"""
        logger.info('🕐 Starting scheduled tasks...')
        
        # Daily idempotency cleanup (2 AM)
        self.scheduler.add_job(
            self.cleanup_idempotency_keys,
            CronTrigger(hour=2, minute=0),
            id='cleanup_idempotency',
            name='Cleanup expired idempotency keys',
            replace_existing=True
        )
        
        # Daily backup snapshot (3 AM)
        self.scheduler.add_job(
            self.create_daily_backup,
            CronTrigger(hour=3, minute=0),
            id='daily_backup',
            name='Create daily backup snapshot',
            replace_existing=True
        )
        
        # Hourly cache cleanup
        self.scheduler.add_job(
            self.cleanup_expired_cache,
            IntervalTrigger(hours=1),
            id='cleanup_cache',
            name='Cleanup expired cache entries',
            replace_existing=True
        )
        
        # Backup cleanup - weekly (Sunday 4 AM)
        self.scheduler.add_job(
            self.cleanup_old_backups,
            CronTrigger(day_of_week='sun', hour=4, minute=0),
            id='cleanup_backups',
            name='Cleanup old backups',
            replace_existing=True
        )

        # Publish scheduled public content (every 5 minutes)
        self.scheduler.add_job(
            self.publish_scheduled_public_content,
            IntervalTrigger(minutes=5),
            id='publish_public_content',
            name='Publish scheduled public content',
            replace_existing=True
        )

        # Publish daily release notes (11:55 PM)
        self.scheduler.add_job(
            self.publish_daily_updates,
            CronTrigger(hour=23, minute=55),
            id='publish_daily_updates',
            name='Publish daily release notes',
            replace_existing=True
        )
        
        self.scheduler.start()
        logger.info('✅ Scheduled tasks started')
        
    def stop(self):
        """Stop scheduler"""
        if self.scheduler.running:
            self.scheduler.shutdown()
            logger.info('⏹️ Scheduled tasks stopped')
    
    # ============= CLEANUP JOBS =============
    
    async def cleanup_idempotency_keys(self):
        """Remove expired idempotency keys"""
        try:
            from core.idempotency_middleware import cleanup_expired_idempotency_keys
            deleted = await cleanup_expired_idempotency_keys()
            logger.info(f'🧹 Cleaned {deleted} expired idempotency keys')
            return deleted
        except Exception as e:
            logger.error(f'❌ Idempotency cleanup failed: {e}')
            return 0
    
    async def cleanup_expired_cache(self):
        """Remove expired cache entries"""
        try:
            now = datetime.now(timezone.utc).isoformat()
            result = await self.db.cache.delete_many({
                "expires_at": {"$lt": now}
            })
            if result.deleted_count > 0:
                logger.info(f'🧹 Cleaned {result.deleted_count} expired cache entries')
            return result.deleted_count
        except Exception as e:
            logger.error(f'❌ Cache cleanup failed: {e}')
            return 0
    
    async def cleanup_old_backups(self):
        """Remove backups older than retention period"""
        try:
            from services.backup_service import BackupService
            backup_service = BackupService(self.db)
            deleted = await backup_service.cleanup_old_backups()
            logger.info(f'🧹 Cleaned {deleted} old backups')
            return deleted
        except Exception as e:
            logger.error(f'❌ Backup cleanup failed: {e}')
            return 0

    async def publish_scheduled_public_content(self):
        """Auto-approve scheduled public content versions"""
        try:
            from services.public_content_service import PublicContentService
            now = datetime.now(timezone.utc).isoformat()
            due_versions = await self.db.public_content_versions.find(
                {
                    "status": "DRAFT",
                    "scheduled_publish_at": {"$lte": now}
                },
                {"_id": 0}
            ).limit(25).to_list(25)

            if not due_versions:
                return 0

            service = PublicContentService(self.db)
            published = 0
            for version in due_versions:
                updated = await service.approve_version(version["id"], "system_scheduler", "system")
                if updated:
                    published += 1
            if published:
                logger.info(f'🗓️ Published {published} scheduled public content versions')
            return published
        except Exception as e:
            logger.error(f'❌ Scheduled content publish failed: {e}')
            return 0

    async def publish_daily_updates(self):
        """Auto-publish daily update releases"""
        try:
            service = UpdatesService()
            await service.publish_release(actor_id="system", actor_role="system", auto_published=True)
        except Exception as e:
            logger.error(f'❌ Daily updates publish failed: {e}')
    
    # ============= BACKUP JOBS =============
    
    async def create_daily_backup(self):
        """Create daily full snapshot backup"""
        try:
            from services.backup_service import BackupService
            backup_service = BackupService(self.db)
            result = await backup_service.create_snapshot()
            logger.info(f'💾 Daily backup created: {result["snapshot_id"]}')
            return result
        except Exception as e:
            logger.error(f'❌ Daily backup failed: {e}')
            return None

# Singleton instance
scheduled_tasks = None

def get_scheduled_tasks(db):
    global scheduled_tasks
    if scheduled_tasks is None:
        scheduled_tasks = ScheduledTasksService(db)
    return scheduled_tasks
