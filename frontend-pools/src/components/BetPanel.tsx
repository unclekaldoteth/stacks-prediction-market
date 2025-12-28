'use client';

import { useState, useEffect } from 'react';
import { Pool, getUserBet, UserBet } from '@/services/poolsService';
import { useWallet } from '@/context/WalletContext';
import { CONTRACT_ADDRESS, CONTRACT_NAME_POOLS, formatTokenAmount, getTokenSymbol, TOKEN_USDCX, HIRO_API } from '@/config';
import { uintCV } from '@stacks/transactions';

interface BetPanelProps {
    pool: Pool;
    onClose: () => void;
}

export default function BetPanel({ pool, onClose }: BetPanelProps) {
    const { isConnected, address, connect } = useWallet();
    const [betAmount, setBetAmount] = useState('');
    const [selectedOutcome, setSelectedOutcome] = useState<0 | 1>(0);
    const [userBet, setUserBet] = useState<UserBet | null>(null);
    const [loading, setLoading] = useState(false);
    const [currentBlock, setCurrentBlock] = useState(0);

    const isExpired = currentBlock > pool.expiry;
    const totalPool = pool.totalA + pool.totalB;

    useEffect(() => {
        const fetchData = async () => {
            // Get current block
            try {
                const blockResponse = await fetch(`${HIRO_API}/extended/v1/block?limit=1`);
                const blockData = await blockResponse.json();
                if (blockData.results?.[0]?.height) {
                    setCurrentBlock(blockData.results[0].height);
                }
            } catch (error) {
                console.error('Failed to get block height:', error);
            }

            // Get user bet
            if (address && pool) {
                const bet = await getUserBet(pool.poolId, address);
                setUserBet(bet);
            }
        };

        fetchData();
    }, [address, pool]);

    const handlePlaceBet = async () => {
        if (!isConnected || !address) {
            connect();
            return;
        }

        const amountMicro = Math.floor(parseFloat(betAmount) * 1000000);
        if (isNaN(amountMicro) || amountMicro < 1000000) {
            alert('Minimum bet is 1 token');
            return;
        }

        setLoading(true);
        try {
            const { request } = await import('@stacks/connect');

            await request(
                {},
                'stx_callContract',
                {
                    contract: `${CONTRACT_ADDRESS}.${CONTRACT_NAME_POOLS}`,
                    functionName: 'place-bet',
                    functionArgs: [
                        uintCV(pool.poolId),
                        uintCV(selectedOutcome),
                        uintCV(amountMicro),
                    ],
                    postConditionMode: 'allow',
                }
            );

            alert('Bet transaction submitted!');
            setBetAmount('');
        } catch (error) {
            console.error('Failed to place bet:', error);
            alert('Failed to place bet. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleClaimWinnings = async () => {
        if (!isConnected || !address) return;

        setLoading(true);
        try {
            const { request } = await import('@stacks/connect');

            await request(
                {},
                'stx_callContract',
                {
                    contract: `${CONTRACT_ADDRESS}.${CONTRACT_NAME_POOLS}`,
                    functionName: 'claim-winnings',
                    functionArgs: [uintCV(pool.poolId)],
                    postConditionMode: 'allow',
                }
            );

            alert('Claim transaction submitted!');
        } catch (error) {
            console.error('Failed to claim:', error);
            alert('Failed to claim. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleRequestRefund = async () => {
        if (!isConnected || !address) return;

        setLoading(true);
        try {
            const { request } = await import('@stacks/connect');

            await request(
                {},
                'stx_callContract',
                {
                    contract: `${CONTRACT_ADDRESS}.${CONTRACT_NAME_POOLS}`,
                    functionName: 'request-refund',
                    functionArgs: [uintCV(pool.poolId)],
                    postConditionMode: 'allow',
                }
            );

            alert('Refund transaction submitted!');
        } catch (error) {
            console.error('Failed to request refund:', error);
            alert('Failed to request refund. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const calculatePotentialPayout = () => {
        const amountMicro = Math.floor(parseFloat(betAmount) * 1000000);
        if (isNaN(amountMicro) || amountMicro <= 0 || totalPool === 0) return 0;

        const winningPool = selectedOutcome === 0 ? pool.totalA + amountMicro : pool.totalB + amountMicro;
        const newTotalPool = totalPool + amountMicro;
        const share = (amountMicro * newTotalPool * 0.97) / winningPool; // 3% fee
        return share;
    };

    const userTotalBet = userBet ? userBet.amountA + userBet.amountB : 0;
    const isWinner = pool.settled && pool.winningOutcome !== null && userBet &&
        (pool.winningOutcome === 0 ? userBet.amountA > 0 : userBet.amountB > 0);

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl border border-white/10 max-w-lg w-full max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="p-6 border-b border-white/10">
                    <div className="flex justify-between items-start">
                        <div>
                            <div className="flex gap-2 mb-2">
                                <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-400 text-xs">
                                    {pool.category}
                                </span>
                                <span className={`px-2 py-0.5 rounded text-xs ${pool.tokenType === TOKEN_USDCX
                                    ? 'bg-green-500/20 text-green-400'
                                    : 'bg-orange-500/20 text-orange-400'
                                    }`}>
                                    {getTokenSymbol(pool.tokenType)}
                                </span>
                            </div>
                            <h2 className="text-xl font-bold text-white">{pool.title}</h2>
                            <p className="text-sm text-gray-400 mt-1">{pool.description}</p>
                        </div>
                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-white transition-colors"
                        >
                            ✕
                        </button>
                    </div>
                </div>

                {/* Pool Stats */}
                <div className="p-6 border-b border-white/10">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-blue-500/10 rounded-xl p-4 text-center">
                            <p className="text-sm text-gray-400 mb-1">{pool.outcomeA}</p>
                            <p className="text-2xl font-bold text-blue-400">
                                {formatTokenAmount(pool.totalA, pool.tokenType)}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                                {totalPool > 0 ? ((pool.totalA / totalPool) * 100).toFixed(1) : 50}%
                            </p>
                        </div>
                        <div className="bg-pink-500/10 rounded-xl p-4 text-center">
                            <p className="text-sm text-gray-400 mb-1">{pool.outcomeB}</p>
                            <p className="text-2xl font-bold text-pink-400">
                                {formatTokenAmount(pool.totalB, pool.tokenType)}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                                {totalPool > 0 ? ((pool.totalB / totalPool) * 100).toFixed(1) : 50}%
                            </p>
                        </div>
                    </div>
                </div>

                {/* User Bet Info */}
                {userBet && userTotalBet > 0 && (
                    <div className="p-6 border-b border-white/10">
                        <h3 className="text-sm font-medium text-gray-400 mb-3">Your Bets</h3>
                        <div className="space-y-2">
                            {userBet.amountA > 0 && (
                                <div className="flex justify-between items-center">
                                    <span className="text-blue-400">{pool.outcomeA}</span>
                                    <span className="text-white">{formatTokenAmount(userBet.amountA, pool.tokenType)}</span>
                                </div>
                            )}
                            {userBet.amountB > 0 && (
                                <div className="flex justify-between items-center">
                                    <span className="text-pink-400">{pool.outcomeB}</span>
                                    <span className="text-white">{formatTokenAmount(userBet.amountB, pool.tokenType)}</span>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Actions */}
                <div className="p-6">
                    {pool.settled ? (
                        // Settled pool - claim or view
                        <div className="text-center">
                            <div className="mb-4">
                                <span className="text-green-400 text-lg">
                                    Winner: {pool.winningOutcome === 0 ? pool.outcomeA : pool.outcomeB}
                                </span>
                            </div>
                            {isWinner && (
                                <button
                                    onClick={handleClaimWinnings}
                                    disabled={loading}
                                    className="w-full py-3 rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 text-white font-semibold hover:from-green-600 hover:to-emerald-600 transition-all disabled:opacity-50"
                                >
                                    {loading ? 'Processing...' : 'Claim Winnings 🎉'}
                                </button>
                            )}
                            {!isWinner && userTotalBet > 0 && (
                                <p className="text-gray-400">Better luck next time!</p>
                            )}
                        </div>
                    ) : isExpired ? (
                        // Expired but not settled - refund option
                        <div className="text-center">
                            <p className="text-red-400 mb-4">This pool has expired without settlement</p>
                            {userTotalBet > 0 && (
                                <button
                                    onClick={handleRequestRefund}
                                    disabled={loading}
                                    className="w-full py-3 rounded-xl bg-gradient-to-r from-orange-500 to-red-500 text-white font-semibold hover:from-orange-600 hover:to-red-600 transition-all disabled:opacity-50"
                                >
                                    {loading ? 'Processing...' : 'Request Refund'}
                                </button>
                            )}
                        </div>
                    ) : (
                        // Active pool - place bet
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    onClick={() => setSelectedOutcome(0)}
                                    className={`p-4 rounded-xl border-2 transition-all ${selectedOutcome === 0
                                        ? 'border-blue-500 bg-blue-500/20'
                                        : 'border-white/10 hover:border-white/30'
                                        }`}
                                >
                                    <p className="text-white font-medium">{pool.outcomeA}</p>
                                </button>
                                <button
                                    onClick={() => setSelectedOutcome(1)}
                                    className={`p-4 rounded-xl border-2 transition-all ${selectedOutcome === 1
                                        ? 'border-pink-500 bg-pink-500/20'
                                        : 'border-white/10 hover:border-white/30'
                                        }`}
                                >
                                    <p className="text-white font-medium">{pool.outcomeB}</p>
                                </button>
                            </div>

                            <div>
                                <label className="block text-sm text-gray-400 mb-2">
                                    Bet Amount ({getTokenSymbol(pool.tokenType)})
                                </label>
                                <input
                                    type="number"
                                    value={betAmount}
                                    onChange={(e) => setBetAmount(e.target.value)}
                                    placeholder="Enter amount"
                                    min="1"
                                    step="0.1"
                                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none"
                                />
                                {betAmount && parseFloat(betAmount) >= 1 && (
                                    <p className="text-sm text-gray-400 mt-2">
                                        Potential payout: ~{formatTokenAmount(calculatePotentialPayout(), pool.tokenType)}
                                    </p>
                                )}
                            </div>

                            <button
                                onClick={handlePlaceBet}
                                disabled={loading || !betAmount || parseFloat(betAmount) < 1}
                                className="w-full py-4 rounded-xl bg-gradient-to-r from-purple-500 to-blue-500 text-white font-semibold hover:from-purple-600 hover:to-blue-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loading ? 'Processing...' : !isConnected ? 'Connect Wallet' : 'Place Bet'}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
