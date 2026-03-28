import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import type { User } from "@shared/schema";

interface AuthContextType {
  user: User | null;
  login: (user: User, token?: string) => void;
  logout: () => void;
  setUser: (user: User) => void;
  refreshUser: () => Promise<void>;
  isAuthenticated: boolean;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function getAuthToken(): string | null {
  return localStorage.getItem("authToken");
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (stored) {
      try {
        const parsedUser = JSON.parse(stored);
        fetch(`/api/users/${parsedUser.id}`)
          .then(res => {
            if (res.ok) {
              return res.json();
            }
            throw new Error("User not found");
          })
          .then(validUser => {
            setUser(validUser);
            localStorage.setItem("user", JSON.stringify(validUser));
          })
          .catch(() => {
            localStorage.removeItem("user");
            localStorage.removeItem("authToken");
            setUser(null);
          })
          .finally(() => setIsLoading(false));
      } catch {
        localStorage.removeItem("user");
        localStorage.removeItem("authToken");
        setIsLoading(false);
      }
    } else {
      setIsLoading(false);
    }
  }, []);

  const login = (user: User, token?: string) => {
    setUser(user);
    localStorage.setItem("user", JSON.stringify(user));
    if (token) {
      localStorage.setItem("authToken", token);
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("user");
    localStorage.removeItem("authToken");
    localStorage.removeItem("verifyToken");
  };

  const updateUser = (updatedUser: User) => {
    setUser(updatedUser);
    localStorage.setItem("user", JSON.stringify(updatedUser));
  };

  const refreshUser = async () => {
    if (!user?.id) return;
    try {
      const res = await fetch(`/api/users/${user.id}`);
      if (res.ok) {
        const freshUser = await res.json();
        setUser(freshUser);
        localStorage.setItem("user", JSON.stringify(freshUser));
      }
    } catch (error) {
      console.error("Failed to refresh user:", error);
    }
  };

  if (isLoading) {
    return null;
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        logout,
        setUser: updateUser,
        refreshUser,
        isAuthenticated: !!user,
        isLoading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
