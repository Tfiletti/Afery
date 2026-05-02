import React, { useState, useCallback, useMemo } from 'react';
import { StyleSheet, Text, View, FlatList, TouchableOpacity, ActivityIndicator, Alert, ScrollView, TextInput, Image } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { supabase } from '../../src/supabase'; 
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context'; 

// IMPORTAÇÃO DO CONTEXTO DE AUTENTICAÇÃO
import { useAuth } from '../../src/context/AuthContext'; 

// Configuração de larguras das colunas
const COL_ITEM = 3;
const COL_FISICO = 2;
const COL_SISTEMA = 2; 
const COL_DESVIO = 2;
const COL_ACAO = 1;

const AZUL_TECH = '#1E3A8A';

type SortConfig = {
  key: 'id' | 'fisico' | 'sistema' | 'desvio';
  direction: 'asc' | 'desc';
}

export default function TelaConsultaSaldos() {
  const insets = useSafeAreaInsets();
  const { organizacao_id, role } = useAuth(); 

  const [dataSelecionada, setDataSelecionada] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  
  // 1. PADRÃO INICIAL ALTERADO PARA 'Todos'
  const [supervisorAtivo, setSupervisorAtivo] = useState('Todos');
  
  const [lista, setLista] = useState<any[]>([]);
  const [carregando, setCarregando] = useState(true);
  
  const [busca, setBusca] = useState('');
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'desvio', direction: 'desc' });

  // Lista de responsáveis (Botão 'Todos' será adicionado manualmente na interface)
  const supervisores = ['Edevandro', 'Everaldo', 'Fabio', 'Joel', 'Marcelo', 'Samuel'];

  const formatarPeso = (valor: number) => {
    if (valor === undefined || valor === null) return "0,00";
    return valor.toFixed(2).replace('.', ',').replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1.');
  };

  const formatarMoedaManual = (valor: number) => "R$ " + formatarPeso(valor);

  const obterFiltroTurno = (dataBase: Date) => {
    const inicio = new Date(dataBase);
    inicio.setHours(5, 0, 0, 0);
    const fim = new Date(inicio);
    fim.setDate(inicio.getDate() + 1);
    fim.setHours(5, 0, 0, 0);
    return { inicio: inicio.toISOString(), fim: fim.toISOString() };
  };

  const buscarDados = async () => {
    if (!organizacao_id) return; 

    setCarregando(true);
    const { inicio, fim } = obterFiltroTurno(dataSelecionada);
    const dataIso = dataSelecionada.toISOString().split('T')[0];
    const sistemaInicio = `${dataIso}T00:00:00.000Z`;
    const sistemaFim = `${dataIso}T23:59:59.999Z`;

    try {
      // 2. LÓGICA DE FILTRO DINÂMICA
      let query = supabase
        .from('itens')
        .select('id, descricao, preco_unitario')
        .eq('organizacao_id', organizacao_id);

      // Se não for 'Todos', aplica o filtro do responsável
      if (supervisorAtivo !== 'Todos') {
        query = query.eq('responsavel', supervisorAtivo);
      }

      const { data: itens, error: errItens } = await query;

      if (errItens) throw errItens;

      const { data: contagens, error: errCont } = await supabase
        .from('contagens')
        .select('item_id, peso_liquido_calculado, data_hora')
        .eq('organizacao_id', organizacao_id)
        .gte('data_hora', inicio)
        .lt('data_hora', fim);

      if (errCont) throw errCont;

      const { data: estoqueSistema, error: errSistema } = await supabase
        .from('estoque_sistema') 
        .select('sku_codigo, saldo_sistema, data_atualizacao') 
        .eq('organizacao_id', organizacao_id)
        .gte('data_atualizacao', sistemaInicio)
        .lte('data_atualizacao', sistemaFim);

      if (errSistema) throw errSistema;

      const listaConsolidada = itens.map(item => {
        const itensFisicos = contagens?.filter(c => c.item_id === item.id) || [];
        const totalFisico = itensFisicos.reduce((acc, curr) => acc + (curr.peso_liquido_calculado || 0), 0);
        
        const itensSistemaArr = estoqueSistema?.filter(e => String(e.sku_codigo) === String(item.id)) || [];
        const itemSistema = itensSistemaArr[0];
        const saldoSistema = itemSistema ? (itemSistema.saldo_sistema || 0) : 0; 
        
        const desvio = totalFisico - saldoSistema;
        const impacto = desvio * (item.preco_unitario || 0);

        let ultimaModificacao = 0;
        if (itensFisicos.length > 0) {
            ultimaModificacao = Math.max(...itensFisicos.map(c => new Date(c.data_hora).getTime()));
        } else if (itensSistemaArr.length > 0) {
            ultimaModificacao = Math.max(...itensSistemaArr.map(s => new Date(s.data_atualizacao).getTime()));
        }

        return {
          id: item.id,
          descricao: item.descricao,
          fisico: totalFisico,
          sistema: saldoSistema, 
          desvio: desvio,
          impacto: impacto,
          ultimaModificacao: ultimaModificacao 
        };
      }); 

      setLista(listaConsolidada);
    } catch (err: any) {
      Alert.alert("Erro", err.message);
    } finally {
      setCarregando(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      buscarDados();
    }, [supervisorAtivo, dataSelecionada, organizacao_id])
  );

  const listaProcessada = useMemo(() => {
    let resultado = [...lista];

    if (busca) {
      const termo = busca.toLowerCase();
      resultado = resultado.filter(i => 
        i.id.toLowerCase().includes(termo) || 
        i.descricao.toLowerCase().includes(termo)
      );
    }

    if (sortConfig.key) {
      resultado.sort((a, b) => {
        let valA = a[sortConfig.key];
        let valB = b[sortConfig.key];
        if (typeof valA === 'string') valA = valA.toLowerCase();
        if (typeof valB === 'string') valB = valB.toLowerCase();
        if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
        if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return resultado;
  }, [lista, busca, sortConfig]);

  const alternarOrdem = (key: SortConfig['key']) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const renderSortIcon = (key: SortConfig['key']) => {
    if (sortConfig.key !== key) return <Ionicons name="swap-vertical" size={12} color="#CBD5E1" />;
    return <Ionicons name={sortConfig.direction === 'asc' ? "arrow-up" : "arrow-down"} size={12} color={AZUL_TECH} />;
  };

  const onChangeDate = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) setDataSelecionada(selectedDate);
  };

  const confirmarExclusao = (item: any) => {
    if (!organizacao_id) return;
    const cincoHorasEmMs = 5 * 60 * 60 * 1000;
    const tempoDecorrido = Date.now() - item.ultimaModificacao;

    if (tempoDecorrido > cincoHorasEmMs && role !== 'ADMIN') {
        Alert.alert("⏳ Tempo Expirado", "O prazo de 5 horas para exclusão expirou. Apenas o Administrador pode apagar este registro.");
        return;
    }

    Alert.alert("Zerar Contagem", `Deseja apagar os registros de Físico e Sistema do item ${item.id}?`, [
        { text: "Cancelar", style: "cancel" },
        { text: "Sim, Zerar", style: "destructive", onPress: () => executarExclusao(item) }
    ]);
  };

  const executarExclusao = async (item: any) => {
    setCarregando(true);
    const { inicio, fim } = obterFiltroTurno(dataSelecionada);
    const dataIso = dataSelecionada.toISOString().split('T')[0];
    const sistemaInicio = `${dataIso}T00:00:00.000Z`;
    const sistemaFim = `${dataIso}T23:59:59.999Z`;

    try {
        await supabase.from('contagens').delete().eq('item_id', item.id).eq('organizacao_id', organizacao_id).gte('data_hora', inicio).lt('data_hora', fim);
        await supabase.from('estoque_sistema').delete().eq('sku_codigo', item.id).eq('organizacao_id', organizacao_id).gte('data_atualizacao', sistemaInicio).lte('data_atualizacao', sistemaFim);

        Alert.alert("Sucesso", "Registros zerados!");
        buscarDados(); 
    } catch (error: any) {
        Alert.alert("Erro ao excluir", error.message);
        setCarregando(false);
    }
  };

  const exportarCSV = async () => {
    if (listaProcessada.length === 0) return;
    let csv = "ITEM;DESCRICAO;FISICO;SISTEMA;DESVIO;IMPACTO (R$)\n";
    listaProcessada.forEach(i => {
      csv += `${i.id};${i.descricao?.replace(/;/g, ",")};${formatarPeso(i.fisico)};${formatarPeso(i.sistema)};${formatarPeso(i.desvio)};${formatarPeso(i.impacto)}\n`;
    });
    const uri = FileSystem.documentDirectory + `Consulta_Inventarios_${supervisorAtivo}.csv`;
    await FileSystem.writeAsStringAsync(uri, csv, { encoding: FileSystem.EncodingType.UTF8 });
    await Sharing.shareAsync(uri);
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerAzul}>
        <View style={styles.logoTitleRow}>
          <Image 
            source={require('../../assets/images/sc_icon.png')} 
            style={styles.tinyLogo} 
            resizeMode="contain"
          />
          <Text style={styles.titlePrincipal}>Consulta de Inventários</Text>
        </View>
        
        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color="#94A3B8" />
          <TextInput 
            style={styles.inputBusca}
            placeholder="Buscar por código ou descrição..."
            value={busca}
            onChangeText={setBusca}
            placeholderTextColor="#94A3B8"
          />
          {busca !== '' && (
            <TouchableOpacity onPress={() => setBusca('')}>
              <Ionicons name="close-circle" size={18} color="#94A3B8" />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.barraFiltro}>
          <TouchableOpacity style={styles.dataContainer} onPress={() => setShowDatePicker(true)}>
            <Ionicons name="calendar-outline" size={20} color="#FFF" />
            <Text style={styles.txtData}>{dataSelecionada.toLocaleDateString('pt-BR')}</Text>
          </TouchableOpacity>
          <View style={styles.acoesHeader}>
            <TouchableOpacity onPress={exportarCSV} style={styles.iconBtn}>
              <MaterialCommunityIcons name="file-excel" size={24} color="#FFF" />
            </TouchableOpacity>
            <TouchableOpacity onPress={buscarDados} style={styles.iconBtn}>
              <Ionicons name="refresh-circle" size={26} color="#FFF" />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {showDatePicker && (
        <DateTimePicker value={dataSelecionada} mode="date" display="default" onChange={onChangeDate} />
      )}

      <View style={styles.containerSupervisores}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 15 }}>
          
          {/* 3. BOTÃO 'TODOS' ADICIONADO MANUALMENTE */}
          <TouchableOpacity 
              onPress={() => { setSupervisorAtivo('Todos'); setBusca(''); }}
              style={[styles.badge, supervisorAtivo === 'Todos' && styles.badgeAtivo]}
          >
            <Text style={[styles.txtBadge, supervisorAtivo === 'Todos' && styles.txtBadgeAtivo]}>Todos</Text>
          </TouchableOpacity>

          {supervisores.map(sup => (
            <TouchableOpacity 
              key={sup} 
              onPress={() => { setSupervisorAtivo(sup); setBusca(''); }}
              style={[styles.badge, supervisorAtivo === sup && styles.badgeAtivo]}
            >
              <Text style={[styles.txtBadge, supervisorAtivo === sup && styles.txtBadgeAtivo]}>{sup}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <View style={styles.tableHeader}>
        <TouchableOpacity style={[styles.headBtn, { flex: COL_ITEM }]} onPress={() => alternarOrdem('id')}>
          <Text style={styles.txtHead}>Item</Text>
          {renderSortIcon('id')}
        </TouchableOpacity>
        <TouchableOpacity style={[styles.headBtn, { flex: COL_FISICO, justifyContent: 'center' }]} onPress={() => alternarOrdem('fisico')}>
          <Text style={styles.txtHead}>Físico</Text>
          {renderSortIcon('fisico')}
        </TouchableOpacity>
        <TouchableOpacity style={[styles.headBtn, { flex: COL_SISTEMA, justifyContent: 'center' }]} onPress={() => alternarOrdem('sistema')}>
          <Text style={styles.txtHead}>Sistema</Text>
          {renderSortIcon('sistema')}
        </TouchableOpacity>
        <TouchableOpacity style={[styles.headBtn, { flex: COL_DESVIO, justifyContent: 'flex-end' }]} onPress={() => alternarOrdem('desvio')}>
          <Text style={styles.txtHead}>Desvio</Text>
          {renderSortIcon('desvio')}
        </TouchableOpacity>
        <View style={{ flex: COL_ACAO }} />
      </View>

      {carregando ? (
        <ActivityIndicator size="large" color={AZUL_TECH} style={{ marginTop: 50 }} />
      ) : (
        <FlatList
          data={listaProcessada} 
          keyExtractor={item => item.id}
          contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
          renderItem={({ item }) => (
            <View style={styles.row}>
              <View style={{ flex: COL_ITEM }}>
                <Text style={styles.itemCode}>{item.id}</Text>
                <Text style={styles.itemDesc} numberOfLines={1}>{item.descricao}</Text>
              </View>
              <View style={{ flex: COL_FISICO, alignItems: 'center' }}>
                <Text style={styles.valFisico}>{formatarPeso(item.fisico)}</Text>
              </View>
              <View style={{ flex: COL_SISTEMA, alignItems: 'center' }}>
                <Text style={styles.valSistema}>{formatarPeso(item.sistema)}</Text>
              </View>
              <View style={{ flex: COL_DESVIO, alignItems: 'flex-end', paddingRight: 5 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  {item.desvio !== 0 && (
                    <Ionicons name="alert-circle" size={14} color={item.desvio < 0 ? "#EF4444" : "#F59E0B"} style={{ marginRight: 4 }} />
                  )}
                  <Text style={[styles.valDesvio, { color: item.desvio < 0 ? '#EF4444' : item.desvio > 0 ? '#F59E0B' : '#10B981' }]}>
                    {item.desvio > 0 ? `+${formatarPeso(item.desvio)}` : formatarPeso(item.desvio)}
                  </Text>
                </View>
                <Text style={[styles.valGrana, { color: item.impacto < 0 ? '#EF4444' : '#64748B' }]}>
                  {formatarMoedaManual(item.impacto)}
                </Text>
              </View>
              <View style={{ flex: COL_ACAO, alignItems: 'flex-end' }}>
                {(item.fisico > 0 || item.sistema > 0) && (
                  <TouchableOpacity onPress={() => confirmarExclusao(item)} style={styles.btnTrash}>
                    <Ionicons name="trash-outline" size={20} color="#CBD5E1" />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}
          ListEmptyComponent={<Text style={styles.emptyText}>Sem dados para este filtro.</Text>}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF' },
  headerAzul: { backgroundColor: AZUL_TECH, paddingTop: 55, paddingBottom: 20, paddingHorizontal: 20 },
  logoTitleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 15, gap: 10 },
  tinyLogo: { width: 30, height: 30 },
  titlePrincipal: { fontSize: 20, fontWeight: 'bold', color: '#FFF' },
  searchBar: { backgroundColor: '#FFF', flexDirection: 'row', alignItems: 'center', borderRadius: 12, paddingHorizontal: 12, height: 45, marginBottom: 15 },
  inputBusca: { flex: 1, marginLeft: 10, fontSize: 14, color: '#1E293B' },
  barraFiltro: { backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 10 },
  dataContainer: { flexDirection: 'row', alignItems: 'center', padding: 4 },
  txtData: { color: '#FFF', fontSize: 16, fontWeight: 'bold', marginLeft: 10 },
  acoesHeader: { flexDirection: 'row', gap: 15 },
  iconBtn: { padding: 2 },
  containerSupervisores: { paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  badge: { paddingHorizontal: 18, paddingVertical: 10, borderRadius: 12, backgroundColor: '#F1F5F9', marginRight: 8 },
  badgeAtivo: { backgroundColor: AZUL_TECH },
  txtBadge: { fontSize: 14, fontWeight: 'bold', color: '#64748B' },
  txtBadgeAtivo: { color: '#FFF' },
  tableHeader: { flexDirection: 'row', paddingHorizontal: 15, paddingVertical: 12, backgroundColor: '#F8FAFC', borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  headBtn: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  txtHead: { fontSize: 11, fontWeight: '900', color: '#94A3B8', textTransform: 'uppercase' },
  row: { flexDirection: 'row', paddingHorizontal: 15, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#F1F5F9', alignItems: 'center' },
  itemCode: { fontSize: 15, fontWeight: 'bold', color: AZUL_TECH },
  itemDesc: { fontSize: 10, color: '#94A3B8', textTransform: 'uppercase', marginTop: 2 },
  valFisico: { fontSize: 14, fontWeight: 'bold', color: '#1E293B' },
  valSistema: { fontSize: 14, fontWeight: '600', color: '#64748B' }, 
  valDesvio: { fontSize: 14, fontWeight: 'bold' },
  valGrana: { fontSize: 10, fontWeight: 'bold', marginTop: 2 },
  btnTrash: { padding: 5 }, 
  emptyText: { textAlign: 'center', marginTop: 40, color: '#94A3B8' }
});