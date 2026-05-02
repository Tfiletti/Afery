import { useEffect, useState } from 'react';
import { StyleSheet, Text, View, FlatList, ActivityIndicator, TouchableOpacity, StatusBar } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../src/supabase';
// 1. Importação para controle de área segura
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const HeaderMapa = ({ topInset }: { topInset: number }) => {
  const router = useRouter();
  return (
    <View style={[styles.header, { paddingTop: topInset + 15 }]}>
      <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
        <Ionicons name="arrow-back" size={24} color="#1F2937" />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>Mapa Físico</Text>
      <View style={{ width: 40 }} /> 
    </View>
  );
};

export default function SelecaoDeArea() {
  const { id, nome } = useLocalSearchParams();
  const router = useRouter();
  const insets = useSafeAreaInsets(); // 2. Hook de GPS do sistema
  const [areas, setAreas] = useState([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    async function buscarAreas() {
      const { data } = await supabase.from('areas').select('*').order('nome');
      if (data) setAreas(data);
      setCarregando(false);
    }
    buscarAreas();
  }, []);

  const aoClicarNaArea = (area) => {
    router.push({ 
      pathname: '/itens', 
      params: { id, nome, areaId: area.id, areaNome: area.nome, usaMapa: 'sim' } 
    });
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <HeaderMapa topInset={insets.top} />
      
      <View style={styles.content}>
        <View style={styles.subHeader}>
            <Ionicons name="layers-outline" size={16} color="#6B7280" />
            <Text style={styles.subtitle}> Família: {nome}</Text>
        </View>

        {carregando ? (
          <ActivityIndicator size="large" color="#005b9f" style={{ marginTop: 50 }} />
        ) : (
          <FlatList
            data={areas}
            keyExtractor={(item) => item.id.toString()}
            // 3. O respiro mestre para não bater nos botões do Android
            contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
            renderItem={({ item }) => (
              <TouchableOpacity 
                style={styles.cardArea} 
                onPress={() => aoClicarNaArea(item)} 
                activeOpacity={0.7}
              >
                <View style={styles.iconContainer}>
                    <Ionicons name="location" size={22} color="#F59E0B" />
                </View>
                
                <Text style={styles.nomeArea}>{item.nome}</Text>
                
                {item.status_contagem === 'finalizado' ? (
                   <Ionicons name="checkmark-circle" size={24} color="#10B981" />
                ) : (
                   <Ionicons name="chevron-forward" size={20} color="#CBD5E1" />
                )}
              </TouchableOpacity>
            )}
            ListEmptyComponent={<Text style={styles.emptyText}>Nenhuma área cadastrada.</Text>}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { 
    backgroundColor: '#FFFFFF', 
    paddingBottom: 15, 
    paddingHorizontal: 15, 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  backBtn: { padding: 5 },
  headerTitle: { fontSize: 18, color: '#1F2937', fontWeight: 'bold' },
  
  content: { flex: 1, paddingHorizontal: 20 },
  subHeader: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginVertical: 20,
    backgroundColor: '#E2E8F0',
    paddingSymmetric: 10,
    padding: 8,
    borderRadius: 8,
    alignSelf: 'flex-start'
  },
  subtitle: { fontSize: 13, color: '#475569', fontWeight: 'bold' },
  
  cardArea: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#FFFFFF', 
    padding: 18, 
    borderRadius: 16, 
    marginBottom: 12, 
    elevation: 3, 
    borderLeftWidth: 6, 
    borderLeftColor: '#F59E0B',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
  },
  iconContainer: {
    backgroundColor: '#FFFBEB',
    padding: 8,
    borderRadius: 10,
  },
  nomeArea: { 
    flex: 1, 
    fontSize: 18, 
    fontWeight: 'bold', 
    color: '#1E293B', 
    marginLeft: 12 
  },
  emptyText: { textAlign: 'center', marginTop: 50, color: '#94A3B8' }
});