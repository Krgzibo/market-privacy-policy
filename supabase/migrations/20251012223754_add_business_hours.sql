/*
  # Add Business Hours to Businesses Table

  1. Changes
    - Add `opening_time` column (time without timezone)
    - Add `closing_time` column (time without timezone)
    - Both columns are optional to support 24/7 businesses
  
  2. Notes
    - Uses TIME type for storing hours (e.g., "09:00", "18:30")
    - NULL values indicate business hours not set yet
    - Can be used to show "Open Now" status on customer app
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'businesses' AND column_name = 'opening_time'
  ) THEN
    ALTER TABLE businesses ADD COLUMN opening_time TIME;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'businesses' AND column_name = 'closing_time'
  ) THEN
    ALTER TABLE businesses ADD COLUMN closing_time TIME;
  END IF;
END $$;