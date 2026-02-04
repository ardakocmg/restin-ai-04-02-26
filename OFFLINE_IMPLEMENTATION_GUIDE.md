# OFFLINE-FIRST IMPLEMENTATION GUIDE

## 🎯 What We Built

**Phase 1: Offline Foundation (COMPLETED)**
- ✅ IndexedDB service layer
- ✅ Sync engine with idempotent replay
- ✅ Service Worker (PWA offline assets)
- ✅ Online/Offline indicator component
- ✅ Offline-aware API wrapper
- ✅ Backend idempotency middleware

**Phase 2-3: Advanced (ARCHITECTURE READY)**
- 📐 Edge Gateway design
- 📐 Device Mesh design
- 📐 3-2-1 Backup strategy

---

## 📦 Components Created

### Frontend
1. **`/app/frontend/src/services/OfflineDB.js`** - IndexedDB wrapper
   - Stores: offline_commands, cached_data, auth_cache, sync_log
   - CRUD operations
   - Expiry management

2. **`/app/frontend/src/services/SyncService.js`** - Sync engine
   - Network status monitoring
   - Queue replay with retry logic
   - Idempotent command execution
   - Conflict resolution hooks

3. **`/app/frontend/src/services/OfflineAPI.js`** - API wrapper
   - Auto-queue when offline
   - Optimistic responses
   - Seamless online/offline switching

4. **`/app/frontend/src/components/OnlineStatusIndicator.jsx`** - UI indicator
   - Shows: Online / Offline / Syncing
   - Pending command count
   - Manual sync trigger
   - Detailed status dropdown

5. **`/app/frontend/public/service-worker.js`** - Service Worker
   - Cache-first for static assets
   - Network-first for API calls
   - Background sync support

6. **`/app/frontend/src/serviceWorkerRegistration.js`** - SW registration helper

7. **`/app/frontend/public/manifest.json`** - PWA manifest
   - iOS/Android support
   - Offline-enabled
   - App shortcuts

### Backend
8. **`/app/backend/core/idempotency_middleware.py`** - Idempotency handler
   - X-Idempotency-Key header support
   - Cached response replay
   - 24h TTL
   - Duplicate prevention

9. **`/app/backend/services/backup_service.py`** - Backup service
   - 3-2-1 strategy
   - MongoDB snapshot backups
   - Append-only audit log
   - Checksum verification
   - NAS support (optional)

### Architecture Docs
10. **`/app/EDGE_GATEWAY_ARCHITECTURE.md`** - Edge server design
11. **`/app/DEVICE_MESH_ARCHITECTURE.md`** - Device mesh design

---

## 🚀 How It Works

### Normal Online Operation
```
User Action → API Call → Cloud Response → UI Update
```

### Offline Operation
```
User Action → OfflineAPI → IndexedDB Queue → Optimistic UI Update
                ↓
        (When online) SyncService → Replay to Cloud → Update UI
```

### Idempotent Replay
```
Device: POST /api/pos/orders + X-Idempotency-Key: req_abc123
Cloud: Check idempotency_keys collection
       ↓ Found? Return cached response (no duplicate)
       ↓ Not found? Process + cache response
```

---

## 🧪 Testing Offline Mode

### Manual Testing
1. **Open DevTools → Network tab**
2. **Set throttling to "Offline"**
3. **Test POS operations:**
   - Create order
   - Add items
   - Process payment
4. **Check:**
   - Operations succeed with "queued" status
   - OnlineStatusIndicator shows "Offline" + count
5. **Go back online:**
   - Indicator changes to "Syncing"
   - Commands replay automatically
   - Count goes to 0

### Chrome DevTools Console
```javascript
// Check IndexedDB
const db = await indexedDB.open('restin_offline_db', 1);

// Check pending commands
import offlineDB from './services/OfflineDB';
const stats = await offlineDB.getStats();
console.log(stats);

// Force sync
import syncService from './services/SyncService';
await syncService.forceSyncNow();
```

---

## 🔐 Security Features

### Offline Auth
- Auth tokens cached with TTL (8 hours default)
- Expired tokens → degrade to view-only
- All offline operations flagged in audit

