import React, { createContext, useContext, useState, useEffect } from 'react';

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
  login: (emailOrUsername: string, password: string) => Promise<boolean>;
  logout: () => void;
  deductCredit: (amount: number, tokensAdded: number) => void;
  updateUserCredits: (email: string, newCredits: number) => void;
  usersList: User[];
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const DEFAULT_USERS: User[] = [
  {
    username: 'Admin Manager',
    email: 'admin@example.com',
    role: 'admin',
    credits: 100, // starting limit, admin bypasses restriction anyway
    tokensUsed: 1200,
  },
  {
    username: 'Sarath',
    email: 'sarath@example.com',
    role: 'user',
    credits: 20, // default regular user allocation
    tokensUsed: 450,
  },
];

const getUsersDb = (): User[] => {
  const db = localStorage.getItem('ai_platform_users_db');
  if (db) {
    try {
      return JSON.parse(db);
    } catch {
      // Fallback below
    }
  }
  localStorage.setItem('ai_platform_users_db', JSON.stringify(DEFAULT_USERS));
  return DEFAULT_USERS;
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [usersList, setUsersList] = useState<User[]>(() => getUsersDb());

  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('ai_platform_user');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Load fresh credit balance from database
        const db = getUsersDb();
        const fresh = db.find((u) => u.email.toLowerCase() === parsed.email.toLowerCase());
        return fresh || parsed;
      } catch {
        return null;
      }
    }
    return null;
  });

  // Keep localStorage in-sync with database list state
  useEffect(() => {
    localStorage.setItem('ai_platform_users_db', JSON.stringify(usersList));
  }, [usersList]);

  const isAuthenticated = !!user;

  const login = async (emailOrUsername: string, password: string): Promise<boolean> => {
    // Artificial latency for premium feedback indicator
    await new Promise((resolve) => setTimeout(resolve, 800));

    // Simple validation
    if (!emailOrUsername.trim() || !password.trim()) {
      return false;
    }

    const isEmailAdmin = emailOrUsername.toLowerCase().includes('admin');
    const role: 'user' | 'admin' = isEmailAdmin ? 'admin' : 'user';
    const email = emailOrUsername.includes('@') ? emailOrUsername : `${emailOrUsername}@example.com`;

    // Retrieve fresh user registry
    const db = getUsersDb();
    let matchedUser = db.find((u) => u.email.toLowerCase() === email.toLowerCase());

    if (!matchedUser) {
      matchedUser = {
        username: isEmailAdmin ? 'Admin Manager' : emailOrUsername.split('@')[0],
        email,
        role,
        credits: isEmailAdmin ? 100 : 20, // default allocations
        tokensUsed: 0,
      };
      setUsersList((prev) => [...prev, matchedUser!]);
    }

    setUser(matchedUser);
    localStorage.setItem('ai_platform_user', JSON.stringify(matchedUser));
    return true;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('ai_platform_user');
  };

  const deductCredit = (amount: number, tokensAdded: number) => {
    if (!user) return;

    setUsersList((prev) =>
      prev.map((u) => {
        if (u.email.toLowerCase() === user.email.toLowerCase()) {
          // Admin bypasses credit depletion (credits stay constant)
          const newCredits = u.role === 'admin' ? u.credits : Math.max(0, u.credits - amount);
          const updated = {
            ...u,
            credits: newCredits,
            tokensUsed: u.tokensUsed + tokensAdded,
          };
          setUser(updated);
          localStorage.setItem('ai_platform_user', JSON.stringify(updated));
          return updated;
        }
        return u;
      })
    );
  };

  const updateUserCredits = (email: string, newCredits: number) => {
    setUsersList((prev) =>
      prev.map((u) => {
        if (u.email.toLowerCase() === email.toLowerCase()) {
          const updated = { ...u, credits: newCredits };
          // If the updated user is currently logged in, sync active session too
          if (user && user.email.toLowerCase() === email.toLowerCase()) {
            setUser(updated);
            localStorage.setItem('ai_platform_user', JSON.stringify(updated));
          }
          return updated;
        }
        return u;
      })
    );
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
