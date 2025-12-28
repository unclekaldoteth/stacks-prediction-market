'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useWallet } from '@/context/WalletContext';
import { WalletProvider } from '@/context/WalletContext';
import { getAllPools, Pool } from '@/services/poolsService';
import { CONTRACT_ADDRESS, CONTRACT_NAME_POOLS, formatTokenAmount, getTokenSymbol } from '@/config';
import { uintCV } from '@stacks/transactions';

// Admin wallet address
const ADMIN_ADDRESS = 'SP1ZGGS886YCZHMFXJR1EK61ZP34FNWNSX32N685T';

function AdminContent() {
    const { isConnected, address, connect } = useWallet();
    const [pools, setPools] = useState<Pool[]>([]);
    const [loading, setLoading] = useState(true);
    const [settlingPoolId, setSettlingPoolId] = useState<number | null>(null);

    const isAdmin = address === ADMIN_ADDRESS;

    useEffect(() => {
        const fetchPools = async () => {
            try {
                const allPools = await getAllPools();
                // Show only active (not settled) pools
                setPools(allPools.filter(p => !p.settled));
            } catch (error) {
                console.error('Failed to fetch pools:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchPools();
    }, []);

    const handleSettlePool = async (poolId: number, winningOutcome: 0 | 1) => {
        if (!isConnected || !isAdmin) return;

        setSettlingPoolId(poolId);
        try {
            const { request } = await import('@stacks/connect');

            await request(
                {},
                'stx_callContract',
                {
                    contract: `${CONTRACT_ADDRESS}.${CONTRACT_NAME_POOLS}`,
                    functionName: 'settle-pool',
                    functionArgs: [
                        uintCV(poolId),
                        uintCV(winningOutcome),
                    ],
                    postConditionMode: 'allow',
                }
            );

            alert('Settlement transaction submitted!');
            // Refresh pools after settlement
            const allPools = await getAllPools();
            setPools(allPools.filter(p => !p.settled));
        } catch (error) {
            console.error('Failed to settle pool:', error);
            alert('Failed to settle pool. Please try again.');
        } finally {
            setSettlingPoolId(null);
        }
    };

    const handleClaimCreatorDeposit = async (poolId: number) => {
        if (!isConnected || !isAdmin) return;

        setSettlingPoolId(poolId);
        try {
            const { request } = await import('@stacks/connect');

            await request(
                {},
                'stx_callContract',
                {
                    contract: `${CONTRACT_ADDRESS}.${CONTRACT_NAME_POOLS}`,
                    functionName: 'claim-creator-deposit',
                    functionArgs: [uintCV(poolId)],
                    postConditionMode: 'allow',
                }
            );

            alert('Claim transaction submitted!');
        } catch (error) {
            console.error('Failed to claim deposit:', error);
            alert('Failed to claim deposit. Please try again.');
        } finally {
            setSettlingPoolId(null);
        }
    };

    if (!isConnected) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900/20 to-gray-900 flex items-center justify-center">
                <div className="bg-gray-800/50 rounded-2xl border border-white/10 p-8 text-center max-w-md">
                    <h1 className="text-2xl font-bold text-white mb-4">Admin Panel</h1>
                    <p className="text-gray-400 mb-6">Connect your wallet to access admin functions</p>
                    <button
                        onClick={connect}
                        className="px-6 py-3 rounded-xl bg-gradient-to-r from-purple-500 to-blue-500 text-white font-semibold hover:from-purple-600 hover:to-blue-600 transition-all"
                    >
                        Connect Wallet
                    </button>
                </div>
            </div>
        );
    }

    if (!isAdmin) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900/20 to-gray-900 flex items-center justify-center">
                <div className="bg-red-900/20 rounded-2xl border border-red-500/30 p-8 text-center max-w-md">
                    <h1 className="text-2xl font-bold text-red-400 mb-4">Access Denied</h1>
                    <p className="text-gray-400 mb-2">This page is only accessible to the admin wallet.</p>
                    <p className="text-xs text-gray-500 break-all">
                        Connected: {address}
                    </p>
                    <p className="text-xs text-gray-500 mt-2">
                        Required: {ADMIN_ADDRESS}
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900/20 to-gray-900 p-8">
            <div className="max-w-6xl mx-auto">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-white">Admin Panel</h1>
                        <p className="text-gray-400 mt-1">Manage prediction pools</p>
                    </div>
                    <div className="text-right">
                        <p className="text-xs text-gray-500">Connected as Admin</p>
                        <p className="text-sm text-green-400 font-mono">{address?.slice(0, 10)}...{address?.slice(-6)}</p>
                    </div>
                </div>

                {loading ? (
                    <div className="text-center py-12">
                        <div className="animate-spin w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                        <p className="text-gray-400">Loading pools...</p>
                    </div>
                ) : pools.length === 0 ? (
                    <div className="bg-gray-800/50 rounded-2xl border border-white/10 p-8 text-center">
                        <p className="text-gray-400">No active pools to settle</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {pools.map(pool => (
                            <div key={pool.poolId} className="bg-gray-800/50 rounded-2xl border border-white/10 p-6">
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <div className="flex gap-2 mb-2">
                                            <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-400 text-xs">
                                                Pool #{pool.poolId}
                                            </span>
                                            <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 text-xs">
                                                {pool.category}
                                            </span>
                                            <span className="px-2 py-0.5 rounded bg-orange-500/20 text-orange-400 text-xs">
                                                {getTokenSymbol(pool.tokenType)}
                                            </span>
                                        </div>
                                        <h3 className="text-xl font-semibold text-white">{pool.title}</h3>
                                        <p className="text-gray-400 text-sm">{pool.description}</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4 mb-6">
                                    <div className="bg-blue-500/10 rounded-xl p-4">
                                        <p className="text-sm text-gray-400 mb-1">{pool.outcomeA}</p>
                                        <p className="text-xl font-bold text-blue-400">
                                            {formatTokenAmount(pool.totalA, pool.tokenType)}
                                        </p>
                                    </div>
                                    <div className="bg-pink-500/10 rounded-xl p-4">
                                        <p className="text-sm text-gray-400 mb-1">{pool.outcomeB}</p>
                                        <p className="text-xl font-bold text-pink-400">
                                            {formatTokenAmount(pool.totalB, pool.tokenType)}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex gap-3">
                                    <button
                                        onClick={() => handleSettlePool(pool.poolId, 0)}
                                        disabled={settlingPoolId === pool.poolId}
                                        className="flex-1 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 text-white font-medium hover:from-blue-600 hover:to-blue-700 transition-all disabled:opacity-50"
                                    >
                                        {settlingPoolId === pool.poolId ? 'Processing...' : `Settle: ${pool.outcomeA}`}
                                    </button>
                                    <button
                                        onClick={() => handleSettlePool(pool.poolId, 1)}
                                        disabled={settlingPoolId === pool.poolId}
                                        className="flex-1 py-3 rounded-xl bg-gradient-to-r from-pink-500 to-pink-600 text-white font-medium hover:from-pink-600 hover:to-pink-700 transition-all disabled:opacity-50"
                                    >
                                        {settlingPoolId === pool.poolId ? 'Processing...' : `Settle: ${pool.outcomeB}`}
                                    </button>
                                </div>

                                {pool.depositClaimed === false && (
                                    <button
                                        onClick={() => handleClaimCreatorDeposit(pool.poolId)}
                                        disabled={settlingPoolId === pool.poolId}
                                        className="w-full mt-3 py-2 rounded-xl bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-500/30 text-green-400 font-medium hover:from-green-500/30 hover:to-emerald-500/30 transition-all disabled:opacity-50"
                                    >
                                        Claim Creator Deposit
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                )}

                <div className="mt-8 text-center">
                    <Link href="/" className="text-purple-400 hover:text-purple-300 transition-colors">
                        ← Back to Home
                    </Link>
                </div>
            </div>
        </div>
    );
}

export default function AdminPage() {
    return (
        <WalletProvider>
            <AdminContent />
        </WalletProvider>
    );
}
