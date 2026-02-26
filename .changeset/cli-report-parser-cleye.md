---
'@backstage/repo-tools': patch
---

Updated CLI report parser to support cleye-style help output sections (`USAGE:` and `FLAGS:`). Switched to synchronous child process execution for CLI report extraction to avoid stdout data loss.
