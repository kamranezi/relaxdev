'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { 
  onAuthStateChanged, 
  User, 
  getAuth, 
  signInWithRedirect,
  getRedirectResult,
  GithubAuthProvider, 
  signOut as firebaseSignOut 
} from 'firebase/auth';
import { app } from '@/lib/firebase-client';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signInWithGitHub: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const auth = getAuth(app);

// Функция для отправки данных на бэкенд
async function postAuthData(user: User, githubToken?: string) {
  const idToken = await user.getIdToken();

  if (!githubToken) {
      console.error('GitHub Access Token not available after sign-in.');
      return;
  }

  const response = await fetch('/api/auth', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      idToken,
      provider: 'github.com',
      accessToken: githubToken, // Отправляем токен доступа GitHub
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

  // Этот хук обрабатывает сессию пользователя из Firebase
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
      console.log('Auth state changed. User:', user?.displayName);
    });
    return () => unsubscribe();
  }, []);

  // Этот хук обрабатывает результат перенаправления при входе
  useEffect(() => {
    const processRedirectResult = async () => {
        try {
            const result = await getRedirectResult(auth);
            if (result) {
                // Пользователь только что вошел через перенаправление
                const credential = GithubAuthProvider.credentialFromResult(result);
                const githubToken = credential?.accessToken;

                if (result.user && githubToken) {
                    console.log(`Signed in with GitHub via redirect. Posting data to backend...`);
                    await postAuthData(result.user, githubToken);
                }
            }
        } catch (error: any) {
            console.error("Authentication error during redirect result:", error);
            if (error.code === 'auth/account-exists-with-different-credential') {
                alert('Аккаунт с таким email уже существует. Пожалуйста, войдите, используя способ, который вы использовали при первой регистрации.');
            } else {
                alert(`Ошибка входа: ${error.message}`);
            }
        }
    };
    
    processRedirectResult();
  }, []); // Пустой массив зависимостей гарантирует, что это выполнится один раз при монтировании


  const signInWithGitHub = async () => {
    setLoading(true);
    const provider = new GithubAuthProvider();
    provider.addScope('repo'); 
    await signInWithRedirect(auth, provider);
  };

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
    <AuthContext.Provider value={{ user, loading, signInWithGitHub, signOut }}>
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
