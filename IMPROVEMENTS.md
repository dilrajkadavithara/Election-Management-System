# OCR Engine Improvements (`core/ocr_engine.py`)

These are safe refactors that do not alter the core OCR logic (detection, prompts, or pipeline flow).

## 1. Duplicated retry/error-handling logic
`extract_batch_from_images()` and `extract_box_batch()` each have their own 5-attempt retry loop with identical debug logging. The shared helper `_run_gemini_request()` already exists and does the same thing. These two methods should delegate to it.

**Risk:** Medium — retry behavior is critical to production reliability. Requires thorough testing to ensure identical behavior after refactor.

## 2. Inline schema duplication
`extract_batch_from_images()` defines the voter schema inline (lines 156-176), while `_get_voter_schema()` exists for exactly this purpose. The inline copy should call `self._get_voter_schema()`.

**Risk:** Low — pure deduplication, no behavioral change as long as both schemas are identical.

## 3. Buggy `'response' in dir()` check
Multiple locations use `'response' in dir()` to check if the `response` variable exists in the local scope. `dir()` without arguments returns module-level names, not local variables, making this check unreliable. Should initialize `response = None` before the try block and check `response is not None`.

**Risk:** Low — this is a bug fix. Current code may silently skip debug logging on failures.

## 4. Unused imports
`re`, `random`, and `datetime` are imported but never used in this file.

**Risk:** Very Low — removing unused imports has no behavioral impact.

## 5. Legacy Tesseract config still initialized
`config_numeric`, `config_eng`, `config_mal`, and `config_epic` are marked "Legacy" and unused since the pipeline moved to Gemini. Dead code sitting in `__init__`.

**Risk:** Very Low — removing dead config strings has no behavioral impact. Verify no external code references these attributes.

## 6. `import io` repeated inside methods
`io` is imported locally inside three different methods instead of once at the top of the file.

**Risk:** Very Low — moving to a top-level import is a standard cleanup with no behavioral change.

## 7. Missing type hints
No type annotations on any method signatures. Adding type hints improves readability and enables static analysis.

**Risk:** Very Low — type hints are purely additive and do not affect runtime behavior.

## 8. Hardcoded Gemini pricing
`get_token_usage()` has hardcoded `$0.15/M input` and `$0.60/M output`. If pricing changes, cost estimates silently become wrong. Should be class-level constants.

**Risk:** Very Low — extracting magic numbers to constants does not change behavior.

---

# Backend Audit Findings

Full audit of all non-protected files in `backend/`. Organized by file, sorted by risk level within each file.

---

## `backend/django_bridge.py`

### 9. ~~Unhandled `User.DoesNotExist` exceptions~~ FIXED
~~Multiple functions call `User.objects.get(username=username)` without try-except (lines ~63, 67, 71, 75, 91, 116). If a user is deleted between token validation and the DB call, the worker crashes with an unhandled exception instead of returning an HTTP error.~~

**Risk:** Critical — **FIXED:** Added `_get_user_or_raise()` helper that catches `User.DoesNotExist` and raises `ValueError`. Global exception handler in `main.py` converts it to HTTP 404. Also fixed inline `User.objects.get()` in `analytics.py`. Type hints added to all wrapper functions.

### 10. ~~Missing type hints on all wrapper functions~~ FIXED
~~Sync wrapper functions like `sync_authenticate()`, `sync_dashboard_wrapper()` lack parameter and return type annotations.~~

**Risk:** Medium — **FIXED:** Type hints added to all wrapper functions in `django_bridge.py` as part of the #9 fix.

---

## `backend/state_manager.py`

### 11. ~~Cancellation does not work without Redis~~ FIXED
~~`mark_cancelled()` and `remove_cancelled()` only operate on Redis (lines ~86-93). The in-memory fallback has no cancellation tracking — `is_cancelled()` always returns `False` in offline mode.~~

**Risk:** Critical — **FIXED:** Added `self._cancelled_batches: set[str]` to local fallback. All three methods (`is_cancelled`, `mark_cancelled`, `remove_cancelled`) now have working `else` branches. Type hints added.

### 12. ~~Incomplete local storage fallback~~ FIXED
~~`is_cancelled()` (line ~80) always returns `False` for local storage with a TODO comment. This is a known gap that was never addressed.~~

**Risk:** Medium — **FIXED:** Resolved as part of #11.

---

## `backend/tasks.py`

### 13. Race condition in progress tracking
`update_progress()` callback (lines ~141-183) re-fetches the batch from state_manager, modifies it, then saves it back. No locking between fetch and save — concurrent page processing can overwrite each other's progress updates.

**Risk:** High — UI shows incorrect progress; page results can be lost.

### 14. Unhandled exception in thread pool state updates
Exception handler in executor loop (lines ~266-295) catches `Exception` but the nested state update (`state_manager.set_batch()`) inside the except block has no try-except of its own.

**Risk:** High — state updates can fail silently, leaving batch in an inconsistent state.

