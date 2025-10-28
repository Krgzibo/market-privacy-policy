/*
  # Enable Realtime for Orders Table

  1. Changes
    - Enable realtime replication for the orders table
    - This allows clients to subscribe to INSERT, UPDATE, DELETE events
    - Notifications will be sent instantly when orders are created or updated
  
  2. Security
    - RLS policies still apply to realtime subscriptions
    - Users will only receive notifications for orders they have access to
*/

-- Enable realtime for orders table
ALTER PUBLICATION supabase_realtime ADD TABLE orders;