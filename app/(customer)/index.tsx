import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert, Dimensions, Platform, RefreshControl, Modal, TextInput, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MapPin, Navigation, Clock, Search, X } from 'lucide-react-native';
import * as Location from 'expo-location';
import { supabase } from '@/lib/supabase';
import { Business } from '@/types/database';

interface BusinessWithDistance extends Business {
  distance: number;
}

const MAX_DISTANCE_KM = 20;
const ITEMS_PER_PAGE = 50;

export default function CustomerHome() {
  const router = useRouter();
  const [businesses, setBusinesses] = useState<BusinessWithDistance[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [searchModalVisible, setSearchModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    getUserLocation();
  }, []);

  useEffect(() => {
    if (userLocation) {
      loadBusinesses();

      const silentRefreshInterval = setInterval(() => {
        loadBusinessesSilently();
      }, 30000);

      const statusCheckInterval = setInterval(() => {
        setBusinesses(prev => [...prev]);
      }, 60000);

      return () => {
        clearInterval(silentRefreshInterval);
        clearInterval(statusCheckInterval);
      };
    }
  }, [userLocation]);

  const getUserLocation = async () => {
    try {
      setGettingLocation(true);

      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Konum İzni', 'Size en yakın işletmeleri gösterebilmek için konum iznine ihtiyacımız var. Varsayılan konum kullanılacak.');
        setUserLocation({ latitude: 41.0082, longitude: 28.9784 });
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      setUserLocation({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });
    } catch (error) {
      console.error('Error getting location:', error);
      Alert.alert('Konum Hatası', 'Konumunuz alınamadı. Varsayılan konum kullanılacak.');
      setUserLocation({ latitude: 41.0082, longitude: 28.9784 });
    } finally {
      setGettingLocation(false);
    }
  };

  const isBusinessOpen = (business: Business): boolean => {
    if (!business.opening_time || !business.closing_time) return true;

    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();

    const [openHour, openMin] = business.opening_time.split(':').map(Number);
    const [closeHour, closeMin] = business.closing_time.split(':').map(Number);

    const openingMinutes = openHour * 60 + openMin;
    const closingMinutes = closeHour * 60 + closeMin;

    if (closingMinutes < openingMinutes) {
      return currentTime >= openingMinutes || currentTime <= closingMinutes;
    }

    return currentTime >= openingMinutes && currentTime <= closingMinutes;
  };

  const loadBusinesses = async (reset = true) => {
    if (!userLocation) return;

    if (reset) {
      setLoading(true);
      setPage(0);
      setHasMore(true);
    }

    try {
      const currentPage = reset ? 0 : page;
      const { data, error } = await supabase.rpc('get_nearby_businesses', {
        user_lat: userLocation.latitude,
        user_lng: userLocation.longitude,
        max_distance_km: MAX_DISTANCE_KM,
        limit_count: ITEMS_PER_PAGE,
        offset_count: currentPage * ITEMS_PER_PAGE
      });

      if (error) throw error;

      const businessesWithDistance = (data || []).map((business: any) => ({
        ...business,
        distance: business.distance_km
      }));

      if (reset) {
        setBusinesses(businessesWithDistance);
      } else {
        setBusinesses(prev => [...prev, ...businessesWithDistance]);
      }

      setHasMore(businessesWithDistance.length === ITEMS_PER_PAGE);
      if (!reset) {
        setPage(prev => prev + 1);
      }
    } catch (error) {
      console.error('Error loading businesses:', error);
      if (reset) {
        Alert.alert('Hata', 'İşletmeler yüklenirken bir hata oluştu');
      }
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const loadBusinessesSilently = async () => {
    await loadBusinesses(true);
  };

  const loadMoreBusinesses = async () => {
    if (loadingMore || !hasMore || loading) return;

    setLoadingMore(true);
    await loadBusinesses(false);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadBusinessesSilently();
    setRefreshing(false);
  };

  const handleSearch = async () => {
    if (!userLocation || !searchQuery.trim()) {
      Alert.alert('Uyarı', 'Lütfen arama yapılacak işletme veya hizmet adını girin');
      return;
    }

    setSearching(true);
    try {
      const { data, error } = await supabase.rpc('search_nearby_businesses', {
        user_lat: userLocation.latitude,
        user_lng: userLocation.longitude,
        max_distance_km: MAX_DISTANCE_KM,
        search_term: searchQuery.trim()
      });

      if (error) throw error;

      const businessesWithDistance = (data || []).map((business: any) => ({
        ...business,
        distance: business.distance_km
      }));

      setBusinesses(businessesWithDistance);
      setSearchModalVisible(false);
      setSearchQuery('');
      setHasMore(false);
    } catch (error) {
      console.error('Error searching businesses:', error);
      Alert.alert('Hata', 'Arama sırasında bir hata oluştu');
    } finally {
      setSearching(false);
    }
  };

  const clearSearch = async () => {
    setSearchQuery('');
    setSearchModalVisible(false);
    await loadBusinesses(true);
  };

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const openNavigation = (latitude: number, longitude: number, name: string) => {
    const url = Platform.select({
      ios: `maps://app?daddr=${latitude},${longitude}`,
      android: `google.navigation:q=${latitude},${longitude}`,
      default: `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`
    });

    Linking.canOpenURL(url).then((supported) => {
      if (supported) {
        Linking.openURL(url);
      } else {
        const webUrl = `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`;
        Linking.openURL(webUrl);
      }
    });
  };

  const renderBusiness = ({ item }: { item: BusinessWithDistance }) => {
    const isOpen = isBusinessOpen(item);

    return (
      <TouchableOpacity
        style={[styles.businessCard, !isOpen && styles.businessCardClosed]}
        onPress={() => {
          if (!isOpen) {
            Alert.alert('Kapalı', 'Bu işletme şu anda kapalı.');
            return;
          }
          router.push(`/(customer)/business/${item.id}`);
        }}
        activeOpacity={isOpen ? 0.7 : 1}
      >
        <View style={styles.businessHeader}>
          <View style={styles.businessHeaderLeft}>
            <Text style={[styles.businessName, !isOpen && styles.textClosed]}>{item.name}</Text>
            <View style={styles.badges}>
              <View style={styles.distanceBadge}>
                <MapPin size={14} color="#27ae60" />
                <Text style={styles.distanceText}>{item.distance.toFixed(1)} km</Text>
              </View>
            </View>
          </View>
          <TouchableOpacity
            style={styles.navigationButton}
            onPress={(e) => {
              e.stopPropagation();
              openNavigation(item.latitude, item.longitude, item.name);
            }}
          >
            <Navigation size={20} color="#27ae60" />
          </TouchableOpacity>
        </View>

        {item.description ? (
          <Text style={[styles.businessDescription, !isOpen && styles.textClosed]} numberOfLines={2}>
            {item.description}
          </Text>
        ) : null}

        <View style={styles.businessFooter}>
          <View style={styles.infoItem}>
            <MapPin size={16} color={!isOpen ? '#bdc3c7' : '#7f8c8d'} />
            <Text style={[styles.infoText, !isOpen && styles.textClosed]} numberOfLines={1}>
              {item.address}
            </Text>
          </View>

          {item.opening_time && item.closing_time && (
            <View style={[styles.statusBadge, isOpen ? styles.statusOpen : styles.statusClosed]}>
              <Clock size={14} color={isOpen ? '#27ae60' : '#e74c3c'} />
              <Text style={[styles.statusText, isOpen ? styles.statusTextOpen : styles.statusTextClosed]}>
                {isOpen ? 'Açık' : 'Kapalı'} • {item.opening_time.substring(0, 5)} - {item.closing_time.substring(0, 5)}
              </Text>
            </View>
          )}
        </View>

        {!isOpen && (
          <View style={styles.closedOverlay}>
            <Text style={styles.closedText}>KAPALI</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  if (gettingLocation || loading) {
    return (
      <View style={styles.loadingContainer}>
        <Navigation size={48} color="#27ae60" />
        <ActivityIndicator size="large" color="#27ae60" style={{ marginTop: 16 }} />
        <Text style={styles.loadingText}>
          {gettingLocation ? 'Konumunuz alınıyor...' : 'İşletmeler yükleniyor...'}
        </Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.title}>Yakınınızdaki İşletmeler</Text>
          <View style={styles.headerButtons}>
            <TouchableOpacity
              style={styles.searchButton}
              onPress={() => setSearchModalVisible(true)}
            >
              <Search size={18} color="#27ae60" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.refreshLocationButton}
              onPress={getUserLocation}
            >
              <Navigation size={18} color="#27ae60" />
            </TouchableOpacity>
          </View>
        </View>
        <Text style={styles.subtitle}>{MAX_DISTANCE_KM} km çapında işletmeler</Text>
      </View>

{businesses.length === 0 ? (
        <View style={styles.emptyContainer}>
          <MapPin size={48} color="#bdc3c7" />
          <Text style={styles.emptyText}>Yakınınızda işletme bulunamadı</Text>
          <Text style={styles.emptySubtext}>Daha sonra tekrar deneyin</Text>
        </View>
      ) : (
        <FlatList
          data={businesses}
          renderItem={renderBusiness}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          onEndReached={loadMoreBusinesses}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            loadingMore ? (
              <View style={styles.loadingMore}>
                <ActivityIndicator size="small" color="#27ae60" />
              </View>
            ) : null
          }
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#27ae60']}
              tintColor="#27ae60"
            />
          }
        />
      )}

      <Modal
        visible={searchModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setSearchModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>İşletme Ara</Text>
              <TouchableOpacity onPress={() => setSearchModalVisible(false)}>
                <X size={24} color="#2c3e50" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalDescription}>
              İşletme adı veya verdiği hizmet girin. Yakınlığa göre sonuçlar listelenir.
            </Text>

            <TextInput
              style={styles.searchInput}
              placeholder="Örn: Berber, Kafe, Pizza..."
              placeholderTextColor="#95a5a6"
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoFocus
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setSearchModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>İptal</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.searchActionButton]}
                onPress={handleSearch}
                disabled={searching}
              >
                {searching ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.searchButtonText}>Ara</Text>
                )}
              </TouchableOpacity>
            </View>

            {businesses.length > 0 && (
              <TouchableOpacity
                style={styles.clearSearchButton}
                onPress={clearSearch}
              >
                <Text style={styles.clearSearchText}>Aramayı Temizle</Text>
              </TouchableOpacity>
            )}
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
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#2c3e50',
    flex: 1,
    marginRight: 8,
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  searchButton: {
    backgroundColor: '#e8f8f5',
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#27ae60',
  },
  refreshLocationButton: {
    backgroundColor: '#e8f8f5',
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#27ae60',
  },
  subtitle: {
    fontSize: 15,
    color: '#7f8c8d',
  },
  listContent: {
    padding: 16,
  },
  businessCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    position: 'relative',
  },
  businessCardClosed: {
    opacity: 0.6,
  },
  businessHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  businessHeaderLeft: {
    flex: 1,
  },
  businessName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2c3e50',
    marginBottom: 4,
  },
  badges: {
    flexDirection: 'row',
    gap: 8,
  },
  navigationButton: {
    backgroundColor: '#e8f8f5',
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#27ae60',
    marginLeft: 8,
  },
  distanceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e8f8f5',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 4,
  },
  distanceText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#27ae60',
  },
  businessDescription: {
    fontSize: 14,
    color: '#7f8c8d',
    lineHeight: 20,
    marginBottom: 12,
  },
  businessFooter: {
    borderTopWidth: 1,
    borderTopColor: '#ecf0f1',
    paddingTop: 12,
    gap: 8,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#7f8c8d',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  statusOpen: {
    backgroundColor: '#e8f8f5',
  },
  statusClosed: {
    backgroundColor: '#ffebee',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  statusTextOpen: {
    color: '#27ae60',
  },
  statusTextClosed: {
    color: '#e74c3c',
  },
  textClosed: {
    color: '#bdc3c7',
  },
  closedOverlay: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: '#e74c3c',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  closedText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
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
  loadingMore: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#2c3e50',
  },
  modalDescription: {
    fontSize: 14,
    color: '#7f8c8d',
    marginBottom: 20,
    lineHeight: 20,
  },
  searchInput: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#2c3e50',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#ecf0f1',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#7f8c8d',
  },
  searchActionButton: {
    backgroundColor: '#27ae60',
  },
  searchButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  clearSearchButton: {
    marginTop: 16,
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#fff3cd',
    alignItems: 'center',
  },
  clearSearchText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#856404',
  },
});
