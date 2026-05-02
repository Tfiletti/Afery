// app/admin/index.tsx
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function AdminHub() {
  const router = useRouter();

  // Estrutura de botões do painel Admin - Organizada por cores de prioridade
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
      <Stack.Screen options={{ title: 'Painel de Configurações', headerShadowVisible: false }} />
      
      <View style={styles.header}>
        <Text style={styles.title}>Painel Admin</Text>
        <Text style={styles.subtitle}>Gerencie a engenharia do seu sistema SaaS</Text>
      </View>

      <View style={styles.grid}>
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
      </View>

      <View style={styles.footerContainer}>
        <Text style={styles.footerText}>Smart Count Pro v2.0</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { 
    paddingVertical: 25, 
    paddingHorizontal: 25, 
    backgroundColor: '#FFFFFF', 
    borderBottomWidth: 1, 
    borderColor: '#F1F5F9' 
  },
  title: { fontSize: 26, fontWeight: 'bold', color: '#0F172A' },
  subtitle: { fontSize: 14, color: '#64748B', marginTop: 4 },
  grid: { padding: 16 },
  card: {
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#FFFFFF',
    padding: 16, 
    borderRadius: 16,
    marginBottom: 14, 
    borderWidth: 1,
    borderColor: '#F1F5F9',
    // Sombra suave para profundidade
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
    marginTop: 'auto',
    paddingBottom: 20,
    alignItems: 'center'
  },
  footerText: {
    fontSize: 12,
    color: '#94A3B8',
    letterSpacing: 1
  }
});