/*
  # Add Pickup Time to Orders

  1. Changes
    - Add `pickup_time` column to `orders` table
      - Type: timestamptz (timestamp with timezone)
      - Nullable: allows orders without specified pickup time
      - Description: When the customer wants to pick up their order
    
  2. Notes
    - Existing orders will have NULL pickup_time (backward compatible)
    - Customers can specify future pickup time when placing orders
    - Business owners can see when orders need to be ready
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'pickup_time'
  ) THEN
    ALTER TABLE orders ADD COLUMN pickup_time timestamptz;
  END IF;
END $$;