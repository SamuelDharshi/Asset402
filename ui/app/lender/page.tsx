'use client';
import React, { useState, useEffect } from 'react';
import { Header } from '../../components/header';
import { Footer } from '../../components/footer';
import { CursorGlow } from '../../components/cursor-glow';
import { Zap, Coins, Info } from 'lucide-react';

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';

interface Loan {
  loanId:         string;
  assetId:        number;
  assetName:      string;
  borrower:       string;
  principalMotes: string;
  remainingMotes: string;
  ltvBps:         number;
  status:         string;
}

interface PoolStats {
  activeLoanCount:        number;
  totalPrincipalCspr:     number;
  totalRemainingCspr:     number;
  totalRepaidCspr:        number;
  lendingPoolDeployed:    boolean;
  lpDepositFlowAvailable: boolean;
}

export default function LenderPage() {
  const [loans, setLoans] = useState<Loan[]>([]);
  const [stats, setStats] = useState<PoolStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [loansRes, statsRes] = await Promise.all([
          fetch(`${BACKEND}/api/v1/lending/loans`),
          fetch(`${BACKEND}/api/v1/lending/pool-stats`),
        ]);
        if (!loansRes.ok || !statsRes.ok) throw new Error('Backend request failed');
        const loansData = await loansRes.json();
        const statsData = await statsRes.json();
        if (!cancelled) {
          setLoans(loansData.loans ?? []);
          setStats(statsData);
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load pool data');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  // NOTE: there is no handleDeposit here on purpose. Depositing requires
  // building a payable LendingPool.deposit() deploy and having the LP's own
  // Casper Wallet sign it (see lib/casper-click.tsx, which only supports
  // signMessage/signTypedData today, not full deploy signing) — until that
  // exists, a "Deposit" button here would either no-op silently or fake
  // success, so it's rendered as a disabled state instead below.

  return (
    <main className="relative min-h-screen overflow-hidden scanlines bg-background text-foreground">
      <CursorGlow />
      <div className="relative z-10">
        <Header />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-32 pb-16">
          <div className="space-y-4 mb-12 animate-fade-in-up">
            <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-primary">
              <Zap className="h-4 w-4" /> Liquidity Provision
            </div>
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
              Lending Pool
            </h1>
            <p className="max-w-3xl text-base sm:text-lg text-muted-foreground leading-relaxed">
              Real pool state derived from the backend's tracked loans — deposit/withdraw activates
              once LendingPool is live on testnet.
            </p>
          </div>

          {loading && (
            <div className="rounded-xl border border-border bg-card/30 p-8 text-center text-muted-foreground font-mono text-sm animate-pulse">
              Loading pool data...
            </div>
          )}
          {error && !loading && (
            <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-6 text-destructive font-mono text-sm mb-6">
              Could not load pool data: {error}
            </div>
          )}

          {stats && !loading && !error && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-5 mb-12 animate-fade-in-up stagger-2">
                {[
                  { label: 'Active Loans', value: `${stats.activeLoanCount}` },
                  { label: 'Total Principal', value: `${stats.totalPrincipalCspr.toFixed(2)} CSPR` },
                  { label: 'Outstanding', value: `${stats.totalRemainingCspr.toFixed(2)} CSPR` },
                  { label: 'Repaid So Far', value: `${stats.totalRepaidCspr.toFixed(2)} CSPR` },
                ].map((stat, i) => (
                  <div key={i} className="rounded-xl border border-border bg-card/40 p-6 glass hover-lift">
                    <div className="font-mono text-xs uppercase tracking-wider text-muted-foreground mb-2">{stat.label}</div>
                    <div className="font-mono text-2xl font-extrabold text-primary mb-1">{stat.value}</div>
                  </div>
                ))}
              </div>

              <div className="grid gap-8 lg:grid-cols-3">
                <div className="lg:col-span-1 space-y-6 animate-fade-in-up stagger-3">
                  <div className="rounded-xl border border-border bg-card/40 p-6 glass space-y-5">
                    <h2 className="text-lg font-bold tracking-tight text-primary flex items-center gap-2">
                      <Coins className="h-5 w-5" /> Manage Liquidity
                    </h2>
                    {stats.lpDepositFlowAvailable ? (
                      <button
                        className="w-full rounded-lg bg-primary text-primary-foreground px-4 py-2 font-bold hover:bg-primary/95 transition"
                      >
                        Deposit CSPR
                      </button>
                    ) : (
                      <div className="rounded-lg border border-dashed border-border p-4 text-xs text-muted-foreground font-mono">
                        {stats.lendingPoolDeployed
                          ? 'LendingPool is live on testnet, but self-service deposit isn’t wired up yet — it needs your wallet to sign a payable deposit transaction directly, which this build doesn’t support.'
                          : 'LendingPool is not yet deployed to testnet. Deposit/withdraw will activate once LENDING_POOL_ADDR is configured on the backend.'}
                      </div>
                    )}
                  </div>

                  <div className="rounded-xl border border-border/80 bg-secondary/20 p-5 font-mono text-xs flex gap-3 text-muted-foreground">
                    <Info className="h-5 w-5 text-primary flex-shrink-0" />
                    <div className="space-y-1">
                      <div className="font-semibold text-foreground">Casper Lending Pool Invariant</div>
                      <div>Liquidations trigger automatically at 85% LTV. Protocol commission is capped at 6% of active streams.</div>
                    </div>
                  </div>
                </div>

                <div className="lg:col-span-2 space-y-6 animate-fade-in-up stagger-4">
                  <div className="rounded-xl border border-border bg-card/40 glass p-6">
                    <h2 className="text-lg font-bold tracking-tight text-foreground mb-6">Active Loan Ledger</h2>
                    {loans.length === 0 ? (
                      <div className="text-center text-muted-foreground text-sm py-8">No loans recorded yet.</div>
                    ) : (
                      <div className="space-y-6">
                        {loans.map((loan) => {
                          const principal = parseFloat(loan.principalMotes) / 1e9;
                          const remaining = parseFloat(loan.remainingMotes) / 1e9;
                          const repaid = principal - remaining;
                          const pctRepaid = principal > 0 ? Math.round((repaid / principal) * 100) : 0;

                          return (
                            <div key={loan.loanId} className="p-4 rounded-lg border border-border/40 bg-card/20 space-y-4">
                              <div className="flex justify-between items-center flex-wrap gap-2">
                                <div className="font-mono text-xs">
                                  <span className="text-primary font-bold">Loan #{loan.loanId}</span>
                                  <span className="text-muted-foreground mx-2">·</span>
                                  <span className="text-foreground font-semibold">{loan.assetName}</span>
                                </div>
                                <span className="font-mono text-[9px] uppercase tracking-wider px-2 py-0.5 rounded border border-[#4ADE80] text-[#4ADE80] bg-[#4ADE80]/10">
                                  {loan.status}
                                </span>
                              </div>

                              <div className="space-y-2 font-mono text-[10px]">
                                <div className="flex justify-between text-muted-foreground">
                                  <span>Repayment Progress: {pctRepaid}%</span>
                                  <span>{repaid.toFixed(2)} / {principal.toFixed(2)} CSPR</span>
                                </div>
                                <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                                  <div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: `${pctRepaid}%` }} />
                                </div>
                              </div>

                              <div className="grid grid-cols-3 gap-2 font-mono text-[10px] text-muted-foreground border-t border-border/10 pt-3">
                                <div><div>Initial LTV</div><div className="text-foreground font-semibold">{(loan.ltvBps / 100).toFixed(1)}%</div></div>
                                <div><div>Collateral Asset ID</div><div className="text-foreground font-semibold">Asset #{loan.assetId}</div></div>
                                <div><div>Borrower</div><div className="text-foreground font-semibold truncate max-w-[120px]">{loan.borrower}</div></div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        <Footer />
      </div>
    </main>
  );
}
