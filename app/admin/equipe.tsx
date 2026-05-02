import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  Alert, 
  ActivityIndicator, 
  SafeAreaView 
} from 'react-native';
import { supabase } from '../../src/supabase';
import { useAuth } from '../../src/context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export default function GestaoEquipe() {
  const router = useRouter();
  const { organizacaoId } = useAuth(); // Pega o ID da sua organização logada
  const [equipe, setEquipe] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // 1. Função para buscar conferentes com status 'pendente'
  const fetchPendentes = async () => {
    // BLINDAGEM: Se não tiver o ID da organização, não tenta buscar (evita o erro de UUID)
    if (!organizacaoId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('perfis')
        .select('*')
        .eq('organizacao_id', organizacaoId)
        .eq('status', 'pendente');

      if (error) throw error;
      setEquipe(data || []);
    } catch (error: any) {
      console.error("Erro ao buscar pendentes:", error.message);
      Alert.alert("Erro", "Falha ao carregar lista de solicitações.");
    } finally {
      setLoading(false);
    }
  };

  // Executa toda vez que a tela abrir ou quando o organizacaoId mudar
  useEffect(() => {
    fetchPendentes();
  }, [organizacaoId]);

  // 2. Função para Aprovar o Conferente
  const aprovarUsuario = async (userId: string, email: string) => {
    try {
      const { error } = await supabase
        .from('perfis')
        .update({ status: 'ativo' })
        .eq('id', userId);

      if (error) throw error;

      Alert.alert("Sucesso", `O conferente ${email} foi liberado!`);
      fetchPendentes(); // Atualiza a lista após aprovar
    } catch (error: any) {
      Alert.alert("Erro", "Não foi possível aprovar o usuário.");
    }
  };

  const renderItem = ({ item }: any) => (
    <View style={styles.card}>
      <View style={styles.infoContainer}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{item.email?.substring(0, 2).toUpperCase()}</Text>
        </View>
        <View>
          <Text style={styles.emailText} numberOfLines={1}>{item.email}</Text>
          <Text style={styles.roleText}>Solicitação: Conferente</Text>
        </View>
      </View>
      
      <TouchableOpacity 
        style={styles.btnAprovar} 
        onPress={() => aprovarUsuario(item.id, item.email)}
      >
        <Ionicons name="checkmark-circle" size={38} color="#10B981" />
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#1E3A8A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Solicitações</Text>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#1E3A8A" />
          <Text style={styles.loadingText}>Buscando pendências...</Text>
        </View>
      ) : (
        <FlatList
          data={equipe}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 20 }}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="people-outline" size={60} color="#CBD5E1" />
              <Text style={styles.emptyText}>Nenhuma solicitação aguardando aprovação no momento.</Text>
            </View>
          }
          refreshing={loading}
          onRefresh={fetchPendentes}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    padding: 20, 
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderColor: '#E2E8F0'
  },
  backBtn: { marginRight: 15 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#1E293B' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 10, color: '#64748B' },
  card: { 
    backgroundColor: '#FFF', 
    padding: 15, 
    borderRadius: 16, 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center',
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  infoContainer: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  avatar: { 
    width: 45, 
    height: 45, 
    borderRadius: 22.5, 
    backgroundColor: '#E0E7FF', 
    justifyContent: 'center', 
    alignItems: 'center',
    marginRight: 12
  },
  avatarText: { color: '#1E3A8A', fontWeight: 'bold', fontSize: 16 },
  emailText: { fontSize: 15, fontWeight: '600', color: '#334155', maxWidth: '85%' },
  roleText: { fontSize: 12, color: '#64748B', marginTop: 2 },
  btnAprovar: { paddingLeft: 10 },
  emptyContainer: { alignItems: 'center', marginTop: 100 },
  emptyText: { textAlign: 'center', color: '#94A3B8', marginTop: 15, fontSize: 15, paddingHorizontal: 40 }
});