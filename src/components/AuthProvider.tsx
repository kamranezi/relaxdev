'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { onAuthStateChanged, User, getAuth, signInWithPopup, GoogleAuthProvider, GithubAuthProvider, signOut as firebaseSignOut } from 'firebase/auth';
import { app } from '@/lib/firebase-client';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithGitHub: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const auth = getAuth(app);

// Функция для отправки данных на бэкенд
async function postAuthData(user: User, providerId?: string) {
  const idToken = await user.getIdToken();
  let accessToken: string | undefined;

  // Этот хак нужен, чтобы достать accessToken, Firebase SDK не предоставляет его легко
  if (providerId === 'github.com' && user.providerData.length > 0) {
      // В реальном приложении accessToken нужно получать более надежно
      // но для текущей ситуации попробуем так. Это поле официально не документировано.
      accessToken = (user as any).stsTokenManager?.accessToken;
  }

  const response = await fetch('/api/auth', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      idToken,
      provider: providerId,
      ...(providerId === 'github.com' && { accessToken }),
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    console.error('Error saving user data:', errorData);
    throw new Error('Failed to save user data');
  }

  console.log('User data successfully saved to backend.');
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
      console.log('Auth state changed. User:', user?.displayName);
    });
    return () => unsubscribe();
  }, []);

  const commonSignIn = async (provider: GoogleAuthProvider | GithubAuthProvider) => {
    setLoading(true);
    try {
      const result = await signInWithPopup(auth, provider);
      const providerId = result.user.providerData[0]?.providerId;
      if (result.user) {
        console.log(`Signed in with ${providerId}. Posting data to backend...`);
        await postAuthData(result.user, providerId);
      }
    } catch (error: any) {
      console.error("Authentication error:", error);
      // ОБРАБОТКА ОШИБКИ, КАК ВЫ И ПРЕДЛОЖИЛИ
      if (error.code === 'auth/account-exists-with-different-credential') {
        alert('Аккаунт с таким email уже существует. Пожалуйста, войдите, используя способ, который вы использовали при первой регистрации.');
      } else {
        alert(`Ошибка входа: ${error.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const signInWithGoogle = () => commonSignIn(new GoogleAuthProvider());
  const signInWithGitHub = () => commonSignIn(new GithubAuthProvider());

  const signOut = async () => {
    setLoading(true);
    try {
        await firebaseSignOut(auth);
        console.log('User signed out.');
    } catch (error) {
        console.error('Sign out failed:', error);
    } finally {
        setLoading(false);
    }
  };


  return (
    <AuthContext.Provider value={{ user, loading, signInWithGoogle, signInWithGitHub, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};