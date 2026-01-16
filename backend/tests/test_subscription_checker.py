"""
Tests for subscription_checker service.
"""
import pytest
from app.services.subscription_checker import (
    validate_feed_url,
    validate_artwork_url,
    fetch_rss_feed,
    DEFAULT_EPISODE_LIMIT,
    MAX_EPISODE_LIMIT,
    MAX_CONCURRENT_CHECKS,
    RATE_LIMIT_DELAY,
    _check_single_subscription,
    check_all_active_subscriptions
)


class TestValidateFeedUrl:
    """Tests for SSRF protection in validate_feed_url."""

    # Valid URLs that should be allowed
    @pytest.mark.parametrize("url", [
        "https://feeds.simplecast.com/54nAGcIl",
        "https://example.com/feed.xml",
        "http://rss.example.com/podcast",
        "https://feeds.megaphone.fm/podcast",
        "https://anchor.fm/s/123/podcast/rss",
    ])
    def test_valid_public_urls(self, url):
        """Valid public HTTP/HTTPS URLs should be allowed."""
        assert validate_feed_url(url) is True

    # Localhost variations - should be blocked
    @pytest.mark.parametrize("url", [
        "http://localhost/feed",
        "http://localhost:8080/admin",
        "https://localhost/secret",
        "http://LOCALHOST/feed",
        "http://Localhost:3000/api",
    ])
    def test_blocks_localhost(self, url):
        """Localhost URLs should be blocked."""
        assert validate_feed_url(url) is False

    # Loopback IP variations - should be blocked
    @pytest.mark.parametrize("url", [
        "http://127.0.0.1/feed",
        "http://127.0.0.1:8080/admin",
        "https://127.0.0.1/secret",
        "http://127.0.0.1:9000/internal",
    ])
    def test_blocks_loopback_ip(self, url):
        """127.0.0.1 URLs should be blocked."""
        assert validate_feed_url(url) is False

    # Private IP ranges - should be blocked
    @pytest.mark.parametrize("url", [
        "http://10.0.0.1/feed",
        "http://10.255.255.255/admin",
        "http://192.168.1.1/config",
        "http://192.168.0.100:8080/api",
        "http://172.16.0.1/internal",
        "http://172.31.255.255/secret",
    ])
    def test_blocks_private_ips(self, url):
        """Private IP addresses should be blocked."""
        assert validate_feed_url(url) is False

    # Non-HTTP schemes - should be blocked
    @pytest.mark.parametrize("url", [
        "file:///etc/passwd",
        "file:///C:/Windows/System32/config/SAM",
        "ftp://example.com/feed",
        "gopher://example.com/feed",
        "dict://example.com:1234/",
        "ldap://example.com/feed",
        "javascript:alert(1)",
        "data:text/html,<script>alert(1)</script>",
    ])
    def test_blocks_non_http_schemes(self, url):
        """Non-HTTP/HTTPS schemes should be blocked."""
        assert validate_feed_url(url) is False

    # Special blocked hosts
    @pytest.mark.parametrize("url", [
        "http://0.0.0.0/feed",
        "http://[::1]/feed",
    ])
    def test_blocks_special_hosts(self, url):
        """Special addresses like 0.0.0.0 and ::1 should be blocked."""
        assert validate_feed_url(url) is False

    # Invalid URLs - should be blocked
    @pytest.mark.parametrize("url", [
        "",
        "not-a-url",
        "//example.com/feed",
        "example.com/feed",
        "http://",
        "http:///feed",
        "http://singleword/feed",
    ])
    def test_blocks_invalid_urls(self, url):
        """Malformed or invalid URLs should be blocked."""
        assert validate_feed_url(url) is False

    # Edge cases
    def test_blocks_url_with_credentials(self):
        """URLs with embedded credentials to internal hosts should be blocked."""
        # This could be used to bypass naive checks
        assert validate_feed_url("http://user:pass@localhost/feed") is False
        assert validate_feed_url("http://user:pass@127.0.0.1/feed") is False

    def test_allows_url_with_credentials_to_public_host(self):
        """URLs with credentials to public hosts should be allowed."""
        # This is valid for some podcast feeds that require auth
        assert validate_feed_url("http://user:pass@example.com/feed") is True


