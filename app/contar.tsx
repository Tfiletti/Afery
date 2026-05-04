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
  
  const [fatorCaixa, setFatorCaixa] = useState(0); 
  const [fatorPalete, setFatorPalete] = useState(0); 
  const [pesoUnitario, setPesoUnitario] = useState(0);

  const [metodologia, setMetodologia] = useState('CAIXARIA_UN'); 

  const [modalCameraVisivel, setModalCameraVisivel] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const [fotoUri, setFotoUri] = useState(null);
  const [carregando, setCarregando] = useState(false);

  const [pesoBruto, setPesoBruto] = useState('0');
  const [pesoLiquido, setPesoLiquido] = useState(0);
  const [observacao, setObs] = useState('');
  const [numPaletes, setNumPaletes] = useState<any>(0);
  const [numCaixas, setNumCaixas] = useState<any>(0);
  const [pesoEmLinha, setPesoEmLinha] = useState('0'); 

  const [numTubetes, setNumTubetes] = useState<any>(0);
  const [taraTubete, setTaraTubete] = useState('0');
  const [numLaminas, setNumLaminas] = useState<any>(0);
  const [taraExtra, setTaraExtra] = useState('0'); 

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

  // ================= EFEITOS =================
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

  // ================= MOTOR MATEMÁTICO =================
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
      const calcPaletesCheios = nPaletes * fatorPalete; 
      const calcSacosAvulsos = nCaixas * fatorCaixa;    
      const saldoBalanca = Math.max(0, bruto - tExtra);
      setPesoLiquido(calcPaletesCheios + calcSacosAvulsos + saldoBalanca + avulsasEmLinha);
    }
  }, [numTubetes, taraTubete, numLaminas, numPaletes, pesoBruto, pesoEmLinha, numCaixas, taraExtra, fatorCaixa, fatorPalete, pesoUnitario, metodologia]);

  // ================= FUNÇÕES =================
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

      // ================= FIX X DA QUESTÃO: SALVAMENTO COMPLETO =================
      const detalhesJSON = {
        metodologia_usada: metodologia,
        fornecedor: fornecedorSelecionado,
        paletes: parseInt(String(numPaletes)) || 0,
        tubetes: parseInt(String(numTubetes)) || 0,
        tara_tubete: parseFloat(String(taraTubete).replace(',', '.')) || 0,
        laminas: parseInt(String(numLaminas)) || 0,
        volumes_sacos_caixas: parseInt(String(numCaixas)) || 0,
        caixas: parseInt(String(numCaixas)) || 0,
        taras: parseFloat(String(taraExtra).replace(',', '.')) || 0,
        avulsas_em_linha: parseFloat(String(pesoEmLinha).replace(',', '.')) || 0,
      };

      const { error } = await supabase.from('contagens').insert([{
        organizacao_id: organizacao_id,
        item_id: params.itemId,
        area_id: idFinal, 
        peso_bruto: parseFloat(String(pesoBruto).replace(',', '.')) || 0,
        em_linha: parseFloat(String(pesoEmLinha).replace(',','.')) || 0,
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

  // ================= RENDER =================
  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <HeaderContagem />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 100 }]} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          
          {/* PAINEL SUPERIOR */}
          <View style={styles.topPanel}>
            <View style={styles.localRow}>
              {params.areaNome ? (
                <View style={styles.localBtn}>
                  <Ionicons name="location" size={18} color="#EF4444" />
                  <Text style={styles.localTextSelecionado}>{params.areaNome}</Text>
                </View>
              ) : (
                <TouchableOpacity style={styles.localBtn} onPress={() => setModalLocalVisivel(true)}>
                  <Ionicons name="location" size={18} color={localSelecionadoNome ? "#EF4444" : "#9CA3AF"} />
                  <Text style={localSelecionadoNome ? styles.localTextSelecionado : styles.localTextPlaceholder}>
                    {localSelecionadoNome || "Selecionar Local..."}
                  </Text>
                </TouchableOpacity>
              )}
              <View style={styles.skuBadge}>
                <Ionicons name="cube" size={14} color="#8B5CF6" style={{ marginRight: 4 }} />
                <Text style={styles.skuText}>{params.codigo || "SKU"}</Text>
              </View>
            </View>

            <View style={styles.fornecedorRow}>
              <Text style={styles.labelFornecedor}>Fornecedor do Lote (Opcional):</Text>
              <TouchableOpacity style={styles.fornecedorBtn} onPress={() => setModalFornecedorVisivel(true)}>
                <Text style={fornecedorSelecionado ? styles.fornecedorTextSelecionado : styles.fornecedorTextPlaceholder}>
                  {fornecedorSelecionado || "Toque para selecionar..."}
                </Text>
                {fornecedorSelecionado && (
                  <TouchableOpacity onPress={() => { setFornecedorSelecionado(''); setFornecedorId(null); setFatorCaixa(0); setFatorPalete(0); setPesoUnitario(0); }} style={{ padding: 4 }}>
                    <Ionicons name="close-circle" size={20} color="#EF4444" />
                  </TouchableOpacity>
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* GRID DINÂMICO COM LABELS LIMPOS (SEM PESOS) */}
          <View style={styles.grid}>
            {metodologia === 'BOBINA_KG' && (
              <>
                <CardStepper label="Tubetes" value={numTubetes} onChangeText={setNumTubetes} onAdd={() => setNumTubetes((p:any) => (parseInt(p)||0)+1)} onSub={() => setNumTubetes((p:any) => Math.max(0, (parseInt(p)||0)-1))} color="#E6A23C" />
                <CardInput label="Tara Tubete" value={taraTubete} onChange={setTaraTubete} color="#E6A23C" />
                <CardStepper label="Lâminas" value={numLaminas} onChangeText={setNumLaminas} onAdd={() => setNumLaminas((p:any) => (parseInt(p)||0)+1)} onSub={() => setNumLaminas((p:any) => Math.max(0, (parseInt(p)||0)-1))} color="#1E3A8A" />
                <CardStepper label="Paletes" value={numPaletes} onChangeText={setNumPaletes} onAdd={() => setNumPaletes((p:any) => (parseInt(p)||0)+1)} onSub={() => setNumPaletes((p:any) => Math.max(0, (parseInt(p)||0)-1))} color="#1E3A8A" defaultVal={1} />
                <CardInput label="Peso Bruto" value={pesoBruto} onChange={setPesoBruto} color="#EF4444" />
                <CardCalc label="Em linha" value={pesoEmLinha} onChange={setPesoEmLinha} color="#10B981" onPressCalc={() => setModalCalcVisivel(true)} />
              </>
            )}

            {metodologia === 'CAIXARIA_UN' && (
              <>
                <CardStepper label="Paletes" value={numPaletes} onChangeText={setNumPaletes} onAdd={() => setNumPaletes((p:any) => (parseInt(p)||0)+1)} onSub={() => setNumPaletes((p:any) => Math.max(0, (parseInt(p)||0)-1))} color="#1E3A8A" />
                <CardStepper label="Caixas" value={numCaixas} onChangeText={setNumCaixas} onAdd={() => setNumCaixas((p:any) => (parseInt(p)||0)+1)} onSub={() => setNumCaixas((p:any) => Math.max(0, (parseInt(p)||0)-1))} color="#1E3A8A" />
                <CardInput label="Peso Bruto" value={pesoBruto} onChange={setPesoBruto} color="#EF4444" />
                <CardInput label="Taras" value={taraExtra} onChange={setTaraExtra} color="#E6A23C" />
                <CardCalc label="Em linha" value={pesoEmLinha} onChange={setPesoEmLinha} color="#10B981" onPressCalc={() => setModalCalcVisivel(true)} />
              </>
            )}

            {metodologia === 'CONVERSAO_DIRETA' && (
              <>
                <CardStepper label="Paletes (Master)" value={numPaletes} onChangeText={setNumPaletes} onAdd={() => setNumPaletes((p:any) => (parseInt(p)||0)+1)} onSub={() => setNumPaletes((p:any) => Math.max(0, (parseInt(p)||0)-1))} color="#1E3A8A" />
                <CardStepper label="Rolos (Bobinas)" value={numCaixas} onChangeText={setNumCaixas} onAdd={() => setNumCaixas((p:any) => (parseInt(p)||0)+1)} onSub={() => setNumCaixas((p:any) => Math.max(0, (parseInt(p)||0)-1))} color="#1E3A8A" />
                <CardInput label="Peso Bruto" value={pesoBruto} onChange={setPesoBruto} color="#EF4444" />
                <CardInput label="Taras" value={taraExtra} onChange={setTaraExtra} color="#E6A23C" />
                <CardCalc label="Em linha" value={pesoEmLinha} onChange={setPesoEmLinha} color="#10B981" onPressCalc={() => setModalCalcVisivel(true)} />
              </>
            )}

            {metodologia === 'SACO_KG' && (
              <>
                <CardStepper label="Paletes" value={numPaletes} onChangeText={setNumPaletes} onAdd={() => setNumPaletes((p:any) => (parseInt(p)||0)+1)} onSub={() => setNumPaletes((p:any) => Math.max(0, (parseInt(p)||0)-1))} color="#1E3A8A" />
                <CardStepper label="Sacos" value={numCaixas} onChangeText={setNumCaixas} onAdd={() => setNumCaixas((p:any) => (parseInt(p)||0)+1)} onSub={() => setNumCaixas((p:any) => Math.max(0, (parseInt(p)||0)-1))} color="#1E3A8A" />
                <CardInput label="Peso Bruto" value={pesoBruto} onChange={setPesoBruto} color="#EF4444" />
                <CardInput label="Taras" value={taraExtra} onChange={setTaraExtra} color="#E6A23C" />
                <CardCalc label="Em linha" value={pesoEmLinha} onChange={setPesoEmLinha} color="#10B981" onPressCalc={() => setModalCalcVisivel(true)} />
              </>
            )}
          </View>

          <View style={styles.obsContainer}>
            <TextInput style={styles.inputObs} placeholder="Observações..." placeholderTextColor="#94A3B8" value={observacao} onChangeText={setObs} multiline />
            <TouchableOpacity style={[styles.btnFoto, fotoUri && styles.btnFotoAtivo]} onPress={abrirCamera}>
              <Ionicons name={fotoUri ? "checkmark-circle" : "camera-outline"} size={28} color={fotoUri ? "#10B981" : "#6B7280"} />
            </TouchableOpacity>
          </View>

          <View style={styles.finalCard}>
            <Text style={styles.finalLabel}>Total</Text>
            <Text style={styles.finalValue}>{formatarResultado(pesoLiquido)}</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 20) }]}>
        <TouchableOpacity style={styles.btnCancel} onPress={() => router.back()}><Text style={styles.btnCancelText}>Cancelar</Text></TouchableOpacity>
        <TouchableOpacity style={styles.btnSave} onPress={salvarRegistro} disabled={carregando}>
          {carregando ? <ActivityIndicator color="#FFF" /> : <Text style={styles.btnSaveText}>Salvar Contagem</Text>}
        </TouchableOpacity>
      </View>

      {/* MODAL LOCAL */}
      <Modal visible={modalLocalVisivel} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <FlatList data={areasBd} keyExtractor={(item) => String(item.id)} renderItem={({ item }) => (
              <TouchableOpacity style={styles.modalItem} onPress={() => { setLocalSelecionadoNome(item.nome); setLocalSelecionadoId(item.id); setModalLocalVisivel(false); }}>
                <Text style={styles.modalItemText}>{item.nome}</Text>
              </TouchableOpacity>
            )} />
            <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setModalLocalVisivel(false)}><Text style={styles.modalCloseText}>FECHAR</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* MODAL FORNECEDOR */}
      <Modal visible={modalFornecedorVisivel} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <FlatList data={listaFornecedoresDoItem} keyExtractor={(item) => String(item.fornecedores?.id || Math.random())} renderItem={({ item }) => (
              <TouchableOpacity style={styles.modalItem} onPress={() => { 
                  setFornecedorSelecionado(item.fornecedores?.nome || ''); 
                  setFornecedorId(item.fornecedores?.id || null);
                  setFatorCaixa(item.fator_caixa || 0);
                  setFatorPalete(item.fator_palete || 0);
                  setPesoUnitario(item.peso_unitario_produto || 0);
                  setModalFornecedorVisivel(false); 
                }}>
                <Text style={styles.modalItemText}>{item.fornecedores?.nome}</Text>
              </TouchableOpacity>
            )} />
            <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setModalFornecedorVisivel(false)}><Text style={styles.modalCloseText}>FECHAR</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* MODAL CALCULADORA */}
      <Modal visible={modalCalcVisivel} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.calcContainer}>
            <View style={styles.calcHeader}><Text style={styles.calcTitle}>Somador</Text><TouchableOpacity onPress={() => setModalCalcVisivel(false)}><Ionicons name="close" size={24} color="#64748B" /></TouchableOpacity></View>
            <View style={styles.calcInputsRow}>
                <TextInput style={styles.calcInputPequeno} placeholder="Qtd" value={tempQtd} onChangeText={setTempQtd} keyboardType="numeric" />
                <TextInput style={styles.calcInputGrande} placeholder="Valor" value={tempPeso} onChangeText={setTempPeso} keyboardType="numeric" />
                <TouchableOpacity style={styles.btnAddCalc} onPress={adicionarAoCalculo}><Ionicons name="add" size={24} color="#FFF" /></TouchableOpacity>
            </View>
            <FlatList style={{height: 150}} data={listaCalculo} renderItem={({ item, index }) => (
              <View style={styles.linhaCalculo}>
                <Text>{item.qtd} × {item.peso} = {(parseFloat(item.qtd.replace(',','.'))*parseFloat(item.peso.replace(',','.'))).toFixed(2)}</Text>
                <TouchableOpacity onPress={() => removerDoCalculo(index)}><Ionicons name="trash" size={18} color="red" /></TouchableOpacity>
              </View>
            )} />
            <TouchableOpacity style={styles.btnConfirmarCalc} onPress={confirmarCalculo}><Text style={styles.txtConfirmar}>OK</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* MODAL CAMERA */}
      <Modal visible={modalCameraVisivel} animationType="slide">
        <CameraView style={{ flex: 1 }} ref={cameraRef}>
          <View style={styles.cameraOverlay}>
            <TouchableOpacity onPress={() => setModalCameraVisivel(false)} style={styles.btnFecharCam}><Ionicons name="close" size={40} color="#FFF" /></TouchableOpacity>
            <TouchableOpacity style={styles.btnCapturar} onPress={tirarFoto}><View style={styles.circuloExterno}><View style={styles.circuloInterno} /></View></TouchableOpacity>
          </View>
        </CameraView>
      </Modal>
    </View>
  );
}

