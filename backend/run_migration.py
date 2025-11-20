"""
Migration script to create password_shares table
Run this script to fix the password sharing bug
"""
import asyncio
from sqlalchemy import text
from app.database import engine


async def run_migration():
    """Create password_shares table and migrate existing data"""
    async with engine.begin() as conn:
        try:
            # Create password_shares table
            await conn.execute(text("""
                CREATE TABLE IF NOT EXISTS password_shares (
                    share_id INT AUTO_INCREMENT PRIMARY KEY,
                    group_name VARCHAR(500) NOT NULL,
                    user_id INT NOT NULL,
                    password_id INT NOT NULL,
                    INDEX idx_group_name (group_name),
                    INDEX idx_user_id (user_id),
                    INDEX idx_password_id (password_id),
                    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
                    FOREIGN KEY (password_id) REFERENCES passwords(password_id) ON DELETE CASCADE,
                    UNIQUE KEY unique_share (group_name, user_id, password_id)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
            """))
            print("✅ password_shares table created")
            
            # Migrate existing data from group_members.password_id to password_shares
            result = await conn.execute(text("""
                INSERT INTO password_shares (group_name, user_id, password_id)
                SELECT group_name, user_id, password_id
                FROM group_members
                WHERE password_id IS NOT NULL
                ON DUPLICATE KEY UPDATE password_id = password_id
            """))
            rows_affected = result.rowcount
            print(f"✅ Migrated {rows_affected} existing password shares")
            
            print("✅ Migration completed successfully!")
            
        except Exception as e:
            print(f"❌ Migration failed: {e}")
            raise


if __name__ == "__main__":
    print("Running migration to create password_shares table...")
    asyncio.run(run_migration())

