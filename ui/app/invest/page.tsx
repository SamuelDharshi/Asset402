'use client';
import React, { useState, useEffect } from 'react';
import { useClick, CONTRACTS } from '../../lib/casper-click';
import { Header } from '../../components/header';
import { Footer } from '../../components/footer';
import { CursorGlow } from '../../components/cursor-glow';
import { Zap, Coins, ArrowUpRight, ShieldCheck, Heart } from 'lucide-react';

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';

interface Offering {
  id: number;
  emoji: string;
  name: string;
  owner: { rating: number; months: number };
  assetValueUsd: number;
  totalShares: number;
  sharesSold: number;
  pricePerShareUsd: number;
  projectedApyPct: number;
  closesInDays: number;
  condition: number;
  tag: string;
  surgeTag?: string;
}

const DEFAULT_OFFERINGS: Offering[] = [
  {
    id: 1,
    emoji: '🚜',
    name: 'Komatsu PC88 Excavator RWA',
    owner: { rating: 5.0, months: 14 },
    assetValueUsd: 184_000,
    totalShares: 1000,
    sharesSold: 340,
    pricePerShareUsd: 184,
    projectedApyPct: 18.4,
    closesInDays: 6,
    condition: 82,
    tag: 'Industrial',
  },
  {
    id: 2,
    emoji: '🚢',
    name: 'Marine Work Vessel 12m',
    owner: { rating: 4.8, months: 22 },
    assetValueUsd: 620_000,
    totalShares: 1000,
    sharesSold: 312,
    pricePerShareUsd: 620,
    projectedApyPct: 14.1,
    closesInDays: 14,
    condition: 90,
    tag: 'Maritime',
  },
  {
    id: 3,
    emoji: '⚡',
    name: 'Caterpillar XQ230 Generator',
    owner: { rating: 4.9, months: 11 },
    assetValueUsd: 290_000,
    totalShares: 500,
    sharesSold: 200,
    pricePerShareUsd: 580,
    projectedApyPct: 22.8,
    closesInDays: 9,
    condition: 88,
    tag: 'Power Systems',
    surgeTag: '⚡ Demand surge active',
  },
];

