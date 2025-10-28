import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, Alert, ScrollView, KeyboardAvoidingView, Platform, Dimensions, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Store, MapPin, Banknote, CreditCard, TrendingUp, Clock } from 'lucide-react-native';
import * as Location from 'expo-location';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Business } from '@/types/database';

export default function BusinessManagement() {
  const { user } = useAuth();
  const [business, setBusiness] = useState<Business | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [todayRevenue, setTodayRevenue] = useState(0);
  const [todayOrders, setTodayOrders] = useState(0);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    address: '',
    latitude: '',
    longitude: '',
    phone: '',
    payment_methods: ['cash', 'card'],
    opening_time: '',
    closing_time: '',
  });

  useEffect(() => {
    if (user) {
      loadBusiness();
    }
  }, [user]);

  useEffect(() => {
    if (business) {
      const interval = setInterval(() => {
        loadTodayStats(business);
      }, 30000);

      return () => clearInterval(interval);
    }
  }, [business?.id]);

  const loadBusiness = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('businesses')
        .select('*')
        .eq('owner_id', user.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setBusiness(data);
        const formatTimeDisplay = (time: string | null) => {
          if (!time) return '';
          return time.substring(0, 5);
        };
        setFormData({
          name: data.name,
          description: data.description || '',
          address: data.address,
          latitude: data.latitude.toString(),
          longitude: data.longitude.toString(),
          phone: data.phone || '',
          payment_methods: data.payment_methods || ['cash', 'card'],
          opening_time: formatTimeDisplay(data.opening_time),
          closing_time: formatTimeDisplay(data.closing_time),
        });
        loadTodayStats(data);
      }
    } catch (error) {
      console.error('Error loading business:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadTodayStats = async (businessData: Business) => {
    if (!businessData) return;

    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const { data, error } = await supabase
        .from('orders')
        .select('total_amount')
        .eq('business_id', businessData.id)
        .in('status', ['confirmed', 'preparing', 'ready', 'completed'])
        .gte('created_at', today.toISOString())
        .lt('created_at', tomorrow.toISOString());

      if (error) throw error;

      const revenue = data?.reduce((sum, order) => sum + order.total_amount, 0) || 0;
      setTodayRevenue(revenue);
      setTodayOrders(data?.length || 0);
    } catch (error) {
      console.error('Error loading today stats:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    if (business) {
      await loadTodayStats(business);
    }
    setRefreshing(false);
  };

  const getCurrentLocation = async () => {
    try {
      setGettingLocation(true);

      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('İzin Gerekli', 'Konumunuza erişmek için izin vermeniz gerekiyor');
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      setFormData({
        ...formData,
        latitude: location.coords.latitude.toFixed(6),
        longitude: location.coords.longitude.toFixed(6),
      });

      Alert.alert('Başarılı', 'Mevcut konumunuz alındı');
    } catch (error) {
      console.error('Error getting location:', error);
      Alert.alert('Hata', 'Konum alınamadı. Lütfen GPS ayarlarınızı kontrol edin.');
    } finally {
      setGettingLocation(false);
    }
  };

  const togglePaymentMethod = (method: string) => {
    setFormData(prev => {
      const methods = prev.payment_methods.includes(method)
        ? prev.payment_methods.filter(m => m !== method)
        : [...prev.payment_methods, method];
      return { ...prev, payment_methods: methods };
    });
  };

  const handleSave = async () => {
    if (!user) return;

    if (!formData.name || !formData.address || !formData.latitude || !formData.longitude) {
      Alert.alert('Hata', 'Lütfen zorunlu alanları doldurun');
      return;
    }

    const lat = parseFloat(formData.latitude);
    const lon = parseFloat(formData.longitude);

    if (isNaN(lat) || isNaN(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
      Alert.alert('Hata', 'Lütfen geçerli koordinatlar girin');
      return;
    }

    const formatTime = (time: string) => {
      if (!time) return null;
      const trimmed = time.trim();
      if (trimmed.split(':').length === 2) {
        return `${trimmed}:00`;
      }
      return trimmed;
    };

    setSaving(true);
    console.log('Starting save, user.id:', user.id);

    try {
      const businessData = {
        name: formData.name,
        description: formData.description,
        address: formData.address,
        latitude: lat,
        longitude: lon,
        phone: formData.phone,
        payment_methods: formData.payment_methods,
        opening_time: formatTime(formData.opening_time),
        closing_time: formatTime(formData.closing_time),
        owner_id: user.id,
      };

      console.log('Business data to save:', businessData);

      if (business) {
        console.log('Updating existing business:', business.id);
        const { error } = await supabase
          .from('businesses')
          .update(businessData)
          .eq('id', business.id);

        if (error) {
          console.error('Update error:', error);
          throw error;
        }
        Alert.alert('Başarılı', 'İşletme bilgileri güncellendi');
      } else {
        console.log('Inserting new business');
        const { data, error } = await supabase
          .from('businesses')
          .insert(businessData)
          .select()
          .single();

        console.log('Insert result - data:', data, 'error:', error);
        if (error) throw error;
        setBusiness(data);
        Alert.alert('Başarılı', 'İşletmeniz oluşturuldu');
      }

      loadBusiness();
    } catch (error) {
      console.error('Error saving business:', error);
      Alert.alert('Hata', `İşletme kaydedilirken bir hata oluştu: ${error instanceof Error ? error.message : 'Bilinmeyen hata'}`);
    } finally {
      setSaving(false);
      console.log('Save completed');
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3498db" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>İşletme Bilgileri</Text>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#3498db']}
              tintColor="#3498db"
            />
          }
        >
          {business && (
            <View style={styles.statsCard}>
              <View style={styles.statsHeader}>
                <TrendingUp size={24} color="#27ae60" />
                <Text style={styles.statsTitle}>Bugünkü Ciro</Text>
              </View>
              <Text style={styles.revenueAmount}>{todayRevenue.toFixed(2)} ₺</Text>
              <Text style={styles.ordersCount}>{todayOrders} sipariş</Text>
            </View>
          )}
          {!business && (
            <View style={styles.infoCard}>
              <Store size={32} color="#3498db" />
              <Text style={styles.infoTitle}>İşletmenizi Kaydedin</Text>
              <Text style={styles.infoText}>
                Müşterilerin sizi bulabilmesi için işletme bilgilerinizi ekleyin
              </Text>
            </View>
          )}

          <View style={styles.form}>
            <Text style={styles.label}>İşletme Adı *</Text>
            <TextInput
              style={styles.input}
              value={formData.name}
              onChangeText={text => setFormData({ ...formData, name: text })}
              placeholder="Örn: Lezzet Durağı"
            />

            <Text style={styles.label}>Açıklama</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={formData.description}
              onChangeText={text => setFormData({ ...formData, description: text })}
              placeholder="İşletmeniz hakkında kısa bir açıklama"
              multiline
              numberOfLines={3}
            />

            <Text style={styles.label}>Adres *</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={formData.address}
              onChangeText={text => setFormData({ ...formData, address: text })}
              placeholder="Tam adresinizi girin"
              multiline
              numberOfLines={2}
            />

            <Text style={styles.label}>Konum (Enlem / Boylam) *</Text>
            <TouchableOpacity
              style={styles.locationButton}
              onPress={getCurrentLocation}
              disabled={gettingLocation}
            >
              {gettingLocation ? (
                <ActivityIndicator size="small" color="#3498db" />
              ) : (
                <>
                  <MapPin size={20} color="#3498db" />
                  <Text style={styles.locationButtonText}>Mevcut Konumumu Kullan</Text>
                </>
              )}
            </TouchableOpacity>

            <View style={styles.row}>
              <View style={styles.halfWidth}>
                <TextInput
                  style={styles.input}
                  value={formData.latitude}
                  onChangeText={text => setFormData({ ...formData, latitude: text })}
                  placeholder="Enlem: 41.0082"
                  keyboardType="numeric"
                />
              </View>
              <View style={styles.halfWidth}>
                <TextInput
                  style={styles.input}
                  value={formData.longitude}
                  onChangeText={text => setFormData({ ...formData, longitude: text })}
                  placeholder="Boylam: 28.9784"
                  keyboardType="numeric"
                />
              </View>
            </View>


            <Text style={styles.label}>Telefon</Text>
            <TextInput
              style={styles.input}
              value={formData.phone}
              onChangeText={text => setFormData({ ...formData, phone: text })}
              placeholder="0XXX XXX XX XX"
              keyboardType="phone-pad"
            />

            <Text style={styles.label}>Çalışma Saatleri</Text>
            <View style={styles.row}>
              <View style={styles.halfWidth}>
                <Text style={styles.timeLabel}>Açılış</Text>
                <TextInput
                  style={[styles.input, { marginBottom: 0 }]}
                  value={formData.opening_time}
                  onChangeText={text => {
                    console.log('Opening time changed:', text);
                    setFormData({ ...formData, opening_time: text });
                  }}
                  placeholder="09:00"
                  editable={true}
                />
              </View>
              <View style={styles.halfWidth}>
                <Text style={styles.timeLabel}>Kapanış</Text>
                <TextInput
                  style={[styles.input, { marginBottom: 0 }]}
                  value={formData.closing_time}
                  onChangeText={text => {
                    console.log('Closing time changed:', text);
                    setFormData({ ...formData, closing_time: text });
                  }}
                  placeholder="18:00"
                  editable={true}
                />
              </View>
            </View>

            <Text style={styles.label}>Kabul Edilen Ödeme Yöntemleri *</Text>
            <View style={styles.paymentMethodsContainer}>
              <TouchableOpacity
                style={[
                  styles.paymentMethodButton,
                  formData.payment_methods.includes('cash') && styles.paymentMethodButtonActive
                ]}
                onPress={() => togglePaymentMethod('cash')}
              >
                <Banknote size={20} color={formData.payment_methods.includes('cash') ? '#fff' : '#3498db'} />
                <Text style={[
                  styles.paymentMethodText,
                  formData.payment_methods.includes('cash') && styles.paymentMethodTextActive
                ]}>
                  Nakit
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.paymentMethodButton,
                  formData.payment_methods.includes('card') && styles.paymentMethodButtonActive
                ]}
                onPress={() => togglePaymentMethod('card')}
              >
                <CreditCard size={20} color={formData.payment_methods.includes('card') ? '#fff' : '#3498db'} />
                <Text style={[
                  styles.paymentMethodText,
                  formData.payment_methods.includes('card') && styles.paymentMethodTextActive
                ]}>
                  Kart
                </Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.saveButton, saving && styles.saveButtonDisabled]}
              onPress={handleSave}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.saveButtonText}>
                  {business ? 'Güncelle' : 'Kaydet'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  flex: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
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
  content: {
    padding: 16,
  },
  statsCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  statsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  statsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#7f8c8d',
  },
  revenueAmount: {
    fontSize: 36,
    fontWeight: '700',
    color: '#27ae60',
    marginBottom: 4,
  },
  ordersCount: {
    fontSize: 14,
    color: '#7f8c8d',
  },
  infoCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  infoTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2c3e50',
    marginTop: 16,
    marginBottom: 8,
  },
  infoText: {
    fontSize: 15,
    color: '#7f8c8d',
    textAlign: 'center',
    lineHeight: 22,
  },
  form: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    fontSize: 16,
    color: '#2c3e50',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  halfWidth: {
    flex: 1,
  },
  locationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ebf5fb',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: '#3498db',
  },
  locationButtonText: {
    color: '#3498db',
    fontSize: 15,
    fontWeight: '600',
  },
  paymentMethodsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  paymentMethodButton: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    backgroundColor: '#ebf5fb',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 12,
    gap: 6,
    borderWidth: 2,
    borderColor: '#ebf5fb',
  },
  paymentMethodButtonActive: {
    backgroundColor: '#3498db',
    borderColor: '#3498db',
  },
  paymentMethodText: {
    color: '#3498db',
    fontSize: 13,
    fontWeight: '600',
  },
  paymentMethodTextActive: {
    color: '#fff',
  },
  saveButton: {
    backgroundColor: '#3498db',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  timeInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 12,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    gap: 8,
  },
  timeInput: {
    flex: 1,
    fontSize: 16,
    color: '#2c3e50',
  },
  timeLabel: {
    fontSize: 12,
    color: '#7f8c8d',
    marginTop: 4,
    marginBottom: 16,
    textAlign: 'center',
  },
});
