import React, { useState, useEffect } from 'react';
import { 
  View, Text, TextInput, TouchableOpacity, StyleSheet, 
  FlatList, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, Modal, ScrollView, StatusBar
} from 'react-native';
import { Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker'; 
import { supabase } from '../../src/supabase'; 
import { useAuth } from '../../src/context/AuthContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context'; 

const COLORS = {
  background: '#FAFAFA',
  primary: '#E6A23C', 
  secondary: '#1E3A8A', 
  success: '#10B981',
  danger: '#EF4444', 
  text: '#1A202C', 
  border: '#DDDDDD',
  white: '#FFFFFF',
  placeholder: '#94A3B8', 
  inputBg: '#FFFFFF',
  cardSavedBg: '#F0FDF4', 
  cardAddBg: '#F0F9FF',   
};

export default function ItensAdminScreen() {
  const { organizacao_id } = useAuth();
  const insets = useSafeAreaInsets(); 
  
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [salvandoFator, setSalvandoFator] = useState(false);
  
  const [itens, setItens] = useState<any[]>([]);
  const [familias, setFamilias] = useState<any[]>([]);
  const [fornecedores, setFornecedores] = useState<any[]>([]);
  const [fatoresDoItem, setFatoresDoItem] = useState<any[]>([]); 
  
  const [filtro, setFiltro] = useState('');
  const [editandoId, setEditandoId] = useState<string | null>(null);

  const [codigoErp, setCodigoErp] = useState('');
  const [descricao, setDescricao] = useState('');
  const [familiaId, setFamiliaId] = useState<string>(''); 
  const [unidade, setUnidade] = useState('UN');
  const [supervisor, setSupervisor] = useState('');
  const [precoUnitario, setPrecoUnitario] = useState('');

  const [fornecedorId, setFornecedorId] = useState<string>('');
  const [fatorPalete, setFatorPalete] = useState('0');
  const [fatorCaixa, setFatorCaixa] = useState('0');
  const [pesoUnitarioProd, setPesoUnitarioProd] = useState('0');
  const [pesoSaco, setPesoSaco] = useState('0');
  const [pesoCaixaUnit, setPesoCaixaUnit] = useState('0');

  const [modalFornecedor, setModalFornecedor] = useState(false);
  const [novoFornecedor, setNovoFornecedor] = useState('');
  const [salvandoNovoFornecedor, setSalvandoNovoFornecedor] = useState(false);

  useEffect(() => { carregarDadosBase(); }, [organizacao_id]);

  const carregarDadosBase = async () => {
    if (!organizacao_id) return;
    setLoading(true);
    try {
      const [resItens, resFamilias, resForn] = await Promise.all([
        supabase.from('itens').select('*').eq('organizacao_id', organizacao_id).order('descricao'),
        supabase.from('familias').select('id, nome').eq('organizacao_id', organizacao_id),
        supabase.from('fornecedores').select('id, nome').eq('organizacao_id', organizacao_id).order('nome')
      ]);
      if (resItens.data) setItens(resItens.data);
      if (resFamilias.data) setFamilias(resFamilias.data);
      if (resForn.data) setFornecedores(resForn.data);
    } catch (e: any) { console.error(e); } finally { setLoading(false); }
  };

  const carregarFatoresDoItem = async (itemId: string) => {
    const { data } = await supabase.from('item_fornecedor').select('*, fornecedores(nome)').eq('item_id', itemId);
    setFatoresDoItem(data || []);
  };

  const handleSalvarItem = async () => {
    if (!descricao.trim() || !codigoErp.trim()) return Alert.alert('Erro', 'Código e Descrição obrigatórios.');
    setSalvando(true);

    // CORREÇÃO DA VÍRGULA NO PREÇO
    const precoFormatado = parseFloat(String(precoUnitario).replace(',', '.')) || 0;

    const dados = {
      organizacao_id, 
      sku_codigo: codigoErp.trim(), 
      descricao: descricao.trim(),
      familia_id: familiaId === '' ? null : familiaId, 
      unidade_medida: unidade,
      responsavel: supervisor.trim() || null, 
      preco_unitario: precoFormatado, // Usa o valor já corrigido
      ativo: true
    };

    try {
      let itemIdSalvo = editandoId;
      if (editandoId) { await supabase.from('itens').update(dados).eq('id', editandoId); }
      else { 
        const { data } = await supabase.from('itens').insert(dados).select('id').single();
        itemIdSalvo = data.id;
      }
      carregarDadosBase();
      if (!editandoId && itemIdSalvo) iniciarEdicao({ id: itemIdSalvo, ...dados });
      else Alert.alert("Sucesso", "Capa atualizada!");
    } catch (e: any) { Alert.alert('Erro', e.message); } finally { setSalvando(false); }
  };

  const iniciarEdicao = (item: any) => {
    setEditandoId(item.id); setCodigoErp(item.sku_codigo || ''); setDescricao(item.descricao || '');
    setFamiliaId(item.familia_id || ''); setUnidade(item.unidade_medida || 'UN');
    setSupervisor(item.responsavel || ''); setPrecoUnitario(item.preco_unitario?.toString().replace('.', ',') || '');
    setFornecedorId(''); setFatorPalete('0'); setFatorCaixa('0');
    setPesoUnitarioProd('0'); setPesoSaco('0'); setPesoCaixaUnit('0');
    carregarFatoresDoItem(item.id);
  };

  const fecharEdicao = () => {
    setEditandoId(null); setCodigoErp(''); setDescricao(''); setFamiliaId('');
    setUnidade('UN'); setSupervisor(''); setPrecoUnitario(''); 
    setFatoresDoItem([]); setFornecedorId('');
  };

  const handleSalvarFator = async () => {
    if (!editandoId || !fornecedorId) return Alert.alert('Atenção', 'Selecione o fornecedor.');
    setSalvandoFator(true);
    try {
      // CORREÇÃO DA VÍRGULA EM TODOS OS FATORES DE PESO E EMBALAGEM
      await supabase.from('item_fornecedor').upsert({
        organizacao_id, 
        item_id: editandoId, 
        fornecedor_id: fornecedorId,
        fator_palete: parseFloat(String(fatorPalete).replace(',', '.')) || 0,
        fator_caixa: parseFloat(String(fatorCaixa).replace(',', '.')) || 0,
        peso_unitario_produto: parseFloat(String(pesoUnitarioProd).replace(',', '.')) || 0,
        peso_saco_unitario: parseFloat(String(pesoSaco).replace(',', '.')) || 0,
        peso_caixa_unitaria: parseFloat(String(pesoCaixaUnit).replace(',', '.')) || 0,
      }, { onConflict: 'item_id, fornecedor_id' });
      
      setFornecedorId(''); setFatorPalete('0'); setFatorCaixa('0');
      setPesoUnitarioProd('0'); setPesoSaco('0'); setPesoCaixaUnit('0');
      carregarFatoresDoItem(editandoId); 
    } catch (e: any) { Alert.alert('Erro', 'Falha ao salvar regra.'); } finally { setSalvandoFator(false); }
  };

  const handleExcluirFator = (fId: string) => {
    Alert.alert('Excluir', 'Remover esta regra?', [{ text: 'Não' }, { text: 'Sim', onPress: async () => {
      await supabase.from('item_fornecedor').delete().eq('id', fId);
      if (editandoId) carregarFatoresDoItem(editandoId);
    }}]);
  };

  const handleExcluirItem = (id: string, desc: string) => {
    Alert.alert('Cuidado!', `Excluir "${desc}"?`, [{ text: 'Cancelar' }, { text: 'Sim', onPress: async () => {
      setLoading(true); await supabase.from('itens').delete().eq('id', id); carregarDadosBase();
    }}]);
  };

  const handleCriarFornecedorRapido = async () => {
    if (!novoFornecedor.trim()) return;
    setSalvandoNovoFornecedor(true);
    try {
      const { data } = await supabase.from('fornecedores').insert({ organizacao_id, nome: novoFornecedor.trim().toUpperCase() }).select('id, nome').single();
      setFornecedores([...fornecedores, data].sort((a, b) => a.nome.localeCompare(b.nome)));
      setFornecedorId(data.id); setModalFornecedor(false); setNovoFornecedor('');
    } catch (e: any) { Alert.alert('Erro', e.message); } finally { setSalvandoNovoFornecedor(false); }
  };

  const itensFiltrados = itens.filter(i => {
    const d = i.descricao?.toLowerCase() || ''; const c = i.sku_codigo?.toLowerCase() || '';
    return d.includes(filtro.toLowerCase()) || c.includes(filtro.toLowerCase());
  });

  // ================= MODO EDIÇÃO (COM KEYBOARD AVOIDING VIEW) =================
  if (editandoId) {
    return (
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}>
        <View style={styles.container}>
          <StatusBar barStyle="dark-content" />
          <Stack.Screen options={{ title: 'Engenharia Detalhada' }} />
          
          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <TouchableOpacity onPress={fecharEdicao} style={styles.btnVoltarTop}>
              <Ionicons name="arrow-back" size={20} color="#FFF" /><Text style={styles.btnVoltarText}>VOLTAR PARA A LISTA</Text>
            </TouchableOpacity>
            
            <View style={styles.card}>
              <Text style={styles.cardTitle}>📦 Dados Principais</Text>
              <View style={styles.row}>
                <TextInput style={[styles.input, { flex: 2, marginRight: 6 }]} placeholder="SKU" placeholderTextColor={COLORS.placeholder} value={codigoErp} onChangeText={setCodigoErp} />
                <View style={[styles.pickerWrap, { flex: 1 }]}><Picker selectedValue={unidade} onValueChange={setUnidade} dropdownIconColor={COLORS.secondary}><Picker.Item label="UN" value="UN" color={COLORS.text} /><Picker.Item label="KG" value="KG" color={COLORS.text} /></Picker></View>
              </View>
              <TextInput style={[styles.input, { marginBottom: 6 }]} placeholder="Descrição" placeholderTextColor={COLORS.placeholder} value={descricao} onChangeText={setDescricao} />
              <View style={styles.row}>
                <TextInput style={[styles.input, { flex: 2, marginRight: 6 }]} placeholder="Supervisor" placeholderTextColor={COLORS.placeholder} value={supervisor} onChangeText={setSupervisor} />
                <TextInput style={[styles.input, { flex: 1 }]} placeholder="R$" keyboardType="numeric" value={precoUnitario} onChangeText={setPrecoUnitario} />
              </View>
              <View style={styles.pickerWrapFull}><Picker selectedValue={familiaId} onValueChange={setFamiliaId} dropdownIconColor={COLORS.secondary}><Picker.Item label="Selecione a Família" value="" color={COLORS.placeholder} />{familias.map(f => <Picker.Item key={f.id} label={f.nome} value={f.id} color={COLORS.text} />)}</Picker></View>
              <TouchableOpacity style={styles.saveButton} onPress={handleSalvarItem} disabled={salvando}>{salvando ? <ActivityIndicator color="#FFF" /> : <Text style={styles.buttonText}>ATUALIZAR CAPA</Text>}</TouchableOpacity>
            </View>

            <View style={[styles.card, styles.cardAppliedRules]}>
              <Text style={[styles.cardTitle, { color: COLORS.success }]}>✅ Regras Vinculadas</Text>
              {fatoresDoItem.map((f) => (
                <View key={f.id} style={styles.fatorMiniCard}>
                  <View style={{ flex: 1 }}><Text style={{ fontWeight: 'bold', color: COLORS.text }}>{f.fornecedores?.nome}</Text><Text style={{ fontSize: 11 }}>P: {f.fator_palete} | C: {f.fator_caixa} | {f.peso_unitario_produto}kg</Text></View>
                  <TouchableOpacity onPress={() => handleExcluirFator(f.id)}><Ionicons name="trash" size={18} color={COLORS.danger} /></TouchableOpacity>
                </View>
              ))}
            </View>

            <View style={[styles.card, styles.cardAddBg]}>
              <Text style={styles.cardTitle}>➕ Vincular Fornecedor</Text>
              <View style={styles.row}>
                <View style={[styles.pickerWrapFull, { flex: 1, marginBottom: 0, marginRight: 8 }]}><Picker selectedValue={fornecedorId} onValueChange={setFornecedorId} dropdownIconColor={COLORS.secondary}><Picker.Item label="Fornecedor..." value="" color={COLORS.placeholder} />{fornecedores.map(f => <Picker.Item key={f.id} label={f.nome} value={f.id} color={COLORS.text} />)}</Picker></View>
                <TouchableOpacity style={styles.btnNovoFornecedor} onPress={() => setModalFornecedor(true)}><Ionicons name="add" size={24} color="#FFF" /></TouchableOpacity>
              </View>
              <View style={[styles.row, { marginTop: 10 }]}>
                <View style={{ flex: 1, marginRight: 4 }}><Text style={styles.miniLabel}>Palete</Text><TextInput style={styles.input} keyboardType="numeric" value={fatorPalete} onChangeText={setFatorPalete} /></View>
                <View style={{ flex: 1, marginRight: 4 }}><Text style={styles.miniLabel}>Caixa</Text><TextInput style={styles.input} keyboardType="numeric" value={fatorCaixa} onChangeText={setFatorCaixa} /></View>
                <View style={{ flex: 1 }}><Text style={styles.miniLabel}>Peso Unit.</Text><TextInput style={styles.input} keyboardType="numeric" value={pesoUnitarioProd} onChangeText={setPesoUnitarioProd} /></View>
              </View>
              <View style={styles.row}>
                 <View style={{ flex: 1, marginRight: 4 }}><Text style={styles.miniLabel}>Tara Saco</Text><TextInput style={styles.input} keyboardType="numeric" value={pesoSaco} onChangeText={setPesoSaco} /></View>
                 <View style={{ flex: 1 }}><Text style={styles.miniLabel}>Tara Cx</Text><TextInput style={styles.input} keyboardType="numeric" value={pesoCaixaUnit} onChangeText={setPesoCaixaUnit} /></View>
              </View>
              <TouchableOpacity style={styles.saveFatorButton} onPress={handleSalvarFator} disabled={salvandoFator}>{salvandoFator ? <ActivityIndicator color="#FFF" /> : <Text style={styles.buttonText}>SALVAR REGRA</Text>}</TouchableOpacity>
            </View>
            <View style={{ height: 100 }} />
          </ScrollView>
          
          {/* MODAL FORNECEDOR (Dentro do if de edição) */}
          <Modal visible={modalFornecedor} transparent animationType="fade">
            <View style={styles.modalOverlay}><View style={styles.modalContent}><Text style={styles.modalTitle}>Novo Fornecedor</Text><TextInput style={styles.modalInput} autoCapitalize="characters" placeholder="Nome da Empresa" value={novoFornecedor} onChangeText={setNovoFornecedor} /><View style={styles.modalRowBtns}><TouchableOpacity onPress={() => setModalFornecedor(false)} style={styles.modalBtnCancel}><Text style={{color: COLORS.danger, fontWeight: 'bold'}}>CANCELAR</Text></TouchableOpacity><TouchableOpacity onPress={handleCriarFornecedorRapido} style={styles.modalBtnSave} disabled={salvandoNovoFornecedor}>{salvandoNovoFornecedor ? <ActivityIndicator color="#FFF" /> : <Text style={{color: '#FFF', fontWeight: 'bold'}}>SALVAR</Text>}</TouchableOpacity></View></View></View>
          </Modal>

        </View>
      </KeyboardAvoidingView>
    );
  }

  // ================= MODO LISTAGEM (PURO, SEM KEYBOARD AVOIDING VIEW) =================
  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <Stack.Screen options={{ title: 'Gestão de Itens' }} />

      <FlatList 
        data={itensFiltrados} 
        keyExtractor={(item) => String(item.id)} 
        contentContainerStyle={{ paddingBottom: insets.bottom + 80 }}
        ListHeaderComponent={
          <View>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>📦 Cadastro Rápido de Item</Text>
              <View style={styles.row}>
                <TextInput style={[styles.input, { flex: 2, marginRight: 6 }]} placeholder="SKU" placeholderTextColor={COLORS.placeholder} value={codigoErp} onChangeText={setCodigoErp} />
                <View style={[styles.pickerWrap, { flex: 1 }]}><Picker selectedValue={unidade} onValueChange={setUnidade} dropdownIconColor={COLORS.secondary}><Picker.Item label="UN" value="UN" color={COLORS.text} /><Picker.Item label="KG" value="KG" color={COLORS.text} /></Picker></View>
              </View>
              <TextInput style={[styles.input, { marginBottom: 8 }]} placeholder="Descrição" placeholderTextColor={COLORS.placeholder} value={descricao} onChangeText={setDescricao} />
              <TouchableOpacity style={styles.saveButton} onPress={handleSalvarItem} disabled={salvando}>{salvando ? <ActivityIndicator color="#FFF" /> : <Text style={styles.buttonText}>CADASTRAR ITEM</Text>}</TouchableOpacity>
            </View>
            <View style={styles.searchContainer}><Ionicons name="search" size={18} color={COLORS.placeholder} /><TextInput style={styles.searchInput} placeholder="Filtrar por SKU ou Nome..." placeholderTextColor={COLORS.placeholder} value={filtro} onChangeText={setFiltro} /></View>
            {loading && <ActivityIndicator size="large" color={COLORS.secondary} style={{ marginVertical: 20 }} />}
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.itemCard}>
            <View style={styles.itemInfo}><Text style={styles.itemCode}>{item.sku_codigo}</Text><Text style={styles.itemName} numberOfLines={1}>{item.descricao}</Text></View>
            <TouchableOpacity onPress={() => iniciarEdicao(item)} style={styles.editBtn}><Ionicons name="construct-outline" size={18} color={COLORS.secondary} /></TouchableOpacity>
            <TouchableOpacity onPress={() => handleExcluirItem(item.id, item.descricao)} style={styles.deleteBtn}><Ionicons name="trash-outline" size={18} color={COLORS.danger} /></TouchableOpacity>
          </View>
        )} 
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 10, backgroundColor: COLORS.background },
  card: { backgroundColor: COLORS.white, padding: 12, borderRadius: 10, elevation: 2, marginBottom: 5, borderWidth: 1, borderColor: '#E2E8F0' },
  cardTitle: { fontSize: 13, fontWeight: '900', marginBottom: 8, color: COLORS.secondary, textTransform: 'uppercase' },
  miniLabel: { fontSize: 9, color: '#64748B', marginBottom: 2, fontWeight: 'bold', textTransform: 'uppercase' },
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  input: { height: 40, backgroundColor: '#FFF', borderWidth: 1, borderColor: COLORS.border, borderRadius: 6, paddingHorizontal: 10, fontSize: 14, color: COLORS.text, fontWeight: '600' },
  pickerWrap: { height: 40, backgroundColor: '#FFF', borderRadius: 6, justifyContent: 'center', borderWidth: 1, borderColor: COLORS.border },
  pickerWrapFull: { height: 40, backgroundColor: '#FFF', borderRadius: 6, justifyContent: 'center', marginBottom: 8, borderWidth: 1, borderColor: COLORS.border },
  saveButton: { height: 45, backgroundColor: COLORS.primary, borderRadius: 6, justifyContent: 'center', alignItems: 'center' },
  saveFatorButton: { height: 42, backgroundColor: COLORS.secondary, borderRadius: 6, justifyContent: 'center', alignItems: 'center', marginTop: 5 },
  buttonText: { color: '#FFF', fontWeight: 'bold', fontSize: 13 },
  btnVoltarTop: { backgroundColor: COLORS.secondary, padding: 10, borderRadius: 6, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  btnVoltarText: { color: '#FFF', fontWeight: 'bold', fontSize: 12, marginLeft: 8 },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', paddingHorizontal: 12, borderRadius: 8, marginBottom: 8, marginTop: 5, borderWidth: 1, borderColor: COLORS.border, height: 42 },
  searchInput: { flex: 1, height: 42, marginLeft: 8, fontSize: 14, color: COLORS.text, fontWeight: '600' },
  itemCard: { flexDirection: 'row', backgroundColor: '#FFF', padding: 10, borderRadius: 8, marginBottom: 6, alignItems: 'center', elevation: 1 },
  itemInfo: { flex: 1 },
  itemCode: { fontSize: 11, color: COLORS.primary, fontWeight: '900' },
  itemName: { fontSize: 13, fontWeight: '600', color: COLORS.text },
  editBtn: { padding: 8, backgroundColor: '#E0F2FE', borderRadius: 6, marginRight: 6 },
  deleteBtn: { padding: 8, backgroundColor: '#FEE2E2', borderRadius: 6 },
  btnNovoFornecedor: { backgroundColor: COLORS.success, height: 40, width: 45, borderRadius: 6, justifyContent: 'center', alignItems: 'center', marginLeft: 5 },
  fatorMiniCard: { flexDirection: 'row', backgroundColor: '#F8FAFC', padding: 8, borderRadius: 6, marginBottom: 6, borderWidth: 1, borderColor: '#E2E8F0' },
  cardAppliedRules: { backgroundColor: COLORS.cardSavedBg, borderColor: '#A7F3D0', marginTop: 5 },
  cardAddBg: { backgroundColor: COLORS.cardAddBg, borderColor: '#BAE6FD', marginTop: 5 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '85%', backgroundColor: '#FFF', borderRadius: 15, padding: 20 },
  modalInput: { height: 45, borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, paddingHorizontal: 12, marginVertical: 15, color: COLORS.text, fontSize: 16 },
  modalRowBtns: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  modalBtnSave: { backgroundColor: COLORS.success, padding: 12, borderRadius: 8, flex: 1, marginLeft: 5, alignItems: 'center' },
  modalBtnCancel: { padding: 12, flex: 1, marginRight: 5, alignItems: 'center' },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.secondary, textAlign: 'center' }
});