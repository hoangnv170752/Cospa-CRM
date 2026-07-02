"use client";

import {
  createContext,
  useContext,
  useCallback,
  useSyncExternalStore,
  ReactNode,
} from "react";
import { setCrmToken, removeCrmToken } from "@/lib/crm";

const CRM_API_BASE_URL = process.env.NEXT_PUBLIC_CRM_API_URL || 'http://localhost:5001/api';

export interface CrmUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'sys_admin' | 'tenant_admin' | 'tenant_user' | 'customer_user';
  tenantId?: string;
}

interface LoginResult {
  requiresTwoFactor?: boolean;
  email?: string;
}

type OtpType = 'login' | 'two_factor';

interface CrmAuthContextType {
  user: CrmUser | null;
  token: string | null;
  isLoading: boolean;
  isLoggedIn: boolean;
  login: (email: string, password: string) => Promise<LoginResult | void>;
  logout: () => void;
  requestOtp: (email: string, type: OtpType) => Promise<void>;
  verifyOtp: (email: string, code: string, type: OtpType) => Promise<void>;
}

const CrmAuthContext = createContext<CrmAuthContextType | undefined>(undefined);

const CRM_USER_KEY = 'crm_user';
const CRM_TOKEN_KEY = 'crm_token';

// ---- Auth Store (external store for useSyncExternalStore) ----
// This avoids hydration mismatch: server snapshot always returns null,
// client reads from localStorage. Mutations notify subscribers to re-render.
let authListeners: Array<() => void> = [];

// Cache the parsed user and raw string to avoid creating new objects on every getSnapshot call
// useSyncExternalStore compares by reference, so returning new objects causes infinite loops
let cachedUserRaw: string | null = null;
let cachedUser: CrmUser | null = null;

function emitChange() {
  // Invalidate cache so next getSnapshot reads fresh data
  cachedUserRaw = null;
  cachedUser = null;
  for (const listener of authListeners) {
    listener();
  }
}

function authSubscribe(callback: () => void) {
  authListeners.push(callback);
  // Also listen for cross-tab storage changes
  const storageHandler = () => {
    // Invalidate cache on storage changes
    cachedUserRaw = null;
    cachedUser = null;
    callback();
  };
  window.addEventListener('storage', storageHandler);
  return () => {
    authListeners = authListeners.filter((l) => l !== callback);
    window.removeEventListener('storage', storageHandler);
  };
}

function getSnapshotUser(): CrmUser | null {
  const stored = localStorage.getItem(CRM_USER_KEY);
  // Return cached result if raw value hasn't changed
  if (stored === cachedUserRaw) {
    return cachedUser;
  }
  // Update cache
  cachedUserRaw = stored;
  if (!stored) {
    cachedUser = null;
    return null;
  }
  try {
    cachedUser = JSON.parse(stored);
    return cachedUser;
  } catch {
    cachedUser = null;
    return null;
  }
}

function getSnapshotToken(): string | null {
  return localStorage.getItem(CRM_TOKEN_KEY);
}

function getServerSnapshotUser(): CrmUser | null {
  return null;
}

function getServerSnapshotToken(): string | null {
  return null;
}

// ---- Provider ----
export function CrmAuthProvider({ children }: { children: ReactNode }) {
  const user = useSyncExternalStore(
    authSubscribe,
    getSnapshotUser,
    getServerSnapshotUser
  );
  const token = useSyncExternalStore(
    authSubscribe,
    getSnapshotToken,
    getServerSnapshotToken
  );

  const login = useCallback(async (email: string, password: string): Promise<LoginResult | void> => {
    const response = await fetch(`${CRM_API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Login failed' }));
      throw new Error(error.message || 'Login failed');
    }

    const data = await response.json();

    // Check if 2FA is required
    if (data.requiresTwoFactor) {
      return { requiresTwoFactor: true, email: data.email };
    }

    const { token: newToken, user: userData } = data;

    // Write to localStorage and notify subscribers
    setCrmToken(newToken);
    localStorage.setItem(CRM_USER_KEY, JSON.stringify(userData));
    emitChange();
  }, []);

  const requestOtp = useCallback(async (email: string, type: OtpType) => {
    const response = await fetch(`${CRM_API_BASE_URL}/auth/otp/request`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, type }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Failed to send OTP' }));
      throw new Error(error.message || 'Failed to send OTP');
    }
  }, []);

  const verifyOtp = useCallback(async (email: string, code: string, type: OtpType) => {
    const response = await fetch(`${CRM_API_BASE_URL}/auth/otp/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, code, type }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Invalid verification code' }));
      throw new Error(error.message || 'Invalid verification code');
    }

    const data = await response.json();
    const { token: newToken, user: userData } = data;

    // Write to localStorage and notify subscribers
    setCrmToken(newToken);
    localStorage.setItem(CRM_USER_KEY, JSON.stringify(userData));
    emitChange();
  }, []);

  const logout = useCallback(() => {
    removeCrmToken();
    localStorage.removeItem(CRM_USER_KEY);
    emitChange();
  }, []);

  return (
    <CrmAuthContext.Provider
      value={{
        user,
        token,
        isLoading: false,
        isLoggedIn: !!user,
        login,
        logout,
        requestOtp,
        verifyOtp,
      }}
    >
      {children}
    </CrmAuthContext.Provider>
  );
}

export function useCrmAuth() {
  const context = useContext(CrmAuthContext);
  if (context === undefined) {
    throw new Error("useCrmAuth must be used within a CrmAuthProvider");
  }
  return context;
}
