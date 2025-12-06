-- Add soft delete fields to users table
-- This migration adds support for account deletion with a 30-day grace period

-- Add deleted_at column (timestamp when account was marked for deletion)
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP NULL;

-- Add status column (ACTIVE or DELETED)
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'ACTIVE';

-- Add hard_delete_scheduled_at column (timestamp when account will be permanently deleted)
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS hard_delete_scheduled_at TIMESTAMP NULL;

-- Update existing users to have ACTIVE status
UPDATE users SET status = 'ACTIVE' WHERE status IS NULL;

-- Create index on status for faster queries
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);

-- Create index on deleted_at for faster queries
CREATE INDEX IF NOT EXISTS idx_users_deleted_at ON users(deleted_at);

-- Create index on hard_delete_scheduled_at for cleanup jobs
CREATE INDEX IF NOT EXISTS idx_users_hard_delete_scheduled_at ON users(hard_delete_scheduled_at);

