/*
  # Update nearby businesses function with offset support

  1. Changes
    - Add offset_count parameter for pagination
    - Support fetching businesses in batches
    - Enables infinite scroll functionality
  
  2. Performance
    - Maintains spatial index usage
    - Efficient pagination with OFFSET
    - Supports millions of businesses
*/

-- Update function to support pagination with offset
CREATE OR REPLACE FUNCTION get_nearby_businesses(
  user_lat DOUBLE PRECISION,
  user_lng DOUBLE PRECISION,
  max_distance_km DOUBLE PRECISION,
  limit_count INTEGER DEFAULT 100,
  offset_count INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  description TEXT,
  address TEXT,
  phone TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  owner_id UUID,
  is_active BOOLEAN,
  opening_time TIME,
  closing_time TIME,
  payment_methods JSONB,
  created_at TIMESTAMPTZ,
  distance_km DOUBLE PRECISION
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    b.id,
    b.name,
    b.description,
    b.address,
    b.phone,
    b.latitude,
    b.longitude,
    b.owner_id,
    b.is_active,
    b.opening_time,
    b.closing_time,
    b.payment_methods,
    b.created_at,
    ROUND(
      CAST(
        ST_Distance(
          b.location,
          ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::geography
        ) / 1000.0 AS NUMERIC
      ), 
      2
    ) AS distance_km
  FROM businesses b
  WHERE 
    b.is_active = true
    AND b.location IS NOT NULL
    AND ST_DWithin(
      b.location,
      ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::geography,
      max_distance_km * 1000
    )
  ORDER BY b.location <-> ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::geography
  LIMIT limit_count
  OFFSET offset_count;
END;
$$ LANGUAGE plpgsql STABLE;