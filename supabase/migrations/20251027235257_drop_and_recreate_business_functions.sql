/*
  # Drop and recreate business functions with correct types

  1. Changes
    - Drop existing get_nearby_businesses function
    - Drop existing search_nearby_businesses function
    - Recreate both with correct payment_methods type (TEXT[] instead of JSONB)
    - Cast latitude/longitude to DOUBLE PRECISION

  2. Notes
    - Required because PostgreSQL doesn't allow changing return types
    - payment_methods is TEXT[] in the database
    - All other functionality remains the same
*/

DROP FUNCTION IF EXISTS get_nearby_businesses(DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION, INTEGER, INTEGER);
DROP FUNCTION IF EXISTS search_nearby_businesses(DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION, TEXT);

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
  payment_methods TEXT[],
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
  ORDER BY b.location <-> ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::geography
  LIMIT limit_count
  OFFSET offset_count;
END;
$$ LANGUAGE plpgsql STABLE;

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
  payment_methods TEXT[],
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
