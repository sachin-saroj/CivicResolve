# CivicResolve — UI Redesign Baseline & Architectural Discovery (Phase 0)
**Document Version:** 1.0.0  
**Phase:** 0 (Discovery + Baseline Mapping)  
**Status:** COMPLETED & VERIFIED  
**Repository:** [sachin-saroj/CivicResolve](https://github.com/sachin-saroj/CivicResolve)  

---

## 1. Executive Summary & Intent

This document establishes the authoritative technical and design baseline for the **CivicResolve Editorial UI Transformation**. The objective is to transition CivicResolve from a conventional SaaS dashboard layout into a bespoke, editorial, human, and physical civic-service platform inspired by high-end archival, publication, and documentary aesthetics.

The transformation strictly respects:
1. **Zero Backend Regressions:** Preservation of all tRPC procedures, SQLite schema definitions, SLA auto-escalation triggers, and session authentication mechanisms.
2. **Deterministic Test Contracts:** 100% test passing rate across all 13 test suites (48 tests) including Vitest frontend mocks in `GrievanceDetail.test.tsx` and `Phase2Analytics.test.tsx`.
3. **Phased Stop-Gate Execution:** Strict phase-by-phase iteration with verification before progression.

---

## 2. Git & Repository Baseline

- **Current Branch:** `main`
- **Current HEAD Commit:** `4764683` (`feat(ui): complete editorial redesign, eliminate legacy UI, and add authentic interface screenshots`)
- **Working Tree State:** Clean (0 untracked files, 0 uncommitted changes).
- **Remote Origin:** `https://github.com/sachin-saroj/CivicResolve.git`
- **Runtime Environment:** Windows PowerShell, Node.js v20+, Vite v7.1.9, TypeScript 5.9 (Strict), Tailwind CSS v4.1, SQLite (`local.db`).

---

## 3. Frontend Architecture Map

### 3.1 Routing & View Hierarchy (`client/src/App.tsx`)

CivicResolve uses `wouter` for lightweight, client-side routing. All routes fall into two structural paradigms:
1. **Standalone Full-Canvas Pages:** Standalone layouts with bespoke editorial navigation and footers (`/`, `/track`, `/staff/login`, `*`).
2. **Workspace Enclosed Pages:** Rendered within `<DashboardLayout>` providing role-aware sidebar navigation, top bar context, and light/dark theme toggles.

```
App
├── ThemeProvider (contexts/ThemeContext)
├── TooltipProvider
├── Toaster (sonner)
└── Switch (wouter)
    ├── Route /                     -> Home (Standalone Editorial Page)
    ├── Route /track                -> PublicTracker (Standalone with EditorialNavbar)
    ├── Route /track/:trackingNumber -> PublicTracker (Standalone with EditorialNavbar)
    ├── Route /staff/login          -> InternalLogin (Standalone Editorial Gate)
    ├── Route /cases/new            -> Workspace(GrievanceForm)
    ├── Route /cases/:trackingNumber -> Workspace(PublicCaseDetail)
    ├── Route /manage               -> Workspace(OfficerGrievances)
    ├── Route /board                -> Workspace(OfficerGrievances)
    ├── Route /admin                -> Workspace(AdminDashboard)
    ├── Route /admin/departments    -> Workspace(AdminDepartments)
    ├── Route /admin/categories     -> Workspace(AdminCategories)
    ├── Route /admin/officers       -> Workspace(AdminOfficers)
    ├── Route /admin/cases          -> Workspace(AdminGrievances)
    ├── Route /admin/users          -> Workspace(AdminUsers)
    ├── Route /officer/cases/:trackingNumber -> Workspace(GrievanceDetail)
    ├── Route /grievances/:id       -> Workspace(GrievanceDetail)
    └── Route * (Fallback)          -> NotFound (Editorial 404 Handler)
```

### 3.2 State Management & Transport Layer
- **tRPC Client (`@trpc/react-query` + `@tanstack/react-query`):** Connects directly to backend routers (`auth`, `public`, `portal`, `officer`, `admin`). All client data fetching uses strongly typed React hooks (`trpc.portal.create.useMutation`, `trpc.public.lookup.useQuery`, etc.).
- **Authentication Context (`@/_core/hooks/useAuth`):** Queries `trpc.auth.me.useQuery()` with cookie-based session management (`session` for OAuth/users, `internal_session` for staff/officers/admins).
- **Theme Context (`client/src/contexts/ThemeContext.tsx`):** Manages `light` / `dark` class toggle on the HTML `document.documentElement`, persisted in `localStorage`.

---

## 4. Visual System & Gap Analysis

### 4.1 Visual System Comparison

| Attribute | Legacy / SaaS Pattern | Target Editorial System (Reference) | Current Baseline Implementation |
|:---|:---|:---|:---|
| **Canvas** | Cold slate/zinc (`#f8fafc` / `#0f172a`) | Warm, tactile pale canvas (`#FAFEFF` / `#090A0D`) | Implemented via CSS custom properties in `index.css` |
| **Typography** | Generic system sans (`Inter`, `ui-sans`) | High-contrast editorial serif (*Cormorant Garamond* / *DM Serif Display*) + cursive accents (*Alex Brush*) + functional sans (*Plus Jakarta Sans*) | Integrated via Google Fonts in `index.html` & declared in Tailwind `@theme` |
| **Containers** | Rounded flat cards with blur | Physical paper cards, folder tab ears, crisp borders (`#E4E4E7` / `#20242F`), subtle tactile lift | Implemented in `CivicPrimitives.tsx` (`FolderTabCard`, `TactileCard`) |
| **Buttons** | Full-bleed rounded rectangles (`rounded-md`, blue) | Expressive pill buttons (`rounded-full`, `#0A0A0A` ink, `#2563EB` blue, `#881337` maroon, quiet outlines) | Implemented in `CivicPrimitives.tsx` (`PillButton`) |
| **Navigation** | Sticky glassmorphic SaaS topbar | Editorial masthead (`EditorialNavbar`), minimal topbar in workspaces with breadcrumb paths | Active on standalone and workspace routes |
| **Footer** | Standard 4-column link grid | Dramatic near-black editorial footer with giant wordmark, manifesto statement, and service standards | Implemented in `EditorialFooter.tsx` |

### 4.2 Gap & Refinement Identification

1. **Role-Specific Density Calibration:**
   - Public/Citizen pages (`/`, `/cases/new`, `/track`) require generous whitespace, editorial typography, and guided clarity.
   - Internal workspaces (`/manage`, `/admin/*`, `/officer/cases/*`) require high operational density, compact tables, quick filters, and keyboard accessibility without losing editorial typography.
2. **Tactile Dossier Enhancements:**
   - Further deepen the signature "Civic Docket" interaction in Phase 5 with physical stamp overlays, archival tags, and interactive timeline steps.
3. **Accessibility Auditing (Phase 18):**
   - Ensure contrast ratios of faint text (`#71717A` light / `#A1A1AA` dark) exceed WCAG 2.1 AA requirements across all text sizes.

---

## 5. Protected Assets & Non-Negotiable Contracts

The following files and contracts **MUST NEVER BE BROKEN OR ARBITRARILY MODIFIED**:

1. **Test Mock Contracts (`client/src/pages/GrievanceDetail.test.tsx`):**
   - Mocks only the following icons from `lucide-react`: `ArrowLeft`, `CheckCircle2`, `Clock3`, `FileText`, `MapPin`, `MessageSquareText`, `Send`, `UserRound`. Any other icon imported in `GrievanceDetail.tsx` will cause tests to crash with undefined components.
   - Requires exact DOM element: `<Label htmlFor="remarks">Progress note</Label>` within the form submitting `trpc.officer.addProgress`.
2. **Database & Schema Layer (`drizzle/schema.ts`, `server/db.ts`):**
   - SQLite tables: `users`, `departments`, `grievanceCategories`, `officerProfiles`, `grievances`, `attachments`, `notifications`, `auditLogs`, `feedback`.
   - Enums: `grievanceStatusValues` (`submitted`, `acknowledged`, `assigned`, `in_progress`, `escalated`, `resolved`, `reopened`, `closed`), `priorityValues` (`low`, `medium`, `high`, `critical`).
3. **SLA Calculation Engine (`server/sla.ts`, `server/workflow.ts`):**
   - Department-configured turnaround hours, UTC coordinated deadline timestamps, idempotent automatic escalation on breach.

---

## 6. Phased Implementation Roadmap (Phases 1 – 22)

```
[Phase 0: Baseline Discovery] ─────────► [Phase 1: Design Tokens & Primitives]
                                                    │
[Phase 3: Editorial Hero] ◄──────── [Phase 2: Global Shell & Navigation]
           │
           ▼
[Phase 4: Department / Folder Tabs] ──► [Phase 5: Signature Civic Docket]
                                                    │
[Phase 7: Redress Charter] ◄────────── [Phase 6: Accountability Storytelling]
           │
           ▼
[Phase 8: Community Outcomes] ────────► [Phase 9: Final Editorial CTA]
                                                    │
[Phase 11: Citizen Product Experience] ◄ [Phase 10: Near-Black Editorial Footer]
           │
           ▼
[Phase 12: Tracking Experience] ──────► [Phase 13: 3-Step Submission Flow]
                                                    │
[Phase 15: Admin Console] ◄─────────── [Phase 14: Dense Officer Workspace]
           │
           ▼
[Phase 16: Responsive Transformation] ─► [Phase 17: Dark Mode Art Direction]
                                                    │
[Phase 19: Performance Audit] ◄──────── [Phase 18: Accessibility / WCAG 2.1]
           │
           ▼
[Phase 20: Visual QA & Comparison] ───► [Phase 21: Full Regression Testing]
                                                    │
                                                    ▼
                                        [Phase 22: CodeRabbit Review & Final Gate]
```

### Stop-Gate Checklist per Phase:
- [ ] TypeScript check passes (`pnpm check` -> exit code 0)
- [ ] Test suite passes (`pnpm test` -> 13 files / 48 tests)
- [ ] Build passes (`pnpm build` -> exit code 0)
- [ ] Real browser verification executed
- [ ] Git checkpoint created before proceeding

---

## 7. Gate 0 Completion Sign-off

- [x] Full architecture mapped.
- [x] All routes, pages, and components inventoried.
- [x] Test contracts and protected files identified.
- [x] Visual system and gap analysis recorded.
- [x] Phase 0 baseline documented in `docs/UI-REDESIGN-BASELINE.md`.
- [x] No code regressions introduced.

**GATE 0 STATUS: PASSED.** Ready for Phase 1.
