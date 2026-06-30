"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import { ArrowRight, Zap } from "lucide-react"

const notes = [
  {
    id: 1,
    title: "CUC Issuance Protocol",
    excerpt: "Calculates milliCUC rewards proportional to equipment operational hours. Approximately 3.2 CUC is issued per 10 hours of activity, split between owner and renter.",
    date: "v2.0",
    category: "rewards",
    color: "from-primary/20 to-yellow-600/20",
  },
  {
    id: 2,
    title: "50/50 Renter-Owner Splits",
    excerpt: "Decentralized revenue sharing model coded directly into the CarbonCredit contract. Rewards are split equally in real-time, matching off-chain telemetry reports.",
    date: "v2.0",
    category: "distributor",
    color: "from-yellow-500/20 to-amber-500/20",
  },
  {
    id: 3,
    title: "CUC Burning & Rent Discounts",
    excerpt: "CUC tokens can be burned by renters to redeem rental fee discounts, or by owners to offset commission rates on listed industrial assets.",
    date: "v2.0",
    category: "utility",
    color: "from-blue-500/20 to-cyan-500/20",
  },
  {
    id: 4,
    title: "Premium VIP Yield Pool",
    excerpt: "Monitored assets with a condition score exceeding 85/100 qualify for the VIP Yield Pool, receiving an automated 10% boost to CUC rewards.",
    date: "v2.0",
    category: "reputation",
    color: "from-purple-500/20 to-pink-500/20",
  },
]

export function LabNotes() {
  const [expandedNote, setExpandedNote] = useState<number | null>(null)

  return (
    <section id="lab-notes" className="px-4 sm:px-6 py-20 sm:py-28 border-t border-border/30">
      <div className="mx-auto max-w-7xl">
        <div className="mb-10 sm:mb-14 space-y-3 animate-fade-in-up">
          <p className="font-mono text-xs uppercase tracking-[0.25em] sm:tracking-[0.35em] text-primary">Yield Offsets</p>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl flex items-center gap-3">
            <Zap className="h-7 w-7 text-primary animate-pulse" /> Usage Credits (CUC)
          </h2>
          <p className="max-w-2xl text-base sm:text-lg text-muted-foreground leading-relaxed">
            Real-world usage metrics automatically mint Carbon Use Credits on the Casper network.
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          {notes.map((note, index) => (
            <article
              key={note.id}
              className={cn(
                "group relative cursor-pointer overflow-hidden rounded-xl border border-border bg-card/40 glass p-6 sm:p-7 transition-all duration-400 hover:border-primary/40 hover:bg-card/60 active:scale-[0.99] hover-lift animate-fade-in-up",
                expandedNote === note.id && "border-primary/50 bg-card/70",
              )}
              style={{ animationDelay: `${index * 100 + 200}ms` }}
              onClick={() => setExpandedNote(expandedNote === note.id ? null : note.id)}
            >
              <div
                className={cn(
                  "absolute inset-0 bg-gradient-to-br opacity-0 transition-opacity duration-500 group-hover:opacity-100",
                  note.color,
                )}
              />

              <div className="relative z-10">
                <div className="mb-4 sm:mb-5 flex items-center justify-between gap-3">
                  <span className="rounded-lg border border-border/80 bg-secondary/60 px-3 py-1.5 font-mono text-xs text-muted-foreground transition-colors group-hover:border-primary/50 group-hover:text-foreground">
                    {note.category}
                  </span>
                  <span className="font-mono text-xs text-muted-foreground">{note.date}</span>
                </div>

                <h3 className="mb-3 text-lg sm:text-xl font-semibold tracking-tight transition-colors duration-300 group-hover:text-primary">
                  {note.title}
                </h3>

                <p className="text-sm leading-relaxed text-muted-foreground">{note.excerpt}</p>

                <div className="mt-5 flex items-center gap-2 font-mono text-xs text-primary transition-all duration-300 sm:opacity-0 sm:translate-x-[-8px] group-hover:opacity-100 group-hover:translate-x-0">
                  <span>protocol info</span>
                  <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-1" />
                </div>
              </div>

              <div className="absolute bottom-0 left-0 h-1 w-0 bg-gradient-to-r from-primary to-transparent transition-all duration-500 group-hover:w-full" />
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
