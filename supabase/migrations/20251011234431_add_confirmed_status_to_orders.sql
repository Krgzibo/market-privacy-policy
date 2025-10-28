/*
  # Sipariş Onay Durumu Ekleme

  1. Değişiklikler
    - orders tablosuna 'confirmed' durumu eklendi
    - Sipariş durumu check constraint güncellendi
    - Durum akışı: pending → confirmed → preparing → ready → completed
  
  2. Güvenlik
    - Mevcut RLS politikaları korunuyor
*/

-- Update order status check constraint to include 'confirmed'
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE orders ADD CONSTRAINT orders_status_check 
  CHECK (status IN ('pending', 'confirmed', 'preparing', 'ready', 'completed', 'cancelled'));
