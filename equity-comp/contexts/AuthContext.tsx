import React, { createContext, useContext, useState } from 'react';
import { User } from 'firebase/auth';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  logout: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Initialize with a mock user immediately to bypass login
  const [user] = useState<User | null>({
    uid: 'demo-advisor-id',
    email: 'advisor@demo.com',
    emailVerified: true,
    isAnonymous: false,
    metadata: {},
    providerData: [],
    refreshToken: '',
    tenantId: null,
    delete: async () => {},
    getIdToken: async () => '',
    getIdTokenResult: async () => ({} as any),
    reload: async () => {},
    toJSON: () => ({}),
    displayName: 'Demo Advisor',
    phoneNumber: null,
    photoURL: null,
    providerId: 'custom',
  } as unknown as User);

  const [loading] = useState(false);

  const logout = async () => {
    // No-op for demo mode
    console.log("Logout clicked (Demo Mode)");
  };

  return (
    <AuthContext.Provider value={{ user, loading, logout }}>
      {children}
    </AuthContext.Provider>
  );
};