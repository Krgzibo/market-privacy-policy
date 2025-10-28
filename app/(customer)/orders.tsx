import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, RefreshControl, Alert, TouchableOpacity, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Clock, Package, CircleCheck as CheckCircle, Circle as XCircle, MessageCircle, Phone } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { OrderWithItems } from '@/types/database';
import { useRouter } from 'expo-router';

const statusConfig = {
  pending: { label: 'Beklemede', color: '#f39c12', icon: Clock },
  confirmed: { label: 'Onaylandı', color: '#9b59b6', icon: CheckCircle },
  preparing: { label: 'Hazırlanıyor', color: '#3498db', icon: Package },
  ready: { label: 'Hazır', color: '#27ae60', icon: CheckCircle },
  completed: { label: 'Tamamlandı', color: '#95a5a6', icon: CheckCircle },
  cancelled: { label: 'İptal Edildi', color: '#e74c3c', icon: XCircle },
};

export default function CustomerOrders() {
  const { user } = useAuth();
  const router = useRouter();
  const [orders, setOrders] = useState<OrderWithItems[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const scrollOffsetRef = useRef(0);

  useEffect(() => {
    if (user) {
      loadOrders();
      subscribeToOrders();
    }
  }, [user]);

  const loadOrders = async (isRefreshing = false) => {
    if (!user) return;

    if (isRefreshing) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          business:businesses(*),
          order_items(*)
        `)
        .eq('customer_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrders(data as OrderWithItems[] || []);

      if (!isRefreshing && flatListRef.current && scrollOffsetRef.current > 0) {
        setTimeout(() => {
          flatListRef.current?.scrollToOffset({ offset: scrollOffsetRef.current, animated: false });
        }, 50);
      }
    } catch (error) {
      console.error('Error loading orders:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const subscribeToOrders = () => {
    if (!user) return;

    const subscription = supabase
      .channel('orders_changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `customer_id=eq.${user.id}`,
        },
        (payload) => {
          const newOrder = payload.new as any;
          const status = statusConfig[newOrder.status as keyof typeof statusConfig];

          if (status) {
            Alert.alert(
              '✓ Sipariş Güncellendi',
              `Siparişinizin durumu: ${status.label}`,
              [{ text: 'Tamam' }]
            );
          }

          loadOrders();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  };

  const renderOrder = ({ item }: { item: OrderWithItems }) => {
    const status = statusConfig[item.status];
    const Icon = status.icon;

    return (
      <View style={styles.orderCard}>
        <View style={styles.orderHeader}>
          <View style={styles.businessInfo}>
            <Text style={styles.businessName}>{item.business?.name}</Text>
            <Text style={styles.orderDate}>
              {new Date(item.created_at).toLocaleDateString('tr-TR', {
                day: 'numeric',
                month: 'long',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </Text>
            {item.order_code && (
              <Text style={styles.orderCode}>Sipariş: {item.order_code}</Text>
            )}
          </View>
          <View style={[styles.statusBadge, { backgroundColor: status.color + '20' }]}>
            <Icon size={16} color={status.color} />
            <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
          </View>
        </View>

        <View style={styles.orderItems}>
          {item.order_items.map((orderItem, index) => (
            <Text key={index} style={styles.orderItem}>
              {orderItem.quantity}x {orderItem.product_name}
            </Text>
          ))}
        </View>

        {item.business?.phone && (
          <TouchableOpacity
            style={styles.phoneContainer}
            onPress={() => Linking.openURL(`tel:${item.business?.phone}`)}
          >
            <Phone size={16} color="#3498db" />
            <Text style={styles.phoneText}>{item.business.phone}</Text>
          </TouchableOpacity>
        )}

        {item.pickup_time && (
          <View style={styles.pickupTimeContainer}>
            <Clock size={16} color="#27ae60" />
            <Text style={styles.pickupTimeText}>
              Teslim: {new Date(item.pickup_time).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
            </Text>
          </View>
        )}

        {item.notes ? (
          <View style={styles.notesContainer}>
            <Text style={styles.notesLabel}>Not:</Text>
            <Text style={styles.notesText}>{item.notes}</Text>
          </View>
        ) : null}

        <View style={styles.progressBar}>
          <View style={[styles.progressStep, (item.status === 'pending' || item.status === 'confirmed' || item.status === 'preparing' || item.status === 'ready' || item.status === 'completed') && styles.progressStepActive]}>
            <View style={[styles.progressDot, (item.status === 'pending' || item.status === 'confirmed' || item.status === 'preparing' || item.status === 'ready' || item.status === 'completed') && styles.progressDotActive]}>
              <Clock size={12} color={(item.status === 'pending' || item.status === 'confirmed' || item.status === 'preparing' || item.status === 'ready' || item.status === 'completed') ? '#fff' : '#bdc3c7'} />
            </View>
            <Text style={[styles.progressLabel, (item.status === 'pending' || item.status === 'confirmed' || item.status === 'preparing' || item.status === 'ready' || item.status === 'completed') && styles.progressLabelActive]}>Alındı</Text>
          </View>
          <View style={[styles.progressLine, (item.status === 'confirmed' || item.status === 'preparing' || item.status === 'ready' || item.status === 'completed') && styles.progressLineActive]} />
          <View style={[styles.progressStep, (item.status === 'confirmed' || item.status === 'preparing' || item.status === 'ready' || item.status === 'completed') && styles.progressStepActive]}>
            <View style={[styles.progressDot, (item.status === 'confirmed' || item.status === 'preparing' || item.status === 'ready' || item.status === 'completed') && styles.progressDotActive]}>
              <CheckCircle size={12} color={(item.status === 'confirmed' || item.status === 'preparing' || item.status === 'ready' || item.status === 'completed') ? '#fff' : '#bdc3c7'} />
            </View>
            <Text style={[styles.progressLabel, (item.status === 'confirmed' || item.status === 'preparing' || item.status === 'ready' || item.status === 'completed') && styles.progressLabelActive]}>Onaylandı</Text>
          </View>
          <View style={[styles.progressLine, (item.status === 'preparing' || item.status === 'ready' || item.status === 'completed') && styles.progressLineActive]} />
          <View style={[styles.progressStep, (item.status === 'preparing' || item.status === 'ready' || item.status === 'completed') && styles.progressStepActive]}>
            <View style={[styles.progressDot, (item.status === 'preparing' || item.status === 'ready' || item.status === 'completed') && styles.progressDotActive]}>
              <Package size={12} color={(item.status === 'preparing' || item.status === 'ready' || item.status === 'completed') ? '#fff' : '#bdc3c7'} />
            </View>
            <Text style={[styles.progressLabel, (item.status === 'preparing' || item.status === 'ready' || item.status === 'completed') && styles.progressLabelActive]}>Hazırlanıyor</Text>
          </View>
          <View style={[styles.progressLine, (item.status === 'ready' || item.status === 'completed') && styles.progressLineActive]} />
          <View style={[styles.progressStep, (item.status === 'ready' || item.status === 'completed') && styles.progressStepActive]}>
            <View style={[styles.progressDot, (item.status === 'ready' || item.status === 'completed') && styles.progressDotActive]}>
              <CheckCircle size={12} color={(item.status === 'ready' || item.status === 'completed') ? '#fff' : '#bdc3c7'} />
            </View>
            <Text style={[styles.progressLabel, (item.status === 'ready' || item.status === 'completed') && styles.progressLabelActive]}>Hazır</Text>
          </View>
        </View>

        <View style={styles.orderFooter}>
          <View style={styles.totalContainer}>
            <Text style={styles.totalLabel}>Toplam</Text>
            <Text style={styles.totalAmount}>{item.total_amount.toFixed(2)} ₺</Text>
          </View>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#27ae60" />
        <Text style={styles.loadingText}>Siparişler yükleniyor...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Siparişlerim</Text>
      </View>

      {orders.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Package size={48} color="#bdc3c7" />
          <Text style={styles.emptyText}>Henüz siparişiniz yok</Text>
          <Text style={styles.emptySubtext}>Yakınınızdaki işletmelerden sipariş verin</Text>
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={orders}
          renderItem={renderOrder}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadOrders(true)} colors={['#27ae60']} />}
          onScroll={(event) => {
            scrollOffsetRef.current = event.nativeEvent.contentOffset.y;
          }}
          scrollEventThrottle={16}
        />
      )}
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
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#7f8c8d',
  },
  header: {
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#2c3e50',
  },
  listContent: {
    padding: 16,
  },
  orderCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  businessInfo: {
    flex: 1,
    marginRight: 12,
  },
  businessName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2c3e50',
    marginBottom: 4,
  },
  orderDate: {
    fontSize: 13,
    color: '#7f8c8d',
  },
  orderCode: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3498db',
    marginTop: 4,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 6,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '600',
  },
  orderItems: {
    marginBottom: 12,
  },
  orderItem: {
    fontSize: 14,
    color: '#2c3e50',
    marginBottom: 4,
  },
  notesContainer: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  notesLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#7f8c8d',
    marginBottom: 4,
  },
  notesText: {
    fontSize: 14,
    color: '#2c3e50',
  },
  orderFooter: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  totalContainer: {
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#7f8c8d',
  },
  totalAmount: {
    fontSize: 22,
    fontWeight: '700',
    color: '#27ae60',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#7f8c8d',
    marginTop: 16,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#95a5a6',
    marginTop: 8,
    textAlign: 'center',
  },
  pickupTimeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#e8f8f5',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 12,
  },
  pickupTimeText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#27ae60',
  },
  phoneContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#e3f2fd',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#3498db',
  },
  phoneText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3498db',
  },
  progressBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: 16,
    paddingHorizontal: 8,
  },
  progressStep: {
    alignItems: 'center',
    gap: 6,
  },
  progressStepActive: {
    opacity: 1,
  },
  progressDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#ecf0f1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressDotActive: {
    backgroundColor: '#27ae60',
  },
  progressLabel: {
    fontSize: 11,
    color: '#95a5a6',
    fontWeight: '600',
  },
  progressLabelActive: {
    color: '#27ae60',
  },
  progressLine: {
    flex: 1,
    height: 2,
    backgroundColor: '#ecf0f1',
    marginHorizontal: 4,
  },
  progressLineActive: {
    backgroundColor: '#27ae60',
  },
});
