'use client';

import { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react';
import { MAGIC_API_KEY } from '@/config';

interface WalletContextType {
    isConnected: boolean;
    address: string | null;
    email: string | null;
    loginMethod: 'wallet' | 'email' | 'social' | null;
    connect: () => void;
    connectWithEmail: (email: string) => Promise<void>;
    connectWithGoogle: () => Promise<void>;
    disconnect: () => void;
    isLoading: boolean;
}

const WalletContext = createContext<WalletContextType>({
    isConnected: false,
    address: null,
    email: null,
    loginMethod: null,
    connect: () => { },
    connectWithEmail: async () => { },
    connectWithGoogle: async () => { },
    disconnect: () => { },
    isLoading: false,
});

export function WalletProvider({ children }: { children: ReactNode }) {
    const [isConnected, setIsConnected] = useState(false);
    const [address, setAddress] = useState<string | null>(null);
    const [email, setEmail] = useState<string | null>(null);
    const [loginMethod, setLoginMethod] = useState<'wallet' | 'email' | 'social' | null>(null);
    const [isClient, setIsClient] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        setIsClient(true);

        const checkConnection = async () => {
            // Check Magic Link first
            if (MAGIC_API_KEY) {
                try {
                    const { Magic } = await import('magic-sdk');
                    const magic = new Magic(MAGIC_API_KEY);
                    const isLoggedIn = await magic.user.isLoggedIn();
                    if (isLoggedIn) {
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        const metadata = await (magic.user as any).getInfo();
                        if (metadata?.publicAddress) {
                            setIsConnected(true);
                            setAddress(metadata.publicAddress);
                            setEmail(metadata.email || null);
                            setLoginMethod('email');
                            return;
                        }
                    }
                } catch (err) {
                    console.log('Magic check failed:', err);
                }
            }

            // Check Stacks wallet
            try {
                const { isConnected: checkIsConnected, getLocalStorage } = await import('@stacks/connect');
                if (checkIsConnected()) {
                    const storage = getLocalStorage();
                    if (storage?.addresses?.stx?.[0]?.address) {
                        setIsConnected(true);
                        setAddress(storage.addresses.stx[0].address);
                        setLoginMethod('wallet');
                    }
                }
            } catch (err) {
                console.error('Failed to check connection:', err);
            }
        };

        checkConnection();
    }, []);

    // Handle OAuth redirect callback
    useEffect(() => {
        const handleOAuthCallback = async () => {
            if (!MAGIC_API_KEY || typeof window === 'undefined') return;

            const urlParams = new URLSearchParams(window.location.search);
            const hasOAuthCallback = urlParams.has('magic_oauth_request_id') ||
                urlParams.has('code') ||
                urlParams.has('state');

            if (!hasOAuthCallback) return;

            setIsLoading(true);
            try {
                const { Magic } = await import('magic-sdk');
                const { OAuthExtension } = await import('@magic-ext/oauth2');

                const magic = new Magic(MAGIC_API_KEY, {
                    extensions: [new OAuthExtension()],
                });

                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const result = await (magic as any).oauth2.getRedirectResult();

                if (result) {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const metadata = await (magic.user as any).getInfo();
                    if (metadata?.publicAddress) {
                        setIsConnected(true);
                        setAddress(metadata.publicAddress);
                        setEmail(metadata.email || null);
                        setLoginMethod('social');
                        window.history.replaceState({}, document.title, window.location.pathname);
                    }
                }
            } catch (err) {
                console.error('OAuth callback error:', err);
            } finally {
                setIsLoading(false);
            }
        };

        if (isClient) {
            handleOAuthCallback();
        }
    }, [isClient]);

    const connectWallet = useCallback(async () => {
        if (!isClient || typeof window === 'undefined') return;

        setIsLoading(true);
        try {
            // Use the connect() API from @stacks/connect v8.x
            const { connect, getLocalStorage } = await import('@stacks/connect');

            await connect();

            // Get address from localStorage after connection
            const userData = getLocalStorage();
            if (userData?.addresses?.stx?.[0]?.address) {
                setIsConnected(true);
                setAddress(userData.addresses.stx[0].address);
                setLoginMethod('wallet');
            }
        } catch (err) {
            console.error('Failed to connect wallet:', err);
        } finally {
            setIsLoading(false);
        }
    }, [isClient]);

    const connectWithEmail = useCallback(async (emailAddress: string) => {
        if (!isClient || typeof window === 'undefined' || !MAGIC_API_KEY) return;

        setIsLoading(true);
        try {
            const { Magic } = await import('magic-sdk');
            const magic = new Magic(MAGIC_API_KEY);

            await magic.auth.loginWithMagicLink({ email: emailAddress });
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const metadata = await (magic.user as any).getInfo();

            if (metadata?.publicAddress) {
                setIsConnected(true);
                setAddress(metadata.publicAddress);
                setEmail(emailAddress);
                setLoginMethod('email');
            }
        } catch (err) {
            console.error('Failed to connect with email:', err);
            throw err;
        } finally {
            setIsLoading(false);
        }
    }, [isClient]);

    const connectWithGoogle = useCallback(async () => {
        if (!isClient || typeof window === 'undefined' || !MAGIC_API_KEY) return;

        setIsLoading(true);
        try {
            const { Magic } = await import('magic-sdk');
            const { OAuthExtension } = await import('@magic-ext/oauth2');

            const magic = new Magic(MAGIC_API_KEY, {
                extensions: [new OAuthExtension()],
            });

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            await (magic as any).oauth2.loginWithRedirect({
                provider: 'google',
                redirectURI: window.location.origin,
            });
        } catch (err) {
            console.error('Failed to connect with Google:', err);
            setIsLoading(false);
            throw err;
        }
    }, [isClient]);

    const disconnectWallet = useCallback(async () => {
        try {
            if ((loginMethod === 'email' || loginMethod === 'social') && MAGIC_API_KEY) {
                const { Magic } = await import('magic-sdk');
                const magic = new Magic(MAGIC_API_KEY);
                await magic.user.logout();
            } else {
                const { disconnect: stacksDisconnect } = await import('@stacks/connect');
                stacksDisconnect();
            }
            setIsConnected(false);
            setAddress(null);
            setEmail(null);
            setLoginMethod(null);
        } catch (err) {
            console.error('Failed to disconnect:', err);
        }
    }, [loginMethod]);

    return (
        <WalletContext.Provider value={{
            isConnected,
            address,
            email,
            loginMethod,
            connect: connectWallet,
            connectWithEmail,
            connectWithGoogle,
            disconnect: disconnectWallet,
            isLoading,
        }}>
            {children}
        </WalletContext.Provider>
    );
}

export function useWallet() {
    return useContext(WalletContext);
}
