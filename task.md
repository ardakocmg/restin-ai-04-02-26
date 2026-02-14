# Task: Unified Task System Bridge (Hive + Kanban)

## User Request

Merge Hive micro-tasks and Tasks Kanban into a single unified `tasks` collection.
Messages should remain separate per venue and group channels.

## Architecture

### Unified Tasks

- **Single `tasks` collection** serves both Hive micro-tasks and Kanban board
- `TaskExtended` model has all fields from both systems
- Hive-origin tasks get `source: "hive"`, Kanban-origin get `source: "kanban"`
- Status mapping layer: Hive (pool/assigned/in-progress/done) ↔ Kanban (TODO/IN_PROGRESS/REVIEW/DONE)
- All tasks are `venue_id` scoped

### Messages

- **`hive_messages` collection** with `venue_id` and `scope` fields
- `scope`: `"venue"` (per-venue channels), `"group"` (org-wide), `"dm"` (direct messages)
- Messages filtered by `venue_id` + `channel_id`

## Status

- [x] Phase 1: Unified Task Model (TaskExtended + Hive fields + status mapping)
- [x] Phase 2: Unified Task Routes (hive_routes uses `tasks` collection)
- [x] Phase 3: Message Scoping (venue_id + scope on messages)
- [x] Phase 4: Frontend Sync (HiveDashboard passes venueId to all API calls)
