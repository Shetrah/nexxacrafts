import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

export type AppRole =
  | 'super_admin'
  | 'admin'
  | 'sales'
  | 'finance'
  | 'designer'
  | 'print_operator'
  | 'laser_operator'
  | 'developer'
  | 'production_manager'
  | 'dispatch'
  | 'customer';

export interface UserProfile {
  id: string;
  full_name: string | null;
  role: AppRole;
  phone?: string | null;
  company?: string | null;
}

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (input: { name: string; email: string; password: string; phone?: string }) => Promise<void>;
  resendSignupConfirmation: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  /** Sends a Supabase password-recovery email. `redirectTo` must be an allowed redirect URL in Supabase Auth settings. */
  requestPasswordReset: (email: string, redirectTo?: string) => Promise<void>;
  /** Updates the signed-in user's password (also used after following a recovery link). */
  updatePassword: (password: string) => Promise<void>;
}

const PROFILE_COLUMNS = 'id, full_name, role, phone, company';
const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshProfile = async () => {
    if (!supabase?.auth.getSession) return;
    const client = supabase;
    const { data } = await client.auth.getSession();
    const current = data.session;
    setSession(current);
    if (!current?.user) {
      setProfile(null);
      return;
    }
    const { data: row } = await client.from('profiles').select(PROFILE_COLUMNS).eq('id', current.user.id).maybeSingle();
    setProfile(row as UserProfile | null);
  };

  useEffect(() => {
    let active = true;
    const client = supabase;
    if (!client) {
      setLoading(false);
      return;
    }
    client.auth
      .getSession()
      .then(async ({ data }) => {
        if (!active) return;
        setSession(data.session);
        if (data.session?.user) {
          const { data: row } = await client.from('profiles').select(PROFILE_COLUMNS).eq('id', data.session.user.id).maybeSingle();
          if (active) setProfile(row as UserProfile | null);
        }
        if (active) setLoading(false);
      })
      .catch(() => {
        // Never leave the application stuck on a loading screen if the session check fails (e.g. offline).
        if (active) setLoading(false);
      });
    const { data: listener } = client.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      if (!nextSession?.user) {
        setProfile(null);
        return;
      }
      window.setTimeout(async () => {
        const { data: row } = await client.from('profiles').select(PROFILE_COLUMNS).eq('id', nextSession.user.id).maybeSingle();
        setProfile(row as UserProfile | null);
      }, 0);
    });
    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user: session?.user || null,
      session,
      profile,
      loading,
      signIn: async (email, password) => {
        if (!supabase) throw new Error('Connect Supabase to enable customer and staff accounts.');
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        await refreshProfile();
      },
      signUp: async ({ name, email, password, phone }) => {
        if (!supabase) throw new Error('Connect Supabase to enable account registration.');
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: name, phone },
            emailRedirectTo: `${window.location.origin}/account?confirmed=1`,
          },
        });
        if (error) throw error;
      },
      resendSignupConfirmation: async (email) => {
        if (!supabase) throw new Error('Connect Supabase to resend account confirmation emails.');
        const { error } = await supabase.auth.resend({
          type: 'signup',
          email,
          options: { emailRedirectTo: `${window.location.origin}/account?confirmed=1` },
        });
        if (error) throw error;
      },
      signOut: async () => {
        if (supabase) await supabase.auth.signOut();
        setSession(null);
        setProfile(null);
      },
      refreshProfile,
      requestPasswordReset: async (email, redirectTo) => {
        if (!supabase) throw new Error('Connect Supabase to enable password recovery.');
        const { error } = await supabase.auth.resetPasswordForEmail(email, redirectTo ? { redirectTo } : undefined);
        if (error) throw error;
      },
      updatePassword: async (password) => {
        if (!supabase) throw new Error('Connect Supabase to manage your password.');
        const { error } = await supabase.auth.updateUser({ password });
        if (error) throw error;
      },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [session, profile, loading],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used within AuthProvider');
  return value;
};
