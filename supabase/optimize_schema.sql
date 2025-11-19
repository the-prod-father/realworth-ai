-- Additional optimizations for RealWorth.ai database
-- Run this in Supabase SQL Editor after running schema.sql

-- Add index on image_url for faster lookups (if storing URLs)
CREATE INDEX IF NOT EXISTS idx_appraisals_image_url 
ON public.appraisals(image_url) 
WHERE image_url IS NOT NULL;

-- Add composite index for common query patterns
CREATE INDEX IF NOT EXISTS idx_appraisals_user_category 
ON public.appraisals(user_id, category);

-- Add index on price range for value-based queries
CREATE INDEX IF NOT EXISTS idx_appraisals_price_range 
ON public.appraisals(user_id, price_low, price_high);

-- Function to clean up storage when appraisal is deleted
-- This requires the storage extension to be enabled
CREATE OR REPLACE FUNCTION cleanup_appraisal_image()
RETURNS TRIGGER AS $$
DECLARE
  image_path TEXT;
BEGIN
  -- Extract image path from image_url
  -- Format: https://{project}.supabase.co/storage/v1/object/public/appraisal-images/{path}
  IF OLD.image_url IS NOT NULL THEN
    -- Extract the path portion from the full URL
    image_path := substring(OLD.image_url from 'appraisal-images/(.+)$');
    
    IF image_path IS NOT NULL THEN
      -- Delete from storage (this will be handled by storage policies)
      -- Note: Actual deletion should be done via Supabase Storage API
      -- This function just logs for now - implement actual deletion in application code
      RAISE NOTICE 'Image to delete: %', image_path;
    END IF;
  END IF;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Trigger to log image cleanup (actual deletion handled in application)
CREATE TRIGGER cleanup_image_on_delete
  AFTER DELETE ON public.appraisals
  FOR EACH ROW
  EXECUTE FUNCTION cleanup_appraisal_image();

-- Add constraint to ensure price_low <= price_high
ALTER TABLE public.appraisals
DROP CONSTRAINT IF EXISTS check_price_range;

ALTER TABLE public.appraisals
ADD CONSTRAINT check_price_range 
CHECK (price_low <= price_high);

-- Add constraint to ensure price values are non-negative
ALTER TABLE public.appraisals
DROP CONSTRAINT IF EXISTS check_price_non_negative;

ALTER TABLE public.appraisals
ADD CONSTRAINT check_price_non_negative 
CHECK (price_low >= 0 AND price_high >= 0);

-- Optimize JSONB references column with GIN index for faster queries
CREATE INDEX IF NOT EXISTS idx_appraisals_references 
ON public.appraisals USING GIN (references)
WHERE references IS NOT NULL;

-- Add comment to document the optimization
COMMENT ON INDEX idx_appraisals_user_category IS 'Composite index for filtering appraisals by user and category';
COMMENT ON INDEX idx_appraisals_price_range IS 'Index for value-based queries and sorting';
COMMENT ON INDEX idx_appraisals_references IS 'GIN index for JSONB references column for faster JSON queries';

