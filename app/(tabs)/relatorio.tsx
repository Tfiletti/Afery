import React, { useState, useCallback, useMemo } from 'react';
import { StyleSheet, Text, View, FlatList, TouchableOpacity, ActivityIndicator, Alert, ScrollView, TextInput, Image, StatusBar, Linking, Platform } from 'react-native';
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
const AZUL_LINHA = '#F1F7FF';

type SortConfig = {
  key: 'id' | 'fisico' | 'sistema' | 'desvio' | 'acuracidade'; 
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

  const [supervisores, setSupervisores] = useState<string[]>([]);

  const formatarPeso = (valor: number) => {
    if (valor === undefined || valor === null || isNaN(valor)) return "0,0";
    return valor.toFixed(1).replace('.', ',').replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1.');
  };

  const formatarMoeda = (valor: number) => {
    if (valor === undefined || valor === null || isNaN(valor)) return "R$ 0,00";
    return "R$ " + valor.toFixed(2).replace('.', ',').replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1.');
  };

  const formatarDataLocal = (date: Date) => {
    const d = new Date(date);
    const ano = d.getFullYear();
    const mes = String(d.getMonth() + 1).padStart(2, '0');
    const dia = String(d.getDate()).padStart(2, '0');
    return `${ano}-${mes}-${dia}`;
  };

  // AJUSTE CIRÚRGICO: Define o dia exato (00:00:00 a 23:59:59) no fuso de Brasília (-03:00)
  const obterFiltroTurno = (dataBase: Date) => {
    const dataIso = formatarDataLocal(dataBase);
    const inicio = `${dataIso}T00:00:00-03:00`;
    const fim = `${dataIso}T23:59:59-03:00`;
    return { inicio, fim };
  };

  const buscarSupervisores = async () => {
    if (!organizacao_id) return;
    try {
      const { data, error } = await supabase
        .from('itens')
        .select('responsavel')
        .eq('organizacao_id', organizacao_id);
      if (error) throw error;
      if (data) {
        const nomes = data.map(i => i.responsavel).filter((v): v is string => !!v && v.trim() !== '');
        const unicos = Array.from(new Set(nomes)).sort();
        setSupervisores(unicos);
      }
    } catch (err) { console.error("Erro ao carregar supervisores:", err); }
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
    const tempoDecorrido = Date.now() - (item.ultimaModificacao || 0);

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
        await supabase.from('contagens').delete().eq('item_id', item.internalId).eq('organizacao_id', organizacao_id).gte('data_hora', inicio).lte('data_hora', fim);
        await supabase.from('estoque_sistema').delete().eq('sku_codigo', item.id).eq('organizacao_id', organizacao_id).eq('data_referencia', dataIso);
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

    try {
      // 1. Busca os Itens
      let query = supabase.from('itens').select('id, sku_codigo, descricao, preco_unitario, responsavel').eq('organizacao_id', organizacao_id);
      if (supervisorAtivo !== 'Todos') query = query.eq('responsavel', supervisorAtivo);
      const { data: itens, error: errItens } = await query;
      if (errItens) throw errItens;

      // 2. Busca Contagens com o filtro de fuso corrigido
      const { data: contagens, error: errCont } = await supabase
        .from('contagens')
        .select('item_id, peso_liquido_calculado, data_hora, foto_url, observacao')
        .eq('organizacao_id', organizacao_id)
        .gte('data_hora', fisInicio)
        .lte('data_hora', fisFim);
      if (errCont) throw errCont;
      
      // 3. Busca Saldo do Sistema
      const { data: estoqueSistema, error: errSist } = await supabase
        .from('estoque_sistema')
        .select('sku_codigo, saldo_sistema, data_atualizacao')
        .eq('organizacao_id', organizacao_id)
        .eq('data_referencia', dataIso) 
        .order('data_atualizacao', { ascending: false });
      if (errSist) throw errSist;

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
        
        const desvioAbsoluto = Math.abs(totalFisico - saldoSistema);
        let acuracidadeItem = 100;
        if (saldoSistema > 0) {
          acuracidadeItem = Math.max(0, 100 - (desvioAbsoluto / saldoSistema * 100));
        } else if (totalFisico > 0) {
          acuracidadeItem = 0;
        }

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
          acuracidade: acuracidadeItem,
          impacto: (totalFisico - saldoSistema) * (item.preco_unitario || 0),
          temFoto: itensFisicos.some(c => c.foto_url),
          temObs: itensFisicos.some(c => c.observacao && c.observacao.trim() !== ''),
          ultimaModificacao
        };
      }); 
      setLista(consolidado);
    } catch (err: any) { 
      Alert.alert("Erro de Consulta", err.message); 
    } finally { 
      setCarregando(false); 
    }
  };

  useFocusEffect(useCallback(() => { 
    buscarSupervisores();
    buscarDados(); 
  }, [supervisorAtivo, dataSelecionada, organizacao_id]));

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

  const metricasGlobais = useMemo(() => {
    if (!listaProcessada || listaProcessada.length === 0) {
        return { acuracidade: 100, impacto: 0, totalItens: 0 };
    }
    const somaAbsDesvios = listaProcessada.reduce((acc, curr) => acc + Math.abs(curr.desvio || 0), 0);
    const somaSistema = listaProcessada.reduce((acc, curr) => acc + (curr.sistema || 0), 0);
    const impactoTotal = listaProcessada.reduce((acc, curr) => acc + (curr.impacto || 0), 0);

    let accGlobal = 100;
    if (somaSistema > 0) {
      accGlobal = Math.max(0, 100 - (somaAbsDesvios / somaSistema * 100));
    } else if (somaAbsDesvios > 0) {
      accGlobal = 0;
    }

    return { acuracidade: accGlobal, impacto: impactoTotal, totalItens: listaProcessada.length };
  }, [listaProcessada]);

  const alternarOrdem = (key: SortConfig['key']) => {
    setSortConfig(prev => ({ key, direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc' }));
  };

  const enviarWhatsapp = () => {
    if (listaProcessada.length === 0) return;
    let mensagem = `*📊 RELATÓRIO AFERY*\n📅 Data: ${dataSelecionada.toLocaleDateString('pt-BR')}\n👤 Sup: ${supervisorAtivo}\n🎯 Acuracidade: ${metricasGlobais.acuracidade.toFixed(1)}%\n----------------------------\n\n`;
    listaProcessada.slice(0, 25).forEach(i => {
      let indicador = i.desvio === 0 ? '🟢' : (i.desvio < 0 ? '🔴' : '🟠');
      mensagem += `${indicador} *${i.id}* (${i.acuracidade.toFixed(0)}%)\n🏷️ _${i.descricao || 'Sem desc.'}_\nFísico: ${formatarPeso(i.fisico)} | Sist: ${formatarPeso(i.sistema)}\nDesvio: *${formatarPeso(i.desvio)}* | R$: ${formatarMoeda(i.impacto)}\n\n`;
    });
    Linking.openURL(`whatsapp://send?text=${encodeURIComponent(mensagem)}`);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <View style={[styles.headerBranco, { paddingTop: insets.top + 20 }]}>
        <View style={styles.logoRow}>
          <Image source={require('../../assets/images/icon.png')} style={styles.tinyLogo} />
          <View>
            <Text style={styles.titlePrincipal}>AFERY</Text>
            <Text style={styles.subtitle}>Relatórios de Acuracidade</Text>
          </View>
        </View>

        <View style={styles.dashboardAcc}>
            <View style={styles.accItem}>
                <Text style={styles.accLabel}>ACURACIDADE</Text>
                <Text style={[styles.accValue, { color: metricasGlobais.acuracidade > 98 ? '#10B981' : metricasGlobais.acuracidade > 90 ? '#F59E0B' : '#EF4444' }]}>
                    {(metricasGlobais.acuracidade || 0).toFixed(1)}%
                </Text>
            </View>
            <View style={styles.accDivisor} />
            <View style={styles.accItem}>
                <Text style={styles.accLabel}>IMPACTO FINANCEIRO</Text>
                <Text style={[styles.accValue, { color: (metricasGlobais.impacto || 0) < 0 ? '#EF4444' : '#10B981' }]}>
                    {formatarMoeda(metricasGlobais.impacto)}
                </Text>
            </View>
        </View>
        
        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color="#94A3B8" />
          <TextInput style={styles.inputBusca} placeholder="Buscar código ou descrição..." value={busca} onChangeText={setBusca} />
        </View>

        <View style={styles.barraFiltro}>
          <TouchableOpacity style={styles.dataContainer} onPress={() => setShowDatePicker(true)}>
            <Ionicons name="calendar-outline" size={20} color={AZUL_TECH} />
            <Text style={styles.txtData}>{dataSelecionada.toLocaleDateString('pt-BR')}</Text>
          </TouchableOpacity>
          <View style={styles.acoesHeader}>
            <TouchableOpacity onPress={enviarWhatsapp} style={styles.iconBtn}><Ionicons name="logo-whatsapp" size={24} color="#25D366" /></TouchableOpacity>
            <TouchableOpacity onPress={buscarDados} style={styles.iconBtn}><Ionicons name="refresh-outline" size={24} color={AZUL_TECH} /></TouchableOpacity>
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
          <Text style={styles.txtHead}>Item / Acc.</Text>
          <Ionicons name={sortConfig.key === 'id' ? (sortConfig.direction === 'asc' ? 'arrow-up' : 'arrow-down') : 'swap-vertical'} size={12} color="#CBD5E1" />
        </TouchableOpacity>
        <TouchableOpacity style={[styles.headBtn, { flex: COL_FISICO, justifyContent: 'center' }]} onPress={() => alternarOrdem('fisico')}>
          <Text style={styles.txtHead}>Físico</Text>
          <Ionicons name={sortConfig.key === 'fisico' ? (sortConfig.direction === 'asc' ? 'arrow-up' : 'arrow-down') : 'swap-vertical'} size={12} color="#CBD5E1" />
        </TouchableOpacity>
        <TouchableOpacity style={[styles.headBtn, { flex: COL_SISTEMA, justifyContent: 'center' }]} onPress={() => alternarOrdem('sistema')}>
          <Text style={styles.txtHead}>Sistema</Text>
          <Ionicons name={sortConfig.key === 'sistema' ? (sortConfig.direction === 'asc' ? 'arrow-up' : 'arrow-down') : 'swap-vertical'} size={12} color="#CBD5E1" />
        </TouchableOpacity>
        <TouchableOpacity style={[styles.headBtn, { flex: COL_DESVIO, justifyContent: 'flex-end' }]} onPress={() => alternarOrdem('desvio')}>
          <Text style={styles.txtHead}>Desvio</Text>
          <Ionicons name={sortConfig.key === 'desvio' ? (sortConfig.direction === 'asc' ? 'arrow-up' : 'arrow-down') : 'swap-vertical'} size={12} color="#CBD5E1" />
        </TouchableOpacity>
      </View>

      {!carregando && (
        <FlatList
          data={listaProcessada} 
          keyExtractor={item => item.internalId.toString()}
          contentContainerStyle={{ paddingBottom: 100 }}
          renderItem={({ item, index }) => (
            <TouchableOpacity style={[styles.row, { backgroundColor: index % 2 === 0 ? '#FFFFFF' : AZUL_LINHA }]} onPress={() => abrirAuditoria(item)}>
              <View style={{ flex: COL_ITEM }}>
                <View style={{flexDirection: 'row', alignItems: 'center', gap: 4}}>
                    <Text style={styles.itemCode}>{item.id}</Text>
                    <View style={[styles.miniBadgeAcc, {backgroundColor: (item.acuracidade || 0) > 95 ? '#D1FAE5' : '#FEE2E2'}]}>
                        <Text style={[styles.miniBadgeText, {color: (item.acuracidade || 0) > 95 ? '#065F46' : '#991B1B'}]}>{(item.acuracidade || 0).toFixed(0)}%</Text>
                    </View>
                </View>
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
                        {item.temObs && <MaterialCommunityIcons name="file-document-edit" size={12} color="#B45309" />}
                      </View>
                    )}
                    {(item.fisico > 0 || item.sistema > 0) && (
                      <TouchableOpacity onPress={() => confirmarExclusao(item)} style={styles.btnTrash}>
                          <Ionicons name="trash-outline" size={18} color="#64748B" />
                      </TouchableOpacity>
                    )}
                </View>
              </View>
            </TouchableOpacity>
          )}
        />
      )}
      {carregando && <ActivityIndicator size="large" color={AZUL_TECH} style={{ marginTop: 50 }} />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  headerBranco: { backgroundColor: '#FFFFFF', paddingBottom: 20, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: '#E2E8F0', elevation: 4 },
  logoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  tinyLogo: { width: 48, height: 48, marginRight: 12, borderRadius: 12 },
  titlePrincipal: { fontSize: 24, fontWeight: '900', color: AZUL_TECH, letterSpacing: -0.5, lineHeight: 28 },
  subtitle: { fontSize: 11, color: '#64748B', fontWeight: '800', textTransform: 'uppercase', marginTop: -2 },
  searchBar: { backgroundColor: '#F1F5F9', flexDirection: 'row', alignItems: 'center', borderRadius: 12, paddingHorizontal: 12, height: 45, marginVertical: 10, borderWidth: 1, borderColor: '#E2E8F0' },
  inputBusca: { flex: 1, marginLeft: 8, fontSize: 14, color: '#1E293B' },
  barraFiltro: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 5 },
  dataContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F1F5F9', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
  txtData: { color: AZUL_TECH, fontSize: 15, fontWeight: 'bold', marginLeft: 8 },
  acoesHeader: { flexDirection: 'row', gap: 15 },
  iconBtn: { padding: 4 },
  containerSupervisores: { paddingVertical: 12, backgroundColor: '#F8FAFC' },
  badge: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#E2E8F0', marginRight: 8 },
  badgeAtivo: { backgroundColor: AZUL_TECH },
  txtBadge: { fontSize: 13, fontWeight: 'bold', color: '#64748B' },
  txtBadgeAtivo: { color: '#FFF' },
  tableHeader: { flexDirection: 'row', paddingHorizontal: 15, paddingVertical: 12, borderBottomWidth: 2, borderBottomColor: '#CBD5E1', backgroundColor: '#FFFFFF' },
  headBtn: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  txtHead: { fontSize: 11, fontWeight: 'bold', color: '#64748B', textTransform: 'uppercase' },
  row: { flexDirection: 'row', paddingHorizontal: 15, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#E2E8F0', alignItems: 'center' },
  itemCode: { fontSize: 15, fontWeight: '900', color: AZUL_TECH }, 
  itemDesc: { fontSize: 11, color: '#64748B', marginTop: 4, width: '95%' }, 
  valText: { fontSize: 15, fontWeight: '700', color: '#1E293B' }, 
  valDesvio: { fontSize: 15, fontWeight: '900' }, 
  valGrana: { fontSize: 11, fontWeight: 'bold', marginTop: 2 }, 
  containerAlerta: { flexDirection: 'row', backgroundColor: '#FEF3C7', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, borderWidth: 1, borderColor: '#FDE68A' },
  btnTrash: { padding: 6, marginLeft: 4 },
  dashboardAcc: { flexDirection: 'row', backgroundColor: '#F8FAFC', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 5, justifyContent: 'space-around', alignItems: 'center' },
  accItem: { alignItems: 'center' },
  accLabel: { fontSize: 9, fontWeight: 'bold', color: '#94A3B8', marginBottom: 2 },
  accValue: { fontSize: 16, fontWeight: '900' },
  accDivisor: { width: 1, height: 30, backgroundColor: '#E2E8F0' },
  miniBadgeAcc: { paddingHorizontal: 5, paddingVertical: 1, borderRadius: 5 },
  miniBadgeText: { fontSize: 10, fontWeight: 'bold' }
});