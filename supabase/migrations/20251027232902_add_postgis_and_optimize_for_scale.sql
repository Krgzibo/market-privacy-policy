/*
  # Scale optimization for 100k businesses and 2M users

  1. Extensions
    - Enable PostGIS for geospatial queries
  
  2. Schema Changes
    - Add geography column to businesses table for efficient location queries
    - Add location point column using PostGIS geography type
  
  3. Performance Indexes
    - Spatial index on business locations (GIST index)
    - Index on user_id for businesses lookup
    - Index on business_id for products lookup
    - Index on business_id for orders lookup
    - Index on customer_id for orders lookup
    - Index on status for orders filtering
    - Index on created_at for time-based queries
    - Index on is_available for products filtering
  
  4. Important Notes
    - PostGIS enables database-side distance calculations
    - Spatial indexes (GIST) dramatically improve location-based queries
    - All indexes use IF NOT EXISTS to prevent errors on re-run
    - Geography type uses real-world coordinates (lat/lng)
*/

-- Enable PostGIS extension for geospatial queries
CREATE EXTENSION IF NOT EXISTS postgis;

-- Add geography column to businesses table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'businesses' AND column_name = 'location'
  ) THEN
    ALTER TABLE businesses ADD COLUMN location geography(POINT, 4326);
  END IF;
END $$;

-- Update existing businesses to populate location column
UPDATE businesses 
SET location = ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography
WHERE location IS NULL AND latitude IS NOT NULL AND longitude IS NOT NULL;

-- Create spatial index on location (GIST index for fast geospatial queries)
CREATE INDEX IF NOT EXISTS idx_businesses_location ON businesses USING GIST(location);

-- Performance indexes for businesses table
CREATE INDEX IF NOT EXISTS idx_businesses_owner_id ON businesses(owner_id);
CREATE INDEX IF NOT EXISTS idx_businesses_created_at ON businesses(created_at DESC);

-- Performance indexes for products table
CREATE INDEX IF NOT EXISTS idx_products_business_id ON products(business_id);
CREATE INDEX IF NOT EXISTS idx_products_is_available ON products(is_available);
CREATE INDEX IF NOT EXISTS idx_products_business_available ON products(business_id, is_available);

-- Performance indexes for orders table
CREATE INDEX IF NOT EXISTS idx_orders_business_id ON orders(business_id);
CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_business_status ON orders(business_id, status);
CREATE INDEX IF NOT EXISTS idx_orders_customer_created ON orders(customer_id, created_at DESC);

-- Performance indexes for order_items table
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);

-- Performance indexes for messages table
CREATE INDEX IF NOT EXISTS idx_messages_order_id ON messages(order_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_order_created ON messages(order_id, created_at DESC);

-- Create function to automatically update location when lat/lng changes
CREATE OR REPLACE FUNCTION update_business_location()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.latitude IS NOT NULL AND NEW.longitude IS NOT NULL THEN
    NEW.location = ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326)::geography;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update location
DROP TRIGGER IF EXISTS trigger_update_business_location ON businesses;
CREATE TRIGGER trigger_update_business_location
  BEFORE INSERT OR UPDATE OF latitude, longitude ON businesses
  FOR EACH ROW
  EXECUTE FUNCTION update_business_location();