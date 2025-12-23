'use client';

import { useState, useEffect } from 'react';
import { getPrices, PriceData } from '@/services/priceService';

export default function PriceDisplay() {
    const [prices, setPrices] = useState<PriceData | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        async function fetchPrices() {
            try {
                const data = await getPrices();
                setPrices(data);
            } catch (error) {
                console.error('Failed to fetch prices:', error);
            } finally {
                setIsLoading(false);
            }
        }

        fetchPrices();
        const interval = setInterval(fetchPrices, 30000); // Update every 30 seconds

        return () => clearInterval(interval);
    }, []);

    if (isLoading) {
        return (
            <div className="price-display-widget">
                <div className="price-loading">Loading prices...</div>
            </div>
        );
    }

    if (!prices) {
        return null;
    }

    const formatPrice = (price: number) => {
        if (price >= 1000) {
            return `$${price.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
        }
        return `$${price.toFixed(4)}`;
    };

    const formatChange = (change: number) => {
        const sign = change >= 0 ? '+' : '';
        return `${sign}${change.toFixed(2)}%`;
    };

    return (
        <div className="price-display-widget">
            <div className="price-item">
                <div className="price-icon">₿</div>
                <div className="price-info">
                    <span className="price-label">BTC</span>
                    <span className="price-value">{formatPrice(prices.btc)}</span>
                </div>
                <span className={`price-change ${prices.btcChange24h >= 0 ? 'positive' : 'negative'}`}>
                    {formatChange(prices.btcChange24h)}
                </span>
            </div>
            <div className="price-divider"></div>
            <div className="price-item">
                <div className="price-icon stx">◈</div>
                <div className="price-info">
                    <span className="price-label">STX</span>
                    <span className="price-value">{formatPrice(prices.stx)}</span>
                </div>
                <span className={`price-change ${prices.stxChange24h >= 0 ? 'positive' : 'negative'}`}>
                    {formatChange(prices.stxChange24h)}
                </span>
            </div>
        </div>
    );
}
