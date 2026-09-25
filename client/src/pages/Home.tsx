import { CivicMark, EditorialHeading, FolderTabCard, PillButton, StatusBadge } from "@/components/CivicPrimitives";
import CivicDocket from "@/components/CivicDocket";
import EditorialFooter from "@/components/EditorialFooter";
import EditorialNavbar from "@/components/EditorialNavbar";
import { trpc } from "@/lib/trpc";
import {
  Activity,
  ArrowRight,
  ArrowUpRight,
  Building2,
  CheckCircle2,
  Clock3,
  Droplet,
  FileCheck2,
  FileSearch,
  FileText,
  HelpCircle,
  Lightbulb,
  MapPin,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  UsersRound,
} from "lucide-react";
import { FormEvent, useState } from "react";
import { Link, useLocation } from "wouter";

export default function Home() {
  const [, setLocation] = useLocation();
  const [quickTrack, setQuickTrack] = useState("");
  const catalog = trpc.public.catalog.useQuery();

  const handleSearch = (e: FormEvent) => {
    e.preventDefault();
    if (quickTrack.trim()) {
      setLocation(`/track/${quickTrack.trim().toUpperCase()}`);
    }
  };

  const departmentsList = [
    {
      tab: "Dept. 01",
      title: "Public Works",
      subtitle: "Roads, street lighting, drainage, public pavements & infrastructure maintenance.",
      icon: <Building2 className="h-3.5 w-3.5 text-[#2563eb]" />,
      sla: "72h SLA",
      accent: "blue" as const,
      categories: ["Street Lighting", "Potholes & Roads", "Drainage Outlets", "Public Parks"],
    },
    {
      tab: "Dept. 02",
      title: "Water & Sanitation",
      subtitle: "Municipal water supply, sewage clearing, garbage collection & sanitation services.",
      icon: <Droplet className="h-3.5 w-3.5 text-[#0d9488]" />,
      sla: "48h SLA",
      accent: "teal" as const,
      categories: ["Pipeline Leaks", "Sewage Overflow", "Waste Collection", "Water Quality"],
    },
    {
      tab: "Dept. 03",
      title: "Community Services",
      subtitle: "Neighbourhood facilities, public safety concerns, campus welfare & noise hazards.",
      icon: <UsersRound className="h-3.5 w-3.5 text-[#ea580c]" />,
      sla: "72h SLA",
      accent: "orange" as const,
      categories: ["Public Safety", "Park Maintenance", "Noise Hazards", "Community Halls"],
    },
    {
      tab: "Protocol 04",
      title: "SLA Auto-Escalation",
      subtitle: "Automated engine elevating cases to Critical priority when service limits elapse.",
      icon: <ShieldCheck className="h-3.5 w-3.5 text-[#881337]" />,
      sla: "Auto-Trigger",
      accent: "maroon" as const,
      categories: ["Overdue Watch", "Senior Officer Alert", "Mandatory Review", "Direct Triage"],
    },
  ];

  const citizenReviews = [
    {
      id: "GRV-2026-00041",
      name: "Meera Krishnan",
      area: "Indiranagar, Sector 4",
      dept: "Public Works",
      stars: 5,
      quote: "The street light in our lane was fixed within 48 hours. I could track the inspection report and final closure without even logging in.",
    },
    {
      id: "GRV-2026-00063",
      name: "Rohit Deshmukh",
      area: "Koramangala 5th Block",
      dept: "Water & Sanitation",
      stars: 5,
      quote: "Sewage overflow was attended to on the very next morning. The officer uploaded photographic proof right into the case timeline.",
    },
    {
      id: "GRV-2026-00088",
      name: "Ananya Bannerjee",
      area: "Whitefield Main Rd",
      dept: "Public Works",
      stars: 5,
      quote: "Transparent and completely reliable. Seeing the assigned officer's name and exact due date eliminates all uncertainty.",
    },
    {
      id: "GRV-2026-00094",
      name: "Tariq Mansoor",
      area: "Jayanagar 4th T Block",
      dept: "Community Services",
      stars: 5,
      quote: "CivicResolve sets an exemplary standard for civic grievance redressal. The timeline updates left no room for bureaucratic delay.",
    },
  ];

  return (
    <div className="min-h-screen bg-[#fafcfe] dark:bg-[#090a0d] text-[#0a0a0a] dark:text-[#f4f4f5] transition-colors font-sans selection:bg-[#2563eb] selection:text-white">
      {/* Editorial Top Navigation */}
      <EditorialNavbar />

      <main className="relative">
        {/* ========================================================================= */}
        {/* 1. HERO SECTION                                                          */}
        {/* ========================================================================= */}
        <section className="relative pt-16 pb-20 sm:pt-24 sm:pb-28 overflow-hidden">
          {/* Subtle architectural ambient background glow */}
          <div className="absolute top-10 left-1/2 -translate-x-1/2 w-[1000px] h-[450px] bg-gradient-to-b from-[#eff6ff]/70 via-transparent to-transparent dark:from-[#131b2e]/40 pointer-events-none -z-10 rounded-full blur-3xl" />

          <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 text-center">
            {/* Eyebrow Script */}
            <p className="font-script text-3xl sm:text-4xl lg:text-5xl text-[#2563eb] dark:text-[#60a5fa] mb-3 leading-tight animate-fade-in">
              Civic Infrastructure & Redress
            </p>

            {/* Giant Display Serif Title with Swash Initial */}
            <h1 className="font-editorial text-5xl sm:text-7xl lg:text-8xl font-normal text-[#0a0a0a] dark:text-white tracking-[-0.035em] leading-[1.04] max-w-4xl mx-auto">
              <span className="font-script text-[1.25em] font-normal text-[#2563eb] dark:text-[#60a5fa] inline-block mr-1 leading-none">
                E
              </span>
              very concern deserves to be heard.
            </h1>

            {/* Supporting Editorial Copy */}
            <p className="mt-6 max-w-2xl mx-auto text-base sm:text-lg leading-relaxed text-[#52525b] dark:text-[#a1a1aa] font-sans">
              Submit, track, and resolve municipal and campus grievances with guaranteed response SLAs,
              live departmental updates, and zero login barriers.
            </p>

            {/* Pill CTAs */}
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3.5">
              <Link href="/cases/new">
                <PillButton variant="blue" size="lg">
                  <span>Submit a Grievance</span>
                  <ArrowRight className="ml-2 h-4 w-4" />
                </PillButton>
              </Link>
              <Link href="/track">
                <PillButton variant="secondary" size="lg">
                  <span>Track Existing Case</span>
                </PillButton>
              </Link>
            </div>

            {/* Instant Case Search Pill */}
            <form onSubmit={handleSearch} className="mt-10 mx-auto max-w-md">
              <div className="relative flex items-center rounded-full bg-white dark:bg-[#12151b] border border-[#e4e4e7] dark:border-[#20242f] p-1.5 shadow-[0_4px_20px_-2px_rgba(0,0,0,0.05)] transition focus-within:border-[#2563eb] dark:focus-within:border-[#3b82f6]">
                <FileSearch className="ml-3 h-4 w-4 text-[#71717a] dark:text-[#a1a1aa] shrink-0" />
                <input
                  type="text"
                  value={quickTrack}
                  onChange={(e) => setQuickTrack(e.target.value)}
                  placeholder="Enter tracking ID (e.g. GRV-2026-00001)"
                  className="w-full bg-transparent px-3 py-2 text-xs sm:text-sm text-[#0a0a0a] dark:text-white outline-none placeholder:text-[#a1a1aa]"
                />
                <button
                  type="submit"
                  className="shrink-0 rounded-full bg-[#0a0a0a] dark:bg-white text-white dark:text-black px-4 py-2 text-xs font-bold transition hover:bg-[#27272a] dark:hover:bg-neutral-200"
                >
                  Lookup
                </button>
              </div>
            </form>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* 2. DEPARTMENT FOLDER-TAB CARDS (Inspired by Reference Tech Stack Tabs)     */}
        {/* ========================================================================= */}
        <section id="departments" className="py-14 border-t border-[#e8eaed]/80 dark:border-[#1e232e]">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col md:flex-row md:items-end justify-between mb-10">
              <EditorialHeading
                eyebrow="Service Branches"
                title="Structured Department Redress"
                subtitle="Every grievance is automatically routed to dedicated departmental officers with strict turnaround commitments."
              />
              <div className="mt-4 md:mt-0">
                <Link href="/manage" className="text-xs font-bold text-[#2563eb] dark:text-[#60a5fa] hover:underline inline-flex items-center gap-1">
                  <span>View Full Public Board</span>
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {departmentsList.map((dept) => (
                <FolderTabCard
                  key={dept.title}
                  tabTitle={dept.tab}
                  title={dept.title}
                  subtitle={dept.subtitle}
                  icon={dept.icon}
                  badge={dept.sla}
                  accent={dept.accent}
                >
                  <div className="mt-5 pt-4 border-t border-[#f0f2f5] dark:border-[#1e232e]">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-[#71717a] dark:text-[#a1a1aa] mb-2">
                      Key Categories
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {dept.categories.map((c) => (
                        <span
                          key={c}
                          className="rounded-md bg-[#f4f4f6] dark:bg-[#181d26] px-2 py-1 text-[11px] font-medium text-[#3f3f46] dark:text-[#d4d4d8]"
                        >
                          {c}
                        </span>
                      ))}
                    </div>
                  </div>
                </FolderTabCard>
              ))}
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* 3. INTERACTIVE CASE SHOWCASE & PHYSICAL DOSSIER (Central Device Section)   */}
        {/* ========================================================================= */}
        <section className="py-20 bg-[#f4f6f9]/60 dark:bg-[#0c0e13] border-y border-[#e8eaed] dark:border-[#1e232e]">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto mb-14">
              <p className="font-script text-3xl sm:text-4xl text-[#2563eb] dark:text-[#60a5fa] mb-1">
                Transparency in Action
              </p>
              <h2 className="font-editorial text-4xl sm:text-5xl font-semibold text-[#0a0a0a] dark:text-white tracking-tight">
                Live Case Triage & Resolution
              </h2>
              <p className="mt-3 text-sm sm:text-base text-[#52525b] dark:text-[#a1a1aa]">
                Citizens receive a verifiable tracking docket with real-time timestamps, officer assignment,
                and milestone inspections.
              </p>
            </div>

            <div className="grid gap-10 lg:grid-cols-[1fr_1.3fr_1fr] items-center">
              {/* Left Column: Live Metrics */}
              <div className="space-y-4">
                <div className="rounded-2xl bg-white dark:bg-[#12151b] border border-[#e4e4e7] dark:border-[#20242f] p-5 shadow-xs">
                  <div className="flex items-center gap-2.5 text-xs font-bold text-[#2563eb] dark:text-[#60a5fa] uppercase tracking-wider">
                    <Clock3 className="h-4 w-4" />
                    <span>Enforced SLAs</span>
                  </div>
                  <p className="font-editorial text-3xl font-bold text-[#0a0a0a] dark:text-white mt-2">
                    72 Hours
                  </p>
                  <p className="text-xs text-[#71717a] dark:text-[#a1a1aa] mt-1 leading-relaxed">
                    Maximum default resolution threshold before automatic critical escalation triggers.
                  </p>
                </div>

                <div className="rounded-2xl bg-white dark:bg-[#12151b] border border-[#e4e4e7] dark:border-[#20242f] p-5 shadow-xs">
                  <div className="flex items-center gap-2.5 text-xs font-bold text-[#0d9488] dark:text-[#2dd4bf] uppercase tracking-wider">
                    <FileCheck2 className="h-4 w-4" />
                    <span>Zero Login Barrier</span>
                  </div>
                  <p className="font-editorial text-3xl font-bold text-[#0a0a0a] dark:text-white mt-2">
                    100% Open
                  </p>
                  <p className="text-xs text-[#71717a] dark:text-[#a1a1aa] mt-1 leading-relaxed">
                    Submit and monitor grievances freely using just your cryptographic tracking ID.
                  </p>
                </div>
              </div>

              {/* Center Column: Tactile Signature Civic Docket */}
              <div className="relative mx-auto max-w-md w-full">
                <CivicDocket
                  docket={{
                    trackingNumber: "GRV-2026-00482",
                    title: "Solar Street Lamp Repair on Main Junction",
                    departmentName: "Public Works",
                    categoryName: "Street Lighting",
                    status: "in_progress",
                    priority: "high",
                    location: "8th Cross, Sector 2, Indiranagar",
                    assignedOfficerName: "Marcus Vance (Public Works)",
                    slaDueHours: 72,
                    latestRemarks: "Central dispatch verified the faulty solar battery unit. Replacement unit scheduled for installation tomorrow morning.",
                    attachmentUrl: "/assets/community_works.webp",
                  }}
                  interactive
                />
              </div>

              {/* Right Column: Key Guarantees */}
              <div className="space-y-4">
                <div className="rounded-2xl bg-white dark:bg-[#12151b] border border-[#e4e4e7] dark:border-[#20242f] p-5 shadow-xs">
                  <div className="flex items-center gap-2.5 text-xs font-bold text-[#ea580c] dark:text-[#fb923c] uppercase tracking-wider">
                    <Sparkles className="h-4 w-4" />
                    <span>Evidence Uploads</span>
                  </div>
                  <p className="font-editorial text-3xl font-bold text-[#0a0a0a] dark:text-white mt-2">
                    Verified Proof
                  </p>
                  <p className="text-xs text-[#71717a] dark:text-[#a1a1aa] mt-1 leading-relaxed">
                    Attach photos, site notes, or blueprints up to 2MB to accelerate on-site inspection.
                  </p>
                </div>

                <div className="rounded-2xl bg-white dark:bg-[#12151b] border border-[#e4e4e7] dark:border-[#20242f] p-5 shadow-xs">
                  <div className="flex items-center gap-2.5 text-xs font-bold text-[#881337] dark:text-[#fb7185] uppercase tracking-wider">
                    <Star className="h-4 w-4" />
                    <span>Resident Feedback</span>
                  </div>
                  <p className="font-editorial text-3xl font-bold text-[#0a0a0a] dark:text-white mt-2">
                    4.8 / 5 Rating
                  </p>
                  <p className="text-xs text-[#71717a] dark:text-[#a1a1aa] mt-1 leading-relaxed">
                    Single-window citizen evaluation upon case resolution guarantees public accountability.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* 4. "THE CIVIC PROMISE" EDITORIAL ESSAY & PHOTO STACK (Reference Welcome) */}
        {/* ========================================================================= */}
        <section className="py-24 border-b border-[#e8eaed] dark:border-[#1e232e]">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid gap-12 lg:grid-cols-[1.1fr_1.1fr_1fr] items-start">
              {/* Left Column: Essay */}
              <div className="space-y-6">
                <div>
                  <p className="font-script text-4xl sm:text-5xl text-[#2563eb] dark:text-[#60a5fa] leading-none mb-2">
                    Accountability
                  </p>
                  <h2 className="font-editorial text-3xl sm:text-4xl font-semibold text-[#0a0a0a] dark:text-white tracking-tight leading-tight">
                    Government services designed with human care.
                  </h2>
                </div>

                <p className="text-sm leading-relaxed text-[#52525b] dark:text-[#a1a1aa] font-sans">
                  For decades, citizen grievances disappeared into bureaucratic voids—untracked,
                  unacknowledged, and unattended. CivicResolve introduces a modern civic contract:
                  every submission is cryptographically logged, publicly trackable, and bound to a strict
                  statutory resolution deadline.
                </p>

                <div className="rounded-xl border-l-4 border-[#2563eb] bg-[#eff6ff]/60 dark:bg-[#1e293b]/50 p-4">
                  <p className="text-xs font-semibold text-[#1e40af] dark:text-[#93c5fa] italic leading-relaxed">
                    "Public infrastructure should work with the speed and elegance of modern software,
                    anchored in absolute transparency."
                  </p>
                </div>

                <div className="space-y-2 text-xs font-semibold text-[#3f3f46] dark:text-[#d4d4d8]">
                  <p className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    <span>No mandatory login or citizen data harvesting</span>
                  </p>
                  <p className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    <span>Automated SLA clock ticking from second zero</span>
                  </p>
                  <p className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    <span>Public audit trail visible to the whole community</span>
                  </p>
                </div>
              </div>

              {/* Center Column: Tactile Photo / Document Stack */}
              <div className="relative pt-6 sm:pt-0">
                <div className="relative mx-auto max-w-sm">
                  {/* Background Card (Rotated slightly) */}
                  <div className="rounded-2xl overflow-hidden shadow-[0_16px_36px_rgba(0,0,0,0.08)] border border-[#e4e4e7] dark:border-[#272f3d] rotate-3 bg-white dark:bg-[#15181e] p-2 aspect-[4/3]">
                    <img
                      src="/assets/hero_dossier.webp"
                      alt="Official Civic Redress Record"
                      loading="lazy"
                      decoding="async"
                      className="h-full w-full object-cover rounded-xl"
                    />
                  </div>

                  {/* Foreground Card */}
                  <div className="relative -mt-24 -ml-4 rounded-2xl overflow-hidden shadow-[0_24px_48px_rgba(0,0,0,0.12)] border border-[#e4e4e7] dark:border-[#272f3d] -rotate-2 bg-white dark:bg-[#15181e] p-2 aspect-[4/3]">
                    <img
                      src="/assets/community_works.webp"
                      alt="Community service team at work"
                      loading="lazy"
                      decoding="async"
                      className="h-full w-full object-cover rounded-xl"
                    />
                  </div>
                </div>
              </div>

              {/* Right Column: Editorial Standards */}
              <div className="space-y-6 lg:pl-4">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#71717a] dark:text-[#a1a1aa]">
                    The Standard
                  </span>
                  <h3 className="font-editorial text-2xl font-bold text-[#0a0a0a] dark:text-white mt-1">
                    Three Pillars of Civic Trust
                  </h3>
                </div>

                <div className="space-y-4">
                  <div className="border-b border-[#f0f2f5] dark:border-[#1e232e] pb-3">
                    <p className="text-xs font-bold text-[#0a0a0a] dark:text-white">1. Direct Accountability</p>
                    <p className="text-xs text-[#71717a] dark:text-[#a1a1aa] mt-1 leading-relaxed">
                      Every case is mapped to a real named departmental officer, never an anonymous support queue.
                    </p>
                  </div>

                  <div className="border-b border-[#f0f2f5] dark:border-[#1e232e] pb-3">
                    <p className="text-xs font-bold text-[#0a0a0a] dark:text-white">2. Auto-Escalation Engine</p>
                    <p className="text-xs text-[#71717a] dark:text-[#a1a1aa] mt-1 leading-relaxed">
                      If 72 hours elapse without resolution, the case is autonomously escalated to Critical oversight.
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-bold text-[#0a0a0a] dark:text-white">3. Public Board Visibility</p>
                    <p className="text-xs text-[#71717a] dark:text-[#a1a1aa] mt-1 leading-relaxed">
                      All municipal activity remains open for public verification, ensuring complete honesty.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* 5. TACTILE RESOLUTION CHARTER BOOKLET (Direct Reference Maroon Booklet)   */}
        {/* ========================================================================= */}
        <section className="py-20 bg-[#fafcfe] dark:bg-[#090a0d]">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-xl mx-auto mb-10">
              <p className="font-script text-3xl sm:text-4xl text-[#881337] dark:text-[#fb7185] mb-1">
                Charter Standards
              </p>
              <h2 className="font-editorial text-3xl sm:text-4xl font-semibold text-[#0a0a0a] dark:text-white">
                Civic Redress Protocol (2026)
              </h2>
            </div>

            {/* Tactile Fine-Art Booklet Card */}
            <div className="rounded-3xl bg-[#fdfaf7] dark:bg-[#12141a] border border-[#e7e1d6] dark:border-[#202530] p-4 sm:p-8 shadow-[0_16px_40px_-4px_rgba(0,0,0,0.06)]">
              <div className="grid gap-8 lg:grid-cols-[1.4fr_1fr] items-center">
                {/* Booklet Image */}
                <div className="rounded-2xl overflow-hidden border border-[#e2dac9] dark:border-[#29303d] shadow-sm">
                  <img
                    src="/assets/redress_booklet.webp"
                    alt="Civic Redress Charter fine-art booklet"
                    loading="lazy"
                    decoding="async"
                    className="w-full h-auto object-cover"
                  />
                </div>

                {/* Narrative */}
                <div className="space-y-4">
                  <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wider bg-[#881337]/10 text-[#881337] dark:text-[#fb7185]">
                    Official Charter Document
                  </span>

                  <h3 className="font-editorial text-2xl sm:text-3xl font-bold text-[#0a0a0a] dark:text-white leading-tight">
                    Standardized Guidelines for Public Remediation
                  </h3>

                  <p className="text-xs sm:text-sm text-[#52525b] dark:text-[#a1a1aa] leading-relaxed">
                    This charter outlines the statutory principles and procedures for grievance resolution,
                    ensuring transparency, officer accountability, and citizen trust across metropolitan services.
                  </p>

                  <div className="pt-2">
                    <Link href="/cases/new">
                      <PillButton variant="maroon" size="md">
                        <span>Initiate Redress Request →</span>
                      </PillButton>
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* 6. VERIFIED RESIDENT REVIEWS (4 Testimonial Cards from Reference)          */}
        {/* ========================================================================= */}
        <section className="py-20 border-t border-[#e8eaed] dark:border-[#1e232e] bg-[#f8fafc]/50 dark:bg-[#0b0d12]">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto mb-14">
              <p className="font-script text-3xl sm:text-4xl text-[#2563eb] dark:text-[#60a5fa] mb-1">
                Citizen Voices
              </p>
              <h2 className="font-editorial text-3xl sm:text-4xl lg:text-5xl font-semibold text-[#0a0a0a] dark:text-white tracking-tight">
                Verified Community Outcomes
              </h2>
              <p className="mt-2 text-xs sm:text-sm text-[#71717a] dark:text-[#a1a1aa]">
                Authentic feedback recorded immediately following case resolution.
              </p>
            </div>

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {citizenReviews.map((review) => (
                <div
                  key={review.id}
                  className="rounded-2xl bg-white dark:bg-[#12151b] border border-[#e4e4e7] dark:border-[#20242f] p-6 flex flex-col justify-between shadow-[0_4px_16px_rgba(0,0,0,0.02)] transition-all hover:translate-y-[-2px] hover:shadow-[0_10px_24px_rgba(0,0,0,0.05)]"
                >
                  <div>
                    {/* Stars */}
                    <div className="flex items-center gap-1 text-amber-400 mb-3">
                      {[...Array(review.stars)].map((_, i) => (
                        <Star key={i} className="h-3.5 w-3.5 fill-amber-400" />
                      ))}
                    </div>

                    {/* Quote */}
                    <p className="text-xs sm:text-[13px] leading-relaxed text-[#3f3f46] dark:text-[#d4d4d8] italic">
                      "{review.quote}"
                    </p>
                  </div>

                  <div className="mt-6 pt-4 border-t border-[#f0f2f5] dark:border-[#1e232e]">
                    <p className="text-xs font-bold text-[#0a0a0a] dark:text-white">
                      {review.name}
                    </p>
                    <p className="text-[11px] text-[#71717a] dark:text-[#a1a1aa]">
                      {review.area}
                    </p>
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-[10px] font-mono font-bold text-[#2563eb] dark:text-[#60a5fa]">
                        {review.id}
                      </span>
                      <span className="text-[10px] uppercase font-bold text-[#10b981]">
                        Verified Resolution
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* 7. BOTTOM ACTION BANNER (Reference "Let's Connect" Section)               */}
        {/* ========================================================================= */}
        <section className="py-20 bg-white dark:bg-[#090a0d] border-t border-[#e8eaed] dark:border-[#1e232e]">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center">
            <p className="font-script text-4xl sm:text-5xl text-[#2563eb] dark:text-[#60a5fa] mb-2">
              Direct Redress
            </p>
            <h2 className="font-editorial text-4xl sm:text-5xl font-semibold text-[#0a0a0a] dark:text-white tracking-tight">
              Ready to resolve an issue in your neighbourhood?
            </h2>
            <p className="mt-3.5 max-w-xl mx-auto text-sm text-[#52525b] dark:text-[#a1a1aa]">
              Join thousands of citizens actively improving their local community infrastructure.
              No password needed.
            </p>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
              <Link href="/cases/new">
                <PillButton variant="blue" size="lg">
                  <span>File a Grievance Now</span>
                  <ArrowRight className="ml-2 h-4 w-4" />
                </PillButton>
              </Link>
              <Link href="/manage">
                <PillButton variant="outline" size="lg">
                  <span>Explore Open Board</span>
                </PillButton>
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* Editorial Giant Serif Footer */}
      <EditorialFooter />
    </div>
  );
}
