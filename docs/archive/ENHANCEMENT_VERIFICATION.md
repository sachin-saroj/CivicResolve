## Live-preview review

- The current development preview now exposes the new CSV and PDF export buttons, a search combobox, active queue filters, and a visible light/dark toggle.
- The prior published route remains on the older checkpoint until the enhancement is checkpointed; the current preview is the source of truth for this change.
- The current preview has an intentional empty-state case table while catalog filters remain populated, so export buttons correctly remain disabled when there are no report rows.
## Dark mode and autosuggest review

- The current preview shows an accessible theme toggle in the shared workspace shell; toggling it changes the canvas, surface, field, border, and typography palette to a readable low-light treatment.
- The case search is exposed as an ARIA combobox with a clear button and a debounced suggestion query. Typing a two-character-or-longer query opens the suggestion region; the current live preview has no matching rows for the sample query, so it correctly shows a no-results state.
- The published domain still points to the prior checkpoint until the current enhancement is saved.
## Public tracking theme verification

The current preview’s `/track` route now carries the theme toggle in its header. The live browser session opened the route in dark mode, showing readable light text, dark surfaces, and a sun control labeled “Switch to light mode.” Toggling it returned the route to light mode with the moon control labeled “Switch to dark mode.” This confirms the tracking route is no longer an exception to the application’s theme affordance.
## Landing-page theme verification

The current development preview’s landing page exposes the theme toggle in the top-right header. The browser changed it from “Switch to dark mode” to “Switch to light mode”; the background, muted surfaces, decorative accents, and body text all switched to the low-light palette while the primary navigation remained visible. The preview overlay warns that the page is not publicly shareable until checkpointing, which is expected during development.
## Submission and case-manager dark-mode verification

The current preview carries the dark theme into `/cases/new` and `/manage`. The guided submission steps, catalog controls, form labels, and helper copy remain readable against dark surfaces. The case manager keeps the theme control, CSV/PDF actions, search combobox, filters, and sorting controls available with readable contrast. The live queue currently has no rows, so report buttons are visible but appropriately disabled until a filtered case set exists.
## Final verification scope

The public landing, tracking, submission, and case-manager routes were reviewed in light mode at desktop and mobile widths. The landing, tracking, submission, and case-manager routes were also opened in dark mode at desktop width, and the shared control successfully switched between readable themes. The case manager currently has no persisted case rows, so CSV/PDF downloads and selecting a live autosuggestion could not be exercised without creating persistent test data. Those paths are covered by deterministic export, bounded-result, and keyboard-navigation tests; the browser limitation is intentionally recorded rather than masked.
