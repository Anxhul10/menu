import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { api, clearToken, getToken, setToken } from "../api/client";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(Boolean(getToken()));

  useEffect(() => {
    if (!getToken()) return;
    api
      .me()
      .then(setSession)
      .catch(() => {
        clearToken();
        setSession(null);
      })
      .finally(() => setLoading(false));
  }, []);

  async function authenticate(method, body) {
    const result = await api[method](body);
    setToken(result.token);
    setSession({ user: result.user, restaurants: result.restaurants });
    return result;
  }

  function logout() {
    clearToken();
    setSession(null);
  }

  const value = useMemo(
    () => ({
      session,
      loading,
      login: (body) => authenticate("login", body),
      register: (body) => authenticate("register", body),
      logout,
    }),
    [session, loading],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
