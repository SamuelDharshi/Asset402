"use client"

import { useState, useEffect } from "react"
import { cn } from "@/lib/utils"
import { ShieldAlert, Terminal, Activity } from "lucide-react"

export function Workbench() {
  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchLogs() {
      try {
        const address = "020394ccdb983b7b2a88486448e5d170f737a80264d32cab99a3e2a3e01f33d6cea1"
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001";
        const res = await fetch(`${backendUrl}/api/v1/carbon/history/${address}`)
        if (res.ok) {
          const data = await res.json()
          if (Array.isArray(data.history)) {
            setLogs(data.history)
          }
        }
      } catch (err) {
        console.error("Failed to fetch logs, falling back to mock logs:", err)
        setLogs([
          {
            action: "mint_asset",
            timestamp: new Date(Date.now() - 3600000).toISOString(),
            status: "success",
            payload: { assetId: 1, type: "Excavator", valuation: 184000 }
          },
          {
            action: "issue_cuc",
            timestamp: new Date(Date.now() - 1800000).toISOString(),
            status: "success",
            payload: { amountMilliCuc: 3200, assetId: 1, split: "50/50" }
          },
          {
            action: "maintenance_approved",
            timestamp: new Date(Date.now() - 600000).toISOString(),
            status: "success",
            payload: { asset_id: 3, provider: "PowerGen Services", booking_ref: "MNT-3-J9K" }
          }
        ])
      } finally {
        setLoading(false)
      }
    }
    fetchLogs()
    const interval = setInterval(fetchLogs, 5000)
    return () => clearInterval(interval)
  }, [])

  return (
    <section id="workbench" className="px-4 sm:px-6 py-20 sm:py-28 border-t border-border/30">
      <div className="mx-auto max-w-7xl">
        <div className="mb-10 sm:mb-14 space-y-3 animate-fade-in-up">
          <p className="font-mono text-xs uppercase tracking-[0.25em] sm:tracking-[0.35em] text-primary">
            Agent Activity
          </p>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">AI Agent Telemetry</h2>
          <p className="max-w-2xl text-base sm:text-lg text-muted-foreground leading-relaxed">
            Real-time telemetry and decision logs streamed from active CollectorAgent, ListingAgent, and MaintenanceOracleAgent.
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card/40 glass backdrop-blur-sm overflow-hidden hover-lift animate-scale-in stagger-2">
          {/* Terminal header */}
          <div className="flex items-center gap-3 border-b border-border/50 bg-secondary/40 px-4 sm:px-5 py-3.5 sm:py-4">
            <div className="flex items-center gap-2">
              <Terminal className="h-4 w-4 text-primary" />
            </div>
            <span className="font-mono text-xs text-muted-foreground truncate">~/asset402/agent_logs</span>
            <div className="ml-auto flex items-center gap-2 text-muted-foreground">
              <Activity className="h-3 w-3 text-primary animate-pulse" />
              <span className="font-mono text-xs">live stream</span>
            </div>
          </div>

          <div className="divide-y divide-border/30 max-h-[400px] overflow-y-auto">
            {logs.length > 0 ? (
              logs.map((log, index) => (
                <div
                  key={index}
                  className="flex flex-col gap-4 p-5 sm:p-6 transition-all duration-300 sm:flex-row sm:items-center sm:justify-between hover:bg-secondary/30"
                >
                  <div className="flex-1 space-y-2 min-w-0">
                    <div className="flex items-center gap-3">
                      <span className="text-primary font-mono text-sm shrink-0">
                        ❯
                      </span>
                      <h4 className="font-mono text-sm font-medium tracking-tight text-foreground truncate">
                        {log.action}
                      </h4>
                      <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground border border-border px-2 py-0.5 rounded">
                        {log.status}
                      </span>
                    </div>
                    <p className="pl-6 font-mono text-xs text-muted-foreground line-clamp-1">
                      {JSON.stringify(log.payload)}
                    </p>
                  </div>

                  <div className="flex items-center justify-end font-mono text-xs text-muted-foreground shrink-0 pl-6 sm:pl-0">
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-muted-foreground font-mono text-xs flex flex-col items-center gap-3">
                <ShieldAlert className="h-6 w-6 text-muted-foreground animate-bounce" />
                <span>No active agent telemetry logs found. Start simulate-ecosystem script to generate activity.</span>
              </div>
            )}
          </div>

          <div className="border-t border-border/50 bg-secondary/30 px-4 sm:px-5 py-4">
            <div className="flex items-center gap-2 font-mono text-xs text-muted-foreground">
              <span className="text-primary">❯</span>
              <span className="typing-cursor truncate">tail -f agent_logs.log</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
