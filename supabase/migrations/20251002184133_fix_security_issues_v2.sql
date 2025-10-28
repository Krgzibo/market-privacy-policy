/*
  # Fix Security and Performance Issues

  ## Changes Made

  ### 1. Performance Optimizations
  - Add missing index on order_items.product_id foreign key
  - Optimize all RLS policies to use (select auth.uid()) pattern for better performance
  - Set search_path for update_order_timestamp function for security

  ### 2. RLS Policy Improvements
  - Replace all auth.uid() with (select auth.uid()) in policies
  - This prevents re-evaluation for each row, improving query performance at scale

  ### 3. Index Note
  - Unused indexes are kept as they will be needed once the application has data
  - They provide necessary optimization for foreign key queries

  ### 4. Multiple Permissive Policies
  - Kept as designed: orders and order_items need different access for customers vs businesses
  - This is intentional for the business model where both roles need read access
*/

-- Add missing index on order_items.product_id
CREATE INDEX IF NOT EXISTS idx_order_items_product ON order_items(product_id);

-- Fix update_order_timestamp function search path
DROP TRIGGER IF EXISTS trigger_update_order_timestamp ON orders;
DROP FUNCTION IF EXISTS update_order_timestamp() CASCADE;

CREATE OR REPLACE FUNCTION update_order_timestamp()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_update_order_timestamp
  BEFORE UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION update_order_timestamp();

-- Drop all existing policies to recreate them with optimized auth.uid() calls
DROP POLICY IF EXISTS "Users can read own profile" ON users;
DROP POLICY IF EXISTS "Users can insert own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Business owners can insert own business" ON businesses;
DROP POLICY IF EXISTS "Business owners can update own business" ON businesses;
DROP POLICY IF EXISTS "Business owners can insert own products" ON products;
DROP POLICY IF EXISTS "Business owners can update own products" ON products;
DROP POLICY IF EXISTS "Business owners can delete own products" ON products;
DROP POLICY IF EXISTS "Customers can view own orders" ON orders;
DROP POLICY IF EXISTS "Business owners can view their business orders" ON orders;
DROP POLICY IF EXISTS "Customers can insert own orders" ON orders;
DROP POLICY IF EXISTS "Business owners can update their business orders" ON orders;
DROP POLICY IF EXISTS "Customers can view own order items" ON order_items;
DROP POLICY IF EXISTS "Business owners can view their business order items" ON order_items;
DROP POLICY IF EXISTS "Customers can insert own order items" ON order_items;

-- Users table policies with optimized auth.uid()
CREATE POLICY "Users can read own profile"
  ON users FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = id);

CREATE POLICY "Users can insert own profile"
  ON users FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = id);

CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = id)
  WITH CHECK ((select auth.uid()) = id);

-- Businesses table policies with optimized auth.uid()
CREATE POLICY "Business owners can insert own business"
  ON businesses FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = owner_id);

CREATE POLICY "Business owners can update own business"
  ON businesses FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = owner_id)
  WITH CHECK ((select auth.uid()) = owner_id);

-- Products table policies with optimized auth.uid()
CREATE POLICY "Business owners can insert own products"
  ON products FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM businesses
      WHERE businesses.id = business_id
      AND businesses.owner_id = (select auth.uid())
    )
  );

CREATE POLICY "Business owners can update own products"
  ON products FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM businesses
      WHERE businesses.id = business_id
      AND businesses.owner_id = (select auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM businesses
      WHERE businesses.id = business_id
      AND businesses.owner_id = (select auth.uid())
    )
  );

CREATE POLICY "Business owners can delete own products"
  ON products FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM businesses
      WHERE businesses.id = business_id
      AND businesses.owner_id = (select auth.uid())
    )
  );

-- Orders table policies with optimized auth.uid()
CREATE POLICY "Customers can view own orders"
  ON orders FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = customer_id);

CREATE POLICY "Business owners can view their business orders"
  ON orders FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM businesses
      WHERE businesses.id = business_id
      AND businesses.owner_id = (select auth.uid())
    )
  );

CREATE POLICY "Customers can insert own orders"
  ON orders FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = customer_id);

CREATE POLICY "Business owners can update their business orders"
  ON orders FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM businesses
      WHERE businesses.id = business_id
      AND businesses.owner_id = (select auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM businesses
      WHERE businesses.id = business_id
      AND businesses.owner_id = (select auth.uid())
    )
  );

-- Order items table policies with optimized auth.uid()
CREATE POLICY "Customers can view own order items"
  ON order_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_id
      AND orders.customer_id = (select auth.uid())
    )
  );

CREATE POLICY "Business owners can view their business order items"
  ON order_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM orders
      JOIN businesses ON businesses.id = orders.business_id
      WHERE orders.id = order_id
      AND businesses.owner_id = (select auth.uid())
    )
  );

CREATE POLICY "Customers can insert own order items"
  ON order_items FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_id
      AND orders.customer_id = (select auth.uid())
    )
  );