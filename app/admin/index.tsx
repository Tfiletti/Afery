// app/admin/index.tsx
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ScrollView, Image } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function AdminHub() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  // Estrutura de botões do painel Admin - A original que estava perfeita!
  const menuOptions = [
    {
      id: 'equipe',
      title: 'Controle de Equipe',
      description: 'Aprove solicitações e gerencie acessos de conferentes.',
      icon: 'people-circle-outline',
      route: '/admin/equipe',
      color: '#6366F1' // Indigo (Gestão de Pessoas)
    },
    {
      id: 'taras',
      title: 'Gestão de Taras',
      description: 'Cadastre paletes, embalagens e fórmulas de peso.',
      icon: 'scale-outline',
      route: '/admin/taras',
      color: '#E6A23C' // Laranja Industrial (Operação)
    },
    {
      id: 'locais',
      title: 'Mapeamento de Locais',
      description: 'Configure galpões, corredores e posições de estoque.',
      icon: 'map-outline',
      route: '/admin/locais',
      color: '#1E3A8A' // Azul Tech (Infraestrutura)
    },
    {
      id: 'familias',
      title: 'Hub de Famílias',
      description: 'Organize e classifique as categorias de materiais.',
      icon: 'pricetags-outline',
      route: '/admin/familias',
      color: '#8B5CF6' // Roxo (Classificação/Categorias)
    },
    {
      id: 'itens',
      title: 'Gestão de Itens',
      description: 'Adicione SKUs, vincule fórmulas e organize o catálogo.',
      icon: 'cube-outline',
      route: '/admin/itens',
      color: '#10B981' // Verde (Produto/Estoque)
    }
  ];

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      
      {/* =============== O NOVO CABEÇALHO BRANCO (CLEAN) =============== */}
      <View style={[styles.cleanHeader, { paddingTop: insets.top + 10 }]}>
        <View style={styles.logoAndText}>
          <Image 
            source={require('../../assets/images/sc_icon.png')} 
            style={{ width: 45, height: 45 }} 
            resizeMode="contain"
          />
          <View style={styles.brandTitleContainer}>
            <Text style={styles.brandTitle}>Smart<Text style={{ color: '#E6A23C' }}>Count</Text></Text>
            <Text style={styles.brandSubtitle}>Painel do Administrador</Text>
          </View>
        </View>
      </View>

      {/* =============== O CORPO ORIGINAL QUE VOCÊ GOSTOU =============== */}
      <ScrollView style={styles.grid} showsVerticalScrollIndicator={false}>
        {menuOptions.map((option) => (
          <TouchableOpacity 
            key={option.id} 
            style={styles.card}
            onPress={() => router.push(option.route)}
            activeOpacity={0.7}
          >
            {/* Ícone com fundo suave da mesma cor */}
            <View style={[styles.iconContainer, { backgroundColor: option.color + '15' }]}>
              <Ionicons name={option.icon as any} size={26} color={option.color} />
            </View>
            
            {/* Conteúdo textual centralizado na linha */}
            <View style={styles.textContainer}>
              <Text style={styles.cardTitle}>{option.title}</Text>
              <Text style={styles.cardDesc} numberOfLines={2}>{option.description}</Text>
            </View>

            {/* Indicador de navegação discreto */}
            <Ionicons name="chevron-forward" size={18} color="#CBD5E1" />
          </TouchableOpacity>
        ))}

        <View style={styles.footerContainer}>
          <Text style={styles.footerText}>Smart Count Pro v2.0</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  
  /* --- Estilos do Novo Cabeçalho Clean --- */
  cleanHeader: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderColor: '#E2E8F0',
    elevation: 3,
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
    fontSize: 24,
    fontWeight: '900',
    color: '#1E3A8A', // Azul escuro
    letterSpacing: 0.5,
  },
  brandSubtitle: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: 'bold',
    marginTop: 0,
  },

  /* --- Estilos Originais do Grid e Cards --- */
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  iconContainer: {
    width: 52,
    height: 52,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16, 
  },
  textContainer: {
    flex: 1, 
  },
  cardTitle: { fontSize: 17, fontWeight: 'bold', color: '#1E293B' },
  cardDesc: { fontSize: 13, color: '#64748B', marginTop: 3, lineHeight: 18 },
  footerContainer: {
    marginTop: 20,
    paddingBottom: 40,
    alignItems: 'center'
  },
  footerText: {
    fontSize: 12,
    color: '#94A3B8',
    letterSpacing: 1,
    fontWeight: 'bold'
  }
});