'use client';

import { useState, useEffect } from 'react';
import { Round, getAllRounds, getBTCPrice } from '@/services/roundsService';
import { useWallet } from '@/context/WalletContext';
import { CONTRACT_ADDRESS, CONTRACT_NAME_ROUNDS, formatSTX, DIRECTION_UP, DIRECTION_DOWN } from '@/config';
import { uintCV } from '@stacks/transactions';

export default function RoundsPanel() {
    const { isConnected, address, connect } = useWallet();
    const [rounds, setRounds] = useState<Round[]>([]);
    const [loading, setLoading] = useState(true);
    const [btcPrice, setBtcPrice] = useState(0);
    const [betAmount, setBetAmount] = useState('');
    const [selectedDirection, setSelectedDirection] = useState<0 | 1>(1); // Default UP

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const [roundsData, price] = await Promise.all([
                    getAllRounds(),
                    getBTCPrice()
                ]);
                setRounds(roundsData.reverse()); // Most recent first
                setBtcPrice(price);
            } catch (error) {
                console.error('Failed to fetch rounds:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
        const interval = setInterval(fetchData, 30000);
        return () => clearInterval(interval);
    }, []);

    const currentRound = rounds.find(r => r.status === 'open');

    const handlePlaceBet = async () => {
        if (!isConnected || !address) {
            connect();
            return;
        }

        if (!currentRound) {
            alert('No active round');
            return;
        }

        const amountMicro = Math.floor(parseFloat(betAmount) * 1000000);
        if (isNaN(amountMicro) || amountMicro < 1000000) {
            alert('Minimum bet is 1 STX');
            return;
        }

        try {
            const { request } = await import('@stacks/connect');

            await request(
                {},
                'stx_callContract',
                {
                    contract: `${CONTRACT_ADDRESS}.${CONTRACT_NAME_ROUNDS}`,
                    functionName: 'place-bet',
                    functionArgs: [
                        uintCV(currentRound.roundId),
                        uintCV(selectedDirection),
                        uintCV(amountMicro),
                    ],
                    postConditionMode: 'allow',
                }
            );

            alert('Bet transaction submitted!');
            setBetAmount('');
        } catch (error) {
            console.error('Failed to place bet:', error);
            alert('Failed to place bet');
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* BTC Price Display */}
            <div className="text-center mb-8">
                <p className="text-gray-400 text-sm mb-1">Current BTC Price</p>
                <p className="text-4xl font-bold text-white">
                    ${btcPrice.toLocaleString()}
                </p>
            </div>

            {/* Current Round - Betting Panel */}
            {currentRound ? (
                <div className="bg-gradient-to-br from-orange-900/30 to-amber-900/30 rounded-2xl border border-orange-500/30 p-6">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-semibold text-white">
                            Round #{currentRound.roundId}
                        </h3>
                        <span className="px-3 py-1 rounded-full bg-green-500/20 text-green-400 text-sm">
                            🟢 Active
                        </span>
                    </div>

                    <div className="text-center mb-6">
                        <p className="text-gray-400 text-sm">Starting Price</p>
                        <p className="text-2xl font-bold text-orange-400">
                            ${currentRound.startPrice.toLocaleString()}
                        </p>
                    </div>

                    {/* Pool Stats */}
                    <div className="grid grid-cols-2 gap-4 mb-6">
                        <div className="bg-green-500/10 rounded-xl p-4 text-center">
                            <p className="text-sm text-gray-400 mb-1">📈 UP</p>
                            <p className="text-xl font-bold text-green-400">
                                {formatSTX(currentRound.poolUp)}
                            </p>
                        </div>
                        <div className="bg-red-500/10 rounded-xl p-4 text-center">
                            <p className="text-sm text-gray-400 mb-1">📉 DOWN</p>
                            <p className="text-xl font-bold text-red-400">
                                {formatSTX(currentRound.poolDown)}
                            </p>
                        </div>
                    </div>

                    {/* Betting Form */}
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                onClick={() => setSelectedDirection(DIRECTION_UP)}
                                className={`p-4 rounded-xl border-2 transition-all flex items-center justify-center gap-2 ${selectedDirection === DIRECTION_UP
                                        ? 'border-green-500 bg-green-500/20'
                                        : 'border-white/10 hover:border-white/30'
                                    }`}
                            >
                                <span className="text-2xl">📈</span>
                                <span className="text-white font-medium">UP</span>
                            </button>
                            <button
                                onClick={() => setSelectedDirection(DIRECTION_DOWN)}
                                className={`p-4 rounded-xl border-2 transition-all flex items-center justify-center gap-2 ${selectedDirection === DIRECTION_DOWN
                                        ? 'border-red-500 bg-red-500/20'
                                        : 'border-white/10 hover:border-white/30'
                                    }`}
                            >
                                <span className="text-2xl">📉</span>
                                <span className="text-white font-medium">DOWN</span>
                            </button>
                        </div>

                        <div>
                            <label className="block text-sm text-gray-400 mb-2">
                                Bet Amount (STX)
                            </label>
                            <input
                                type="number"
                                value={betAmount}
                                onChange={(e) => setBetAmount(e.target.value)}
                                placeholder="Enter amount"
                                min="1"
                                step="0.1"
                                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:border-orange-500 focus:outline-none"
                            />
                        </div>

                        <button
                            onClick={handlePlaceBet}
                            disabled={!betAmount || parseFloat(betAmount) < 1}
                            className="w-full py-4 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 text-white font-semibold hover:from-orange-600 hover:to-amber-600 transition-all disabled:opacity-50"
                        >
                            {!isConnected ? 'Connect Wallet' : 'Place Bet'}
                        </button>
                    </div>
                </div>
            ) : (
                <div className="text-center py-12 bg-white/5 rounded-2xl border border-white/10">
                    <p className="text-gray-400">No active round. Waiting for next round...</p>
                </div>
            )}

            {/* Previous Rounds */}
            <div>
                <h3 className="text-lg font-semibold text-white mb-4">Previous Rounds</h3>
                <div className="space-y-3">
                    {rounds.filter(r => r.status !== 'open').slice(0, 5).map(round => (
                        <div
                            key={round.roundId}
                            className="bg-white/5 rounded-xl p-4 flex justify-between items-center"
                        >
                            <div>
                                <span className="text-white font-medium">Round #{round.roundId}</span>
                                <span className={`ml-2 text-xs px-2 py-0.5 rounded ${round.status === 'resolved'
                                        ? 'bg-green-500/20 text-green-400'
                                        : 'bg-yellow-500/20 text-yellow-400'
                                    }`}>
                                    {round.status}
                                </span>
                            </div>
                            <div className="text-right">
                                <p className="text-sm text-gray-400">
                                    ${round.startPrice.toLocaleString()} → ${round.endPrice.toLocaleString()}
                                </p>
                                {round.status === 'resolved' && (
                                    <p className={`text-sm ${round.winningDirection === 1 ? 'text-green-400' : 'text-red-400'}`}>
                                        Winner: {round.winningDirection === 1 ? '📈 UP' : '📉 DOWN'}
                                    </p>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
