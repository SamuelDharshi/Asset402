'use client';
import React, { useState, useEffect } from 'react';
import { useClick, CONTRACTS } from '../../lib/casper-click';
import { Header } from '../../components/header';
import { Footer } from '../../components/footer';
import { CursorGlow } from '../../components/cursor-glow';
import { Zap, Coins, ArrowRight, ShieldCheck } from 'lucide-react';

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';
const CSPR_PER_CUC = 0.0234; 

interface CUCBalance {
  address:       string;
  balance_milli_cuc: number;
  total_earned_cuc: number;
  unit:            string;
  source:          string;
}

interface CUCEvent {
  action:     string;
  timestamp:  string;
  payload:    Record<string, unknown>;
  status:     string;
}

export default function CarbonPage() {
  const { isConnected, activeAccount, connect } = useClick();
  const [balance, setBalance]       = useState<CUCBalance | null>(null);
  const [history, setHistory]        = useState<CUCEvent[]>([]);
  const [redeemAmount, setRedeemAmount] = useState('');
  const [redeemStatus, setRedeemStatus] = useState<string | null>(null);
  const [loading, setLoading]         = useState(true);

  useEffect(() => {
    async function load() {
      const address = activeAccount ?? CONTRACTS.deployer;
      try {
        const [balRes, histRes] = await Promise.all([
          fetch(`${BACKEND}/api/v1/carbon/balance/${address}`),
          fetch(`${BACKEND}/api/v1/carbon/history/${address}`),
        ]);
        if (balRes.ok) setBalance(await balRes.json());
        if (histRes.ok) {
          const histData = await histRes.json();
          setHistory(histData.history ?? []);
        }
      } catch (err) {
        console.warn('Carbon API unavailable, using fallbacks:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
    const interval = setInterval(load, 5000);
    return () => clearInterval(interval);
  }, [activeAccount]);

  const handleRedeem = async () => {
    const amount = parseFloat(redeemAmount);
    if (!amount || amount <= 0) return;
    if (!isConnected) { await connect(); return; }
    const address = activeAccount ?? CONTRACTS.deployer;
    setRedeemStatus('pending');
    try {
      const res = await fetch(`${BACKEND}/api/v1/carbon/redeem`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ redeemerAddress: address, amountMilliCuc: Math.round(amount * 1000) }),
      });
      const data = await res.json() as { success: boolean; discountCode?: string; error?: string };
      setRedeemStatus(data.success ? `✅ Discount code: ${data.discountCode}` : `❌ ${data.error}`);
    } catch {
      setRedeemStatus('❌ Network error — try again');
    }
  };

  const balanceCUC = balance ? (balance.balance_milli_cuc / 1000).toFixed(3) : '0.000';
  const totalEarned = balance ? (balance.total_earned_cuc / 1000).toFixed(3) : '0.000';
  const redeemMotes = redeemAmount ? Math.floor(parseFloat(redeemAmount) / CSPR_PER_CUC * 1e9).toLocaleString() : '0';

  return (
    <main className="relative min-h-screen overflow-hidden scanlines bg-background text-foreground">
      <CursorGlow />
      <div className="relative z-10">
        <Header />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-32 pb-16">
          {/* Hero */}
          <div className="space-y-4 mb-12 animate-fade-in-up">
            <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-primary">
              <Zap className="h-4 w-4 animate-pulse" /> Utility Token
            </div>
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
              Usage Credits (CUC) Hub
            </h1>
            <p className="max-w-3xl text-base sm:text-lg text-muted-foreground leading-relaxed">
              Industrial assets automatically mint Carbon Use Credits (CUC) split equally between owners and renters. 
              Burn CUC to redeem fee discounts or lower protocol commissions.
            </p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-12 animate-fade-in-up stagger-2">
            {[
              { label: 'CUC Balance', value: `${balanceCUC} CUC`, sub: `MilliCUC split verified` },
              { label: 'Total CUC Minted', value: `${totalEarned} CUC`, sub: `Historical RWA emission` },
              { label: 'CUC Value (Est.)', value: `$${(parseFloat(balanceCUC) * 0.05).toFixed(2)} USD`, sub: `$0.05 per CUC peg` },
            ].map((stat, i) => (
              <div key={i} className="rounded-xl border border-border bg-card/40 p-6 glass hover-lift">
                <div className="font-mono text-xs uppercase tracking-wider text-muted-foreground mb-2">{stat.label}</div>
                <div className="font-mono text-3xl font-extrabold text-primary mb-1">{stat.value}</div>
                <div className="text-xs text-muted-foreground">{stat.sub}</div>
              </div>
            ))}
          </div>

          <div className="grid gap-8 lg:grid-cols-3">
            {/* Left side: Burn form */}
            <div className="lg:col-span-1 space-y-5 animate-fade-in-up stagger-3">
              <div className="rounded-xl border border-border bg-card/40 p-6 glass space-y-5">
                <h2 className="text-lg font-bold tracking-tight text-primary flex items-center gap-2">
                  <Coins className="h-5 w-5" /> Burn CUC for Discount
                </h2>
                <p className="text-xs text-muted-foreground">
                  Redeem CUC tokens to offset CSPR payment requirements for active rental agreements.
                </p>

                <div className="space-y-3 font-mono text-xs">
                  <div>
                    <label className="block text-muted-foreground mb-1">CUC Amount to Burn</label>
                    <input 
                      type="number" 
                      placeholder="e.g. 5.0"
                      value={redeemAmount}
                      onChange={(e) => setRedeemAmount(e.target.value)}
                      className="w-full rounded-lg border border-border bg-background/50 px-3 py-2 text-foreground focus:outline-none focus:border-primary"
                    />
                  </div>
                  <div className="flex justify-between py-2 border-t border-border/20">
                    <span className="text-muted-foreground">Rental Discount Value:</span>
                    <span className="text-primary font-bold">{redeemMotes} motes</span>
                  </div>

                  {redeemStatus === 'pending' ? (
                    <div className="text-center py-2 text-muted-foreground animate-pulse">Burning CUC tokens...</div>
                  ) : redeemStatus ? (
                    <div className="p-3 rounded bg-secondary/30 text-center font-bold text-sm border border-primary/20 text-primary">
                      {redeemStatus}
                    </div>
                  ) : null}

                  <button 
                    onClick={handleRedeem}
                    className="w-full relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-lg border border-primary bg-primary/10 py-3 font-mono text-xs text-primary transition-all duration-500 hover:bg-primary hover:text-primary-foreground active:scale-[0.98]"
                  >
                    Redeem Discount <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Right side: History */}
            <div className="lg:col-span-2 space-y-5 animate-fade-in-up stagger-4">
              <div className="rounded-xl border border-border bg-card/40 glass p-6">
                <h2 className="text-lg font-bold tracking-tight text-foreground mb-4">CUC Emission Ledger</h2>
                <div className="divide-y divide-border/20 max-h-[360px] overflow-y-auto pr-2">
                  {history.length > 0 ? (
                    history.map((log, index) => (
                      <div key={index} className="flex justify-between py-4 font-mono text-xs">
                        <div className="space-y-1">
                          <div className="font-semibold text-foreground flex items-center gap-2">
                            <span>❯ {log.action}</span>
                            <span className="text-[10px] text-muted-foreground uppercase border border-border px-1.5 py-0.5 rounded">
                              {log.status}
                            </span>
                          </div>
                          <div className="text-muted-foreground truncate max-w-[340px]">
                            {JSON.stringify(log.payload)}
                          </div>
                        </div>
                        <div className="text-muted-foreground text-right">
                          {new Date(log.timestamp).toLocaleTimeString()}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="py-8 text-center text-muted-foreground">No credit emission events found.</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <Footer />
      </div>
    </main>
  );
}