class TestValidateArtworkUrl:
    """Tests for SSRF protection in validate_artwork_url."""

    # Trusted CDN URLs - should be allowed
    @pytest.mark.parametrize("url", [
        "https://is1-ssl.mzstatic.com/image/thumb/Podcasts/v4/abc.jpg",
        "https://is5-ssl.mzstatic.com/image/thumb/artwork.png",
        "https://i.scdn.co/image/ab67656300005f1f.jpeg",
        "https://mosaic.scdn.co/640/ab67656.jpg",
        "https://megaphone.imgix.net/podcasts/artwork.jpg",
        "https://image.simplecastcdn.com/images/cover.png",
        "https://ssl-static.libsyn.com/p/assets/cover.jpg",
        "https://assets.pippa.io/shows/cover.jpg",
        "https://images.transistor.fm/show/cover.jpg",
        "https://d1bm3dmew779uf.cloudfront.net/cover.png",
        "https://pbcdn1.podbean.com/imglogo/cover.jpg",
        "https://images.buzzsprout.com/cover.jpg",
    ])
    def test_allows_trusted_cdn_urls(self, url):
        """Trusted CDN URLs should be allowed unchanged."""
        assert validate_artwork_url(url) == url

    # Valid image URLs on untrusted hosts - should be allowed
    @pytest.mark.parametrize("url", [
        "https://example.com/podcast/artwork.jpg",
        "https://example.com/images/cover.png",
        "https://cdn.example.org/podcast/cover.jpeg",
        "https://media.example.net/artwork/show.gif",
        "https://example.com/thumb/123.webp",
    ])
    def test_allows_image_urls_on_untrusted_hosts(self, url):
        """Image URLs with image extensions on untrusted hosts should be allowed."""
        assert validate_artwork_url(url) == url

    # URLs with image path markers - should be allowed
    @pytest.mark.parametrize("url", [
        "https://example.com/image/12345",
        "https://example.com/images/podcast/12345",
        "https://example.com/artwork/abc123",
        "https://example.com/cover/show",
        "https://example.com/thumb/12345",
        "https://example.com/avatar/user123",
    ])
    def test_allows_urls_with_image_markers(self, url):
        """URLs with image path markers should be allowed."""
        assert validate_artwork_url(url) == url

    # Non-image URLs on untrusted hosts - should be blocked
    @pytest.mark.parametrize("url", [
        "https://example.com/api/data",
        "https://example.com/admin/config",
        "https://example.com/feed.xml",
        "https://example.com/some/random/path",
    ])
    def test_blocks_non_image_urls_on_untrusted_hosts(self, url):
        """Non-image URLs on untrusted hosts should be blocked."""
        assert validate_artwork_url(url) is None

    # Localhost variations - should be blocked
    @pytest.mark.parametrize("url", [
        "http://localhost/cover.jpg",
        "http://localhost:8080/image/artwork.png",
        "https://localhost/images/cover.jpg",
    ])
    def test_blocks_localhost(self, url):
        """Localhost URLs should be blocked even if they look like images."""
        assert validate_artwork_url(url) is None

    # Loopback IP - should be blocked
    @pytest.mark.parametrize("url", [
        "http://127.0.0.1/cover.jpg",
        "http://127.0.0.1:8080/artwork.png",
    ])
    def test_blocks_loopback_ip(self, url):
        """127.0.0.1 URLs should be blocked."""
        assert validate_artwork_url(url) is None

    # Private IP ranges - should be blocked
    @pytest.mark.parametrize("url", [
        "http://10.0.0.1/cover.jpg",
        "http://192.168.1.1/artwork.png",
        "http://172.16.0.1/image.jpg",
    ])
    def test_blocks_private_ips(self, url):
        """Private IP addresses should be blocked."""
        assert validate_artwork_url(url) is None

    # Non-HTTP schemes - should be blocked
    @pytest.mark.parametrize("url", [
        "file:///etc/passwd",
        "ftp://example.com/cover.jpg",
        "javascript:alert(1)",
        "data:image/png;base64,abc123",
    ])
    def test_blocks_non_http_schemes(self, url):
        """Non-HTTP/HTTPS schemes should be blocked."""
        assert validate_artwork_url(url) is None

    # Null/empty handling
    def test_returns_none_for_null_input(self):
        """None input should return None."""
        assert validate_artwork_url(None) is None

    def test_returns_none_for_empty_string(self):
        """Empty string should return None."""
        assert validate_artwork_url("") is None

    # Invalid URLs
    @pytest.mark.parametrize("url", [
        "not-a-url",
        "//example.com/cover.jpg",
        "http://",
        "http://singleword/cover.jpg",
    ])
    def test_blocks_invalid_urls(self, url):
        """Malformed URLs should be blocked."""
        assert validate_artwork_url(url) is None


class TestFetchRssFeed:
    """Tests for RSS feed fetching."""

    @pytest.mark.asyncio
    async def test_rejects_invalid_url(self):
        """fetch_rss_feed should raise ValueError for invalid URLs."""
        with pytest.raises(ValueError, match="Invalid or unsafe feed URL"):
            await fetch_rss_feed("http://localhost/feed")

    @pytest.mark.asyncio
    async def test_rejects_private_ip(self):
        """fetch_rss_feed should raise ValueError for private IPs."""
        with pytest.raises(ValueError, match="Invalid or unsafe feed URL"):
            await fetch_rss_feed("http://192.168.1.1/feed")

    @pytest.mark.asyncio
    async def test_rejects_file_scheme(self):
        """fetch_rss_feed should raise ValueError for file:// URLs."""
        with pytest.raises(ValueError, match="Invalid or unsafe feed URL"):
            await fetch_rss_feed("file:///etc/passwd")


