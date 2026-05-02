import { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, Alert, ScrollView, StatusBar, Modal, FlatList, ActivityIndicator, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import * as FileSystem from 'expo-file-system/legacy'; 
import { Buffer } from 'buffer';

// IMPORTAÇÕES COM OS CAMINHOS CORRIGIDOS (Apenas um andar para trás)
import { supabase } from '../src/supabase';
import { useAuth } from '../src/context/AuthContext';

const HeaderContagem = () => {
  const router = useRouter();
  return (
    <View style={styles.header}>
      <TouchableOpacity onPress={() => router.back()}><Ionicons name="arrow-back" size={24} color="#1F2937" /></TouchableOpacity>
      <View style={styles.logoSC}><Text style={styles.logoSCText}>SC</Text></View>
      <Text style={styles.headerTitle}>Formulário de Contagem</Text>
      <View style={{ width: 24 }} />
    </View>
  );
};

export default function TelaDeContagem() {
  const params = useLocalSearchParams(); 
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const cameraRef = useRef(null);
  
  // PUXANDO O ID DA ORGANIZAÇÃO DO USUÁRIO
  const { organizacao_id } = useAuth(); 

  const [localSelecionadoId, setLocalSelecionadoId] = useState(null);
  const [localSelecionadoNome, setLocalSelecionadoNome] = useState('');
  const [modalLocalVisivel, setModalLocalVisivel] = useState(false);
  const [modalCameraVisivel, setModalCameraVisivel] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const [carregando, setCarregando] = useState(false);
  const [areasBd, setAreasBd] = useState([]);

  const [numTubetes, setNumTubetes] = useState<any>(0);
  const [taraTubete, setTaraTubete] = useState('0');
  const [numLaminas, setNumLaminas] = useState<any>(0);
  const [numPaletes, setNumPaletes] = useState<any>(1);
  const [pesoBruto, setPesoBruto] = useState('0');
  const [pesoEmLinha, setPesoEmLinha] = useState('0');
  const [pesoLiquido, setPesoLiquido] = useState(0);
  const [observacao, setObservacao] = useState('');
  const [fotoUri, setFotoUri] = useState(null);

  const [modalCalcVisivel, setModalCalcVisivel] = useState(false);
  const [listaCalculo, setListaCalculo] = useState<{qtd: string, peso: string}[]>([]);
  const [tempQtd, setTempQtd] = useState('');
  const [tempPeso, setTempPeso] = useState('');

  const formatarPeso = (valor: number) => {
    return valor.toFixed(2).replace('.', ',').replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1.');
  };

  useEffect(() => {
    async function buscarAreas() {
      if (!organizacao_id) return;
      const { data } = await supabase
        .from('areas')
        .select('*')
        .eq('organizacao_id', organizacao_id)
        .order('nome');
      if (data) setAreasBd(data);
    }
    buscarAreas();
  }, [organizacao_id]);

  useEffect(() => {
    const paraNum = (valor: any) => {
      if (valor === '' || valor === null || valor === undefined) return 0;
      return parseFloat(valor.toString().replace(',', '.')) || 0;
    };
    const bruto = paraNum(pesoBruto);
    const emLinha = paraNum(pesoEmLinha);
    const taraUnitaria = paraNum(taraTubete);
    const nTubetes = paraNum(numTubetes);
    const nLaminas = paraNum(numLaminas);
    const nPaletes = paraNum(numPaletes);

    const descontoTaras = (nTubetes * taraUnitaria) + (nLaminas * 0.40) + (nPaletes * 20.00);
    let saldoBalanca = Math.max(0, bruto - descontoTaras);
    setPesoLiquido(saldoBalanca + emLinha);
  }, [numTubetes, taraTubete, numLaminas, numPaletes, pesoBruto, pesoEmLinha]);

  const abrirCamera = async () => {
    if (!permission?.granted) {
      const { granted } = await requestPermission();
      if (!granted) {
        Alert.alert("Atenção", "Autorize o uso da câmera nas configurações do celular.");
        return;
      }
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
    setPesoEmLinha(total.toFixed(2).replace('.', ','));
    setModalCalcVisivel(false);
    setListaCalculo([]);
  };

  const salvarRegistro = async () => {
    const idFinal = params.areaId || localSelecionadoId;
    if (!idFinal) { Alert.alert("Atenção", "Selecione o local."); return; }
    if (pesoLiquido <= 0) { Alert.alert("Atenção", "O peso líquido deve ser maior que zero."); return; }
    if (!organizacao_id) { Alert.alert("Erro de Autenticação", "Não foi possível identificar sua organização."); return; }

    setCarregando(true);
    try {
      let nomeArquivoFoto = null;
      if (fotoUri) {
        const base64 = await FileSystem.readAsStringAsync(fotoUri, { encoding: 'base64' });
        nomeArquivoFoto = `foto_${Date.now()}.jpg`;
        await supabase.storage.from('fotos_contagem').upload(nomeArquivoFoto, Buffer.from(base64, 'base64'), { contentType: 'image/jpeg' });
      }
      const { error } = await supabase.from('contagens').insert([{
        organizacao_id: organizacao_id,
        item_id: params.itemId,
        area_id: idFinal, 
        peso_bruto: parseFloat(pesoBruto.replace(',', '.')) || 0,
        em_linha: parseFloat(pesoEmLinha.replace(',', '.')) || 0,
        peso_liquido_calculado: pesoLiquido,
        observacao: observacao,
        foto_url: nomeArquivoFoto,
        detalhes_contagem: {
          tubetes: parseInt(numTubetes) || 0,
          tara_tubete: parseFloat(taraTubete.replace(',', '.')),
          laminas: parseInt(numLaminas) || 0,
          paletes: parseInt(numPaletes) || 0
        }
      }]);
      if (error) throw error;
      Alert.alert("Sucesso", "Contagem registrada!");
      router.back();
    } catch (err: any) { Alert.alert("Erro no salvamento", err.message); } finally { setCarregando(false); }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <HeaderContagem />
      
      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 120 }]} keyboardShouldPersistTaps="handled">
        <View style={styles.infoBox}>
          {params.areaNome ? (
            <Text style={styles.infoLocal}>📍 {params.areaNome}</Text>
          ) : (
            <TouchableOpacity style={styles.inputLocalContainer} onPress={() => setModalLocalVisivel(true)}>
              <Text style={localSelecionadoNome ? styles.inputTextSelected : styles.inputTextPlaceholder}>
                📍 {localSelecionadoNome || "Selecionar Local..."}
              </Text>
            </TouchableOpacity>
          )}
          <Text style={styles.infoMaterial}>📦 {params.codigo}</Text>
        </View>

        <View style={styles.grid}>
          <CardStepper label="Nº Tubetes" value={numTubetes} onChangeText={setNumTubetes} onAdd={() => setNumTubetes((p:any) => (parseInt(p)||0)+1)} onSub={() => setNumTubetes((p:any) => Math.max(0, (parseInt(p)||0)-1))} />
          <CardInput label="Tara Tubete" value={taraTubete} onChange={setTaraTubete} color="#F59E0B" />
          <CardStepper label="Lâminas (-0.4)" value={numLaminas} onChangeText={setNumLaminas} onAdd={() => setNumLaminas((p:any) => (parseInt(p)||0)+1)} onSub={() => setNumLaminas((p:any) => Math.max(0, (parseInt(p)||0)-1))} />
          <CardStepper label="Paletes (-20)" value={numPaletes} onChangeText={setNumPaletes} onAdd={() => setNumPaletes((p:any) => (parseInt(p)||0)+1)} onSub={() => setNumPaletes((p:any) => Math.max(0, (parseInt(p)||0)-1))} />
          <CardInput label="Peso Bruto" value={pesoBruto} onChange={setPesoBruto} color="#F59E0B" />
          
          <View style={[styles.card, { borderLeftWidth: 4, borderLeftColor: '#10B981' }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={styles.cardLabel}>Em Linha:</Text>
                <TouchableOpacity onPress={() => setModalCalcVisivel(true)} style={styles.btnCalcAbre}>
                    <MaterialCommunityIcons name="calculator" size={18} color="#10B981" />
                </TouchableOpacity>
            </View>
            <TextInput style={styles.cardInput} value={pesoEmLinha} onChangeText={setPesoEmLinha} keyboardType="numeric" selectTextOnFocus />
          </View>
        </View>

        <View style={styles.obsContainer}>
          <TextInput style={styles.inputObs} placeholder="Observação..." value={observacao} onChangeText={setObservacao} multiline />
          <TouchableOpacity style={[styles.btnFoto, fotoUri && styles.btnFotoAtivo]} onPress={abrirCamera}>
            <Ionicons name={fotoUri ? "checkmark-circle" : "camera-outline"} size={28} color={fotoUri ? "#10B981" : "#6B7280"} />
          </TouchableOpacity>
        </View>

        <View style={styles.finalCard}>
          <Text style={styles.finalLabel}>Peso Líquido Final:</Text>
          <Text style={styles.finalValue}>{formatarPeso(pesoLiquido)}</Text>
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 20), paddingTop: 15 }]}>
        <TouchableOpacity style={styles.btnCancel} onPress={() => router.back()}><Text style={styles.btnCancelText}>Cancelar</Text></TouchableOpacity>
        <TouchableOpacity style={styles.btnSave} onPress={salvarRegistro} disabled={carregando}>
          {carregando ? <ActivityIndicator color="#FFF" /> : <Text style={styles.btnSaveText}>Salvar Contagem</Text>}
        </TouchableOpacity>
      </View>

      <Modal visible={modalLocalVisivel} transparent animationType="fade">
        <View style={styles.modalOverlayLocal}>
          <View style={styles.modalContentCentral}>
            <View style={styles.modalHeader}><Ionicons name="location-sharp" size={24} color="#005b9f" /><Text style={styles.modalTitle}>Localização</Text></View>
            <FlatList data={areasBd} keyExtractor={(item) => item.id.toString()} renderItem={({ item }) => (
                <TouchableOpacity style={styles.modalItem} onPress={() => { setLocalSelecionadoNome(item.nome); setLocalSelecionadoId(item.id); setModalLocalVisivel(false); }}>
                  <Text style={styles.modalItemText}>{item.nome}</Text>
                  <Ionicons name="chevron-forward" size={18} color="#CBD5E1" />
                </TouchableOpacity>
            )} />
            <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setModalLocalVisivel(false)}><Text style={styles.modalCloseText}>FECHAR</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={modalCalcVisivel} transparent animationType="fade">
        <View style={styles.modalOverlayLocal}>
          <View style={styles.calcContainer}>
            <View style={styles.calcHeader}><Text style={styles.calcTitle}>Somador de Bobinas</Text><TouchableOpacity onPress={() => setModalCalcVisivel(false)}><Ionicons name="close" size={24} color="#64748B" /></TouchableOpacity></View>
            <View style={styles.calcInputsRow}>
                <TextInput style={styles.calcInputPequeno} placeholder="Qtd" value={tempQtd} onChangeText={setTempQtd} keyboardType="numeric" />
                <Text style={{ fontSize: 18, color: '#94A3B8' }}>×</Text>
                <TextInput style={styles.calcInputGrande} placeholder="Peso Un" value={tempPeso} onChangeText={setTempPeso} keyboardType="numeric" />
                <TouchableOpacity style={styles.btnAddCalc} onPress={adicionarAoCalculo}><Ionicons name="add" size={24} color="#FFF" /></TouchableOpacity>
            </View>
            <View style={styles.listaScrollArea}>
                <FlatList data={listaCalculo} keyExtractor={(_, index) => index.toString()} renderItem={({ item, index }) => (
                    <View style={styles.linhaCalculo}>
                        <Text style={styles.txtLinha}>{item.qtd} × {item.peso}kg = {(parseFloat(item.qtd.replace(',','.')) * parseFloat(item.peso.replace(',','.'))).toFixed(2)} kg</Text>
                        <TouchableOpacity onPress={() => removerDoCalculo(index)}><Ionicons name="trash-outline" size={18} color="#EF4444" /></TouchableOpacity>
                    </View>
                )} />
            </View>
            <View style={styles.calcFooter}>
                <View><Text style={styles.labelTotalCalc}>TOTAL:</Text><Text style={styles.valTotalCalc}>{listaCalculo.reduce((acc, i) => acc + (parseFloat(i.qtd.replace(',','.')) * parseFloat(i.peso.replace(',','.'))), 0).toFixed(2)} kg</Text></View>
                <TouchableOpacity style={styles.btnConfirmarCalc} onPress={confirmarCalculo}><Text style={styles.txtConfirmar}>OK</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={modalCameraVisivel} animationType="slide">
        <CameraView style={{ flex: 1 }} ref={cameraRef} active={modalCameraVisivel}>
          <View style={styles.cameraOverlay}>
            <TouchableOpacity onPress={() => setModalCameraVisivel(false)} style={styles.btnFecharCam}><Ionicons name="close" size={40} color="#FFF" /></TouchableOpacity>
            <TouchableOpacity style={styles.btnCapturar} onPress={tirarFoto}><View style={styles.circuloExterno}><View style={styles.circuloInterno} /></View></TouchableOpacity>
          </View>
        </CameraView>
      </Modal>
    </View>
  );
}

