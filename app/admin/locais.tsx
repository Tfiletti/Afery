import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, FlatList, Alert, ActivityIndicator } from 'react-native';
import { Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../src/supabase';
import { useAuth } from '../../src/context/AuthContext';

const AZUL_TECH = '#1E3A8A';

export default function GestaoLocais() {
  const { organizacao_id } = useAuth();
  const [nomeArea, setNomeArea] = useState('');
  const [areas, setAreas] = useState<any[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => { buscarAreas(); }, [organizacao_id]);

  const buscarAreas = async () => {
    if (!organizacao_id) return;
    setCarregando(true);
    const { data } = await supabase.from('areas').select('*').eq('organizacao_id', organizacao_id).order('nome');
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
      <Stack.Screen options={{ title: 'Mapeamento de Locais' }} />
      
      <View style={styles.inputCard}>
        <TextInput 
          style={styles.input} 
          placeholder="Ex: Galpão 01, Corredor A..." 
          value={nomeArea} 
          onChangeText={setNomeArea} 
        />
        <TouchableOpacity style={styles.btnSave} onPress={handleSalvar} disabled={salvando}>
          {salvando ? <ActivityIndicator color="#FFF" /> : <Ionicons name="add" size={28} color="#FFF" />}
        </TouchableOpacity>
      </View>

      {carregando ? <ActivityIndicator size="large" color={AZUL_TECH} style={{marginTop: 50}} /> : (
        <FlatList 
          data={areas}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <View style={styles.item}>
              <Text style={styles.itemText}>{item.nome}</Text>
              <TouchableOpacity onPress={() => handleExcluir(item.id, item.nome)}>
                <Ionicons name="trash-outline" size={20} color="#EF4444" />
              </TouchableOpacity>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAFA', padding: 20 },
  inputCard: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  input: { flex: 1, backgroundColor: '#FFF', borderWidth: 1, borderColor: '#DDD', borderRadius: 10, paddingHorizontal: 15, height: 50 },
  btnSave: { backgroundColor: AZUL_TECH, width: 50, height: 50, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  item: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#FFF', padding: 15, borderRadius: 10, marginBottom: 10, borderWidth: 1, borderColor: '#EEE' },
  itemText: { fontSize: 16, fontWeight: '500', color: '#1E293B' }
});