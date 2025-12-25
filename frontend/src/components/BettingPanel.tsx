'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
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
    startBlock?: number;
    startTime?: number;
}

interface UserBet {
    direction: number;
    amount: number;
    claimed: boolean;
}

type PendingAction = 'up' | 'down' | 'claim' | null;

export default function BettingPanel() {
    const { isConnected, address, connect } = useWallet();
    const [amount, setAmount] = useState('1');
    const [currentRound, setCurrentRound] = useState<Round | null>(null);
    const [userBet, setUserBet] = useState<UserBet | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [txStatus, setTxStatus] = useState<string | null>(null);
    const [txSuccess, setTxSuccess] = useState(false);
    const pendingActionRef = useRef<PendingAction>(null);

    const fetchCurrentRound = useCallback(async () => {
        try {
            const res = await fetch(`${API_URL}/api/rounds`);
            if (!res.ok) return;
            const rounds: Round[] = await res.json();
            if (rounds.length > 0) {
                const latest = rounds[rounds.length - 1];
                setCurrentRound(latest);
            } else {
                setCurrentRound(null);
            }
        } catch {
            // API not available, show empty state
        }
    }, []);

    // Fetch user's bet for current round
    const fetchUserBet = useCallback(async () => {
        if (!currentRound || !address) {
            setUserBet(null);
            return;
        }

        try {
            const { cvToValue, hexToCV } = await import('@stacks/transactions');

            const response = await fetch(
                `https://api.testnet.hiro.so/v2/contracts/call-read/${CONTRACT_ADDRESS}/${CONTRACT_NAME}/get-bet`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        sender: address,
                        arguments: [
                            // round-id as uint
                            `0x0100000000000000000000000000000000${currentRound.roundId.toString(16).padStart(16, '0')}`.slice(0, 34),
                            // user principal - simplified approach
                        ],
                    }),
                }
            );

            // Fallback: Check from backend
            const betRes = await fetch(`${API_URL}/api/bets?roundId=${currentRound.roundId}&user=${address}`);
            if (betRes.ok) {
                const bet = await betRes.json();
                if (bet) {
                    setUserBet(bet);
                    return;
                }
            }
            setUserBet(null);
        } catch {
            setUserBet(null);
        }
    }, [currentRound, address]);

    useEffect(() => {
        fetchCurrentRound();
        const interval = setInterval(fetchCurrentRound, 5000); // Faster refresh
        return () => clearInterval(interval);
    }, [fetchCurrentRound]);

    useEffect(() => {
        if (isConnected && currentRound) {
            fetchUserBet();
        }
    }, [isConnected, currentRound, fetchUserBet]);

    // Handle pending action after wallet connects
    useEffect(() => {
        if (isConnected && pendingActionRef.current) {
            const action = pendingActionRef.current;
            pendingActionRef.current = null;

            if (action === 'up') {
                placeBet(DIRECTION_UP);
            } else if (action === 'down') {
                placeBet(DIRECTION_DOWN);
            } else if (action === 'claim') {
                claimWinnings();
            }
        }
    }, [isConnected]);

    async function placeBet(direction: number) {
        if (!isConnected) {
            pendingActionRef.current = direction === DIRECTION_UP ? 'up' : 'down';
            connect();
            return;
        }

        if (!currentRound || currentRound.status !== 'open') return;
        if (userBet) {
            setTxStatus('You already have a bet on this round!');
            return;
        }

        setIsLoading(true);
        setTxStatus('Opening wallet...');
        setTxSuccess(false);

        const amountMicroSTX = Math.floor(parseFloat(amount) * 1000000);

        try {
            const { request } = await import('@stacks/connect');
            const { uintCV, cvToHex, Pc } = await import('@stacks/transactions');

            setTxStatus('Confirm in your wallet...');

            // Create post-condition to allow STX transfer (using Pc builder for v7+)
            const postCondition = Pc.principal(address!).willSendLte(amountMicroSTX).ustx();

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
                    postConditions: [postCondition],
                }
            );

            if (response && response.txid) {
                setTxStatus(`Bet placed! TX: ${response.txid.slice(0, 10)}...`);
                setTxSuccess(true);
                // Set optimistic user bet
                setUserBet({
                    direction,
                    amount: amountMicroSTX,
                    claimed: false,
                });
                // Refresh after a delay
                setTimeout(fetchCurrentRound, 3000);
            } else {
                setTxStatus('Bet placed successfully!');
                setTxSuccess(true);
            }
        } catch (err) {
            console.error('Transaction error:', err);
            setTxStatus('Transaction cancelled');
            setTxSuccess(false);
        } finally {
            setIsLoading(false);
        }
    }

    async function claimWinnings() {
        if (!isConnected) {
            pendingActionRef.current = 'claim';
            connect();
            return;
        }

        if (!currentRound || currentRound.status !== 'resolved' || !userBet) return;

        setIsLoading(true);
        setTxStatus('Claiming winnings...');

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
                    functionName: 'claim-winnings',
                    functionArgs: [cvToHex(uintCV(currentRound.roundId))],
                }
            );

            if (response?.txid) {
                setTxStatus(`Winnings claimed! TX: ${response.txid.slice(0, 10)}...`);
                setTxSuccess(true);
                setUserBet({ ...userBet, claimed: true });
            }
        } catch (err) {
            console.error('Claim error:', err);
            setTxStatus('Claim failed or cancelled');
        } finally {
            setIsLoading(false);
        }
    }

    const formatSTX = (microSTX: number) => (microSTX / 1000000).toFixed(2);
    const formatPrice = (price: number) => `$${price.toLocaleString()}`;

    const totalPool = currentRound ? currentRound.poolUp + currentRound.poolDown : 0;
    const upPercent = totalPool > 0 ? ((currentRound?.poolUp || 0) / totalPool) * 100 : 50;
    const downPercent = 100 - upPercent;

    // Calculate potential payout
    const calculatePayout = (direction: number) => {
        if (!currentRound || totalPool === 0) return 0;
        const betAmount = parseFloat(amount) * 1000000;
        const winningPool = direction === DIRECTION_UP ? currentRound.poolUp : currentRound.poolDown;
        const newWinningPool = winningPool + betAmount;
        const newTotalPool = totalPool + betAmount;
        return (betAmount * newTotalPool) / newWinningPool;
    };

    // Determine if user won
    const userWon = currentRound?.status === 'resolved' && userBet &&
        userBet.direction === currentRound.winningDirection;
    const userLost = currentRound?.status === 'resolved' && userBet &&
        userBet.direction !== currentRound.winningDirection;

    // Status display helper
    const getStatusDisplay = () => {
        if (!currentRound) return { text: 'NO ACTIVE ROUND', color: 'waiting' };

        switch (currentRound.status) {
            case 'open':
                return { text: 'BETTING OPEN', color: 'open' };
            case 'closed':
                return { text: 'WAITING FOR RESULT', color: 'closed' };
            case 'resolved':
                const winner = currentRound.winningDirection === DIRECTION_UP ? 'UP WINS!' : 'DOWN WINS!';
                return { text: winner, color: 'resolved' };
            default:
                return { text: 'UNKNOWN', color: 'waiting' };
        }
    };

    const statusDisplay = getStatusDisplay();

    return (
        <div className="betting-panel">
            {/* Round Header */}
            <div className="round-info">
                <h2>Round #{currentRound?.roundId || '—'}</h2>
                <div className="status-badge" data-status={statusDisplay.color}>
                    {statusDisplay.text}
                </div>
            </div>

            {/* No Round State */}
            {!currentRound && (
                <div className="no-round-message">
                    <p>Waiting for a new round to start...</p>
                    <p className="hint">Round will start automatically or check <a href="/admin">Admin Panel</a></p>
                </div>
            )}

            {currentRound && (
                <>
                    {/* Price Display */}
                    <div className="price-display">
                        <div className="price-row">
                            <span className="label">Start Price</span>
                            <span className="price">{formatPrice(currentRound.startPrice || 0)}</span>
                        </div>
                        {currentRound.status === 'resolved' && (
                            <div className="price-row end-price">
                                <span className="label">End Price</span>
                                <span className="price">{formatPrice(currentRound.endPrice || 0)}</span>
                            </div>
                        )}
                    </div>

                    {/* User's Current Bet Display */}
                    {userBet && (
                        <div className={`user-bet-status ${userWon ? 'won' : ''} ${userLost ? 'lost' : ''}`}>
                            <div className="bet-info">
                                <span className="bet-label">Your Bet</span>
                                <span className={`bet-direction ${userBet.direction === DIRECTION_UP ? 'up' : 'down'}`}>
                                    {userBet.direction === DIRECTION_UP ? 'UP' : 'DOWN'}
                                </span>
                                <span className="bet-amount">{formatSTX(userBet.amount)} STX</span>
                            </div>
                            {userWon && !userBet.claimed && (
                                <button
                                    className="claim-btn"
                                    onClick={claimWinnings}
                                    disabled={isLoading}
                                >
                                    Claim Winnings
                                </button>
                            )}
                            {userWon && userBet.claimed && (
                                <span className="claimed-badge">Claimed!</span>
                            )}
                            {userLost && (
                                <span className="lost-badge">Better luck next time!</span>
                            )}
                        </div>
                    )}

                    {/* Pool Bar */}
                    <div className="pool-container">
                        <div className="pool-bar">
                            <div className="pool-up" style={{ width: `${upPercent}%` }}>
                                {upPercent > 15 && <span>{upPercent.toFixed(0)}%</span>}
                            </div>
                            <div className="pool-down" style={{ width: `${downPercent}%` }}>
                                {downPercent > 15 && <span>{downPercent.toFixed(0)}%</span>}
                            </div>
                        </div>
                        <div className="pool-labels">
                            <span className="up-label">UP: {formatSTX(currentRound.poolUp)} STX</span>
                            <span className="down-label">DOWN: {formatSTX(currentRound.poolDown)} STX</span>
                        </div>
                    </div>

                    {/* Betting Section - Only show if round is open and user hasn't bet */}
                    {currentRound.status === 'open' && !userBet && (
                        <>
                            <div className="bet-input">
                                <label>Bet Amount (STX)</label>
                                <div className="input-with-buttons">
                                    <button onClick={() => setAmount('1')}>1</button>
                                    <button onClick={() => setAmount('5')}>5</button>
                                    <button onClick={() => setAmount('10')}>10</button>
                                    <input
                                        type="number"
                                        value={amount}
                                        onChange={(e) => setAmount(e.target.value)}
                                        min="0.1"
                                        step="0.1"
                                        disabled={isLoading}
                                    />
                                </div>
                            </div>

                            <div className="bet-buttons">
                                <button
                                    className="bet-up"
                                    onClick={() => placeBet(DIRECTION_UP)}
                                    disabled={isLoading}
                                >
                                    <span className="direction">UP</span>
                                    <span className="payout">~{formatSTX(calculatePayout(DIRECTION_UP))} STX</span>
                                </button>
                                <button
                                    className="bet-down"
                                    onClick={() => placeBet(DIRECTION_DOWN)}
                                    disabled={isLoading}
                                >
                                    <span className="direction">DOWN</span>
                                    <span className="payout">~{formatSTX(calculatePayout(DIRECTION_DOWN))} STX</span>
                                </button>
                            </div>
                        </>
                    )}

                    {/* Closed Round Message */}
                    {currentRound.status === 'closed' && (
                        <div className="waiting-result">
                            <div className="spinner"></div>
                            <p>Waiting for price result...</p>
                        </div>
                    )}

                    {/* Transaction Status */}
                    {txStatus && (
                        <div className={`tx-status ${txSuccess ? 'success' : ''}`}>
                            {txStatus}
                        </div>
                    )}

                    {/* Connect Wallet Prompt */}
                    {!isConnected && currentRound.status === 'open' && (
                        <button className="connect-prompt" onClick={connect}>
                            Connect Wallet to Place Bet
                        </button>
                    )}
                </>
            )}
        </div>
    );
}
