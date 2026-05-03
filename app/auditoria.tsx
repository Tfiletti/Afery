import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, FlatList, Image, TouchableOpacity, ActivityIndicator, StatusBar, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../src/supabase';

const HeaderAuditoria = ({ codigo, nome }: { codigo: string, nome: string }) => {
  const router = useRouter();
  return (
    <View style={styles.header}>
      <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
        <Ionicons name="arrow-back" size={24} color="#1F2937" />
      </TouchableOpacity>
      <View style={{ flex: 1, marginLeft: 10 }}>
        <Text style={styles.headerTitle} numberOfLines={1}>{codigo || 'Buscando...'}</Text>
        <Text style={styles.headerSubtitle} numberOfLines={1}>{nome || 'Carregando detalhes...'}</Text>
      </View>
    </View>
  );
};

export default function TelaAuditoria() {
  const params = useLocalSearchParams(); 
  const insets = useSafeAreaInsets();
  const [contagens, setContagens] = useState<any[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [itemInfo, setItemInfo] = useState({ nome: '', codigo: '' });

  const formatarBR = (valor: number) => {
    if (valor === undefined || valor === null) return "0,000";
    return valor.toFixed(3).replace('.', ',');
  };

  const parseBR = (valor: any) => {
    if (!valor) return 0;
    return parseFloat(valor.toString().replace(',', '.')) || 0;
  };

  useEffect(() => {
    async function carregarDados() {
      const idBusca = String(params.itemId || '').trim();
      const dataBusca = String(params.data || '').trim();
      if (!idBusca) { setCarregando(false); return; }

      try {
        setCarregando(true);
        const { data: itemData } = await supabase.from('itens').select('nome, id').eq('id', idBusca).maybeSingle();
        if (itemData) setItemInfo({ codigo: itemData.id, nome: itemData.nome });

        const { data: contData, error: errCont } = await supabase
          .from('contagens')
          .select(`id, data_hora, peso_bruto, em_linha, peso_liquido_calculado, observacao, foto_url, detalhes_contagem, usuario_nome, areas (nome)`)
          .eq('item_id', idBusca)
          .gte('data_hora', `${dataBusca}T00:00:00`)
          .lte('data_hora', `${dataBusca}T23:59:59`)
          .order('data_hora', { ascending: false });

        if (errCont) throw errCont;
        setContagens(contData || []);
      } catch (err: any) {
        Alert.alert("Erro", "Erro ao carregar auditoria: " + err.message);
      } finally { setCarregando(false); }
    }
    carregarDados();
  }, [params.itemId, params.data]);

  const renderCardAuditoria = ({ item }: { item: any }) => {
    const publicUrl = item.foto_url ? supabase.storage.from('fotos_contagem').getPublicUrl(item.foto_url).data.publicUrl : null;
    const det = item.detalhes_contagem || {};
    const metodo = det.metodologia_usada || 'PADRÃO';
    
    const pesoEmLinha = parseBR(item.em_linha);

    // Regra: Palete só aparece se em_linha estiver zerado
    const temComposicao = (det.volumes_sacos_caixas > 0) || (det.caixas > 0) || (det.tubetes > 0) || (det.laminas > 0) || (det.taras > 0) || (det.paletes > 0 && pesoEmLinha === 0);

    const MiniCard = ({ icon, label, value, color }: any) => (
      <View style={[styles.miniCard, { borderTopColor: color }]}>
        <MaterialCommunityIcons name={icon} size={16} color={color} />
        <Text style={styles.miniCardValue}>{value}</Text>
        <Text style={styles.miniCardLabel}>{label}</Text>
      </View>
    );

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.txtLocal}>{item.areas?.nome || 'Local Direto'}</Text>
            <Text style={styles.txtData}>{new Date(item.data_hora).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} • {item.usuario_nome || 'N/I'}</Text>
          </View>
          <View style={styles.badgeMetodo}>
            <Text style={styles.txtMetodo}>{metodo.replace('_', ' ')}</Text>
          </View>
        </View>

        <View style={styles.rowInfo}>
          <View style={styles.infoBox}>
            <Text style={styles.infoLabel}>BRUTO</Text>
            <Text style={styles.infoValue}>{formatarBR(item.peso_bruto)}</Text>
          </View>
          <View style={[styles.infoBox, { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' }]}>
            <Text style={[styles.infoLabel, { color: '#166534' }]}>TOTAL LÍQUIDO</Text>
            <Text style={[styles.infoValue, { color: '#166534' }]}>{formatarBR(item.peso_liquido_calculado)}</Text>
          </View>
        </View>

        {temComposicao && (
          <View style={styles.miniCardsGrid}>
            {det.paletes > 0 && pesoEmLinha === 0 && (
                <MiniCard icon="package-variant-closed" label="Paletes" value={det.paletes} color="#1E3A8A" />
            )}
            {(det.volumes_sacos_caixas > 0 || det.caixas > 0) && (
                <MiniCard icon="package-variant" label="Cx/Sacos" value={det.volumes_sacos_caixas || det.caixas} color="#E6A23C" />
            )}
            {det.tubetes > 0 && <MiniCard icon="format-line-spacing" label="Tubetes" value={det.tubetes} color="#64748B" />}
            {det.laminas > 0 && <MiniCard icon="layers-outline" label="Lâminas" value={det.laminas} color="#8B5CF6" />}
            {det.taras > 0 && <MiniCard icon="scale-balance" label="Taras" value={`${det.taras}k`} color="#EF4444" />}
          </View>
        )}

        {item.observacao && item.observacao !== 'EMPTY' && item.observacao !== '' && (
          <View style={styles.boxObs}>
            <Ionicons name="alert-circle-outline" size={14} color="#B45309" />
            <Text style={styles.txtObs}>{item.observacao}</Text>
          </View>
        )}

        {publicUrl && <Image source={{ uri: publicUrl }} style={styles.imgEvidencia} resizeMode="cover" />}
      </View>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" />
      <HeaderAuditoria codigo={itemInfo.codigo} nome={itemInfo.nome} />
      {carregando ? (
        <View style={styles.center}><ActivityIndicator size="large" color="#1E3A8A" /></View>
      ) : (
        <FlatList data={contagens} keyExtractor={(item) => String(item.id)} renderItem={renderCardAuditoria} contentContainerStyle={styles.list} ListEmptyComponent={
            <View style={styles.center}><Ionicons name="search-outline" size={40} color="#CBD5E1" /><Text style={styles.emptyText}>Sem registros.</Text></View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 12, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 16, fontWeight: 'bold', color: '#1E293B' },
  headerSubtitle: { fontSize: 12, color: '#64748B' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  list: { padding: 12 },
  card: { backgroundColor: '#FFF', borderRadius: 12, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: '#E2E8F0', elevation: 2 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  txtLocal: { fontSize: 14, fontWeight: 'bold', color: '#1E3A8A' },
  txtData: { fontSize: 11, color: '#94A3B8' },
  badgeMetodo: { backgroundColor: '#F1F5F9', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  txtMetodo: { fontSize: 9, fontWeight: 'bold', color: '#64748B', textTransform: 'uppercase' },
  rowInfo: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  infoBox: { flex: 1, backgroundColor: '#F8FAFC', paddingVertical: 6, paddingHorizontal: 8, borderRadius: 8, alignItems: 'center', borderWidth: 1, borderColor: '#F1F5F9' },
  infoLabel: { fontSize: 8, color: '#94A3B8', fontWeight: 'bold', marginBottom: 2 },
  infoValue: { fontSize: 14, fontWeight: 'bold', color: '#334155' },
  miniCardsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 },
  miniCard: { backgroundColor: '#F8FAFC', width: '31.5%', padding: 6, borderRadius: 6, alignItems: 'center', borderWidth: 1, borderColor: '#F1F5F9', borderTopWidth: 2 },
  miniCardValue: { fontSize: 11, fontWeight: 'bold', color: '#1E293B', marginTop: 2 },
  miniCardLabel: { fontSize: 8, color: '#64748B', fontWeight: 'bold', textTransform: 'uppercase' },
  boxObs: { backgroundColor: '#FFFBEB', padding: 8, borderRadius: 6, flexDirection: 'row', gap: 5, marginBottom: 8, borderWidth: 1, borderColor: '#FEF3C7' },
  txtObs: { fontSize: 12, color: '#92400E', flex: 1 },
  imgEvidencia: { width: '100%', height: 200, borderRadius: 8, marginTop: 4, backgroundColor: '#E2E8F0' },
  emptyText: { color: '#94A3B8', textAlign: 'center', marginTop: 8, fontSize: 13 },
});