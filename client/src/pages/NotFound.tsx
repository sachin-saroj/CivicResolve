import { CivicMark, EditorialHeading, PillButton, TactileCard } from "@/components/CivicPrimitives";
import { ArrowLeft, FilePlus2, FileQuestion, Search } from "lucide-react";
import { useLocation } from "wouter";

export default function NotFound() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-[#FAFEFF] dark:bg-[#090A0D] text-[#0a0a0a] dark:text-[#f4f4f5] px-4 py-12">
      <div className="mb-8">
        <CivicMark size="lg" />
      </div>

      <TactileCard className="w-full max-w-xl p-8 sm:p-10 text-center" border="strong">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
          <FileQuestion className="h-8 w-8" />
        </div>

        <EditorialHeading
          eyebrow="Record Not Found"
          title="404 — Docket Unindexed"
          subtitle="The municipal record, administrative page, or grievance route you are attempting to access does not exist or has been archived."
          align="center"
          swash
          size="md"
        />

        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
          <PillButton
            variant="primary"
            onClick={() => setLocation("/")}
            className="w-full sm:w-auto"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Return to Civic Portal
          </PillButton>
          <PillButton
            variant="outline"
            onClick={() => setLocation("/track")}
            className="w-full sm:w-auto"
          >
            <Search className="mr-2 h-4 w-4" />
            Track Public Docket
          </PillButton>
        </div>

        <div className="mt-4 text-center">
          <button
            type="button"
            onClick={() => setLocation("/cases/new")}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#2563eb] dark:text-[#60a5fa] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563eb] rounded-full px-3 py-1"
          >
            <FilePlus2 className="h-3.5 w-3.5" />
            <span>Need to file a new grievance? Submit a Citizen Affidavit →</span>
          </button>
        </div>

        <p className="mt-8 text-xs font-mono uppercase tracking-widest text-[#71717a] dark:text-[#a1a1aa]">
          Official Municipal Dossier Registry • Reference Err: 404_PAGE_NOT_FOUND
        </p>
      </TactileCard>
    </div>
  );
}
