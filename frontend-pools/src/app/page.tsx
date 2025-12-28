'use client';

import { useState } from 'react';
import Header from '@/components/Header';
import PoolList from '@/components/PoolList';
import BetPanel from '@/components/BetPanel';
import RoundsPanel from '@/components/RoundsPanel';
import CreatePool from '@/components/CreatePool';
import { Pool } from '@/services/poolsService';
import { WalletProvider } from '@/context/WalletContext';

type Tab = 'rounds' | 'pools';

function HomePage() {
  const [activeTab, setActiveTab] = useState<Tab>('pools'); // Default to pools since that's the main feature
  const [selectedPool, setSelectedPool] = useState<Pool | null>(null);
  const [showCreatePool, setShowCreatePool] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const handlePoolCreated = () => {
    // Refresh the pool list
    setRefreshKey(prev => prev + 1);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900/20 to-gray-900">
      <Header />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero Section */}
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Stacks <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-400">Predictions</span>
          </h1>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            Predict BTC price movements or create custom prediction markets with STX & USDCx
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="flex justify-center mb-8">
          <div className="inline-flex rounded-2xl bg-white/5 p-1.5 border border-white/10">
            <button
              onClick={() => setActiveTab('rounds')}
              className={`px-6 py-3 rounded-xl font-medium transition-all flex items-center gap-2 ${activeTab === 'rounds'
                ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-lg'
                : 'text-gray-400 hover:text-white'
                }`}
            >
              <span className="text-lg">₿</span>
              BTC Rounds
            </button>
            <button
              onClick={() => setActiveTab('pools')}
              className={`px-6 py-3 rounded-xl font-medium transition-all flex items-center gap-2 ${activeTab === 'pools'
                ? 'bg-gradient-to-r from-purple-500 to-blue-500 text-white shadow-lg'
                : 'text-gray-400 hover:text-white'
                }`}
            >
              <span className="text-lg">🎯</span>
              Prediction Pools
            </button>
          </div>
        </div>

        {/* Tab Description + Create Button */}
        <div className="flex justify-between items-center mb-8">
          <div className="flex-1">
            {activeTab === 'rounds' ? (
              <p className="text-gray-500 text-sm">
                Predict if BTC price goes UP or DOWN in the next round • Bet with STX
              </p>
            ) : (
              <p className="text-gray-500 text-sm">
                Custom prediction markets with multiple outcomes • Bet with STX or USDCx
              </p>
            )}
          </div>

          {/* Create Pool Button - Only show on Pools tab */}
          {activeTab === 'pools' && (
            <button
              onClick={() => setShowCreatePool(true)}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 text-white font-medium hover:from-green-600 hover:to-emerald-600 transition-all flex items-center gap-2 shadow-lg"
            >
              <span className="text-lg">➕</span>
              Create Pool
            </button>
          )}
        </div>

        {/* Tab Content */}
        {activeTab === 'rounds' ? (
          <RoundsPanel />
        ) : (
          <PoolList key={refreshKey} onSelectPool={setSelectedPool} />
        )}

        {/* Bet Panel Modal for Pools */}
        {selectedPool && (
          <BetPanel
            pool={selectedPool}
            onClose={() => setSelectedPool(null)}
          />
        )}

        {/* Create Pool Modal */}
        {showCreatePool && (
          <CreatePool
            onClose={() => setShowCreatePool(false)}
            onSuccess={handlePoolCreated}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-white/5 py-8 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-gray-500 text-sm">
            Built on Stacks • Powered by Bitcoin • Secured by Magic Link
          </p>
        </div>
      </footer>
    </div>
  );
}

export default function Home() {
  return (
    <WalletProvider>
      <HomePage />
    </WalletProvider>
  );
}
