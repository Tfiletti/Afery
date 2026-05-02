import { useEffect, useState, useCallback } from 'react';
import { StyleSheet, Text, View, FlatList, ActivityIndicator, TouchableOpacity, RefreshControl, StatusBar, TextInput } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons'; 
import { supabase } from '../../src/supabase';
import { useSafeAreaInsets } from 'react-native-safe-area-context'; 

// 1. IMPORTAÇÃO DO NOSSO CÉREBRO SAAS (O Crachá)
import { useAuth } from '../../src/context/AuthContext'; 

export default function TelaRegistros() {
  const [registros, setRegistros] = useState<any[]>([]);
  const [carregando, setCarregando] = useState(true);
  
  // NOVA STATE: Guarda o que o usuário digitou na busca
  const [busca, setBusca] = useState(''); 
  
  const router = useRouter();
  const insets = useSafeAreaInsets(); 
  
  // 2. PUXANDO O ID DA ORGANIZAÇÃO (Ypê)
  const { organizacao_id } = useAuth(); 

  const formatarPeso = (valor: number) => {
    if (valor === undefined || valor === null) return "0,00";
    return valor
      .toFixed(2)
      .replace('.', ',')
      .replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1.');
  };

  const obterFiltroTurno = () => {
    const agora = new Date();
    const inicio = new Date(agora);
    if (agora.getHours() < 5) inicio.setDate(agora.getDate() - 1);
    inicio.setHours(5, 0, 0, 0);
    const fim = new Date(inicio);
    fim.setDate(inicio.getDate() + 1);
    return { 
      inicio: inicio.toISOString(), 
      fim: fim.toISOString(),
      exibicao: inicio.toLocaleDateString('pt-BR') 
    };
  };

  async function buscarRegistros() {
    // 3. TRAVA DE SEGURANÇA: Se não tem org_id, nem bate no banco
    if (!organizacao_id) return; 

    setCarregando(true);
    const { inicio, fim } = obterFiltroTurno();
    
    try {
      const { data, error } = await supabase
        .from('contagens')
        .select('*, itens(*), areas(*)')
        .eq('organizacao_id', organizacao_id) // 4. A CHAVE MESTRA: Filtra só a sua fábrica!
        .gte('data_hora', inicio)
        .lte('data_hora', fim)
        .order('data_hora', { ascending: false });

      if (error) throw error;
      setRegistros(data || []);
    } catch (err: any) {
      console.error("Erro ao buscar registros:", err.message);
    } finally {
      setCarregando(false);
    }
  }

  useFocusEffect(
    useCallback(() => {
      buscarRegistros();
    }, [organizacao_id]) // Recarrega se o org_id mudar
  );

  // LOGICA DO FILTRO LOCAL:
  // Só mostra os registros que baterem com o texto da busca (por Código ou Descrição)
  const registrosFiltrados = registros.filter((item) => {
    if (busca === '') return true; // Se a busca tá vazia, mostra tudo
    
    const termoBusca = busca.toLowerCase();
    // <-- Atualizado para o novo nome da coluna
    const codSistema = item.itens?.sku_codigo?.toLowerCase() || '';
    const desc = item.itens?.descricao?.toLowerCase() || '';
    
    return codSistema.includes(termoBusca) || desc.includes(termoBusca);
  });

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      {/* HEADER DINÂMICO E BARRA DE BUSCA */}
      <View style={[styles.header, { paddingTop: insets.top + 15 }]}>
        <View style={styles.headerContent}>
            <Ionicons name="time-outline" size={16} color="#0369A1" />
            <Text style={styles.txtCiclo}> Ciclo: 05h às 05h ({obterFiltroTurno().exibicao})</Text>
        </View>

        {/* --- CAMPO DE PESQUISA --- */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#94A3B8" />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar por código ou descrição..." // <-- Atualizado
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
        {/* ------------------------- */}

      </View>

      <FlatList 
        // Usando a lista filtrada em vez da lista crua
        data={registrosFiltrados}
        keyExtractor={(item) => item.id.toString()}
        refreshControl={<RefreshControl refreshing={carregando} onRefresh={buscarRegistros} color="#005b9f" />}
        contentContainerStyle={{ 
            paddingBottom: insets.bottom + 120,
            paddingTop: 10
        }}
        renderItem={({ item }) => (
          <TouchableOpacity 
            style={styles.card} 
            onPress={() => router.push({ pathname: '/editar-contagem', params: { id: item.id } })}
            activeOpacity={0.7}
          >
            <View style={styles.cardHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.txtArea}>📍 {item.areas?.nome || 'Sem Área'}</Text>
                {/* <-- Atualizado para puxar o sku_codigo e usar a nova classe de estilo */}
                <Text style={styles.txtCodigoSistema}>{item.itens?.sku_codigo}</Text>
              </View>
              
              <View style={styles.statusIcons}>
                <Text style={styles.txtHora}>{new Date(item.data_hora).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</Text>
                
                <View style={styles.iconRow}>
                  {item.foto_url && (
                    <View style={styles.badgeIcon}>
                        <Ionicons name="camera" size={12} color="#005b9f" />
                    </View>
                  )}
                  {item.observacao && item.observacao !== '' && item.observacao !== 'EMPTY' && (
                    <View style={[styles.badgeIcon, { backgroundColor: '#F1F5F9' }]}>
                        <Ionicons name="document-text" size={12} color="#64748B" />
                    </View>
                  )}
                </View>
              </View>
            </View>

            <View style={styles.cardBody}>
              <Text style={styles.txtDesc} numberOfLines={2}>{item.itens?.descricao}</Text>
              <View style={styles.pesoContainer}>
                <Text style={styles.txtPeso}>{formatarPeso(item.peso_liquido_calculado)}</Text>
                <Text style={styles.unitText}>{item.itens?.unidade_medida || 'kg'}</Text>
              </View>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
            !carregando ? (
                <View style={styles.emptyContainer}>
                    <Ionicons name="search-outline" size={50} color="#CBD5E1" />
                    <Text style={styles.emptyText}>
                      {busca ? "Nenhum registro encontrado." : "Nenhuma contagem neste turno."}
                    </Text>
                </View>
            ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { 
    backgroundColor: '#FFF', 
    paddingBottom: 15, 
    paddingHorizontal: 20, 
    elevation: 2, 
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
  },
  headerContent: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center',
    backgroundColor: '#E0F2FE',
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: 'center',
    paddingHorizontal: 15
  },
  txtCiclo: { fontSize: 11, fontWeight: 'bold', color: '#0369A1' },
  
  // Estilos da nova barra de pesquisa
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    paddingHorizontal: 12,
    marginTop: 15,
    height: 45,
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 14,
    color: '#1E293B',
    fontWeight: '500',
  },

  card: { 
    backgroundColor: '#FFF', 
    marginHorizontal: 16, 
    marginBottom: 12, 
    padding: 16, 
    borderRadius: 16, 
    elevation: 3, 
    borderLeftWidth: 6, 
    borderLeftColor: '#005b9f',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  statusIcons: { alignItems: 'flex-end' },
  iconRow: { flexDirection: 'row', marginTop: 6 },
  badgeIcon: { 
    backgroundColor: '#E0F2FE', 
    padding: 4, 
    borderRadius: 6, 
    marginLeft: 6 
  },
  txtArea: { fontSize: 11, fontWeight: 'bold', color: '#94A3B8', textTransform: 'uppercase', marginBottom: 2 },
  txtHora: { fontSize: 10, color: '#94A3B8', fontWeight: 'bold' },
  // <-- Estilo renomeado para remover o termo antigo
  txtCodigoSistema: { fontSize: 18, fontWeight: 'bold', color: '#1E293B' },
  
  cardBody: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 4 },
  txtDesc: { fontSize: 13, color: '#64748B', flex: 1, marginRight: 15, lineHeight: 18 },
  pesoContainer: { alignItems: 'flex-end' },
  txtPeso: { fontSize: 22, fontWeight: 'bold', color: '#1E293B' },
  unitText: { fontSize: 10, color: '#94A3B8', fontWeight: 'bold', textTransform: 'uppercase' },
  
  emptyContainer: { alignItems: 'center', marginTop: 100 },
  emptyText: { marginTop: 10, color: '#94A3B8', fontSize: 14 }
});