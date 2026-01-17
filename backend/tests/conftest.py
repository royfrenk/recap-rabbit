"""
Pytest configuration and fixtures for backend tests.
"""
import os

# Set required environment variables before importing app modules
# This must happen at module level, before any fixtures run
os.environ.setdefault("JWT_SECRET", "test-secret-key-for-testing-only")
