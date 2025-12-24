'use client';

import { useEffect, useState } from 'react';
import Header from "@/components/Header";
import AdminPanel from "@/components/AdminPanel";
import { useWallet } from '@/context/WalletContext';
import { CONTRACT_ADDRESS } from '@/config';

// Only this wallet can access admin page
const ADMIN_WALLET = CONTRACT_ADDRESS;

export default function AdminPage() {
    const { isConnected, address, connect } = useWallet();
    const [isAdmin, setIsAdmin] = useState(false);
    const [isChecking, setIsChecking] = useState(true);

    useEffect(() => {
        setIsChecking(true);
        if (isConnected && address) {
            // Check if connected wallet is the admin wallet
            const isAdminWallet = address.toLowerCase() === ADMIN_WALLET.toLowerCase();
            setIsAdmin(isAdminWallet);
        } else {
            setIsAdmin(false);
        }
        setIsChecking(false);
    }, [isConnected, address]);

    // Not connected - show connect prompt
    if (!isConnected) {
        return (
            <>
                <Header />
                <main className="main admin-main">
                    <div className="admin-access-denied">
                        <div className="access-icon">🔒</div>
                        <h2>Admin Access Required</h2>
                        <p>Connect with the admin wallet to access this page.</p>
                        <button className="connect-admin-btn" onClick={connect}>
                            Connect Admin Wallet
                        </button>
                    </div>
                </main>
            </>
        );
    }

    // Connected but checking
    if (isChecking) {
        return (
            <>
                <Header />
                <main className="main admin-main">
                    <div className="admin-access-denied">
                        <div className="spinner" />
                        <p>Checking admin access...</p>
                    </div>
                </main>
            </>
        );
    }

    // Connected but not admin
    if (!isAdmin) {
        return (
            <>
                <Header />
                <main className="main admin-main">
                    <div className="admin-access-denied">
                        <div className="access-icon">⛔</div>
                        <h2>Access Denied</h2>
                        <p>This page is restricted to the contract owner.</p>
                        <div className="wallet-mismatch">
                            <div className="address-row">
                                <span className="label">Your wallet:</span>
                                <code>{address?.slice(0, 12)}...{address?.slice(-8)}</code>
                            </div>
                            <div className="address-row">
                                <span className="label">Admin wallet:</span>
                                <code>{ADMIN_WALLET.slice(0, 12)}...{ADMIN_WALLET.slice(-8)}</code>
                            </div>
                        </div>
                        <a href="/" className="back-link">← Back to Betting</a>
                    </div>
                </main>
            </>
        );
    }

    // Admin - show full panel
    return (
        <>
            <Header />
            <main className="main admin-main">
                <div className="hero">
                    <h1>Admin Dashboard</h1>
                    <p>Manage prediction market rounds</p>
                </div>
                <AdminPanel />
                <footer className="footer">
                    <p><a href="/">← Back to Betting</a></p>
                </footer>
            </main>
        </>
    );
}
