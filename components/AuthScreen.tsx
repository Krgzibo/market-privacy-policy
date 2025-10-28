import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { UserType } from '@/types/database';

export default function AuthScreen() {
  const { signIn, signUp } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [userType, setUserType] = useState<UserType>('customer');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleAuth = async () => {
    if (!email || !password) {
      setError('Lütfen tüm alanları doldurun');
      return;
    }

    if (!isLogin && !fullName) {
      setError('Lütfen adınızı girin');
      return;
    }

    setError('');
    setSuccess('');
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await signIn(email, password);
        if (error) setError(error.message);
      } else {
        const { error } = await signUp(email, password, fullName, userType);
        if (error) setError(error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      setError('Lütfen e-posta adresinizi girin');
      return;
    }

    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const { supabase } = await import('@/lib/supabase');
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window?.location?.origin || 'myapp://reset-password',
      });

      if (error) {
        setError(error.message);
      } else {
        setSuccess('Şifre sıfırlama bağlantısı e-posta adresinize gönderildi.');
        setTimeout(() => {
          setIsForgotPassword(false);
          setIsLogin(true);
        }, 3000);
      }
    } catch (err) {
      setError('Bir hata oluştu. Lütfen tekrar deneyin.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={styles.title}>Hazırla Geldim</Text>
          <Text style={styles.subtitle}>Gel-Al Sipariş Sistemi</Text>
        </View>

        <View style={styles.form}>
          {!isForgotPassword && (
            <View style={styles.userTypeContainer}>
              <TouchableOpacity
                style={[styles.userTypeButton, userType === 'customer' && styles.userTypeButtonActive]}
                onPress={() => setUserType('customer')}
              >
                <Text style={[styles.userTypeText, userType === 'customer' && styles.userTypeTextActive]}>
                  Kullanıcı
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.userTypeButton, userType === 'business' && styles.userTypeButtonActive]}
                onPress={() => setUserType('business')}
              >
                <Text style={[styles.userTypeText, userType === 'business' && styles.userTypeTextActive]}>
                  İşletme
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {!isLogin && !isForgotPassword && (
            <TextInput
              style={styles.input}
              placeholder="Ad Soyad"
              value={fullName}
              onChangeText={setFullName}
              autoCapitalize="words"
            />
          )}

          <TextInput
            style={styles.input}
            placeholder="E-posta"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />

          {!isForgotPassword && (
            <TextInput
              style={styles.input}
              placeholder="Şifre"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
          )}

          {error ? <Text style={styles.error}>{error}</Text> : null}
          {success ? <Text style={styles.success}>{success}</Text> : null}

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={isForgotPassword ? handleForgotPassword : handleAuth}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>
                {isForgotPassword ? 'Şifre Sıfırla' : (isLogin ? 'Giriş Yap' : 'Kayıt Ol')}
              </Text>
            )}
          </TouchableOpacity>

          {isLogin && !isForgotPassword && (
            <TouchableOpacity
              style={styles.forgotButton}
              onPress={() => {
                setIsForgotPassword(true);
                setError('');
                setSuccess('');
              }}
            >
              <Text style={styles.forgotText}>Şifremi Unuttum</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.switchButton}
            onPress={() => {
              if (isForgotPassword) {
                setIsForgotPassword(false);
              } else {
                setIsLogin(!isLogin);
              }
              setError('');
              setSuccess('');
            }}
          >
            <Text style={styles.switchText}>
              {isForgotPassword
                ? 'Giriş sayfasına dön'
                : (isLogin ? 'Hesabınız yok mu? Kayıt olun' : 'Zaten hesabınız var mı? Giriş yapın')}
            </Text>
          </TouchableOpacity>

          <View style={styles.footer}>
            <Text style={styles.footerText}>© 2025 Hazırla Geldim</Text>
            <Text style={styles.footerText}>Tüm hakları saklıdır</Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#2c3e50',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#7f8c8d',
  },
  form: {
    width: '100%',
  },
  userTypeContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  userTypeButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#e0e0e0',
    alignItems: 'center',
  },
  userTypeButtonActive: {
    backgroundColor: '#3498db',
    borderColor: '#3498db',
  },
  userTypeText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#7f8c8d',
  },
  userTypeTextActive: {
    color: '#fff',
  },
  input: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    fontSize: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  button: {
    backgroundColor: '#27ae60',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  switchButton: {
    marginTop: 24,
    alignItems: 'center',
  },
  switchText: {
    color: '#3498db',
    fontSize: 15,
    fontWeight: '500',
  },
  error: {
    color: '#e74c3c',
    fontSize: 14,
    marginBottom: 12,
    textAlign: 'center',
  },
  success: {
    color: '#27ae60',
    fontSize: 14,
    marginBottom: 12,
    textAlign: 'center',
  },
  forgotButton: {
    marginTop: 12,
    alignItems: 'center',
  },
  forgotText: {
    color: '#e74c3c',
    fontSize: 14,
    fontWeight: '500',
  },
  footer: {
    marginTop: 40,
    alignItems: 'center',
    gap: 4,
  },
  footerText: {
    fontSize: 12,
    color: '#95a5a6',
  },
});
