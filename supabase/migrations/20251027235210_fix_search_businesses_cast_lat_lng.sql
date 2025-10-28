/*
  # Fix latitude/longitude casting in search businesses function

  1. Changes
    - Cast latitude and longitude to DOUBLE PRECISION
    - Fixes type mismatch error between NUMERIC and DOUBLE PRECISION

  2. Notes
    - Maintains all existing functionality
    - Returns correct data types expected by the function signature
*/

CREATE OR REPLACE FUNCTION search_nearby_businesses(
  user_lat DOUBLE PRECISION,
  user_lng DOUBLE PRECISION,
  max_distance_km DOUBLE PRECISION,
  search_term TEXT
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
    CAST(b.latitude AS DOUBLE PRECISION),
    CAST(b.longitude AS DOUBLE PRECISION),
    b.owner_id,
    b.is_active,
    b.opening_time,
    b.closing_time,
    b.payment_methods,
    b.created_at,
    CAST(
      ST_Distance(
        b.location,
        ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::geography
      ) / 1000.0 AS DOUBLE PRECISION
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
    AND (
      LOWER(b.name) LIKE LOWER('%' || search_term || '%')
      OR LOWER(b.description) LIKE LOWER('%' || search_term || '%')
    )
  ORDER BY b.location <-> ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::geography
  LIMIT 100;
END;
$$ LANGUAGE plpgsql STABLE;
