import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, ActivityIndicator, StatusBar } from 'react-native';
import { supabase } from '../../src/supabase';
import { useAuth } from '../../src/context/AuthContext';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter, Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function GestaoEquipe() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { organizacao_id } = useAuth(); 
  const [equipe, setEquipe] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchEquipe = async () => {
    if (!organizacao_id) return;
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('perfis')
        .select('*')
        .eq('organizacao_id', organizacao_id)
        .neq('role', 'ADMIN') // Não mostra o próprio admin na lista
        .order('nome', { ascending: true });

      if (error) throw error;
      setEquipe(data || []);
    } catch (error: any) {
      Alert.alert("Erro", "Falha ao carregar equipe.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchEquipe(); }, [organizacao_id]);

  const alterarStatus = async (userId: string, novoStatus: string) => {
    try {
      const { error } = await supabase
        .from('perfis')
        .update({ status: novoStatus })
        .eq('id', userId);

      if (error) throw error;
      fetchEquipe(); // Recarrega a lista para mostrar a mudança
    } catch (error: any) {
      Alert.alert("Erro", "Não foi possível alterar o status.");
    }
  };

  const excluirUsuario = (userId: string, nome: string) => {
    Alert.alert("⚠️ Excluir Usuário", `Tem certeza que deseja remover ${nome}? Ele perderá o acesso imediatamente.`, [
      { text: "Cancelar", style: "cancel" },
      { text: "Excluir", style: "destructive", onPress: async () => {
          const { error } = await supabase.from('perfis').delete().eq('id', userId);
          if (error) Alert.alert("Erro", "Não foi possível excluir.");
          else fetchEquipe();
      }}
    ]);
  };

  const renderItem = ({ item }: any) => {
    const isAtivo = item.status === 'ativo';
    const iniciais = item.nome ? item.nome.split(' ').map((n:any)=>n[0]).join('').substring(0,2).toUpperCase() : '??';

    return (
      <View style={[styles.card, !isAtivo && styles.cardPendente]}>
        <View style={styles.infoContainer}>
          <View style={[styles.avatar, !isAtivo && {backgroundColor: '#CBD5E1'}]}>
            <Text style={[styles.avatarText, !isAtivo && {color: '#64748B'}]}>{iniciais}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.nomeText}>{item.nome || 'Sem Nome'}</Text>
            <View style={styles.statusBadge}>
               <View style={[styles.dot, { backgroundColor: isAtivo ? '#10B981' : '#F59E0B' }]} />
               <Text style={styles.statusText}>{isAtivo ? 'ATIVO' : 'AGUARDANDO APROVAÇÃO'}</Text>
            </View>
          </View>
        </View>
        
        <View style={styles.actions}>
          {/* BOTÃO DE STATUS (CHAVINHA LOGICA) */}
          <TouchableOpacity 
            style={[styles.btnAction, { backgroundColor: isAtivo ? '#FEE2E2' : '#D1FAE5' }]} 
            onPress={() => alterarStatus(item.id, isAtivo ? 'pendente' : 'ativo')}
          >
            <Ionicons 
              name={isAtivo ? "person-remove" : "person-add"} 
              size={20} 
              color={isAtivo ? "#EF4444" : "#10B981"} 
            />
          </TouchableOpacity>

          {/* BOTÃO DE EXCLUIR */}
          <TouchableOpacity 
            style={[styles.btnAction, { backgroundColor: '#F1F5F9' }]} 
            onPress={() => excluirUsuario(item.id, item.nome)}
          >
            <Ionicons name="trash-outline" size={20} color="#64748B" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.headerAzul, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}><Ionicons name="arrow-back" size={24} color="#FFF" /></TouchableOpacity>
        <Text style={styles.headerTitle}>Gestão de Equipe</Text>
      </View>

      {loading ? (
        <ActivityIndicator style={{marginTop: 50}} color="#1E3A8A" />
      ) : (
        <FlatList
          data={equipe}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 15 }}
          onRefresh={fetchEquipe}
          refreshing={loading}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  headerAzul: { flexDirection: 'row', alignItems: 'center', paddingBottom: 20, paddingHorizontal: 20, backgroundColor: '#1E3A8A', borderBottomLeftRadius: 15, borderBottomRightRadius: 15 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#FFF' },
  backBtn: { marginRight: 15 },
  card: { backgroundColor: '#FFF', padding: 12, borderRadius: 12, flexDirection: 'row', alignItems: 'center', marginBottom: 10, borderWidth: 1, borderColor: '#E2E8F0' },
  cardPendente: { borderColor: '#F59E0B', borderLeftWidth: 4 },
  infoContainer: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#E0E7FF', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  avatarText: { color: '#1E3A8A', fontWeight: 'bold', fontSize: 14 },
  nomeText: { fontSize: 15, fontWeight: 'bold', color: '#1E293B' },
  statusBadge: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  dot: { width: 6, height: 6, borderRadius: 3, marginRight: 5 },
  statusText: { fontSize: 10, fontWeight: 'bold', color: '#64748B' },
  actions: { flexDirection: 'row', gap: 8 },
  btnAction: { width: 38, height: 38, borderRadius: 19, justifyContent: 'center', alignItems: 'center' }
});