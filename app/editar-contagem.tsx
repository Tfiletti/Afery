import { useEffect, useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator, Image, Platform, Modal, FlatList } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { supabase } from '../src/supabase';
import { useSafeAreaInsets } from 'react-native-safe-area-context'; 
import { useAuth } from '../src/context/AuthContext'; 

export default function TelaEditarContagem() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { organizacao_id } = useAuth(); 
  
  const [carregando, setCarregando] = useState(true);
  const [itemData, setItemData] = useState<any>(null);

  const [tubetes, setTubetes] = useState<any>(0);
  const [tara, setTara] = useState('0');
  const [laminas, setLaminas] = useState<any>(0);
  const [paletes, setPaletes] = useState<any>(0);
  const [pesoBruto, setPesoBruto] = useState('0');
  const [emLinha, setEmLinha] = useState('0');
  const [obs, setObs] = useState('');
  const [fotoUrl, setFotoUrl] = useState<string | null>(null);
  const [pesoLiquido, setPesoLiquido] = useState(0);

  const [modalCalcVisivel, setModalCalcVisivel] = useState(false);
  const [listaCalculo, setListaCalculo] = useState<{qtd: string, peso: string}[]>([]);
  const [tempQtd, setTempQtd] = useState('');
  const [tempPeso, setTempPeso] = useState('');

  // Formata para exibição visual (ex: 1.234,56)
  const formatarPeso = (valor: number) => {
    return valor.toFixed(2).replace('.', ',').replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1.');
  };

  // --- FUNÇÃO DE CONVERSÃO INTELIGENTE ---
  const lerNumero = (valor: any) => {
    if (valor === '' || valor === null || valor === undefined) return 0;
    let str = String(valor).trim();

    // Se tiver vírgula, tratamos como formato BR (ponto é milhar, vírgula é decimal)
    if (str.includes(',')) {
      str = str.replace(/\./g, ''); // Remove pontos de milhar
      str = str.replace(',', '.');  // Transforma vírgula em decimal
    } 
    // Se não tiver vírgula mas tiver ponto, verificamos se é decimal do banco (ex: 10.50)
    // Em contextos de peso, um ponto único costuma ser decimal.
    
    return parseFloat(str) || 0;
  };

  const carregarDados = async () => {
    if (!organizacao_id) return; 

    try {
      const { data, error } = await supabase
        .from('contagens')
        // <-- Atualizado para buscar sku_codigo em vez do código antigo
        .select('*, itens(descricao, sku_codigo)') 
        .eq('id', id)
        .eq('organizacao_id', organizacao_id) 
        .single();
        
      if (error) throw error;
      if (data) {
        setItemData(data);
        const detalhes = data.detalhes_contagem || {};
        
        setTubetes(detalhes.tubetes || 0);
        // Ao carregar, já convertemos o ponto do banco para vírgula para o utilizador
        setTara(String(detalhes.tara_tubete || '0').replace('.', ','));
        setLaminas(detalhes.laminas || 0);
        setPaletes(detalhes.paletes || 0);
        setPesoBruto(String(data.peso_bruto || '0').replace('.', ','));
        setEmLinha(String(data.em_linha || '0').replace('.', ','));
        
        setObs(data.observacao || '');
        if (data.foto_url) {
          const { data: urlData } = supabase.storage.from('fotos_contagem').getPublicUrl(data.foto_url);
          setFotoUrl(urlData.publicUrl);
        }
      }
    } catch (err: any) { 
      console.error(err.message); 
      Alert.alert("Erro", "Não foi possível carregar os dados.");
      router.back();
    } finally { 
      setCarregando(false); 
    }
  };

  useEffect(() => { 
    carregarDados(); 
  }, [id, organizacao_id]); 

  useEffect(() => {
    const bruto = lerNumero(pesoBruto);
    const taraUni = lerNumero(tara);
    const nTub = lerNumero(tubetes);
    const nLam = lerNumero(laminas);
    const nPal = lerNumero(paletes);
    const somaLinha = lerNumero(emLinha);
    
    const descontoTaras = (nTub * taraUni) + (nLam * 0.4) + (nPal * 20);
    const saldoBalanca = Math.max(0, bruto - descontoTaras);
    setPesoLiquido(saldoBalanca + somaLinha);
  }, [pesoBruto, tubetes, tara, emLinha, laminas, paletes]);

  const adicionarAoCalculo = () => {
    if (!tempQtd || !tempPeso) return;
    setListaCalculo([...listaCalculo, { qtd: tempQtd, peso: tempPeso }]);
    setTempQtd(''); setTempPeso('');
  };

  const confirmarCalculo = () => {
    const total = listaCalculo.reduce((acc, i) => acc + (lerNumero(i.qtd) * lerNumero(i.peso)), 0);
    setEmLinha(total.toFixed(2).replace('.', ','));
    setModalCalcVisivel(false);
    setListaCalculo([]);
  };

  const excluir = () => {
    if (!organizacao_id) return;

    Alert.alert("🗑️ Excluir Registro", "Deseja apagar esta contagem?", [
      { text: "Cancelar", style: "cancel" },
      { 
        text: "Excluir", 
        style: "destructive", 
        onPress: async () => {
          try {
            const { data, error } = await supabase
              .from('contagens')
              .delete()
              .eq('id', id)
              .eq('organizacao_id', organizacao_id)
              .select(); 
              
            if (error) throw error;
            if (!data || data.length === 0) throw new Error("Registro não encontrado.");

            Alert.alert("Sucesso", "Contagem excluída!");
            router.back();
          } catch (err: any) {
            Alert.alert("Erro ao excluir", err.message);
          }
        } 
      }
    ]);
  };

  const salvar = async () => {
    if (!organizacao_id) return;
    if (pesoLiquido <= 0) {
      Alert.alert("Peso Inválido", "O peso líquido final não pode ser zero ou negativo.");
      return;
    }
    
    try {
      const { data, error } = await supabase.from('contagens').update({
        peso_bruto: lerNumero(pesoBruto),
        em_linha: lerNumero(emLinha),
        peso_liquido_calculado: pesoLiquido,
        observacao: obs,
        detalhes_contagem: { 
          tubetes: parseInt(tubetes) || 0, 
          tara_tubete: lerNumero(tara), 
          laminas: parseInt(laminas) || 0, 
          paletes: parseInt(paletes) || 0 
        }
      })
      .eq('id', id)
      .eq('organizacao_id', organizacao_id)
      .select();

      if (error) throw error;
      if (!data || data.length === 0) throw new Error("Falha na atualização.");

      Alert.alert("Sucesso", "Registro atualizado!");
      router.back();
    } catch (err: any) { 
      Alert.alert("Erro ao salvar", err.message); 
    }
  };

  if (carregando) return <ActivityIndicator size="large" color="#005b9f" style={{flex:1}} />;

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 120 }]}>
        <View style={styles.header}>
            <View style={styles.badgeSistema}>
              <MaterialCommunityIcons name="package-variant" size={18} color="#B45309" />
              {/* <-- Atualizado para exibir sku_codigo */}
              <Text style={styles.textoSistema}>{itemData?.itens?.sku_codigo || 'S/C'}</Text>
            </View>
            <TouchableOpacity onPress={excluir} style={styles.btnExcluir}>
                <Ionicons name="trash-outline" size={26} color="#EF4444" />
            </TouchableOpacity>
        </View>
        <Text style={styles.itemDesc}>{itemData?.itens?.descricao}</Text>

        <View style={styles.grid}>
          <CardStepper label="N° Tubetes" value={tubetes} onChangeText={setTubetes} onAdd={() => setTubetes((p: any) => (parseInt(p) || 0) + 1)} onSub={() => setTubetes((p: any) => Math.max(0, (parseInt(p) || 0) - 1))} />
          <CardInput label="Tara Tubete" value={tara} onChange={setTara} color="#F59E0B" />
          <CardStepper label="Lâminas (-0.4)" value={laminas} onChangeText={setLaminas} onAdd={() => setLaminas((p: any) => (parseInt(p) || 0) + 1)} onSub={() => setLaminas((p: any) => Math.max(0, (parseInt(p) || 0) - 1))} />
          <CardStepper label="Paletes (-20)" value={paletes} onChangeText={setPaletes} onAdd={() => setPaletes((p: any) => (parseInt(p) || 0) + 1)} onSub={() => setPaletes((p: any) => Math.max(0, (parseInt(p) || 0) - 1))} />
          <CardInput label="Peso Bruto" value={pesoBruto} onChange={setPesoBruto} color="#F59E0B" />
          <View style={[styles.card, { borderLeftWidth: 4, borderLeftColor: '#10B981' }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={styles.cardLabel}>Em Linha:</Text>
                <TouchableOpacity onPress={() => setModalCalcVisivel(true)} style={styles.btnCalcAbre}><MaterialCommunityIcons name="calculator" size={18} color="#10B981" /></TouchableOpacity>
            </View>
            <TextInput style={styles.cardInput} value={String(emLinha)} onChangeText={setEmLinha} keyboardType="numeric" selectTextOnFocus />
          </View>
        </View>

        <TextInput style={styles.obsInput} placeholder="Observação..." value={obs} onChangeText={setObs} multiline />
        <View style={styles.photoContainer}>
            <Text style={styles.photoLabel}>📸 Foto Registrada:</Text>
            <View style={styles.photoFrame}>{fotoUrl ? <Image source={{ uri: fotoUrl }} style={styles.image} /> : <Text style={styles.noPhoto}>Sem foto</Text>}</View>
        </View>

        <View style={styles.finalCard}>
            <Text style={styles.finalLabel}>Peso Líquido Final:</Text>
            <Text style={styles.finalValue}>{formatarPeso(pesoLiquido)}</Text>
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 20), paddingTop: 15 }]}>
        <TouchableOpacity style={styles.btnCancel} onPress={() => router.back()}><Text style={styles.txtCancel}>Cancelar</Text></TouchableOpacity>
        <TouchableOpacity style={styles.btnSave} onPress={salvar}><Text style={styles.txtSave}>Salvar Alterações</Text></TouchableOpacity>
      </View>

      <Modal visible={modalCalcVisivel} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.calcContainer}>
            <View style={styles.calcHeader}><Text style={styles.calcTitle}>Somador de Bobinas</Text><TouchableOpacity onPress={() => setModalCalcVisivel(false)}><Ionicons name="close" size={24} color="#64748B" /></TouchableOpacity></View>
            <View style={styles.calcInputsRow}>
                <TextInput style={styles.calcInputPequeno} placeholder="Qtd" value={tempQtd} onChangeText={setTempQtd} keyboardType="numeric" />
                <Text style={{ fontSize: 18, color: '#94A3B8' }}>×</Text>
                <TextInput style={styles.calcInputGrande} placeholder="Peso Un (kg)" value={tempPeso} onChangeText={setTempPeso} keyboardType="numeric" />
                <TouchableOpacity style={styles.btnAddCalc} onPress={adicionarAoCalculo}><Ionicons name="add" size={24} color="#FFF" /></TouchableOpacity>
            </View>
            <View style={styles.listaScrollArea}>
                <FlatList data={listaCalculo} keyExtractor={(_, index) => index.toString()} renderItem={({ item, index }) => (
                    <View style={styles.linhaCalculo}>
                        <Text style={styles.txtLinha}>{item.qtd} × {item.peso}kg = {(lerNumero(item.qtd) * lerNumero(item.peso)).toFixed(2)} kg</Text>
                        <TouchableOpacity onPress={() => { const nl = [...listaCalculo]; nl.splice(index, 1); setListaCalculo(nl); }}><Ionicons name="trash-outline" size={18} color="#EF4444" /></TouchableOpacity>
                    </View>
                )} ListEmptyComponent={<Text style={styles.txtVazio}>Nenhum item somado</Text>} />
            </View>
            <View style={styles.calcFooter}>
                <View><Text style={styles.labelTotalCalc}>TOTAL ACUMULADO:</Text><Text style={styles.valTotalCalc}>{listaCalculo.reduce((acc, i) => acc + (lerNumero(i.qtd) * lerNumero(i.peso)), 0).toFixed(2)} kg</Text></View>
                <TouchableOpacity style={styles.btnConfirmarCalc} onPress={confirmarCalculo}><Text style={styles.txtConfirmar}>OK</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const CardStepper = ({ label, value, onAdd, onSub, onChangeText }: any) => (
    <View style={styles.card}>
      <Text style={styles.cardLabel}>{label}:</Text>
      <View style={styles.stepper}>
          <TouchableOpacity onPress={onSub} style={styles.stepBtnContainer}><Text style={styles.stepBtn}>-</Text></TouchableOpacity>
          <TextInput style={styles.stepInput} value={String(value)} onChangeText={onChangeText} keyboardType="numeric" selectTextOnFocus />
          <TouchableOpacity onPress={onAdd} style={styles.stepBtnContainer}><Text style={styles.stepBtn}>+</Text></TouchableOpacity>
      </View>
    </View>
);

