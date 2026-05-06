import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  Alert, 
  ActivityIndicator, 
  ScrollView, 
  Image,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView 
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { supabase } from '../../src/supabase';

// PALETA DE CORES AFERY
const COLORS = {
  primary: '#1E3A8A', // Azul Tech
  accent: '#E6A23C',  // Laranja Industrial
  white: '#FFFFFF',
  bg: '#FAFAFA',
  inputBg: '#F8FAFC',
  border: '#E2E8F0',
  text: '#1E293B',
  subtext: '#64748B',
  error: '#EF4444'
};

export default function NovaEmpresa() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  // ESTADOS DO FORMULÁRIO
  const [nomeEmpresa, setNomeEmpresa] = useState('');
  const [nomeAdmin, setNomeAdmin] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // FUNÇÃO PARA GERAR O SLUG DA ORGANIZAÇÃO
  const gerarSlug = (text: string) => {
    return text
      .toLowerCase()
      .trim()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, "") // Remove acentos
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  };

  const handleCriarUnidade = async () => {
    // 1. VALIDAÇÕES DE SEGURANÇA
    if (!nomeEmpresa || !nomeAdmin || !email || !password || !confirmPassword) {
      return Alert.alert("Campos Vazios", "Por favor, preencha todos os dados da unidade e do administrador.");
    }
    if (password !== confirmPassword) {
      return Alert.alert("Senhas Diferentes", "A confirmação de senha não coincide com a senha mestra.");
    }
    if (password.length < 6) {
      return Alert.alert("Senha Curta", "Para sua segurança, a senha deve ter pelo menos 6 caracteres.");
    }

    setLoading(true);

    try {
      // 2. GERA CÓDIGO DE ACESSO ÚNICO VIA RPC
      const { data: novoCodigo, error: codeError } = await supabase.rpc('gerar_codigo_seguro');
      if (codeError) throw codeError;

      const slug = gerarSlug(nomeEmpresa);

      // 3. CRIAÇÃO DA ORGANIZAÇÃO (UNIDADE)
      const { data: org, error: orgErr } = await supabase
        .from('organizacoes')
        .insert({ 
          nome: nomeEmpresa, 
          codigo_acesso: novoCodigo,
          slug: slug 
        })
        .select()
        .single();
        
      if (orgErr) {
        if (orgErr.message.includes('slug')) {
          throw new Error("Uma unidade com este nome já existe. Tente um nome levemente diferente.");
        }
        throw orgErr;
      }

      // 4. CADASTRO DE AUTENTICAÇÃO
      const { data: authData, error: authErr } = await supabase.auth.signUp({
        email: email.trim(),
        password: password,
      });

      if (authErr) throw authErr;

      // 5. VÍNCULO DO PERFIL ADMINISTRADOR
      if (authData.user) {
        const { error: profileError } = await supabase.from('perfis').insert({
          id: authData.user.id,
          organizacao_id: org.id,
          nome: nomeAdmin, // Nome capturado para identificação
          role: 'ADMIN',
          status: 'ativo' // Administradores são liberados automaticamente
        });
        
        if (profileError) throw profileError;

        Alert.alert(
          "Unidade Registrada!", 
          `Bem-vindo, ${nomeAdmin}!\nA unidade ${nomeEmpresa} foi configurada com o código: ${novoCodigo}`,
          [{ text: "INICIAR OPERAÇÃO", onPress: () => router.replace('/(tabs)') }]
        );
      }

    } catch (e: any) {
      Alert.alert("Falha no Registro", e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.white }}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={COLORS.primary} />
            <Text style={styles.backText}>Voltar</Text>
          </TouchableOpacity>

          <View style={styles.header}>
            <View style={styles.iconBox}>
                <MaterialCommunityIcons name="office-building-plus" size={42} color={COLORS.primary} />
            </View>
            <Text style={styles.title}>Nova Unidade</Text>
            <Text style={styles.subtitle}>Crie uma instância isolada para sua fábrica ou setor</Text>
          </View>

          <View style={styles.form}>
            {/* NOME DA EMPRESA */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>NOME DA ORGANIZAÇÃO</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="business-outline" size={20} color={COLORS.subtext} style={styles.inputIcon} />
                <TextInput 
                  style={styles.input} 
                  placeholder="Ex: Logística Ypê - Amparo" 
                  value={nomeEmpresa} 
                  onChangeText={setNomeEmpresa} 
                  placeholderTextColor="#94A3B8"
                />
              </View>
            </View>

            {/* NOME DO ADMIN */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>NOME COMPLETO DO GESTOR</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="person-outline" size={20} color={COLORS.subtext} style={styles.inputIcon} />
                <TextInput 
                  style={styles.input} 
                  placeholder="Seu nome para identificação" 
                  value={nomeAdmin} 
                  onChangeText={setNomeAdmin} 
                  autoCapitalize="words"
                  placeholderTextColor="#94A3B8"
                />
              </View>
            </View>

            {/* EMAIL */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>E-MAIL DE ACESSO MESTRE</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="mail-outline" size={20} color={COLORS.subtext} style={styles.inputIcon} />
                <TextInput 
                  style={styles.input} 
                  placeholder="admin@unidade.com" 
                  value={email} 
                  onChangeText={setEmail} 
                  autoCapitalize="none"
                  keyboardType="email-address"
                  placeholderTextColor="#94A3B8"
                />
              </View>
            </View>

            {/* SENHA */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>SENHA MESTRA</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="lock-closed-outline" size={20} color={COLORS.subtext} style={styles.inputIcon} />
                <TextInput 
                  style={styles.input} 
                  placeholder="Mínimo 6 caracteres" 
                  value={password} 
                  onChangeText={setPassword} 
                  secureTextEntry={!showPassword}
                  placeholderTextColor="#94A3B8"
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                    <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={20} color={COLORS.subtext} />
                </TouchableOpacity>
              </View>
            </View>

            {/* CONFIRMAR SENHA */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>CONFIRMAR SENHA</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="shield-checkmark-outline" size={20} color={COLORS.subtext} style={styles.inputIcon} />
                <TextInput 
                  style={styles.input} 
                  placeholder="Repita a senha mestre" 
                  value={confirmPassword} 
                  onChangeText={setConfirmPassword} 
                  secureTextEntry={!showPassword}
                  placeholderTextColor="#94A3B8"
                />
              </View>
            </View>

            <TouchableOpacity 
              style={[styles.btn, loading && { opacity: 0.7 }]} 
              onPress={handleCriarUnidade} 
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={COLORS.white} />
              ) : (
                <View style={styles.btnContent}>
                  <Text style={styles.btnText}>REGISTRAR E CONFIGURAR</Text>
                  <Ionicons name="arrow-forward" size={20} color={COLORS.white} />
                </View>
              )}
            </TouchableOpacity>
          </View>

          <Text style={styles.disclaimer}>
            Como administrador, você será responsável por validar o status de cada conferente que solicitar acesso à sua unidade.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 25, paddingBottom: 50 },
  backBtn: { flexDirection: 'row', alignItems: 'center', marginBottom: 25 },
  backText: { marginLeft: 6, color: COLORS.primary, fontWeight: '700', fontSize: 16 },
  header: { alignItems: 'center', marginBottom: 35 },
  iconBox: { width: 80, height: 80, borderRadius: 20, backgroundColor: '#EFF6FF', justifyContent: 'center', alignItems: 'center', marginBottom: 15 },
  title: { fontSize: 26, fontWeight: '900', color: COLORS.primary },
  subtitle: { fontSize: 14, color: COLORS.subtext, textAlign: 'center', marginTop: 8, paddingHorizontal: 20 },
  form: { gap: 20 },
  inputGroup: { gap: 6 },
  label: { fontSize: 11, fontWeight: '900', color: COLORS.primary, marginLeft: 4, letterSpacing: 0.5 },
  inputWrapper: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: COLORS.inputBg, 
    borderRadius: 12, 
    paddingHorizontal: 16, 
    borderWidth: 1.5, 
    borderColor: COLORS.border,
    height: 58
  },
  inputIcon: { marginRight: 12 },
  input: { flex: 1, color: COLORS.text, fontSize: 16, fontWeight: '500' },
  btn: { 
    backgroundColor: COLORS.primary, 
    height: 60, 
    borderRadius: 15, 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginTop: 15,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 6
  },
  btnContent: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  btnText: { color: COLORS.white, fontWeight: '800', fontSize: 16, letterSpacing: 1 },
  disclaimer: { marginTop: 35, fontSize: 12, color: COLORS.subtext, textAlign: 'center', lineHeight: 20, fontStyle: 'italic' }
});