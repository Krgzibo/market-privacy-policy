/*
  # Update Payment Methods - Remove Online Option

  1. Changes
    - Update default payment methods to only include 'cash' and 'card'
    - Update existing businesses that have 'online' to remove it
  
  2. Notes
    - Online payment option is being removed from the system
    - Only cash and card payment methods will be available
*/

UPDATE businesses 
SET payment_methods = ARRAY['cash', 'card']
WHERE 'online' = ANY(payment_methods);

ALTER TABLE businesses 
ALTER COLUMN payment_methods SET DEFAULT ARRAY['cash', 'card'];