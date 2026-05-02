import { StyleSheet, Text, View, TouchableOpacity, StatusBar } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
// 1. Importação essencial para a área segura
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const HeaderSetup = ({ title, topInset }) => {
  const router = useRouter();
  return (
    <View style={[styles.header, { paddingTop: topInset + 15 }]}>
      <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
        <Ionicons name="arrow-back" size={24} color="#1F2937" />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>{title}</Text>
      <View style={{ width: 40 }} />
    </View>
  );
};

export default function SetupContagem() {
  const { id, nome } = useLocalSearchParams();
  const router = useRouter();
  const insets = useSafeAreaInsets(); // 2. Hook de GPS do sistema

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <HeaderSetup title="Setup de Inventário" topInset={insets.top} />

      <View style={styles.content}>
        <View style={styles.infoBadge}>
            <Ionicons name="pricetag-outline" size={14} color="#F59E0B" />
            <Text style={styles.sectionTitle}> Família: {nome}</Text>
        </View>
        
        <Text style={styles.subtitle}>Escolha o método de contagem:</Text>

        {/* MÉTODO: POR MAPA */}
        <TouchableOpacity 
            style={[styles.cardMetodo, { borderLeftColor: '#F59E0B' }]} 
            onPress={() => router.push({ pathname: '/area', params: { id, nome } })}
            activeOpacity={0.7}
        >
          <View style={styles.iconContainer}>
            <Ionicons name="map" size={32} color="#F59E0B" />
          </View>
          <View style={styles.cardText}>
            <Text style={styles.cardTitle}>Por Mapa</Text>
            <Text style={styles.cardDesc}>Selecionar sala, setor ou linha física.</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#CBD5E1" />
        </TouchableOpacity>

        {/* MÉTODO: SEM MAPA */}
        <TouchableOpacity 
            style={[styles.cardMetodo, { borderLeftColor: '#005b9f' }]} 
            onPress={() => router.push({ pathname: '/itens', params: { id, nome, usaMapa: 'nao' } })}
            activeOpacity={0.7}
        >
          <View style={[styles.iconContainer, { backgroundColor: '#F0F9FF' }]}>
            <Ionicons name="location" size={32} color="#005b9f" />
          </View>
          <View style={styles.cardText}>
            <Text style={styles.cardTitle}>Sem Mapa</Text>
            <Text style={styles.cardDesc}>Digitar local manualmente por material.</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#CBD5E1" />
        </TouchableOpacity>
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
  
  content: { flex: 1, padding: 25 },
  infoBadge: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#FFFBEB', 
    paddingHorizontal: 12, 
    paddingVertical: 6, 
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginBottom: 10
  },
  sectionTitle: { fontSize: 14, fontWeight: 'bold', color: '#B45309' },
  subtitle: { fontSize: 16, color: '#64748B', marginBottom: 30, fontWeight: '500' },
  
  cardMetodo: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#FFFFFF', 
    padding: 20, 
    borderRadius: 16, 
    marginBottom: 20, 
    elevation: 4, 
    borderLeftWidth: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
  },
  iconContainer: {
    backgroundColor: '#FFFBEB',
    padding: 12,
    borderRadius: 12,
  },
  cardText: { marginLeft: 15, flex: 1 },
  cardTitle: { fontSize: 20, fontWeight: 'bold', color: '#1E293B' },
  cardDesc: { fontSize: 13, color: '#64748B', marginTop: 4, lineHeight: 18 },
});