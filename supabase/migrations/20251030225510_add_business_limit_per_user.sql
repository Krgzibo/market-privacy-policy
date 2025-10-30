/*
  # Add Business Limit Per User

  1. Changes
    - Add a check constraint function to limit each user to maximum 3 businesses
    - Create a trigger to enforce this limit on INSERT operations
    - Users can only own up to 3 active businesses

  2. Security
    - Prevents users from creating more than 3 businesses
    - Check runs before insert to validate business count
*/

-- Create function to check business count per user
CREATE OR REPLACE FUNCTION check_business_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  business_count INTEGER;
BEGIN
  -- Count existing businesses for this owner
  SELECT COUNT(*) INTO business_count
  FROM businesses
  WHERE owner_id = NEW.owner_id;
  
  -- If user already has 3 businesses, prevent insert
  IF business_count >= 3 THEN
    RAISE EXCEPTION 'User cannot own more than 3 businesses';
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger to enforce business limit
DROP TRIGGER IF EXISTS trigger_check_business_limit ON businesses;

CREATE TRIGGER trigger_check_business_limit
  BEFORE INSERT ON businesses
  FOR EACH ROW
  EXECUTE FUNCTION check_business_limit();