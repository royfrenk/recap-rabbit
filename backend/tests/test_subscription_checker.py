"""
Tests for subscription_checker service.
"""
import pytest
from app.services.subscription_checker import validate_feed_url, fetch_rss_feed


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
