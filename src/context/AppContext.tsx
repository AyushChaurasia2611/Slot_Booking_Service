'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'PROVIDER' | 'CUSTOMER';
  timezone: string;
}

interface AppContextType {
  currentUser: User | null;
  allUsers: User[];
  timezone: string;
  loading: boolean;
  loginAs: (userId: string | null) => Promise<void>;
  changeTimezone: (tz: string) => void;
  refreshSession: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [timezone, setTimezone] = useState<string>('UTC');
  const [loading, setLoading] = useState<boolean>(true);

  // Load browser timezone as initial value
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      setTimezone(tz);
    }
  }, []);

  const refreshSession = async () => {
    try {
      const res = await fetch('/api/auth/session');
      const data = await res.json();
      if (data.user) {
        setCurrentUser(data.user);
      } else {
        setCurrentUser(null);
      }
    } catch (e) {
      console.error('Error refreshing session:', e);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/users');
      const data = await res.json();
      if (data.users) {
        setAllUsers(data.users);
      }
    } catch (e) {
      console.error('Error fetching users:', e);
    }
  };

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await refreshSession();
      await fetchUsers();
      setLoading(false);
    };
    init();
  }, []);

  const loginAs = async (userId: string | null) => {
    setLoading(true);
    try {
      const res = await fetch('/api/auth/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
      const data = await res.json();
      if (data.success) {
        setCurrentUser(data.user || null);
        if (data.user?.timezone) {
          setTimezone(data.user.timezone);
        }
      } else {
        setCurrentUser(null);
      }
    } catch (e) {
      console.error('Error during login switcher:', e);
      setCurrentUser(null);
    } finally {
      setLoading(false);
    }
  };

  const changeTimezone = (tz: string) => {
    setTimezone(tz);
  };

  return (
    <AppContext.Provider
      value={{
        currentUser,
        allUsers,
        timezone,
        loading,
        loginAs,
        changeTimezone,
        refreshSession,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
