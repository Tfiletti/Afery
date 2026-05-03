import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, Alert, ScrollView, StatusBar, Modal, FlatList, ActivityIndicator, Platform, KeyboardAvoidingView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import * as FileSystem from 'expo-file-system/legacy'; 
import { Buffer } from 'buffer';

import { supabase } from '../src/supabase';
import { useAuth } from '../src/context/AuthContext';

const HeaderContagem = () => {
  const router = useRouter();
  return (
    <View style={styles.header}>
      <TouchableOpacity onPress={() => router.back()} style={{ padding: 5 }}>
        <Ionicons name="arrow-back" size={24} color="#1F2937" />
      </TouchableOpacity>
      <View style={styles.headerCenter}>
        <View style={styles.logoSC}>
          <Text style={styles.logoSCText}>SC</Text>
        </View>
        <Text style={styles.headerTitle}>Formulário de Contagem</Text>
      </View>
      <View style={{ width: 34 }} />
    </View>
  );
};

export default function TelaDeContagem() {
  const params = useLocalSearchParams(); 
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const cameraRef = useRef(null);
  
  const { organizacao_id } = useAuth(); 

  // ================= ESTADOS GERAIS =================
  const [localSelecionadoId, setLocalSelecionadoId] = useState(null);
  const [localSelecionadoNome, setLocalSelecionadoNome] = useState('');
  const [modalLocalVisivel, setModalLocalVisivel] = useState(false);
  const [areasBd, setAreasBd] = useState([]);

  const [fornecedorSelecionado, setFornecedorSelecionado] = useState('');
  const [fornecedorId, setFornecedorId] = useState(null);
  const [modalFornecedorVisivel, setModalFornecedorVisivel] = useState(false);
  const [listaFornecedoresDoItem, setListaFornecedoresDoItem] = useState<any[]>([]);
  
  const [fatorCaixa, setFatorCaixa] = useState(0); // Para SACO_KG vira o peso do Saco (ex: 25)
  const [fatorPalete, setFatorPalete] = useState(0); // Para SACO_KG vira o peso do Palete Fechado (ex: 525)
  const [pesoUnitario, setPesoUnitario] = useState(0);

  const [metodologia, setMetodologia] = useState('CAIXARIA_UN'); 

  const [modalCameraVisivel, setModalCameraVisivel] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const [fotoUri, setFotoUri] = useState(null);
  const [carregando, setCarregando] = useState(false);

  const [pesoBruto, setPesoBruto] = useState('0');
  const [pesoLiquido, setPesoLiquido] = useState(0);
  const [observacao, setObservacao] = useState('');
  const [numPaletes, setNumPaletes] = useState<any>(0);
  const [numCaixas, setNumCaixas] = useState<any>(0);
  const [pesoEmLinha, setPesoEmLinha] = useState('0'); 

  const [numTubetes, setNumTubetes] = useState<any>(0);
  const [taraTubete, setTaraTubete] = useState('0');
  const [numLaminas, setNumLaminas] = useState<any>(0);
  const [taraExtra, setTaraExtra] = useState('0'); // Padronizado como "Taras"

  const [modalCalcVisivel, setModalCalcVisivel] = useState(false);
  const [listaCalculo, setListaCalculo] = useState<{qtd: string, peso: string}[]>([]);
  const [tempQtd, setTempQtd] = useState('');
  const [tempPeso, setTempPeso] = useState('');

  const formatarResultado = (valor: number) => {
    if (metodologia === 'BOBINA_KG' || metodologia === 'SACO_KG') {
      return valor.toFixed(2).replace('.', ',').replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1.');
    } else {
      return valor.toLocaleString('pt-BR', { maximumFractionDigits: 0 }); 
    }
  };

  useEffect(() => {
    async function carregarDadosIniciais() {
      if (!organizacao_id) return;
      const { data: areas } = await supabase.from('areas').select('*').eq('organizacao_id', organizacao_id).order('nome');
      if (areas) setAreasBd(areas);

      if (params.itemId) {
        const { data: engenharia } = await supabase
          .from('item_fornecedor') 
          .select(`fator_caixa, fator_palete, peso_unitario_produto, fornecedores (id, nome)`)
          .eq('item_id', params.itemId);
        if (engenharia) setListaFornecedoresDoItem(engenharia);

        const { data: itemData } = await supabase.from('itens').select('familias(metodo_contagem)').eq('id', params.itemId).single();
        const metodoDb = itemData?.familias?.metodo_contagem;
        
        if (metodoDb) {
            setMetodologia(metodoDb);
            if (metodoDb === 'BOBINA_KG') setNumPaletes(1);
        } else {
            setMetodologia('CAIXARIA_UN');
        }
      }
    }
    carregarDadosIniciais();
  }, [organizacao_id, params.itemId]);

  useEffect(() => {
    const paraNum = (valor: any) => {
      if (valor === '' || valor === null || valor === undefined) return 0;
      return parseFloat(valor.toString().replace(',', '.')) || 0;
    };
    
    const bruto = paraNum(pesoBruto);
    const nPaletes = paraNum(numPaletes);
    const nCaixas = paraNum(numCaixas);
    const avulsasEmLinha = paraNum(pesoEmLinha);
    const tExtra = paraNum(taraExtra);

    if (metodologia === 'BOBINA_KG') {
      const taraUnitaria = paraNum(taraTubete);
      const descontoTaras = (paraNum(numTubetes) * taraUnitaria) + (paraNum(numLaminas) * 0.40) + (nPaletes * 20.00);
      setPesoLiquido(Math.max(0, bruto - descontoTaras) + avulsasEmLinha);

    } else if (metodologia === 'CAIXARIA_UN') {
      const calcFechados = (nPaletes * fatorPalete) + (nCaixas * fatorCaixa);
      const saldoBalanca = Math.max(0, bruto - tExtra);
      const calcFracionado = pesoUnitario > 0 ? (saldoBalanca / pesoUnitario) : saldoBalanca;
      setPesoLiquido(calcFechados + calcFracionado + avulsasEmLinha);

    } else if (metodologia === 'CONVERSAO_DIRETA') {
      const calcCaixasMaster = nPaletes * fatorPalete; 
      const calcRolos = nCaixas * fatorCaixa;          
      const calcPorPeso = pesoUnitario > 0 ? (bruto / pesoUnitario) : bruto; 
      setPesoLiquido(calcCaixasMaster + calcRolos + calcPorPeso + avulsasEmLinha);

    } else if (metodologia === 'SACO_KG') {
      // NOVA MATEMÁTICA PARA COLAS/SACOS
      const calcPaletesCheios = nPaletes * fatorPalete; // ex: 1 x 525kg
      const calcSacosAvulsos = nCaixas * fatorCaixa;    // ex: 1 x 25kg
      const saldoBalanca = Math.max(0, bruto - tExtra);
      setPesoLiquido(calcPaletesCheios + calcSacosAvulsos + saldoBalanca + avulsasEmLinha);
    }
  }, [numTubetes, taraTubete, numLaminas, numPaletes, pesoBruto, pesoEmLinha, numCaixas, taraExtra, fatorCaixa, fatorPalete, pesoUnitario, metodologia]);

  const abrirCamera = async () => { 
    if (!permission?.granted) {
      const { granted } = await requestPermission();
      if (!granted) { Alert.alert("Atenção", "Autorize o uso da câmera."); return; }
    }
    setModalCameraVisivel(true);
  };

  const tirarFoto = async () => { 
    if (cameraRef.current) {
      try {
        const foto = await cameraRef.current.takePictureAsync({ quality: 0.5 });
        setFotoUri(foto.uri);
        setModalCameraVisivel(false);
      } catch (e: any) { Alert.alert("Erro", e.message); }
    }
  };

  const adicionarAoCalculo = () => { 
    if (!tempQtd || !tempPeso) return;
    setListaCalculo([...listaCalculo, { qtd: tempQtd, peso: tempPeso }]);
    setTempQtd(''); setTempPeso('');
  };

  const removerDoCalculo = (index: number) => { 
    const novaLista = [...listaCalculo];
    novaLista.splice(index, 1);
    setListaCalculo(novaLista);
  };

  const confirmarCalculo = () => { 
    const total = listaCalculo.reduce((acc, item) => {
      const q = parseFloat(item.qtd.replace(',', '.')) || 0;
      const p = parseFloat(item.peso.replace(',', '.')) || 0;
      return acc + (q * p);
    }, 0);
    const eKg = (metodologia === 'BOBINA_KG' || metodologia === 'SACO_KG');
    setPesoEmLinha(eKg ? total.toFixed(2).replace('.', ',') : total.toFixed(0));
    setModalCalcVisivel(false);
    setListaCalculo([]);
  };

  const salvarRegistro = async () => {
    const idFinal = params.areaId || localSelecionadoId;
    if (!idFinal) { Alert.alert("Atenção", "Selecione o local."); return; }
    if (pesoLiquido <= 0) { Alert.alert("Atenção", "O total deve ser maior que zero."); return; }
    if (!organizacao_id) return;
    setCarregando(true);
    try {
      let nomeArquivoFoto = null;
      if (fotoUri) {
        const base64 = await FileSystem.readAsStringAsync(fotoUri, { encoding: 'base64' });
        nomeArquivoFoto = `foto_${Date.now()}.jpg`;
        await supabase.storage.from('fotos_contagem').upload(nomeArquivoFoto, Buffer.from(base64, 'base64'), { contentType: 'image/jpeg' });
      }
      const detalhesJSON = {
        metodologia_usada: metodologia,
        paletes: parseInt(numPaletes) || 0,
        volumes_sacos: parseInt(numCaixas) || 0,
        taras: parseFloat(taraExtra.replace(',', '.')) || 0,
        avulsas_em_linha: parseFloat(pesoEmLinha.replace(',', '.')) || 0,
        fornecedor: fornecedorSelecionado
      };
      const { error } = await supabase.from('contagens').insert([{
        organizacao_id: organizacao_id,
        item_id: params.itemId,
        area_id: idFinal, 
        peso_bruto: parseFloat(pesoBruto.replace(',', '.')) || 0,
        em_linha: parseFloat(pesoEmLinha.replace(',','.')) || 0,
        peso_liquido_calculado: pesoLiquido,
        observacao: observacao,
        foto_url: nomeArquivoFoto,
        detalhes_contagem: detalhesJSON
      }]);
      if (error) throw error;
      Alert.alert("Sucesso", "Contagem registrada!");
      router.back();
    } catch (err: any) { Alert.alert("Erro", err.message); } finally { setCarregando(false); }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <HeaderContagem />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 100 }]} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          
          <View style={styles.topPanel}>
            <View style={styles.localRow}>
              {params.areaNome ? (
                <View style={styles.localBtn}><Ionicons name="location" size={18} color="#EF4444" /><Text style={styles.localTextSelecionado}>{params.areaNome}</Text></View>
              ) : (
                <TouchableOpacity style={styles.localBtn} onPress={() => setModalLocalVisivel(true)}>
                  <Ionicons name="location" size={18} color={localSelecionadoNome ? "#EF4444" : "#9CA3AF"} />
                  <Text style={localSelecionadoNome ? styles.localTextSelecionado : styles.localTextPlaceholder}>{localSelecionadoNome || "Selecionar Local..."}</Text>
                </TouchableOpacity>
              )}
              <View style={styles.skuBadge}><Ionicons name="cube" size={14} color="#8B5CF6" style={{ marginRight: 4 }} /><Text style={styles.skuText}>{params.codigo || "SKU"}</Text></View>
            </View>
            <View style={styles.fornecedorRow}>
              <Text style={styles.labelFornecedor}>Fornecedor do Lote (Opcional):</Text>
              <TouchableOpacity style={styles.fornecedorBtn} onPress={() => setModalFornecedorVisivel(true)}>
                <Text style={fornecedorSelecionado ? styles.fornecedorTextSelecionado : styles.fornecedorTextPlaceholder}>{fornecedorSelecionado || "Toque para selecionar..."}</Text>
                {fornecedorSelecionado ? (
                  <TouchableOpacity onPress={() => { setFornecedorSelecionado(''); setFornecedorId(null); setFatorCaixa(0); setFatorPalete(0); setPesoUnitario(0); }} style={{ padding: 4 }}><Ionicons name="close-circle" size={20} color="#EF4444" /></TouchableOpacity>
                ) : ( <Ionicons name="chevron-down" size={20} color="#9CA3AF" /> )}
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.grid}>
            {metodologia === 'BOBINA_KG' && (
              <>
                <CardStepper label="Nº Tubetes" value={numTubetes} onChangeText={setNumTubetes} onAdd={() => setNumTubetes((p:any) => (parseInt(p)||0)+1)} onSub={() => setNumTubetes((p:any) => Math.max(0, (parseInt(p)||0)-1))} color="#E6A23C" />
                <CardInput label="Tara Tubete" value={taraTubete} onChange={setTaraTubete} color="#E6A23C" />
                <CardStepper label="Lâminas (-0.4)" value={numLaminas} onChangeText={setNumLaminas} onAdd={() => setNumLaminas((p:any) => (parseInt(p)||0)+1)} onSub={() => setNumLaminas((p:any) => Math.max(0, (parseInt(p)||0)-1))} color="#1E3A8A" />
                <CardStepper label="Paletes (-20)" value={numPaletes} onChangeText={setNumPaletes} onAdd={() => setNumPaletes((p:any) => (parseInt(p)||0)+1)} onSub={() => setNumPaletes((p:any) => Math.max(0, (parseInt(p)||0)-1))} color="#1E3A8A" defaultVal={1} />
                <CardInput label="Peso Bruto" value={pesoBruto} onChange={setPesoBruto} color="#EF4444" />
                <CardCalc label="Em linha:" value={pesoEmLinha} onChange={setPesoEmLinha} color="#10B981" onPressCalc={() => setModalCalcVisivel(true)} />
              </>
            )}

            {metodologia === 'CAIXARIA_UN' && (
              <>
                <CardStepper label="Paletes Inteiros" value={numPaletes} onChangeText={setNumPaletes} onAdd={() => setNumPaletes((p:any) => (parseInt(p)||0)+1)} onSub={() => setNumPaletes((p:any) => Math.max(0, (parseInt(p)||0)-1))} color="#1E3A8A" />
                <CardStepper label="Caixas Fechadas" value={numCaixas} onChangeText={setNumCaixas} onAdd={() => setNumCaixas((p:any) => (parseInt(p)||0)+1)} onSub={() => setNumCaixas((p:any) => Math.max(0, (parseInt(p)||0)-1))} color="#1E3A8A" />
                <CardInput label="Peso Bruto" value={pesoBruto} onChange={setPesoBruto} color="#EF4444" />
                <CardInput label="Taras (Kg)" value={taraExtra} onChange={setTaraExtra} color="#E6A23C" />
                <CardCalc label="Em linha:" value={pesoEmLinha} onChange={setPesoEmLinha} color="#10B981" onPressCalc={() => setModalCalcVisivel(true)} />
              </>
            )}

            {metodologia === 'CONVERSAO_DIRETA' && (
              <>
                <CardStepper label="Caixas (Master)" value={numPaletes} onChangeText={setNumPaletes} onAdd={() => setNumPaletes((p:any) => (parseInt(p)||0)+1)} onSub={() => setNumPaletes((p:any) => Math.max(0, (parseInt(p)||0)-1))} color="#1E3A8A" />
                <CardStepper label="Rolos (Bobinas)" value={numCaixas} onChangeText={setNumCaixas} onAdd={() => setNumCaixas((p:any) => (parseInt(p)||0)+1)} onSub={() => setNumCaixas((p:any) => Math.max(0, (parseInt(p)||0)-1))} color="#1E3A8A" />
                <CardInput label="Pesar Avulsos" value={pesoBruto} onChange={setPesoBruto} color="#EF4444" />
                <CardInput label="Taras (Kg)" value={taraExtra} onChange={setTaraExtra} color="#E6A23C" />
                <CardCalc label="Em linha:" value={pesoEmLinha} onChange={setPesoEmLinha} color="#10B981" onPressCalc={() => setModalCalcVisivel(true)} />
              </>
            )}

            {metodologia === 'SACO_KG' && (
              <>
                {/* NOVA TELA PARA COLAS */}
                <CardStepper label="Paletes (525kg)" value={numPaletes} onChangeText={setNumPaletes} onAdd={() => setNumPaletes((p:any) => (parseInt(p)||0)+1)} onSub={() => setNumPaletes((p:any) => Math.max(0, (parseInt(p)||0)-1))} color="#1E3A8A" />
                <CardStepper label="Sacos (25kg)" value={numCaixas} onChangeText={setNumCaixas} onAdd={() => setNumCaixas((p:any) => (parseInt(p)||0)+1)} onSub={() => setNumCaixas((p:any) => Math.max(0, (parseInt(p)||0)-1))} color="#1E3A8A" />
                <CardInput label="Peso Bruto" value={pesoBruto} onChange={setPesoBruto} color="#EF4444" />
                <CardInput label="Taras (Kg)" value={taraExtra} onChange={setTaraExtra} color="#E6A23C" />
                <CardCalc label="Em linha:" value={pesoEmLinha} onChange={setPesoEmLinha} color="#10B981" onPressCalc={() => setModalCalcVisivel(true)} />
              </>
            )}
          </View>

          <View style={styles.obsContainer}>
            <TextInput style={styles.inputObs} placeholder="Observações do lote..." value={observacao} onChangeText={setObservacao} multiline />
            <TouchableOpacity style={[styles.btnFoto, fotoUri && styles.btnFotoAtivo]} onPress={abrirCamera}><Ionicons name={fotoUri ? "checkmark-circle" : "camera-outline"} size={28} color={fotoUri ? "#10B981" : "#6B7280"} /></TouchableOpacity>
          </View>

          <View style={styles.finalCard}>
            <Text style={styles.finalLabel}>Total em Quilos (Kg):</Text>
            <Text style={styles.finalValue}>{formatarResultado(pesoLiquido)}</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 20) }]}>
        <TouchableOpacity style={styles.btnCancel} onPress={() => router.back()}><Text style={styles.btnCancelText}>Cancelar</Text></TouchableOpacity>
        <TouchableOpacity style={styles.btnSave} onPress={salvarRegistro} disabled={carregando}>{carregando ? <ActivityIndicator color="#FFF" /> : <Text style={styles.btnSaveText}>Salvar Contagem</Text>}</TouchableOpacity>
      </View>

      <Modal visible={modalCalcVisivel} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.calcContainer}>
            <View style={styles.calcHeader}><Text style={styles.calcTitle}>Somador Em Linha</Text><TouchableOpacity onPress={() => setModalCalcVisivel(false)}><Ionicons name="close" size={24} color="#64748B" /></TouchableOpacity></View>
            <View style={styles.calcInputsRow}>
                <TextInput style={styles.calcInputPequeno} placeholder="Qtd" value={tempQtd} onChangeText={setTempQtd} keyboardType="numeric" />
                <Text style={{ fontSize: 18, color: '#94A3B8' }}>×</Text>
                <TextInput style={styles.calcInputGrande} placeholder="Peso/Valor" value={tempPeso} onChangeText={setTempPeso} keyboardType="numeric" />
                <TouchableOpacity style={styles.btnAddCalc} onPress={adicionarAoCalculo}><Ionicons name="add" size={24} color="#FFF" /></TouchableOpacity>
            </View>
            <View style={styles.listaScrollArea}>
                <FlatList data={listaCalculo} keyExtractor={(_, index) => String(index)} renderItem={({ item, index }) => (
                    <View style={styles.linhaCalculo}>
                        <Text style={styles.txtLinha}>{item.qtd} × {item.peso} = {(parseFloat(item.qtd.replace(',','.')) * parseFloat(item.peso.replace(',','.'))).toFixed(2)}</Text>
                        <TouchableOpacity onPress={() => removerDoCalculo(index)}><Ionicons name="trash-outline" size={18} color="#EF4444" /></TouchableOpacity>
                    </View>
                )} />
            </View>
            <View style={styles.calcFooter}>
                <View><Text style={styles.labelTotalCalc}>TOTAL:</Text><Text style={styles.valTotalCalc}>{listaCalculo.reduce((acc, i) => acc + (parseFloat(i.qtd.replace(',','.')) * parseFloat(i.peso.replace(',','.'))), 0).toFixed(2)}</Text></View>
                <TouchableOpacity style={styles.btnConfirmarCalc} onPress={confirmarCalculo}><Text style={styles.txtConfirmar}>OK</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={modalCameraVisivel} animationType="slide"><CameraView style={{ flex: 1 }} ref={cameraRef} active={modalCameraVisivel}><View style={styles.cameraOverlay}><TouchableOpacity onPress={() => setModalCameraVisivel(false)} style={styles.btnFecharCam}><Ionicons name="close" size={40} color="#FFF" /></TouchableOpacity><TouchableOpacity style={styles.btnCapturar} onPress={tirarFoto}><View style={styles.circuloExterno}><View style={styles.circuloInterno} /></View></TouchableOpacity></View></CameraView></Modal>
    </ScrollView>
  );
}