// ================= COMPONENTES =================
const CardStepper = ({ label, value, onAdd, onSub, onChangeText, color, defaultVal = 0 }: any) => (
  <View style={[styles.card, { borderLeftColor: color }]}>
    <Text style={styles.cardLabel}>{label}</Text>
    <View style={styles.stepper}>
        <TouchableOpacity onPress={onSub}><Ionicons name="remove" size={20} color="#1E3A8A" /></TouchableOpacity>
        <TextInput style={styles.stepInput} value={String(value)} onChangeText={onChangeText} keyboardType="numeric" selectTextOnFocus />
        <TouchableOpacity onPress={onAdd}><Ionicons name="add" size={20} color="#1E3A8A" /></TouchableOpacity>
    </View>
  </View>
);

const CardInput = ({ label, value, onChange, color }: any) => (
  <View style={[styles.card, { borderLeftColor: color }]}>
    <Text style={styles.cardLabel}>{label}</Text>
    <TextInput style={styles.cardInput} value={String(value)} onChangeText={onChange} keyboardType="numeric" selectTextOnFocus />
  </View>
);

const CardCalc = ({ label, value, onChange, color, onPressCalc }: any) => (
  <View style={[styles.card, { borderLeftColor: color }]}>
    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Text style={styles.cardLabel}>{label}</Text><TouchableOpacity onPress={onPressCalc}><MaterialCommunityIcons name="calculator" size={18} color={color} /></TouchableOpacity></View>
    <TextInput style={styles.cardInput} value={String(value)} onChangeText={onChange} keyboardType="numeric" selectTextOnFocus />
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  header: { backgroundColor: '#FFFFFF', paddingTop: Platform.OS === 'ios' ? 50 : 40, paddingBottom: 15, paddingHorizontal: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', elevation: 4 },
  headerCenter: { flexDirection: 'row', alignItems: 'center' },
  headerTitle: { fontSize: 16, color: '#E6A23C', fontWeight: 'bold' },
  logoSC: { width: 30, height: 30, backgroundColor: '#E6A23C', borderRadius: 6, alignItems: 'center', justifyContent: 'center', marginRight: 8 },
  logoSCText: { color: '#FFFFFF', fontSize: 14, fontWeight: '900' },
  scrollContent: { padding: 15 },
  topPanel: { marginBottom: 15 },
  localRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  localBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#E2E8F0', padding: 10, borderRadius: 10, marginRight: 10 },
  localTextPlaceholder: { fontSize: 13, color: '#64748B' },
  localTextSelecionado: { fontSize: 13, color: '#1E293B', fontWeight: 'bold' },
  skuBadge: { backgroundColor: '#FFFFFF', paddingHorizontal: 10, borderRadius: 10, borderWidth: 1, borderColor: '#E2E8F0', justifyContent: 'center' },
  skuText: { fontSize: 12, fontWeight: 'bold' },
  fornecedorRow: { backgroundColor: '#FFFFFF', padding: 10, borderRadius: 10, elevation: 1 },
  labelFornecedor: { fontSize: 10, color: '#64748B', marginBottom: 5 },
  fornecedorBtn: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  fornecedorTextPlaceholder: { fontSize: 13, color: '#94A3B8' },
  fornecedorTextSelecionado: { fontSize: 13, color: '#1E3A8A', fontWeight: 'bold' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  card: { backgroundColor: '#FFF', width: '48%', padding: 12, borderRadius: 12, marginBottom: 12, elevation: 2, borderLeftWidth: 4 },
  cardLabel: { fontSize: 10, fontWeight: 'bold', color: '#64748B', marginBottom: 5 },
  stepper: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#F8FAFC', borderRadius: 8, padding: 2 },
  stepInput: { fontSize: 16, fontWeight: 'bold', textAlign: 'center', flex: 1 },
  cardInput: { fontSize: 18, fontWeight: 'bold', textAlign: 'right', color: '#1E2937' },
  obsContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', borderRadius: 12, paddingHorizontal: 10, elevation: 2 },
  inputObs: { flex: 1, fontSize: 13, height: 50 },
  btnFoto: { padding: 5 },
  btnFotoAtivo: { backgroundColor: '#D1FAE5', borderRadius: 15 },
  finalCard: { backgroundColor: '#FFF', padding: 15, borderRadius: 15, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderLeftWidth: 6, borderLeftColor: '#1E3A8A', marginTop: 15, elevation: 4 },
  finalLabel: { fontSize: 14, fontWeight: 'bold', color: '#1E3A8A' },
  finalValue: { fontSize: 24, fontWeight: '900' },
  footer: { flexDirection: 'row', backgroundColor: '#FFF', borderTopWidth: 1, borderTopColor: '#E2E8F0', paddingHorizontal: 20, paddingTop: 10 },
  btnCancel: { flex: 1, height: 50, justifyContent: 'center' },
  btnCancelText: { color: '#94A3B8', fontWeight: 'bold' },
  btnSave: { flex: 1.5, backgroundColor: '#E6A23C', height: 50, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  btnSaveText: { color: '#FFF', fontWeight: 'bold' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: '#FFF', width: '85%', borderRadius: 20, padding: 20, maxHeight: '70%' },
  modalItem: { paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  modalItemText: { fontSize: 15, fontWeight: 'bold' },
  modalCloseBtn: { marginTop: 10, padding: 10, alignItems: 'center' },
  modalCloseText: { color: '#64748B', fontWeight: 'bold' },
  calcContainer: { backgroundColor: '#FFF', width: '90%', borderRadius: 20, padding: 20 },
  calcHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 },
  calcTitle: { fontSize: 16, fontWeight: 'bold' },
  calcInputsRow: { flexDirection: 'row', gap: 10, marginBottom: 15 },
  calcInputPequeno: { flex: 1, backgroundColor: '#F1F5F9', borderRadius: 8, padding: 10 },
  calcInputGrande: { flex: 2, backgroundColor: '#F1F5F9', borderRadius: 8, padding: 10 },
  btnAddCalc: { backgroundColor: '#1E3A8A', borderRadius: 8, padding: 10 },
  linhaCalculo: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderColor: '#EEE' },
  btnConfirmarCalc: { backgroundColor: '#10B981', padding: 12, borderRadius: 10, alignItems: 'center', marginTop: 10 },
  txtConfirmar: { color: '#FFF', fontWeight: 'bold' },
  cameraOverlay: { flex: 1, justifyContent: 'space-between', padding: 20 },
  btnFecharCam: { alignSelf: 'flex-end' },
  btnCapturar: { alignSelf: 'center', marginBottom: 30 },
  circuloExterno: { width: 70, height: 70, borderRadius: 35, borderWidth: 3, borderColor: '#FFF', justifyContent: 'center', alignItems: 'center' },
  circuloInterno: { width: 55, height: 55, borderRadius: 27.5, backgroundColor: '#FFF' },
});