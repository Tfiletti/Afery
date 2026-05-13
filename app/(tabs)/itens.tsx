import { useEffect, useState } from 'react';
import { StyleSheet, Text, View, FlatList, ActivityIndicator, TouchableOpacity, StatusBar, TextInput, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../src/supabase';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../src/context/AuthContext'; 

const HeaderItens = ({ title, topInset }: { title: string, topInset: number }) => {
  const router = useRouter();
  return (
    <View style={[styles.header, { paddingTop: topInset + 15 }]}>
      <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
        <Ionicons name="arrow-back" size={24} color="#1E3A8A" />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>{title}</Text>
      <View style={{ width: 40 }} />
    </View>
  );
};

export default function TelaDeItens() {
  const { familiaId, familiaNome } = useLocalSearchParams();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { organizacao_id } = useAuth(); 
  
  const [itens, setItens] = useState<any[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [busca, setBusca] = useState('');

  const idDaFamilia = Array.isArray(familiaId) ? familiaId[0] : familiaId;
  const nomeDaFamilia = Array.isArray(familiaNome) ? familiaNome[0] : familiaNome;

  useEffect(() => {
    async function buscarItens() {
      if (!organizacao_id) {
        setCarregando(false);
        return; 
      }
      
      try {
        // 1. Iniciamos a query base filtrando pela organização
        let query = supabase
          .from('itens')
          .select('*')
          .eq('organizacao_id', organizacao_id);

        // 2. AJUSTE CIRÚRGICO: Se o ID for 'todos', não aplicamos o filtro de familia_id
        if (idDaFamilia && idDaFamilia !== 'todos') {
          query = query.eq('familia_id', idDaFamilia);
        }

        // 3. Ordenamos e executamos
        const { data, error } = await query.order('descricao');
          
        if (error) throw error;
        if (data) setItens(data);
      } catch (error: any) {
        console.error("Erro ao buscar itens:", error);
        Alert.alert("Erro", "Não foi possível carregar os itens.");
      } finally {
        setCarregando(false);
      }
    }
    
    buscarItens();
  }, [idDaFamilia, organizacao_id]);

  const irParaContagem = (item: any) => {
    router.push({ 
      pathname: '/contar', 
      params: { 
        itemId: item.id, 
        codigo: item.sku_codigo, 
        descricao: item.descricao,
      } 
    });
  };

  const itensFiltrados = itens.filter((item: any) => {
    if (busca === '') return true;
    const termoBusca = busca.toLowerCase();
    const codSistema = item.sku_codigo?.toLowerCase() || ''; 
    const desc = item.descricao?.toLowerCase() || '';
    return codSistema.includes(termoBusca) || desc.includes(termoBusca);
  });

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <HeaderItens 
        title={nomeDaFamilia || 'Materiais'} 
        topInset={insets.top} 
      />
      
      <View style={styles.content}>
        <View style={styles.subHeader}>
            <Ionicons name="pricetags-outline" size={14} color="#475569" />
            <Text style={styles.subtitle}> Selecione o item abaixo:</Text>
        </View>

        <View style={styles.searchContainer}>
          <Ionicons name="search" size={18} color="#94A3B8" />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar por código ou descrição..."
            placeholderTextColor="#94A3B8"
            value={busca}
            onChangeText={setBusca}
            autoCorrect={false}
            autoCapitalize="none"
          />
          {busca.length > 0 && (
            <TouchableOpacity onPress={() => setBusca('')} style={{ padding: 4 }}>
              <Ionicons name="close-circle" size={18} color="#CBD5E1" />
            </TouchableOpacity>
          )}
        </View>

        {carregando ? (
          <ActivityIndicator size="large" color="#1E3A8A" style={{ marginTop: 50 }} />
        ) : (
          <FlatList
            data={itensFiltrados}
            keyExtractor={(item: any) => item.id.toString()}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: insets.bottom + 60 }}
            renderItem={({ item }) => (
              <TouchableOpacity 
                style={styles.cardItem} 
                onPress={() => irParaContagem(item)} 
                activeOpacity={0.7}
              >
                <View style={styles.cardItemBody}>
                  <Text style={styles.codigoSistema}>{item.sku_codigo}</Text>
                  <Text style={styles.descricao} numberOfLines={2}>{item.descricao}</Text>
                </View>
                <View style={styles.iconContainer}>
                    <Ionicons name="chevron-forward" size={18} color="#E6A23C" />
                </View>
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons name="cube-outline" size={36} color="#CBD5E1" />
                <Text style={styles.emptyText}>
                    {busca ? "Nenhum material encontrado." : `Nenhum material cadastrado.`}
                </Text>
              </View>
            }
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  header: { 
    backgroundColor: '#FFFFFF', 
    paddingBottom: 12, 
    paddingHorizontal: 15, 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    elevation: 3,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0'
  },
  backBtn: { padding: 5 },
  headerTitle: { fontSize: 15, color: '#1E3A8A', fontWeight: '900', textTransform: 'uppercase' },
  content: { flex: 1, paddingHorizontal: 20 },
  subHeader: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginTop: 15,
    marginBottom: 10,
    backgroundColor: '#E2E8F0',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 6,
    alignSelf: 'flex-start'
  },
  subtitle: { fontSize: 10, color: '#475569', fontWeight: 'bold', textTransform: 'uppercase' },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 15,
    height: 48,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#E5E7EB'
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 15,
    color: '#1E293B',
    fontWeight: '600',
  },
  cardItem: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#FFFFFF',
    padding: 14,
    borderRadius: 10,
    marginBottom: 10,
    elevation: 1, 
    borderLeftWidth: 5, 
    borderLeftColor: '#1E3A8A', 
    borderWidth: 1,
    borderColor: '#F3F4F6'
  },
  cardItemBody: { flex: 1 },
  codigoSistema: { 
    fontSize: 16, 
    fontWeight: '900', 
    color: '#1E3A8A'
  },
  descricao: { 
    fontSize: 11, 
    color: '#64748B', 
    marginTop: 2, 
    textTransform: 'uppercase',
    fontWeight: '500' 
  },
  iconContainer: {
    backgroundColor: '#FFFBEB',
    padding: 6,
    borderRadius: 8,
    marginLeft: 10
  },
  emptyContainer: { alignItems: 'center', marginTop: 60 },
  emptyText: { textAlign: 'center', marginTop: 10, color: '#94A3B8', fontSize: 14 }
});