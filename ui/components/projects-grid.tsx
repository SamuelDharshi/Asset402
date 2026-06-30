"use client"

import { useState, useEffect } from "react"
import { cn } from "@/lib/utils"
import { Star, GitFork, ExternalLink, ShieldCheck } from "lucide-react"

const filters = ["all", "Idle", "Listed", "Rented", "Locked", "Maintenance"]

export function ProjectsGrid() {
  const [activeFilter, setActiveFilter] = useState("all")
  const [assets, setAssets] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchAssets() {
      try {
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001";
        const res = await fetch(`${backendUrl}/api/v1/assets`)
        if (res.ok) {
          const data = await res.json()
          if (Array.isArray(data)) {
            setAssets(data)
          }
        }
      } catch (err) {
        console.error("Failed to fetch assets, falling back to mock assets:", err)
        setAssets([
          {
            asset_id: 1,
            asset_type: "Excavator",
            make: "Komatsu",
            model_est: "Komatsu PC88 Excavator",
            valuation_usd: 184000,
            condition_score: 82,
            status: "Rented",
            owner_address: "020394ccdb983b7b2a88486448e5d170f737a80264d32cab99a3e2a3e01f33d6cea1",
            mint_tx_hash: "e69b9da937de5ea373274a1e982cfc047818e8a8774bb2899f1e758e76e47e40"
          },
          {
            asset_id: 2,
            asset_type: "Marine Vessel",
            make: "Workboat",
            model_est: "Marine Work Vessel 12m",
            valuation_usd: 620000,
            condition_score: 90,
            status: "Listed",
            owner_address: "020394ccdb983b7b2a88486448e5d170f737a80264d32cab99a3e2a3e01f33d6cea1",
            mint_tx_hash: "mock_tx_2"
          },
          {
            asset_id: 3,
            asset_type: "Generator",
            make: "Caterpillar",
            model_est: "Caterpillar XQ230 Generator",
            valuation_usd: 290000,
            condition_score: 88,
            status: "Idle",
            owner_address: "020394ccdb983b7b2a88486448e5d170f737a80264d32cab99a3e2a3e01f33d6cea1",
            mint_tx_hash: "mock_tx_3"
          }
        ])
      } finally {
        setLoading(false)
      }
    }
    fetchAssets()
    const interval = setInterval(fetchAssets, 5000)
    return () => clearInterval(interval)
  }, [])

  const filteredAssets = activeFilter === "all" 
    ? assets 
    : assets.filter((a) => a.status.toLowerCase() === activeFilter.toLowerCase())

  return (
    <section id="projects" className="px-4 sm:px-6 py-20 sm:py-28">
      <div className="mx-auto max-w-7xl">
        <div className="mb-10 sm:mb-14 flex flex-col gap-6 sm:gap-8 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-3 animate-fade-in-up">
            <p className="font-mono text-xs uppercase tracking-[0.25em] sm:tracking-[0.35em] text-primary">RWA Catalog</p>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">Monetized Assets</h2>
          </div>

          <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 sm:overflow-visible sm:flex-wrap scrollbar-hide animate-fade-in-up stagger-2">
            {filters.map((filter) => (
              <button
                key={filter}
                onClick={() => setActiveFilter(filter)}
                className={cn(
                  "shrink-0 rounded-lg border px-5 py-2.5 font-mono text-xs uppercase tracking-wider transition-all duration-300 active:scale-[0.98]",
                  activeFilter === filter
                    ? "border-primary bg-primary/15 text-primary shadow-sm shadow-primary/20"
                    : "border-border text-muted-foreground hover:border-foreground/50 hover:text-foreground hover:bg-secondary/50",
                )}
              >
                {filter}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filteredAssets.map((asset, index) => (
            <article
              key={asset.asset_id}
              className={cn(
                "group relative overflow-hidden rounded-xl border bg-card/40 p-6 sm:p-7 glass transition-all duration-400 active:scale-[0.99] hover-lift hover:border-primary/40 hover:bg-card/70 animate-fade-in-up",
                "border-border/60"
              )}
              style={{ animationDelay: `${(index % 6) * 100 + 200}ms` }}
            >
              {/* Status indicator */}
              <div className="absolute right-5 top-5 flex items-center gap-2.5">
                <span
                  className={cn(
                    "h-2.5 w-2.5 rounded-full transition-shadow duration-300",
                    asset.status === "Rented" && "bg-yellow-500 animate-pulse shadow-sm shadow-yellow-500/50",
                    asset.status === "Listed" && "bg-primary shadow-sm shadow-primary/50",
                    asset.status === "Idle" && "bg-blue-500 shadow-sm shadow-blue-500/50",
                    asset.status === "Locked" && "bg-red-500 shadow-sm shadow-red-500/50",
                    asset.status === "Maintenance" && "bg-orange-500 animate-pulse shadow-sm shadow-orange-500/50"
                  )}
                />
                <span className="font-mono text-xs text-muted-foreground">{asset.status}</span>
              </div>

              <div className="mb-5 font-mono text-xs text-muted-foreground">
                Asset ID: #{asset.asset_id}
              </div>

              <h3 className="mb-3 text-lg sm:text-xl font-bold tracking-tight transition-all duration-300 group-hover:text-primary">
                {asset.model_est ?? asset.asset_type ?? `RWA Asset #${asset.asset_id}`}
              </h3>

              <p className="mb-5 text-xs leading-relaxed text-muted-foreground font-mono truncate">
                Owner: {asset.owner_address ? `${asset.owner_address.slice(0, 10)}...${asset.owner_address.slice(-6)}` : "demo-owner"}
              </p>

              <div className="mb-5 flex items-center gap-5 font-mono text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5 transition-colors group-hover:text-yellow-500">
                  <Star className="h-3.5 w-3.5 text-primary" />
                  Val: ${asset.valuation_usd?.toLocaleString()} USD
                </span>
                <span className="flex items-center gap-1.5 transition-colors group-hover:text-foreground">
                  <GitFork className="h-3.5 w-3.5 text-primary" />
                  Cond: {asset.condition_score}/100
                </span>
              </div>

              <div className="mb-5 flex flex-wrap gap-2">
                {[asset.asset_type, asset.make ?? "RWA", asset.status].filter(Boolean).map((tag) => (
                  <span
                    key={tag}
                    className="rounded-md border border-border/80 bg-secondary/60 px-2.5 py-1 font-mono text-[10px] text-secondary-foreground transition-colors hover:border-primary/50 hover:bg-primary/10"
                  >
                    {tag}
                  </span>
                ))}
              </div>

              <div className="flex items-center gap-4 border-t border-border/20 pt-4">
                {asset.mint_tx_hash && !asset.mint_tx_hash.startsWith("mock") ? (
                  <a
                    href={`https://testnet.cspr.live/deploy/${asset.mint_tx_hash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 font-mono text-xs text-primary hover:text-foreground transition-all duration-300 group/link"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <ShieldCheck className="h-4 w-4 text-primary" />
                    <span className="underline-animate">on-chain proof</span>
                  </a>
                ) : (
                  <span className="flex items-center gap-2 font-mono text-xs text-muted-foreground">
                    <ShieldCheck className="h-4 w-4 text-muted-foreground" />
                    <span>demo contract</span>
                  </span>
                )}
                <a
                  href="/maintenance"
                  className="ml-auto flex items-center gap-2 font-mono text-xs text-muted-foreground hover:text-primary transition-all duration-300 group/link"
                  onClick={(e) => e.stopPropagation()}
                >
                  <ExternalLink className="h-4 w-4" />
                  <span className="underline-animate">service</span>
                </a>
              </div>

              <div className="absolute bottom-0 left-0 h-1 w-0 bg-gradient-to-r from-primary via-primary/80 to-transparent transition-all duration-500 group-hover:w-full" />
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
