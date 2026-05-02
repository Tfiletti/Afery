import React, { useState, useEffect } from 'react';
import { 
  View, Text, TextInput, TouchableOpacity, StyleSheet, 
  FlatList, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, Image 
} from 'react-native';
import { Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../src/supabase'; 
import { useAuth } from '../../src/context/AuthContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const COLORS = {
  background: '#FAFAFA',
  primary: '#E6A23C', // O Amarelo/Dourado da marca
  secondary: '#1E3A8A', // O Azul marcante
  success: '#10B981',
  danger: '#EF4444',
  text: '#1A202C',
  border: '#DDDDDD',
  white: '#FFFFFF',
  placeholder: '#94A3B8',
  inputBg: '#FFFFFF',
};

export default function FamiliasAdminScreen() {
  const { organizacao_id } = useAuth();
  const insets = useSafeAreaInsets();
  
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
      console.error('Erro ao carregar famílias:', e);
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
      nome: nomeFamilia.trim(), // Respeita exatamente a forma que você digitou
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
      `Deseja realmente excluir a família "${nome}"?\n\nItens vinculados a ela poderão ficar sem classificação.`,
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
              Alert.alert('Erro', 'Não é possível excluir uma família que já possui itens vinculados a ela.');
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
        <Stack.Screen options={{ title: 'Hub de Famílias', headerShown: true }} />

        {/* =============== NOVO CABEÇALHO CLEAN COM A LOGO =============== */}
        <View style={styles.cleanHeader}>
          <View style={styles.logoAndText}>
            <Image 
              source={require('../../assets/images/sc_icon.png')} 
              style={{ width: 40, height: 40 }} 
              resizeMode="contain"
            />
            <View style={styles.brandTitleContainer}>
              <Text style={styles.brandTitle}>Smart<Text style={{ color: COLORS.primary }}>Count</Text></Text>
              <Text style={styles.brandSubtitle}>GESTÃO DE CATEGORIAS</Text>
            </View>
          </View>
        </View>

        {/* =============== ÁREA DE CADASTRO =============== */}
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
                <Ionicons name={editandoId ? "checkmark" : "add"} size={24} color="#FFF" />
              )}
            </TouchableOpacity>
          </View>

          {editandoId && (
            <TouchableOpacity onPress={limparForm} style={{ marginTop: 10, alignSelf: 'flex-start' }}>
              <Text style={{ color: COLORS.danger, fontSize: 12, fontWeight: 'bold' }}>Cancelar Edição</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* =============== LISTA DE FAMÍLIAS =============== */}
        <View style={styles.listContainer}>
          <Text style={styles.listHeaderTitle}>Famílias Ativas na Organização</Text>
          
          {loading ? (
            <ActivityIndicator size="large" color={COLORS.secondary} style={{ marginTop: 30 }} />
          ) : familias.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="folder-open-outline" size={48} color={COLORS.placeholder} />
              <Text style={styles.emptyStateText}>Nenhuma família cadastrada ainda.</Text>
            </View>
          ) : (
            <FlatList
              data={familias}
              keyExtractor={(item) => String(item.id)}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: Math.max(insets.bottom + 20, 40) }}
              renderItem={({ item }) => (
                <View style={styles.itemCard}>
                  <View style={styles.itemIconWrap}>
                    <Ionicons name="pricetag-outline" size={16} color={COLORS.primary} />
                  </View>
                  <Text style={styles.itemName}>{item.nome}</Text>
                  
                  <View style={styles.actionButtons}>
                    <TouchableOpacity onPress={() => iniciarEdicao(item)} style={styles.editBtn}>
                      <Ionicons name="pencil" size={16} color={COLORS.secondary} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleExcluir(item.id, item.nome)} style={styles.deleteBtn}>
                      <Ionicons name="trash-outline" size={16} color={COLORS.danger} />
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            />
          )}
        </View>

      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: COLORS.background,
    padding: 15,
  },
  
  /* --- ESTILOS DO NOVO CABEÇALHO CLEAN --- */
  cleanHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 15,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  logoAndText: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  brandTitleContainer: {
    marginLeft: 12,
  },
  brandTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: COLORS.secondary,
    letterSpacing: 0.5,
  },
  brandSubtitle: {
    fontSize: 10,
    color: COLORS.placeholder,
    fontWeight: 'bold',
    marginTop: -2,
    letterSpacing: 1,
  },

  /* --- ÁREA DE CADASTRO --- */
  card: { 
    backgroundColor: COLORS.white, 
    padding: 15, 
    borderRadius: 10, 
    elevation: 2, 
    marginBottom: 20,
    borderWidth: 1,
    borderColor: COLORS.border
  },
  cardEditando: {
    borderColor: COLORS.primary,
    borderWidth: 2,
    backgroundColor: '#FFFBEB' 
  },
  cardTitle: { 
    fontSize: 14, 
    fontWeight: 'bold', 
    marginBottom: 12, 
    color: COLORS.secondary 
  },
  formRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: { 
    flex: 1,
    height: 45, 
    backgroundColor: COLORS.inputBg, 
    borderWidth: 1, 
    borderColor: COLORS.border, 
    borderRadius: 8, 
    paddingHorizontal: 12, 
    fontSize: 14, 
    color: COLORS.text,
    marginRight: 10
  },
  btnSalvar: {
    width: 45,
    height: 45,
    backgroundColor: COLORS.secondary,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
  },

  /* --- LISTA --- */
  listContainer: {
    flex: 1,
  },
  listHeaderTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: COLORS.placeholder,
    textTransform: 'uppercase',
    marginBottom: 10,
    marginLeft: 5
  },
  itemCard: { 
    flexDirection: 'row', 
    backgroundColor: COLORS.white, 
    padding: 12, 
    borderRadius: 8, 
    marginBottom: 8, 
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F0F0F0',
    elevation: 1
  },
  itemIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#FFFBEB',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10
  },
  itemName: { 
    flex: 1,
    fontSize: 14, 
    fontWeight: 'bold', 
    color: COLORS.text 
  },
  actionButtons: { 
    flexDirection: 'row', 
    gap: 8 
  },
  editBtn: { 
    padding: 8, 
    backgroundColor: '#E0F2FE', 
    borderRadius: 6 
  },
  deleteBtn: { 
    padding: 8, 
    backgroundColor: '#FEE2E2', 
    borderRadius: 6 
  },
  
  /* --- ESTADOS VAZIOS --- */
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 50
  },
  emptyStateText: {
    marginTop: 10,
    fontSize: 14,
    color: COLORS.placeholder,
    fontStyle: 'italic'
  }
});