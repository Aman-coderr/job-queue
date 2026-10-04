"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';

interface AuthContextType {
  token: string | null;
  userEmail: string | null;
  isLoading: boolean;
  login: (token: string, email: string) => void;
  logout: () => void;
}

const STORAGE_KEYS = {
  TOKEN: 'queuecraft_auth_token',
  EMAIL: 'queuecraft_user_email',
};

const AuthContext = createContext<AuthContextType>({
  token: null,
  userEmail: null,
  isLoading: true,
  login: () => {},
  logout: () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    try {
      const savedToken = localStorage.getItem(STORAGE_KEYS.TOKEN);
      const savedEmail = localStorage.getItem(STORAGE_KEYS.EMAIL);
      if (savedToken) {
        setToken(savedToken);
        setUserEmail(savedEmail);
      }
    } catch {
      // LocalStorage access handling
    } finally {
      setIsLoading(false);
    }
  }, []);

  const login = (newToken: string, email: string) => {
    setToken(newToken);
    setUserEmail(email);
    localStorage.setItem(STORAGE_KEYS.TOKEN, newToken);
    localStorage.setItem(STORAGE_KEYS.EMAIL, email);
  };

  const logout = () => {
    setToken(null);
    setUserEmail(null);
    localStorage.removeItem(STORAGE_KEYS.TOKEN);
    localStorage.removeItem(STORAGE_KEYS.EMAIL);
  };

  return (
    <AuthContext.Provider value={{ token, userEmail, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
