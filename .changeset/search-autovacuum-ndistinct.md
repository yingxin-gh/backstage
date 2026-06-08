---
'@backstage/plugin-catalog-backend': patch
---

Added a migration that tunes PostgreSQL automatic vacuum thresholds on the `search` table and fixes column statistics for `entity_id`. This prevents the query planner from falling back to sequential scans when table maintenance falls behind, keeping catalog list queries fast on large installations.
