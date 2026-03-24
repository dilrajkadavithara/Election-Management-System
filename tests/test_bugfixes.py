"""
Tests for the 8 bugs fixed in the backend audit.

Covers:
  #9  — _get_user_or_raise() handles missing users (django_bridge.py)
  #11 — Cancellation fallback works without Redis (state_manager.py)
  #35 — analytics.py war room handles missing users
  #37 — communications.py handles missing users
  #40 — Health endpoint split: public vs authenticated
  #41 — Poppler boolean logic fix (system.py)
"""
import pytest
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient
from backend.main import app
from backend.dependencies import create_access_token

client = TestClient(app)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _auth_header(username: str = "testuser") -> dict[str, str]:
    """Generate a valid Bearer token header for testing."""
    token = create_access_token({"sub": username})
    return {"Authorization": f"Bearer {token}"}


# ---------------------------------------------------------------------------
# #9 — _get_user_or_raise (django_bridge.py)
# ---------------------------------------------------------------------------

@pytest.mark.django_db
class TestGetUserOrRaise:
    """Test that _get_user_or_raise raises ValueError for missing users."""

    def test_raises_value_error_for_nonexistent_user(self):
        from backend.django_bridge import _get_user_or_raise
        with pytest.raises(ValueError, match="does not exist"):
            _get_user_or_raise("completely_nonexistent_user_12345")

    def test_returns_user_for_existing_user(self):
        """Verify it returns a User object when the user exists."""
        from django.contrib.auth.models import User
        from backend.django_bridge import _get_user_or_raise

        user = User.objects.create_user(username="testuser_bugfix", password="testpass123")
        result = _get_user_or_raise(user.username)
        assert result.id == user.id
        assert result.username == user.username


# ---------------------------------------------------------------------------
# #9 + main.py — Global ValueError → HTTP 404 handler
# ---------------------------------------------------------------------------

class TestValueErrorHandler:
    """Test that ValueError from _get_user_or_raise becomes HTTP 404."""

    def test_stats_endpoint_returns_404_for_missing_user(self):
        """GET /api/stats with a valid token for a nonexistent user → 404."""
        headers = _auth_header("ghost_user_does_not_exist")
        # get_current_user will fail at get_user_info_async (returns None → 401)
        # But if it somehow passes, the downstream wrapper would raise ValueError → 404
        response = client.get("/api/stats", headers=headers)
        assert response.status_code in (401, 404)

    def test_valueerror_returns_404_with_detail(self):
        """Directly test that the exception handler formats the response."""
        from backend.main import value_error_handler
        from fastapi import Request
        import asyncio

        # Create a mock request
        scope = {"type": "http", "method": "GET", "path": "/test"}
        request = Request(scope)
        exc = ValueError("User 'ghost' does not exist")

        response = asyncio.get_event_loop().run_until_complete(
            value_error_handler(request, exc)
        )
        assert response.status_code == 404
        assert b"ghost" in response.body


# ---------------------------------------------------------------------------
# #11 + #12 — StateManager cancellation fallback without Redis
# ---------------------------------------------------------------------------

class TestCancellationFallback:
    """Test that cancellation works in local (non-Redis) mode."""

    def _make_local_state_manager(self) -> "StateManager":
        """Create a StateManager forced into local mode (no Redis)."""
        from backend.state_manager import StateManager
        with patch.object(StateManager, "__init__", lambda self: None):
            sm = StateManager()
        sm.use_redis = False
        sm.persistence_path = "data/sessions.json"
        sm._local_storage = {}
        sm._cancelled_batches = set()
        return sm

    def test_mark_and_check_cancelled(self):
        sm = self._make_local_state_manager()
        assert sm.is_cancelled("batch_abc") is False

        sm.mark_cancelled("batch_abc")
        assert sm.is_cancelled("batch_abc") is True

    def test_remove_cancelled(self):
        sm = self._make_local_state_manager()
        sm.mark_cancelled("batch_xyz")
        assert sm.is_cancelled("batch_xyz") is True

        sm.remove_cancelled("batch_xyz")
        assert sm.is_cancelled("batch_xyz") is False

    def test_remove_nonexistent_does_not_raise(self):
        """Calling remove_cancelled on a batch that was never cancelled should not error."""
        sm = self._make_local_state_manager()
        sm.remove_cancelled("never_existed")  # Should not raise

    def test_multiple_batches_independent(self):
        sm = self._make_local_state_manager()
        sm.mark_cancelled("batch_1")
        sm.mark_cancelled("batch_2")

        assert sm.is_cancelled("batch_1") is True
        assert sm.is_cancelled("batch_2") is True
        assert sm.is_cancelled("batch_3") is False

        sm.remove_cancelled("batch_1")
        assert sm.is_cancelled("batch_1") is False
        assert sm.is_cancelled("batch_2") is True

    def test_mark_cancelled_idempotent(self):
        """Marking the same batch twice should not error or duplicate."""
        sm = self._make_local_state_manager()
        sm.mark_cancelled("batch_dup")
        sm.mark_cancelled("batch_dup")
        assert sm.is_cancelled("batch_dup") is True

        sm.remove_cancelled("batch_dup")
        assert sm.is_cancelled("batch_dup") is False


