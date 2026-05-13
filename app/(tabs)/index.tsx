import { useEffect, useState } from 'react';
import { StyleSheet, Text, View, FlatList, ActivityIndicator, TouchableOpacity, StatusBar, TextInput, Alert, Image, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../src/supabase';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons'; 
import { useAuth } from '../../src/context/AuthContext'; 

const AZUL_TECH = '#1E3A8A';

// --- HEADER PADRÃO AFERY ATUALIZADO ---
const HeaderHome = ({ topInset }: { topInset: number }) => (
  <View style={[styles.header, { paddingTop: topInset + 20 }]}>
    <Image 
      source={require('../../assets/images/icon.png')} 
      style={styles.logoIcon} 
    />
    <View style={styles.headerTextContainer}>
      <Text style={styles.logoAFERY}>AFERY</Text>
      <Text style={styles.headerSubtitle}>Sistemas de Inventário</Text>
    </View>
  </View>
);

export default function TelaInicial() {
  const [familias, setFamilias] = useState<any[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [busca, setBusca] = useState(''); 

  const router = useRouter();
  const insets = useSafeAreaInsets();
  
  const { role, organizacao_id, signOut } = useAuth();

  useEffect(() => {
    async function buscarFamilias() {
      if (!organizacao_id) return;
      const { data, error } = await supabase
        .from('familias')
        .select('*')
        .eq('organizacao_id', organizacao_id)
        .order('nome', { ascending: true });

      if (data) {
        // AJUSTE CIRÚRGICO: Injetando a categoria global no topo do array
        const listaComTodos = [
          { id: 'todos', nome: 'Todos os Itens', isGlobal: true },
          ...data
        ];
        setFamilias(listaComTodos);
      }
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

  const handleSair = () => {
    Alert.alert("Sair", "Deseja realmente sair do sistema?", [
      { text: "Cancelar", style: "cancel" },
      { 
        text: "Sim, Sair", 
        style: "destructive", 
        onPress: async () => {
          await signOut(); 
          router.replace('/login');
        } 
      }
    ]);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <HeaderHome topInset={insets.top} />

      <View style={styles.content}>
        <Text style={styles.sectionTitle}>Selecione uma categoria:</Text>

        <View style={styles.searchContainer}>
          <Ionicons name="search" size={16} color="#94A3B8" />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar categoria..."
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
          <ActivityIndicator size="large" color={AZUL_TECH} style={{ marginTop: 50 }} />
        ) : (
          <FlatList
            data={familiasFiltradas} 
            keyExtractor={(item: any) => item.id.toString()}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: insets.bottom + 160 }}
            renderItem={({ item }) => (
              <TouchableOpacity 
                style={[styles.cardFamilias, item.isGlobal && { borderLeftColor: '#F59E0B', backgroundColor: '#FFFBEB' }]} 
                onPress={() => aoClicarNaFamilia(item.id, item.nome)} 
                activeOpacity={0.7}
              >
                <View style={styles.cardHeader}>
                  <Text style={[styles.cardTag, item.isGlobal && { color: '#D97706' }]}>
                    {item.isGlobal ? "Busca Global" : "Família de Materiais"}
                  </Text>
                  <Ionicons name="chevron-forward" size={14} color="#CBD5E1" />
                </View>
                <Text style={styles.cardTitle}>{item.nome}</Text>
                <Text style={styles.cardDescription}>
                  {item.isGlobal ? "Toque para ver e buscar em todo o catálogo" : "Toque para iniciar a conferência deste grupo"}
                </Text>
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons name="file-tray-outline" size={32} color="#CBD5E1" />
                <Text style={styles.emptyText}>
                  {busca ? "Nenhuma categoria encontrada." : "Aguardando cadastro de famílias."}
                </Text>
              </View>
            }
          />
        )}
      </View>

      {role?.toUpperCase() === 'ADMIN' && (
        <TouchableOpacity 
          style={[styles.fabAdmin, { bottom: insets.bottom + 110 }]} 
          onPress={() => router.push('/admin')} 
          activeOpacity={0.8}
        >
          <Ionicons name="settings-sharp" size={22} color="#FFFFFF" />
        </TouchableOpacity>
      )}

      <TouchableOpacity 
        style={[styles.fabLogout, { bottom: insets.bottom + 110 }]} 
        onPress={handleSair} 
        activeOpacity={0.8}
      >
        <Ionicons name="log-out-outline" size={24} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  header: { 
    backgroundColor: '#FFFFFF', 
    paddingBottom: 20, 
    paddingHorizontal: 20, 
    flexDirection: 'row', 
    alignItems: 'center', 
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    elevation: 4 
  },
  logoIcon: { 
    width: 48, 
    height: 48, 
    marginRight: 12,
    borderRadius: 12 
  },
  headerTextContainer: { justifyContent: 'center' },
  logoAFERY: { 
    color: AZUL_TECH, 
    fontSize: 24, 
    fontWeight: '900',
    letterSpacing: -0.5,
    lineHeight: 28 
  },
  headerSubtitle: { 
    fontSize: 11, 
    color: '#64748B', 
    fontWeight: '800', 
    textTransform: 'uppercase',
    marginTop: -2 
  },
  
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
    borderRadius: 10, 
    marginBottom: 10, 
    borderLeftWidth: 4, 
    borderLeftColor: AZUL_TECH,
    elevation: 2,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 },
  cardTag: { fontSize: 9, color: '#9CA3AF', fontWeight: 'bold', textTransform: 'uppercase' },
  cardTitle: { fontSize: 18, fontWeight: 'bold', color: '#111827' },
  cardDescription: { fontSize: 12, color: '#9CA3AF', marginTop: 1 },
  
  emptyContainer: { alignItems: 'center', marginTop: 40 },
  emptyText: { textAlign: 'center', marginTop: 10, color: '#94A3B8', fontSize: 13 },

  fabAdmin: {
    position: 'absolute',
    left: 20, 
    backgroundColor: AZUL_TECH, 
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    zIndex: 999,
  },
  
  fabLogout: {
    position: 'absolute',
    right: 20, 
    backgroundColor: '#EF4444', 
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    zIndex: 999,
  },
});