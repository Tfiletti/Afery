import React, { useState, useCallback, useMemo } from 'react';
import { StyleSheet, Text, View, FlatList, TouchableOpacity, ActivityIndicator, Alert, ScrollView, TextInput, Image, StatusBar, Linking } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { supabase } from '../../src/supabase'; 
import DateTimePicker from '@react-native-community/datetimepicker';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context'; 

// CONTEXTO DE USUÁRIO
import { useAuth } from '../../src/context/AuthContext'; 

const COL_ITEM = 3.5; 
const COL_FISICO = 2;
const COL_SISTEMA = 2; 
const COL_DESVIO = 2.5;

const AZUL_TECH = '#1E3A8A';

type SortConfig = {
  key: 'id' | 'fisico' | 'sistema' | 'desvio';
  direction: 'asc' | 'desc';
}

export default function TelaConsultaSaldos() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { organizacao_id, role } = useAuth(); 

  const [dataSelecionada, setDataSelecionada] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  
  const [supervisorAtivo, setSupervisorAtivo] = useState('Todos');
  const [lista, setLista] = useState<any[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [busca, setBusca] = useState('');
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'desvio', direction: 'desc' });

  const supervisores = ['Edevandro', 'Everaldo', 'Fabio', 'Joel', 'Marcelo', 'Samuel'];

  const formatarPeso = (valor: number) => {
    if (valor === undefined || valor === null) return "0,0";
    return valor.toFixed(1).replace('.', ',').replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1.');
  };

  const formatarMoeda = (valor: number) => "R$ " + valor.toFixed(2).replace('.', ',');

  const formatarDataLocal = (date: Date) => {
    const d = new Date(date);
    const ano = d.getFullYear();
    const mes = String(d.getMonth() + 1).padStart(2, '0');
    const dia = String(d.getDate()).padStart(2, '0');
    return `${ano}-${mes}-${dia}`;
  };

  const obterFiltroTurno = (dataBase: Date) => {
    const inicio = new Date(dataBase);
    inicio.setHours(5, 0, 0, 0);
    const fim = new Date(inicio);
    fim.setDate(inicio.getDate() + 1);
    fim.setHours(5, 0, 0, 0);
    return { inicio: inicio.toISOString(), fim: fim.toISOString() };
  };

  const abrirAuditoria = (item: any) => {
    router.push({
      pathname: '/auditoria', 
      params: { itemId: item.internalId, data: formatarDataLocal(dataSelecionada) }
    });
  };

  const confirmarExclusao = (item: any) => {
    if (!organizacao_id) return;
    const cincoHorasEmMs = 5 * 60 * 60 * 1000;
    const tempoDecorrido = Date.now() - item.ultimaModificacao;

    if (tempoDecorrido > cincoHorasEmMs && role !== 'ADMIN') {
        Alert.alert("⏳ Tempo Expirado", "O prazo de 5h expirou. Somente o Administrador pode apagar este registro.");
        return;
    }

    Alert.alert("🚨 Zerar Registro", `Deseja apagar os dados de Físico e Sistema do item ${item.id}?`, [
        { text: "Cancelar", style: "cancel" },
        { text: "Sim, Zerar", style: "destructive", onPress: () => executarExclusao(item) }
    ]);
  };

  const executarExclusao = async (item: any) => {
    setCarregando(true);
    const { inicio, fim } = obterFiltroTurno(dataSelecionada);
    const dataIso = formatarDataLocal(dataSelecionada);

    try {
        await supabase.from('contagens').delete().eq('item_id', item.internalId).eq('organizacao_id', organizacao_id).gte('data_hora', inicio).lt('data_hora', fim);
        await supabase.from('estoque_sistema').delete().eq('sku_codigo', item.id).eq('organizacao_id', organizacao_id).gte('data_atualizacao', `${dataIso}T00:00:00`).lte('data_atualizacao', `${dataIso}T23:59:59`);
        Alert.alert("Sucesso", "Registros zerados com sucesso!");
        buscarDados(); 
    } catch (error: any) {
        Alert.alert("Erro ao excluir", error.message);
        setCarregando(false);
    }
  };

  const buscarDados = async () => {
    if (!organizacao_id) return; 

    setCarregando(true);
    const { inicio: fisInicio, fim: fisFim } = obterFiltroTurno(dataSelecionada);
    const dataIso = formatarDataLocal(dataSelecionada);
    const sistInicio = `${dataIso}T00:00:00`;
    const sistFim = `${dataIso}T23:59:59`;

    try {
      let query = supabase.from('itens').select('id, sku_codigo, descricao, preco_unitario, responsavel').eq('organizacao_id', organizacao_id);
      if (supervisorAtivo !== 'Todos') query = query.eq('responsavel', supervisorAtivo);
      const { data: itens } = await query;

      const { data: contagens } = await supabase.from('contagens').select('item_id, peso_liquido_calculado, data_hora, foto_url, observacao').eq('organizacao_id', organizacao_id).gte('data_hora', fisInicio).lt('data_hora', fisFim);

      const { data: estoqueSistema } = await supabase.from('estoque_sistema').select('sku_codigo, saldo_sistema, data_atualizacao').eq('organizacao_id', organizacao_id).gte('data_atualizacao', sistInicio).lte('data_atualizacao', sistFim).order('data_atualizacao', { ascending: false });

      const mapaSistema = new Map();
      estoqueSistema?.forEach(e => {
        const sku = String(e.sku_codigo).trim().toUpperCase();
        if (!mapaSistema.has(sku)) mapaSistema.set(sku, { saldo: e.saldo_sistema || 0, data: e.data_atualizacao });
      });

      const consolidado = (itens || []).map(item => {
        const itensFisicos = contagens?.filter(c => c.item_id === item.id) || [];
        const totalFisico = itensFisicos.reduce((acc, curr) => acc + (curr.peso_liquido_calculado || 0), 0);
        
        const skuLimpo = String(item.sku_codigo || item.id).trim().toUpperCase();
        const dadosSist = mapaSistema.get(skuLimpo);
        const saldoSistema = dadosSist ? dadosSist.saldo : 0; 
        
        let ultimaModificacao = 0;
        if (itensFisicos.length > 0) {
            ultimaModificacao = Math.max(...itensFisicos.map(c => new Date(c.data_hora).getTime()));
        } else if (dadosSist) {
            ultimaModificacao = new Date(dadosSist.data).getTime();
        }

        return {
          id: item.sku_codigo || String(item.id),
          internalId: item.id,
          descricao: item.descricao,
          fisico: totalFisico,
          sistema: saldoSistema, 
          desvio: totalFisico - saldoSistema,
          impacto: (totalFisico - saldoSistema) * (item.preco_unitario || 0),
          temFoto: itensFisicos.some(c => c.foto_url),
          temObs: itensFisicos.some(c => c.observacao && c.observacao.trim() !== ''),
          ultimaModificacao
        };
      }); 

      setLista(consolidado);
    } catch (err: any) { Alert.alert("Erro", err.message); }
    finally { setCarregando(false); }
  };

  useFocusEffect(useCallback(() => { buscarDados(); }, [supervisorAtivo, dataSelecionada]));

  const listaProcessada = useMemo(() => {
    let resultado = [...lista];
    if (busca) {
      const termo = busca.toLowerCase();
      resultado = resultado.filter(i => i.id.toLowerCase().includes(termo) || i.descricao?.toLowerCase().includes(termo));
    }
    if (sortConfig.key) {
      resultado.sort((a, b) => {
        let valA = a[sortConfig.key];
        let valB = b[sortConfig.key];
        if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
        if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return resultado;
  }, [lista, busca, sortConfig]);

  const alternarOrdem = (key: SortConfig['key']) => {
    setSortConfig(prev => ({ key, direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc' }));
  };

  const enviarWhatsapp = () => {
    if (listaProcessada.length === 0) return;
    let mensagem = `*📊 RELATÓRIO SMARTCOUNT*\n📅 Data: ${dataSelecionada.toLocaleDateString('pt-BR')}\n👤 Sup: ${supervisorAtivo}\n----------------------------\n\n`;
    listaProcessada.slice(0, 25).forEach(i => {
      mensagem += `🔸 *${i.id}*\n🏷️ _${i.descricao || 'Sem desc.'}_\nFísico: ${formatarPeso(i.fisico)} | Sist: ${formatarPeso(i.sistema)}\nDesvio: *${formatarPeso(i.desvio)}* | R$: ${formatarMoeda(i.impacto)}\n\n`;
    });
    Linking.openURL(`whatsapp://send?text=${encodeURIComponent(mensagem)}`);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <View style={styles.headerAzul}>
        <View style={styles.logoRow}>
          <Image source={require('../../assets/images/icon.png')} style={styles.tinyLogo} />
          <View>
            <Text style={styles.titlePrincipal}>Painel de Inventário</Text>
            <Text style={styles.subtitle}>Relatório Completo de Desvios</Text>
          </View>
        </View>
        
        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color="#94A3B8" />
          <TextInput style={styles.inputBusca} placeholder="Código ou descrição..." value={busca} onChangeText={setBusca} placeholderTextColor="#94A3B8" />
        </View>

        <View style={styles.barraFiltro}>
          <TouchableOpacity style={styles.dataContainer} onPress={() => setShowDatePicker(true)}>
            <Ionicons name="calendar-outline" size={20} color="#FFF" />
            <Text style={styles.txtData}>{dataSelecionada.toLocaleDateString('pt-BR')}</Text>
          </TouchableOpacity>
          <View style={styles.acoesHeader}>
            <TouchableOpacity onPress={enviarWhatsapp} style={styles.iconBtn}><Ionicons name="logo-whatsapp" size={24} color="#25D366" /></TouchableOpacity>
            <TouchableOpacity onPress={buscarDados} style={styles.iconBtn}><Ionicons name="refresh-outline" size={24} color="#FFF" /></TouchableOpacity>
          </View>
        </View>
      </View>

      {showDatePicker && <DateTimePicker value={dataSelecionada} mode="date" onChange={(e, d) => { setShowDatePicker(false); if(d) setDataSelecionada(d); }} />}

      <View style={styles.containerSupervisores}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 15 }}>
          {['Todos', ...supervisores].map(sup => (
            <TouchableOpacity key={sup} onPress={() => setSupervisorAtivo(sup)} style={[styles.badge, supervisorAtivo === sup && styles.badgeAtivo]}>
              <Text style={[styles.txtBadge, supervisorAtivo === sup && styles.txtBadgeAtivo]}>{sup}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <View style={styles.tableHeader}>
        <TouchableOpacity style={[styles.headBtn, { flex: COL_ITEM }]} onPress={() => alternarOrdem('id')}>
          <Text style={styles.txtHead}>Item / Aud.</Text>
          <Ionicons name={sortConfig.key === 'id' ? (sortConfig.direction === 'asc' ? 'arrow-up' : 'arrow-down') : 'swap-vertical'} size={12} color="#CBD5E1" />
        </TouchableOpacity>
        <Text style={[styles.txtHead, { flex: COL_FISICO, textAlign: 'center' }]}>Físico</Text>
        <Text style={[styles.txtHead, { flex: COL_SISTEMA, textAlign: 'center' }]}>Sistema</Text>
        <TouchableOpacity style={[styles.headBtn, { flex: COL_DESVIO, justifyContent: 'flex-end' }]} onPress={() => alternarOrdem('desvio')}>
          <Text style={styles.txtHead}>Desvio</Text>
          <Ionicons name={sortConfig.key === 'desvio' ? (sortConfig.direction === 'asc' ? 'arrow-up' : 'arrow-down') : 'swap-vertical'} size={12} color="#CBD5E1" />
        </TouchableOpacity>
      </View>

      {carregando ? <ActivityIndicator size="large" color={AZUL_TECH} style={{ marginTop: 50 }} /> : (
        <FlatList
          data={listaProcessada} 
          keyExtractor={item => item.internalId.toString()}
          contentContainerStyle={{ paddingBottom: 100 }}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.row} onPress={() => abrirAuditoria(item)}>
              <View style={{ flex: COL_ITEM }}>
                <Text style={styles.itemCode}>{item.id}</Text>
                <Text style={styles.itemDesc} numberOfLines={2}>{item.descricao || 'S/ DESCRIÇÃO'}</Text>
              </View>
              
              <Text style={[styles.valText, { flex: COL_FISICO, textAlign: 'center' }]}>{formatarPeso(item.fisico)}</Text>
              <Text style={[styles.valText, { flex: COL_SISTEMA, textAlign: 'center', color: '#64748B' }]}>{formatarPeso(item.sistema)}</Text>
              
              <View style={{ flex: COL_DESVIO, alignItems: 'flex-end' }}>
                <Text style={[styles.valDesvio, { color: item.desvio < 0 ? '#EF4444' : item.desvio > 0 ? '#F59E0B' : '#10B981' }]}>
                  {item.desvio > 0 ? `+${formatarPeso(item.desvio)}` : formatarPeso(item.desvio)}
                </Text>
                <Text style={[styles.valGrana, { color: item.impacto < 0 ? '#EF4444' : '#64748B' }]}>{formatarMoeda(item.impacto)}</Text>
                
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
                    {(item.temFoto || item.temObs) && (
                      <View style={styles.containerAlerta}>
                        {item.temFoto && <Ionicons name="camera" size={12} color="#B45309" />}
                        {item.temObs && <MaterialCommunityIcons name="file-document-edit" size={12} color="#B45309" style={item.temFoto ? {marginLeft: 2} : {}} />}
                      </View>
                    )}
                    
                    {/* TRAVA DE RENDERIZAÇÃO DA LIXEIRA AQUI */}
                    {(item.fisico > 0 || item.sistema > 0) && (
                      <TouchableOpacity onPress={() => confirmarExclusao(item)} style={styles.btnTrash}>
                          <Ionicons name="trash-outline" size={18} color="#CBD5E1" />
                      </TouchableOpacity>
                    )}
                </View>
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF' },
  headerAzul: { backgroundColor: AZUL_TECH, paddingTop: 50, paddingBottom: 15, paddingHorizontal: 20, borderBottomLeftRadius: 20, borderBottomRightRadius: 20 },
  logoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  tinyLogo: { width: 35, height: 35, marginRight: 12 },
  titlePrincipal: { fontSize: 18, fontWeight: 'bold', color: '#FFF' },
  subtitle: { fontSize: 11, color: '#BFDBFE' },
  searchBar: { backgroundColor: '#FFF', flexDirection: 'row', alignItems: 'center', borderRadius: 10, paddingHorizontal: 12, height: 40, marginVertical: 10 },
  inputBusca: { flex: 1, marginLeft: 8, fontSize: 14, color: '#1E293B' },
  barraFiltro: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 5 },
  dataContainer: { flexDirection: 'row', alignItems: 'center' },
  txtData: { color: '#FFF', fontSize: 15, fontWeight: 'bold', marginLeft: 8 },
  acoesHeader: { flexDirection: 'row', gap: 15 },
  iconBtn: { padding: 4 },
  containerSupervisores: { paddingVertical: 12, backgroundColor: '#F8FAFC' },
  badge: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#E2E8F0', marginRight: 8 },
  badgeAtivo: { backgroundColor: AZUL_TECH },
  txtBadge: { fontSize: 13, fontWeight: 'bold', color: '#64748B' },
  txtBadgeAtivo: { color: '#FFF' },
  tableHeader: { flexDirection: 'row', paddingHorizontal: 15, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  headBtn: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  txtHead: { fontSize: 11, fontWeight: 'bold', color: '#94A3B8', textTransform: 'uppercase' },
  row: { flexDirection: 'row', paddingHorizontal: 15, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#F8FAFC', alignItems: 'center' },
  itemCode: { fontSize: 15, fontWeight: '900', color: AZUL_TECH }, 
  itemDesc: { fontSize: 11, color: '#64748B', marginTop: 4, width: '95%' }, 
  valText: { fontSize: 15, fontWeight: '700' }, 
  valDesvio: { fontSize: 15, fontWeight: '900' }, 
  valGrana: { fontSize: 11, fontWeight: 'bold', marginTop: 2 }, 
  containerAlerta: { flexDirection: 'row', backgroundColor: '#FEF3C7', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, borderWidth: 1, borderColor: '#FDE68A' },
  btnTrash: { padding: 4 }
});