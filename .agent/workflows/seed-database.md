---
description: Seed database with venue and user data
---

# Database Seeding

## Prerequisites

- MongoDB running on `localhost:27017`
- Backend `.env` configured

## Run Seed Script

// turbo

```powershell
cd backend
python seed_data.py
```

## Expected Output

```
[SEED] Seeding database with Marvin Gauci Group venues...
[OK] Created 3 venues from Master Seed
[OK] Created 14 zones
[OK] Created 66 tables
[OK] Created X users from Master Seed
...
[SEED] Database seeding completed!
```

## Verify Data

// turbo

```powershell
curl http://localhost:8000/api/venues
```

Should return 3 venues:

- Caviar & Bull
- Don Royale
- Sole by Tarragon

## Troubleshooting

**Problem:** Unicode error (emoji in print)
**Fix:** Already patched - emojis removed from print statements
