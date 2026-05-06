import React, { createContext, useState, useEffect, useContext } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { Alert } from 'react-native'; // Importação necessária para o aviso
import { supabase } from '../supabase'; 

type AuthContextData = {
  session: Session | null;
  user: User | null;
  organizacao_id: string | null;
  role: string | null;
  loading: boolean;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextData>({} as AuthContextData);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [organizacao_id, setOrganizacaoId] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) fetchPerfil(session.user.id);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        await fetchPerfil(session.user.id);
      } else {
        setOrganizacaoId(null);
        setRole(null);
      }
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const fetchPerfil = async (userId: string) => {
    try {
      // 1. Buscamos agora também o campo 'status'
      const { data, error } = await supabase
        .from('perfis')
        .select('organizacao_id, role, status')
        .eq('id', userId)
        .single();

      if (error) throw error;

      if (data) {
        // 2. A TRAVA DE SEGURANÇA: Verifica se o status não é 'ativo'
        if (data.status !== 'ativo') {
          await supabase.auth.signOut(); // Desloga o usuário do Supabase
          
          // Limpa os estados locais
          setOrganizacaoId(null);
          setRole(null);
          setSession(null);
          setUser(null);

          Alert.alert(
            "Acesso Pendente",
            "Sua conta ainda aguarda liberação do administrador da unidade."
          );
          return;
        }

        // 3. Se estiver ativo, estabelece o vínculo
        setOrganizacaoId(data.organizacao_id);
        setRole(data.role);
      }
    } catch (error) {
      console.error('Erro ao buscar perfil SaaS:', error);
      // Em caso de erro crítico na busca do perfil, deslogamos por precaução
      await supabase.auth.signOut();
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ session, user, organizacao_id, role, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);