import { useEffect, useState } from 'react';
import { StyleSheet, Text, View, FlatList, ActivityIndicator, TouchableOpacity, StatusBar, TextInput } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../src/supabase';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const HeaderItens = ({ title, topInset }) => {
  const router = useRouter();
  return (
    <View style={[styles.header, { paddingTop: topInset + 15 }]}>
      <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
        <Ionicons name="arrow-back" size={24} color="#1F2937" />
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
  
  const [itens, setItens] = useState([]);
  const [carregando, setCarregando] = useState(true);
  
  const [busca, setBusca] = useState('');

  useEffect(() => {
    async function buscarItens() {
      if (!familiaId) return; 
      
      const { data, error } = await supabase
        .from('itens')
        .select('*')
        .eq('familia_id', familiaId)
        .order('descricao');
        
      if (data) setItens(data);
      setCarregando(false);
    }
    buscarItens();
  }, [familiaId]);

  const irParaContagem = (item) => {
    router.push({ 
      pathname: '/contar', 
      params: { 
        itemId: item.id, 
        codigo: item.sku_codigo, // <-- Atualizado para o novo nome do banco
        descricao: item.descricao,
      } 
    });
  };

  const itensFiltrados = itens.filter((item: any) => {
    if (busca === '') return true;
    
    const termoBusca = busca.toLowerCase();
    // <-- Atualizado para o novo nome da coluna
    const codSistema = item.sku_codigo?.toLowerCase() || ''; 
    const desc = item.descricao?.toLowerCase() || '';
    
    return codSistema.includes(termoBusca) || desc.includes(termoBusca);
  });

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <HeaderItens 
        title={familiaNome || 'Materiais'} 
        topInset={insets.top} 
      />
      
      <View style={styles.content}>
        <View style={styles.subHeader}>
            <Ionicons name="pricetags-outline" size={16} color="#6B7280" />
            <Text style={styles.subtitle}> Selecione o item abaixo:</Text>
        </View>

        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#94A3B8" />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar por código ou descrição..."
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
            data={itensFiltrados}
            keyExtractor={(item: any) => item.id.toString()}
            contentContainerStyle={{ paddingBottom: insets.bottom + 120 }}
            renderItem={({ item }) => (
              <TouchableOpacity 
                style={styles.cardItem} 
                onPress={() => irParaContagem(item)} 
                activeOpacity={0.7}
              >
                <View style={styles.cardItemBody}>
                  {/* <-- Atualizado para exibir o sku_codigo e usar o novo estilo */}
                  <Text style={styles.codigoSistema}>{item.sku_codigo}</Text>
                  <Text style={styles.descricao} numberOfLines={2}>{item.descricao}</Text>
                </View>
                <View style={styles.iconContainer}>
                    <Ionicons name="chevron-forward" size={20} color="#005b9f" />
                </View>
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons name="search-outline" size={40} color="#CBD5E1" />
                <Text style={styles.emptyText}>
                    {busca ? "Nenhum material encontrado." : `Nenhum material cadastrado em ${familiaNome}.`}
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
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { 
    backgroundColor: '#FFFFFF', 
    paddingBottom: 15, 
    paddingHorizontal: 15, 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  backBtn: { padding: 5 },
  headerTitle: { fontSize: 18, color: '#1F2937', fontWeight: 'bold' },
  content: { flex: 1, paddingHorizontal: 20 },
  subHeader: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginTop: 15,
    marginBottom: 10,
    backgroundColor: '#E2E8F0',
    padding: 8,
    borderRadius: 8,
    alignSelf: 'flex-start'
  },
  subtitle: { fontSize: 13, color: '#475569', fontWeight: 'bold' },
  
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    paddingHorizontal: 12,
    marginBottom: 15,
    height: 45,
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 14,
    color: '#1E293B',
    fontWeight: '500',
  },

  cardItem: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#FFFFFF', 
    padding: 20, 
    borderRadius: 16, 
    marginBottom: 12, 
    elevation: 3, 
    borderLeftWidth: 6, 
    borderLeftColor: '#005b9f',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
  },
  cardItemBody: { flex: 1 },
  // <-- Estilo renomeado para manter a coerência
  codigoSistema: { fontSize: 20, fontWeight: 'bold', color: '#005b9f' },
  descricao: { fontSize: 14, color: '#64748B', marginTop: 4, textTransform: 'uppercase' },
  iconContainer: {
    backgroundColor: '#F0F9FF',
    padding: 8,
    borderRadius: 10,
    marginLeft: 10
  },
  emptyContainer: { alignItems: 'center', marginTop: 80 },
  emptyText: { textAlign: 'center', marginTop: 10, color: '#94A3B8', fontSize: 16 }
});