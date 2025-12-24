'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useWallet } from '@/context/WalletContext';
import { MAGIC_API_KEY, CONTRACT_ADDRESS } from '@/config';

type OAuthProvider = 'google' | 'github' | 'facebook' | 'apple';

export default function Header() {
    const { isConnected, address, email, loginMethod, connect, connectWithEmail, connectWithSocial, disconnect, isLoading } = useWallet();
    const pathname = usePathname();
    const [showLoginModal, setShowLoginModal] = useState(false);
    const [emailInput, setEmailInput] = useState('');
    const [emailLoading, setEmailLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleEmailLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!emailInput) return;

        setEmailLoading(true);
        setError(null);

        try {
            await connectWithEmail(emailInput);
            setShowLoginModal(false);
            setEmailInput('');
        } catch (err) {
            setError('Failed to send magic link. Please try again.');
            console.error(err);
        } finally {
            setEmailLoading(false);
        }
    };

    const handleSocialLogin = async (provider: OAuthProvider) => {
        setError(null);
        try {
            await connectWithSocial(provider);
        } catch (err) {
            setError(`Failed to login with ${provider}. Please try again.`);
            console.error(err);
        }
    };

    const handleWalletLogin = () => {
        connect();
        setShowLoginModal(false);
    };

    const displayAddress = address ? `${address.slice(0, 6)}...${address.slice(-4)}` : '';

    return (
        <>
            <header className="header">
                <div className="logo">
                    <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', textDecoration: 'none' }}>
                        <span className="logo-icon">*</span>
                        <span className="logo-text">Stacks Prediction</span>
                    </Link>
                </div>

                <nav className="nav-links">
                    <Link href="/" className={`nav-link ${pathname === '/' ? 'active' : ''}`}>
                        Bet
                    </Link>
                    {isConnected && address?.toLowerCase() === CONTRACT_ADDRESS.toLowerCase() && (
                        <Link href="/admin" className={`nav-link ${pathname === '/admin' ? 'active' : ''}`}>
                            Admin
                        </Link>
                    )}
                </nav>

                <div className="wallet-section">
                    {isLoading ? (
                        <div className="loading-spinner">Loading...</div>
                    ) : isConnected ? (
                        <div className="wallet-connected">
                            <div className="wallet-info">
                                {(loginMethod === 'email' || loginMethod === 'social') && email && (
                                    <span className="wallet-email">{email}</span>
                                )}
                                <span className="wallet-address">{displayAddress}</span>
                            </div>
                            <button onClick={disconnect} className="disconnect-btn">
                                Disconnect
                            </button>
                        </div>
                    ) : (
                        <button onClick={() => setShowLoginModal(true)} className="connect-btn">
                            Connect
                        </button>
                    )}
                </div>
            </header>

            {/* Login Modal */}
            {showLoginModal && (
                <div className="login-modal-overlay" onClick={() => setShowLoginModal(false)}>
                    <div className="login-modal" onClick={(e) => e.stopPropagation()}>
                        <button className="modal-close" onClick={() => setShowLoginModal(false)}>x</button>
                        <h2>Connect</h2>

                        {error && <p className="login-error" style={{ textAlign: 'center', marginBottom: '1rem' }}>{error}</p>}

                        {/* Social Login Section */}
                        {MAGIC_API_KEY && (
                            <>
                                <div className="login-section">
                                    <h3>Continue with</h3>
                                    <div className="social-buttons">
                                        <button
                                            onClick={() => handleSocialLogin('google')}
                                            className="social-btn google"
                                            disabled={isLoading}
                                        >
                                            <svg viewBox="0 0 24 24" width="20" height="20">
                                                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                                            </svg>
                                            <span>Google</span>
                                        </button>
                                    </div>
                                </div>

                                <div className="login-divider">
                                    <span>or</span>
                                </div>

                                {/* Email Login Section */}
                                <div className="login-section">
                                    <h3>Login with Email</h3>
                                    <form onSubmit={handleEmailLogin} className="email-form">
                                        <input
                                            type="email"
                                            placeholder="Enter your email"
                                            value={emailInput}
                                            onChange={(e) => setEmailInput(e.target.value)}
                                            disabled={emailLoading}
                                            className="email-input"
                                        />
                                        <button type="submit" disabled={emailLoading || !emailInput} className="email-submit">
                                            {emailLoading ? 'Sending...' : 'Send Magic Link'}
                                        </button>
                                    </form>
                                </div>

                                <div className="login-divider">
                                    <span>or</span>
                                </div>
                            </>
                        )}

                        {/* Wallet Login Section */}
                        <div className="login-section">
                            <h3>Connect Wallet</h3>
                            <button onClick={handleWalletLogin} className="wallet-login-btn">
                                <span className="wallet-icon">W</span>
                                <span>Stacks Wallet</span>
                            </button>
                            <p className="wallet-hint">Leather, Xverse, or WalletConnect</p>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
