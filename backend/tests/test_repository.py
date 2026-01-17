"""
Tests for repository functions.
"""
import pytest


class TestGetEpisodesForList:
    """Tests for get_episodes_for_list function."""

    def test_function_exists(self):
        """Verify the function is importable."""
        from app.db.repository import get_episodes_for_list
        assert callable(get_episodes_for_list)

    def test_function_is_async(self):
        """Function should be an async coroutine."""
        import asyncio
        from app.db.repository import get_episodes_for_list
        assert asyncio.iscoroutinefunction(get_episodes_for_list)

    def test_returns_only_list_columns(self):
        """
        The function should only query these columns:
        id, title, podcast_name, status, progress, created_at, duration_seconds

        This is verified by checking the SQL in the function definition.
        """
        import inspect
        from app.db.repository import get_episodes_for_list

        source = inspect.getsource(get_episodes_for_list)

        # Verify it selects specific columns, not SELECT *
        assert 'SELECT *' not in source
        assert 'id, title, podcast_name, status, progress, created_at, duration_seconds' in source


class TestGetStuckSubscriptionEpisodes:
    """Tests for get_stuck_subscription_episodes function."""

    def test_function_exists(self):
        """Verify the function is importable."""
        from app.db.repository import get_stuck_subscription_episodes
        assert callable(get_stuck_subscription_episodes)

    def test_function_is_async(self):
        """Function should be an async coroutine."""
        import asyncio
        from app.db.repository import get_stuck_subscription_episodes
        assert asyncio.iscoroutinefunction(get_stuck_subscription_episodes)

    def test_query_filters_processing_status(self):
        """Should only return episodes with status='processing'."""
        import inspect
        from app.db.repository import get_stuck_subscription_episodes

        source = inspect.getsource(get_stuck_subscription_episodes)

        # Verify it filters for processing status
        assert "status = 'processing'" in source

    def test_query_filters_null_episode_id(self):
        """Should only return episodes without a linked main episode."""
        import inspect
        from app.db.repository import get_stuck_subscription_episodes

        source = inspect.getsource(get_stuck_subscription_episodes)

        # Verify it checks for NULL episode_id
        assert 'episode_id IS NULL' in source

    def test_query_filters_by_subscription_id(self):
        """Should filter by subscription_id parameter."""
        import inspect
        from app.db.repository import get_stuck_subscription_episodes

        source = inspect.getsource(get_stuck_subscription_episodes)

        # Verify it uses subscription_id parameter
        assert 'subscription_id = ?' in source


class TestEpisodeListQueryPerformance:
    """Tests to verify episode list query is optimized."""

    def test_composite_index_exists_in_schema(self):
        """Verify the composite index is defined in database schema."""
        import inspect
        from app.db.database import init_database

        source = inspect.getsource(init_database)

        # Check for the composite index
        assert 'idx_episodes_user_status_created' in source
        assert 'user_id, status, created_at' in source