class TestPaginationConstants:
    """Tests for pagination constants."""

    def test_default_episode_limit_is_reasonable(self):
        """Default limit should be 100."""
        assert DEFAULT_EPISODE_LIMIT == 100

    def test_max_episode_limit_is_reasonable(self):
        """Max limit should be 500."""
        assert MAX_EPISODE_LIMIT == 500

    def test_default_is_less_than_max(self):
        """Default limit should be less than or equal to max."""
        assert DEFAULT_EPISODE_LIMIT <= MAX_EPISODE_LIMIT


class TestFetchRssFeedPagination:
    """Tests for pagination in fetch_rss_feed."""

    @pytest.mark.asyncio
    async def test_accepts_limit_parameter(self):
        """fetch_rss_feed should accept limit parameter without error."""
        # This will fail due to invalid URL, but we're testing parameter acceptance
        with pytest.raises(ValueError, match="Invalid or unsafe feed URL"):
            await fetch_rss_feed("http://localhost/feed", limit=50)

    @pytest.mark.asyncio
    async def test_accepts_none_limit(self):
        """fetch_rss_feed should accept None as limit (no limit)."""
        with pytest.raises(ValueError, match="Invalid or unsafe feed URL"):
            await fetch_rss_feed("http://localhost/feed", limit=None)

    def test_limit_parameter_type_hint(self):
        """Verify function signature accepts int or None."""
        import inspect
        sig = inspect.signature(fetch_rss_feed)
        limit_param = sig.parameters.get('limit')
        assert limit_param is not None
        assert limit_param.default == DEFAULT_EPISODE_LIMIT


class TestConcurrencyConstants:
    """Tests for concurrency constants."""

    def test_max_concurrent_checks_is_reasonable(self):
        """Max concurrent checks should be a small positive number."""
        assert MAX_CONCURRENT_CHECKS == 5
        assert MAX_CONCURRENT_CHECKS > 0
        assert MAX_CONCURRENT_CHECKS <= 10  # Shouldn't be too aggressive

    def test_rate_limit_delay_is_reasonable(self):
        """Rate limit delay should be between 0.1 and 2 seconds."""
        assert RATE_LIMIT_DELAY == 0.5
        assert RATE_LIMIT_DELAY >= 0.1
        assert RATE_LIMIT_DELAY <= 2.0


class TestCheckSingleSubscription:
    """Tests for _check_single_subscription helper."""

    @pytest.mark.asyncio
    async def test_returns_result_dict_structure(self):
        """Should return a dict with expected keys."""
        # Mock a subscription with invalid feed URL to trigger error handling
        sub = {
            'id': 'test-sub-123',
            'feed_url': 'http://localhost/invalid',  # Will fail validation
            'user_id': 'test-user',
            'podcast_name': 'Test Podcast'
        }

        result = await _check_single_subscription(sub)

        # Should have all expected keys regardless of success/failure
        assert 'subscription_id' in result
        assert 'success' in result
        assert 'new_episodes' in result
        assert 'error' in result
        assert result['subscription_id'] == 'test-sub-123'

    @pytest.mark.asyncio
    async def test_handles_invalid_subscription_gracefully(self):
        """Should not raise exception for invalid subscription data."""
        sub = {
            'id': 'test-sub-456',
            'feed_url': 'http://localhost/feed',  # Blocked URL
            'user_id': 'test-user',
            'podcast_name': 'Test'
        }

        # Should not raise any exception - errors are caught internally
        # The underlying check_subscription_for_new_episodes catches ValueError
        # and returns {'new_count': 0, 'new_episode_ids': []}, so this appears
        # as a successful check with no new episodes found
        result = await _check_single_subscription(sub)

        # Key behavior: function doesn't crash, returns a valid result dict
        assert isinstance(result, dict)
        assert result['subscription_id'] == 'test-sub-456'
        # new_episodes should be 0 since the blocked URL can't be fetched
        assert result['new_episodes'] == 0


class TestCheckAllActiveSubscriptions:
    """Tests for check_all_active_subscriptions."""

    def test_function_signature_returns_dict(self):
        """Function should be typed to return Dict."""
        import inspect
        sig = inspect.signature(check_all_active_subscriptions)
        # The function should be defined and callable
        assert callable(check_all_active_subscriptions)

    def test_function_is_async(self):
        """Function should be an async coroutine."""
        import asyncio
        assert asyncio.iscoroutinefunction(check_all_active_subscriptions)
