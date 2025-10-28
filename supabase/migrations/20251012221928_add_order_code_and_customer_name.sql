/*
  # Sipariş Kodu ve Müşteri Adı Ekleme

  1. Değişiklikler
    - orders tablosuna 'order_code' kolonu eklendi (örn: #A001, #A002)
    - orders tablosuna 'customer_name' kolonu eklendi
    - order_code için otomatik kod oluşturma fonksiyonu eklendi
    - order_code için unique constraint eklendi
  
  2. Güvenlik
    - Mevcut RLS politikaları korunuyor
*/

-- Add customer_name column to orders
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'customer_name'
  ) THEN
    ALTER TABLE orders ADD COLUMN customer_name text NOT NULL DEFAULT '';
  END IF;
END $$;

-- Add order_code column to orders
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'order_code'
  ) THEN
    ALTER TABLE orders ADD COLUMN order_code text;
  END IF;
END $$;

-- Create function to generate order code
CREATE OR REPLACE FUNCTION generate_order_code()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  new_code text;
  code_exists boolean;
  letter char;
  number int;
BEGIN
  LOOP
    -- Generate random letter A-Z
    letter := chr(65 + floor(random() * 26)::int);
    
    -- Generate random number 001-999
    number := floor(random() * 999 + 1)::int;
    
    -- Combine to create code like #A001
    new_code := '#' || letter || lpad(number::text, 3, '0');
    
    -- Check if code exists
    SELECT EXISTS(SELECT 1 FROM orders WHERE order_code = new_code) INTO code_exists;
    
    -- If code doesn't exist, return it
    IF NOT code_exists THEN
      RETURN new_code;
    END IF;
  END LOOP;
END;
$$;

-- Create trigger function to set order code before insert
CREATE OR REPLACE FUNCTION set_order_code()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.order_code IS NULL THEN
    NEW.order_code := generate_order_code();
  END IF;
  RETURN NEW;
END;
$$;

-- Drop trigger if exists and create new one
DROP TRIGGER IF EXISTS trigger_set_order_code ON orders;
CREATE TRIGGER trigger_set_order_code
  BEFORE INSERT ON orders
  FOR EACH ROW
  EXECUTE FUNCTION set_order_code();

-- Add unique constraint to order_code
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_order_code_key;
ALTER TABLE orders ADD CONSTRAINT orders_order_code_key UNIQUE (order_code);

-- Update existing orders with order codes and empty customer names
DO $$
DECLARE
  order_record RECORD;
BEGIN
  FOR order_record IN SELECT id FROM orders WHERE order_code IS NULL LOOP
    UPDATE orders 
    SET order_code = generate_order_code()
    WHERE id = order_record.id;
  END LOOP;
END $$;
