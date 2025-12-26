'use client';

import { useState } from 'react';
import { useWallet } from '@/context/WalletContext';
import { CONTRACT_ADDRESS, CONTRACT_NAME_POOLS, TOKEN_STX, TOKEN_USDCX, getTokenSymbol, POOL_DEPOSIT_STX, POOL_DEPOSIT_USDCX } from '@/config';
import { uintCV, stringAsciiCV } from '@stacks/transactions';

interface CreatePoolProps {
    onClose: () => void;
    onSuccess?: () => void;
}

export default function CreatePool({ onClose, onSuccess }: CreatePoolProps) {
    const { isConnected, address, connect } = useWallet();
    const [loading, setLoading] = useState(false);

    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [category, setCategory] = useState('general');
    const [outcomeA, setOutcomeA] = useState('');
    const [outcomeB, setOutcomeB] = useState('');
    const [tokenType, setTokenType] = useState<number>(TOKEN_STX);
    const [durationDays, setDurationDays] = useState('7');

    const deposit = tokenType === TOKEN_USDCX ? POOL_DEPOSIT_USDCX : POOL_DEPOSIT_STX;
    const depositDisplay = deposit / 1000000;

    const categories = [
        { value: 'crypto', label: '🪙 Crypto' },
        { value: 'sports', label: '⚽ Sports' },
        { value: 'politics', label: '🏛️ Politics' },
        { value: 'entertainment', label: '🎬 Entertainment' },
        { value: 'tech', label: '💻 Technology' },
        { value: 'general', label: '📋 General' },
    ];

    const handleCreate = async () => {
        if (!isConnected || !address) {
            connect();
            return;
        }

        // Validation
        if (!title.trim() || title.length > 50) {
            alert('Title is required and must be 50 characters or less');
            return;
        }
        if (!description.trim() || description.length > 200) {
            alert('Description is required and must be 200 characters or less');
            return;
        }
        if (!outcomeA.trim() || outcomeA.length > 20) {
            alert('Outcome A is required and must be 20 characters or less');
            return;
        }
        if (!outcomeB.trim() || outcomeB.length > 20) {
            alert('Outcome B is required and must be 20 characters or less');
            return;
        }
        if (!category || category.length > 20) {
            alert('Category is required');
            return;
        }

        const days = parseInt(durationDays);
        if (isNaN(days) || days < 1 || days > 365) {
            alert('Duration must be between 1 and 365 days');
            return;
        }

        // Calculate duration in blocks (approx 10 minutes per block = 144 blocks per day)
        const durationBlocks = days * 144;

        setLoading(true);
        try {
            const { request } = await import('@stacks/connect');

            await request(
                {},
                'stx_callContract',
                {
                    contract: `${CONTRACT_ADDRESS}.${CONTRACT_NAME_POOLS}`,
                    functionName: 'create-pool',
                    functionArgs: [
                        stringAsciiCV(title.trim()),
                        stringAsciiCV(description.trim()),
                        stringAsciiCV(category.trim()),
                        stringAsciiCV(outcomeA.trim()),
                        stringAsciiCV(outcomeB.trim()),
                        uintCV(durationBlocks),
                        uintCV(tokenType),
                    ],
                    postConditionMode: 'allow',
                }
            );

            alert('Pool creation transaction submitted! It will appear shortly.');
            onSuccess?.();
            onClose();
        } catch (error) {
            console.error('Failed to create pool:', error);
            alert('Failed to create pool. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={onClose}
        >
            <div
                className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl border border-white/10 max-w-xl w-full max-h-[90vh] overflow-y-auto"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="p-6 border-b border-white/10">
                    <div className="flex justify-between items-center">
                        <div>
                            <h2 className="text-xl font-bold text-white">Create Prediction Pool</h2>
                            <p className="text-sm text-gray-400 mt-1">Create a new market for others to bet on</p>
                        </div>
                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-white transition-colors text-xl"
                        >
                            ✕
                        </button>
                    </div>
                </div>

                {/* Form */}
                <div className="p-6 space-y-5">
                    {/* Token Type */}
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">
                            Token Type *
                        </label>
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                type="button"
                                onClick={() => setTokenType(TOKEN_STX)}
                                className={`p-4 rounded-xl border-2 transition-all flex items-center justify-center gap-2 ${tokenType === TOKEN_STX
                                        ? 'border-orange-500 bg-orange-500/20'
                                        : 'border-white/10 hover:border-white/30'
                                    }`}
                            >
                                <span className="text-xl">⚡</span>
                                <span className="text-white font-medium">STX</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setTokenType(TOKEN_USDCX)}
                                className={`p-4 rounded-xl border-2 transition-all flex items-center justify-center gap-2 ${tokenType === TOKEN_USDCX
                                        ? 'border-green-500 bg-green-500/20'
                                        : 'border-white/10 hover:border-white/30'
                                    }`}
                            >
                                <span className="text-xl">💵</span>
                                <span className="text-white font-medium">USDCx</span>
                            </button>
                        </div>
                        <p className="text-xs text-gray-500 mt-2">
                            Deposit required: {depositDisplay} {getTokenSymbol(tokenType)}
                        </p>
                    </div>

                    {/* Title */}
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">
                            Title * <span className="text-gray-500">({title.length}/50)</span>
                        </label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value.slice(0, 50))}
                            placeholder="e.g., Will BTC reach $100K by Jan 2025?"
                            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none"
                        />
                    </div>

                    {/* Description */}
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">
                            Description * <span className="text-gray-500">({description.length}/200)</span>
                        </label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value.slice(0, 200))}
                            placeholder="Describe the prediction criteria and resolution conditions"
                            rows={3}
                            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none resize-none"
                        />
                    </div>

                    {/* Category */}
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">
                            Category *
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                            {categories.map((cat) => (
                                <button
                                    key={cat.value}
                                    type="button"
                                    onClick={() => setCategory(cat.value)}
                                    className={`p-2 rounded-lg text-sm transition-all ${category === cat.value
                                            ? 'bg-purple-500/30 border border-purple-500 text-white'
                                            : 'bg-white/5 border border-white/10 text-gray-400 hover:border-white/30'
                                        }`}
                                >
                                    {cat.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Outcomes */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-2">
                                Outcome A * <span className="text-gray-500">({outcomeA.length}/20)</span>
                            </label>
                            <input
                                type="text"
                                value={outcomeA}
                                onChange={(e) => setOutcomeA(e.target.value.slice(0, 20))}
                                placeholder="e.g., Yes"
                                className="w-full px-4 py-3 rounded-xl bg-blue-500/10 border border-blue-500/30 text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-2">
                                Outcome B * <span className="text-gray-500">({outcomeB.length}/20)</span>
                            </label>
                            <input
                                type="text"
                                value={outcomeB}
                                onChange={(e) => setOutcomeB(e.target.value.slice(0, 20))}
                                placeholder="e.g., No"
                                className="w-full px-4 py-3 rounded-xl bg-pink-500/10 border border-pink-500/30 text-white placeholder-gray-500 focus:border-pink-500 focus:outline-none"
                            />
                        </div>
                    </div>

                    {/* Duration */}
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">
                            Duration (days) *
                        </label>
                        <input
                            type="number"
                            value={durationDays}
                            onChange={(e) => setDurationDays(e.target.value)}
                            min="1"
                            max="365"
                            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                            Pool expires after {durationDays || 0} days (~{parseInt(durationDays || '0') * 144} blocks)
                        </p>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-white/10">
                    <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 mb-4">
                        <p className="text-sm text-yellow-400">
                            ⚠️ Creating a pool requires a <strong>{depositDisplay} {getTokenSymbol(tokenType)}</strong> deposit.
                            You can claim it back after settling the pool.
                        </p>
                    </div>

                    <button
                        onClick={handleCreate}
                        disabled={loading || !title || !description || !outcomeA || !outcomeB}
                        className="w-full py-4 rounded-xl bg-gradient-to-r from-purple-500 to-blue-500 text-white font-semibold hover:from-purple-600 hover:to-blue-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? 'Creating...' : !isConnected ? 'Connect Wallet' : 'Create Pool'}
                    </button>
                </div>
            </div>
        </div>
    );
}
