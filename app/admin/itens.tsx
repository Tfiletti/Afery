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
  text: '#1A202C', // Cor do texto principal (Preto acinzentado)
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
        Alert.alert('Código Duplicado', 'Já existe um item com esse SKU/Código.');
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
          await supabase.from('item_fornecedor').delete().eq('id', fartoId);
          if (editandoId) carregarFatoresDoItem(editandoId);
        }
      }
    ]);
  };

  const handleExcluirItem = (id: string, descricaoItem: string) => {
    Alert.alert(
      'Cuidado!',
      `Tem certeza que deseja excluir o item:\n"${descricaoItem}"?`,
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
              carregarDadosBase();
            } catch (e: any) {
              Alert.alert('Erro', 'Não foi possível excluir o item.');
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
        <StatusBar barStyle="dark-content" />
        <Stack.Screen options={{ title: editandoId ? 'Engenharia Detalhada' : 'Gestão de Itens' }} />

        {editandoId && (
          <TouchableOpacity onPress={fecharEdicao} style={styles.btnVoltarTop}>
            <Ionicons name="arrow-back" size={20} color="#FFF" />
            <Text style={styles.btnVoltarText}>VOLTAR PARA A LISTA</Text>
          </TouchableOpacity>
        )}

        <ScrollView 
          style={editandoId ? styles.formAreaExpanded : styles.formAreaCompact} 
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled" 
          contentContainerStyle={{ paddingBottom: editandoId ? 100 : 20 }}
        >
          {/* ================= CAPA ================= */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{editandoId ? '📝 Dados Principais' : '📦 Novo Item'}</Text>
            
            <View style={styles.row}>
              <TextInput 
                style={[styles.input, { flex: 2, marginRight: 6 }]} 
                placeholder="SKU / Código" 
                placeholderTextColor={COLORS.placeholder} 
                value={codigoErp} 
                onChangeText={setCodigoErp} 
              />
              <View style={[styles.pickerWrap, { flex: 1 }]}>
                <Picker 
                  selectedValue={unidade} 
                  onValueChange={setUnidade}
                  dropdownIconColor={COLORS.secondary}
                >
                  <Picker.Item label="UN" value="UN" color={COLORS.text} />
                  <Picker.Item label="KG" value="KG" color={COLORS.text} />
                </Picker>
              </View>
            </View>

            <TextInput 
              style={[styles.input, { marginBottom: 6 }]} 
              placeholder="Descrição Completa" 
              placeholderTextColor={COLORS.placeholder} 
              value={descricao} 
              onChangeText={setDescricao} 
            />

            <View style={styles.row}>
              <TextInput 
                style={[styles.input, { flex: 2, marginRight: 6 }]} 
                placeholder="Supervisor/Responsável" 
                placeholderTextColor={COLORS.placeholder} 
                value={supervisor} 
                onChangeText={setSupervisor} 
              />
              <TextInput 
                style={[styles.input, { flex: 1 }]} 
                placeholder="Preço R$" 
                placeholderTextColor={COLORS.placeholder} 
                keyboardType="numeric" 
                value={precoUnitario} 
                onChangeText={setPrecoUnitario} 
              />
            </View>

            <View style={styles.pickerWrapFull}>
              <Picker 
                selectedValue={familiaId} 
                onValueChange={setFamiliaId}
                dropdownIconColor={COLORS.secondary}
              >
                <Picker.Item label="Selecione a Família" value="" color={COLORS.placeholder} />
                {familias.map(f => (
                  <Picker.Item key={f.id} label={f.nome} value={f.id} color={COLORS.text} />
                ))}
              </Picker>
            </View>

            <TouchableOpacity style={styles.saveButton} onPress={handleSalvarItem} disabled={salvando}>
              {salvando ? <ActivityIndicator color="#FFF" /> : <Text style={styles.buttonText}>{editandoId ? 'ATUALIZAR CAPA' : 'CADASTRAR ITEM'}</Text>}
            </TouchableOpacity>
          </View>

          {/* ================= ENGENHARIA POR FORNECEDOR ================= */}
          {editandoId && (
            <>
              <View style={[styles.card, styles.cardAppliedRules]}>
                <Text style={[styles.cardTitle, { color: COLORS.success }]}>✅ Regras Vinculadas</Text>
                {fatoresDoItem.map((fator) => (
                  <View key={fator.id} style={styles.fatorMiniCard}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 14, fontWeight: 'bold', color: COLORS.text }}>{fator.fornecedores?.nome}</Text>
                      <Text style={{ fontSize: 11, color: '#475569' }}>
                        Palete: {fator.fator_palete} | Cx: {fator.fator_caixa} | Peso: {fator.peso_unitario_produto}kg
                      </Text>
                    </View>
                    <TouchableOpacity onPress={() => handleExcluirFator(fator.id)} style={{ padding: 5 }}>
                      <Ionicons name="trash" size={18} color={COLORS.danger} />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>

              <View style={[styles.card, styles.cardAddBg]}>
                <Text style={[styles.cardTitle, { color: COLORS.secondary }]}>➕ Nova Regra de Fornecedor</Text>
                
                <View style={styles.row}>
                  <View style={[styles.pickerWrapFull, { flex: 1, marginBottom: 0, marginRight: 8 }]}>
                    <Picker 
                      selectedValue={fornecedorId} 
                      onValueChange={setFornecedorId}
                      dropdownIconColor={COLORS.secondary}
                    >
                      <Picker.Item label="Escolher Fornecedor" value="" color={COLORS.placeholder} />
                      {fornecedores.map(f => (
                        <Picker.Item key={f.id} label={f.nome} value={f.id} color={COLORS.text} />
                      ))}
                    </Picker>
                  </View>
                  <TouchableOpacity style={styles.btnNovoFornecedor} onPress={() => setModalFornecedor(true)}>
                    <Ionicons name="add" size={24} color="#FFF" />
                  </TouchableOpacity>
                </View>

                <View style={[styles.row, { marginTop: 10 }]}>
                  <View style={{ flex: 1, marginRight: 4 }}>
                    <Text style={styles.miniLabel}>Fator Palete</Text>
                    <TextInput style={styles.input} keyboardType="numeric" value={fatorPalete} onChangeText={setFatorPalete} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.miniLabel}>Fator Caixa</Text>
                    <TextInput style={styles.input} keyboardType="numeric" value={fatorCaixa} onChangeText={setFatorCaixa} />
                  </View>
                </View>

                <View style={styles.row}>
                  <View style={{ flex: 1, marginRight: 4 }}>
                    <Text style={styles.miniLabel}>Peso Unitário</Text>
                    <TextInput style={styles.input} keyboardType="numeric" value={pesoUnitarioProd} onChangeText={setPesoUnitarioProd} />
                  </View>
                  <View style={{ flex: 1, marginRight: 4 }}>
                    <Text style={styles.miniLabel}>Tara Saco</Text>
                    <TextInput style={styles.input} keyboardType="numeric" value={pesoSaco} onChangeText={setPesoSaco} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.miniLabel}>Tara Caixa</Text>
                    <TextInput style={styles.input} keyboardType="numeric" value={pesoCaixaUnit} onChangeText={setPesoCaixaUnit} />
                  </View>
                </View>

                <TouchableOpacity style={styles.saveFatorButton} onPress={handleSalvarFator} disabled={salvandoFator}>
                  {salvandoFator ? <ActivityIndicator color="#FFF" /> : <Text style={styles.buttonText}>VINCULAR REGRA</Text>}
                </TouchableOpacity>
              </View>
            </>
          )}
        </ScrollView>

        {/* ================= LISTAGEM ================= */}
        {!editandoId && (
          <View style={styles.listArea}>
            <View style={styles.searchContainer}>
              <Ionicons name="search" size={18} color={COLORS.placeholder} />
              <TextInput 
                style={styles.searchInput} 
                placeholder="Pesquisar itens..." 
                placeholderTextColor={COLORS.placeholder} 
                value={filtro} 
                onChangeText={setFiltro} 
              />
            </View>

            {loading ? (
              <ActivityIndicator size="large" color={COLORS.secondary} />
            ) : (
              <FlatList
                data={itensFiltrados}
                keyExtractor={(item) => String(item.id)}
                renderItem={({ item }) => (
                  <View style={styles.itemCard}>
                    <View style={styles.itemInfo}>
                      <Text style={styles.itemCode}>{item.sku_codigo}</Text>
                      <Text style={styles.itemName} numberOfLines={1}>{item.descricao}</Text>
                    </View>
                    <TouchableOpacity onPress={() => iniciarEdicao(item)} style={styles.editBtn}>
                      <Ionicons name="construct-outline" size={18} color={COLORS.secondary} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleExcluirItem(item.id, item.descricao)} style={styles.deleteBtn}>
                      <Ionicons name="trash-outline" size={18} color={COLORS.danger} />
                    </TouchableOpacity>
                  </View>
                )}
              />
            )}
          </View>
        )}

        {/* MODAL NOVO FORNECEDOR */}
        <Modal visible={modalFornecedor} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Novo Fornecedor</Text>
              <TextInput 
                style={styles.modalInput} 
                placeholder="Nome da Empresa"
                placeholderTextColor={COLORS.placeholder}
                autoCapitalize="characters"
                value={novoFornecedor} 
                onChangeText={setNovoFornecedor} 
              />
              <View style={styles.modalRowBtns}>
                <TouchableOpacity onPress={() => setModalFornecedor(false)} style={styles.modalBtnCancel}>
                  <Text style={{color: COLORS.danger, fontWeight: 'bold'}}>CANCELAR</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleCriarFornecedorRapido} style={styles.modalBtnSave}>
                  <Text style={{color: '#FFF', fontWeight: 'bold'}}>SALVAR</Text>
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
  container: { flex: 1, padding: 12, backgroundColor: COLORS.background },
  formAreaCompact: { flexGrow: 0, marginBottom: 10 }, 
  formAreaExpanded: { flex: 1 }, 
  listArea: { flex: 1 },
  
  card: { backgroundColor: COLORS.white, padding: 15, borderRadius: 12, elevation: 3, marginBottom: 12, borderWidth: 1, borderColor: '#E2E8F0' },
  cardTitle: { fontSize: 14, fontWeight: '900', marginBottom: 12, color: COLORS.secondary, textTransform: 'uppercase' },
  miniLabel: { fontSize: 9, color: '#64748B', marginBottom: 2, fontWeight: 'bold', textTransform: 'uppercase' },
  
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  
  /* INPUTS SEMPRE COM TEXTO ESCURO */
  input: { 
    height: 45, 
    backgroundColor: '#FFF', 
    borderWidth: 1, 
    borderColor: COLORS.border, 
    borderRadius: 8, 
    paddingHorizontal: 12, 
    fontSize: 14, 
    color: COLORS.text, // PRETO
    fontWeight: '600'
  },
  
  pickerWrap: { height: 45, backgroundColor: '#FFF', borderRadius: 8, justifyContent: 'center', borderWidth: 1, borderColor: COLORS.border },
  pickerWrapFull: { height: 45, backgroundColor: '#FFF', borderRadius: 8, justifyContent: 'center', marginBottom: 10, borderWidth: 1, borderColor: COLORS.border },
  
  saveButton: { height: 50, backgroundColor: COLORS.primary, borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginTop: 5 },
  saveFatorButton: { height: 45, backgroundColor: COLORS.secondary, borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginTop: 10 },
  buttonText: { color: '#FFF', fontWeight: 'bold', fontSize: 14 },
  
  btnVoltarTop: { backgroundColor: COLORS.secondary, padding: 12, borderRadius: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 15 },
  btnVoltarText: { color: '#FFF', fontWeight: 'bold', fontSize: 12, marginLeft: 8 },

  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', paddingHorizontal: 12, borderRadius: 10, marginBottom: 12, borderWidth: 1, borderColor: COLORS.border, height: 48 },
  searchInput: { flex: 1, height: 48, marginLeft: 8, fontSize: 15, color: COLORS.text, fontWeight: '600' },
  
  itemCard: { flexDirection: 'row', backgroundColor: '#FFF', padding: 12, borderRadius: 10, marginBottom: 8, alignItems: 'center', elevation: 1 },
  itemInfo: { flex: 1 },
  itemCode: { fontSize: 12, color: COLORS.primary, fontWeight: '900' },
  itemName: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  
  editBtn: { padding: 10, backgroundColor: '#E0F2FE', borderRadius: 8, marginRight: 6 },
  deleteBtn: { padding: 10, backgroundColor: '#FEE2E2', borderRadius: 8 },
  
  btnNovoFornecedor: { backgroundColor: COLORS.success, height: 45, width: 50, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  
  fatorMiniCard: { flexDirection: 'row', backgroundColor: '#F8FAFC', padding: 10, borderRadius: 8, marginBottom: 8, borderWidth: 1, borderColor: '#E2E8F0' },
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '85%', backgroundColor: '#FFF', borderRadius: 15, padding: 20 },
  modalInput: { height: 50, borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, paddingHorizontal: 12, marginVertical: 15, color: COLORS.text, fontSize: 16 },
  modalRowBtns: { flexDirection: 'row', justifyContent: 'space-between' },
  modalBtnSave: { backgroundColor: COLORS.success, padding: 12, borderRadius: 8, flex: 1, marginLeft: 5, alignItems: 'center' },
  modalBtnCancel: { padding: 12, flex: 1, marginRight: 5, alignItems: 'center' },
});