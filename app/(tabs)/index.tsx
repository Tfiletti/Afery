import { useEffect, useState } from 'react';
import { StyleSheet, Text, View, FlatList, ActivityIndicator, TouchableOpacity, StatusBar, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../src/supabase';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons'; 
import { useAuth } from '../../src/context/AuthContext'; 

const HeaderHome = ({ topInset }: { topInset: number }) => (
  <View style={[styles.header, { paddingTop: topInset + 15 }]}>
    <View style={styles.logoContainer}>
      <View style={styles.logoSC}><Text style={styles.logoSCText}>SC</Text></View>
      <View>
        <Text style={styles.logoSmart}>SMART</Text>
        <Text style={styles.logoCount}>COUNT</Text>
      </View>
    </View>
    <View style={styles.headerTitleContainer}>
      <Text style={styles.headerTitle}>Sistemas de Inventário</Text>
    </View>
  </View>
);

export default function TelaInicial() {
  const [familias, setFamilias] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [busca, setBusca] = useState(''); // Estado da barra de pesquisa

  const router = useRouter();
  const insets = useSafeAreaInsets();
  
  const { role } = useAuth();

  useEffect(() => {
    async function buscarFamilias() {
      const { data, error } = await supabase.from('familias').select('*');
      if (data) setFamilias(data);
      setCarregando(false);
    }
    buscarFamilias();
  }, []);

  const aoClicarNaFamilia = (familiaId: string, familiaNome: string) => {
    router.push({
      pathname: '/itens', 
      params: { 
        familiaId: familiaId, 
        familiaNome: familiaNome 
      }
    });
  };

  // Filtro local da barra de pesquisa
  const familiasFiltradas = familias.filter((item: any) => {
    if (busca === '') return true;
    const termoBusca = busca.toLowerCase();
    const nomeFamilia = item.nome?.toLowerCase() || '';
    return nomeFamilia.includes(termoBusca);
  });

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <HeaderHome topInset={insets.top} />

      <View style={styles.content}>
        <Text style={styles.sectionTitle}>Selecione uma família:</Text>

        {/* --- CAMPO DE PESQUISA --- */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#94A3B8" />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar família..."
            placeholderTextColor="#94A3B8"
            value={busca}
            onChangeText={setBusca}
            autoCorrect={false}
          />
          {busca.length > 0 && (
            <TouchableOpacity onPress={() => setBusca('')}>
              <Ionicons name="close-circle" size={20} color="#CBD5E1" />
            </TouchableOpacity>
          )}
        </View>

        {carregando ? (
          <ActivityIndicator size="large" color="#005b9f" style={{ marginTop: 50 }} />
        ) : (
          <FlatList
            data={familiasFiltradas} // Usa a lista filtrada
            keyExtractor={(item: any) => item.id.toString()}
            contentContainerStyle={{ 
              paddingBottom: insets.bottom + 120 
            }}
            renderItem={({ item }) => (
              <TouchableOpacity 
                style={styles.cardFamilias} 
                onPress={() => aoClicarNaFamilia(item.id, item.nome)} 
                activeOpacity={0.7}
              >
                <View style={styles.cardHeader}>
                  <Text style={styles.cardTag}>Rótulos e Embalagens</Text>
                  <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
                </View>
                <Text style={styles.cardTitle}>{item.nome}</Text>
                <Text style={styles.cardDescription}>Materiais cadastrados para conferência</Text>
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons name="search-outline" size={40} color="#CBD5E1" />
                <Text style={styles.emptyText}>
                    {busca ? "Nenhuma família encontrada." : "Nenhuma família cadastrada."}
                </Text>
              </View>
            }
          />
        )}
      </View>

      {/* --- BOTÃO FLUTUANTE ADMIN (Canto Inferior Esquerdo) --- */}
      {role === 'ADMIN' && (
        <TouchableOpacity 
          // Ajustei o 'bottom' para 110, assim ele não fica "engolido" pela barra
          style={[styles.fabAdmin, { bottom: insets.bottom + 110 }]} 
          onPress={() => router.push('/admin')} 
          activeOpacity={0.8}
        >
          <Ionicons name="settings" size={26} color="#FFFFFF" />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  header: { 
    backgroundColor: '#FFFFFF', 
    paddingBottom: 15, 
    paddingHorizontal: 20, 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    elevation: 4 
  },
  logoContainer: { flexDirection: 'row', alignItems: 'center' },
  logoSC: { width: 36, height: 36, backgroundColor: '#F59E0B', borderRadius: 4, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  logoSCText: { color: '#FFFFFF', fontSize: 20, fontWeight: 'bold' },
  logoSmart: { color: '#F59E0B', fontSize: 18, fontWeight: 'bold', lineHeight: 20 },
  logoCount: { color: '#1F2937', fontSize: 14, fontWeight: 'bold', letterSpacing: 1.2 },
  headerTitleContainer: { flex: 1, alignItems: 'flex-end' },
  headerTitle: { fontSize: 12, color: '#9CA3AF', fontWeight: 'bold', textTransform: 'uppercase' },
  content: { flex: 1, paddingHorizontal: 20, paddingTop: 20 },
  sectionTitle: { fontSize: 20, color: '#111827', fontWeight: 'bold', marginBottom: 15 },
  
  // Estilos da Barra de Pesquisa
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF', // Fundo branco para destacar no cinza
    borderRadius: 12,
    paddingHorizontal: 12,
    marginBottom: 20,
    height: 50,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 15,
    color: '#1E293B',
    fontWeight: '500',
  },

  cardFamilias: { 
    backgroundColor: '#FFFFFF', 
    padding: 20, 
    borderRadius: 16, 
    marginBottom: 16, 
    elevation: 3, 
    borderLeftWidth: 6, 
    borderLeftColor: '#F59E0B' 
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  cardTag: { fontSize: 11, color: '#9CA3AF', fontWeight: 'bold', textTransform: 'uppercase' },
  cardTitle: { fontSize: 24, fontWeight: 'bold', color: '#1F2937' },
  cardDescription: { fontSize: 14, color: '#6B7280', marginTop: 4 },
  
  emptyContainer: { alignItems: 'center', marginTop: 50 },
  emptyText: { textAlign: 'center', marginTop: 10, color: '#94A3B8', fontSize: 16 },

  // --- ESTILOS DO FAB ADMIN ---
  fabAdmin: {
    position: 'absolute',
    left: 20, // Canto Esquerdo
    backgroundColor: '#1E3A8A', // Azul Tech
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6, // Sombra no Android
    shadowColor: '#000', // Sombra no iOS
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
});