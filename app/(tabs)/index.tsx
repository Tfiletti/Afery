import { useEffect, useState } from 'react';
import { StyleSheet, Text, View, FlatList, ActivityIndicator, TouchableOpacity, StatusBar, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../src/supabase';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons'; 
import { useAuth } from '../../src/context/AuthContext'; 

const HeaderHome = ({ topInset }: { topInset: number }) => (
  <View style={[styles.header, { paddingTop: topInset + 10 }]}>
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
  const { role, organizacao_id } = useAuth();

  useEffect(() => {
    async function buscarFamilias() {
      if (!organizacao_id) return;
      const { data, error } = await supabase
        .from('familias')
        .select('*')
        .eq('organizacao_id', organizacao_id)
        .order('nome', { ascending: true });

      if (data) setFamilias(data);
      setCarregando(false);
    }
    buscarFamilias();
  }, [organizacao_id]);

  const aoClicarNaFamilia = (familiaId: string, familiaNome: string) => {
    router.push({
      pathname: '/itens', 
      params: { familiaId, familiaNome }
    });
  };

  const familiasFiltradas = familias.filter((item: any) => {
    const termoBusca = busca.toLowerCase();
    return (item.nome?.toLowerCase() || '').includes(termoBusca);
  });

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <HeaderHome topInset={insets.top} />

      <View style={styles.content}>
        <Text style={styles.sectionTitle}>Selecione uma família:</Text>

        <View style={styles.searchContainer}>
          <Ionicons name="search" size={16} color="#94A3B8" />
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
              <Ionicons name="close-circle" size={16} color="#CBD5E1" />
            </TouchableOpacity>
          )}
        </View>

        {carregando ? (
          <ActivityIndicator size="large" color="#F59E0B" style={{ marginTop: 50 }} />
        ) : (
          <FlatList
            data={familiasFiltradas} 
            keyExtractor={(item: any) => item.id.toString()}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: insets.bottom + 160 }}
            renderItem={({ item }) => (
              <TouchableOpacity 
                style={styles.cardFamilias} 
                onPress={() => aoClicarNaFamilia(item.id, item.nome)} 
                activeOpacity={0.7}
              >
                <View style={styles.cardHeader}>
                  <Text style={styles.cardTag}>Família de Materiais</Text>
                  <Ionicons name="chevron-forward" size={14} color="#CBD5E1" />
                </View>
                <Text style={styles.cardTitle}>{item.nome}</Text>
                <Text style={styles.cardDescription}>Toque para iniciar a conferência deste grupo</Text>
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons name="file-tray-outline" size={32} color="#CBD5E1" />
                <Text style={styles.emptyText}>
                    {busca ? "Nenhuma família encontrada." : "Aguardando cadastro de famílias."}
                </Text>
              </View>
            }
          />
        )}
      </View>

      {/* --- BOTÃO ADMIN RESTAURADO E POSICIONADO ACIMA DAS TABS --- */}
      {role?.toUpperCase() === 'ADMIN' && (
        <TouchableOpacity 
          style={[styles.fabAdmin, { bottom: insets.bottom + 110 }]} 
          onPress={() => router.push('/admin')} 
          activeOpacity={0.8}
        >
          <Ionicons name="settings-sharp" size={22} color="#FFFFFF" />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  header: { 
    backgroundColor: '#FFFFFF', 
    paddingBottom: 10, 
    paddingHorizontal: 20, 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    elevation: 2 
  },
  logoContainer: { flexDirection: 'row', alignItems: 'center' },
  logoSC: { width: 30, height: 30, backgroundColor: '#F59E0B', borderRadius: 6, alignItems: 'center', justifyContent: 'center', marginRight: 8 },
  logoSCText: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' },
  logoSmart: { color: '#F59E0B', fontSize: 15, fontWeight: 'bold', lineHeight: 16 },
  logoCount: { color: '#1F2937', fontSize: 11, fontWeight: 'bold', letterSpacing: 1 },
  headerTitleContainer: { flex: 1, alignItems: 'flex-end' },
  headerTitle: { fontSize: 9, color: '#94A3B8', fontWeight: 'bold', textTransform: 'uppercase' },
  content: { flex: 1, paddingHorizontal: 16, paddingTop: 12 },
  sectionTitle: { fontSize: 14, color: '#4B5563', fontWeight: 'bold', marginBottom: 10 },
  
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF', 
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 12,
    height: 38,
    borderWidth: 1,
    borderColor: '#E5E7EB'
  },
  searchInput: { flex: 1, marginLeft: 6, fontSize: 13, color: '#1E293B' },

  cardFamilias: { 
    backgroundColor: '#FFFFFF', 
    padding: 12, 
    borderRadius: 8, 
    marginBottom: 8, 
    borderLeftWidth: 4, 
    borderLeftColor: '#F59E0B',
    elevation: 1,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 },
  cardTag: { fontSize: 9, color: '#9CA3AF', fontWeight: 'bold', textTransform: 'uppercase' },
  cardTitle: { fontSize: 16, fontWeight: 'bold', color: '#111827' },
  cardDescription: { fontSize: 11, color: '#9CA3AF', marginTop: 1 },
  
  emptyContainer: { alignItems: 'center', marginTop: 40 },
  emptyText: { textAlign: 'center', marginTop: 10, color: '#94A3B8', fontSize: 13 },

  fabAdmin: {
    position: 'absolute',
    left: 20, 
    backgroundColor: '#1E3A8A', 
    width: 54,
    height: 54,
    borderRadius: 27,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    zIndex: 999, // Garante que fique sobre a Tab Bar
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
});