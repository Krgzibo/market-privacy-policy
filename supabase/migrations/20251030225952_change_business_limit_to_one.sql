/*
  # Change Business Limit to One Per User

  1. Changes
    - Update business limit from 3 to 1
    - Each user can now only own/manage 1 business
    - Simpler business ownership model

  2. Security
    - Prevents users from creating more than 1 business
    - One-to-one relationship between user and business
*/

-- Update the function to allow only 1 business per user
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
  
  -- If user already has 1 business, prevent insert
  IF business_count >= 1 THEN
    RAISE EXCEPTION 'User can only own 1 business';
  END IF;
  
  RETURN NEW;
END;
$$;