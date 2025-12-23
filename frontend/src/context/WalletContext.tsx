'use client';

import { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react';
import { WALLETCONNECT_PROJECT_ID } from '@/config';

interface WalletContextType {
    isConnected: boolean;
    address: string | null;
    connect: () => void;
    disconnect: () => void;
}

const WalletContext = createContext<WalletContextType>({
    isConnected: false,
    address: null,
    connect: () => { },
    disconnect: () => { },
});

export function WalletProvider({ children }: { children: ReactNode }) {
    const [isConnected, setIsConnected] = useState(false);
    const [address, setAddress] = useState<string | null>(null);
    const [isClient, setIsClient] = useState(false);

    useEffect(() => {
        setIsClient(true);

        // Check if already connected on mount
        const checkConnection = async () => {
            try {
                const { isConnected: checkIsConnected, getLocalStorage } = await import('@stacks/connect');

                if (checkIsConnected()) {
                    const storage = getLocalStorage();
                    if (storage?.addresses?.stx?.[0]?.address) {
                        setIsConnected(true);
                        setAddress(storage.addresses.stx[0].address);
                    }
                }
            } catch (err) {
                console.error('Failed to check connection:', err);
            }
        };

        checkConnection();
    }, []);

    const connectWallet = useCallback(async () => {
        if (!isClient || typeof window === 'undefined') return;

        try {
            const { request, getLocalStorage } = await import('@stacks/connect');

            // Use request with WalletConnect configuration
            const response = await request(
                {
                    forceWalletSelect: true,
                    walletConnect: {
                        projectId: WALLETCONNECT_PROJECT_ID,
                    },
                },
                'getAddresses',
                {}
            );

            if (response && response.addresses && response.addresses.length > 0) {
                setIsConnected(true);
                // Find STX address - symbol may be undefined
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const stxAddress = response.addresses.find((addr: any) => addr.symbol === 'STX');
                if (stxAddress) {
                    setAddress(stxAddress.address);
                } else {
                    setAddress(response.addresses[0].address);
                }
            } else {
                // Fallback: check storage
                const storage = getLocalStorage();
                if (storage?.addresses?.stx?.[0]?.address) {
                    setIsConnected(true);
                    setAddress(storage.addresses.stx[0].address);
                }
            }
        } catch (err) {
            console.error('Failed to connect wallet:', err);
        }
    }, [isClient]);

    const disconnectWallet = useCallback(async () => {
        try {
            const { disconnect: stacksDisconnect } = await import('@stacks/connect');
            stacksDisconnect();
            setIsConnected(false);
            setAddress(null);
        } catch (err) {
            console.error('Failed to disconnect:', err);
        }
    }, []);

    return (
        <WalletContext.Provider value={{ isConnected, address, connect: connectWallet, disconnect: disconnectWallet }}>
            {children}
        </WalletContext.Provider>
    );
}

export function useWallet() {
    return useContext(WalletContext);
}