### Idempotency
- Request IDs prevent duplicates
- 24-hour cache window
- Automatic cleanup

### Audit Trail
- Every offline operation logged
- Source device tracked
- Sync status recorded
- Conflict resolution visible

---

## 📱 iOS/iPad Support

### PWA Installation
1. Open Safari → Navigate to restin.ai
2. Tap Share → "Add to Home Screen"
3. App runs in standalone mode
4. Offline support active

### Limitations
- Background sync limited (iOS)
- Push notifications require permission
- File system access restricted

### Optimizations
- Service worker caches UI bundle
- IndexedDB for offline data
- LocalStorage for preferences

---

## 🎛️ Configuration

### Frontend Environment Variables
```env
# Service Worker
REACT_APP_SW_ENABLED=true

# Offline Settings
REACT_APP_OFFLINE_CACHE_TTL=60  # minutes
REACT_APP_SYNC_INTERVAL=30      # seconds
REACT_APP_MAX_RETRY_COUNT=3
```

### Backend Environment Variables
```env
# Idempotency
IDEMPOTENCY_TTL_HOURS=24

# Backup
BACKUP_ENABLED=true
BACKUP_DIR=/app/backups
NAS_ENABLED=false
NAS_PATH=/mnt/venue_nas
S3_BUCKET=restin-backups
RETENTION_DAYS=90
```

---

## 📊 Monitoring & Observability

### Metrics to Track
- **Queue Depth:** Current pending commands
- **Sync Lag:** Time since last successful sync
- **Success Rate:** % of commands synced successfully
- **Offline Duration:** How long device was offline
- **Cache Hit Rate:** % of requests served from cache

### Alerts
- Queue depth > 100 (long offline period)
- Sync failures > 10% (investigate conflicts)
- Backup verification failed (integrity issue)

---

## 🔄 Failover Scenarios

### Scenario Matrix

| Cloud | Edge | Device | Mode | Capabilities |
|-------|------|--------|------|--------------|
| ✅ | ✅ | ✅ | **Full Online** | 100% features |
| ❌ | ✅ | ✅ | **Venue Offline** | 95% (via Edge cache) |
| ❌ | ❌ | ✅ | **Device Offline** | 60% (critical ops queued) |
| ✅ | ❌ | ✅ | **Edge Down** | 90% (direct to cloud) |

### Degradation Policy
- **Full Offline:** POS (create orders), KDS (view only), Inventory (read only)
- **Auth TTL Expired:** View-only mode + re-auth prompt
- **Queue Full (>500):** Alert user, block new operations

---

## 🚀 Deployment

### Frontend (PWA)
```bash
cd /app/frontend
yarn build
# Service worker auto-registered in production
```

### Backend (Idempotency)
```bash
# Already integrated via middleware
# No additional deployment needed
```

### Edge Gateway (Phase 2)
```bash
# Docker deployment on venue hardware
docker-compose -f edge-gateway/docker-compose.yml up -d
```

---

## 📝 Next Steps (Future Enhancements)

### Phase 2: Edge Gateway Deployment
- Deploy Node.js edge server per venue
- LAN discovery setup
- Print server integration

### Phase 3: Device Mesh
- WebSocket mesh implementation
- Hub election logic
- Queue replication

### Phase 4: Advanced Backup
- S3 integration
- Automated restore testing
- PII redaction

---

## ✅ Testing Checklist

### Offline Queue
- [x] Create POS order offline
- [x] Add items offline
- [x] Process payment offline
- [x] Queue stores in IndexedDB
- [x] Sync replays when online
- [x] No duplicates created
- [x] UI shows offline indicator

### Service Worker
- [x] Static assets cached
- [x] App loads offline
- [x] API calls fallback to cache
- [ ] Background sync works (requires HTTPS)

### Idempotency
- [x] Middleware installed
- [x] Duplicate requests return cached response
- [ ] 24h TTL cleanup job (needs cron)

### Backup
- [ ] Manual snapshot test
- [ ] Verify backup integrity
- [ ] Test restore (staging)

---

**Status:** Phase 1 COMPLETE, Phase 2-3 ARCHITECTURE READY
**Next:** Deploy & test in staging environment