export default function InvestPage() {
  const { isConnected, connect, activeAccount } = useClick();
  const [offerings, setOfferings] = useState<Offering[]>(DEFAULT_OFFERINGS);
  const [purchasing, setPurchasing] = useState<number | null>(null);
  const [confirmed, setConfirmed] = useState<Set<number>>(new Set());

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`${BACKEND}/api/v1/assets?status=Listed,Rented,Fractional`);
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) {
            const mapped = data.map((item: any) => ({
              id: item.asset_id,
              emoji: item.asset_type === 'Generator' ? '⚡' : item.asset_type === 'Excavator' ? '🚜' : '🚢',
              name: item.model_est || item.asset_type || `Asset #${item.asset_id}`,
              owner: { rating: 5.0, months: 14 },
              assetValueUsd: item.valuation_usd || 150_000,
              totalShares: 1000,
              sharesSold: item.shares_sold || 340,
              pricePerShareUsd: Math.round((item.valuation_usd || 150_000) / 1000),
              projectedApyPct: 18.4,
              closesInDays: 6,
              condition: item.condition_score || 85,
              tag: item.asset_type,
            }));
            setOfferings(mapped);
          }
        }
      } catch (err) {
        console.warn('Marketplace API unavailable:', err);
      }
    }
    load();
  }, []);

  const handleBuy = async (offeringId: number) => {
    if (!isConnected) { await connect(); return; }
    setPurchasing(offeringId);
    setTimeout(() => {
      setConfirmed(prev => new Set([...prev, offeringId]));
      setPurchasing(null);
    }, 2000);
  };

  return (
    <main className="relative min-h-screen overflow-hidden scanlines bg-background text-foreground">
      <CursorGlow />
      <div className="relative z-10">
        <Header />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-32 pb-16">
          {/* Hero */}
          <div className="space-y-4 mb-12 animate-fade-in-up">
            <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-primary">
              <Zap className="h-4 w-4" /> Fractional RWA Pool
            </div>
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
              RWA Marketplace
            </h1>
            <p className="max-w-3xl text-base sm:text-lg text-muted-foreground leading-relaxed">
              Buy fractional shares of high-value industrial equipment and earn instant, streaming yields. 
              Smart contracts distribute every rental payment proportionally to all holders.
            </p>
          </div>

          {/* Stats Bar */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-5 mb-12 animate-fade-in-up stagger-2">
            {[
              { label: 'Total Value Locked', value: '$1.09M' },
              { label: 'Avg. Project Yield', value: '18.4% APY' },
              { label: 'Capital Raised', value: '$840k' },
              { label: 'Active Investors', value: '412' },
            ].map((stat, i) => (
              <div key={i} className="rounded-xl border border-border bg-card/40 p-5 glass">
                <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground mb-1">{stat.label}</div>
                <div className="font-mono text-xl font-bold text-primary">{stat.value}</div>
              </div>
            ))}
          </div>

          {/* Offerings Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-fade-in-up stagger-3">
            {offerings.map(o => {
              const pctSold = Math.round((o.sharesSold / o.totalShares) * 100);
              const isConfirmed = confirmed.has(o.id);
              const isBuying = purchasing === o.id;

              return (
                <div key={o.id} className="rounded-xl border border-border bg-card/30 p-6 glass flex flex-col justify-between hover-lift">
                  <div>
                    {/* Header */}
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-3">
                        <span className="text-3xl">{o.emoji}</span>
                        <div>
                          <div className="font-bold text-base leading-snug">{o.name}</div>
                          <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground bg-secondary/50 px-2 py-0.5 rounded border border-border">
                            {o.tag}
                          </span>
                        </div>
                      </div>
                      {o.surgeTag && (
                        <span className="font-mono text-[9px] uppercase tracking-wider text-primary border border-primary px-2 py-0.5 rounded animate-pulse">
                          Surge
                        </span>
                      )}
                    </div>

                    {/* Progress */}
                    <div className="space-y-2 py-4 border-t border-b border-border/20 mb-4">
                      <div className="flex justify-between font-mono text-[10px] text-muted-foreground">
                        <span>Funding Raised: {pctSold}%</span>
                        <span>{o.sharesSold} / {o.totalShares} Shares</span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-secondary overflow-hidden">
                        <div 
                          className="h-full bg-primary rounded-full transition-all duration-500"
                          style={{ width: `${pctSold}%` }}
                        />
                      </div>
                    </div>

                    {/* Financial details */}
                    <div className="grid grid-cols-2 gap-4 font-mono text-xs mb-6">
                      <div>
                        <div className="text-muted-foreground">Asset Value</div>
                        <div className="font-bold text-sm text-foreground">${o.assetValueUsd.toLocaleString()}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Price per Share</div>
                        <div className="font-bold text-sm text-primary">${o.pricePerShareUsd}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Projected APY</div>
                        <div className="font-bold text-sm text-[#4ADE80]">{o.projectedApyPct}% APY</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Condition Score</div>
                        <div className="font-bold text-sm text-foreground">{o.condition}/100</div>
                      </div>
                    </div>
                  </div>

                  {isConfirmed ? (
                    <div className="rounded-lg border border-primary/20 bg-primary/10 p-3 text-center text-primary font-mono text-xs font-bold flex items-center justify-center gap-2">
                      <ShieldCheck className="h-4 w-4" /> Share Purchased
                    </div>
                  ) : (
                    <button
                      onClick={() => handleBuy(o.id)}
                      disabled={isBuying}
                      className="w-full relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-lg border border-primary bg-primary/10 py-3 font-mono text-xs text-primary transition-all duration-500 hover:bg-primary hover:text-primary-foreground active:scale-[0.98] disabled:opacity-50"
                    >
                      {isBuying ? 'Confirming Sign...' : 'Buy Shares'} <ArrowUpRight className="h-4 w-4" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <Footer />
      </div>
    </main>
  );
}
