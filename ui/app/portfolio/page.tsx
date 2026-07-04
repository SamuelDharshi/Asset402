import { HeroSection } from "@/components/hero-section"
import { ProjectsGrid } from "@/components/projects-grid"
import { LabNotes } from "@/components/lab-notes"
import { Workbench } from "@/components/workbench"
import { Footer } from "@/components/footer"
import { CursorGlow } from "@/components/cursor-glow"
import { Header } from "@/components/header"
import { generateWebsiteStructuredData, generatePersonStructuredData } from "@/lib/structured-data"

// Original template homepage, relocated here so the app root (`/`) can
// render the real Asset402 product dashboard instead. Sub-routes like
// /blog, /introduction, /notes, /projects, /workbench are untouched and
// still resolve at their original paths.
export default function PortfolioPage() {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://eindev.ir'
  const websiteStructuredData = generateWebsiteStructuredData(baseUrl)
  const personStructuredData = generatePersonStructuredData()

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteStructuredData) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(personStructuredData) }}
      />
      <main className="relative min-h-screen overflow-hidden scanlines">
        <CursorGlow />
        <div className="relative z-10">
          <Header />
          <HeroSection />
          <ProjectsGrid />
          <LabNotes />
          <Workbench />
          <Footer />
        </div>
      </main>
    </>
  )
}
