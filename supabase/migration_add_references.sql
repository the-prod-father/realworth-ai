-- Migration: Add references column to appraisals table
-- Execute this in your Supabase SQL Editor

-- Add references column to store array of reference objects
ALTER TABLE public.appraisals
ADD COLUMN IF NOT EXISTS references JSONB;

-- Add a comment to document the column
COMMENT ON COLUMN public.appraisals.references IS 'Array of reference sources with title and URL fields that support the price valuation';
