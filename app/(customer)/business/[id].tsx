import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert, TextInput, Modal, ScrollView, Dimensions, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Plus, Minus, ShoppingCart, X, Clock, Banknote, CreditCard, MapPin, Phone, Info } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Business, Product } from '@/types/database';

interface CartItem extends Product {
  quantity: number;
}

export default function BusinessDetail() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const [business, setBusiness] = useState<Business | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCart, setShowCart] = useState(false);
  const [notes, setNotes] = useState('');
  const [ordering, setOrdering] = useState(false);
  const [pickupMinutes, setPickupMinutes] = useState<number>(15);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('cash');
  const [customerName, setCustomerName] = useState('');
  const [isBusinessOpen, setIsBusinessOpen] = useState(true);

  useEffect(() => {
    loadBusinessAndProducts();
  }, [id]);

  useEffect(() => {
    if (business) {
      checkIfOpen();
      const interval = setInterval(checkIfOpen, 60000);
      return () => clearInterval(interval);
    }
  }, [business]);

  const checkIfOpen = () => {
    if (!business || !business.opening_time || !business.closing_time) {
      setIsBusinessOpen(true);
      return;
    }

    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();

    const [openHour, openMin] = business.opening_time.split(':').map(Number);
    const [closeHour, closeMin] = business.closing_time.split(':').map(Number);

    const openingMinutes = openHour * 60 + openMin;
    const closingMinutes = closeHour * 60 + closeMin;

    if (closingMinutes < openingMinutes) {
      setIsBusinessOpen(currentTime >= openingMinutes || currentTime <= closingMinutes);
    } else {
      setIsBusinessOpen(currentTime >= openingMinutes && currentTime <= closingMinutes);
    }
  };

  const loadBusinessAndProducts = async () => {
    try {
      const [businessRes, productsRes] = await Promise.all([
        supabase.from('businesses').select('*').eq('id', id).maybeSingle(),
        supabase.from('products').select('*').eq('business_id', id).eq('is_available', true).order('name'),
      ]);

      if (businessRes.error) throw businessRes.error;
      if (productsRes.error) throw productsRes.error;

      setBusiness(businessRes.data);
      setProducts(productsRes.data || []);
    } catch (error) {
      console.error('Error loading business:', error);
    } finally {
      setLoading(false);
    }
  };

  const addToCart = (product: Product) => {
    if (!isBusinessOpen) {
      Alert.alert('Kapalı', 'Bu işletme şu anda kapalı. Sipariş veremezsiniz.');
      return;
    }

    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item =>
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { ...product, quantity: 1 }];
    });
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === productId);
      if (existing && existing.quantity > 1) {
        return prev.map(item =>
          item.id === productId ? { ...item, quantity: item.quantity - 1 } : item
        );
      }
      return prev.filter(item => item.id !== productId);
    });
  };

  const getTotalAmount = () => {
    return cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  };

  const placeOrder = async () => {
    if (cart.length === 0) return;
    if (!user) return;

    if (!customerName.trim()) {
      Alert.alert('Hata', 'Lütfen adınızı ve soyadınızı girin');
      return;
    }

    setOrdering(true);

    try {
      const totalAmount = getTotalAmount();
      const pickupTime = new Date(Date.now() + pickupMinutes * 60000).toISOString();

      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          customer_id: user.id,
          business_id: id,
          total_amount: totalAmount,
          notes: notes || '',
          status: 'pending',
          pickup_time: pickupTime,
          customer_name: customerName.trim(),
        })
        .select()
        .single();

      if (orderError) throw orderError;

      const orderItems = cart.map(item => ({
        order_id: order.id,
        product_id: item.id,
        quantity: item.quantity,
        price: item.price,
        product_name: item.name,
      }));

      const { error: itemsError } = await supabase.from('order_items').insert(orderItems);

      if (itemsError) throw itemsError;

      Alert.alert(
        'Sipariş Başarıyla Oluşturuldu!',
        `Sipariş Kodunuz: ${order.order_code}\n\nSiparişiniz ${business?.name} tarafından alındı.\n\nTahmini Hazır Olma: ${new Date(pickupTime).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}\n\nSipariş durumunuzu "Siparişlerim" sekmesinden takip edebilirsiniz.`,
        [
          { text: 'Siparişlerime Git', onPress: () => router.push('/(customer)/orders') },
        ]
      );

      setCart([]);
      setNotes('');
      setPickupMinutes(15);
      setCustomerName('');
      setShowCart(false);
    } catch (error) {
      console.error('Error placing order:', error);
      Alert.alert('Hata', 'Sipariş oluşturulurken bir hata oluştu');
    } finally {
      setOrdering(false);
    }
  };

  const renderProduct = ({ item }: { item: Product }) => {
    const cartItem = cart.find(c => c.id === item.id);
    const quantity = cartItem?.quantity || 0;

    return (
      <View style={styles.productCard}>
        <View style={styles.productInfo}>
          <Text style={styles.productName}>{item.name}</Text>
          {item.description ? (
            <Text style={styles.productDescription} numberOfLines={2}>
              {item.description}
            </Text>
          ) : null}
          <Text style={styles.productPrice}>{item.price.toFixed(2)} ₺</Text>
        </View>
        <View style={styles.productActions}>
          {quantity > 0 ? (
            <View style={styles.quantityControl}>
              <TouchableOpacity style={styles.quantityButton} onPress={() => removeFromCart(item.id)}>
                <Minus size={18} color="#fff" />
              </TouchableOpacity>
              <Text style={styles.quantityText}>{quantity}</Text>
              <TouchableOpacity style={styles.quantityButton} onPress={() => addToCart(item)}>
                <Plus size={18} color="#fff" />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={styles.addButton} onPress={() => addToCart(item)}>
              <Plus size={20} color="#fff" />
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#27ae60" />
      </View>
    );
  }

  if (!business) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>İşletme bulunamadı</Text>
      </View>
    );
  }

  const renderHeader = () => (
    <>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft size={24} color="#2c3e50" />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.businessName}>{business.name}</Text>
          {business.description && (
            <Text style={styles.businessDescription} numberOfLines={2}>
              {business.description}
            </Text>
          )}
        </View>
      </View>

      {!isBusinessOpen && (
        <View style={styles.closedBanner}>
          <Clock size={20} color="#fff" />
          <Text style={styles.closedBannerText}>
            İşletme şu anda kapalı. Çalışma saatleri: {business.opening_time?.substring(0, 5)} - {business.closing_time?.substring(0, 5)}
          </Text>
        </View>
      )}

      {(business.opening_time || business.address || business.phone || business.payment_methods) && (
        <View style={styles.businessInfoCard}>
          {business.opening_time && business.closing_time && (
            <View style={styles.hoursCard}>
              <Clock size={20} color={isBusinessOpen ? '#27ae60' : '#e74c3c'} />
              <View style={styles.hoursTextContainer}>
                <Text style={styles.hoursLabel}>Çalışma Saatleri</Text>
                <Text style={[styles.hoursText, { color: isBusinessOpen ? '#27ae60' : '#e74c3c' }]}>
                  {business.opening_time.substring(0, 5)} - {business.closing_time.substring(0, 5)}
                </Text>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: isBusinessOpen ? '#27ae60' : '#e74c3c' }]}>
                <Text style={styles.statusBadgeText}>{isBusinessOpen ? 'Açık' : 'Kapalı'}</Text>
              </View>
            </View>
          )}

          {business.address && (
            <View style={styles.infoRow}>
              <MapPin size={16} color="#7f8c8d" />
              <Text style={styles.infoText}>
                {business.address}
              </Text>
            </View>
          )}

          {business.phone && (
            <View style={styles.infoRow}>
              <Phone size={16} color="#7f8c8d" />
              <Text style={styles.infoText}>
                {business.phone}
              </Text>
            </View>
          )}

          {business.payment_methods && business.payment_methods.length > 0 && (
            <View style={styles.infoRow}>
              <Info size={16} color="#7f8c8d" />
              <Text style={styles.infoText}>
                Ödeme: {business.payment_methods.map(method =>
                  method === 'cash' ? 'Nakit' : 'Kart'
                ).join(', ')}
              </Text>
            </View>
          )}
        </View>
      )}

      <Text style={styles.productsTitle}>Ürünler</Text>
    </>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <FlatList
        data={products}
        renderItem={renderProduct}
        keyExtractor={item => item.id}
        ListHeaderComponent={renderHeader}
        contentContainerStyle={styles.listContent}
        stickyHeaderIndices={[]}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Henüz ürün bulunmuyor</Text>
          </View>
        }
      />

      {cart.length > 0 && (
        <TouchableOpacity style={styles.cartButton} onPress={() => setShowCart(true)}>
          <ShoppingCart size={24} color="#fff" />
          <Text style={styles.cartButtonText}>Sepet ({cart.length})</Text>
          <Text style={styles.cartTotal}>{getTotalAmount().toFixed(2)} ₺</Text>
        </TouchableOpacity>
      )}

      <Modal visible={showCart} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.cartModal}>
            <View style={styles.cartHeader}>
              <Text style={styles.cartTitle}>Sepetim</Text>
              <TouchableOpacity onPress={() => setShowCart(false)}>
                <X size={24} color="#2c3e50" />
              </TouchableOpacity>
            </View>

            <ScrollView>
              <View>
                {cart.map(item => (
                  <View key={item.id} style={styles.cartItem}>
                    <View style={styles.cartItemInfo}>
                      <Text style={styles.cartItemName}>{item.name}</Text>
                      <Text style={styles.cartItemPrice}>{(item.price * item.quantity).toFixed(2)} ₺</Text>
                    </View>
                    <View style={styles.quantityControl}>
                      <TouchableOpacity style={styles.quantityButtonSmall} onPress={() => removeFromCart(item.id)}>
                        <Minus size={16} color="#fff" />
                      </TouchableOpacity>
                      <Text style={styles.quantityText}>{item.quantity}</Text>
                      <TouchableOpacity style={styles.quantityButtonSmall} onPress={() => addToCart(item)}>
                        <Plus size={16} color="#fff" />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>

              <View style={styles.pickupSection}>
                <View style={styles.pickupHeader}>
                  <Clock size={20} color="#27ae60" />
                  <Text style={styles.pickupTitle}>Teslim Alma Zamanı</Text>
                </View>
                <View style={styles.timeOptions}>
                  {[15, 30, 45, 60, 90, 120].map(minutes => (
                    <TouchableOpacity
                      key={minutes}
                      style={[styles.timeOption, pickupMinutes === minutes && styles.timeOptionActive]}
                      onPress={() => setPickupMinutes(minutes)}
                    >
                      <Text style={[styles.timeOptionText, pickupMinutes === minutes && styles.timeOptionTextActive]}>
                        {minutes < 60 ? `${minutes} dk` : `${minutes / 60} saat`}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <Text style={styles.pickupTimeText}>
                  Tahmini hazır olma: {new Date(Date.now() + pickupMinutes * 60000).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </View>

              {business.payment_methods && business.payment_methods.length > 0 && (
                <View style={styles.paymentSection}>
                  <Text style={styles.paymentTitle}>Ödeme Yöntemi</Text>
                  <View style={styles.paymentOptions}>
                    {business.payment_methods.includes('cash') && (
                      <TouchableOpacity
                        style={[
                          styles.paymentOption,
                          selectedPaymentMethod === 'cash' && styles.paymentOptionActive
                        ]}
                        onPress={() => setSelectedPaymentMethod('cash')}
                      >
                        <Banknote size={20} color={selectedPaymentMethod === 'cash' ? '#fff' : '#27ae60'} />
                        <Text style={[
                          styles.paymentOptionText,
                          selectedPaymentMethod === 'cash' && styles.paymentOptionTextActive
                        ]}>
                          Nakit
                        </Text>
                      </TouchableOpacity>
                    )}
                    {business.payment_methods.includes('card') && (
                      <TouchableOpacity
                        style={[
                          styles.paymentOption,
                          selectedPaymentMethod === 'card' && styles.paymentOptionActive
                        ]}
                        onPress={() => setSelectedPaymentMethod('card')}
                      >
                        <CreditCard size={20} color={selectedPaymentMethod === 'card' ? '#fff' : '#27ae60'} />
                        <Text style={[
                          styles.paymentOptionText,
                          selectedPaymentMethod === 'card' && styles.paymentOptionTextActive
                        ]}>
                          Kart
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              )}

              <View style={styles.customerNameSection}>
                <Text style={styles.customerNameLabel}>Adınız Soyadınız *</Text>
                <TextInput
                  style={styles.customerNameInput}
                  placeholder="Örn: Ahmet Yılmaz"
                  value={customerName}
                  onChangeText={setCustomerName}
                />
              </View>

              <TextInput
                style={styles.notesInput}
                placeholder="Sipariş notu (opsiyonel)"
                value={notes}
                onChangeText={setNotes}
                multiline
                numberOfLines={3}
              />
            </ScrollView>

            <View style={styles.cartFooter}>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Toplam</Text>
                <Text style={styles.totalAmount}>{getTotalAmount().toFixed(2)} ₺</Text>
              </View>
              <TouchableOpacity
                style={[styles.orderButton, ordering && styles.orderButtonDisabled]}
                onPress={placeOrder}
                disabled={ordering}
              >
                {ordering ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.orderButtonText}>Siparişi Onayla</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  errorText: {
    fontSize: 16,
    color: '#7f8c8d',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    marginRight: 16,
  },
  headerInfo: {
    flex: 1,
  },
  businessName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2c3e50',
    marginBottom: 4,
  },
  businessDescription: {
    fontSize: 14,
    color: '#7f8c8d',
    marginTop: 4,
    lineHeight: 20,
  },
  businessInfoCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 12,
    borderRadius: 12,
    padding: 16,
    gap: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#e8f8f5',
  },
  hoursCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    padding: 18,
    borderRadius: 12,
    gap: 12,
    marginBottom: 4,
    borderWidth: 2,
    borderColor: '#27ae60',
  },
  hoursTextContainer: {
    flex: 1,
  },
  hoursLabel: {
    fontSize: 13,
    color: '#7f8c8d',
    fontWeight: '600',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  hoursText: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  statusBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 4,
  },
  infoText: {
    fontSize: 15,
    color: '#2c3e50',
    flex: 1,
    lineHeight: 22,
    fontWeight: '500',
  },
  hoursTextBold: {
    fontWeight: '600',
    color: '#27ae60',
  },
  closedBanner: {
    backgroundColor: '#e74c3c',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
    gap: 10,
  },
  closedBannerText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  productsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2c3e50',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  productCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  productInfo: {
    flex: 1,
    marginRight: 12,
  },
  productName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 4,
  },
  productDescription: {
    fontSize: 13,
    color: '#7f8c8d',
    marginBottom: 8,
  },
  productPrice: {
    fontSize: 18,
    fontWeight: '700',
    color: '#27ae60',
  },
  productActions: {
    justifyContent: 'center',
  },
  addButton: {
    backgroundColor: '#27ae60',
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityControl: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  quantityButton: {
    backgroundColor: '#27ae60',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityButtonSmall: {
    backgroundColor: '#27ae60',
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    minWidth: 24,
    textAlign: 'center',
  },
  cartButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#27ae60',
    margin: 16,
    padding: 16,
    borderRadius: 16,
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  cartButtonText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  cartTotal: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  cartModal: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
    paddingBottom: 24,
  },
  cartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  cartTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#2c3e50',
  },
  cartItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  cartItemInfo: {
    flex: 1,
    marginRight: 16,
  },
  cartItemName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 4,
  },
  cartItemPrice: {
    fontSize: 16,
    fontWeight: '700',
    color: '#27ae60',
  },
  customerNameSection: {
    margin: 16,
    marginBottom: 8,
  },
  customerNameLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 8,
  },
  customerNameInput: {
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    fontSize: 15,
    color: '#2c3e50',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  notesInput: {
    margin: 16,
    marginTop: 8,
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    fontSize: 15,
    color: '#2c3e50',
    textAlignVertical: 'top',
  },
  cartFooter: {
    padding: 16,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2c3e50',
  },
  totalAmount: {
    fontSize: 24,
    fontWeight: '700',
    color: '#27ae60',
  },
  orderButton: {
    backgroundColor: '#27ae60',
    padding: 18,
    borderRadius: 16,
    alignItems: 'center',
  },
  orderButtonDisabled: {
    opacity: 0.6,
  },
  orderButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#7f8c8d',
  },
  pickupSection: {
    padding: 16,
    backgroundColor: '#f8f9fa',
    margin: 16,
    borderRadius: 12,
  },
  pickupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  pickupTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
  },
  timeOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  timeOption: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  timeOptionActive: {
    backgroundColor: '#27ae60',
    borderColor: '#27ae60',
  },
  timeOptionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2c3e50',
  },
  timeOptionTextActive: {
    color: '#fff',
  },
  pickupTimeText: {
    fontSize: 13,
    color: '#7f8c8d',
    textAlign: 'center',
  },
  paymentSection: {
    padding: 16,
    backgroundColor: '#f8f9fa',
    margin: 16,
    borderRadius: 12,
  },
  paymentTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 12,
  },
  paymentOptions: {
    flexDirection: 'row',
    gap: 12,
  },
  paymentOption: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 12,
    gap: 6,
    borderWidth: 2,
    borderColor: '#e0e0e0',
  },
  paymentOptionActive: {
    backgroundColor: '#27ae60',
    borderColor: '#27ae60',
  },
  paymentOptionText: {
    color: '#27ae60',
    fontSize: 13,
    fontWeight: '600',
  },
  paymentOptionTextActive: {
    color: '#fff',
  },
});
