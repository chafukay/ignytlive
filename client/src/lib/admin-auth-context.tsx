import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import type { AdminUser } from "@shared/schema";

interface AdminAuthContextType {
  admin: AdminUser | null;
  token: string | null;
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  isAuthenticated: boolean;
  isLoading: boolean;
}

const AdminAuthContext = createContext<AdminAuthContextType | undefined>(undefined);

export function adminFetch(url: string, token: string, options?: RequestInit): Promise<Response> {
  return fetch(url, {
    ...options,
    headers: {
      ...options?.headers,
      "Authorization": `Bearer ${token}`,
    },
  });
}

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const storedToken = localStorage.getItem("adminToken");
    if (storedToken) {
      fetch("/api/admin/auth/me", {
        headers: { "Authorization": `Bearer ${storedToken}` },
      })
        .then(res => {
          if (res.ok) return res.json();
          throw new Error("Invalid admin session");
        })
        .then(validAdmin => {
          setAdmin(validAdmin);
          setToken(storedToken);
        })
        .catch(() => {
          localStorage.removeItem("adminToken");
          setAdmin(null);
          setToken(null);
        })
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, []);

  const login = async (username: string, password: string) => {
    try {
      const res = await fetch("/api/admin/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      if (!res.ok) {
        const data = await res.json();
        return { success: false, error: data.error || "Login failed" };
      }
      const data = await res.json();
      const { token: newToken, ...adminData } = data;
      setAdmin(adminData);
      setToken(newToken);
      localStorage.setItem("adminToken", newToken);
      return { success: true };
    } catch {
      return { success: false, error: "Network error" };
    }
  };

  const logout = () => {
    if (token) {
      fetch("/api/admin/auth/logout", {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` },
      }).catch(() => {});
    }
    setAdmin(null);
    setToken(null);
    localStorage.removeItem("adminToken");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <AdminAuthContext.Provider value={{ admin, token, login, logout, isAuthenticated: !!admin && !!token, isLoading }}>
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth() {
  const context = useContext(AdminAuthContext);
  if (!context) {
    throw new Error("useAdminAuth must be used within AdminAuthProvider");
  }
  return context;
}
