import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ScrollView, Image, Platform } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../src/context/AuthContext';

const AZUL_TECH = '#1E3A8A';

export default function AdminHub() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { userName, organizacao_nome, organizacao_slug } = useAuth();

  const menuOptions = [
    { id: 'importacao', title: 'Gestão Massiva (Excel)', description: 'Baixe a base atual e suba atualizações de itens e saldos.', icon: 'document-text-outline', route: '/admin/importacao', color: '#F59E0B' },
    { id: 'equipe', title: 'Controle de Equipe', description: 'Aprove solicitações e gerencie acessos de conferentes.', icon: 'people-circle-outline', route: '/admin/equipe', color: '#6366F1' },
    { id: 'locais', title: 'Mapeamento de Locais', description: 'Configure galpões, corredores e posições de estoque.', icon: 'map-outline', route: '/admin/locais', color: '#1E3A8A' },
    { id: 'familias', title: 'Hub de Famílias', description: 'Organize e classifique as categorias de materiais.', icon: 'pricetags-outline', route: '/admin/familias', color: '#8B5CF6' },
    { id: 'itens', title: 'Gestão de Itens', description: 'Adicione SKUs, vincule fórmulas e organize o catálogo.', icon: 'cube-outline', route: '/admin/itens', color: '#10B981' }
  ];

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      
      {/* =============== CABEÇALHO COM ACESSO AO PERFIL =============== */}
      <View style={[styles.cleanHeader, { paddingTop: insets.top + 20 }]}>
        <View style={styles.headerTopRow}>
          <View style={styles.logoAndText}>
            <Image source={require('../../assets/images/icon.png')} style={styles.logoIcon} />
            <View style={styles.brandTitleContainer}>
              <Text style={styles.brandTitle}>AFERY</Text>
              <Text style={styles.brandSubtitle}>PAINEL ADMINISTRATIVO</Text>
            </View>
          </View>
          
          {/* BOTÃO PARA ACESSAR O PERFIL */}
          <TouchableOpacity 
            onPress={() => router.push('/perfil')} 
            style={styles.profileHeaderBtn}
          >
            <Ionicons name="person-circle" size={38} color={AZUL_TECH} />
          </TouchableOpacity>
        </View>
        
        {/* BARRA DE STATUS: Organização e Admin */}
        <View style={styles.adminInfoBar}>
          <View style={styles.infoRow}>
            <Ionicons name="business" size={14} color={AZUL_TECH} />
            <Text style={styles.orgNameText}>{organizacao_nome}</Text>
          </View>
          <View style={[styles.infoRow, { marginTop: 4 }]}>
            <Ionicons name="person-circle" size={14} color="#64748B" />
            <Text style={styles.adminNameText}>
              {userName} <Text style={styles.slugText}>• {organizacao_slug}</Text>
            </Text>
          </View>
        </View>
      </View>

      <ScrollView style={styles.grid} showsVerticalScrollIndicator={false}>
        {menuOptions.map((option) => (
          <TouchableOpacity 
            key={option.id} 
            style={styles.card}
            onPress={() => router.push(option.route)}
            activeOpacity={0.7}
          >
            <View style={[styles.iconContainer, { backgroundColor: option.color + '15' }]}>
              <Ionicons name={option.icon as any} size={26} color={option.color} />
            </View>
            <View style={styles.textContainer}>
              <Text style={styles.cardTitle}>{option.title}</Text>
              <Text style={styles.cardDesc} numberOfLines={2}>{option.description}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#CBD5E1" />
          </TouchableOpacity>
        ))}

        <View style={styles.footerContainer}>
          <Text style={styles.footerText}>AFERY Pro v1.0</Text>
        </View>
      </ScrollView>

      <TouchableOpacity 
        style={[styles.fab, { bottom: insets.bottom + 40 }]} 
        onPress={() => router.replace('/')}
        activeOpacity={0.8}
      >
        <Ionicons name="home" size={24} color="#FFFFFF" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  cleanHeader: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderColor: '#E2E8F0',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  logoAndText: { flexDirection: 'row', alignItems: 'center' },
  logoIcon: { width: 42, height: 42, borderRadius: 10 },
  brandTitleContainer: { marginLeft: 12 },
  brandTitle: { fontSize: 22, fontWeight: '900', color: AZUL_TECH, letterSpacing: -0.5, lineHeight: 26 },
  brandSubtitle: { fontSize: 10, color: '#94A3B8', fontWeight: '800', textTransform: 'uppercase', marginTop: -2 },
  
  profileHeaderBtn: {
    padding: 2,
  },

  adminInfoBar: {
    marginTop: 15,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  orgNameText: { fontSize: 13, color: '#1E293B', fontWeight: '800', textTransform: 'uppercase' },
  adminNameText: { fontSize: 12, color: '#64748B', fontWeight: '600' },
  slugText: { color: '#94A3B8', fontWeight: '400' },

  grid: { padding: 16, flex: 1 },
  card: {
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#FFFFFF',
    padding: 16, 
    borderRadius: 16,
    marginBottom: 14, 
    borderWidth: 1,
    borderColor: '#F1F5F9',
    elevation: 2,
  },
  iconContainer: { width: 52, height: 52, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  textContainer: { flex: 1 },
  cardTitle: { fontSize: 17, fontWeight: 'bold', color: '#1E293B' },
  cardDesc: { fontSize: 13, color: '#64748B', marginTop: 3, lineHeight: 18 },
  footerContainer: { marginTop: 20, paddingBottom: 80, alignItems: 'center' },
  footerText: { fontSize: 12, color: '#94A3B8', letterSpacing: 1, fontWeight: 'bold' },
  fab: {
    position: 'absolute',
    left: 20,           
    width: 50,           
    height: 50,         
    borderRadius: 25,   
    backgroundColor: AZUL_TECH,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
  }
});