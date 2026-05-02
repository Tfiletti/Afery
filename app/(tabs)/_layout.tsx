import React from 'react';
import { Platform } from 'react-native';
import { Tabs } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
// 1. IMPORTAÇÃO DA FERRAMENTA DE ÁREA SEGURA
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function TabLayout() {
  // 2. LENDO O TAMANHO DOS BOTÕES DO SISTEMA
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#005b9f',
        tabBarInactiveTintColor: '#94A3B8',
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '700',
          marginBottom: 5, // Ajuste fino para o texto não colar na borda
        },
        tabBarStyle: {
          // --- CONFIGURAÇÃO DA MARCA SMART COUNT (FLUTUANTE) ---
          position: 'absolute', 
          // 3. A MÁGICA AQUI: Somamos o insets.bottom para empurrar a barra acima dos botões nativos
          bottom: Platform.OS === 'android' ? 20 + insets.bottom : 30 + insets.bottom, 
          left: 20,
          right: 20,
          backgroundColor: '#FFFFFF',
          borderRadius: 25, 
          height: 70, 
          elevation: 8, // Sombra para o Android
          shadowColor: '#000', // Sombra para iOS
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.1,
          shadowRadius: 10,
          borderTopWidth: 0, // Mata a linha cinza padrão
          paddingTop: 10,
          paddingBottom: Platform.OS === 'android' ? 10 : 25,
          // ----------------------------------------------------
        },
      }}
    >
      {/* 1. HOME */}
      <Tabs.Screen
        name="index"
        options={{
          title: 'Início',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "home" : "home-outline"} size={24} color={color} />
          ),
        }}
      />

      {/* 2. REGISTROS */}
      <Tabs.Screen
        name="registros"
        options={{
          title: 'Registros',
          tabBarIcon: ({ color, focused }) => (
            <MaterialCommunityIcons 
              name={focused ? "clipboard-text-play" : "clipboard-text-play-outline"} 
              size={24} 
              color={color} 
            />
          ),
        }}
      />

      {/* 3. RELATÓRIO */}
      <Tabs.Screen
        name="relatorio"
        options={{
          title: 'Relatório',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "analytics" : "analytics-outline"} size={24} color={color} />
          ),
        }}
      />

      {/* --- TELAS ONDE A BARRA DEVE SUMIR --- */}
      <Tabs.Screen 
        name="contar" 
        options={{ 
          href: null,
          tabBarStyle: { display: 'none' } 
        }} 
      />

      <Tabs.Screen 
        name="editar" 
        options={{ 
          href: null,
          tabBarStyle: { display: 'none' } 
        }} 
      />

      {/* OUTRAS TELAS APENAS ESCONDIDAS DO MENU */}
      <Tabs.Screen name="area" options={{ href: null }} />
      <Tabs.Screen name="itens" options={{ href: null }} />
      <Tabs.Screen name="modal" options={{ href: null }} />
      <Tabs.Screen name="setup" options={{ href: null }} />
      <Tabs.Screen name="explore" options={{ href: null }} />

    </Tabs>
  );
}