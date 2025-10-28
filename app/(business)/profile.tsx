import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { User, Mail, LogOut, Store, Clock, ShieldCheck } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { Business } from '@/types/database';

export default function BusinessProfile() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const [business, setBusiness] = useState<Business | null>(null);
  const [loading, setLoading] = useState(true);
  const [isBusinessOpen, setIsBusinessOpen] = useState(true);

  useEffect(() => {
    if (user) {
      loadBusiness();
    }
  }, [user]);

  useEffect(() => {
    if (business) {
      checkIfOpen();
      const interval = setInterval(checkIfOpen, 60000);
      return () => clearInterval(interval);
    }
  }, [business]);

  const loadBusiness = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('businesses')
        .select('*')
        .eq('owner_id', user.id)
        .maybeSingle();

      if (error) throw error;
      setBusiness(data);
    } catch (error) {
      console.error('Error loading business:', error);
    } finally {
      setLoading(false);
    }
  };

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

    setIsBusinessOpen(currentTime >= openingMinutes && currentTime <= closingMinutes);
  };


  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Profil</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.profileCard}>
          <View style={styles.avatarContainer}>
            <Store size={48} color="#3498db" />
          </View>
          <Text style={styles.name}>{user?.full_name}</Text>
          <View style={styles.emailContainer}>
            <Mail size={16} color="#7f8c8d" />
            <Text style={styles.email}>{user?.email}</Text>
          </View>
          <View style={styles.typeBadge}>
            <Text style={styles.typeText}>İşletme Hesabı</Text>
          </View>
        </View>

        {loading ? (
          <View style={styles.loadingCard}>
            <ActivityIndicator size="small" color="#3498db" />
          </View>
        ) : business ? (
          <View style={styles.businessCard}>
            <View style={styles.businessHeader}>
              <Text style={styles.businessTitle}>{business.name}</Text>
              <View style={[styles.statusBadge, isBusinessOpen ? styles.statusOpen : styles.statusClosed]}>
                <Text style={styles.statusText}>{isBusinessOpen ? 'Açık' : 'Kapalı'}</Text>
              </View>
            </View>

            {business.opening_time && business.closing_time && (
              <View style={styles.hoursSection}>
                <Clock size={20} color={isBusinessOpen ? '#27ae60' : '#e74c3c'} />
                <View style={styles.hoursInfo}>
                  <Text style={styles.hoursLabel}>Çalışma Saatleri</Text>
                  <Text style={[styles.hoursText, { color: isBusinessOpen ? '#27ae60' : '#e74c3c' }]}>
                    {business.opening_time.substring(0, 5)} - {business.closing_time.substring(0, 5)}
                  </Text>
                </View>
              </View>
            )}
          </View>
        ) : null}

        <TouchableOpacity
          style={styles.privacyButton}
          onPress={() => router.push('/(business)/privacy')}
        >
          <ShieldCheck size={20} color="#3498db" />
          <Text style={styles.privacyText}>Gizlilik Politikası</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
          <LogOut size={20} color="#e74c3c" />
          <Text style={styles.signOutText}>Çıkış Yap</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  profileCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  avatarContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#ebf5fb',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  name: {
    fontSize: 22,
    fontWeight: '700',
    color: '#2c3e50',
    marginBottom: 8,
  },
  emailContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  email: {
    fontSize: 15,
    color: '#7f8c8d',
  },
  typeBadge: {
    backgroundColor: '#ebf5fb',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
  },
  typeText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#3498db',
  },
  privacyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    gap: 10,
    borderWidth: 1,
    borderColor: '#3498db',
    marginBottom: 12,
  },
  privacyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3498db',
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    gap: 10,
    borderWidth: 1,
    borderColor: '#e74c3c',
  },
  signOutText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#e74c3c',
  },
  loadingCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  businessCard: {
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
  businessHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  businessTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: '700',
    color: '#2c3e50',
    marginRight: 12,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  statusOpen: {
    backgroundColor: '#27ae60',
  },
  statusClosed: {
    backgroundColor: '#e74c3c',
  },
  statusText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  hoursSection: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  hoursInfo: {
    flex: 1,
  },
  hoursLabel: {
    fontSize: 13,
    color: '#7f8c8d',
    fontWeight: '600',
    marginBottom: 4,
  },
  hoursText: {
    fontSize: 18,
    fontWeight: '700',
  },
});
