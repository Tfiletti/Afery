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

// PALETA DE CORES SMART COUNT
const COLORS = {
  primary: '#1E3A8A', // Azul Tech
  accent: '#E6A23C',  // Laranja Industrial
  white: '#FFFFFF',
  bg: '#FAFAFA',
  inputBg: '#F8FAFC',
  border: '#E2E8F0',
  text: '#1E293B',
  subtext: '#64748B',
};

export default function NovaEmpresa() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  
  // Estados do formulário
  const [nomeEmpresa, setNomeEmpresa] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Função para gerar o slug (exigido pela sua tabela organizacoes)
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
    if (!nomeEmpresa || !email || !password) {
      return Alert.alert("Atenção", "Preencha todos os campos para registrar a unidade.");
    }
    if (password.length < 6) {
      return Alert.alert("Segurança", "A senha deve ter pelo menos 6 caracteres.");
    }

    setLoading(true);

    try {
      // 1. GERA O CÓDIGO SEGURO VIA RPC (Função no Supabase)
      const { data: novoCodigo, error: codeError } = await supabase.rpc('gerar_codigo_seguro');
      if (codeError) throw codeError;

      const slug = gerarSlug(nomeEmpresa);

      // 2. CRIA A ORGANIZAÇÃO NO BANCO
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
          throw new Error("Já existe uma unidade com este nome ou slug. Tente variar o nome.");
        }
        throw orgErr;
      }

      // 3. CRIA O USUÁRIO NO AUTH DO SUPABASE
      const { data: authData, error: authErr } = await supabase.auth.signUp({
        email: email.trim(),
        password: password,
      });

      if (authErr) throw authErr;

      // 4. CRIA O PERFIL VINCULADO (Sem a coluna email, conforme seu schema)
      if (authData.user) {
        const { error: profileError } = await supabase.from('perfis').insert({
          id: authData.user.id,
          organizacao_id: org.id,
          role: 'ADMIN',
          status: 'ativo' // Admin já nasce liberado
        });
        
        if (profileError) throw profileError;

        Alert.alert(
          "Unidade Registrada!", 
          `Unidade: ${nomeEmpresa}\nCódigo de Acesso: ${novoCodigo}\n\nCompartilhe este código com sua equipe para que eles solicitem acesso.`,
          [{ text: "COMEÇAR AGORA", onPress: () => router.replace('/(tabs)') }]
        );
      }

    } catch (e: any) {
      Alert.alert("Falha na Criação", e.message);
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
            <Ionicons name="arrow-back" size={28} color={COLORS.primary} />
          </TouchableOpacity>

          <View style={styles.header}>
            <Image 
              source={require('../../assets/images/sc_icon.png')} 
              style={styles.logo} 
              resizeMode="contain" 
            />
            <Text style={styles.title}>Nova Unidade</Text>
            <Text style={styles.subtitle}>Registre sua empresa e comece a gerenciar</Text>
          </View>

          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>NOME DA ORGANIZAÇÃO</Text>
              <TextInput 
                style={styles.input} 
                placeholder="Ex: Logística Ypê - Amparo" 
                value={nomeEmpresa} 
                onChangeText={setNomeEmpresa} 
                placeholderTextColor="#94A3B8"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>E-MAIL DO ADMINISTRADOR</Text>
              <TextInput 
                style={styles.input} 
                placeholder="seu@email.com" 
                value={email} 
                onChangeText={setEmail} 
                autoCapitalize="none"
                keyboardType="email-address"
                placeholderTextColor="#94A3B8"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>SENHA MESTRA</Text>
              <TextInput 
                style={styles.input} 
                placeholder="Mínimo 6 caracteres" 
                value={password} 
                onChangeText={setPassword} 
                secureTextEntry 
                placeholderTextColor="#94A3B8"
              />
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
                  <MaterialCommunityIcons name="rocket-launch-outline" size={20} color={COLORS.white} style={{marginRight: 10}} />
                  <Text style={styles.btnText}>CRIAR E ACESSAR</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          <Text style={styles.disclaimer}>
            Ao criar uma unidade, você se torna o Administrador responsável pela aprovação de novos membros.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 30, paddingTop: 40 },
  backBtn: { marginBottom: 10, alignSelf: 'flex-start' },
  header: { alignItems: 'center', marginBottom: 35 },
  logo: { width: 100, height: 100, marginBottom: 10 },
  title: { fontSize: 26, fontWeight: 'bold', color: COLORS.primary },
  subtitle: { fontSize: 14, color: COLORS.subtext, textAlign: 'center', marginTop: 5 },
  form: { gap: 20 },
  inputGroup: { gap: 8 },
  label: { fontSize: 11, fontWeight: '800', color: COLORS.primary, letterSpacing: 1 },
  input: { 
    height: 55, 
    backgroundColor: COLORS.inputBg, 
    borderRadius: 14, 
    paddingHorizontal: 18, 
    borderWidth: 1, 
    borderColor: COLORS.border,
    color: COLORS.text,
    fontSize: 16
  },
  btn: { 
    backgroundColor: COLORS.primary, 
    height: 55, 
    borderRadius: 14, 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginTop: 15,
    elevation: 4,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
  btnContent: { flexDirection: 'row', alignItems: 'center' },
  btnText: { color: COLORS.white, fontWeight: 'bold', fontSize: 16, letterSpacing: 1 },
  disclaimer: { 
    marginTop: 40, 
    fontSize: 12, 
    color: COLORS.subtext, 
    textAlign: 'center', 
    lineHeight: 18 
  }
});