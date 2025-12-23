'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useWallet } from '@/context/WalletContext';

export default function Header() {
    const { isConnected, address, connect, disconnect } = useWallet();
    const pathname = usePathname();

    return (
        <header className="header">
            <div className="logo">
                <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', textDecoration: 'none' }}>
                    <span className="logo-icon">🎯</span>
                    <span className="logo-text">Stacks Prediction</span>
                </Link>
            </div>

            <nav className="nav-links">
                <Link href="/" className={`nav-link ${pathname === '/' ? 'active' : ''}`}>
                    Bet
                </Link>
                <Link href="/admin" className={`nav-link ${pathname === '/admin' ? 'active' : ''}`}>
                    Admin
                </Link>
            </nav>

            <div className="wallet-section">
                {isConnected ? (
                    <div className="wallet-connected">
                        <span className="wallet-address">
                            {address?.slice(0, 6)}...{address?.slice(-4)}
                        </span>
                        <button onClick={disconnect} className="disconnect-btn">
                            Disconnect
                        </button>
                    </div>
                ) : (
                    <button onClick={connect} className="connect-btn">
                        Connect Wallet
                    </button>
                )}
            </div>
        </header>
    );
}
