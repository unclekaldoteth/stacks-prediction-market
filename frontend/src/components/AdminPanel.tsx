'use client';

import { useState, useEffect } from 'react';
import { CONTRACT_ADDRESS, CONTRACT_NAME, WALLETCONNECT_PROJECT_ID, API_URL } from '@/config';
import { useWallet } from '@/context/WalletContext';
import { getBTCPrice } from '@/services/priceService';

interface Round {
    roundId: number;
    status: 'open' | 'closed' | 'resolved';
    startPrice?: number;
    endPrice?: number;
    poolUp: number;
    poolDown: number;
    winningDirection?: number;
}

export default function AdminPanel() {
    const { isConnected, address, connect } = useWallet();
    const [rounds, setRounds] = useState<Round[]>([]);
    const [currentBTCPrice, setCurrentBTCPrice] = useState<number>(0);
    const [isLoading, setIsLoading] = useState(false);
    const [txStatus, setTxStatus] = useState<string | null>(null);
    const [customPrice, setCustomPrice] = useState('');

    useEffect(() => {
        fetchRounds();
        fetchBTCPrice();
        const interval = setInterval(() => {
            fetchRounds();
            fetchBTCPrice();
        }, 10000);
        return () => clearInterval(interval);
    }, []);

    async function fetchRounds() {
        try {
            const res = await fetch(`${API_URL}/api/rounds`);
            const data = await res.json();
            setRounds(data);
        } catch (err) {
            console.error('Failed to fetch rounds:', err);
        }
    }

    async function fetchBTCPrice() {
        try {
            const price = await getBTCPrice();
            setCurrentBTCPrice(price);
            if (!customPrice) {
                setCustomPrice(Math.round(price).toString());
            }
        } catch (err) {
            console.error('Failed to fetch BTC price:', err);
        }
    }

    async function startRound() {
        if (!isConnected) {
            connect();
            return;
        }

        setIsLoading(true);
        setTxStatus('Starting new round...');

        const priceToUse = customPrice ? parseInt(customPrice) : Math.round(currentBTCPrice);

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
                    functionName: 'start-round',
                    functionArgs: [cvToHex(uintCV(priceToUse))],
                }
            );

            if (response?.txid) {
                setTxStatus(`Round started! TX: ${response.txid.slice(0, 10)}...`);
            } else {
                setTxStatus('Round started successfully!');
            }
            setTimeout(fetchRounds, 3000);
        } catch (err) {
            console.error('Failed to start round:', err);
            setTxStatus('Failed to start round');
        } finally {
            setIsLoading(false);
        }
    }

    async function endRound(roundId: number) {
        if (!isConnected) {
            connect();
            return;
        }

        setIsLoading(true);
        setTxStatus(`Ending round #${roundId}...`);

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
                    functionName: 'end-round',
                    functionArgs: [cvToHex(uintCV(roundId))],
                }
            );

            if (response?.txid) {
                setTxStatus(`Round ended! TX: ${response.txid.slice(0, 10)}...`);
            } else {
                setTxStatus('Round ended successfully!');
            }
            setTimeout(fetchRounds, 3000);
        } catch (err) {
            console.error('Failed to end round:', err);
            setTxStatus('Failed to end round');
        } finally {
            setIsLoading(false);
        }
    }

    async function resolveRound(roundId: number) {
        if (!isConnected) {
            connect();
            return;
        }

        setIsLoading(true);
        setTxStatus(`Resolving round #${roundId}...`);

        const endPrice = customPrice ? parseInt(customPrice) : Math.round(currentBTCPrice);

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
                    functionName: 'resolve-round',
                    functionArgs: [
                        cvToHex(uintCV(roundId)),
                        cvToHex(uintCV(endPrice)),
                    ],
                }
            );

            if (response?.txid) {
                setTxStatus(`Round resolved! TX: ${response.txid.slice(0, 10)}...`);
            } else {
                setTxStatus('Round resolved successfully!');
            }
            setTimeout(fetchRounds, 3000);
        } catch (err) {
            console.error('Failed to resolve round:', err);
            setTxStatus('Failed to resolve round');
        } finally {
            setIsLoading(false);
        }
    }

    const formatSTX = (microSTX: number) => (microSTX / 1000000).toFixed(2);
    const latestRound = rounds.length > 0 ? rounds[rounds.length - 1] : null;

    return (
        <div className="admin-panel">
            <div className="admin-header">
                <h2>🔧 Admin Panel</h2>
                <p className="admin-address">
                    {isConnected ? `Connected: ${address?.slice(0, 8)}...${address?.slice(-4)}` : 'Not connected'}
                </p>
            </div>

            {/* Live BTC Price */}
            <div className="price-card">
                <div className="price-card-header">
                    <span className="price-label">Live BTC Price</span>
                    <span className="price-live">${currentBTCPrice.toLocaleString()}</span>
                </div>
                <div className="price-input-group">
                    <label>Custom Price (USD)</label>
                    <input
                        type="number"
                        value={customPrice}
                        onChange={(e) => setCustomPrice(e.target.value)}
                        placeholder="Enter price..."
                    />
                    <button
                        className="btn-use-live"
                        onClick={() => setCustomPrice(Math.round(currentBTCPrice).toString())}
                    >
                        Use Live Price
                    </button>
                </div>
            </div>

            {/* Start New Round */}
            <div className="action-card">
                <h3>🚀 Start New Round</h3>
                <p>Start a new betting round with the current BTC price as the start reference.</p>
                <button
                    className="btn-primary"
                    onClick={startRound}
                    disabled={isLoading || !isConnected}
                >
                    {isLoading ? 'Processing...' : `Start Round (${customPrice || Math.round(currentBTCPrice)} USD)`}
                </button>
            </div>

            {/* Current Round Actions */}
            {latestRound && (
                <div className="action-card">
                    <h3>📊 Round #{latestRound.roundId}</h3>
                    <div className="round-details">
                        <div className="detail-row">
                            <span>Status:</span>
                            <span className={`status-${latestRound.status}`}>{latestRound.status.toUpperCase()}</span>
                        </div>
                        <div className="detail-row">
                            <span>Start Price:</span>
                            <span>${(latestRound.startPrice || 0).toLocaleString()}</span>
                        </div>
                        <div className="detail-row">
                            <span>Pool UP:</span>
                            <span className="up">{formatSTX(latestRound.poolUp)} STX</span>
                        </div>
                        <div className="detail-row">
                            <span>Pool DOWN:</span>
                            <span className="down">{formatSTX(latestRound.poolDown)} STX</span>
                        </div>
                        {latestRound.endPrice && (
                            <div className="detail-row">
                                <span>End Price:</span>
                                <span>${latestRound.endPrice.toLocaleString()}</span>
                            </div>
                        )}
                    </div>
                    <div className="action-buttons">
                        {latestRound.status === 'open' && (
                            <button
                                className="btn-warning"
                                onClick={() => endRound(latestRound.roundId)}
                                disabled={isLoading}
                            >
                                🔒 End Betting
                            </button>
                        )}
                        {latestRound.status === 'closed' && (
                            <button
                                className="btn-success"
                                onClick={() => resolveRound(latestRound.roundId)}
                                disabled={isLoading}
                            >
                                🏆 Resolve ({customPrice || Math.round(currentBTCPrice)} USD)
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* Transaction Status */}
            {txStatus && (
                <div className="tx-status-admin">
                    {txStatus}
                </div>
            )}

            {/* All Rounds History */}
            <div className="rounds-history">
                <h3>📜 Round History</h3>
                {rounds.length === 0 ? (
                    <p className="no-rounds">No rounds yet. Start a new round to begin!</p>
                ) : (
                    <div className="rounds-list">
                        {[...rounds].reverse().map((round) => (
                            <div key={round.roundId} className={`round-item status-${round.status}`}>
                                <span className="round-id">#{round.roundId}</span>
                                <span className="round-status">{round.status}</span>
                                <span className="round-price">${(round.startPrice || 0).toLocaleString()}</span>
                                <span className="round-pool">{formatSTX(round.poolUp + round.poolDown)} STX</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {!isConnected && (
                <button className="btn-connect" onClick={connect}>
                    Connect Admin Wallet
                </button>
            )}
        </div>
    );
}
