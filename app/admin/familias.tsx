import React, { useState, useEffect } from 'react';
import { 
  View, Text, TextInput, TouchableOpacity, StyleSheet, 
  FlatList, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, StatusBar 
} from 'react-native';
import { Stack, useRouter } from 'expo-router'; // useRouter adicionado
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../src/supabase'; 
import { useAuth } from '../../src/context/AuthContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const COLORS = {
  background: '#F8FAFC',
  primary: '#E6A23C', 
  secondary: '#1E3A8A', // Azul Tech
  success: '#10B981',
  danger: '#EF4444',
  text: '#1E293B',
  border: '#E2E8F0',
  white: '#FFFFFF',
  placeholder: '#94A3B8',
};

export default function FamiliasAdminScreen() {
  const { organizacao_id } = useAuth();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [familias, setFamilias] = useState<any[]>([]);
  
  const [nomeFamilia, setNomeFamilia] = useState('');
  const [editandoId, setEditandoId] = useState<string | null>(null);

  useEffect(() => {
    carregarFamilias();
  }, [organizacao_id]);

  const carregarFamilias = async () => {
    if (!organizacao_id) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('familias')
        .select('*')
        .eq('organizacao_id', organizacao_id)
        .order('nome');
        
      if (error) throw error;
      setFamilias(data || []);
    } catch (e: any) {
      Alert.alert('Erro', 'Não foi possível carregar as famílias.');
    } finally {
      setLoading(false);
    }
  };

  const handleSalvar = async () => {
    if (!nomeFamilia.trim()) {
      return Alert.alert('Atenção', 'O nome da família não pode ficar vazio.');
    }

    setSalvando(true);
    const dados = {
      organizacao_id,
      nome: nomeFamilia.trim(),
    };

    try {
      if (editandoId) {
        const { error } = await supabase.from('familias').update(dados).eq('id', editandoId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('familias').insert(dados);
        if (error) throw error;
      }
      
      limparForm();
      carregarFamilias();
    } catch (e: any) {
      Alert.alert('Erro ao salvar', 'Verifique se esta família já está cadastrada.');
    } finally {
      setSalvando(false);
    }
  };

  const handleExcluir = (id: string, nome: string) => {
    Alert.alert(
      'Atenção',
      `Deseja realmente excluir a família "${nome}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Excluir', 
          style: 'destructive', 
          onPress: async () => {
            try {
              setLoading(true);
              const { error } = await supabase.from('familias').delete().eq('id', id);
              if (error) throw error;
              carregarFamilias();
            } catch (e: any) {
              Alert.alert('Erro', 'Não é possível excluir uma família que possui itens vinculados.');
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const iniciarEdicao = (familia: any) => {
    setEditandoId(familia.id);
    setNomeFamilia(familia.nome);
  };

  const limparForm = () => {
    setEditandoId(null);
    setNomeFamilia('');
  };

  return (
    <KeyboardAvoidingView 
      style={{ flex: 1 }} 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />
        <StatusBar barStyle="light-content" />

        {/* CABEÇALHO PADRÃO SMARTCOUNT */}
        <View style={[styles.headerAzul, { paddingTop: insets.top + 10 }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Hub de Famílias</Text>
        </View>

        <View style={styles.content}>
          {/* ÁREA DE CADASTRO */}
          <View style={[styles.card, editandoId && styles.cardEditando]}>
            <Text style={styles.cardTitle}>
              {editandoId ? '✏️ Editando Família' : '🏷️ Cadastrar Nova Família'}
            </Text>
            
            <View style={styles.formRow}>
              <TextInput 
                style={styles.input} 
                placeholder="Ex: Adesivos, Tampas, Caixas..." 
                placeholderTextColor={COLORS.placeholder} 
                value={nomeFamilia} 
                onChangeText={setNomeFamilia} 
              />
              <TouchableOpacity 
                style={[styles.btnSalvar, salvando && { opacity: 0.7 }]} 
                onPress={handleSalvar} 
                disabled={salvando}
              >
                {salvando ? (
                  <ActivityIndicator color="#FFF" size="small" />
                ) : (
                  <Ionicons name={editandoId ? "checkmark" : "add"} size={26} color="#FFF" />
                )}
              </TouchableOpacity>
            </View>

            {editandoId && (
              <TouchableOpacity onPress={limparForm} style={{ marginTop: 10 }}>
                <Text style={{ color: COLORS.danger, fontSize: 13, fontWeight: 'bold' }}>Cancelar Edição</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* LISTA DE FAMÍLIAS */}
          <Text style={styles.listHeaderTitle}>Famílias Ativas</Text>
          
          {loading ? (
            <ActivityIndicator size="large" color={COLORS.secondary} style={{ marginTop: 30 }} />
          ) : (
            <FlatList
              data={familias}
              keyExtractor={(item) => String(item.id)}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
              renderItem={({ item }) => (
                <View style={styles.itemCard}>
                  <View style={styles.itemIconWrap}>
                    <Ionicons name="pricetag-outline" size={16} color={COLORS.secondary} />
                  </View>
                  <Text style={styles.itemName}>{item.nome}</Text>
                  
                  <View style={styles.actionButtons}>
                    <TouchableOpacity onPress={() => iniciarEdicao(item)} style={styles.editBtn}>
                      <Ionicons name="pencil" size={18} color={COLORS.secondary} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleExcluir(item.id, item.nome)} style={styles.deleteBtn}>
                      <Ionicons name="trash-outline" size={18} color={COLORS.danger} />
                    </TouchableOpacity>
                  </View>
                </View>
              )}
              ListEmptyComponent={
                <View style={styles.emptyState}>
                  <Ionicons name="folder-open-outline" size={48} color={COLORS.placeholder} />
                  <Text style={styles.emptyStateText}>Nenhuma família cadastrada.</Text>
                </View>
              }
            />
          )}
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  
  /* ESTILO DO CABEÇALHO PADRONIZADO */
  headerAzul: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingBottom: 20,
    paddingHorizontal: 20, 
    backgroundColor: COLORS.secondary,
    borderBottomLeftRadius: 15,
    borderBottomRightRadius: 15,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
  },
  backBtn: { marginRight: 15 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#FFF' },

  content: { flex: 1, padding: 15 },

  /* ÁREA DE CADASTRO */
  card: { 
    backgroundColor: COLORS.white, 
    padding: 15, 
    borderRadius: 12, 
    marginBottom: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    elevation: 1
  },
  cardEditando: {
    borderColor: COLORS.primary,
    borderWidth: 2,
    backgroundColor: '#FFFBEB' 
  },
  cardTitle: { 
    fontSize: 15, 
    fontWeight: 'bold', 
    marginBottom: 12, 
    color: COLORS.secondary 
  },
  formRow: { flexDirection: 'row', alignItems: 'center' },
  input: { 
    flex: 1,
    height: 50, 
    backgroundColor: COLORS.white, 
    borderWidth: 1, 
    borderColor: COLORS.border, 
    borderRadius: 10, 
    paddingHorizontal: 15, 
    fontSize: 16, 
    color: COLORS.text,
    marginRight: 10
  },
  btnSalvar: {
    width: 50,
    height: 50,
    backgroundColor: COLORS.secondary,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },

  /* LISTA */
  listHeaderTitle: {
    fontSize: 13,
    fontWeight: '900',
    color: COLORS.placeholder,
    textTransform: 'uppercase',
    marginBottom: 10,
    marginLeft: 5
  },
  itemCard: { 
    flexDirection: 'row', 
    backgroundColor: COLORS.white, 
    padding: 15, 
    borderRadius: 12, 
    marginBottom: 10, 
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  itemIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12
  },
  itemName: { 
    flex: 1,
    fontSize: 16, 
    fontWeight: '700', 
    color: COLORS.text 
  },
  actionButtons: { flexDirection: 'row', gap: 12 },
  editBtn: { padding: 4 },
  deleteBtn: { padding: 4 },
  
  emptyState: { alignItems: 'center', paddingTop: 50 },
  emptyStateText: { marginTop: 10, fontSize: 14, color: COLORS.placeholder, fontStyle: 'italic' }
});