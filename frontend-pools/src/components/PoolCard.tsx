'use client';

import { Pool } from '@/services/poolsService';
import { formatTokenAmount, getTokenSymbol, TOKEN_USDCX } from '@/config';

interface PoolCardProps {
    pool: Pool;
    onSelect: (pool: Pool) => void;
    currentBlock: number;
}

export default function PoolCard({ pool, onSelect, currentBlock }: PoolCardProps) {
    const totalPool = pool.totalA + pool.totalB;
    const percentA = totalPool > 0 ? (pool.totalA / totalPool) * 100 : 50;

    const isExpired = currentBlock > pool.expiry;
    const blocksRemaining = Math.max(0, pool.expiry - currentBlock);

    // Status badge
    const getStatusBadge = () => {
        if (pool.settled) {
            return (
                <span className="px-2 py-1 rounded-full bg-green-500/20 text-green-400 text-xs font-medium">
                    ✓ Settled
                </span>
            );
        }
        if (isExpired) {
            return (
                <span className="px-2 py-1 rounded-full bg-red-500/20 text-red-400 text-xs font-medium">
                    Expired
                </span>
            );
        }
        return (
            <span className="px-2 py-1 rounded-full bg-blue-500/20 text-blue-400 text-xs font-medium">
                Active
            </span>
        );
    };

    return (
        <div
            onClick={() => onSelect(pool)}
            className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 rounded-2xl border border-white/10 p-5 hover:border-purple-500/50 transition-all cursor-pointer group"
        >
            {/* Header */}
            <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                        <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-400 text-xs">
                            {pool.category}
                        </span>
                        <span className={`px-2 py-0.5 rounded text-xs ${pool.tokenType === TOKEN_USDCX
                            ? 'bg-green-500/20 text-green-400'
                            : 'bg-orange-500/20 text-orange-400'
                            }`}>
                            {getTokenSymbol(pool.tokenType)}
                        </span>
                        {getStatusBadge()}
                    </div>
                    <h3 className="text-lg font-semibold text-white group-hover:text-purple-300 transition-colors">
                        {pool.title}
                    </h3>
                </div>
            </div>

            {/* Outcomes */}
            <div className="space-y-3 mb-4">
                <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-400">{pool.outcomeA}</span>
                    <span className="text-sm font-medium text-blue-400">
                        {formatTokenAmount(pool.totalA, pool.tokenType)}
                    </span>
                </div>
                <div className="relative h-2 bg-gray-700 rounded-full overflow-hidden">
                    <div
                        className="absolute left-0 top-0 h-full bg-gradient-to-r from-blue-500 to-blue-400 transition-all duration-500"
                        style={{ width: `${percentA}%` }}
                    />
                </div>
                <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-400">{pool.outcomeB}</span>
                    <span className="text-sm font-medium text-pink-400">
                        {formatTokenAmount(pool.totalB, pool.tokenType)}
                    </span>
                </div>
            </div>

            {/* Footer */}
            <div className="flex justify-between items-center pt-3 border-t border-white/5">
                <div className="text-sm text-gray-500">
                    Total: {formatTokenAmount(totalPool, pool.tokenType)}
                </div>
                {!pool.settled && !isExpired && (
                    <div className="text-xs text-gray-500">
                        ~{blocksRemaining} blocks left
                    </div>
                )}
                {pool.settled && pool.winningOutcome !== null && (
                    <div className="text-sm text-green-400">
                        Winner: {pool.winningOutcome === 0 ? pool.outcomeA : pool.outcomeB}
                    </div>
                )}
            </div>
        </div>
    );
}
