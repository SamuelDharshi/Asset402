'use client';
import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import { Header } from '../../../../components/header';
import { Footer } from '../../../../components/footer';
import { CursorGlow } from '../../../../components/cursor-glow';
import { Zap, Terminal, Leaf } from 'lucide-react';

const BACKEND = '';

interface StreamEvent {
  eventType: string;
  rentalId: number;
  assetId: number;
  amountMotes: string;
  split: { ownerMotes: string; loanRepayMotes: string; protocolFeeMotes: string };
  loanStatus: string;
  timestamp: number;
}

interface LogEntry {
  agentName: string;
  action: string;
  status: string;
  timestamp: string;
  txHash?: string;
}

interface LoanStatus {
  status: string;
  pctRepaid: number;
  principalMotes: string;
  remainingMotes: string;
}

function motesToCspr(motes: string | bigint): number {
  return Number(BigInt(motes)) / 1e9;
}

export default function LiveStreamingPage() {
  const params = useParams();
  const assetId = Number(params.assetId);

  const [rentalId, setRentalId] = useState<number | null>(null);
  const [rentalLookupError, setRentalLookupError] = useState<string | null>(null);
  const [totalStreamed, setTotalStreamed] = useState(0);
  const [lastTick, setLastTick] = useState<StreamEvent | null>(null);
  const [pulsing, setPulsing] = useState(false);
  const [connected, setConnected] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loan, setLoan] = useState<LoanStatus | null>(null);
  const [showLog, setShowLog] = useState(false);
  const sessionStart = useRef(Date.now());

  // assetId and rentalId are different ID spaces — resolve the real active
  // rentalId for this asset before subscribing to its SSE stream.
  useEffect(() => {
    let cancelled = false;
    fetch(`${BACKEND}/api/v1/rentals/by-asset/${assetId}`)
      .then(res => { if (!res.ok) throw new Error(`No active rental (${res.status})`); return res.json(); })
      .then(data => { if (!cancelled) setRentalId(data.rentalId); })
      .catch(err => { if (!cancelled) setRentalLookupError(err.message); });
    return () => { cancelled = true; };
  }, [assetId]);

  // Real SSE feed — the counter ONLY moves on a genuine x402 tick event from
  // the backend, never a client-side setInterval fake-incrementer.
  useEffect(() => {
    if (rentalId === null) return;
    const source = new EventSource(`${BACKEND}/api/v1/stream/events?rentalId=${rentalId}`);
    source.onopen = () => setConnected(true);
    source.onerror = () => setConnected(false);
    source.addEventListener('message', (e) => {
      try {
        const data: StreamEvent = JSON.parse(e.data);
        if (data.eventType !== 'STREAM_PAYMENT') return;
        setTotalStreamed(prev => prev + Number(BigInt(data.amountMotes)) / 1e9);
        setLastTick(data);
        setPulsing(true);
        setTimeout(() => setPulsing(false), 800);
      } catch { /* heartbeat/connected frames aren't JSON payloads we care about */ }
    });
    return () => source.close();
  }, [rentalId]);

  // Poll loan status + agent log periodically (real backend state, not fabricated).
  useEffect(() => {
    let cancelled = false;
    async function poll() {
      try {
        const [loanRes, logsRes] = await Promise.all([
          fetch(`${BACKEND}/api/v1/lending/loan/${assetId}`),
          fetch(`${BACKEND}/api/v1/lending/logs/${assetId}`),
        ]);
        if (!cancelled && loanRes.ok) setLoan(await loanRes.json());
        if (!cancelled && logsRes.ok) setLogs((await logsRes.json()).logs ?? []);
      } catch { /* backend unreachable — leave last-known state visible */ }
    }
    poll();
    const interval = setInterval(poll, 8000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [assetId]);

  const sessionMinutes = Math.floor((Date.now() - sessionStart.current) / 60000);

  return (
    <main className="relative min-h-screen overflow-hidden scanlines bg-background text-foreground">
      <CursorGlow />
      <div className="relative z-10">
        <Header />

        <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-32 pb-16">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-primary">
              <Zap className="h-4 w-4" /> Asset #{assetId}
            </div>
            <span className={`font-mono text-[10px] uppercase tracking-wider px-2 py-1 rounded border ${connected ? 'border-[#4ADE80] text-[#4ADE80]' : 'border-destructive text-destructive'}`}>
              {connected ? '● LIVE' : '○ connecting...'}
            </span>
          </div>

          {rentalLookupError && (
            <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-6 text-destructive font-mono text-sm mb-6">
              {rentalLookupError} — this asset has no active rental session right now.
            </div>
          )}

          {/* The WOW counter — no blockchain words, just the number climbing */}
          <div
            className={`rounded-2xl border p-10 text-center transition-all duration-500 ${pulsing ? 'border-primary shadow-[0_0_40px_rgba(255,229,0,0.15)]' : 'border-border'}`}
          >
            <div className="font-mono text-xs uppercase tracking-wider text-muted-foreground mb-4">
              Streaming Income
            </div>
            <div className="font-mono font-extrabold text-primary" style={{ fontSize: 'clamp(40px, 8vw, 64px)' }}>
              +{totalStreamed.toFixed(4)} <span className="text-2xl text-muted-foreground">CSPR</span>
            </div>
            <div className="text-muted-foreground text-sm mt-2">↑ updating live</div>

            <div className="grid grid-cols-2 gap-6 mt-8 pt-6 border-t border-border/40 font-mono text-xs">
              <div>
                <div className="text-muted-foreground">Rate</div>
                <div className="text-foreground font-bold text-sm">
                  {lastTick ? motesToCspr(lastTick.amountMotes).toFixed(4) : '—'} CSPR/min
                </div>
              </div>
              <div>
                <div className="text-muted-foreground">Session</div>
                <div className="text-foreground font-bold text-sm">{sessionMinutes}m active</div>
              </div>
            </div>
          </div>

          {/* Autonomous split */}
          {lastTick && (
            <div className="mt-6 rounded-xl border border-border bg-card/30 p-5">
              <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground mb-3">
                Autonomous Payment Split (per tick)
              </div>
              <div className="space-y-2 font-mono text-xs">
                <div className="flex justify-between"><span>You receive</span><span className="font-bold text-primary">{motesToCspr(lastTick.split.ownerMotes).toFixed(4)} CSPR</span></div>
                <div className="flex justify-between"><span>Loan repayment</span><span className="font-bold text-foreground">{motesToCspr(lastTick.split.loanRepayMotes).toFixed(4)} CSPR</span></div>
                <div className="flex justify-between"><span>Protocol fee</span><span className="font-bold text-muted-foreground">{motesToCspr(lastTick.split.protocolFeeMotes).toFixed(4)} CSPR</span></div>
              </div>
            </div>
          )}

          {/* Loan repayment — real on-chain-derived state */}
          {loan && (
            <div className="mt-6 rounded-xl border border-border bg-card/30 p-5">
              <div className="flex justify-between font-mono text-[10px] uppercase tracking-wider text-muted-foreground mb-2">
                <span>Loan Repayment</span>
                <span className="text-primary font-bold">{loan.pctRepaid.toFixed(1)}%</span>
              </div>
              <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                <div className="h-full bg-primary rounded-full transition-all duration-700" style={{ width: `${loan.pctRepaid}%` }} />
              </div>
              <div className="mt-2 font-mono text-[11px] text-muted-foreground">
                {motesToCspr(loan.principalMotes).toFixed(2)} borrowed · {motesToCspr(loan.remainingMotes).toFixed(2)} remaining
              </div>
            </div>
          )}

          <div className="mt-6 flex items-center gap-2 text-xs text-[#4ADE80] font-mono">
            <Leaf className="h-3.5 w-3.5" /> Carbon credits accrue automatically at session close
          </div>

          {/* Collapsible agent log — the one place blockchain terms live */}
          <button
            onClick={() => setShowLog(s => !s)}
            className="mt-8 w-full flex items-center justify-center gap-2 rounded-lg border border-border py-2.5 font-mono text-xs text-muted-foreground hover:text-foreground hover:border-primary/50 transition-colors"
          >
            <Terminal className="h-3.5 w-3.5" /> {showLog ? 'Hide' : 'Show'} Agent Log
          </button>
          {showLog && (
            <div className="mt-3 rounded-lg border border-border bg-black/40 p-4 font-mono text-[11px] text-primary/90 space-y-1.5 max-h-64 overflow-y-auto">
              {logs.length === 0 && <div className="text-muted-foreground">No agent activity recorded yet for this asset.</div>}
              {logs.map((log, i) => (
                <div key={i} className="flex justify-between gap-4">
                  <span className="text-muted-foreground">[{log.agentName}]</span>
                  <span className="flex-1 truncate">{log.action}</span>
                  {log.txHash && (
                    <a
                      href={`https://testnet.cspr.live/deploy/${log.txHash}`}
                      target="_blank" rel="noreferrer"
                      className="text-primary underline shrink-0"
                    >
                      tx ↗
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <Footer />
      </div>
    </main>
  );
}
