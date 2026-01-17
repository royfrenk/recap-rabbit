"""
Tests for subscriptions API endpoints.
"""
import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from fastapi.testclient import TestClient
from fastapi import FastAPI
import jwt
from datetime import datetime, timedelta

from app.routers.subscriptions import router, MAX_BATCH_SIZE, VALID_EPISODE_STATUSES


# Create a test app with the router
app = FastAPI()
app.include_router(router, prefix="/api/subscriptions")


def create_test_token(user_id: str = "test-user-123") -> str:
    """Create a valid JWT token for testing."""
    secret = "your-secret-key-change-in-production"
    payload = {
        "sub": user_id,
        "exp": datetime.utcnow() + timedelta(hours=1)
    }
    return jwt.encode(payload, secret, algorithm="HS256")


@pytest.fixture
def client():
    """Create test client."""
    return TestClient(app)


@pytest.fixture
def auth_headers():
    """Create authorization headers with valid token."""
    token = create_test_token()
    return {"Authorization": f"Bearer {token}"}


class TestCreateSubscription:
    """Tests for POST /api/subscriptions endpoint."""

    def test_rejects_localhost_url(self, client, auth_headers):
        """Should reject subscription with localhost feed URL."""
        response = client.post(
            "/api/subscriptions",
            json={
                "podcast_id": "test-123",
                "podcast_name": "Test Podcast",
                "feed_url": "http://localhost:8080/feed"
            },
            headers=auth_headers
        )
        assert response.status_code == 400
        assert "Invalid feed URL" in response.json()["detail"]

    def test_rejects_private_ip_url(self, client, auth_headers):
        """Should reject subscription with private IP feed URL."""
        response = client.post(
            "/api/subscriptions",
            json={
                "podcast_id": "test-123",
                "podcast_name": "Test Podcast",
                "feed_url": "http://192.168.1.1/feed"
            },
            headers=auth_headers
        )
        assert response.status_code == 400
        assert "Invalid feed URL" in response.json()["detail"]

    def test_rejects_file_scheme_url(self, client, auth_headers):
        """Should reject subscription with file:// feed URL."""
        response = client.post(
            "/api/subscriptions",
            json={
                "podcast_id": "test-123",
                "podcast_name": "Test Podcast",
                "feed_url": "file:///etc/passwd"
            },
            headers=auth_headers
        )
        assert response.status_code == 400
        assert "Invalid feed URL" in response.json()["detail"]

    def test_rejects_loopback_ip_url(self, client, auth_headers):
        """Should reject subscription with 127.0.0.1 feed URL."""
        response = client.post(
            "/api/subscriptions",
            json={
                "podcast_id": "test-123",
                "podcast_name": "Test Podcast",
                "feed_url": "http://127.0.0.1:9000/admin"
            },
            headers=auth_headers
        )
        assert response.status_code == 400
        assert "Invalid feed URL" in response.json()["detail"]

    def test_requires_authentication(self, client):
        """Should require authentication."""
        response = client.post(
            "/api/subscriptions",
            json={
                "podcast_id": "test-123",
                "podcast_name": "Test Podcast",
                "feed_url": "https://example.com/feed"
            }
        )
        assert response.status_code in [401, 403]


class TestGetSubscription:
    """Tests for GET /api/subscriptions/{id} endpoint."""

    def test_validates_status_parameter(self, client, auth_headers):
        """Should reject invalid status parameter."""
        response = client.get(
            "/api/subscriptions/test-id?status=invalid_status",
            headers=auth_headers
        )
        assert response.status_code == 400
        assert "Invalid status" in response.json()["detail"]

    @pytest.mark.parametrize("status", list(VALID_EPISODE_STATUSES))
    def test_accepts_valid_status_parameters(self, client, auth_headers, status):
        """Should accept all valid status parameters."""
        # This will return 404 since subscription doesn't exist,
        # but it validates the status parameter is accepted
        with patch('app.routers.subscriptions.repository') as mock_repo:
            mock_repo.get_subscription = AsyncMock(return_value=None)
            response = client.get(
                f"/api/subscriptions/test-id?status={status}",
                headers=auth_headers
            )
            # 404 means status was valid, subscription just not found
            assert response.status_code == 404


class TestListSubscriptionEpisodes:
    """Tests for GET /api/subscriptions/{id}/episodes endpoint."""

    def test_validates_status_parameter(self, client, auth_headers):
        """Should reject invalid status parameter."""
        response = client.get(
            "/api/subscriptions/test-id/episodes?status=bogus",
            headers=auth_headers
        )
        assert response.status_code == 400
        assert "Invalid status" in response.json()["detail"]