### 15. Fallback page count swallows errors
Lines ~129-135 catch broad `Exception` when counting pages. If page count fails, the batch continues with incorrect `total_pages`, and progress percentage never reaches 100%.

**Risk:** High — silent data corruption in progress tracking.

### 16. Broad exception catching throughout
Lines ~79, 94, 134, 288, 304, 341 use generic `except Exception as e:` instead of catching specific exceptions (IOError, PdfReadError, etc.).

**Risk:** Medium — masks programming errors and makes debugging harder.

### 17. Integer conversion without bounds checking
Serial OCR values (line ~212) are cast to int without validating reasonable range (e.g., 1-3000). Corrupted OCR data with extreme values is silently accepted.

**Risk:** Medium — bad data enters the pipeline without warning.

### 18. Unused imports
`multiprocessing` (line ~6) is imported but never used. `gc` is imported but only called once.

**Risk:** Very Low — code cleanliness.

### 19. Duplicate Django setup
Both `main.py` (lines ~19-23) and `tasks.py` (lines ~22-24) call `django.setup()`. Double initialization could cause issues depending on import order.

**Risk:** Low — works but fragile.

---

## `backend/dependencies.py`

### 20. Missing return type annotations
`create_access_token()` (line ~14) returns `str` but has no annotation. `get_current_user()` (line ~20) returns `dict` but has no annotation.

**Risk:** Medium — type checking tools can't validate return values.

---

## `backend/main.py`

### 21. Print statement instead of logger
Line ~24 uses `print("✅ Django Bridge Initialized...")` instead of `logger.info()`.

**Risk:** Low — bypasses log aggregation and formatting.

### 22. Redundant `os` import alias
`os` is imported as `_os` (line ~30) while `os` is already imported at the top. Creates unnecessary confusion.

**Risk:** Low — code clarity.

### 23. CORS origins not validated
`ALLOWED_ORIGINS` env var is split by comma (line ~39) without trimming whitespace or validating URLs. A misconfigured env var could allow unintended origins.

**Risk:** Medium — potential CORS misconfiguration in production.

---

## `backend/celery_app.py`

### 24. Hardcoded default Redis URL
Line ~5 defaults to `redis://localhost:6379/0` without warning if the env var is missing. In production, this silently connects to the wrong Redis or fails.

**Risk:** High — silent misconfiguration in deployment.

---

## `backend/routers/auth.py`

### 25. Information disclosure in error message
Line ~17 error message mentions "ensure the latest build is live", which reveals deployment details to potential attackers.

**Risk:** Medium — aids reconnaissance.

---

## `backend/routers/admin.py`

### 26. Inconsistent authorization error responses
Multiple endpoints (lines ~58, 66, 74, 82, 115, 123) raise `HTTPException(403)` without a `detail` parameter, while others include detail messages. Inconsistent API behavior for clients.

**Risk:** Medium — makes error handling unpredictable for frontend.

### 27. Weak password requirement
Line ~104-105 only requires 6 characters minimum. No complexity requirements (uppercase, numbers, special characters).

**Risk:** Medium — vulnerable to brute-force attacks.

### 28. Incomplete path traversal protection
Line ~190 checks `safe_name != image_name or '..' in image_name` but doesn't handle symlinks or Windows case-sensitivity. Should use `pathlib.Path.resolve()` comparison.

**Risk:** Medium — potential file access outside intended directory.

### 29. Role hierarchy not enforced for user deletion
`delete_user_async` only checks `['SUPERUSER', 'MANAGER']` but the creation hierarchy allows `CONSTITUENCY_ADMIN` and `LOCAL_BODY_HEAD` to create users. Inconsistent privilege model.

**Risk:** Medium — privilege escalation edge case.

### 30. No file size limit on party symbol upload
Lines ~160-165 validate file extension but don't enforce a maximum file size. Large uploads could exhaust disk space.

**Risk:** Low — resource exhaustion vector.

---

## `backend/routers/voters.py`

### 31. Redundant role check in toggle-attendance guard
Line ~43: `if not user_info.get('can_edit_voters', False) and user_info.get('role') != 'BOOTH_AGENT'` has a redundant `role != 'BOOTH_AGENT'` fallback. In practice, all booth agents have `can_edit_voters=True`, so the role check never triggers. Not a bug — just dead logic.

**Risk:** Low — redundant condition, no behavioral impact. Could be simplified to just check `can_edit_voters` for clarity.

### 32. Scope check only applies to BOOTH_AGENT
Lines ~47-51, 64-68: Voter scope validation only runs for BOOTH_AGENT role. Other roles with `can_edit_voters` can edit any voter regardless of their assigned scope.

**Risk:** Medium — users can edit voters outside their assigned area.

### 33. CSV formula injection
Lines ~92-119: CSV output directly includes voter data without sanitization. Values starting with `=`, `+`, `@`, `-` will execute as formulas when opened in Excel/Google Sheets.

**Risk:** Medium — potential attack vector if voter names are manipulated.

### 34. Missing pagination bounds validation
Lines ~14, 22: No validation that `page >= 1` or that `page_size` is within reasonable bounds. Negative values could cause logic errors.

