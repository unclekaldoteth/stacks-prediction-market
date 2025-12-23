'use client';

import { useState, useEffect } from 'react';
import { CONTRACT_ADDRESS, CONTRACT_NAME, DIRECTION_UP, DIRECTION_DOWN, API_URL, WALLETCONNECT_PROJECT_ID } from '@/config';
import { useWallet } from '@/context/WalletContext';

interface Round {
    roundId: number;
    status: 'open' | 'closed' | 'resolved';
    startPrice?: number;
    endPrice?: number;
    poolUp: number;
    poolDown: number;
    winningDirection?: number;
}

export default function BettingPanel() {
    const { isConnected, connect } = useWallet();
    const [amount, setAmount] = useState('1');
    const [currentRound, setCurrentRound] = useState<Round | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [txStatus, setTxStatus] = useState<string | null>(null);

    useEffect(() => {
        fetchCurrentRound();
        const interval = setInterval(fetchCurrentRound, 10000);
        return () => clearInterval(interval);
    }, []);

    async function fetchCurrentRound() {
        try {
            const res = await fetch(`${API_URL}/api/rounds`);
            const rounds: Round[] = await res.json();
            if (rounds.length > 0) {
                const latest = rounds[rounds.length - 1];
                setCurrentRound(latest);
            } else {
                setCurrentRound(null);
            }
        } catch {
            setCurrentRound(null);
        }
    }

    async function placeBet(direction: number) {
        if (!isConnected) {
            connect();
            return;
        }

        if (!currentRound) return;

        setIsLoading(true);
        setTxStatus('Preparing transaction...');

        const amountMicroSTX = Math.floor(parseFloat(amount) * 1000000);

        try {
            const { request } = await import('@stacks/connect');
            const { uintCV, cvToHex } = await import('@stacks/transactions');

            const response = await request(
                {
                    walletConnect: {
                        projectId: WALLETCONNECT_PROJECT_ID,
                    },
                },
                'stx_callContract',
                {
                    contract: `${CONTRACT_ADDRESS}.${CONTRACT_NAME}`,
                    functionName: 'place-bet',
                    functionArgs: [
                        cvToHex(uintCV(currentRound.roundId)),
                        cvToHex(uintCV(direction)),
                        cvToHex(uintCV(amountMicroSTX)),
                    ],
                }
            );

            if (response && response.txid) {
                setTxStatus(`Transaction submitted! ID: ${response.txid.slice(0, 10)}...`);
            } else {
                setTxStatus('Transaction completed!');
            }
            setIsLoading(false);
        } catch (err) {
            console.error('Transaction error:', err);
            setTxStatus('Transaction failed or cancelled');
            setIsLoading(false);
        }
    }

    const formatSTX = (microSTX: number) => (microSTX / 1000000).toFixed(2);
    const formatPrice = (price: number) => `$${price.toLocaleString()}`;

    const totalPool = currentRound ? currentRound.poolUp + currentRound.poolDown : 0;
    const upPercent = totalPool > 0 ? ((currentRound?.poolUp || 0) / totalPool) * 100 : 50;
    const downPercent = 100 - upPercent;

    return (
        <div className="betting-panel">
            <div className="round-info">
                <h2>Round #{currentRound?.roundId || '—'}</h2>
                <div className="status-badge" data-status={currentRound?.status || 'waiting'}>
                    {currentRound?.status?.toUpperCase() || 'NO ACTIVE ROUND'}
                </div>
            </div>

            {!currentRound && (
                <div className="no-round-message">
                    <p>⏳ Waiting for admin to start a new round...</p>
                    <p className="hint">Go to <a href="/admin">Admin Panel</a> to start a round</p>
                </div>
            )}

            {currentRound && (
                <>
                    <div className="price-display">
                        <span className="label">BTC Start Price</span>
                        <span className="price">{formatPrice(currentRound.startPrice || 0)}</span>
                    </div>

                    <div className="pool-container">
                        <div className="pool-bar">
                            <div className="pool-up" style={{ width: `${upPercent}%` }}>
                                <span>{upPercent.toFixed(1)}%</span>
                            </div>
                            <div className="pool-down" style={{ width: `${downPercent}%` }}>
                                <span>{downPercent.toFixed(1)}%</span>
                            </div>
                        </div>
                        <div className="pool-labels">
                            <span className="up-label">📈 UP: {formatSTX(currentRound.poolUp)} STX</span>
                            <span className="down-label">📉 DOWN: {formatSTX(currentRound.poolDown)} STX</span>
                        </div>
                    </div>

                    <div className="bet-input">
                        <label>Bet Amount (STX)</label>
                        <input
                            type="number"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            min="0.1"
                            step="0.1"
                            disabled={isLoading || currentRound.status !== 'open'}
                        />
                    </div>

                    <div className="bet-buttons">
                        <button
                            className="bet-up"
                            onClick={() => placeBet(DIRECTION_UP)}
                            disabled={isLoading || currentRound.status !== 'open'}
                        >
                            <span className="icon">📈</span>
                            <span className="text">BET UP</span>
                        </button>
                        <button
                            className="bet-down"
                            onClick={() => placeBet(DIRECTION_DOWN)}
                            disabled={isLoading || currentRound.status !== 'open'}
                        >
                            <span className="icon">📉</span>
                            <span className="text">BET DOWN</span>
                        </button>
                    </div>

                    {txStatus && (
                        <div className="tx-status">
                            {txStatus}
                        </div>
                    )}

                    {!isConnected && (
                        <button className="connect-hint" onClick={connect}>
                            Connect wallet to place bets
                        </button>
                    )}
                </>
            )}
        </div>
    );
}
