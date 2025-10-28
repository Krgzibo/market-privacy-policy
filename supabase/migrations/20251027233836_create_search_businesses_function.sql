/*
  # Create business search function

  1. New Functions
    - `search_nearby_businesses` - Searches businesses by name or description
      - Uses PostGIS for location-based filtering
      - Full-text search on name and description
      - Returns results sorted by distance
      - Case-insensitive search
  
  2. Search Features
    - Searches in business name
    - Searches in business description
    - Filters by active status
    - Filters by maximum distance
    - Returns distance in kilometers
    - Sorted by proximity to user
  
  3. Parameters
    - user_lat: User's latitude
    - user_lng: User's longitude
    - max_distance_km: Maximum distance in kilometers
    - search_term: Text to search for
*/

-- Create function to search nearby businesses
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
    AND (
      LOWER(b.name) LIKE LOWER('%' || search_term || '%')
      OR LOWER(b.description) LIKE LOWER('%' || search_term || '%')
    )
  ORDER BY b.location <-> ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::geography
  LIMIT 100;
END;
$$ LANGUAGE plpgsql STABLE;