**Risk:** Low — edge case causing unexpected behavior.

---

## `backend/routers/analytics.py`

### 35. ~~User lookup without error handling~~ FIXED
~~Line ~46: `User.objects.get(username=...)` will raise `DoesNotExist` if the user was deleted after authentication.~~

**Risk:** High — **FIXED:** `sync_war_wrapper()` now uses `.filter().first()` with `ValueError` raise, caught by global handler in `main.py`.

### 36. No scope validation on analytics endpoint
Lines ~22, 31: `get_strategic_analytics_api` requires authentication but doesn't validate the user's role or scope. Any authenticated user can view any constituency's analytics.

**Risk:** Low — information disclosure beyond assigned scope.

---

## `backend/routers/communications.py`

### 37. ~~User lookup without error handling~~ FIXED
~~Lines ~15, 37: Same `User.objects.get()` issue as analytics.py.~~

**Risk:** High — **FIXED:** Both call sites now use `_get_user_or_raise()` from `django_bridge.py`, caught by global handler in `main.py`.

### 38. No message content validation
Lines ~50-51: Heading and message body are passed to `send_direct_broadcast()` without length or content validation.

**Risk:** Medium — could send malformed or oversized messages.

### 39. Image path not validated
Line ~53: `data.image_path` is passed to broadcast without validating the file exists or is within an allowed directory.

**Risk:** Medium — potential path traversal or referencing nonexistent files.

---

## `backend/routers/system.py`

### 40. ~~System info exposed in unauthenticated health endpoint~~ FIXED
~~Line ~15: `/health` returns detailed system status (Redis, Poppler, DB, Google AI config) without requiring authentication.~~

**Risk:** High — **FIXED:** Split into unauthenticated `/health` (returns only `{"status": "healthy"}` for Docker healthchecks) and authenticated `/health/details` (full diagnostics behind `get_current_user`).

### 41. ~~Boolean logic error in Poppler check~~ FIXED
~~Line ~28: `elif not os.name == 'nt' or os.path.exists("/usr/bin/pdftoppm")` is logically incorrect. On Windows, `not os.name == 'nt'` is `False`, but the `or` still evaluates the second condition. Should be `and` instead of `or`.~~

**Risk:** Medium — **FIXED:** Changed to `os.name != 'nt' and os.path.exists(...)` as part of the #40 fix.

### 42. Unauthenticated party symbol endpoint
Lines ~57-68: `/party-symbol/{image_name}` serves files without authentication. Combined with incomplete path traversal checks, this could expose unintended files.

**Risk:** Medium — unauthenticated file access.

---

## `backend/schemas/auth.py`

### 43. No validation on new password
`PasswordChange.new_password` (line ~6) has no minimum length, complexity, or format constraints.

**Risk:** Medium — allows trivially weak passwords.

---

## `backend/schemas/admin.py`

### 44. Role field accepts any string
`role: str` (lines ~44, 62) should be constrained to valid role values using `Literal`.

**Risk:** Low — invalid roles could be submitted and cause downstream errors.

### 45. Duplicate assignment field formats
Both flat format (`assigned_constituencies`, etc.) and nested format (`assignments`) are accepted (lines ~49-53, 68-72). No validation if both are provided with conflicting values.

**Risk:** Medium — ambiguous input could cause unpredictable behavior.

### 46. No email validation
Email fields (lines ~46, 64) accept any string. Should use Pydantic's `EmailStr`.

**Risk:** Low — invalid emails stored in database.

---

## `backend/schemas/voters.py`

### 47. Enum fields not constrained
`voting_probability` (line ~15), `gender` (line ~8), and `voter_leaning` are `Optional[str]` with no validation. Should use `Literal` types matching the model choices.

**Risk:** Medium — invalid values bypass schema validation and may cause display or query issues.

### 48. Age field has no bounds
`age: Optional[int]` (line ~7) accepts any integer including negatives or impossibly large values. Should use `Field(ge=1, le=120)`.

**Risk:** Low — bad data enters database unchecked.

### 49. SaveBatchRequest uses empty string defaults instead of None
Lines ~18-27: Fields default to `""` instead of `None`, making it ambiguous whether the user provided an empty value or omitted the field entirely.

**Risk:** Medium — complicates downstream logic that needs to distinguish "not provided" from "intentionally empty".

---

# Summary

| Risk Level | Count | Fixed | Remaining | Key Files |
|-----------|-------|-------|-----------|-----------|
| Critical | 2 | 2 | 0 | ~~django_bridge.py~~, ~~state_manager.py~~ |
| High | 6 | 3 | 3 | tasks.py, celery_app.py |
| Medium | 18 | 3 | 15 | Across all routers, schemas, main.py, dependencies.py |
| Low | 13 | 0 | 13 | admin.py, voters.py, schemas, tasks.py |
| Very Low | 2 | 0 | 2 | tasks.py |

**Total: 49 findings** (8 OCR engine + 41 backend) — **8 fixed, 41 remaining**
