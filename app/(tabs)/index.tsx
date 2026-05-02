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
  const [busca, setBusca] = useState(''); 

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
          <Ionicons name="search" size={18} color="#94A3B8" />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar família..."
            placeholderTextColor="#94A3B8"
            value={busca}
            onChangeText={setBusca}
            autoCorrect={false}
          />
          {busca.length > 0 && (
            <TouchableOpacity onPress={() => setBusca('')} style={{ padding: 4 }}>
              <Ionicons name="close-circle" size={18} color="#CBD5E1" />
            </TouchableOpacity>
          )}
        </View>

        {carregando ? (
          <ActivityIndicator size="large" color="#005b9f" style={{ marginTop: 50 }} />
        ) : (
          <FlatList
            data={familiasFiltradas} 
            keyExtractor={(item: any) => item.id.toString()}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ 
              paddingBottom: insets.bottom + 160 // Aumentado para o FAB não tampar o último item!
            }}
            renderItem={({ item }) => (
              <TouchableOpacity 
                style={styles.cardFamilias} 
                onPress={() => aoClicarNaFamilia(item.id, item.nome)} 
                activeOpacity={0.7}
              >
                <View style={styles.cardHeader}>
                  <Text style={styles.cardTag}>Rótulos e Embalagens</Text>
                  <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
                </View>
                <Text style={styles.cardTitle}>{item.nome}</Text>
                <Text style={styles.cardDescription}>Materiais cadastrados para conferência</Text>
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons name="search-outline" size={36} color="#CBD5E1" />
                <Text style={styles.emptyText}>
                    {busca ? "Nenhuma família encontrada." : "Nenhuma família cadastrada."}
                </Text>
              </View>
            }
          />
        )}
      </View>

      {/* --- BOTÃO FLUTUANTE ADMIN --- */}
      {role === 'ADMIN' && (
        <TouchableOpacity 
          style={[styles.fabAdmin, { bottom: insets.bottom + 100 }]} // Subiu de 90 para 130 para desgrudar da barra
          onPress={() => router.push('/admin')} 
          activeOpacity={0.8}
        >
          <Ionicons name="settings" size={22} color="#FFFFFF" />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  header: { 
    backgroundColor: '#FFFFFF', 
    paddingBottom: 12, 
    paddingHorizontal: 20, 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    elevation: 3 
  },
  logoContainer: { flexDirection: 'row', alignItems: 'center' },
  logoSC: { width: 32, height: 32, backgroundColor: '#F59E0B', borderRadius: 4, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  logoSCText: { color: '#FFFFFF', fontSize: 18, fontWeight: 'bold' },
  logoSmart: { color: '#F59E0B', fontSize: 16, fontWeight: 'bold', lineHeight: 18 },
  logoCount: { color: '#1F2937', fontSize: 12, fontWeight: 'bold', letterSpacing: 1 },
  headerTitleContainer: { flex: 1, alignItems: 'flex-end' },
  headerTitle: { fontSize: 10, color: '#9CA3AF', fontWeight: 'bold', textTransform: 'uppercase' },
  content: { flex: 1, paddingHorizontal: 20, paddingTop: 15 },
  sectionTitle: { fontSize: 16, color: '#111827', fontWeight: 'bold', marginBottom: 12 },
  
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF', 
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 15,
    height: 42,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    borderWidth: 1,
    borderColor: '#E5E7EB'
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    color: '#1E293B',
  },

  cardFamilias: { 
    backgroundColor: '#FFFFFF', 
    padding: 14, 
    borderRadius: 10, 
    marginBottom: 10, 
    elevation: 1, 
    borderLeftWidth: 5, 
    borderLeftColor: '#F59E0B',
    borderWidth: 1,
    borderColor: '#F3F4F6'
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  cardTag: { fontSize: 10, color: '#9CA3AF', fontWeight: 'bold', textTransform: 'uppercase' },
  cardTitle: { fontSize: 18, fontWeight: 'bold', color: '#1F2937' },
  cardDescription: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  
  emptyContainer: { alignItems: 'center', marginTop: 40 },
  emptyText: { textAlign: 'center', marginTop: 10, color: '#94A3B8', fontSize: 14 },

  fabAdmin: {
    position: 'absolute',
    left: 20, 
    backgroundColor: '#1E3A8A', 
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5, 
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
});