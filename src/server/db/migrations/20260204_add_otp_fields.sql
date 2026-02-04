-- Add OTP fields to users table
ALTER TABLE users ADD COLUMN otp_secret TEXT;
ALTER TABLE users ADD COLUMN otp_enabled INTEGER DEFAULT 0;