const CardInput = ({ label, value, onChange, color }: any) => (
    <View style={[styles.card, { borderLeftWidth: 4, borderLeftColor: color }]}>
      <Text style={styles.cardLabel}>{label}:</Text>
      <TextInput style={styles.cardInput} value={String(value)} onChangeText={onChange} keyboardType="numeric" selectTextOnFocus />
    </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  scroll: { padding: 15, paddingTop: 50 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 },
  // <-- Estilos renomeados
  badgeSistema: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#E9ECEF', padding: 10, borderRadius: 12 },
  textoSistema: { marginLeft: 5, fontWeight: 'bold', fontSize: 18, color: '#1E293B' },
  btnExcluir: { padding: 8 },
  itemDesc: { fontSize: 14, color: '#6C757D', fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  card: { backgroundColor: '#FFF', width: '48%', padding: 15, borderRadius: 16, marginBottom: 15, elevation: 2 },
  cardLabel: { fontSize: 11, fontWeight: 'bold', color: '#6C757D', marginBottom: 10 },
  stepper: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#F1F3F5', borderRadius: 20, padding: 2 },
  stepBtnContainer: { padding: 5, minWidth: 40, alignItems: 'center' },
  stepBtn: { fontSize: 24, fontWeight: 'bold', color: '#005b9f' },
  stepInput: { fontSize: 18, fontWeight: 'bold', color: '#1F2937', textAlign: 'center', minWidth: 40, padding: 0 },
  cardInput: { fontSize: 22, fontWeight: 'bold', textAlign: 'right', color: '#1F2937' },
  obsInput: { backgroundColor: '#FFF', padding: 15, borderRadius: 12, height: 60, marginVertical: 10, elevation: 2, textAlignVertical: 'top' },
  photoContainer: { backgroundColor: '#FFF', padding: 15, borderRadius: 16, marginVertical: 10, elevation: 2 },
  photoLabel: { fontSize: 14, fontWeight: 'bold', color: '#4B5563', marginBottom: 10 },
  photoFrame: { height: 180, backgroundColor: '#F3F4F6', borderRadius: 12, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  image: { width: '100%', height: '100%', resizeMode: 'cover' },
  noPhoto: { color: '#9CA3AF' },
  finalCard: { backgroundColor: '#FFF', padding: 20, borderRadius: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderLeftWidth: 6, borderLeftColor: '#005b9f', marginTop: 10, elevation: 4 },
  finalLabel: { fontSize: 16, fontWeight: 'bold', color: '#005b9f' },
  finalValue: { fontSize: 32, fontWeight: 'bold' },
  footer: { flexDirection: 'row', backgroundColor: '#FFF', borderTopWidth: 1, borderTopColor: '#DEE2E6', paddingHorizontal: 20, gap: 15 },
  btnCancel: { flex: 1, height: 55, alignItems: 'center', justifyContent: 'center' },
  btnSave: { flex: 1.5, backgroundColor: '#F59E0B', height: 55, borderRadius: 12, alignItems: 'center', justifyContent: 'center', elevation: 3 },
  txtCancel: { fontSize: 16, color: '#ADB5BD', fontWeight: 'bold' },
  txtSave: { fontSize: 16, color: '#FFF', fontWeight: 'bold' },
  btnCalcAbre: { backgroundColor: '#ECFDF5', padding: 6, borderRadius: 8 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  calcContainer: { backgroundColor: '#FFF', width: '100%', borderRadius: 20, padding: 20, elevation: 10 },
  calcHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  calcTitle: { fontSize: 18, fontWeight: 'bold', color: '#1E293B' },
  calcInputsRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 20 },
  calcInputPequeno: { flex: 1, backgroundColor: '#F1F5F9', padding: 12, borderRadius: 10, fontSize: 16, textAlign: 'center', fontWeight: 'bold' },
  calcInputGrande: { flex: 2, backgroundColor: '#F1F5F9', padding: 12, borderRadius: 10, fontSize: 16, fontWeight: 'bold' },
  btnAddCalc: { backgroundColor: '#005b9f', padding: 12, borderRadius: 10 },
  listaScrollArea: { height: 160, marginBottom: 20 },
  linhaCalculo: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  txtLinha: { fontSize: 14, color: '#475569', fontWeight: '500' },
  txtVazio: { textAlign: 'center', color: '#94A3B8', marginTop: 30 },
  calcFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#F1F5F9', paddingTop: 15 },
  labelTotalCalc: { fontSize: 10, color: '#94A3B8', fontWeight: 'bold' },
  valTotalCalc: { fontSize: 24, fontWeight: 'bold', color: '#10B981' },
  btnConfirmarCalc: { backgroundColor: '#10B981', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12 },
  txtConfirmar: { color: '#FFF', fontWeight: 'bold' }
});