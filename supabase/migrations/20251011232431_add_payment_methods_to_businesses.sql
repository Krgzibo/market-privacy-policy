/*
  # Add Payment Methods to Businesses

  1. Changes
    - Add `payment_methods` column to `businesses` table
      - Array of text storing payment methods (cash, card, online)
      - Default to accepting all methods
  
  2. Notes
    - Allows businesses to specify which payment methods they accept
    - Common payment methods: 'cash' (nakit), 'card' (kart), 'online' (online)
*/

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'businesses' AND column_name = 'payment_methods'
  ) THEN
    ALTER TABLE businesses 
    ADD COLUMN payment_methods text[] DEFAULT ARRAY['cash', 'card', 'online'];
  END IF;
END $$;
