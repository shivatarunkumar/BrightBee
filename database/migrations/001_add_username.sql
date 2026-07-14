-- Migration 001: add username column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS username VARCHAR(50) UNIQUE;

-- Back-fill existing rows with a derived username (email prefix)
UPDATE users SET username = LOWER(SPLIT_PART(email, '@', 1)) WHERE username IS NULL;

-- Make it NOT NULL now that all rows have a value
ALTER TABLE users ALTER COLUMN username SET NOT NULL;
