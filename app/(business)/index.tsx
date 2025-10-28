import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert, RefreshControl, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Clock, Package, CircleCheck as CheckCircle, MessageCircle, Printer } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Business, OrderWithItems, OrderStatus } from '@/types/database';
import { useRouter } from 'expo-router';

const statusConfig = {
  pending: { label: 'Yeni', nextStatus: 'confirmed', nextLabel: 'Onayla', color: '#f39c12', icon: Clock },
  confirmed: { label: 'Onaylandı', nextStatus: 'preparing', nextLabel: 'Hazırlanıyor', color: '#9b59b6', icon: CheckCircle },
  preparing: { label: 'Hazırlanıyor', nextStatus: 'ready', nextLabel: 'Hazır', color: '#3498db', icon: Package },
  ready: { label: 'Hazır', nextStatus: 'completed', nextLabel: 'Tamamlandı', color: '#27ae60', icon: CheckCircle },
  completed: { label: 'Tamamlandı', nextStatus: null, nextLabel: null, color: '#95a5a6', icon: CheckCircle },
  cancelled: { label: 'İptal', nextStatus: null, nextLabel: null, color: '#e74c3c', icon: Clock },
};

export default function BusinessOrders() {
  const { user } = useAuth();
  const router = useRouter();
  const [business, setBusiness] = useState<Business | null>(null);
  const [orders, setOrders] = useState<OrderWithItems[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const scrollOffsetRef = useRef(0);

  useEffect(() => {
    if (user) {
      loadBusinessAndOrders();
      subscribeToOrders();

      const interval = setInterval(() => {
        loadBusinessAndOrders(false, true);
      }, 10000);

      return () => clearInterval(interval);
    }
  }, [user]);

  const loadBusinessAndOrders = async (isRefreshing = false, maintainScroll = false) => {
    if (!user) return;

    if (isRefreshing) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const { data: businessData, error: businessError } = await supabase
        .from('businesses')
        .select('*')
        .eq('owner_id', user.id)
        .maybeSingle();

      if (businessError) throw businessError;

      if (businessData) {
        setBusiness(businessData);

        const { data: ordersData, error: ordersError } = await supabase
          .from('orders')
          .select(`
            *,
            order_items(*)
          `)
          .eq('business_id', businessData.id)
          .order('created_at', { ascending: false });

        if (ordersError) throw ordersError;
        setOrders(ordersData as OrderWithItems[] || []);

        if (maintainScroll && flatListRef.current && scrollOffsetRef.current > 0) {
          setTimeout(() => {
            flatListRef.current?.scrollToOffset({ offset: scrollOffsetRef.current, animated: false });
          }, 50);
        }
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const subscribeToOrders = () => {
    if (!user) return;

    const subscription = supabase
      .channel('business_orders_changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'orders',
        },
        (payload) => {
          Alert.alert(
            '🔔 Yeni Sipariş Geldi!',
            'Yeni bir sipariş aldınız. Lütfen siparişi inceleyin ve işleme alın.',
            [{ text: 'Tamam' }]
          );
          loadBusinessAndOrders();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
        },
        () => {
          loadBusinessAndOrders();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  };

  const updateOrderStatus = async (orderId: string, newStatus: OrderStatus) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: newStatus })
        .eq('id', orderId);

      if (error) throw error;
      loadBusinessAndOrders();
    } catch (error) {
      console.error('Error updating order:', error);
      Alert.alert('Hata', 'Sipariş güncellenirken bir hata oluştu');
    }
  };

  const cancelOrder = (orderId: string) => {
    Alert.alert(
      'Siparişi İptal Et',
      'Bu siparişi iptal etmek istediğinizden emin misiniz?',
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'İptal Et',
          style: 'destructive',
          onPress: () => updateOrderStatus(orderId, 'cancelled'),
        },
      ]
    );
  };

  const printOrder = (order: OrderWithItems) => {
    if (Platform.OS === 'web') {
      const orderDate = new Date(order.created_at).toLocaleDateString('tr-TR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });

      const pickupTime = order.pickup_time
        ? new Date(order.pickup_time).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
        : '-';

      const businessName = business?.name || 'İşletme';
      const statusLabel = statusConfig[order.status].label;

      let printContent = `${businessName}\n`;
      printContent += `${'='.repeat(40)}\n\n`;
      printContent += `Sipariş No: ${order.order_code || order.id}\n`;
      printContent += `Müşteri: ${order.customer_name}\n`;
      printContent += `Tarih: ${orderDate}\n`;
      printContent += `Teslim Saati: ${pickupTime}\n`;
      printContent += `Durum: ${statusLabel}\n\n`;
      printContent += `${'='.repeat(40)}\n`;
      printContent += `SİPARİŞ DETAYLARI\n`;
      printContent += `${'='.repeat(40)}\n\n`;

      order.order_items.forEach(item => {
        printContent += `${item.quantity}x ${item.product_name}\n`;
        printContent += `   ${(item.price * item.quantity).toFixed(2)} ₺\n`;
      });

      if (order.notes) {
        printContent += `\n${'='.repeat(40)}\n`;
        printContent += `Müşteri Notu:\n${order.notes}\n`;
      }

      printContent += `\n${'='.repeat(40)}\n`;
      printContent += `TOPLAM: ${order.total_amount.toFixed(2)} ₺\n`;
      printContent += `${'='.repeat(40)}\n`;

      const printFrame = document.createElement('iframe');
      printFrame.style.display = 'none';
      document.body.appendChild(printFrame);

      const doc = printFrame.contentWindow?.document;
      if (doc) {
        doc.open();
        doc.write(`
          <html>
            <head>
              <meta charset="UTF-8">
              <style>
                body {
                  font-family: 'Courier New', monospace;
                  padding: 20px;
                  white-space: pre-wrap;
                  font-size: 14px;
                }
                @media print {
                  body { padding: 10px; }
                }
              </style>
            </head>
            <body>${printContent}</body>
          </html>
        `);
        doc.close();

        setTimeout(() => {
          printFrame.contentWindow?.print();
          setTimeout(() => {
            document.body.removeChild(printFrame);
          }, 100);
        }, 250);
      }
    } else {
      Alert.alert('Bilgi', 'Yazdırma özelliği sadece web sürümünde kullanılabilir');
    }
  };

  const renderOrder = ({ item }: { item: OrderWithItems }) => {
    const status = statusConfig[item.status];
    const Icon = status.icon;
    const canUpdate = status.nextStatus !== null;
    const canCancel = item.status !== 'completed' && item.status !== 'cancelled';

    return (
      <View style={styles.orderCard}>
        <View style={styles.orderHeader}>
          <View style={styles.headerLeft}>
            <View style={[styles.statusBadge, { backgroundColor: status.color + '20' }]}>
              <Icon size={16} color={status.color} />
              <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
            </View>
            {item.order_code && (
              <Text style={styles.orderCode}>{item.order_code}</Text>
            )}
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.customerName}>{item.customer_name}</Text>
            <Text style={styles.orderDate}>
              {new Date(item.created_at).toLocaleDateString('tr-TR', {
                day: 'numeric',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </Text>
          </View>
        </View>

        <View style={styles.orderItems}>
          {item.order_items.map((orderItem, index) => (
            <View key={index} style={styles.orderItemRow}>
              <Text style={styles.orderItemQuantity}>{orderItem.quantity}x</Text>
              <Text style={styles.orderItemName}>{orderItem.product_name}</Text>
              <Text style={styles.orderItemPrice}>{(orderItem.price * orderItem.quantity).toFixed(2)} ₺</Text>
            </View>
          ))}
        </View>

        {item.pickup_time && (
          <View style={styles.pickupTimeContainer}>
            <Text style={styles.pickupTimeLabel}>Teslim Alma Saati:</Text>
            <Text style={styles.pickupTimeText}>
              {new Date(item.pickup_time).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
            </Text>
          </View>
        )}

        {item.notes ? (
          <View style={styles.notesContainer}>
            <Text style={styles.notesLabel}>Müşteri Notu:</Text>
            <Text style={styles.notesText}>{item.notes}</Text>
          </View>
        ) : null}

        <View style={styles.orderFooter}>
          <View style={styles.totalContainer}>
            <Text style={styles.totalLabel}>Toplam</Text>
            <Text style={styles.totalAmount}>{item.total_amount.toFixed(2)} ₺</Text>
          </View>
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={styles.printButton}
              onPress={() => printOrder(item)}
            >
              <Printer size={18} color="#27ae60" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.chatButton}
              onPress={() => router.push(`/(business)/chat/${item.id}`)}
            >
              <MessageCircle size={18} color="#3498db" />
            </TouchableOpacity>
            {canUpdate && status.nextStatus && (
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: statusConfig[status.nextStatus as OrderStatus].color }]}
                onPress={() => updateOrderStatus(item.id, status.nextStatus as OrderStatus)}
              >
                <Text style={styles.actionButtonText}>{status.nextLabel}</Text>
              </TouchableOpacity>
            )}
            {canCancel && (
              <TouchableOpacity
                style={[styles.actionButton, styles.cancelButton]}
                onPress={() => cancelOrder(item.id)}
              >
                <Text style={styles.actionButtonText}>İptal</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3498db" />
      </View>
    );
  }

  if (!business) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.title}>Siparişler</Text>
        </View>
        <View style={styles.emptyContainer}>
          <Package size={48} color="#bdc3c7" />
          <Text style={styles.emptyText}>Önce işletmenizi kaydedin</Text>
          <Text style={styles.emptySubtext}>İşletme sekmesinden işletme bilgilerinizi ekleyin</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Siparişler</Text>
        <View style={styles.orderCountBadge}>
          <Text style={styles.orderCountText}>{orders.filter(o => o.status === 'pending' || o.status === 'confirmed' || o.status === 'preparing').length} Aktif</Text>
        </View>
      </View>

      {orders.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Package size={48} color="#bdc3c7" />
          <Text style={styles.emptyText}>Henüz sipariş yok</Text>
          <Text style={styles.emptySubtext}>Yeni siparişler burada görünecek</Text>
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={orders}
          renderItem={renderOrder}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadBusinessAndOrders(true)} colors={['#3498db']} />}
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  orderCountBadge: {
    backgroundColor: '#3498db',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  orderCountText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
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
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerRight: {
    alignItems: 'flex-end',
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
  orderCode: {
    fontSize: 14,
    fontWeight: '700',
    color: '#3498db',
  },
  customerName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 2,
  },
  orderDate: {
    fontSize: 12,
    color: '#7f8c8d',
  },
  orderItems: {
    marginBottom: 12,
  },
  orderItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  orderItemQuantity: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3498db',
    width: 32,
  },
  orderItemName: {
    flex: 1,
    fontSize: 14,
    color: '#2c3e50',
  },
  orderItemPrice: {
    fontSize: 14,
    fontWeight: '600',
    color: '#7f8c8d',
  },
  pickupTimeContainer: {
    backgroundColor: '#e8f8f5',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pickupTimeLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#27ae60',
  },
  pickupTimeText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#27ae60',
  },
  notesContainer: {
    backgroundColor: '#fff9e6',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  notesLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#f39c12',
    marginBottom: 4,
  },
  notesText: {
    fontSize: 14,
    color: '#2c3e50',
  },
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  totalContainer: {
    flex: 1,
  },
  totalLabel: {
    fontSize: 14,
    color: '#7f8c8d',
    marginBottom: 2,
  },
  totalAmount: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2c3e50',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  printButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#e8f8f5',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#27ae60',
  },
  chatButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#ebf5fb',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#3498db',
  },
  actionButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  cancelButton: {
    backgroundColor: '#e74c3c',
  },
  actionButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
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
});
