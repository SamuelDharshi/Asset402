'use client';
import React, { useState, useRef } from 'react';
import Link from 'next/link';
import { useClick, CONTRACTS } from '../../lib/casper-click';
import { Header } from '../../components/header';
import { Footer } from '../../components/footer';
import { CursorGlow } from '../../components/cursor-glow';
import { Camera, CheckCircle2, Loader2, ExternalLink } from 'lucide-react';

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';

interface VisionResult {
  assetType: string;
  make: string;
  modelEst: string;
  yearRange: string;
  valueUsdLow: number;
  valueUsdHigh: number;
  conditionScore: number;
  confidence: number;
  ipfsHash: string;
}

interface RiskResult {
  maxLoanCspr: number;
  recommendation: 'APPROVE' | 'REJECT' | 'MANUAL_REVIEW';
  usedFallbackData: boolean;
}

interface MintResult {
  assetId: number;
  explorerUrl?: string;
  asset: { mint_tx_hash: string };
}

type Step = 1 | 2 | 3 | 4;

export default function OnboardPage() {
  const { activeAccount } = useClick();
  const ownerAddress = activeAccount ?? CONTRACTS.deployer;

  const [step, setStep] = useState<Step>(1);
  const [photoBase64, setPhotoBase64] = useState<string | null>(null);
  const [vision, setVision] = useState<VisionResult | null>(null);
  const [risk, setRisk] = useState<RiskResult | null>(null);
  const [mint, setMint] = useState<MintResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePhotoSelected = async (file: File) => {
    setError(null);
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result as string;
      setPhotoBase64(base64);
      setStep(2);
      setLoading(true);
      try {
        const res = await fetch(`${BACKEND}/api/v1/vision/analyze`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ base64Image: base64 }),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.detail || `Vision analysis failed (${res.status})`);
        }
        const data: VisionResult = await res.json();
        setVision(data);

        // Fetch a real loan offer alongside the classification.
        const riskRes = await fetch(`${BACKEND}/api/v1/vision/risk`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ownerPublicKey: ownerAddress, assetId: 0, visionResult: data }),
        }).catch(() => null);
        if (riskRes?.ok) setRisk(await riskRes.json());
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Vision analysis failed');
        setStep(1);
      } finally {
        setLoading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleConfirmAndMint = async () => {
    if (!vision) return;
    setStep(3);
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${BACKEND}/api/v1/assets/onboard`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ownerPublicKey: ownerAddress,
          assetType: vision.assetType,
          make: vision.make,
          modelEst: vision.modelEst,
          valuationUsd: Math.round((vision.valueUsdLow + vision.valueUsdHigh) / 2),
          conditionScore: vision.conditionScore,
          ipfsPhotoHash: vision.ipfsHash,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.detail || body.error || `On-chain mint failed (${res.status})`);
      }
      const data: MintResult = await res.json();
      setMint(data);
      setStep(4);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Minting failed');
      setStep(2);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="relative min-h-screen overflow-hidden scanlines bg-background text-foreground">
      <CursorGlow />
      <div className="relative z-10">
        <Header />

        <div className="max-w-2xl mx-auto px-4 sm:px-6 pt-32 pb-16">
          <div className="flex items-center justify-center gap-2 mb-10 font-mono text-xs text-muted-foreground">
            {[1, 2, 3, 4].map(n => (
              <React.Fragment key={n}>
                <div className={`h-8 w-8 rounded-full flex items-center justify-center border ${step >= n ? 'border-primary bg-primary/10 text-primary' : 'border-border'}`}>
                  {n}
                </div>
                {n < 4 && <div className={`h-px w-8 ${step > n ? 'bg-primary' : 'bg-border'}`} />}
              </React.Fragment>
            ))}
          </div>

          {error && (
            <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-4 text-destructive font-mono text-sm mb-6">
              {error}
            </div>
          )}

          {/* Step 1 — Photograph */}
          {step === 1 && (
            <div className="text-center space-y-6 animate-fade-in-up">
              <h1 className="text-3xl font-bold">Photograph Your Asset</h1>
              <p className="text-muted-foreground">One photo. Real AI identification. No forms.</p>
              <div
                onClick={() => fileInputRef.current?.click()}
                className="mx-auto max-w-sm aspect-square rounded-2xl border-2 border-dashed border-border hover:border-primary/50 flex flex-col items-center justify-center gap-3 cursor-pointer transition-colors"
              >
                <Camera className="h-10 w-10 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Tap to capture or upload</span>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handlePhotoSelected(e.target.files[0])}
              />
            </div>
          )}

          {/* Step 2 — AI Identification */}
          {step === 2 && (
            <div className="space-y-6 animate-fade-in-up">
              <h1 className="text-3xl font-bold text-center">AI Identification</h1>
              {photoBase64 && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={photoBase64} alt="Uploaded asset" className="mx-auto max-h-48 rounded-xl border border-border" />
              )}
              {loading && (
                <div className="flex items-center justify-center gap-2 text-muted-foreground font-mono text-sm">
                  <Loader2 className="h-4 w-4 animate-spin" /> Analyzing with Claude vision...
                </div>
              )}
              {vision && !loading && (
                <div className="rounded-xl border border-border bg-card/30 p-6 space-y-3 font-mono text-sm">
                  <Row label="Category" value={vision.assetType} />
                  <Row label="Make / Model" value={`${vision.make} ${vision.modelEst}`} />
                  <Row label="Year Range" value={vision.yearRange} />
                  <Row label="Condition" value={`${vision.conditionScore} / 100`} />
                  <Row label="Market Value" value={`$${vision.valueUsdLow.toLocaleString()} – $${vision.valueUsdHigh.toLocaleString()}`} />
                  <Row label="AI Confidence" value={`${(vision.confidence * 100).toFixed(0)}%`} />
                  {risk?.usedFallbackData && (
                    <div className="text-xs text-yellow-500 pt-2 border-t border-border/40">
                      ⚠ Risk data used a fallback source — verify before large loans.
                    </div>
                  )}
                  <div className="flex gap-3 pt-4">
                    <button
                      onClick={handleConfirmAndMint}
                      className="flex-1 rounded-lg border border-primary bg-primary/10 py-3 text-primary hover:bg-primary hover:text-primary-foreground transition-colors"
                    >
                      ✓ Confirm
                    </button>
                    <button
                      onClick={() => { setStep(1); setVision(null); setPhotoBase64(null); }}
                      className="flex-1 rounded-lg border border-border py-3 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      Retake Photo
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 3 — Minting */}
          {step === 3 && (
            <div className="text-center space-y-6 animate-fade-in-up">
              <h1 className="text-3xl font-bold">Minting On-Chain Identity</h1>
              <div className="flex items-center justify-center gap-2 text-muted-foreground font-mono text-sm">
                <Loader2 className="h-4 w-4 animate-spin" /> Submitting mint_asset deploy to Casper testnet...
              </div>
              <p className="text-xs text-muted-foreground">This is a real signed transaction — confirmation can take up to a minute.</p>
            </div>
          )}

          {/* Step 4 — Unlock options */}
          {step === 4 && mint && (
            <div className="space-y-6 animate-fade-in-up text-center">
              <CheckCircle2 className="h-12 w-12 text-[#4ADE80] mx-auto" />
              <h1 className="text-3xl font-bold">Your asset is live on Casper.</h1>
              <p className="font-mono text-sm text-muted-foreground">Token: #AP-{String(mint.assetId).padStart(5, '0')}</p>
              {mint.explorerUrl && (
                <a href={mint.explorerUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary text-xs font-mono underline">
                  View real deploy on testnet.cspr.live <ExternalLink className="h-3 w-3" />
                </a>
              )}

              <div className="grid gap-4 mt-8 text-left">
                <OptionCard title="💰 Get Instant Loan" desc={risk ? `Up to ${risk.maxLoanCspr.toFixed(0)} CSPR · 70% LTV` : 'Loan offer unavailable'} href="/lender" cta="Get Funds" />
                <OptionCard title="🌐 Open to Co-Investors" desc="Sell fractional shares of this asset's income stream" href="/invest" cta="Set Up Fractional" />
                <OptionCard title="📣 List for Rental Only" desc="No loan · AI sets optimal pricing" href="/marketplace" cta="List Asset" />
              </div>

              <Link href="/" className="inline-block mt-6 text-xs text-muted-foreground underline">
                Back to Dashboard
              </Link>
            </div>
          )}
        </div>

        <Footer />
      </div>
    </main>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-foreground font-bold">{value}</span>
    </div>
  );
}

function OptionCard({ title, desc, href, cta }: { title: string; desc: string; href: string; cta: string }) {
  return (
    <Link href={href} className="rounded-xl border border-border bg-card/30 p-5 hover:border-primary/50 transition-colors block">
      <div className="font-bold mb-1">{title}</div>
      <div className="text-sm text-muted-foreground mb-3">{desc}</div>
      <div className="text-primary text-xs font-mono">{cta} →</div>
    </Link>
  );
}
