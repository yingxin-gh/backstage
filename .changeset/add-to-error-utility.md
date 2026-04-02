---
'@backstage/errors': minor
---

A new `toError` utility function is now available for converting unknown values to `ErrorLike` objects. If the value is already error-like it is returned as-is. Strings are used directly as the error message, and other values are stringified with a fallback to JSON to avoid unhelpful messages like `[object Object]`. Non-error causes passed to `CustomErrorBase` are now converted and stored using `toError` rather than discarded.
