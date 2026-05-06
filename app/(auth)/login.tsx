import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  Alert, 
  ActivityIndicator, 
  Image, 
  SafeAreaView, 
  KeyboardAvoidingView, 
  Platform 
} from 'react-native';
import { supabase } from '../../src/supabase'; 
import { useRouter } from 'expo-router'; 

const COLORS = {
  background: '#FFFFFF', // Fundo branco conforme imagem
  techBlue: '#1E3A8A',   // Azul padrão Afery
  black: '#000000',      // Texto principal preto
  gray: '#666666',
  white: '#FFFFFF',
  border: '#E2E8F0',
  textSubtle: '#94A3B8',
};

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function signInWithEmail() {
    if (!email || !password) {
      Alert.alert('Erro', 'Por favor, preencha e-mail e senha.');
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password: password,
    });

    if (error) {
      Alert.alert('Erro de Login', error.message);
      setLoading(false);
    }
  }

  const handleForgotPassword = () => {
    Alert.alert('Recuperação de Senha', 'Procure o Administrador da sua unidade para resetar sua senha.');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView 
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.container}>
          
          {/* LOGO E TEXTO CONFORME IMAGEM */}
          <View style={styles.logoContainer}>
            <View style={styles.logoRow}>
              <Image 
                source={require('../../assets/images/icon.png')} 
                style={styles.logoIcon} 
                resizeMode="contain"
              />
              <Text style={styles.logoTextAFERY}>Afery</Text>
            </View>
            <Text style={styles.logoSubtitle}>Sistemas de inventário</Text>
          </View>
          
          <Text style={styles.title}>BEM-VINDO</Text>
          
          <TextInput
            style={styles.input}
            placeholder="E-mail"
            placeholderTextColor={COLORS.gray}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />

          <TextInput
            style={styles.input}
            placeholder="Senha"
            placeholderTextColor={COLORS.gray}
            value={password}
            onChangeText={setPassword}
            secureTextEntry={true}
          />

          <TouchableOpacity style={styles.forgotPasswordContainer} onPress={handleForgotPassword}>
            <Text style={styles.forgotPasswordText}>Esqueceu sua senha?</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.button} 
            onPress={signInWithEmail}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={COLORS.white} />
            ) : (
              <Text style={styles.buttonText}>ENTRAR</Text>
            )}
          </TouchableOpacity>

          {/* --- BLOCO DE LINKS PARA CADASTRO (SaaS) --- */}
          <View style={styles.saasLinksContainer}>
            <TouchableOpacity 
              style={styles.saasLinkItem} 
              onPress={() => router.push('/(auth)/cadastro')}
            >
              <Text style={styles.saasLinkText}>Faz parte de uma empresa cadastrada?</Text>
              <Text style={styles.saasLinkAction}>Entre por aqui.</Text>
            </TouchableOpacity>

            <View style={styles.divider} />

            <TouchableOpacity 
              style={styles.saasLinkItem} 
              onPress={() => router.push('/(auth)/nova-empresa')}
            >
              <Text style={styles.saasLinkText}>Quer usar o AFERY na sua empresa?</Text>
              <Text style={styles.saasLinkAction}>Comece aqui.</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.footer}>Blindagem SaaS Multi-tenant Ativada</Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.background },
  keyboardView: { flex: 1 },
  container: { flex: 1, justifyContent: 'center', padding: 30 },
  
  // LOGO ESTILO IMAGEM
  logoContainer: { alignItems: 'center', marginBottom: 40 },
  logoRow: { flexDirection: 'row', alignItems: 'center' },
  logoIcon: { width: 70, height: 70, marginRight: 10 },
  logoTextAFERY: { fontSize: 42, fontWeight: 'bold', color: COLORS.black },
  logoSubtitle: { fontSize: 24, color: COLORS.black, marginTop: -5 },
  
  title: { fontSize: 16, fontWeight: 'bold', color: COLORS.gray, textAlign: 'center', marginBottom: 25, letterSpacing: 2 },
  
  input: {
    height: 55,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: 15,
    marginBottom: 15,
    fontSize: 16,
    color: COLORS.black,
  },
  forgotPasswordContainer: { alignSelf: 'flex-end', marginBottom: 20 },
  forgotPasswordText: { color: COLORS.techBlue, fontSize: 13, fontWeight: '500' },
  
  button: {
    height: 55,
    backgroundColor: COLORS.techBlue, // Botão agora é Azul Tech
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 30,
    elevation: 2,
  },
  buttonText: { color: COLORS.white, fontSize: 18, fontWeight: 'bold' },
  
  saasLinksContainer: { marginTop: 10, gap: 15 },
  saasLinkItem: { alignItems: 'center', paddingVertical: 5 },
  saasLinkText: { color: COLORS.textSubtle, fontSize: 13, textAlign: 'center' },
  saasLinkAction: { color: COLORS.techBlue, fontSize: 14, fontWeight: 'bold', marginTop: 2 },
  divider: { height: 1, backgroundColor: COLORS.border, width: '60%', alignSelf: 'center', marginVertical: 5 },
  
  footer: { position: 'absolute', bottom: 20, left: 0, right: 0, textAlign: 'center', color: COLORS.gray, fontSize: 11 },
});