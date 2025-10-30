import { Tabs } from 'expo-router';
import { Store, Package, ListOrdered, User } from 'lucide-react-native';

export default function BusinessLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#3498db',
        tabBarInactiveTintColor: '#95a5a6',
        tabBarStyle: {
          backgroundColor: '#fff',
          borderTopWidth: 1,
          borderTopColor: '#e0e0e0',
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
        },
      }}
    >
      <Tabs.Screen
        name="business"
        options={{
          title: 'İşletme',
          tabBarIcon: ({ size, color }) => <Store size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="products"
        options={{
          title: 'Ürünler',
          tabBarIcon: ({ size, color }) => <Package size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="index"
        options={{
          title: 'Siparişler',
          tabBarIcon: ({ size, color }) => <ListOrdered size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profil',
          tabBarIcon: ({ size, color }) => <User size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="chat/[orderId]"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="privacy"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}
