/*
  # Create Messages Table for Order Chat

  1. New Tables
    - `messages`
      - `id` (uuid, primary key)
      - `order_id` (uuid, foreign key to orders)
      - `sender_id` (uuid, foreign key to auth.users)
      - `sender_type` (text, either 'customer' or 'business')
      - `message` (text, the actual message content)
      - `created_at` (timestamptz)
  
  2. Security
    - Enable RLS on messages table
    - Customers can read/write messages for their orders
    - Business owners can read/write messages for orders in their business
    - Messages are ordered by creation time
  
  3. Realtime
    - Enable realtime for instant message updates
*/

CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES orders(id) ON DELETE CASCADE NOT NULL,
  sender_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  sender_type text NOT NULL CHECK (sender_type IN ('customer', 'business')),
  message text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Customers can read messages for their orders"
  ON messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = messages.order_id
      AND orders.customer_id = auth.uid()
    )
  );

CREATE POLICY "Customers can send messages for their orders"
  ON messages FOR INSERT
  TO authenticated
  WITH CHECK (
    sender_id = auth.uid()
    AND sender_type = 'customer'
    AND EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_id
      AND orders.customer_id = auth.uid()
    )
  );

CREATE POLICY "Business owners can read messages for their orders"
  ON messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM orders
      JOIN businesses ON businesses.id = orders.business_id
      WHERE orders.id = messages.order_id
      AND businesses.owner_id = auth.uid()
    )
  );

CREATE POLICY "Business owners can send messages for their orders"
  ON messages FOR INSERT
  TO authenticated
  WITH CHECK (
    sender_id = auth.uid()
    AND sender_type = 'business'
    AND EXISTS (
      SELECT 1 FROM orders
      JOIN businesses ON businesses.id = orders.business_id
      WHERE orders.id = order_id
      AND businesses.owner_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS messages_order_id_idx ON messages(order_id);
CREATE INDEX IF NOT EXISTS messages_created_at_idx ON messages(created_at);

ALTER PUBLICATION supabase_realtime ADD TABLE messages;