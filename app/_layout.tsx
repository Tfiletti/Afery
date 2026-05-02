// app/_layout.tsx - Base do Thomas + Blindagem SaaS Auth
import { useEffect } from 'react';
import { Slot, useRouter, useSegments, Stack } from 'expo-router'; // Importações necessárias
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

// ASSUMPTION: Thomas criou src/context/AuthContext.tsx conforme combinado
// Se o caminho estiver diferente, ajuste abaixo.
import { AuthProvider, useAuth } from '../src/context/AuthContext'; 

// 1. O componente que decide qual Navigator mostrar (Logic Layer)
// É aqui que a mágica SaaS acontece
const RootLayoutNav = () => {
  const { session, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return; // Espera o Supabase responder se há sessão

    // Verifica se a rota atual começa com (auth)
    const inAuthGroup = segments[0] === '(auth)';

    if (!session && !inAuthGroup) {
      // 2. Não logado e tentando acessar o app -> Manda pra Login
      router.replace('/(auth)/login');
    } else if (session && inAuthGroup) {
      // 3. Logado e tentando acessar o login -> Manda pras Abas (ou rota principal)
      router.replace('/(tabs)');
    }
  }, [session, loading, segments]);

  if (loading) {
    // 4. Enquanto carrega, podemos mostrar uma Splash Screen premium (conforme image_9.png)
    // Se não tiver uma, mantenha como null para o Expo Router
    return null; 
  }

  // Se passou pelas validações, renderizamos as rotas normais
  // Mantemos o Stack original do Thomas para as rotas protegidas
  return (
    <Stack 
      screenOptions={{ 
        headerShown: false, // Mantém escondido o header nativo (conforme image_13.png)
        contentStyle: { backgroundColor: '#FAFAFA' } // Define a cor de fundo padrão
      }} 
    />
  );
};

// 5. O componente principal que engloba tudo com o Provedor de Autenticação
export default function RootLayout() {
  return (
    <AuthProvider>
      <SafeAreaProvider>
        
        {/* Mantemos a StatusBar original do Thomas */}
        <StatusBar style="dark" backgroundColor="#FFFFFF" translucent={false} />

        {/* O Navigator inteligente com a lógica SaaS */}
        <RootLayoutNav />
        
      </SafeAreaProvider>
    </AuthProvider>
  );
}