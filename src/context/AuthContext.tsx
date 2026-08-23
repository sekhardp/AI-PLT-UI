import React, { createContext, useContext, useState } from 'react';

export interface User {
  username: string;
  email: string;
  role: 'user' | 'admin';
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (emailOrUsername: string, password: string) => Promise<boolean>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
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

  const isAuthenticated = !!user;

  const login = async (emailOrUsername: string, password: string): Promise<boolean> => {
    // Artificial latency for premium feedback indicator
    await new Promise((resolve) => setTimeout(resolve, 800));

    // Simple validation
    if (!emailOrUsername.trim() || !password.trim()) {
      return false;
    }

    // Role-assignment based on mock user credentials
    const isEmailAdmin = emailOrUsername.toLowerCase().includes('admin');
    const role: 'user' | 'admin' = isEmailAdmin ? 'admin' : 'user';

    const newUser: User = {
      username: isEmailAdmin ? 'Admin Manager' : emailOrUsername.split('@')[0],
      email: emailOrUsername.includes('@') ? emailOrUsername : `${emailOrUsername}@example.com`,
      role,
    };

    setUser(newUser);
    localStorage.setItem('ai_platform_user', JSON.stringify(newUser));
    return true;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('ai_platform_user');
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, login, logout }}>
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
