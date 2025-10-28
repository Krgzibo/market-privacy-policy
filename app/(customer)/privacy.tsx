import React from 'react';
import { ScrollView, View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function PrivacyPolicy() {
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Gizlilik Politikası</Text>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <Text style={styles.lastUpdated}>Son Güncelleme: 28 Ekim 2025</Text>

        <Text style={styles.sectionTitle}>1. TOPLANAN BİLGİLER</Text>
        <Text style={styles.paragraph}>Uygulamamız aşağıdaki bilgileri toplar:</Text>
        <Text style={styles.listItem}>• Hesap Bilgileri: Email adresi ve şifre (şifreli olarak saklanır)</Text>
        <Text style={styles.listItem}>• Konum Bilgisi: Yakındaki işletmeleri göstermek için GPS konumunuz</Text>
        <Text style={styles.listItem}>• İşletme Bilgileri: İşletme sahipleri için işletme adı, adres, telefon, çalışma saatleri ve açıklama</Text>
        <Text style={styles.listItem}>• Sipariş Bilgileri: Ürün detayları, fiyat bilgileri, sipariş notları ve müşteri adı</Text>
        <Text style={styles.listItem}>• Mesajlaşma Verileri: İşletme ve müşteriler arası mesajlar</Text>

        <Text style={styles.sectionTitle}>2. BİLGİLERİN KULLANIMI</Text>
        <Text style={styles.paragraph}>Topladığımız bilgiler şu amaçlarla kullanılır:</Text>
        <Text style={styles.listItem}>• Yakınınızdaki işletmeleri bulmanızı sağlamak</Text>
        <Text style={styles.listItem}>• Sipariş oluşturmanızı ve takip etmenizi kolaylaştırmak</Text>
        <Text style={styles.listItem}>• İşletme sahipleri ve müşteriler arasında iletişimi sağlamak</Text>
        <Text style={styles.listItem}>• Hizmet kalitesini artırmak ve uygulama deneyimini iyileştirmek</Text>
        <Text style={styles.listItem}>• Teknik sorunları çözmek ve güvenliği sağlamak</Text>

        <Text style={styles.sectionTitle}>3. VERİ GÜVENLİĞİ</Text>
        <Text style={styles.paragraph}>
          Verilerinizin güvenliği bizim için önceliklidir. Tüm verileriniz Supabase altyapısında güvenli bir şekilde saklanır.
          Supabase, endüstri standardı güvenlik protokollerini kullanır:
        </Text>
        <Text style={styles.listItem}>• Şifreler güvenli bir şekilde hash'lenir ve asla düz metin olarak saklanmaz</Text>
        <Text style={styles.listItem}>• Tüm veri transferleri SSL/TLS ile şifrelenir</Text>
        <Text style={styles.listItem}>• Veritabanı erişimi sıkı güvenlik kurallarıyla korunur</Text>

        <Text style={styles.sectionTitle}>4. ÜÇÜNCÜ TARAF PAYLAŞIMI</Text>
        <Text style={styles.paragraph}>
          Kişisel bilgileriniz kesinlikle üçüncü taraflarla paylaşılmaz, satılmaz veya kiralanmaz.
          Verileriniz sadece uygulama içindeki hizmetleri sağlamak için kullanılır.
        </Text>

        <Text style={styles.sectionTitle}>5. KONUM İZNİ</Text>
        <Text style={styles.paragraph}>
          Konum izni isteğe bağlıdır ve sadece yakınınızdaki işletmeleri göstermek için kullanılır.
          İzin vermezseniz, uygulama varsayılan bir konum kullanır. Konum bilginiz sürekli olarak izlenmez,
          sadece işletmeleri ararken kullanılır.
        </Text>

        <Text style={styles.sectionTitle}>6. HAKLARINIZ</Text>
        <Text style={styles.paragraph}>Kullanıcı olarak aşağıdaki haklara sahipsiniz:</Text>
        <Text style={styles.listItem}>• Verilerinizi görüntüleme hakkı</Text>
        <Text style={styles.listItem}>• Verilerinizi düzeltme hakkı</Text>
        <Text style={styles.listItem}>• Verilerinizi silme hakkı</Text>
        <Text style={styles.listItem}>• Hesabınızı tamamen kapatma hakkı</Text>
        <Text style={styles.listItem}>• Veri işleme faaliyetlerine itiraz etme hakkı</Text>

        <Text style={styles.sectionTitle}>7. ÇOCUKLARIN GİZLİLİĞİ</Text>
        <Text style={styles.paragraph}>
          Uygulamamız 13 yaşın altındaki çocuklara yönelik değildir.
          Bilerek 13 yaşın altındaki çocuklardan kişisel bilgi toplamayız.
        </Text>

        <Text style={styles.sectionTitle}>8. ÇEREZLER VE İZLEME TEKNOLOJİLERİ</Text>
        <Text style={styles.paragraph}>
          Uygulamamız, kullanıcı deneyimini iyileştirmek için oturum bilgilerini saklar.
          Bu bilgiler sadece kimlik doğrulama ve temel uygulama işlevselliği için kullanılır.
        </Text>

        <Text style={styles.sectionTitle}>9. DEĞİŞİKLİKLER</Text>
        <Text style={styles.paragraph}>
          Bu gizlilik politikası zaman zaman güncellenebilir. Önemli değişiklikler olduğunda,
          bu sayfada ve uygulama içinde bildirim yapılacaktır. Politika değişikliklerini düzenli olarak
          kontrol etmenizi öneririz.
        </Text>

        <View style={styles.contactSection}>
          <Text style={styles.sectionTitle}>10. İLETİŞİM</Text>
          <Text style={styles.paragraph}>
            Gizlilik politikamız veya verileriniz hakkında sorularınız varsa, lütfen bizimle iletişime geçin:
          </Text>
          <Text style={styles.contactEmail}>Email: krgzibo1453@gmail.com</Text>
        </View>
      </ScrollView>
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
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  lastUpdated: {
    fontSize: 14,
    color: '#7f8c8d',
    fontStyle: 'italic',
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#3498db',
    marginTop: 24,
    marginBottom: 12,
  },
  paragraph: {
    fontSize: 15,
    lineHeight: 24,
    color: '#2c3e50',
    marginBottom: 12,
  },
  listItem: {
    fontSize: 15,
    lineHeight: 24,
    color: '#2c3e50',
    marginBottom: 8,
    paddingLeft: 8,
  },
  contactSection: {
    backgroundColor: '#e8f8f5',
    padding: 20,
    borderRadius: 12,
    marginTop: 24,
    marginBottom: 32,
  },
  contactEmail: {
    fontSize: 15,
    fontWeight: '600',
    color: '#27ae60',
    marginTop: 8,
  },
});
