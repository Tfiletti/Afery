// src/context/AuthContext.tsx
import React, { createContext, useState, useEffect, useContext } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../supabase'; // Verifique se o caminho do seu cliente supabase está correto

// O que nosso "cérebro" vai guardar
type AuthContextData = {
  session: Session | null;
  user: User | null;
  organizacao_id: string | null; // A CHAVE DO SAAS
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
    // 1. Verifica se já existe uma sessão salva ao abrir o app
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) fetchPerfil(session.user.id);
      setLoading(false);
    });

    // 2. Escuta mudanças na autenticação (login, logout, senha alterada)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      console.log("Sessão mudou:", _event);
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        await fetchPerfil(session.user.id);
      } else {
        // Se deslogou, limpa tudo
        setOrganizacaoId(null);
        setRole(null);
      }
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // 3. A MAGIA DO SAAS: Busca o vínculo da organização na tabela 'perfis'
  // Nota: Isso só funciona se você tiver rodado os SQLs que configuraram o Thomas como ADMIN
  const fetchPerfil = async (userId: string) => {
    try {
      console.log("Buscando perfil para:", userId);
      const { data, error } = await supabase
        .from('perfis')
        .select('organizacao_id, role')
        .eq('id', userId)
        .single();

      if (error) throw error;
      if (data) {
        setOrganizacaoId(data.organizacao_id);
        setRole(data.role);
        console.log("Vínculo SaaS estabelecido:", data.organizacao_id, data.role);
      }
    } catch (error) {
      console.error('Erro ao buscar perfil SaaS:', error);
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

// Hook personalizado para usar o contexto
export const useAuth = () => useContext(AuthContext);