'use client';

import type { User } from '@/lib/types';
import React, { createContext, useState, useEffect } from 'react';
import { auth } from '@/lib/firebase/config';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';

export interface AuthContextType {
  user: User | null;
  firebaseUser: FirebaseUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  // We no longer need login/logout here as they are handled by firebase service
  // But we keep them for components that might still use them conceptually
  // They can be no-op or throw an error if direct usage is discouraged
  login: (user: User) => void;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      setFirebaseUser(fbUser);
      if (fbUser) {
        // Fetch user profile from Firestore
        const userDocRef = doc(db, 'users', fbUser.uid);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists()) {
          const userData = userDoc.data();
          setUser({
            uid: fbUser.uid,
            email: fbUser.email!,
            name: userData.name,
            role: userData.role,
          });
        } else {
            // This case might happen if user is created in Auth but not in Firestore
            setUser(null);
        }
      } else {
        setUser(null);
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Dummy implementations for login/logout to satisfy components
  // The actual sign-in/out logic is now in firebase services and pages
  const login = (userData: User) => {
    // This is now handled by onAuthStateChanged, but we might keep it for manual state updates if needed
    setUser(userData);
  };

  const logout = () => {
     // This is handled by firebase signOut and onAuthStateChanged
    setUser(null);
  };
  
  const value = {
    user,
    firebaseUser,
    isAuthenticated: !isLoading && !!user,
    isLoading,
    login,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
