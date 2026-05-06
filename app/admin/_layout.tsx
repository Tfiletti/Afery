import { useEffect } from 'react';
import { Stack, useRouter } from 'expo-router';
import { useAuth } from '../../src/context/AuthContext';
import { Alert, ActivityIndicator, View } from 'react-native';

export default function AdminLayout() {
  const { role, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Só age quando o carregamento do perfil terminar
    if (!loading) {
      if (role !== 'ADMIN') {
        Alert.alert('Acesso Restrito', 'Apenas administradores podem acessar o Painel.');
        // Substitui a rota para não permitir que o usuário volte com o botão físico
        router.replace('/(tabs)'); 
      }
    }
  }, [role, loading]);

  // CORREÇÃO UX: Enquanto o banco resolve o RLS (evitando o erro 42P17),
  // mostramos um loading em vez de uma tela branca ou o Layout incompleto.
  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FAFAFA' }}>
        <ActivityIndicator size="large" color="#1E3A8A" />
      </View>
    );
  }

  // Se não for ADMIN e não estiver carregando, o useEffect acima cuidará do replace.
  // Retornamos null aqui para garantir que o Stack não monte as telas indevidamente.
  if (role !== 'ADMIN') return null;

  return (
    <Stack 
      screenOptions={{ 
        headerShown: true, 
        headerStyle: { backgroundColor: '#1E3A8A' },
        headerTintColor: '#FFF',
        headerTitleStyle: { fontWeight: 'bold' },
        contentStyle: { backgroundColor: '#FAFAFA' },
        // Animação de slide lateral padrão
        animation: 'slide_from_right', 
      }} 
    >
      {/* 
        DICA ADS: Defina explicitamente suas telas aqui para sumir com os 
        warnings de "Route exists in nested children". 
      */}
      <Stack.Screen name="index" options={{ title: 'Painel Admin' }} />
      <Stack.Screen name="equipe" options={{ title: 'Gestão de Equipe' }} />
    </Stack>
  );
}