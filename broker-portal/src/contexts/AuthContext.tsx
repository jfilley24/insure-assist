"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, User as BaseFirebaseUser, signOut, sendSignInLinkToEmail } from "firebase/auth";
import { auth } from "@/lib/firebase";

export interface FirebaseUser extends BaseFirebaseUser {
    customClaims?: any;
    role?: 'broker_admin' | 'agent' | 'superadmin' | string;
    brokerId?: string;
}

interface AuthContextType {
    user: FirebaseUser | null;
    token: string | null;
    customClaims: Record<string, any> | null;
    loading: boolean;
    loginWithMagicLink: (email: string) => Promise<void>;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    token: null,
    customClaims: null,
    loading: true,
    loginWithMagicLink: async () => { },
    logout: async () => { },
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<FirebaseUser | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [customClaims, setCustomClaims] = useState<Record<string, any> | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            if (firebaseUser) {
                try {
                    // Try to force refresh custom claims
                    await firebaseUser.getIdToken(true);
                } catch (error) {
                    console.warn("Could not force refresh Firebase token (network error). Using cached token.", error);
                }

                try {
                    const decodedToken = await firebaseUser.getIdTokenResult();
                    const jwtToken = await firebaseUser.getIdToken();

                    setToken(jwtToken);
                    setCustomClaims(decodedToken.claims);
                    
                    const extendedUser = firebaseUser as FirebaseUser;
                    extendedUser.role = decodedToken.claims.role as string | undefined;
                    extendedUser.brokerId = decodedToken.claims.brokerId as string | undefined;
                    setUser(extendedUser);
                } catch (error) {
                    console.error("Failed to parse Firebase token", error);
                    // Fallback to setting just the user without claims if network fails
                    const extendedUser = firebaseUser as FirebaseUser;
                    setUser(extendedUser);
                    setToken(null);
                    setCustomClaims(null);
                }
            } else {
                setUser(null);
                setToken(null);
                setCustomClaims(null);
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const logout = async () => {
        await signOut(auth);
    };

    const loginWithMagicLink = async (email: string) => {
        const actionCodeSettings = {
            // URL must be whitelisted in the Firebase Console.
            url: window.location.origin + "/login/callback",
            handleCodeInApp: true,
        };
        await sendSignInLinkToEmail(auth, email, actionCodeSettings);
        window.localStorage.setItem('emailForSignIn', email);
    };

    return (
        <AuthContext.Provider value={{ user, token, customClaims, loading, loginWithMagicLink, logout }}>
            {children}
        </AuthContext.Provider>
    );
};
