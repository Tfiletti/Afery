import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ScrollView, Alert, Image } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard'; 
import { useAuth } from '../src/context/AuthContext';

const AZUL_TECH = '#1E3A8A';

export default function PerfilScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  // Puxando o organizacao_codigo que vem da coluna codigo_acesso do banco
  const { userName, organizacao_nome, organizacao_codigo, role, user, signOut } = useAuth();

  const handleCopy = async () => {
    if (organizacao_codigo) {
      await Clipboard.setStringAsync(organizacao_codigo);
      Alert.alert("Código copiado!");
    }
  };

  const handleLogout = () => {
    Alert.alert("Sair", "Deseja encerrar sua sessão?", [
      { text: "Cancelar", style: "cancel" },
      { text: "Sair", style: "destructive", onPress: async () => { await signOut(); router.replace('/login'); } }
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={AZUL_TECH} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Meu Perfil</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* CARD DE IDENTIDADE */}
        <View style={styles.profileCard}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>{userName?.substring(0, 2).toUpperCase() || 'U'}</Text>
          </View>
          <Text style={styles.userName}>{userName}</Text>
          <View style={styles.roleBadge}>
            <Text style={styles.roleText}>{role === 'ADMIN' ? 'ADMINISTRADOR' : 'CONFERENTE'}</Text>
          </View>
          <Text style={styles.userEmail}>{user?.email}</Text>
        </View>

        {/* SEÇÃO DA UNIDADE */}
        <Text style={styles.sectionTitle}>Sua Unidade</Text>
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <View style={styles.iconBox}><Ionicons name="business" size={20} color={AZUL_TECH} /></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.infoLabel}>Organização / Empresa</Text>
              <Text style={styles.infoValue}>{organizacao_nome}</Text>
            </View>
          </View>

          <View style={[styles.infoRow, { borderTopWidth: 1, borderColor: '#F1F5F9', marginTop: 15, paddingTop: 15 }]}>
            <View style={[styles.iconBox, { backgroundColor: '#F0FDF4' }]}><Ionicons name="key" size={20} color="#10B981" /></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.infoLabel}>Código de Registro (Para Novos Conferentes)</Text>
              <View style={styles.rowCopy}>
                {/* AQUI APARECERÁ O 9WQNRU */}
                <Text style={[styles.infoValue, { color: '#10B981', fontWeight: '900', fontSize: 20 }]}>
                  {organizacao_codigo || '---'}
                </Text>
                
                {/* BOTÃO COPIAR CIRÚRGICO */}
                <TouchableOpacity onPress={handleCopy} style={styles.btnCopy}>
                  <Ionicons name="copy-outline" size={16} color={AZUL_TECH} />
                  <Text style={styles.txtCopy}>COPIAR</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.helperText}>Passe este código para quem for se cadastrar nesta unidade.</Text>
            </View>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Sistema</Text>
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
             <MaterialCommunityIcons name="cellphone-cog" size={20} color="#64748B" />
             <Text style={[styles.infoValue, { marginLeft: 10, fontSize: 14 }]}>Versão do App: 1.0.4 Pro</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={22} color="#EF4444" />
          <Text style={styles.logoutText}>Encerrar Sessão</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 15, backgroundColor: '#FFF', borderBottomWidth: 1, borderColor: '#E2E8F0' },
  backBtn: { padding: 5 },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#1E293B', marginLeft: 10 },
  scrollContent: { padding: 20 },
  profileCard: { backgroundColor: '#FFF', borderRadius: 20, padding: 25, alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0', elevation: 3, marginBottom: 25 },
  avatarCircle: { width: 70, height: 70, borderRadius: 35, backgroundColor: AZUL_TECH, justifyContent: 'center', alignItems: 'center', marginBottom: 15 },
  avatarText: { color: '#FFF', fontSize: 24, fontWeight: 'bold' },
  userName: { fontSize: 20, fontWeight: 'bold', color: '#1E293B' },
  userEmail: { fontSize: 14, color: '#64748B', marginTop: 5 },
  roleBadge: { backgroundColor: '#E0F2FE', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20, marginTop: 10 },
  roleText: { color: AZUL_TECH, fontSize: 11, fontWeight: '900' },
  sectionTitle: { fontSize: 12, fontWeight: 'bold', color: '#94A3B8', textTransform: 'uppercase', marginBottom: 10, marginLeft: 5 },
  infoCard: { backgroundColor: '#FFF', borderRadius: 15, padding: 15, borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 20 },
  infoRow: { flexDirection: 'row', alignItems: 'center' },
  iconBox: { width: 40, height: 40, borderRadius: 10, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  infoLabel: { fontSize: 11, color: '#94A3B8', fontWeight: 'bold' },
  infoValue: { fontSize: 15, color: '#1E293B', fontWeight: '600' },
  helperText: { fontSize: 10, color: '#94A3B8', marginTop: 5 },
  rowCopy: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 },
  btnCopy: { flexDirection: 'row', alignItems: 'center', backgroundColor: AZUL_TECH + '15', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, gap: 6 },
  txtCopy: { fontSize: 10, fontWeight: '900', color: AZUL_TECH },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFF', borderRadius: 15, padding: 15, borderWidth: 1, borderColor: '#FEE2E2', marginTop: 10, gap: 10 },
  logoutText: { color: '#EF4444', fontWeight: 'bold', fontSize: 16 },
});