const CardStepper = ({ label, value, onAdd, onSub, onChangeText }: any) => (
  <View style={styles.card}>
    <Text style={styles.cardLabel}>{label}:</Text>
    <View style={styles.stepper}>
        <TouchableOpacity onPress={onSub} style={styles.stepBtnContainer}><Text style={styles.stepBtn}>-</Text></TouchableOpacity>
        <TextInput style={styles.stepInput} value={String(value)} onChangeText={onChangeText} keyboardType="numeric" selectTextOnFocus onFocus={() => { if (value === 0 || value === '0' || (label.includes('Paletes') && value === 1)) onChangeText(''); }} onBlur={() => { if (value === '') onChangeText(label.includes('Paletes') ? '1' : '0'); }} />
        <TouchableOpacity onPress={onAdd} style={styles.stepBtnContainer}><Text style={styles.stepBtn}>+</Text></TouchableOpacity>
    </View>
  </View>
);

const CardInput = ({ label, value, onChange, color }: any) => (
  <View style={[styles.card, { borderLeftWidth: 4, borderLeftColor: color }]}>
    <Text style={styles.cardLabel}>{label}:</Text>
    <TextInput style={styles.cardInput} value={value} onChangeText={onChange} keyboardType="numeric" selectTextOnFocus />
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  header: { backgroundColor: '#FFFFFF', paddingTop: 60, paddingBottom: 15, paddingHorizontal: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', elevation: 4 },
  headerTitle: { fontSize: 16, color: '#F59E0B', fontWeight: 'bold' },
  logoSC: { width: 30, height: 30, backgroundColor: '#F59E0B', borderRadius: 4, alignItems: 'center', justifyContent: 'center' },
  logoSCText: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' },
  scrollContent: { padding: 15 },
  infoBox: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#E9ECEF', padding: 12, borderRadius: 12, marginBottom: 15 },
  infoLocal: { fontSize: 13, fontWeight: 'bold', color: '#4B5563', flex: 1 },
  infoMaterial: { fontSize: 14, fontWeight: 'bold', color: '#1F2937' },
  inputLocalContainer: { flex: 1 },
  inputTextSelected: { fontSize: 13, fontWeight: 'bold', color: '#005b9f' },
  inputTextPlaceholder: { fontSize: 13, color: '#9CA3AF' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  card: { backgroundColor: '#FFF', width: '48%', padding: 15, borderRadius: 16, marginBottom: 15, elevation: 2 },
  cardLabel: { fontSize: 11, fontWeight: 'bold', color: '#6C757D', marginBottom: 10 },
  stepper: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#F1F3F5', borderRadius: 20, padding: 2 },
  stepBtnContainer: { padding: 5, minWidth: 40, alignItems: 'center' },
  stepBtn: { fontSize: 24, fontWeight: 'bold', color: '#005b9f' },
  stepInput: { fontSize: 18, fontWeight: 'bold', color: '#1F2937', textAlign: 'center', minWidth: 40, padding: 0 },
  cardInput: { fontSize: 22, fontWeight: 'bold', textAlign: 'right', color: '#1F2937' },
  obsContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', borderRadius: 12, paddingHorizontal: 12, marginVertical: 5, elevation: 2 },
  inputObs: { flex: 1, fontSize: 14, height: 50 },
  btnFoto: { padding: 5, marginLeft: 10 },
  btnFotoAtivo: { backgroundColor: '#D1FAE5', borderRadius: 20 },
  finalCard: { backgroundColor: '#FFF', padding: 20, borderRadius: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderLeftWidth: 6, borderLeftColor: '#005b9f', marginTop: 10, elevation: 4 },
  finalLabel: { fontSize: 16, fontWeight: 'bold', color: '#005b9f' },
  finalValue: { fontSize: 32, fontWeight: 'bold' },
  footer: { flexDirection: 'row', backgroundColor: '#FFF', borderTopWidth: 1, borderTopColor: '#DEE2E6', paddingHorizontal: 20, gap: 15 },
  btnCancel: { flex: 1, height: 55, alignItems: 'center', justifyContent: 'center' },
  btnCancelText: { fontSize: 16, color: '#ADB5BD', fontWeight: 'bold' },
  btnSave: { flex: 1.5, backgroundColor: '#F59E0B', height: 55, borderRadius: 12, alignItems: 'center', justifyContent: 'center', elevation: 3 },
  btnSaveText: { fontSize: 17, color: '#FFF', fontWeight: 'bold' },

  // ESTILOS MODAL LOCALIZAÇÃO
  modalOverlayLocal: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContentCentral: { backgroundColor: '#FFF', borderRadius: 24, padding: 20, width: '95%', maxHeight: '70%', elevation: 10 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingBottom: 20, borderBottomWidth: 1, borderBottomColor: '#F1F5F9', gap: 10 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#1E293B' },
  modalItem: { flexDirection: 'row', paddingVertical: 18, paddingHorizontal: 10, borderBottomWidth: 1, borderBottomColor: '#F1F5F9', alignItems: 'center', justifyContent: 'space-between' },
  modalItemText: { fontSize: 18, color: '#334155', fontWeight: '500' },
  modalCloseBtn: { marginTop: 15, paddingVertical: 15, backgroundColor: '#F1F5F9', borderRadius: 12, alignItems: 'center' },
  modalCloseText: { color: '#64748B', fontWeight: 'bold' },

  // ESTILOS CALCULADORA
  btnCalcAbre: { backgroundColor: '#ECFDF5', padding: 6, borderRadius: 8 },
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
  txtConfirmar: { color: '#FFF', fontWeight: 'bold' },

  cameraOverlay: { flex: 1, justifyContent: 'space-between', padding: 30 },
  btnFecharCam: { alignSelf: 'flex-end', marginTop: 20 },
  btnCapturar: { alignSelf: 'center', marginBottom: 20 },
  circuloExterno: { width: 80, height: 80, borderRadius: 40, borderWidth: 4, borderColor: '#FFF', alignItems: 'center', justifyContent: 'center' },
  circuloInterno: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#FFF' },
});