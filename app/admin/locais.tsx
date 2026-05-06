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
  StatusBar 
} from 'react-native';
import { Stack, useRouter } from 'expo-router'; // useRouter adicionado
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../src/supabase';
import { useAuth } from '../../src/context/AuthContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context'; // Para tratamento de notch

const AZUL_TECH = '#1E3A8A';

export default function GestaoLocais() {
  const { organizacao_id } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  
  const [nomeArea, setNomeArea] = useState('');
  const [areas, setAreas] = useState<any[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => { buscarAreas(); }, [organizacao_id]);

  const buscarAreas = async () => {
    if (!organizacao_id) return;
    setCarregando(true);
    const { data } = await supabase
      .from('areas')
      .select('*')
      .eq('organizacao_id', organizacao_id)
      .order('nome');
    if (data) setAreas(data);
    setCarregando(false);
  };

  const handleSalvar = async () => {
    if (!nomeArea.trim()) return Alert.alert('Erro', 'Digite o nome do local.');
    setSalvando(true);
    try {
      const { error } = await supabase.from('areas').insert({
        nome: nomeArea.trim(),
        organizacao_id
      });
      if (error) throw error;
      setNomeArea('');
      buscarAreas();
    } catch (e: any) { Alert.alert('Erro', e.message); }
    finally { setSalvando(false); }
  };

  const handleExcluir = (id: string, nome: string) => {
    Alert.alert('Excluir', `Deseja remover o local ${nome}?`, [
      { text: 'Cancelar' },
      { text: 'Sim', style: 'destructive', onPress: async () => {
          await supabase.from('areas').delete().eq('id', id);
          buscarAreas();
      }}
    ]);
  };

  return (
    <View style={styles.container}>
      {/* Anula o cabeçalho automático e configura StatusBar */}
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar barStyle="light-content" />
      
      {/* CABEÇALHO PADRÃO SMARTCOUNT */}
      <View style={[styles.headerAzul, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Mapeamento de Locais</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.inputCard}>
          <TextInput 
            style={styles.input} 
            placeholder="Ex: Galpão 01, Corredor A..." 
            value={nomeArea} 
            onChangeText={setNomeArea} 
            placeholderTextColor="#94A3B8"
          />
          <TouchableOpacity style={styles.btnSave} onPress={handleSalvar} disabled={salvando}>
            {salvando ? <ActivityIndicator color="#FFF" /> : <Ionicons name="add" size={28} color="#FFF" />}
          </TouchableOpacity>
        </View>

        {carregando ? (
          <ActivityIndicator size="large" color={AZUL_TECH} style={{marginTop: 50}} />
        ) : (
          <FlatList 
            data={areas}
            keyExtractor={item => item.id}
            renderItem={({ item }) => (
              <View style={styles.item}>
                <Text style={styles.itemText}>{item.nome}</Text>
                <TouchableOpacity onPress={() => handleExcluir(item.id, item.nome)}>
                  <Ionicons name="trash-outline" size={22} color="#EF4444" />
                </TouchableOpacity>
              </View>
            )}
            contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
            ListEmptyComponent={
              <Text style={styles.emptyText}>Nenhum local mapeado ainda.</Text>
            }
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  
  /* ESTILO DO CABEÇALHO PADRONIZADO */
  headerAzul: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingBottom: 20,
    paddingHorizontal: 20, 
    backgroundColor: AZUL_TECH,
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

  content: { flex: 1, padding: 20 },
  inputCard: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  input: { 
    flex: 1, 
    backgroundColor: '#FFF', 
    borderWidth: 1, 
    borderColor: '#E2E8F0', 
    borderRadius: 12, 
    paddingHorizontal: 15, 
    height: 50,
    fontSize: 16,
    color: '#1E293B'
  },
  btnSave: { 
    backgroundColor: AZUL_TECH, 
    width: 50, 
    height: 50, 
    borderRadius: 12, 
    justifyContent: 'center', 
    alignItems: 'center',
    elevation: 2 
  },
  item: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center',
    backgroundColor: '#FFF', 
    padding: 18, 
    borderRadius: 12, 
    marginBottom: 10, 
    borderWidth: 1, 
    borderColor: '#F1F5F9',
    elevation: 1 
  },
  itemText: { fontSize: 16, fontWeight: '700', color: '#1E293B' },
  emptyText: { textAlign: 'center', marginTop: 40, color: '#94A3B8', fontSize: 15 }
});