import { CivicMark, EditorialHeading, PillButton, TactileCard } from "@/components/CivicPrimitives";
import { ArrowLeft, FileQuestion, Search } from "lucide-react";
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
            Track Existing Docket
          </PillButton>
        </div>

        <p className="mt-8 text-xs font-mono uppercase tracking-widest text-[#71717a] dark:text-[#a1a1aa]">
          Official Municipal Dossier Registry • Reference Err: 404_PAGE_NOT_FOUND
        </p>
      </TactileCard>
    </div>
  );
}
