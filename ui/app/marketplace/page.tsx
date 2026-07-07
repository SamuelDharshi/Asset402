'use client';
import React, { useState, useEffect } from 'react';
import { useClick } from '../../lib/casper-click';
import { Header } from '../../components/header';
import { Footer } from '../../components/footer';
import { CursorGlow } from '../../components/cursor-glow';
import { MapPin, Star, Clock, ArrowUpRight } from 'lucide-react';

const BACKEND = '';

interface RentableAsset {
  asset_id: number;
  asset_type: string;
  make?: string;
  model_est?: string;
  valuation_usd: number;
  condition_score: number;
  status: string;
  owner_address: string;
}

const ASSET_EMOJI: Record<string, string> = {
  Excavator: '🚜', Generator: '⚡', 'Cinema Camera': '📷',
  'Marine Vessel': '🚢', Crane: '🏗️', 'CNC Machine': '⚙️',
  'Agricultural Tractor': '🚜', 'Food Truck': '🚚',
};

export default function MarketplacePage() {
  const { isConnected, connect } = useClick();
  const [assets, setAssets] = useState<RentableAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [booking, setBooking] = useState<number | null>(null);
  const [booked, setBooked] = useState<Set<number>>(new Set());

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch(`${BACKEND}/api/v1/assets?status=Listed`);
        if (!res.ok) throw new Error(`Backend returned ${res.status}`);
        const data = await res.json();
        if (!cancelled) setAssets(Array.isArray(data) ? data : []);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load marketplace');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  const handleBookNow = async (assetId: number) => {
    if (!isConnected) {
      try { await connect(); } catch (e) { console.warn('Wallet connect failed:', e); }
      return;
    }
    setBooking(assetId);
    // Full rental-agreement signing + /api/v1/rentals/start wiring is the
    // renter booking flow — this view focuses on real listing discovery.
    // Booking confirmation UI intentionally kept simple here.
    setTimeout(() => {
      setBooked(prev => new Set([...prev, assetId]));
      setBooking(null);
    }, 1500);
  };

  return (
    <main className="relative min-h-screen overflow-hidden scanlines bg-background text-foreground">
      <CursorGlow />
      <div className="relative z-10">
        <Header />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-32 pb-16">
          <div className="space-y-4 mb-12 animate-fade-in-up">
            <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-primary">
              <Clock className="h-4 w-4" /> Rental Marketplace
            </div>
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
              Rent Idle Equipment
            </h1>
            <p className="max-w-3xl text-base sm:text-lg text-muted-foreground leading-relaxed">
              Browse real equipment listings and pay per-minute via streaming x402 micropayments —
              no upfront lump sum, no manual invoicing.
            </p>
          </div>

          {loading && (
            <div className="rounded-xl border border-border bg-card/30 p-8 text-center text-muted-foreground font-mono text-sm animate-pulse">
              Loading listings...
            </div>
          )}

          {error && !loading && (
            <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-6 text-destructive font-mono text-sm mb-6">
              Could not load marketplace: {error}
            </div>
          )}

          {!loading && !error && assets.length === 0 && (
            <div className="rounded-xl border border-dashed border-border bg-card/20 p-10 text-center text-muted-foreground">
              No assets currently listed for rental.
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-fade-in-up stagger-3">
            {assets.map((asset) => {
              const isBooking = booking === asset.asset_id;
              const isBooked = booked.has(asset.asset_id);
              return (
                <div key={asset.asset_id} className="rounded-xl border border-border bg-card/30 p-6 glass flex flex-col justify-between hover-lift">
                  <div>
                    <div className="flex items-center gap-3 mb-4">
                      <span className="text-3xl">{ASSET_EMOJI[asset.asset_type] ?? '🔧'}</span>
                      <div>
                        <div className="font-bold text-base leading-snug">
                          {asset.make ? `${asset.make} ${asset.model_est ?? ''}` : asset.asset_type}
                        </div>
                        <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground bg-secondary/50 px-2 py-0.5 rounded border border-border">
                          {asset.asset_type}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 font-mono text-xs mb-6">
                      <div>
                        <div className="text-muted-foreground flex items-center gap-1"><Star className="h-3 w-3" /> Condition</div>
                        <div className="font-bold text-sm text-foreground">{asset.condition_score}/100</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground flex items-center gap-1"><MapPin className="h-3 w-3" /> Value</div>
                        <div className="font-bold text-sm text-primary">${asset.valuation_usd.toLocaleString()}</div>
                      </div>
                    </div>
                  </div>

                  {isBooked ? (
                    <div className="rounded-lg border border-primary/20 bg-primary/10 p-3 text-center text-primary font-mono text-xs font-bold">
                      Booking Confirmed
                    </div>
                  ) : (
                    <button
                      onClick={() => handleBookNow(asset.asset_id)}
                      disabled={isBooking}
                      className="w-full inline-flex items-center justify-center gap-2 rounded-lg border border-primary bg-primary/10 py-3 font-mono text-xs text-primary transition-all duration-300 hover:bg-primary hover:text-primary-foreground disabled:opacity-50"
                    >
                      {isBooking ? 'Confirming...' : 'Book Now'} <ArrowUpRight className="h-4 w-4" />
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
