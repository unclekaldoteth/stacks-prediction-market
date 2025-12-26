'use client';

import { useState, useEffect } from 'react';
import { Pool, getAllPools } from '@/services/poolsService';
import { HIRO_API } from '@/config';
import PoolCard from './PoolCard';

interface PoolListProps {
    onSelectPool: (pool: Pool) => void;
}

export default function PoolList({ onSelectPool }: PoolListProps) {
    const [pools, setPools] = useState<Pool[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'active' | 'settled'>('all');
    const [tokenFilter, setTokenFilter] = useState<'all' | 'stx' | 'usdcx'>('all');
    const [currentBlock, setCurrentBlock] = useState(0);

    useEffect(() => {
        const fetchPools = async () => {
            setLoading(true);
            try {
                // Get current block height
                const blockResponse = await fetch(`${HIRO_API}/extended/v1/block?limit=1`);
                const blockData = await blockResponse.json();
                if (blockData.results?.[0]?.height) {
                    setCurrentBlock(blockData.results[0].height);
                }

                const allPools = await getAllPools();
                setPools(allPools);
            } catch (error) {
                console.error('Failed to fetch pools:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchPools();
        const interval = setInterval(fetchPools, 30000); // Refresh every 30s
        return () => clearInterval(interval);
    }, []);

    const filteredPools = pools.filter(pool => {
        // Status filter
        if (filter === 'active' && (pool.settled || currentBlock > pool.expiry)) return false;
        if (filter === 'settled' && !pool.settled) return false;

        // Token filter
        if (tokenFilter === 'stx' && pool.tokenType !== 0) return false;
        if (tokenFilter === 'usdcx' && pool.tokenType !== 1) return false;

        return true;
    });

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-20">
                <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                <p className="text-gray-400">Loading pools...</p>
            </div>
        );
    }

    return (
        <div>
            {/* Filters */}
            <div className="flex flex-wrap gap-4 mb-6">
                <div className="flex gap-2">
                    <button
                        onClick={() => setFilter('all')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filter === 'all'
                                ? 'bg-purple-500 text-white'
                                : 'bg-white/5 text-gray-400 hover:bg-white/10'
                            }`}
                    >
                        All
                    </button>
                    <button
                        onClick={() => setFilter('active')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filter === 'active'
                                ? 'bg-blue-500 text-white'
                                : 'bg-white/5 text-gray-400 hover:bg-white/10'
                            }`}
                    >
                        Active
                    </button>
                    <button
                        onClick={() => setFilter('settled')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filter === 'settled'
                                ? 'bg-green-500 text-white'
                                : 'bg-white/5 text-gray-400 hover:bg-white/10'
                            }`}
                    >
                        Settled
                    </button>
                </div>

                <div className="flex gap-2">
                    <button
                        onClick={() => setTokenFilter('all')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tokenFilter === 'all'
                                ? 'bg-gray-600 text-white'
                                : 'bg-white/5 text-gray-400 hover:bg-white/10'
                            }`}
                    >
                        All Tokens
                    </button>
                    <button
                        onClick={() => setTokenFilter('stx')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tokenFilter === 'stx'
                                ? 'bg-orange-500 text-white'
                                : 'bg-white/5 text-gray-400 hover:bg-white/10'
                            }`}
                    >
                        STX
                    </button>
                    <button
                        onClick={() => setTokenFilter('usdcx')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tokenFilter === 'usdcx'
                                ? 'bg-green-500 text-white'
                                : 'bg-white/5 text-gray-400 hover:bg-white/10'
                            }`}
                    >
                        USDCx
                    </button>
                </div>
            </div>

            {/* Pool Grid */}
            {filteredPools.length === 0 ? (
                <div className="text-center py-20">
                    <div className="text-6xl mb-4">🎯</div>
                    <h3 className="text-xl font-semibold text-white mb-2">No Pools Found</h3>
                    <p className="text-gray-400">
                        {pools.length === 0
                            ? "No prediction pools have been created yet."
                            : "No pools match your current filters."}
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredPools.map((pool) => (
                        <PoolCard
                            key={pool.poolId}
                            pool={pool}
                            onSelect={onSelectPool}
                            currentBlock={currentBlock}
                        />
                    ))}
                </div>
            )}

            {/* Stats */}
            <div className="mt-8 flex justify-center gap-8 text-sm text-gray-500">
                <span>Total Pools: {pools.length}</span>
                <span>Active: {pools.filter(p => !p.settled && currentBlock <= p.expiry).length}</span>
                <span>Settled: {pools.filter(p => p.settled).length}</span>
            </div>
        </div>
    );
}
