// app/admin/_layout.tsx
import { useEffect } from 'react';
import { Stack, useRouter } from 'expo-router';
import { useAuth } from '../../src/context/AuthContext';
import { Alert } from 'react-native';

export default function AdminLayout() {
  const { role, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Se terminou de carregar e o usuário não for ADMIN, expulsa ele
    if (!loading && role !== 'ADMIN') {
      Alert.alert('Acesso Restrito', 'Apenas administradores podem acessar o Painel de Configurações.');
      router.replace('/(tabs)'); // Manda de volta para as telas de contagem
    }
  }, [role, loading]);

  // Enquanto carrega ou se não for admin, não renderiza nada da pasta admin
  if (loading || role !== 'ADMIN') return null;

  // Se passou no teste, libera as telas de admin com um cabeçalho padrão
  return (
    <Stack 
      screenOptions={{ 
        headerShown: true, 
        headerStyle: { backgroundColor: '#1E3A8A' }, // Azul Tech
        headerTintColor: '#FFF',
        contentStyle: { backgroundColor: '#FAFAFA' }
      }} 
    />
  );
}