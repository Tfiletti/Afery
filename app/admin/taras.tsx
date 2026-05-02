import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  FlatList, 
  Alert, 
  ActivityIndicator,
  Platform
} from 'react-native';
import { Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../src/supabase'; 
import { useAuth } from '../../src/context/AuthContext';

const COLORS = {
  background: '#FAFAFA',
  primary: '#E6A23C', // Laranja Industrial
  secondary: '#1E3A8A', // Azul Tech
  danger: '#EF4444', 
  success: '#10B981',
  text: '#333333',
  border: '#DDDDDD',
  white: '#FFFFFF',
};

export default function TarasScreen() {
  const { organizacao_id } = useAuth(); 
  const [nomeTara, setNomeTara] = useState('');
  const [pesoTara, setPesoTara] = useState('');
  const [tarasList, setTarasList] = useState<any[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);

  useEffect(() => {
    buscarTaras();
  }, [organizacao_id]);

  const buscarTaras = async () => {
    if (!organizacao_id) return;
    setCarregando(true);
    
    // Ordenando por descrição para manter a lista organizada
    const { data, error } = await supabase
      .from('taras_padrao')
      .select('*')
      .eq('organizacao_id', organizacao_id)
      .order('descricao', { ascending: true });

    if (error) {
      console.error("Erro ao buscar taras:", error.message);
    } else if (data) {
      setTarasList(data);
    }
    setCarregando(false);
  };

  const handleSalvarTara = async () => {
    if (!nomeTara.trim() || !pesoTara.trim()) {
      Alert.alert('Atenção', 'Preencha o nome e o peso da tara.');
      return;
    }

    // --- BLINDAGEM DE PONTO E VÍRGULA ---
    // Remove espaços e troca vírgula por ponto para o parseFloat entender
    const valorTratado = pesoTara.trim().replace(',', '.');
    const pesoNumerico = parseFloat(valorTratado);
    
    if (isNaN(pesoNumerico)) {
      Alert.alert('Erro', 'O peso digitado é inválido. Use números (ex: 1,250 ou 1.250).');
      return;
    }

    setSalvando(true);

    try {
      if (editandoId) {
        // Lógica de Edição (Update)
        const { error } = await supabase
          .from('taras_padrao')
          .update({ 
            descricao: nomeTara, 
            peso_kg: pesoNumerico 
          })
          .eq('id', editandoId);

        if (error) throw error;
        Alert.alert('Sucesso', 'Tara atualizada!');
        cancelarEdicao();
      } else {
        // Lógica de Inserção (Novo)
        const { error } = await supabase.from('taras_padrao').insert({
          organizacao_id: organizacao_id,
          descricao: nomeTara,
          peso_kg: pesoNumerico
        });

        if (error) throw error;
        setNomeTara('');
        setPesoTara('');
      }
      buscarTaras(); 
    } catch (error: any) {
      Alert.alert('Erro no Banco', error.message);
    } finally {
      setSalvando(false);
    }
  };

  const iniciarEdicao = (tara: any) => {
    setEditandoId(tara.id);
    setNomeTara(tara.descricao);
    // Na hora de editar, mostramos o valor original (usando vírgula para UX PT-BR se preferir)
    setPesoTara(tara.peso_kg.toString().replace('.', ','));
  };

  const cancelarEdicao = () => {
    setEditandoId(null);
    setNomeTara('');
    setPesoTara('');
  };

  const handleExcluirTara = async (id: string, descricao: string) => {
    Alert.alert('Excluir Tara', `Deseja remover "${descricao}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      { 
        text: 'Excluir', 
        style: 'destructive',
        onPress: async () => {
          const { error } = await supabase.from('taras_padrao').delete().eq('id', id);
          if (error) {
            Alert.alert('Erro', 'Não foi possível excluir a tara.');
          } else {
            buscarTaras();
          }
        }
      }
    ]);
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Gestão de Taras' }} />

      <View style={[styles.card, editandoId && styles.cardEditando]}>
        <Text style={styles.sectionTitle}>
          {editandoId ? 'Editando Registro' : 'Nova Tara'}
        </Text>
        
        <TextInput
          style={styles.input}
          placeholder="Descrição (Ex: Palete PBR)"
          value={nomeTara}
          onChangeText={setNomeTara}
        />
        
        <TextInput
          style={styles.input}
          placeholder="Peso em Kg (Ex: 25,000)"
          value={pesoTara}
          onChangeText={setPesoTara}
          keyboardType={Platform.OS === 'ios' ? 'decimal-pad' : 'numeric'}
        />

        <View style={styles.buttonGroup}>
          <TouchableOpacity 
            style={[styles.button, salvando && { opacity: 0.7 }, editandoId && { backgroundColor: COLORS.success }]} 
            onPress={handleSalvarTara} 
            disabled={salvando}
          >
            {salvando ? (
              <ActivityIndicator color={COLORS.white} />
            ) : (
              <Text style={styles.buttonText}>
                {editandoId ? 'SALVAR ALTERAÇÕES' : 'CADASTRAR TARA'}
              </Text>
            )}
          </TouchableOpacity>

          {editandoId && (
            <TouchableOpacity style={styles.cancelButton} onPress={cancelarEdicao}>
              <Text style={styles.cancelButtonText}>CANCELAR</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <Text style={styles.sectionTitle}>Listagem de Taras</Text>
      
      {carregando ? (
        <ActivityIndicator size="large" color={COLORS.secondary} style={{ marginTop: 20 }} />
      ) : (
        <FlatList
          data={tarasList}
          keyExtractor={(item) => item.id}
          ListEmptyComponent={<Text style={styles.emptyText}>Nenhuma tara cadastrada para esta unidade.</Text>}
          renderItem={({ item }) => (
            <View style={styles.taraItem}>
              <View style={styles.taraInfo}>
                <Text style={styles.taraName}>{item.descricao}</Text>
                <Text style={styles.taraWeight}>
                  {/* Formata para sempre exibir 3 casas decimais */}
                  {Number(item.peso_kg).toFixed(3).replace('.', ',')} kg
                </Text>
              </View>
              
              <View style={styles.actionButtons}>
                <TouchableOpacity onPress={() => iniciarEdicao(item)} style={styles.iconButton}>
                  <Ionicons name="pencil-outline" size={20} color={COLORS.secondary} />
                </TouchableOpacity>

                <TouchableOpacity onPress={() => handleExcluirTara(item.id, item.descricao)} style={styles.iconButton}>
                  <Ionicons name="trash-outline" size={20} color={COLORS.danger} />
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: COLORS.background },
  card: { backgroundColor: COLORS.white, padding: 15, borderRadius: 12, marginBottom: 20, borderWidth: 1, borderColor: COLORS.border, elevation: 2 },
  cardEditando: { borderColor: COLORS.success, borderWidth: 2 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.secondary, marginBottom: 15 },
  input: { height: 50, backgroundColor: COLORS.background, borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, paddingHorizontal: 15, marginBottom: 15, fontSize: 16 },
  buttonGroup: { flexDirection: 'row', gap: 10 },
  button: { height: 50, backgroundColor: COLORS.primary, borderRadius: 8, justifyContent: 'center', alignItems: 'center', flex: 1 },
  cancelButton: { height: 50, backgroundColor: '#EEE', borderRadius: 8, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 15 },
  cancelButtonText: { color: '#666', fontWeight: 'bold' },
  buttonText: { color: COLORS.white, fontSize: 14, fontWeight: 'bold' },
  taraItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: COLORS.white, padding: 15, borderRadius: 10, marginBottom: 10, borderWidth: 1, borderColor: COLORS.border },
  taraInfo: { flex: 1 },
  taraName: { fontSize: 16, fontWeight: 'bold', color: COLORS.text },
  taraWeight: { fontSize: 15, color: COLORS.primary, fontWeight: 'bold', marginTop: 2 },
  actionButtons: { flexDirection: 'row', gap: 8 },
  iconButton: { padding: 10, backgroundColor: '#F9FAFB', borderRadius: 8, borderWidth: 1, borderColor: '#F3F4F6' },
  emptyText: { textAlign: 'center', color: '#999', marginTop: 30, fontSize: 14, fontStyle: 'italic' }
});