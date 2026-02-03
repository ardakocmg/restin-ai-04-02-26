# PATCH A: Auth Foundation - Implementation Summary

## Changes Made:

### Backend (FastAPI `/app/backend/server.py`):

**NEW ENDPOINT**: `POST /api/auth/login/pin`
- Accepts: `{ "pin": "1234", "app": "admin|pos|kds", "deviceId": "..." }`
- Returns: `{ "accessToken": "...", "user": {...}, "allowedVenueIds": [...], "defaultVenueId": "..." }`
- Features:
  - PIN-only login (no username required)
  - Looks up user by PIN hash across ALL venues
  - Returns list of allowed venue IDs
  - Auto-selects venue if user only has access to one
  - Rate limiting (5 attempts per 5 min per device)
  - Audit logging of all attempts

**NEW MODELS**:
- Added `allowed_venue_ids` array to User model
- Added `default_venue_id` to User model  
- LoginAttempt tracking for rate limiting

**RATE LIMITING**:
- Tracks failed attempts by deviceId
- Locks out after 5 failures for 5 minutes
- Resets on successful login

### Frontend (`/app/frontend/src/pages/Login.js`):

**NEW LOGIN FLOW**:
1. User sees PIN pad + app selector (Admin/POS/KDS)
2. User enters 4-digit PIN
3. Auto-submits on 4th digit
4. If success:
   - Single venue → Auto-select and enter app
   - Multiple venues → Show venue selection screen
5. If failure:
   - Show error + reset PIN
   - Rate limit message if too many attempts

**KEY FEATURES**:
- PIN first, venue selection after (not before)
- Auto-venue selection for single-venue users
- Device binding support
- Better error messages (401 vs 403)
- Rate limit feedback

### Database Updates:

**Users Collection** - Added fields:
```javascript
{
  allowed_venue_ids: ["venue-id-1", "venue-id-2"], // Array of accessible venues
  default_venue_id: "venue-id-1" // Optional default
}
```

**LoginAttempts Collection** - New:
```javascript
{
  device_id: "device-123",
  pin_hash_partial: "**34", // Last 2 digits for audit
  success: false,
  fail_reason: "Invalid PIN",
  attempted_at: ISODate(),
  app: "admin"
}
```

## Migration Script:

Run this to update existing users:
```bash
mongo restinai --eval '
db.users.updateMany(
  {},
  { 
    $set: { 
      allowed_venue_ids: ["$venue_id"],
      default_venue_id: "$venue_id"
    } 
  }
)'
```

## Testing:

**Test PINs (from seed)**:
- Owner: 1234
- Manager: 2345  
- Staff: 1111

**Test Flow**:
1. Navigate to login
2. Select "Admin" app
3. Enter PIN 1234
4. Should auto-login if owner has only 1 venue
5. Or show venue selection if multiple

**Test Rate Limiting**:
1. Enter wrong PIN 5 times quickly
2. 6th attempt should show "Too many attempts"
3. Wait 5 minutes, can try again

## Known Limitations (to be addressed in Patch B):

- ✗ Shift validation not yet implemented
- ✗ Manager override not yet implemented  
- ✗ Auto-logout worker not implemented
- ✗ Session tracking not fully implemented

## Files Modified:

1. `/app/backend/server.py` - New login endpoint + rate limiting
2. `/app/frontend/src/pages/Login.js` - New PIN-first flow
3. `/app/frontend/src/lib/api.js` - Updated auth API call
4. `/app/frontend/src/context/AuthContext.js` - Handle new response format

## Next Steps (Patch B):

- Implement shift validation
- Add manager override UI
- Create shift management admin pages
- Worker job for auto-logout
