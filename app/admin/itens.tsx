import React, { useState, useEffect } from 'react';
import { 
  View, Text, TextInput, TouchableOpacity, StyleSheet, 
  FlatList, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, Modal, ScrollView, StatusBar
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker'; 
import { supabase } from '../../src/supabase'; 
import { useAuth } from '../../src/context/AuthContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context'; 

const COLORS = {
  background: '#F8FAFC',
  primary: '#E6A23C', 
  secondary: '#1E3A8A', 
  success: '#10B981',
  danger: '#EF4444', 
  text: '#1E293B', 
  border: '#E2E8F0',
  white: '#FFFFFF',
  placeholder: '#64748B', 
  cardSavedBg: '#F0FDF4', 
  cardAddBg: '#F0F9FF',   
};

export default function ItensAdminScreen() {
  const { organizacao_id } = useAuth();
  const insets = useSafeAreaInsets(); 
  const router = useRouter();
  
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
    const precoFormatado = parseFloat(String(precoUnitario).replace(',', '.')) || 0;

    const dados = {
      organizacao_id, 
      sku_codigo: codigoErp.trim(), 
      descricao: descricao.trim(),
      familia_id: familiaId === '' ? null : familiaId, 
      unidade_medida: unidade,
      responsavel: supervisor.trim() || null, 
      preco_unitario: precoFormatado,
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
      else Alert.alert("Sucesso", "Dados atualizados!");
    } catch (e: any) { Alert.alert('Erro', e.message); } finally { setSalvando(false); }
  };

  const iniciarEdicao = (item: any) => {
    setEditandoId(item.id); setCodigoErp(item.sku_codigo || ''); setDescricao(item.descricao || '');
    setFamiliaId(item.familia_id || ''); setUnidade(item.unidade_medida || 'UN');
    setSupervisor(item.responsavel || ''); 
    
    // AJUSTE CIRÚRGICO: Se o preço for 0, deixa vazio para mostrar o placeholder
    const precoTexto = item.preco_unitario && item.preco_unitario !== 0 
      ? item.preco_unitario.toString().replace('.', ',') 
      : '';
    setPrecoUnitario(precoTexto);
    
    carregarFatoresDoItem(item.id);
  };

  const fecharEdicao = () => {
    setEditandoId(null); setCodigoErp(''); setDescricao(''); setFamiliaId('');
    setUnidade('UN'); setSupervisor(''); setPrecoUnitario(''); 
    setFatoresDoItem([]);
  };

  const handleSalvarFator = async () => {
    if (!editandoId || !fornecedorId) return Alert.alert('Atenção', 'Selecione o fornecedor.');
    setSalvandoFator(true);
    try {
      await supabase.from('item_fornecedor').upsert({
        organizacao_id, 
        item_id: editandoId, 
        fornecedor_id: fornecedorId,
        fator_palete: parseFloat(String(fatorPalete).replace(',', '.')) || 0,
        fator_caixa: parseFloat(String(fatorCaixa).replace(',', '.')) || 0,
        weight_unitario_produto: parseFloat(String(pesoUnitarioProd).replace(',', '.')) || 0,
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

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />
        <StatusBar barStyle="light-content" />

        <View style={[styles.headerAzul, { paddingTop: insets.top + 5 }]}>
          <TouchableOpacity onPress={() => editandoId ? fecharEdicao() : router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{editandoId ? 'Engenharia do Item' : 'Gestão de Itens'}</Text>
        </View>

        {editandoId ? (
          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.scrollContent}>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>📦 Dados Principais</Text>
              <View style={styles.row}>
                <TextInput 
                  style={[styles.input, { flex: 2, marginRight: 8 }]} 
                  placeholder="SKU" 
                  placeholderTextColor={COLORS.placeholder}
                  value={codigoErp} 
                  onChangeText={setCodigoErp} 
                />
                <View style={[styles.pickerWrap, { flex: 1 }]}><Picker selectedValue={unidade} onValueChange={setUnidade} style={{marginTop: -4}}><Picker.Item label="UN" value="UN" /><Picker.Item label="KG" value="KG" /></Picker></View>
              </View>
              <TextInput 
                style={[styles.input, { marginBottom: 8 }]} 
                placeholder="Descrição" 
                placeholderTextColor={COLORS.placeholder}
                value={descricao} 
                onChangeText={setDescricao} 
              />
              <View style={styles.row}>
                <TextInput 
                  style={[styles.input, { flex: 2, marginRight: 8 }]} 
                  placeholder="Responsável" // AJUSTE CIRÚRGICO: Placeholder alterado
                  placeholderTextColor={COLORS.placeholder}
                  value={supervisor} 
                  onChangeText={setSupervisor} 
                />
                <TextInput 
                  style={[styles.input, { flex: 1 }]} 
                  placeholder="R$ Preço" 
                  placeholderTextColor={COLORS.placeholder}
                  keyboardType="numeric" 
                  value={precoUnitario} 
                  onChangeText={setPrecoUnitario} 
                />
              </View>
              <View style={styles.pickerWrapFull}><Picker selectedValue={familiaId} onValueChange={setFamiliaId} style={{marginTop: -4}}><Picker.Item label="Família..." value="" />{familias.map(f => <Picker.Item key={f.id} label={f.nome} value={f.id} />)}</Picker></View>
              <TouchableOpacity style={styles.saveButton} onPress={handleSalvarItem} disabled={salvando}>{salvando ? <ActivityIndicator color="#FFF" /> : <Text style={styles.buttonText}>ATUALIZAR DADOS</Text>}</TouchableOpacity>
            </View>

            <View style={[styles.card, styles.cardAppliedRules]}>
              <Text style={[styles.cardTitle, { color: COLORS.success, marginBottom: 5 }]}>✅ Regras Vinculadas</Text>
              {fatoresDoItem.map((f) => (
                <View key={f.id} style={styles.fatorMiniCard}>
                  <View style={{ flex: 1 }}><Text style={{ fontWeight: 'bold', color: COLORS.text, fontSize: 13 }}>{f.fornecedores?.nome}</Text><Text style={{ fontSize: 11, color: '#64748B' }}>P: {f.fator_palete} | C: {f.fator_caixa} | {f.peso_unitario_produto}kg</Text></View>
                  <TouchableOpacity onPress={() => handleExcluirFator(f.id)}><Ionicons name="trash" size={18} color={COLORS.danger} /></TouchableOpacity>
                </View>
              ))}
              {fatoresDoItem.length === 0 && <Text style={{fontSize: 11, color: COLORS.placeholder, textAlign: 'center'}}>Nenhuma regra.</Text>}
            </View>

            <View style={[styles.card, styles.cardAddBg]}>
              <Text style={styles.cardTitle}>➕ Nova Regra de Peso</Text>
              <View style={styles.row}>
                <View style={[styles.pickerWrapFull, { flex: 1, marginBottom: 0, marginRight: 8 }]}><Picker selectedValue={fornecedorId} onValueChange={setFornecedorId} style={{marginTop: -4}}><Picker.Item label="Fornecedor..." value="" />{fornecedores.map(f => <Picker.Item key={f.id} label={f.nome} value={f.id} />)}</Picker></View>
                <TouchableOpacity style={styles.btnNovoFornecedor} onPress={() => setModalFornecedor(true)}><Ionicons name="add" size={22} color="#FFF" /></TouchableOpacity>
              </View>
              <View style={[styles.row, { marginTop: 8 }]}>
                <View style={{ flex: 1, marginRight: 6 }}><Text style={styles.miniLabel}>Palete</Text><TextInput style={styles.input} placeholderTextColor={COLORS.placeholder} keyboardType="numeric" value={fatorPalete} onChangeText={setFatorPalete} /></View>
                <View style={{ flex: 1, marginRight: 6 }}><Text style={styles.miniLabel}>Caixa</Text><TextInput style={styles.input} placeholderTextColor={COLORS.placeholder} keyboardType="numeric" value={fatorCaixa} onChangeText={setFatorCaixa} /></View>
                <View style={{ flex: 1 }}><Text style={styles.miniLabel}>Peso Unit.</Text><TextInput style={styles.input} placeholderTextColor={COLORS.placeholder} keyboardType="numeric" value={pesoUnitarioProd} onChangeText={setPesoUnitarioProd} /></View>
              </View>
              <View style={styles.row}>
                 <View style={{ flex: 1, marginRight: 6 }}><Text style={styles.miniLabel}>Saco</Text><TextInput style={styles.input} placeholderTextColor={COLORS.placeholder} keyboardType="numeric" value={pesoSaco} onChangeText={setPesoSaco} /></View>
                 <View style={{ flex: 1 }}><Text style={styles.miniLabel}>Cx Unit</Text><TextInput style={styles.input} placeholderTextColor={COLORS.placeholder} keyboardType="numeric" value={pesoCaixaUnit} onChangeText={setPesoCaixaUnit} /></View>
              </View>
              <TouchableOpacity style={styles.saveFatorButton} onPress={handleSalvarFator} disabled={salvandoFator}>{salvandoFator ? <ActivityIndicator color="#FFF" /> : <Text style={styles.buttonText}>VINCULAR REGRA</Text>}</TouchableOpacity>
            </View>
          </ScrollView>
        ) : (
          <FlatList 
            data={itensFiltrados} 
            keyExtractor={(item) => String(item.id)} 
            contentContainerStyle={{ padding: 12, paddingBottom: insets.bottom + 80 }}
            ListHeaderComponent={
              <View>
                <View style={styles.card}>
                  <Text style={styles.cardTitle}>➕ Cadastro Rápido</Text>
                  <View style={styles.row}>
                    <TextInput 
                      style={[styles.input, { flex: 2, marginRight: 8 }]} 
                      placeholder="SKU" 
                      placeholderTextColor={COLORS.placeholder}
                      value={codigoErp} 
                      onChangeText={setCodigoErp} 
                    />
                    <View style={[styles.pickerWrap, { flex: 1 }]}><Picker selectedValue={unidade} onValueChange={setUnidade} style={{marginTop: -4}}><Picker.Item label="UN" value="UN" /><Picker.Item label="KG" value="KG" /></Picker></View>
                  </View>
                  <TextInput 
                    style={[styles.input, { marginBottom: 8 }]} 
                    placeholder="Descrição do Item" 
                    placeholderTextColor={COLORS.placeholder}
                    value={descricao} 
                    onChangeText={setDescricao} 
                  />
                  <TouchableOpacity style={styles.saveButton} onPress={handleSalvarItem} disabled={salvando}>{salvando ? <ActivityIndicator color="#FFF" /> : <Text style={styles.buttonText}>CADASTRAR ITEM</Text>}</TouchableOpacity>
                </View>
                <View style={styles.searchContainer}>
                  <Ionicons name="search" size={18} color={COLORS.placeholder} />
                  <TextInput 
                    style={styles.searchInput} 
                    placeholder="Filtrar..." 
                    placeholderTextColor={COLORS.placeholder}
                    value={filtro} 
                    onChangeText={setFiltro} 
                  />
                </View>
                {loading && <ActivityIndicator size="small" color={COLORS.secondary} style={{ marginVertical: 10 }} />}
              </View>
            }
            renderItem={({ item }) => (
              <View style={styles.itemCard}>
                <View style={styles.itemInfo}>
                  <Text style={styles.itemCode}>{item.sku_codigo}</Text>
                  <Text style={styles.itemName} numberOfLines={1}>{item.descricao}</Text>
                </View>
                <TouchableOpacity onPress={() => iniciarEdicao(item)} style={styles.editBtn}><Ionicons name="construct-outline" size={18} color={COLORS.secondary} /></TouchableOpacity>
                <TouchableOpacity onPress={() => handleExcluirItem(item.id, item.descricao)} style={styles.deleteBtn}><Ionicons name="trash-outline" size={18} color={COLORS.danger} /></TouchableOpacity>
              </View>
            )} 
          />
        )}

        <Modal visible={modalFornecedor} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Novo Fornecedor</Text>
              <TextInput 
                style={[styles.input, {marginVertical: 15}]} 
                autoCapitalize="characters" 
                placeholder="Nome" 
                placeholderTextColor={COLORS.placeholder}
                value={novoFornecedor} 
                onChangeText={setNovoFornecedor} 
              />
              <View style={styles.modalRowBtns}>
                <TouchableOpacity onPress={() => setModalFornecedor(false)} style={styles.modalBtnCancel}><Text style={{color: COLORS.danger, fontWeight: 'bold', fontSize: 12}}>CANCELAR</Text></TouchableOpacity>
                <TouchableOpacity onPress={handleCriarFornecedorRapido} style={styles.modalBtnSave} disabled={salvandoNovoFornecedor}>{salvandoNovoFornecedor ? <ActivityIndicator color="#FFF" /> : <Text style={{color: '#FFF', fontWeight: 'bold', fontSize: 12}}>SALVAR</Text>}</TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  headerAzul: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingBottom: 12,
    paddingHorizontal: 15, 
    backgroundColor: COLORS.secondary,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    elevation: 4,
  },
  backBtn: { marginRight: 12 },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#FFF' },

  scrollContent: { padding: 12 },
  card: { backgroundColor: COLORS.white, padding: 12, borderRadius: 10, elevation: 1, marginBottom: 8, borderWidth: 1, borderColor: COLORS.border },
  cardTitle: { fontSize: 11, fontWeight: '900', marginBottom: 8, color: COLORS.secondary, textTransform: 'uppercase' },
  miniLabel: { fontSize: 9, color: '#64748B', marginBottom: 2, fontWeight: 'bold', textTransform: 'uppercase' },
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  input: { height: 40, backgroundColor: '#FFF', borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, paddingHorizontal: 12, fontSize: 14, color: COLORS.text, fontWeight: '600' },
  pickerWrap: { height: 40, backgroundColor: '#FFF', borderRadius: 8, justifyContent: 'center', borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden' },
  pickerWrapFull: { height: 40, backgroundColor: '#FFF', borderRadius: 8, justifyContent: 'center', marginBottom: 8, borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden' },
  saveButton: { height: 42, backgroundColor: COLORS.primary, borderRadius: 8, justifyContent: 'center', alignItems: 'center', elevation: 2 },
  saveFatorButton: { height: 40, backgroundColor: COLORS.secondary, borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginTop: 8 },
  buttonText: { color: '#FFF', fontWeight: 'bold', fontSize: 13 },
  
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', paddingHorizontal: 10, borderRadius: 8, marginBottom: 10, marginTop: 4, borderWidth: 1, borderColor: COLORS.border, height: 40 },
  searchInput: { flex: 1, height: 40, marginLeft: 8, fontSize: 14, color: COLORS.text, fontWeight: '600' },
  
  itemCard: { flexDirection: 'row', backgroundColor: '#FFF', padding: 10, borderRadius: 10, marginBottom: 8, alignItems: 'center', borderWidth: 1, borderColor: '#F1F5F9' },
  itemInfo: { flex: 1 },
  itemCode: { fontSize: 11, color: COLORS.primary, fontWeight: '900' },
  itemName: { fontSize: 14, fontWeight: '700', color: COLORS.text },
  editBtn: { padding: 8, backgroundColor: '#E0F2FE', borderRadius: 6, marginRight: 6 },
  deleteBtn: { padding: 8, backgroundColor: '#FEE2E2', borderRadius: 6 },
  
  btnNovoFornecedor: { backgroundColor: COLORS.success, height: 40, width: 44, borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginLeft: 6 },
  fatorMiniCard: { flexDirection: 'row', backgroundColor: '#F8FAFC', padding: 8, borderRadius: 8, marginBottom: 6, borderWidth: 1, borderColor: '#E2E8F0', alignItems: 'center' },
  cardAppliedRules: { backgroundColor: COLORS.cardSavedBg, borderColor: '#A7F3D0' },
  cardAddBg: { backgroundColor: COLORS.cardAddBg, borderColor: '#BAE6FD' },
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '80%', backgroundColor: '#FFF', borderRadius: 12, padding: 20 },
  modalRowBtns: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  modalBtnSave: { backgroundColor: COLORS.success, padding: 12, borderRadius: 8, flex: 1, marginLeft: 6, alignItems: 'center' },
  modalBtnCancel: { padding: 12, flex: 1, marginRight: 6, alignItems: 'center' },
  modalTitle: { fontSize: 16, fontWeight: 'bold', color: COLORS.secondary, textAlign: 'center' }
});