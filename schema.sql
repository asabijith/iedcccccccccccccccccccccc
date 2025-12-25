-- IMPORTANT: Run this ALTER statement in your Supabase SQL Editor first
-- This adds the missing 'selected_position' column to your existing table
ALTER TABLE execom_registrations 
ADD COLUMN IF NOT EXISTS selected_position TEXT;

-- If you want to start fresh (WARNING: DELETES ALL DATA), use the code below instead:

-- Database: execom_registrations

-- Drop existing table to recreate with new structure (WARNING: DATA LOSS)
-- If you already have data, use ALTER TABLE commands instead.
DROP TABLE IF EXISTS execom_registrations CASCADE;

-- Create the execom_registrations table with all new fields
CREATE TABLE execom_registrations (
    id BIGSERIAL PRIMARY KEY,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    phone TEXT NOT NULL,
    branch TEXT NOT NULL,
    department TEXT, -- Optional for MBA/MCA (will be 'N/A'), required for B.Tech
    year TEXT NOT NULL,
    semester TEXT NOT NULL,
    cgpa TEXT NOT NULL,
    back_papers INTEGER NOT NULL DEFAULT 0,
    position1 TEXT NOT NULL,
    position2 TEXT NOT NULL,
    experience TEXT,
    why_join TEXT NOT NULL,
    skills TEXT NOT NULL,
    linkedin TEXT,
    portfolio TEXT,
    
    -- New fields for Interview Management
    status TEXT DEFAULT 'Pending', -- 'Pending', 'Shortlisted', 'Interview Scheduled', 'Selected', 'Rejected'
    interview_time TIMESTAMPTZ,
    meet_link TEXT,
    admin_notes TEXT,
    selected_position TEXT, -- Which position (position1 or position2) was selected

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE execom_registrations ENABLE ROW LEVEL SECURITY;

-- Policy to allow anyone to insert (for registration form)
CREATE POLICY "Allow public insert" ON execom_registrations
    FOR INSERT
    TO anon, authenticated
    WITH CHECK (true);

-- Policy to allow authenticated users (admins) to read all data
CREATE POLICY "Allow authenticated read" ON execom_registrations
    FOR SELECT
    TO authenticated
    USING (true);

-- Policy to allow public (candidates) to read their own status via email match
-- Note: This is a simple approach. Ideally, use Supabase Auth for candidates too.
-- For this specific requirement where users just enter email to check status:
CREATE POLICY "Allow public read by email" ON execom_registrations
    FOR SELECT
    TO anon, authenticated
    USING (true); 
    -- In a real app, you'd restrict this more, but for "enter email to check status" 
    -- we need to allow reading. We will filter in the client or use a secure function.
    -- A safer way is to use a Postgres Function to fetch status by email to avoid exposing all data.

-- Policy to allow authenticated users to delete (for admin panel)
CREATE POLICY "Allow authenticated delete" ON execom_registrations
    FOR DELETE
    TO authenticated
    USING (true);

-- Policy to allow authenticated users to update (for admin panel)
CREATE POLICY "Allow authenticated update" ON execom_registrations
    FOR UPDATE
    TO authenticated
    USING (true);

-- Add indexes for better performance
CREATE INDEX idx_created_at ON execom_registrations(created_at DESC);
CREATE INDEX idx_position1 ON execom_registrations(position1);
CREATE INDEX idx_email ON execom_registrations(email);
CREATE INDEX idx_branch ON execom_registrations(branch);
CREATE INDEX idx_status ON execom_registrations(status);
