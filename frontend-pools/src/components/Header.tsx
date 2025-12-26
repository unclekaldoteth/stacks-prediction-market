'use client';

import { useState } from 'react';
import { useWallet } from '@/context/WalletContext';

export default function Header() {
    const { isConnected, address, email, loginMethod, connect, connectWithGoogle, disconnect, isLoading } = useWallet();
    const [showLoginModal, setShowLoginModal] = useState(false);

    const formatAddress = (addr: string) => {
        return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
    };

    const displayName = email || (address ? formatAddress(address) : '');

    return (
        <>
            <header className="bg-gradient-to-r from-purple-900/50 to-blue-900/50 backdrop-blur-lg border-b border-white/10 sticky top-0 z-40">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16">
                        {/* Logo */}
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
                                <span className="text-white text-xl">🎯</span>
                            </div>
                            <div>
                                <h1 className="text-xl font-bold text-white">Stacks Predictions</h1>
                                <p className="text-xs text-gray-400">BTC Rounds & Multi-Pool Markets</p>
                            </div>
                        </div>

                        {/* Network Badge */}
                        <div className="hidden md:flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/20 border border-orange-500/30">
                            <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse"></div>
                            <span className="text-xs text-orange-400 font-medium">Testnet</span>
                        </div>

                        {/* Wallet/Login Button */}
                        {isConnected && address ? (
                            <div className="flex items-center gap-3">
                                <div className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 flex items-center gap-2">
                                    {loginMethod === 'social' && <span className="text-sm">🔗</span>}
                                    {loginMethod === 'email' && <span className="text-sm">✉️</span>}
                                    {loginMethod === 'wallet' && <span className="text-sm">👛</span>}
                                    <span className="text-sm text-gray-300 max-w-[120px] truncate">
                                        {displayName}
                                    </span>
                                </div>
                                <button
                                    onClick={disconnect}
                                    className="px-4 py-2 rounded-xl bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors text-sm font-medium"
                                >
                                    Logout
                                </button>
                            </div>
                        ) : (
                            <button
                                onClick={() => setShowLoginModal(true)}
                                disabled={isLoading}
                                className="px-6 py-2 rounded-xl bg-gradient-to-r from-purple-500 to-blue-500 text-white font-medium hover:from-purple-600 hover:to-blue-600 transition-all disabled:opacity-50"
                            >
                                {isLoading ? 'Connecting...' : 'Login / Connect'}
                            </button>
                        )}
                    </div>
                </div>
            </header>

            {/* Login Modal */}
            {showLoginModal && !isConnected && (
                <div
                    className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
                    onClick={() => setShowLoginModal(false)}
                >
                    <div
                        className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl border border-white/10 p-6 max-w-md w-full"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="text-center mb-6">
                            <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center mb-4">
                                <span className="text-3xl">🎯</span>
                            </div>
                            <h2 className="text-xl font-bold text-white">Welcome to Stacks Predictions</h2>
                            <p className="text-gray-400 text-sm mt-2">Connect to start predicting</p>
                        </div>

                        <div className="space-y-3">
                            {/* Google Login */}
                            <button
                                onClick={async () => {
                                    try {
                                        await connectWithGoogle();
                                    } catch (e) {
                                        console.error(e);
                                    }
                                }}
                                disabled={isLoading}
                                className="w-full py-3 px-4 rounded-xl bg-white text-gray-900 font-medium hover:bg-gray-100 transition-colors flex items-center justify-center gap-3 disabled:opacity-50"
                            >
                                <svg className="w-5 h-5" viewBox="0 0 24 24">
                                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                                </svg>
                                Continue with Google
                            </button>

                            <div className="flex items-center gap-4 my-4">
                                <div className="flex-1 h-px bg-white/10"></div>
                                <span className="text-gray-500 text-sm">or</span>
                                <div className="flex-1 h-px bg-white/10"></div>
                            </div>

                            {/* Wallet Connect */}
                            <button
                                onClick={() => {
                                    connect();
                                    setShowLoginModal(false);
                                }}
                                disabled={isLoading}
                                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-purple-500 to-blue-500 text-white font-medium hover:from-purple-600 hover:to-blue-600 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                            >
                                <span className="text-xl">👛</span>
                                Connect Stacks Wallet
                            </button>

                            <p className="text-center text-xs text-gray-500 mt-4">
                                By continuing, you agree to our Terms of Service
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