// ================= COMPONENTES E ESTILOS IGUAIS AO ANTERIOR =================
const CardStepper = ({ label, value, onAdd, onSub, onChangeText, color, defaultVal = 0 }: any) => (
  <View style={[styles.card, { borderLeftColor: color }]}>
    <Text style={styles.cardLabel}>{label}</Text>
    <View style={styles.stepper}>
        <TouchableOpacity onPress={onSub} style={styles.stepBtnContainer}><Ionicons name="remove" size={20} color="#1E3A8A" /></TouchableOpacity>
        <TextInput style={styles.stepInput} value={String(value)} onChangeText={onChangeText} keyboardType="numeric" selectTextOnFocus onFocus={() => { if (String(value) === String(defaultVal)) onChangeText(''); }} onBlur={() => { if (value === '') onChangeText(String(defaultVal)); }} />
        <TouchableOpacity onPress={onAdd} style={styles.stepBtnContainer}><Ionicons name="add" size={20} color="#1E3A8A" /></TouchableOpacity>
    </View>
  </View>
);

const CardInput = ({ label, value, onChange, color }: any) => (
  <View style={[styles.card, { borderLeftColor: color }]}>
    <Text style={styles.cardLabel}>{label}</Text>
    <TextInput style={styles.cardInput} value={String(value)} onChangeText={onChange} keyboardType="numeric" selectTextOnFocus onFocus={() => { if (value === '0' || value === 0) onChange(''); }} onBlur={() => { if (value === '') onChange('0'); }} />
  </View>
);

