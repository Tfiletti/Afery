import React, { useState, useEffect } from 'react';
import { 
  View, Text, TextInput, TouchableOpacity, StyleSheet, 
  FlatList, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, Modal, ScrollView
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
  const { organizacao_id, role } = useAuth();
  const insets = useSafeAreaInsets(); 
  
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [salvandoFator, setSalvandoFator] = useState(false);
  
  const [itens, setItens] = useState<any[]>([]);
  const [familias, setFamilias] = useState<any[]>([]);
  const [tarasPadrao, setTarasPadrao] = useState<any[]>([]);
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
  const [taraPadraoId, setTaraPadraoId] = useState<string>('');

  const [modalFornecedor, setModalFornecedor] = useState(false);
  const [novoFornecedor, setNovoFornecedor] = useState('');
  const [salvandoNovoFornecedor, setSalvandoNovoFornecedor] = useState(false);

  useEffect(() => {
    carregarDadosBase();
  }, [organizacao_id]);

  const carregarDadosBase = async () => {
    if (!organizacao_id) return;
    setLoading(true);
    try {
      const [resItens, resFamilias, resTaras, resForn] = await Promise.all([
        supabase.from('itens').select('*').eq('organizacao_id', organizacao_id).order('descricao'),
        supabase.from('familias').select('id, nome').eq('organizacao_id', organizacao_id),
        supabase.from('taras_padrao').select('id, nome, peso').eq('organizacao_id', organizacao_id),
        supabase.from('fornecedores').select('id, nome').eq('organizacao_id', organizacao_id).order('nome')
      ]);
      if (resItens.data) setItens(resItens.data);
      if (resFamilias.data) setFamilias(resFamilias.data);
      if (resTaras.data) setTarasPadrao(resTaras.data);
      if (resForn.data) setFornecedores(resForn.data);
    } catch (e: any) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const carregarFatoresDoItem = async (itemId: string) => {
    try {
      const { data, error } = await supabase
        .from('item_fornecedor')
        .select('*, fornecedores(nome)') 
        .eq('item_id', itemId);
      if (error) throw error;
      setFatoresDoItem(data || []);
    } catch (e: any) {
      console.error('Erro ao buscar fatores', e);
    }
  };

  const handleSalvarItem = async () => {
    if (!descricao.trim() || !codigoErp.trim()) {
      return Alert.alert('Erro', 'Código e Descrição são obrigatórios.');
    }
    setSalvando(true);
    
    const dados = {
      organizacao_id,
      sku_codigo: codigoErp.trim(),
      descricao: descricao.trim(),
      familia_id: familiaId === '' ? null : familiaId, 
      unidade_medida: unidade,
      responsavel: supervisor.trim() || null,
      preco_unitario: parseFloat(precoUnitario.replace(',', '.')) || 0,
      ativo: true
    };

    try {
      let itemIdSalvo = editandoId;
      if (editandoId) {
        const { error } = await supabase.from('itens').update(dados).eq('id', editandoId);
        if (error) throw error;
        Alert.alert("Sucesso", "Capa do item atualizada!");
      } else {
        const { data, error } = await supabase.from('itens').insert(dados).select('id').single();
        if (error) throw error;
        itemIdSalvo = data.id;
        Alert.alert("Sucesso", "Item cadastrado! Adicione as regras de fornecedores abaixo.");
      }
      
      carregarDadosBase();
      if (!editandoId && itemIdSalvo) {
        const itemNovo = { id: itemIdSalvo, ...dados };
        iniciarEdicao(itemNovo);
      }
    } catch (e: any) {
      if (e.message.includes('unique constraint')) {
        Alert.alert('Código Duplicado', 'Já existe um item com esse SKU/Código. Busque por ele na lista abaixo para editá-lo.');
      } else {
        Alert.alert('Erro ao salvar item', e.message);
      }
    } finally {
      setSalvando(false);
    }
  };

  const iniciarEdicao = (item: any) => {
    setEditandoId(item.id);
    setCodigoErp(item.sku_codigo || '');
    setDescricao(item.descricao || '');
    setFamiliaId(item.familia_id || '');
    setUnidade(item.unidade_medida || 'UN');
    setSupervisor(item.responsavel || '');
    setPrecoUnitario(item.preco_unitario?.toString().replace('.', ',') || '');
    
    limparFormFatores();
    carregarFatoresDoItem(item.id);
  };

  const fecharEdicao = () => {
    setCodigoErp(''); setDescricao(''); setFamiliaId('');
    setUnidade('UN'); setSupervisor(''); setPrecoUnitario(''); 
    setEditandoId(null);
    setFatoresDoItem([]);
    limparFormFatores();
  };

  const limparFormFatores = () => {
    setFornecedorId('');
    setFatorPalete('0'); setFatorCaixa('0');
    setPesoUnitarioProd('0'); setPesoSaco('0'); setPesoCaixaUnit('0');
    setTaraPadraoId('');
  };

  const handleSalvarFator = async () => {
    if (!editandoId) return Alert.alert('Atenção', 'Salve a capa do item primeiro.');
    if (!fornecedorId) return Alert.alert('Atenção', 'Selecione um fornecedor.');

    setSalvandoFator(true);
    const dadosFator = {
      organizacao_id,
      item_id: editandoId,
      fornecedor_id: fornecedorId,
      fator_palete: parseFloat(fatorPalete.replace(',', '.')) || 0,
      fator_caixa: parseFloat(fatorCaixa.replace(',', '.')) || 0,
      peso_unitario_produto: parseFloat(pesoUnitarioProd.replace(',', '.')) || 0,
      peso_saco_unitario: parseFloat(pesoSaco.replace(',', '.')) || 0,
      peso_caixa_unitaria: parseFloat(pesoCaixaUnit.replace(',', '.')) || 0,
      tara_padrao_id: taraPadraoId === '' ? null : taraPadraoId,
    };

    try {
      const { error } = await supabase.from('item_fornecedor').upsert(dadosFator, { onConflict: 'item_id, fornecedor_id' });
      if (error) throw error;
      
      limparFormFatores(); 
      carregarFatoresDoItem(editandoId); 
    } catch (e: any) {
      Alert.alert('Erro', 'Não foi possível salvar a regra.');
    } finally {
      setSalvandoFator(false);
    }
  };

  const handleExcluirFator = (fatorId: string) => {
    Alert.alert('Atenção', 'Excluir esta regra de fornecedor?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Excluir', style: 'destructive', onPress: async () => {
          await supabase.from('item_fornecedor').delete().eq('id', fatorId);
          if (editandoId) carregarFatoresDoItem(editandoId);
        }
      }
    ]);
  };

  // NOVA FUNÇÃO: Excluir a Capa do Item por completo
  const handleExcluirItem = (id: string, descricaoItem: string) => {
    Alert.alert(
      'Cuidado!',
      `Tem certeza que deseja excluir o item:\n"${descricaoItem}"?\n\nTodas as regras de fornecedores atreladas a ele também poderão ser perdidas.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Sim, Excluir', 
          style: 'destructive', 
          onPress: async () => {
            try {
              setLoading(true);
              const { error } = await supabase.from('itens').delete().eq('id', id);
              if (error) throw error;
              carregarDadosBase(); // Recarrega a lista sem o item
            } catch (e: any) {
              Alert.alert('Erro', 'Não foi possível excluir o item. Ele já pode estar vinculado a algum inventário ou movimentação.');
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const handleCriarFornecedorRapido = async () => {
    if (!novoFornecedor.trim()) return;
    setSalvandoNovoFornecedor(true);
    try {
      const { data, error } = await supabase
        .from('fornecedores')
        .insert({ organizacao_id, nome: novoFornecedor.trim().toUpperCase() })
        .select('id, nome')
        .single();
      if (error) throw error;
      
      setFornecedores([...fornecedores, data].sort((a, b) => a.nome.localeCompare(b.nome)));
      setFornecedorId(data.id);
      setModalFornecedor(false);
      setNovoFornecedor('');
    } catch (e: any) {
      Alert.alert('Erro', e.message);
    } finally {
      setSalvandoNovoFornecedor(false);
    }
  };

  const itensFiltrados = itens.filter(i => {
    const descStr = i.descricao ? String(i.descricao).toLowerCase() : '';
    const codStr = i.sku_codigo ? String(i.sku_codigo).toLowerCase() : '';
    const filtroLimpo = filtro.toLowerCase();
    return descStr.includes(filtroLimpo) || codStr.includes(filtroLimpo);
  });

  return (
    <KeyboardAvoidingView 
      style={{ flex: 1 }} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 80}
    >
      <View style={styles.container}>
        <Stack.Screen options={{ title: editandoId ? 'Editando Engenharia' : 'Engenharia de Itens' }} />

        {editandoId && (
          <TouchableOpacity onPress={fecharEdicao} style={styles.btnVoltarTop}>
            <Ionicons name="arrow-back" size={20} color="#FFF" />
            <Text style={styles.btnVoltarText}>SALVAR TUDO E VOLTAR PARA A LISTA</Text>
          </TouchableOpacity>
        )}

        <ScrollView 
          style={editandoId ? styles.formAreaExpanded : styles.formAreaCompact} 
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled" 
          contentContainerStyle={{ paddingBottom: editandoId ? 350 : 20 }}
        >
          {/* ================= CAPA ================= */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{editandoId ? '📦 Identidade do Item (Capa)' : '📦 Novo Item'}</Text>
            
            <View style={styles.row}>
              <TextInput style={[styles.input, { flex: 2, marginRight: 6 }]} placeholder="Cód. Sistema / SKU" placeholderTextColor={COLORS.placeholder} value={codigoErp} onChangeText={setCodigoErp} />
              <View style={[styles.pickerWrap, { flex: 1 }]}>
                <Picker selectedValue={unidade} onValueChange={setUnidade}>
                  <Picker.Item label="UN" value="UN"/><Picker.Item label="KG" value="KG"/>
                </Picker>
              </View>
            </View>
            <TextInput style={[styles.input, { marginBottom: 6 }]} placeholder="Descrição do Material" placeholderTextColor={COLORS.placeholder} value={descricao} onChangeText={setDescricao} />
            <View style={styles.row}>
              <TextInput style={[styles.input, { flex: 2, marginRight: 6 }]} placeholder="Responsável" placeholderTextColor={COLORS.placeholder} value={supervisor} onChangeText={setSupervisor} />
              <TextInput style={[styles.input, { flex: 1 }]} placeholder="Preço R$" placeholderTextColor={COLORS.placeholder} keyboardType="numeric" value={precoUnitario} onChangeText={setPrecoUnitario} />
            </View>
            <View style={styles.pickerWrapFull}>
              <Picker selectedValue={familiaId} onValueChange={setFamiliaId}>
                <Picker.Item label="Selecione a Família" value="" color={COLORS.placeholder} />
                {familias.map(f => <Picker.Item key={f.id} label={f.nome} value={f.id} />)}
              </Picker>
            </View>
            <TouchableOpacity style={styles.saveButton} onPress={handleSalvarItem} disabled={salvando}>
              {salvando ? <ActivityIndicator color="#FFF" /> : <Text style={styles.buttonText}>{editandoId ? 'ATUALIZAR CAPA DO ITEM' : 'CADASTRAR E IR PARA REGRAS'}</Text>}
            </TouchableOpacity>
          </View>

          {/* ================= ENGENHARIA (SÓ APARECE AO EDITAR) ================= */}
          {editandoId && (
            <>
              {/* ÁREA VERDE: REGRAS APLICADAS */}
              <View style={[styles.card, styles.cardAppliedRules]}>
                <Text style={[styles.cardTitle, { color: COLORS.success, borderBottomWidth: 1, borderBottomColor: '#D1FAE5', paddingBottom: 5 }]}>
                  ✅ Fornecedores Ativos neste Item
                </Text>
                
                {fatoresDoItem.length === 0 ? (
                  <Text style={{ fontSize: 12, color: COLORS.placeholder, fontStyle: 'italic', marginTop: 10 }}>
                    Nenhum fornecedor vinculado. Adicione abaixo.
                  </Text>
                ) : (
                  <View style={{ marginTop: 10 }}>
                    {fatoresDoItem.map((fator) => (
                      <View key={fator.id} style={styles.fatorMiniCard}>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 14, fontWeight: 'bold', color: COLORS.success }}>{fator.fornecedores?.nome}</Text>
                          <Text style={{ fontSize: 11, color: '#4B5563', marginTop: 2 }}>
                            Palete: <Text style={{fontWeight: 'bold'}}>{fator.fator_palete}</Text> | 
                            Caixa: <Text style={{fontWeight: 'bold'}}>{fator.fator_caixa}</Text> | 
                            Peso Unit: <Text style={{fontWeight: 'bold'}}>{fator.peso_unitario_produto}</Text>
                          </Text>
                        </View>
                        <TouchableOpacity onPress={() => handleExcluirFator(fator.id)} style={{ padding: 8 }}>
                          <Ionicons name="trash-outline" size={20} color={COLORS.danger} />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                )}
              </View>

              {/* ÁREA AZUL: ADICIONAR NOVA REGRA */}
              <View style={[styles.card, styles.cardAddNewRule]}>
                <Text style={[styles.cardTitle, { color: COLORS.secondary }]}>
                  ➕ Vincular Novo Fornecedor
                </Text>
                
                <View style={styles.row}>
                  <View style={[styles.pickerWrapFull, { flex: 1, marginBottom: 0, marginRight: 8, backgroundColor: '#FFF' }]}>
                    <Picker selectedValue={fornecedorId} onValueChange={setFornecedorId}>
                      <Picker.Item label="Selecione o Fornecedor..." value="" color={COLORS.placeholder} />
                      {fornecedores.map(f => <Picker.Item key={f.id} label={f.nome} value={f.id} />)}
                    </Picker>
                  </View>
                  <TouchableOpacity style={styles.btnNovoFornecedor} onPress={() => setModalFornecedor(true)}>
                    <Ionicons name="add" size={20} color="#FFF" />
                  </TouchableOpacity>
                </View>

                <View style={[styles.row, { marginTop: 12 }]}>
                  <View style={{ flex: 1, marginRight: 6 }}>
                    <Text style={styles.miniLabel}>Fator Palete</Text>
                    <TextInput style={[styles.input, {backgroundColor: '#FFF'}]} keyboardType="numeric" value={fatorPalete} onChangeText={setFatorPalete} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.miniLabel}>Fator Caixa</Text>
                    <TextInput style={[styles.input, {backgroundColor: '#FFF'}]} keyboardType="numeric" value={fatorCaixa} onChangeText={setFatorCaixa} />
                  </View>
                </View>

                <View style={styles.row}>
                  <View style={{ flex: 1, marginRight: 6 }}>
                    <Text style={styles.miniLabel}>Peso Unt. Produto</Text>
                    <TextInput style={[styles.input, {backgroundColor: '#FFF'}]} keyboardType="numeric" value={pesoUnitarioProd} onChangeText={setPesoUnitarioProd} />
                  </View>
                  <View style={{ flex: 1, marginRight: 6 }}>
                    <Text style={styles.miniLabel}>Tara Saco</Text>
                    <TextInput style={[styles.input, {backgroundColor: '#FFF'}]} keyboardType="numeric" value={pesoSaco} onChangeText={setPesoSaco} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.miniLabel}>Tara Caixa</Text>
                    <TextInput style={[styles.input, {backgroundColor: '#FFF'}]} keyboardType="numeric" value={pesoCaixaUnit} onChangeText={setPesoCaixaUnit} />
                  </View>
                </View>

                <TouchableOpacity style={styles.saveFatorButton} onPress={handleSalvarFator} disabled={salvandoFator}>
                  {salvandoFator ? <ActivityIndicator color="#FFF" size="small" /> : <Text style={styles.buttonText}>SALVAR E APLICAR AO ITEM ⬆️</Text>}
                </TouchableOpacity>
              </View>
            </>
          )}
        </ScrollView>

        {/* ================= PESQUISA E LISTA ================= */}
        {!editandoId && (
          <View style={styles.listArea}>
            <View style={styles.searchContainer}>
              <Ionicons name="search" size={16} color={COLORS.placeholder} />
              <TextInput style={styles.searchInput} placeholder="Filtrar por SKU ou Descrição..." placeholderTextColor={COLORS.placeholder} value={filtro} onChangeText={setFiltro} />
            </View>

            {loading ? (
              <ActivityIndicator size="large" color={COLORS.secondary} style={{ marginTop: 20 }} />
            ) : (
              <FlatList
                data={itensFiltrados}
                keyExtractor={(item) => String(item.id)}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: Math.max(insets.bottom + 60, 100) }} 
                renderItem={({ item }) => (
                  <View style={styles.itemCard}>
                    <View style={styles.itemInfo}>
                      <Text style={styles.itemCode}>{String(item.sku_codigo || 'S/C')} • {String(item.responsavel || 'SEM RESP.')}</Text>
                      <Text style={styles.itemName} numberOfLines={1}>{String(item.descricao || 'Sem descrição')}</Text>
                    </View>
                    <View style={styles.actionButtons}>
                      <TouchableOpacity onPress={() => iniciarEdicao(item)} style={styles.editBtn}>
                        <Ionicons name="settings-outline" size={16} color={COLORS.secondary} />
                      </TouchableOpacity>
                      {/* NOVA LIXEIRINHA DE EXCLUSÃO */}
                      <TouchableOpacity onPress={() => handleExcluirItem(item.id, item.descricao)} style={styles.deleteBtn}>
                        <Ionicons name="trash-outline" size={16} color={COLORS.danger} />
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              />
            )}
          </View>
        )}

        {/* MODAL PARA CRIAR FORNECEDOR RÁPIDO */}
        <Modal visible={modalFornecedor} transparent={true} animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Novo Fornecedor</Text>
              <Text style={styles.modalSubTitle}>Digite o nome do fornecedor (ex: CRIAFORMA)</Text>
              <TextInput 
                style={styles.modalInput} 
                autoCapitalize="characters"
                value={novoFornecedor} 
                onChangeText={setNovoFornecedor} 
                autoFocus 
              />
              <View style={styles.modalRowBtns}>
                <TouchableOpacity style={styles.modalBtnCancel} onPress={() => setModalFornecedor(false)}>
                  <Text style={styles.modalBtnTextCancel}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.modalBtnSave} onPress={handleCriarFornecedorRapido} disabled={salvandoNovoFornecedor}>
                  {salvandoNovoFornecedor ? <ActivityIndicator color="#FFF" size="small"/> : <Text style={styles.modalBtnTextSave}>Salvar</Text>}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 10, backgroundColor: COLORS.background },
  
  formAreaCompact: { flexGrow: 0, flexShrink: 0, marginBottom: 10 }, 
  formAreaExpanded: { flex: 1, marginBottom: 10 }, 
  
  listArea: { flex: 1 },

  card: { backgroundColor: COLORS.white, padding: 12, borderRadius: 10, elevation: 3, marginBottom: 10 },
  cardAppliedRules: { backgroundColor: COLORS.cardSavedBg, borderColor: '#A7F3D0', borderWidth: 1, elevation: 1 },
  cardAddNewRule: { backgroundColor: COLORS.cardAddBg, borderColor: '#BAE6FD', borderWidth: 1, elevation: 1 },
  
  cardTitle: { fontSize: 13, fontWeight: 'bold', marginBottom: 8, color: COLORS.secondary },
  miniLabel: { fontSize: 10, color: '#475569', marginBottom: 2, fontWeight: 'bold' },
  
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  
  input: { height: 38, backgroundColor: COLORS.inputBg, borderWidth: 1, borderColor: COLORS.border, borderRadius: 6, paddingHorizontal: 10, fontSize: 13, color: COLORS.text },
  pickerWrap: { height: 38, backgroundColor: COLORS.inputBg, borderRadius: 6, justifyContent: 'center', borderWidth: 1, borderColor: COLORS.border },
  pickerWrapFull: { height: 38, backgroundColor: COLORS.inputBg, borderRadius: 6, justifyContent: 'center', marginBottom: 6, borderWidth: 1, borderColor: COLORS.border },
  
  saveButton: { height: 42, backgroundColor: COLORS.secondary, borderRadius: 6, justifyContent: 'center', alignItems: 'center', marginTop: 5 },
  saveFatorButton: { height: 42, backgroundColor: COLORS.secondary, borderRadius: 6, justifyContent: 'center', alignItems: 'center', marginTop: 10 },
  buttonText: { color: '#FFF', fontWeight: 'bold', fontSize: 13 },
  
  btnVoltarTop: { backgroundColor: COLORS.primary, padding: 12, borderRadius: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 15, elevation: 4 },
  btnVoltarText: { color: '#FFF', fontWeight: 'bold', fontSize: 12 },

  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.white, paddingHorizontal: 10, borderRadius: 6, marginBottom: 8, borderWidth: 1, borderColor: COLORS.border, height: 38 },
  searchInput: { flex: 1, height: 38, marginLeft: 5, fontSize: 13, color: COLORS.text },
  itemCard: { flexDirection: 'row', backgroundColor: COLORS.white, padding: 10, borderRadius: 8, marginBottom: 6, alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  itemInfo: { flex: 1, paddingRight: 10 },
  itemCode: { fontSize: 9, color: COLORS.primary, fontWeight: 'bold', textTransform: 'uppercase' },
  itemName: { fontSize: 13, fontWeight: '500', color: COLORS.text },
  actionButtons: { flexDirection: 'row', gap: 6 },
  editBtn: { padding: 8, backgroundColor: '#E0F2FE', borderRadius: 6 },
  deleteBtn: { padding: 8, backgroundColor: '#FEE2E2', borderRadius: 6 }, // Estilo da lixeirinha!
  
  btnNovoFornecedor: { backgroundColor: COLORS.success, height: 38, width: 45, borderRadius: 6, justifyContent: 'center', alignItems: 'center' },
  fatorMiniCard: { flexDirection: 'row', backgroundColor: '#FFF', padding: 12, borderRadius: 8, alignItems: 'center', marginBottom: 8, borderWidth: 1, borderColor: '#D1FAE5', elevation: 1 },
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '85%', backgroundColor: '#FFF', borderRadius: 10, padding: 20 },
  modalTitle: { fontSize: 16, fontWeight: 'bold', color: COLORS.secondary, marginBottom: 5 },
  modalSubTitle: { fontSize: 12, color: COLORS.placeholder, marginBottom: 15 },
  modalInput: { height: 45, borderWidth: 1, borderColor: COLORS.border, borderRadius: 6, paddingHorizontal: 10, marginBottom: 20 },
  modalRowBtns: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10 },
  modalBtnCancel: { paddingVertical: 10, paddingHorizontal: 15 },
  modalBtnTextCancel: { color: COLORS.placeholder, fontWeight: 'bold' },
  modalBtnSave: { backgroundColor: COLORS.success, paddingVertical: 10, paddingHorizontal: 20, borderRadius: 6 },
  modalBtnTextSave: { color: '#FFF', fontWeight: 'bold' },
});