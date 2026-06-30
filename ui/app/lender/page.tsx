'use client';
import React, { useState, useEffect } from 'react';
import { useClick, CONTRACTS } from '../../lib/casper-click';
import { Header } from '../../components/header';
import { Footer } from '../../components/footer';
import { CursorGlow } from '../../components/cursor-glow';
import { Zap, Coins, ArrowUpRight, ArrowDownRight, ShieldCheck, Heart, Info } from 'lucide-react';

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';

interface Loan {
  loan_id:         number;
  borrower:        string;
  asset_id:        number;
  asset_name:      string;
  principal_motes: string;
  remaining_motes: string;
  ltv_bps:         number;
  status:          string;
  health:          'GOOD' | 'WARNING' | 'LIQUIDATED';
}

export default function LenderPage() {
  const { isConnected, connect, activeAccount } = useClick();
  const [deposited, setDeposited] = useState(45000);
  const [depositAmount, setDepositAmount] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [apy, setApy] = useState(12.5);
  const [accrued, setAccrued] = useState(142.84);
  const [loans, setLoans] = useState<Loan[]>([
    {
      loan_id: 1,
      borrower: CONTRACTS.deployer,
      asset_id: 1,
      asset_name: 'Komatsu PC88 Excavator RWA',
      principal_motes: '100000000000', // 100 CSPR
      remaining_motes: '26000000000',  // 26 CSPR remaining (74% repaid)
      ltv_bps: 7000,
      status: 'Active',
      health: 'GOOD',
    },
    {
      loan_id: 2,
      borrower: CONTRACTS.deployer,
      asset_id: 3,
      asset_name: 'Caterpillar XQ230 Generator',
      principal_motes: '150000000000', // 150 CSPR
      remaining_motes: '150000000000', // 150 CSPR remaining (0% repaid)
      ltv_bps: 6500,
      status: 'Active',
      health: 'GOOD',
    }
  ]);

  // Real-time accrued interest tick
  useEffect(() => {
    const interval = setInterval(() => {
      setAccrued(prev => prev + 0.0001);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleDeposit = () => {
    const val = parseFloat(depositAmount);
    if (!val || val <= 0) return;
    setDeposited(prev => prev + val);
    setDepositAmount('');
  };

  const handleWithdraw = () => {
    const val = parseFloat(withdrawAmount);
    if (!val || val <= 0 || val > deposited) return;
    setDeposited(prev => prev - val);
    setWithdrawAmount('');
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
              <Zap className="h-4 w-4" /> Liquidity Provision
            </div>
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
              Lender Portfolio
            </h1>
            <p className="max-w-3xl text-base sm:text-lg text-muted-foreground leading-relaxed">
              Deposit CSPR liquidity to earn interest from active rental agreements.
              Loans are automatically originated at a maximum 70% LTV, secured by RWA collateral locked on the Casper Network.
            </p>
          </div>

          {/* Metrics Panel */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-5 mb-12 animate-fade-in-up stagger-2">
            {[
              { label: 'Your Deposits', value: `${deposited.toLocaleString()} CSPR`, sub: `Active yielding capital` },
              { label: 'Projected APY', value: `${apy.toFixed(1)}% APY`, sub: `RWA-backed interest` },
              { label: 'Accrued Interest', value: `${accrued.toFixed(5)} CSPR`, sub: `Real-time streaming yield` },
              { label: 'Pool Health Factor', value: '1.42', sub: `Collateralized buffer: GOOD` },
            ].map((stat, i) => (
              <div key={i} className="rounded-xl border border-border bg-card/40 p-6 glass hover-lift">
                <div className="font-mono text-xs uppercase tracking-wider text-muted-foreground mb-2">{stat.label}</div>
                <div className="font-mono text-2xl font-extrabold text-primary mb-1">{stat.value}</div>
                <div className="text-xs text-muted-foreground">{stat.sub}</div>
              </div>
            ))}
          </div>

          <div className="grid gap-8 lg:grid-cols-3">
            {/* Liquidity Actions */}
            <div className="lg:col-span-1 space-y-6 animate-fade-in-up stagger-3">
              <div className="rounded-xl border border-border bg-card/40 p-6 glass space-y-5">
                <h2 className="text-lg font-bold tracking-tight text-primary flex items-center gap-2">
                  <Coins className="h-5 w-5" /> Manage Liquidity
                </h2>

                <div className="space-y-4 font-mono text-xs">
                  {/* Deposit */}
                  <div className="space-y-2">
                    <label className="block text-muted-foreground">Deposit CSPR</label>
                    <div className="flex gap-2">
                      <input 
                        type="number" 
                        placeholder="Amount"
                        value={depositAmount}
                        onChange={(e) => setDepositAmount(e.target.value)}
                        className="flex-1 rounded-lg border border-border bg-background/50 px-3 py-2 text-foreground focus:outline-none focus:border-primary"
                      />
                      <button 
                        onClick={handleDeposit}
                        className="rounded-lg bg-primary text-primary-foreground px-4 py-2 font-bold hover:bg-primary/95 transition"
                      >
                        Deposit
                      </button>
                    </div>
                  </div>

                  {/* Withdraw */}
                  <div className="space-y-2">
                    <label className="block text-muted-foreground">Withdraw CSPR</label>
                    <div className="flex gap-2">
                      <input 
                        type="number" 
                        placeholder="Amount"
                        value={withdrawAmount}
                        onChange={(e) => setWithdrawAmount(e.target.value)}
                        className="flex-1 rounded-lg border border-border bg-background/50 px-3 py-2 text-foreground focus:outline-none focus:border-primary"
                      />
                      <button 
                        onClick={handleWithdraw}
                        className="rounded-lg border border-primary text-primary px-4 py-2 font-bold hover:bg-primary/10 transition"
                      >
                        Withdraw
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Pool Info */}
              <div className="rounded-xl border border-border/80 bg-secondary/20 p-5 font-mono text-xs flex gap-3 text-muted-foreground">
                <Info className="h-5 w-5 text-primary flex-shrink-0" />
                <div className="space-y-1">
                  <div className="font-semibold text-foreground">Casper Lending Pool Invariant</div>
                  <div>Liquidations trigger automatically at 85% LTV. Protocol commission is capped at 6% of active streams.</div>
                </div>
              </div>
            </div>

            {/* Active Loan Ledger */}
            <div className="lg:col-span-2 space-y-6 animate-fade-in-up stagger-4">
              <div className="rounded-xl border border-border bg-card/40 glass p-6">
                <h2 className="text-lg font-bold tracking-tight text-foreground mb-6">Active Loan Ledger</h2>
                <div className="space-y-6">
                  {loans.map((loan) => {
                    const principal = parseFloat(loan.principal_motes) / 1e9;
                    const remaining = parseFloat(loan.remaining_motes) / 1e9;
                    const repaid = principal - remaining;
                    const pctRepaid = Math.round((repaid / principal) * 100);

                    return (
                      <div key={loan.loan_id} className="p-4 rounded-lg border border-border/40 bg-card/20 space-y-4">
                        <div className="flex justify-between items-center flex-wrap gap-2">
                          <div className="font-mono text-xs">
                            <span className="text-primary font-bold">Loan #{loan.loan_id}</span>
                            <span className="text-muted-foreground mx-2">·</span>
                            <span className="text-foreground font-semibold">{loan.asset_name}</span>
                          </div>
                          <span className="font-mono text-[9px] uppercase tracking-wider px-2 py-0.5 rounded border border-[#4ADE80] text-[#4ADE80] bg-[#4ADE80]/10">
                            {loan.health}
                          </span>
                        </div>

                        {/* Progress */}
                        <div className="space-y-2 font-mono text-[10px]">
                          <div className="flex justify-between text-muted-foreground">
                            <span>Repayment Progress: {pctRepaid}%</span>
                            <span>{repaid.toFixed(2)} / {principal.toFixed(2)} CSPR</span>
                          </div>
                          <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-primary rounded-full transition-all duration-500"
                              style={{ width: `${pctRepaid}%` }}
                            />
                          </div>
                        </div>

                        {/* Details */}
                        <div className="grid grid-cols-3 gap-2 font-mono text-[10px] text-muted-foreground border-t border-border/10 pt-3">
                          <div>
                            <div>Initial LTV</div>
                            <div className="text-foreground font-semibold">{(loan.ltv_bps / 100).toFixed(1)}%</div>
                          </div>
                          <div>
                            <div>Collateral Asset ID</div>
                            <div className="text-foreground font-semibold">Asset #{loan.asset_id}</div>
                          </div>
                          <div>
                            <div>Borrower Hex</div>
                            <div className="text-foreground font-semibold truncate max-w-[120px]">{loan.borrower}</div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
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
