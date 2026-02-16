# Election Management System: Development & Deployment Protocol

To ensure project stability, prevent data integrity errors, and optimize token usage, this protocol must be strictly followed for all changes.

## 1. System Contract (The Chain of Truth)
Before modifying any data-handling logic, the "Contract" must be audited in this specific order:
1.  **Database Layer (`voter_vault/core_db/models.py`):** Identify hard constraints (unique keys, field types, nullability).
2.  **Bridge Layer (`core/db_bridge.py`):** Audit the translator functions. Use **Keyword Arguments** (e.g., `booth_number=num`) for all bridge calls to prevent positional mismatches.
3.  **API Layer (`backend/main.py`):** Ensure the Pydantic `BaseModel` reflects the types confirmed in the models (using `Optional` and `Any` for flexibility).
4.  **Frontend Layer (`frontend/src/App.jsx`):** Align variables with the API's expected JSON structure.

## 2. Zero-Assumption Deployment
Never "claim victory" based on local code changes. A fix is only verified when:
1.  **Forced Rebuild:** Use `docker compose up -d --build --force-recreate` to invalidate stale caches.
2.  **Real-Time Log Monitoring:** Follow logs (`docker logs -f`) during the first live test to witness the specific new logic executing.
3.  **End-to-End Verification:** Run `test_flow.py` targeting the **Live URL** to confirm the server accepts the new data structure.

## 3. Data Integrity Standards
*   **JSON-Only APIs:** No complex data (especially Unicode/Malayalam) should be sent via URL query parameters. Always use POST with a JSON body.
*   **Defensive Pydantic Models:** Always include logging of incoming packets at the API entry point for immediate troubleshooting.
*   **Global Conflict Checks:** Use `grep` to scan the entire project for a variable before renaming or modifying it, ensuring "stale" references in scripts or CSS are caught.

## 4. Deployment Checklists
*   [ ] Verify `models.py` constraints.
*   [ ] Map keyword arguments in bridge.
*   [ ] Update Pydantic model with logging.
*   [ ] Update `api.js` request body.
*   [ ] Force build and recreate on server.
*   [ ] Verify Status 200 via `test_flow.py`.
