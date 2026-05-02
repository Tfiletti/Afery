import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, Image, StatusBar } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { supabase } from '../../src/supabase';

// PALETA DE CORES OFICIAL SMART COUNT
const COLORS = {
  primary: '#1E3A8A', // Azul Tech
  accent: '#F59E0B',  // Laranja Industrial
  text: '#1E293B',
  subtext: '#64748B',
  inputBg: '#F8FAFC',
  border: '#E2E8F0',
  white: '#FFFFFF',
};

export default function TelaCadastro() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  // Estados do formulário
  const [codigoUnidade, setCodigoUnidade] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleCadastro = async () => {
    // Validações básicas
    if (!codigoUnidade || !email || !password) {
      return Alert.alert("Atenção", "Preencha todos os campos obrigatórios.");
    }
    if (password !== confirmPassword) {
      return Alert.alert("Erro", "As senhas não coincidem.");
    }
    if (password.length < 6) {
      return Alert.alert("Erro", "A senha deve ter pelo menos 6 caracteres.");
    }

    setLoading(true);

    try {
      // 1. Validar o Código da Unidade (YPE-01)
      const { data: org, error: orgError } = await supabase
        .from('organizacoes')
        .select('id, nome')
        .eq('codigo_acesso', codigoUnidade.trim().toUpperCase())
        .single();

      if (orgError || !org) {
        setLoading(false);
        return Alert.alert("Acesso Negado", "O código da unidade informado é inválido. Verifique com seu gestor.");
      }

      // 2. Criar conta no Auth do Supabase
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: email.trim(),
        password: password,
      });

      if (authError) throw authError;

      // 3. Criar o Perfil vinculado e com status PENDENTE
      if (authData.user) {
        const { error: profileError } = await supabase
          .from('perfis')
          .insert({
            id: authData.user.id,
            email: email.trim(),
            organizacao_id: org.id,
            role: 'CONFERENTE',
            status: 'pendente' // <--- A trava de segurança SaaS
          });

        if (profileError) throw profileError;

        Alert.alert(
          "Solicitação Enviada!",
          `Seu cadastro foi vinculado à unidade ${org.nome}. Aguarde a aprovação do administrador para acessar o sistema.`,
          [{ text: "Entendido", onPress: () => router.replace('/(auth)/login') }]
        );
      }

    } catch (error: any) {
      Alert.alert("Erro no Cadastro", error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
      style={styles.container}
    >
      <StatusBar barStyle="dark-content" />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* BOTÃO VOLTAR COM COR PRIMARY */}
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={28} color={COLORS.primary} />
        </TouchableOpacity>

        {/* LOGO E CABEÇALHO */}
        <View style={styles.header}>
          <Image 
            source={require('../../assets/images/sc_icon.png')} // Verifique o caminho da sua logo
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.title}>Criar Conta</Text>
          <Text style={styles.subtitle}>Solicite acesso à sua unidade de trabalho</Text>
        </View>

        <View style={styles.form}>
          
          {/* CAMPO CÓDIGO DA UNIDADE - COM DESTAQUE EM LARANJA */}
          <View style={styles.inputGroup}>
            <View style={styles.labelRow}>
              <MaterialCommunityIcons name="office-building" size={16} color={COLORS.accent} />
              <Text style={[styles.label, {color: COLORS.accent}]}>CÓDIGO DA UNIDADE</Text>
            </View>
            <TextInput
              style={[styles.input, styles.inputAccent]}
              placeholder="YPE-01"
              value={codigoUnidade}
              onChangeText={setCodigoUnidade}
              autoCapitalize="characters"
              placeholderTextColor="#CBD5E1"
            />
          </View>

          {/* DEMAIS CAMPOS - PADRÃO AZUL */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>E-MAIL CORPORATIVO</Text>
            <TextInput
              style={styles.input}
              placeholder="nome.sobrenome@empresa.com"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              placeholderTextColor="#94A3B8"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>SENHA</Text>
            <TextInput
              style={styles.input}
              placeholder="Mínimo 6 caracteres"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              placeholderTextColor="#94A3B8"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>CONFIRMAR SENHA</Text>
            <TextInput
              style={styles.input}
              placeholder="Repita a senha"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              placeholderTextColor="#94A3B8"
            />
          </View>

          {/* BOTÃO PRIMARY (AZUL TECH) */}
          <TouchableOpacity 
            style={[styles.btnPrimary, loading && { opacity: 0.7 }]} 
            onPress={handleCadastro}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={COLORS.white} />
            ) : (
              <View style={styles.btnContent}>
                <Ionicons name="person-add-outline" size={20} color={COLORS.white} style={{marginRight: 10}} />
                <Text style={styles.btnText}>SOLICITAR ACESSO</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.white },
  scrollContent: { padding: 25, paddingTop: 50 },
  backBtn: { marginBottom: 10, alignSelf: 'flex-start' },
  header: { alignItems: 'center', marginBottom: 35 },
  logo: { width: 150, height: 60, marginBottom: 15 },
  title: { fontSize: 28, fontWeight: 'bold', color: COLORS.primary },
  subtitle: { fontSize: 15, color: COLORS.subtext, marginTop: 5, textAlign: 'center' },
  form: { gap: 18 },
  inputGroup: { gap: 8 },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: -2 },
  label: { fontSize: 12, fontWeight: '700', color: COLORS.text, letterSpacing: 0.5 },
  input: {
    height: 55,
    backgroundColor: COLORS.inputBg,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    paddingHorizontal: 18,
    fontSize: 16,
    color: COLORS.text,
  },
  // Borda especial para o campo do código
  inputAccent: {
    borderColor: COLORS.accent,
    backgroundColor: '#FFFBEB', // Fundo levemente alaranjado
    fontWeight: 'bold',
    fontSize: 18,
    color: COLORS.accent,
  },
  btnPrimary: {
    backgroundColor: COLORS.primary,
    height: 55,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 15,
    elevation: 3, // Sombra no Android
    shadowColor: COLORS.primary, // Sombra no iOS
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
  btnContent: { flexDirection: 'row', alignItems: 'center' },
  btnText: { color: COLORS.white, fontSize: 16, fontWeight: 'bold', letterSpacing: 1 },
});