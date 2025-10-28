/*
  # Create function for efficient nearby business queries

  1. New Functions
    - `get_nearby_businesses` - Returns businesses within specified distance
      - Uses PostGIS ST_DWithin for fast geospatial queries
      - Calculates actual distance in kilometers
      - Returns results sorted by distance
      - Supports pagination with limit parameter
  
  2. Performance Benefits
    - Uses spatial index (GIST) for sub-millisecond queries
    - Database-side distance calculation (no client-side processing)
    - Supports millions of businesses efficiently
    - Returns only active businesses
  
  3. Parameters
    - user_lat: User's latitude
    - user_lng: User's longitude
    - max_distance_km: Maximum distance in kilometers
    - limit_count: Maximum number of results to return
*/

-- Create function to get nearby businesses with distance
CREATE OR REPLACE FUNCTION get_nearby_businesses(
  user_lat DOUBLE PRECISION,
  user_lng DOUBLE PRECISION,
  max_distance_km DOUBLE PRECISION,
  limit_count INTEGER DEFAULT 100
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
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql STABLE;