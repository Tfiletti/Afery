import { useEffect, useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator, Image, Platform, Modal, FlatList, StatusBar } from 'react-native';
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
  const [metodologia, setMetodologia] = useState('');

  // Estados dos campos
  const [tubetes, setTubetes] = useState<any>('0');
  const [tara, setTara] = useState('0');
  const [laminas, setLaminas] = useState<any>('0');
  const [paletes, setPaletes] = useState<any>('0');
  const [caixas, setCaixas] = useState<any>('0'); 
  const [pesoBruto, setPesoBruto] = useState('0');
  const [emLinha, setEmLinha] = useState('0');
  const [obs, setObs] = useState('');
  const [fotoUrl, setFotoUrl] = useState<string | null>(null);
  const [pesoLiquido, setPesoLiquido] = useState(0);

  const [fatores, setFatores] = useState({ palete: 0, caixa: 0, unitario: 0 });

  const [modalCalcVisivel, setModalCalcVisivel] = useState(false);

  const formatarPeso = (valor: number) => {
    return valor.toFixed(2).replace('.', ',').replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1.');
  };

  // CORREÇÃO: Função lerNumero blindada contra vírgulas
  const lerNumero = (valor: any) => {
    if (valor === '' || valor === null || valor === undefined) return 0;
    // Primeiro removemos a vírgula para converter para o padrão decimal (ponto)
    const stringLimpa = String(valor).replace(',', '.');
    const numero = parseFloat(stringLimpa);
    // Se não for um número válido, retorna 0 em vez de NaN
    return isNaN(numero) ? 0 : numero;
  };

  const carregarDados = async () => {
    if (!organizacao_id) return; 
    try {
      const { data, error } = await supabase
        .from('contagens')
        .select('*, itens(id, descricao, sku_codigo, familias(metodo_contagem))') 
        .eq('id', id)
        .single();
        
      if (error) throw error;
      if (data) {
        setItemData(data);
        const det = data.detalhes_contagem || {};
        const mtd = det.metodologia_usada || data.itens?.familias?.metodo_contagem || 'CAIXARIA_UN';
        setMetodologia(mtd);

        const { data: eng } = await supabase.from('item_fornecedor').select('*').eq('item_id', data.item_id).limit(1).maybeSingle();
        if (eng) setFatores({ palete: eng.fator_palete || 0, caixa: eng.fator_caixa || 0, unitario: eng.peso_unitario_produto || 0 });

        // Carregamos os valores formatando ponto por vírgula para exibição amigável
        setTubetes(String(det.tubetes ?? '0'));
        setLaminas(String(det.laminas ?? '0'));
        setPaletes(String(det.paletes ?? '0'));
        setCaixas(String(det.caixas ?? det.volumes_sacos_caixas ?? '0'));
        setTara(String(det.tara_tubete ?? det.taras ?? det.tara_extra ?? '0').replace('.', ','));
        setPesoBruto(String(data.peso_bruto ?? '0').replace('.', ','));
        setEmLinha(String(data.em_linha ?? '0').replace('.', ','));
        setPesoLiquido(data.peso_liquido_calculado || 0);
        setObs(data.observacao || '');
        
        if (data.foto_url) {
          const { data: urlData } = supabase.storage.from('fotos_contagem').getPublicUrl(data.foto_url);
          setFotoUrl(urlData.publicUrl);
        }
      }
    } catch (err: any) { 
      Alert.alert("Erro", "Erro ao carregar dados.");
      router.back();
    } finally { setCarregando(false); }
  };

  useEffect(() => { carregarDados(); }, [id]); 

  // Efeito de Cálculo em tempo real
  useEffect(() => {
    if (carregando || !itemData) return;

    const bruto = lerNumero(pesoBruto);
    const taraVal = lerNumero(tara);
    const nTub = lerNumero(tubetes);
    const nLam = lerNumero(laminas);
    const nPal = lerNumero(paletes);
    const nCx = lerNumero(caixas);
    const somaLinha = lerNumero(emLinha);
    
    if (metodologia === 'BOBINA_KG') {
        const descontoTaras = (nTub * taraVal) + (nLam * 0.4) + (nPal * 20);
        setPesoLiquido(Math.max(0, bruto - descontoTaras) + somaLinha);
    } else {
        const fechados = (nPal * fatores.palete) + (nCx * fatores.caixa);
        const saldoBalanca = Math.max(0, bruto - taraVal);
        const fracionado = fatores.unitario > 0 ? (saldoBalanca / fatores.unitario) : saldoBalanca;
        setPesoLiquido(fechados + fracionado + somaLinha);
    }
  }, [pesoBruto, tubetes, tara, emLinha, laminas, paletes, caixas, metodologia, fatores, carregando]);

  const excluir = () => {
    Alert.alert("🗑️ Excluir", "Deseja apagar esta contagem?", [
      { text: "Não", style: "cancel" },
      { text: "Sim, Excluir", style: "destructive", onPress: async () => {
          await supabase.from('contagens').delete().eq('id', id);
          router.back();
      }}
    ]);
  };

  const salvar = async () => {
    try {
      const payloadDetalhes: any = {
          ...itemData?.detalhes_contagem,
          metodologia_usada: metodologia,
          paletes: parseInt(String(paletes)) || 0,
          caixas: parseInt(String(caixas)) || 0,
          avulsas_em_linha: lerNumero(emLinha)
      };
      
      if (metodologia === 'BOBINA_KG') {
          payloadDetalhes.tubetes = parseInt(String(tubetes)) || 0;
          payloadDetalhes.tara_tubete = lerNumero(tara);
          payloadDetalhes.laminas = parseInt(String(laminas)) || 0;
      } else {
          payloadDetalhes.taras = lerNumero(tara);
      }

      const { error } = await supabase.from('contagens').update({
        peso_bruto: lerNumero(pesoBruto),
        em_linha: lerNumero(emLinha),
        peso_liquido_calculado: pesoLiquido,
        observacao: obs,
        detalhes_contagem: payloadDetalhes
      }).eq('id', id);

      if (error) throw error;

      Alert.alert("Sucesso", "Atualizado!");
      router.back();
    } catch (err: any) { 
      Alert.alert("Erro", "Falha ao salvar: " + err.message); 
    }
  };

  if (carregando) return <View style={styles.center}><ActivityIndicator size="large" color="#1E3A8A" /></View>;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 80 }]} keyboardShouldPersistTaps="handled">
        
        <View style={styles.header}>
            <View style={styles.badgeSku}>
              <MaterialCommunityIcons name="tag-outline" size={14} color="#B45309" />
              <Text style={styles.textoSku}>{itemData?.itens?.sku_codigo}</Text>
            </View>
            <TouchableOpacity onPress={excluir} style={styles.btnExcluir}>
                <Ionicons name="trash-outline" size={22} color="#EF4444" />
            </TouchableOpacity>
        </View>
        
        <Text style={styles.itemDesc} numberOfLines={2}>{itemData?.itens?.descricao}</Text>

        <View style={styles.grid}>
          {metodologia === 'BOBINA_KG' ? (
            <>
              <CardStepper label="Tubetes" value={tubetes} onChangeText={setTubetes} color="#F59E0B" />
              <CardInput label="Tara Tub." value={tara} onChange={setTara} color="#F59E0B" />
              <CardStepper label="Lâminas" value={laminas} onChangeText={setLaminas} color="#6366F1" />
              <CardStepper label="Paletes" value={paletes} onChangeText={setPaletes} color="#1E3A8A" />
            </>
          ) : (
            <>
              <CardStepper label="Paletes" value={paletes} onChangeText={setPaletes} color="#1E3A8A" />
              <CardStepper label="Caixas" value={caixas} onChangeText={setCaixas} color="#F59E0B" />
              <CardInput label="Tara Extra" value={tara} onChange={setTara} color="#EF4444" />
            </>
          )}
          <CardInput label="Peso Bruto" value={pesoBruto} onChange={setPesoBruto} color="#EF4444" />
          
          <View style={[styles.card, { borderLeftWidth: 3, borderLeftColor: '#10B981', width: '100%' }]}>
            <View style={styles.cardHeaderSmall}>
                <Text style={styles.cardLabel}>EM LINHA (KG)</Text>
            </View>
            <TextInput 
              style={styles.cardInput} 
              value={String(emLinha)} 
              onChangeText={setEmLinha} 
              keyboardType="numeric" 
            />
          </View>
        </View>

        <TextInput style={styles.obsInput} placeholder="Observação..." value={obs} onChangeText={setObs} multiline />

        <View style={styles.finalCard}>
            <Text style={styles.finalLabel}>PESO LÍQUIDO FINAL</Text>
            <Text style={styles.finalValue}>{formatarPeso(pesoLiquido)}</Text>
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 10) }]}>
        <TouchableOpacity style={styles.btnCancel} onPress={() => router.back()}>
          <Text style={styles.txtCancel}>Cancelar</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.btnSave} onPress={salvar}>
          <Text style={styles.txtSave}>Salvar Alterações</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const CardStepper = ({ label, value, onChangeText, color }: any) => (
  <View style={[styles.card, { borderLeftWidth: 3, borderLeftColor: color }]}>
    <Text style={styles.cardLabel}>{label}</Text>
    <View style={styles.stepper}>
        <TouchableOpacity onPress={() => onChangeText(String(Math.max(0, parseInt(value || '0') - 1)))}>
          <Ionicons name="remove-circle-outline" size={22} color={color} />
        </TouchableOpacity>
        <TextInput style={styles.stepInput} value={String(value)} onChangeText={onChangeText} keyboardType="numeric" />
        <TouchableOpacity onPress={() => onChangeText(String(parseInt(value || '0') + 1))}>
          <Ionicons name="add-circle-outline" size={22} color={color} />
        </TouchableOpacity>
    </View>
  </View>
);

