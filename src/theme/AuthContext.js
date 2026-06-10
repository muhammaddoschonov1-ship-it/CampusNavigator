import React, { createContext, useContext } from 'react';

const AuthContext = createContext({
  user: null,
  onLogout: () => {},
});

export function AuthProvider({ user, onLogout, children }) {
  return (
    <AuthContext.Provider value={{ user, onLogout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
