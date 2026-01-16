"""
SQLite database connection and initialization.
"""
import os
import aiosqlite
from pathlib import Path
from contextlib import asynccontextmanager

# Allow database path to be configured via environment variable
DATABASE_PATH = Path(os.getenv("DATABASE_PATH", Path(__file__).parent.parent.parent / "data" / "podcatchup.db"))


async def init_database():
    """Initialize the SQLite database with required tables."""
    print(f"Database path: {DATABASE_PATH}", flush=True)
    print(f"Data directory exists: {DATABASE_PATH.parent.exists()}", flush=True)
    print(f"Database file exists: {DATABASE_PATH.exists()}", flush=True)
    if DATABASE_PATH.exists():
        print(f"Database file size: {DATABASE_PATH.stat().st_size} bytes", flush=True)

    # List contents of /app/data if it exists
    if DATABASE_PATH.parent.exists():
        print(f"Contents of {DATABASE_PATH.parent}: {list(DATABASE_PATH.parent.iterdir())}", flush=True)

    print(f"Creating directory: {DATABASE_PATH.parent}", flush=True)
    DATABASE_PATH.parent.mkdir(parents=True, exist_ok=True)
    print(f"Directory created/exists", flush=True)

    print(f"Connecting to database...", flush=True)
    async with aiosqlite.connect(DATABASE_PATH) as db:
        print(f"Connected to database", flush=True)
        await db.execute("""
            CREATE TABLE IF NOT EXISTS episodes (
                id TEXT PRIMARY KEY,
                title TEXT,
                podcast_name TEXT,
                description TEXT,
                status TEXT NOT NULL DEFAULT 'pending',
                progress INTEGER DEFAULT 0,
                status_message TEXT,
                transcript TEXT,
                cleaned_transcript TEXT,
                summary TEXT,
                error TEXT,
                duration_seconds REAL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                audio_url TEXT,
                audio_path TEXT,
                checkpoint_stage TEXT
            )
        """)

        # Migration: add description column if it doesn't exist
        try:
            await db.execute("ALTER TABLE episodes ADD COLUMN description TEXT")
        except Exception:
            pass  # Column already exists

        # Migration: add language_code column if it doesn't exist
        try:
            await db.execute("ALTER TABLE episodes ADD COLUMN language_code TEXT")
        except Exception:
            pass  # Column already exists

        # Migration: add is_public flag for SEO public summaries
        try:
            await db.execute("ALTER TABLE episodes ADD COLUMN is_public INTEGER DEFAULT 0")
        except Exception:
            pass  # Column already exists

        # Migration: add slug for URL-friendly public URLs
        try:
            await db.execute("ALTER TABLE episodes ADD COLUMN slug TEXT")
        except Exception:
            pass  # Column already exists

        # Create index for status filtering
        await db.execute("""
            CREATE INDEX IF NOT EXISTS idx_episodes_status ON episodes(status)
        """)

        # Create index for sorting by created_at
        await db.execute("""
            CREATE INDEX IF NOT EXISTS idx_episodes_created ON episodes(created_at DESC)
        """)

        # Users table
        await db.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                email TEXT UNIQUE NOT NULL,
                password_hash TEXT,
                name TEXT,
                google_id TEXT UNIQUE,
                role TEXT DEFAULT 'user',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                last_login TIMESTAMP
            )
        """)

        # Index for email lookup
        await db.execute("""
            CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)
        """)

        # Migration: add user_id to episodes
        try:
            await db.execute("ALTER TABLE episodes ADD COLUMN user_id TEXT REFERENCES users(id)")
        except Exception:
            pass  # Column already exists

        # Index for user's episodes
        await db.execute("""
            CREATE INDEX IF NOT EXISTS idx_episodes_user ON episodes(user_id)
        """)

        # Usage tracking table
        await db.execute("""
            CREATE TABLE IF NOT EXISTS usage_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                service TEXT NOT NULL,
                operation TEXT NOT NULL,
                episode_id TEXT,
                input_units REAL DEFAULT 0,
                output_units REAL DEFAULT 0,
                cost_usd REAL DEFAULT 0,
                metadata TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (episode_id) REFERENCES episodes(id)
            )
        """)

        # Index for usage aggregation
        await db.execute("""
            CREATE INDEX IF NOT EXISTS idx_usage_service ON usage_logs(service, created_at)
        """)

        # Search logs table for tracking popular searches
        await db.execute("""
            CREATE TABLE IF NOT EXISTS search_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                query TEXT NOT NULL,
                user_id TEXT,
                results_count INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id)
            )
        """)

        # Index for popular searches aggregation
        await db.execute("""
            CREATE INDEX IF NOT EXISTS idx_search_query ON search_logs(query, created_at)
        """)

        # Index for public episodes (SEO)
        await db.execute("""
            CREATE INDEX IF NOT EXISTS idx_episodes_public ON episodes(is_public, status)
        """)

        # Index for slug lookup (unique constraint enforced via index)
        await db.execute("""
            CREATE UNIQUE INDEX IF NOT EXISTS idx_episodes_slug ON episodes(slug) WHERE slug IS NOT NULL
        """)

        await db.commit()

        # Diagnostic: count existing records
        cursor = await db.execute("SELECT COUNT(*) FROM episodes")
        episode_count = (await cursor.fetchone())[0]
        print(f"Episodes in database after init: {episode_count}", flush=True)

        cursor = await db.execute("SELECT COUNT(*) FROM users")
        user_count = (await cursor.fetchone())[0]
        print(f"Users in database after init: {user_count}", flush=True)


@asynccontextmanager
async def get_db():
    """Get database connection as async context manager."""
    async with aiosqlite.connect(DATABASE_PATH) as db:
        db.row_factory = aiosqlite.Row
        yield db
