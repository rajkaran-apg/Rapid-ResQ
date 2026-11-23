import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { api, getToken, setToken, clearToken, setUnauthorizedHandler } from './api.js';
import { connectSocket, disconnectSocket } from './socket.js';

const Ctx = createContext(null);
export const useAuth = () => useContext(Ctx);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);

  const signOut = useCallback(() => { clearToken(); disconnectSocket(); setUser(null); }, []);
  useEffect(() => {
    setUnauthorizedHandler(signOut);
    if (!getToken()) return setReady(true);
    api('/auth/me').then(u => { setUser(u); connectSocket(getToken()); }).catch(clearToken).finally(() => setReady(true));
  }, [signOut]);

  const signIn = (token, u) => { setToken(token); setUser(u); connectSocket(token); };
  const logout = async () => { try { await api('/auth/logout', { method: 'POST' }); } catch { /* ignore */ } signOut(); };
  return <Ctx.Provider value={{ user, ready, signIn, logout }}>{children}</Ctx.Provider>;
}
