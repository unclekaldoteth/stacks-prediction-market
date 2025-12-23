'use client';

import Header from "@/components/Header";
import BettingPanel from "@/components/BettingPanel";
import PriceDisplay from "@/components/PriceDisplay";

export default function Home() {
  return (
    <>
      <Header />
      <main className="main">
        <div className="hero">
          <h1>Predict & Win</h1>
          <p>Bet on BTC price direction and win STX!</p>
        </div>
        <PriceDisplay />
        <BettingPanel />
        <footer className="footer">
          <p>Powered by <a href="https://www.stacks.co/" target="_blank" rel="noopener">Stacks</a> • Built with 💜</p>
        </footer>
      </main>
    </>
  );
}
