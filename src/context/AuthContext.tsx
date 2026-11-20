import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  type User,
} from 'firebase/auth';
import { auth, googleAuthProvider } from '../lib/firebase.ts';
import type { UserProfile } from '../types/store.ts';

interface AuthContextValue {
  firebaseUser: User | null;
  profile: UserProfile | null;
  idToken: string | null;
  loading: boolean;
  authError: string | null;
  loginWithGoogle: () => Promise<string | null>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [idToken, setIdToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  const fetchBackendProfile = async (token: string) => {
    try {
      const res = await fetch('/api/auth/me', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (res.ok) {
        const data: UserProfile = await res.json();
        setProfile(data);
      } else {
        setProfile(null);
      }
    } catch (err) {
      console.error('Failed to load user profile:', err);
      setProfile(null);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      if (user) {
        try {
          const token = await user.getIdToken();
          setIdToken(token);
          await fetchBackendProfile(token);
        } catch (err) {
          console.error('Error retrieving ID token:', err);
          setIdToken(null);
          setProfile(null);
        }
      } else {
        setIdToken(null);
        setProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const loginWithGoogle = async (): Promise<string | null> => {
    setAuthError(null);
    try {
      const result = await signInWithPopup(auth, googleAuthProvider);
      const token = await result.user.getIdToken();
      setIdToken(token);
      await fetchBackendProfile(token);
      return token;
    } catch (err: any) {
      console.error('Google Sign-In failed:', err);
      if (err?.code !== 'auth/popup-closed-by-user') {
        setAuthError('Đăng nhập Google thất bại. Vui lòng thử lại.');
      }
      return null;
    }
  };

  const logout = async () => {
    await signOut(auth);
    setIdToken(null);
    setProfile(null);
  };

  const refreshProfile = async () => {
    if (firebaseUser) {
      const token = await firebaseUser.getIdToken(true);
      setIdToken(token);
      await fetchBackendProfile(token);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        firebaseUser,
        profile,
        idToken,
        loading,
        authError,
        loginWithGoogle,
        logout,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return ctx;
}
