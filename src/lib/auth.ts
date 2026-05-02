"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut as firebaseSignOut,
  GoogleAuthProvider,
  type User,
} from "firebase/auth";
import { auth } from "./firebase";

const ALLOWED_DOMAIN = "neodimio.com.uy";

export interface AuthState {
  user: User | null;
  loading: boolean;
  isAdmin: boolean;
  error: string | null;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
}

function checkIsAdmin(user: User | null): boolean {
  if (!user?.email) return false;
  return user.email.endsWith(`@${ALLOWED_DOMAIN}`);
}

export const AuthContext = createContext<AuthState>({
  user: null,
  loading: true,
  isAdmin: false,
  error: null,
  signIn: async () => {},
  signOut: async () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

export function useAuthProvider(): AuthState {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const signIn = useCallback(async () => {
    setError(null);
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ hd: ALLOWED_DOMAIN });
      const result = await signInWithPopup(auth, provider);
      if (!checkIsAdmin(result.user)) {
        await firebaseSignOut(auth);
        setError(
          `Solo cuentas @${ALLOWED_DOMAIN} pueden acceder al dashboard.`
        );
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : "Error al iniciar sesión";
      setError(message);
    }
  }, []);

  const signOut = useCallback(async () => {
    await firebaseSignOut(auth);
  }, []);

  return {
    user,
    loading,
    isAdmin: checkIsAdmin(user),
    error,
    signIn,
    signOut,
  };
}