const CardCalc = ({ label, value, onChange, color, onPressCalc }: any) => (
  <View style={[styles.card, { borderLeftColor: color }]}>
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}><Text style={styles.cardLabel}>{label}</Text><TouchableOpacity onPress={onPressCalc} style={styles.btnCalcAbre}><MaterialCommunityIcons name="calculator" size={18} color={color} /></TouchableOpacity></View>
    <TextInput style={styles.cardInput} value={String(value)} onChangeText={onChange} keyboardType="numeric" selectTextOnFocus onFocus={() => { if (value === '0' || value === 0) onChange(''); }} onBlur={() => { if (value === '') onChange('0'); }} />
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  header: { backgroundColor: '#FFFFFF', paddingTop: Platform.OS === 'ios' ? 50 : 40, paddingBottom: 15, paddingHorizontal: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', elevation: 4 },
  headerCenter: { flexDirection: 'row', alignItems: 'center' },
  headerTitle: { fontSize: 18, color: '#E6A23C', fontWeight: 'bold' },
  logoSC: { width: 34, height: 34, backgroundColor: '#E6A23C', borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  logoSCText: { color: '#FFFFFF', fontSize: 16, fontWeight: '900' },
  scrollContent: { padding: 15 },
  topPanel: { marginBottom: 15 },
  localRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  localBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#E2E8F0', padding: 12, borderRadius: 12, marginRight: 10 },
  localTextPlaceholder: { fontSize: 14, color: '#64748B', marginLeft: 6 },
  localTextSelecionado: { fontSize: 14, color: '#1E293B', marginLeft: 6, fontWeight: 'bold' },
  skuBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12, elevation: 1, borderWidth: 1, borderColor: '#E2E8F0' },
  skuText: { fontSize: 14, fontWeight: 'bold', color: '#1F2937' },
  fornecedorRow: { backgroundColor: '#FFFFFF', padding: 12, borderRadius: 12, elevation: 1, borderWidth: 1, borderColor: '#E2E8F0' },
  labelFornecedor: { fontSize: 11, fontWeight: 'bold', color: '#64748B', marginBottom: 6 },
  fornecedorBtn: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#F8FAFC', padding: 12, borderRadius: 8 },
  fornecedorTextPlaceholder: { fontSize: 14, color: '#94A3B8' },
  fornecedorTextSelecionado: { fontSize: 14, color: '#1E3A8A', fontWeight: 'bold' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  card: { backgroundColor: '#FFF', width: '48%', padding: 15, borderRadius: 16, marginBottom: 15, elevation: 2, borderLeftWidth: 4 },
  cardLabel: { fontSize: 12, fontWeight: 'bold', color: '#64748B', marginBottom: 10 },
  stepper: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#F8FAFC', borderRadius: 12, padding: 4 },
  stepBtnContainer: { padding: 5, width: 35, alignItems: 'center' },
  stepInput: { fontSize: 18, fontWeight: 'bold', color: '#1E293B', textAlign: 'center', flex: 1 },
  cardInput: { fontSize: 22, fontWeight: 'bold', textAlign: 'right', color: '#1E2937', paddingVertical: 8, paddingHorizontal: 12, backgroundColor: '#F8FAFC', borderRadius: 8, borderWidth: 1, borderColor: '#E2E8F0' },
  obsContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', borderRadius: 12, paddingHorizontal: 12, marginVertical: 5 },
  inputObs: { flex: 1, fontSize: 14, height: 55, color: '#1E293B' },
  btnFoto: { padding: 8, marginLeft: 10 },
  btnFotoAtivo: { backgroundColor: '#D1FAE5', borderRadius: 20 },
  finalCard: { backgroundColor: '#FFF', padding: 20, borderRadius: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderLeftWidth: 6, borderLeftColor: '#1E3A8A', marginTop: 15, elevation: 4 },
  finalLabel: { fontSize: 16, fontWeight: 'bold', color: '#1E3A8A' },
  finalValue: { fontSize: 32, fontWeight: '900', color: '#0F172A' },
  footer: { flexDirection: 'row', backgroundColor: '#FFF', borderTopWidth: 1, borderTopColor: '#E2E8F0', paddingHorizontal: 20, paddingTop: 15, gap: 15 },
  btnCancel: { flex: 1, height: 55, alignItems: 'center', justifyContent: 'center' },
  btnCancelText: { fontSize: 16, color: '#94A3B8', fontWeight: 'bold' },
  btnSave: { flex: 1.5, backgroundColor: '#E6A23C', height: 55, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  btnSaveText: { fontSize: 17, color: '#FFF', fontWeight: 'bold' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  calcContainer: { backgroundColor: '#FFF', width: '100%', borderRadius: 20, padding: 20 },
  calcHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  calcTitle: { fontSize: 18, fontWeight: 'bold', color: '#1E293B' },
  calcInputsRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 20 },
  calcInputPequeno: { flex: 1, backgroundColor: '#F1F5F9', padding: 12, borderRadius: 10, fontSize: 16, textAlign: 'center' },
  calcInputGrande: { flex: 2, backgroundColor: '#F1F5F9', padding: 12, borderRadius: 10, fontSize: 16 },
  btnAddCalc: { backgroundColor: '#1E3A8A', padding: 12, borderRadius: 10 },
  listaScrollArea: { height: 160 },
  linhaCalculo: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  txtLinha: { fontSize: 14, color: '#475569' },
  calcFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 15 },
  labelTotalCalc: { fontSize: 12, color: '#94A3B8', fontWeight: 'bold' },
  valTotalCalc: { fontSize: 24, fontWeight: 'bold', color: '#10B981' },
  btnConfirmarCalc: { backgroundColor: '#10B981', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  txtConfirmar: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },
  cameraOverlay: { flex: 1, justifyContent: 'space-between', padding: 30 },
  btnFecharCam: { alignSelf: 'flex-end', marginTop: 40 },
  btnCapturar: { alignSelf: 'center', marginBottom: 40 },
  circuloExterno: { width: 80, height: 80, borderRadius: 40, borderWidth: 4, borderColor: '#FFF', alignItems: 'center', justifyContent: 'center' },
  circuloInterno: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#FFF' },
});