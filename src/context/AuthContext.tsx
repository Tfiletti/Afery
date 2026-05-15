import React, { createContext, useState, useEffect, useContext } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { Alert } from 'react-native'; 
import { supabase } from '../supabase'; 

type AuthContextData = {
  session: Session | null;
  user: User | null;
  userName: string | null; 
  organizacao_id: string | null;
  organizacao_nome: string | null; 
  organizacao_slug: string | null; 
  organizacao_codigo: string | null; // ADICIONADO: Para o código de registro (9WQNRU)
  role: string | null;
  loading: boolean;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextData>({} as AuthContextData);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [userName, setUserName] = useState<string | null>(null); 
  const [organizacao_id, setOrganizacaoId] = useState<string | null>(null);
  const [organizacao_nome, setOrganizacaoNome] = useState<string | null>(null); 
  const [organizacao_slug, setOrganizacaoSlug] = useState<string | null>(null); 
  const [organizacao_codigo, setOrganizacaoCodigo] = useState<string | null>(null); // ADICIONADO
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initializeAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        await fetchPerfil(session.user.id);
      }
      setLoading(false);
    };

    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        setLoading(true);
        await fetchPerfil(session.user.id);
      } else {
        limparEstados();
      }
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const limparEstados = () => {
    setOrganizacaoId(null);
    setOrganizacaoNome(null);
    setOrganizacaoSlug(null);
    setOrganizacaoCodigo(null); // ADICIONADO
    setUserName(null);
    setRole(null);
  };

  const fetchPerfil = async (userId: string) => {
    try {
      // AJUSTE CIRÚRGICO: Incluído 'codigo_acesso' na busca relacional
      const { data, error } = await supabase
        .from('perfis')
        .select(`
          nome, 
          role, 
          status, 
          organizacao_id,
          organizacoes (nome, slug, codigo_acesso)
        `)
        .eq('id', userId)
        .single();

      if (error) throw error;

      if (data) {
        if (data.status !== 'ativo') {
          await signOut();
          Alert.alert(
            "Acesso Pendente",
            "Sua conta ainda aguarda liberação do administrador da unidade."
          );
          return;
        }

        setUserName(data.nome); 
        setOrganizacaoId(data.organizacao_id);
        setRole(data.role);
        
        const org: any = data.organizacoes;
        if (org) {
          setOrganizacaoNome(org.nome);
          setOrganizacaoSlug(org.slug);
          setOrganizacaoCodigo(org.codigo_acesso); // AGORA MAPEADO CORRETAMENTE
        }
      }
    } catch (error: any) {
      console.error('Erro ao buscar perfil SaaS:', error.message);
    }
  };

  const signOut = async () => {
    limparEstados();
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ 
      session, 
      user, 
      userName, 
      organizacao_id, 
      organizacao_nome, 
      organizacao_slug, 
      organizacao_codigo, // ADICIONADO AO PROVIDER
      role, 
      loading, 
      signOut 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);