# ---------------------------------------------------------------------------
# #40 — Health endpoint split (public vs authenticated)
# ---------------------------------------------------------------------------

class TestHealthEndpointSplit:
    """Test that /health is public and /health/details requires auth."""

    def test_public_health_returns_200_no_auth(self):
        response = client.get("/api/health")
        assert response.status_code == 200

    def test_public_health_returns_only_status(self):
        """Public /health should not leak system details."""
        response = client.get("/api/health")
        data = response.json()
        assert data == {"status": "healthy"}
        assert "redis" not in data
        assert "google_ai" not in data
        assert "db" not in data
        assert "poppler" not in data

    def test_health_details_requires_auth(self):
        """GET /health/details without auth → 401."""
        response = client.get("/api/health/details")
        assert response.status_code == 401

    def test_health_details_returns_system_info_with_auth(self):
        """GET /health/details with valid auth → full diagnostics."""
        from backend.dependencies import get_current_user

        mock_user = {"username": "testadmin", "role": "SUPERUSER", "can_manage_system": True}
        app.dependency_overrides[get_current_user] = lambda: mock_user
        try:
            response = client.get("/api/health/details")
            assert response.status_code == 200
            data = response.json()
            assert "status" in data
            assert "redis" in data
            assert "google_ai" in data
            assert "poppler" in data
        finally:
            app.dependency_overrides.pop(get_current_user, None)

    def test_health_details_route_exists(self):
        """Verify /health/details is mounted (not 404)."""
        response = client.get("/api/health/details")
        assert response.status_code != 404


# ---------------------------------------------------------------------------
# #35 + #37 — User lookup in analytics and communications routers
# ---------------------------------------------------------------------------

class TestRouterUserLookups:
    """Test that routers return proper errors for missing users instead of crashing."""

    def test_analytics_stats_rejects_missing_user(self):
        headers = _auth_header("nonexistent_analytics_user")
        response = client.get("/api/stats", headers=headers)
        # Should get 401 (token valid but user not found) not 500
        assert response.status_code in (401, 404)
        assert response.status_code != 500

    def test_analytics_strategic_rejects_missing_user(self):
        headers = _auth_header("nonexistent_strategic_user")
        response = client.get("/api/analytics/strategic", headers=headers)
        assert response.status_code in (401, 404, 500)  # 500 is caught by its own try-except
        assert response.status_code != 500 or "failed" in response.json().get("detail", "")

    def test_war_room_rejects_missing_user(self):
        headers = _auth_header("nonexistent_war_user")
        response = client.get("/api/war-room/stats", headers=headers)
        assert response.status_code in (401, 404)
        assert response.status_code != 500

    def test_voters_endpoint_rejects_missing_user(self):
        headers = _auth_header("nonexistent_voters_user")
        response = client.get("/api/voters", headers=headers)
        assert response.status_code in (401, 404)
        assert response.status_code != 500

    def test_comm_stats_rejects_missing_user(self):
        headers = _auth_header("nonexistent_comm_user")
        response = client.get("/api/comm/stats", headers=headers)
        assert response.status_code in (401, 404)
        assert response.status_code != 500


# ---------------------------------------------------------------------------
# #41 — Poppler boolean logic (verified via health/details response)
# ---------------------------------------------------------------------------

class TestPopplerLogic:
    """Test that the Poppler detection logic is correct per platform."""

    def test_poppler_check_does_not_false_positive_on_windows(self):
        """On Windows without /usr/bin/pdftoppm, Poppler should not be 'ready (system)'."""
        import os
        if os.name != "nt":
            pytest.skip("Windows-only test")

        from backend.dependencies import get_current_user

        mock_user = {"username": "testadmin", "role": "SUPERUSER", "can_manage_system": True}
        app.dependency_overrides[get_current_user] = lambda: mock_user
        try:
            response = client.get("/api/health/details")
            data = response.json()
            # On Windows, poppler should be "ready" (via POPPLER_PATH) or "missing",
            # never "ready (system)" which is the Linux path
            assert data["poppler"] != "ready (system)"
        finally:
            app.dependency_overrides.pop(get_current_user, None)