class TestBatchProcessEpisodes:
    """Tests for POST /api/subscriptions/{id}/process-batch endpoint."""

    def test_rejects_empty_episode_list(self, client, auth_headers):
        """Should reject empty episode list."""
        with patch('app.routers.subscriptions.repository') as mock_repo:
            mock_repo.get_subscription = AsyncMock(return_value={
                'id': 'test-sub',
                'user_id': 'test-user-123',
                'podcast_name': 'Test'
            })
            response = client.post(
                "/api/subscriptions/test-sub/process-batch",
                json={"episode_ids": []},
                headers=auth_headers
            )
            assert response.status_code == 400
            assert "No episodes selected" in response.json()["detail"]

    def test_rejects_exceeding_batch_size(self, client, auth_headers):
        """Should reject batch exceeding MAX_BATCH_SIZE."""
        with patch('app.routers.subscriptions.repository') as mock_repo:
            mock_repo.get_subscription = AsyncMock(return_value={
                'id': 'test-sub',
                'user_id': 'test-user-123',
                'podcast_name': 'Test'
            })
            # Create list of MAX_BATCH_SIZE + 1 episode IDs
            episode_ids = list(range(1, MAX_BATCH_SIZE + 2))
            response = client.post(
                "/api/subscriptions/test-sub/process-batch",
                json={"episode_ids": episode_ids},
                headers=auth_headers
            )
            assert response.status_code == 400
            assert f"Maximum {MAX_BATCH_SIZE}" in response.json()["detail"]

    def test_accepts_max_batch_size(self, client, auth_headers):
        """Should accept exactly MAX_BATCH_SIZE episodes."""
        with patch('app.routers.subscriptions.repository') as mock_repo:
            mock_repo.get_subscription = AsyncMock(return_value={
                'id': 'test-sub',
                'user_id': 'test-user-123',
                'podcast_name': 'Test'
            })
            # Return no valid episodes to simplify test
            mock_repo.get_subscription_episodes_by_ids = AsyncMock(return_value=[])

            episode_ids = list(range(1, MAX_BATCH_SIZE + 1))
            response = client.post(
                "/api/subscriptions/test-sub/process-batch",
                json={"episode_ids": episode_ids},
                headers=auth_headers
            )
            # Will be 400 because no valid pending episodes, but not due to batch size
            assert "Maximum" not in response.json().get("detail", "")


class TestResetStuckEpisodes:
    """Tests for POST /api/subscriptions/{id}/reset-stuck endpoint."""

    def test_requires_authentication(self, client):
        """Should require authentication."""
        response = client.post("/api/subscriptions/test-sub/reset-stuck")
        assert response.status_code in [401, 403]

    def test_returns_404_for_nonexistent_subscription(self, client, auth_headers):
        """Should return 404 if subscription not found."""
        with patch('app.routers.subscriptions.repository') as mock_repo:
            mock_repo.get_subscription = AsyncMock(return_value=None)
            response = client.post(
                "/api/subscriptions/nonexistent-id/reset-stuck",
                headers=auth_headers
            )
            assert response.status_code == 404
            assert "not found" in response.json()["detail"].lower()

    def test_returns_zero_when_no_stuck_episodes(self, client, auth_headers):
        """Should return reset_count=0 when no episodes are stuck."""
        with patch('app.routers.subscriptions.repository') as mock_repo:
            mock_repo.get_subscription = AsyncMock(return_value={
                'id': 'test-sub',
                'user_id': 'test-user-123',
                'podcast_name': 'Test'
            })
            mock_repo.get_stuck_subscription_episodes = AsyncMock(return_value=[])

            response = client.post(
                "/api/subscriptions/test-sub/reset-stuck",
                headers=auth_headers
            )
            assert response.status_code == 200
            assert response.json()["reset_count"] == 0

    def test_resets_stuck_episodes_to_pending(self, client, auth_headers):
        """Should reset stuck episodes and return count."""
        with patch('app.routers.subscriptions.repository') as mock_repo:
            mock_repo.get_subscription = AsyncMock(return_value={
                'id': 'test-sub',
                'user_id': 'test-user-123',
                'podcast_name': 'Test'
            })
            mock_repo.get_stuck_subscription_episodes = AsyncMock(return_value=[
                {'id': 1, 'episode_title': 'Ep 1'},
                {'id': 2, 'episode_title': 'Ep 2'},
            ])
            mock_repo.update_subscription_episode_status = AsyncMock(return_value=2)

            response = client.post(
                "/api/subscriptions/test-sub/reset-stuck",
                headers=auth_headers
            )
            assert response.status_code == 200
            assert response.json()["reset_count"] == 2
            assert response.json()["episode_ids"] == [1, 2]

            # Verify status was updated to 'pending'
            mock_repo.update_subscription_episode_status.assert_called_once_with(
                [1, 2], 'pending'
            )

    def test_validates_subscription_ownership(self, client, auth_headers):
        """Should only allow resetting episodes for user's own subscription."""
        with patch('app.routers.subscriptions.repository') as mock_repo:
            # get_subscription returns None when user_id doesn't match
            mock_repo.get_subscription = AsyncMock(return_value=None)

            response = client.post(
                "/api/subscriptions/other-users-sub/reset-stuck",
                headers=auth_headers
            )
            assert response.status_code == 404


class TestConstants:
    """Tests for module constants."""

    def test_max_batch_size_is_19(self):
        """MAX_BATCH_SIZE should be 19 as documented."""
        assert MAX_BATCH_SIZE == 19

    def test_valid_statuses_complete(self):
        """VALID_EPISODE_STATUSES should contain all expected statuses."""
        expected = {'pending', 'processing', 'completed', 'skipped', 'failed'}
        assert VALID_EPISODE_STATUSES == expected
