import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { 
  apiLoginUser, 
  apiFetchUsers, 
  apiUpdateUserCredits, 
  apiDeductUserCredit, 
  type DbUser 
} from '../api';

export interface User {
  username: string;
  email: string;
  role: 'user' | 'admin';
  credits: number;
  tokensUsed: number;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (emailOrUsername: string, password?: string) => Promise<boolean>;
  logout: () => void;
  deductCredit: (amount: number, tokensAdded: number) => void;
  updateUserCredits: (email: string, newCredits: number) => Promise<void>;
  refreshUsers: () => Promise<void>;
  usersList: User[];
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [usersList, setUsersList] = useState<User[]>([]);
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('ai_platform_user');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return null;
      }
    }
    return null;
  });

  const refreshUsers = useCallback(async () => {
    try {
      const dbUsers = await apiFetchUsers();
      const mapped: User[] = dbUsers.map((u: DbUser) => ({
        username: u.username,
        email: u.email,
        role: u.role,
        credits: u.credits,
        tokensUsed: u.tokensUsed,
      }));
      setUsersList(mapped);

      // Keep current user in sync with DB balance
      setUser((current) => {
        if (!current) return null;
        const fresh = mapped.find((u) => u.email.toLowerCase() === current.email.toLowerCase());
        if (fresh) {
          localStorage.setItem('ai_platform_user', JSON.stringify(fresh));
          return fresh;
        }
        return current;
      });
    } catch (err) {
      console.warn('Failed to refresh users from Cloud SQL:', err);
    }
  }, []);

  // Fetch users from Cloud SQL on mount
  useEffect(() => {
    refreshUsers();
  }, [refreshUsers]);

  const isAuthenticated = !!user;

  const login = async (emailOrUsername: string, password: string = ''): Promise<boolean> => {
    if (!emailOrUsername.trim()) return false;

    const isEmailAdmin = emailOrUsername.toLowerCase().includes('admin');
    const email = emailOrUsername.includes('@') ? emailOrUsername : `${emailOrUsername}@example.com`;
    const username = isEmailAdmin ? 'Admin Manager' : emailOrUsername.split('@')[0];

    try {
      const dbUser = await apiLoginUser(email, username, password);
      const loggedInUser: User = {
        username: dbUser.username,
        email: dbUser.email,
        role: dbUser.role,
        credits: dbUser.credits,
        tokensUsed: dbUser.tokensUsed,
      };
      setUser(loggedInUser);
      localStorage.setItem('ai_platform_user', JSON.stringify(loggedInUser));
      await refreshUsers();
      return true;
    } catch (err) {
      console.error('Login error:', err);
      return false;
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('ai_platform_user');
  };

  const deductCredit = (amount: number, tokensAdded: number) => {
    if (!user) return;

    // Optimistic UI update
    setUser((prev) => {
      if (!prev) return null;
      const newCredits = prev.role === 'admin' ? prev.credits : Math.max(0, prev.credits - amount);
      const updated: User = {
        ...prev,
        credits: newCredits,
        tokensUsed: prev.tokensUsed + tokensAdded,
      };
      localStorage.setItem('ai_platform_user', JSON.stringify(updated));
      return updated;
    });

    // Asynchronously deduct from Cloud SQL Credit Bank
    apiDeductUserCredit(user.email, amount, tokensAdded).then(() => {
      refreshUsers();
    });
  };

  const updateUserCredits = async (email: string, newCredits: number) => {
    try {
      await apiUpdateUserCredits(email, newCredits);
      await refreshUsers();
    } catch (err) {
      console.error('Failed to update user credits in Cloud SQL:', err);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        login,
        logout,
        deductCredit,
        updateUserCredits,
        refreshUsers,
        usersList,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