const CardInput = ({ label, value, onChange, color }: any) => (
  <View style={[styles.card, { borderLeftWidth: 3, borderLeftColor: color }]}>
    <Text style={styles.cardLabel}>{label}</Text>
    <TextInput style={styles.cardInput} value={String(value)} onChangeText={onChange} keyboardType="numeric" />
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  center: { flex: 1, justifyContent: 'center' },
  scroll: { padding: 12, paddingTop: 40 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  badgeSku: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: '#E2E8F0' },
  textoSku: { marginLeft: 5, fontWeight: 'bold', fontSize: 14, color: '#1E293B' },
  btnExcluir: { padding: 5 },
  itemDesc: { fontSize: 14, color: '#64748B', fontWeight: 'bold', marginBottom: 15, textAlign: 'center', paddingHorizontal: 10 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  card: { backgroundColor: '#FFF', width: '48%', padding: 10, borderRadius: 10, marginBottom: 10, elevation: 1 },
  cardLabel: { fontSize: 10, fontWeight: 'bold', color: '#94A3B8', marginBottom: 4, textTransform: 'uppercase' },
  cardHeaderSmall: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  stepper: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  stepInput: { fontSize: 16, fontWeight: 'bold', textAlign: 'center', color: '#1E293B', width: 40 },
  cardInput: { fontSize: 18, fontWeight: 'bold', textAlign: 'right', color: '#1E293B', padding: 0 },
  obsInput: { backgroundColor: '#FFF', padding: 10, borderRadius: 10, height: 50, fontSize: 13, marginBottom: 10, borderWidth: 1, borderColor: '#E2E8F0' },
  finalCard: { backgroundColor: '#1E3A8A', padding: 15, borderRadius: 12, alignItems: 'center', marginTop: 5 },
  finalLabel: { color: '#BFDBFE', fontSize: 10, fontWeight: 'bold', letterSpacing: 1 },
  finalValue: { color: '#FFF', fontSize: 24, fontWeight: '900' },
  footer: { flexDirection: 'row', backgroundColor: '#FFF', padding: 12, borderTopWidth: 1, borderTopColor: '#E2E8F0', gap: 10 },
  btnCancel: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  btnSave: { flex: 2, backgroundColor: '#F59E0B', height: 45, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  txtCancel: { fontSize: 14, color: '#94A3B8', fontWeight: 'bold' },
  txtSave: { fontSize: 14, color: '#FFF', fontWeight: 'bold' }
});