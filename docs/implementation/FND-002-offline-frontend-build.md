# FND-002 — Offline-Safe Frontend Font Build

**Status:** Implemented and verified  
**Date:** 2026-11-04  
**Repository:** `CareerTracker-Frontend`  
**Base branch / commit:** `main` / `3a11e7cfd44ef3a28eb9df011fe16bf44a327274`

## 1. Objective and root cause

Make the production frontend build work without external font downloads. The root layout imported Fraunces, Inter, and JetBrains Mono through `next/font/google`; Next fetches those font resources during `next build`. This environment blocks the Google Fonts requests, so the build failed before application output was produced. No licensed local font files are present in the repository.

The existing design tokens already specified system font fallbacks after each downloaded font. The fix uses those fallbacks directly: a system serif display stack, system UI sans stack, and system monospace stack. It removes the build-time network dependency without adding, downloading, or redistributing font files.

## 2. Before/after behavior

- **Before:** `npm run build` attempted to fetch three Google Fonts and failed when the network was unavailable.
- **After:** the browser selects locally available platform fonts at runtime; `npm run build` completes without requesting Google Fonts.
- The serif/sans/monospace roles remain, but exact glyph metrics and appearance can vary by operating system because named web fonts are no longer bundled.

## 3. Technical decision and impact

- **Decision:** use the fallback font families already identified by the design system as the active stacks.
- **Alternatives:** retain `next/font/google` and require build network access, or add local font files. The former keeps builds network-dependent; the latter requires licensed files and was not justified for this build repair.
- **Dependencies:** no dependency or font asset added.
- **Database/API impact:** none.
- **Privacy/security:** no third-party font requests are made at build time or browser runtime through these tokens.

## 4. Files changed

| File | Change |
|---|---|
| `src/app/layout.tsx` | Remove Google font imports/config and the generated font-variable classes. |
| `src/app/globals.css` | Set display, sans, and mono design tokens directly to local/system fallback stacks. |
| `docs/implementation/FND-002-offline-frontend-build.md` | Record the font-build cause and verification. |

## 5. Verification

| Command / check | Result |
|---|---|
| `npm run build` in the normal sandbox | Exit 1 after successful compilation, at Next's TypeScript worker spawn (`EPERM`). The font-fetch error was gone. |
| Approved `npm run build` | Exit 0; compilation, TypeScript, static page generation, and finalization passed. |
| `npm run typecheck` | Exit 0. |
| `npm run lint` | Exit 0. |
| Chrome 156 production UI run with synthetic API fixtures | Captured authenticated-assistant, safe-response, and generic-error screenshots. These verify frontend UI/rendering only, not live backend authentication. See [SEC-001 screenshots](../screenshots/sec-001/). |

The approved build invocation was needed because the sandbox blocked Next's worker process. No package installation or external font download occurred.

## 6. Screenshots

No screenshot is required to establish the build fix itself. Related, genuine Chrome captures are linked from the existing SEC-001 implementation record.

## 7. Limitations and rollback

- Display now uses a platform serif such as Georgia when the preferred system serif is unavailable; exact Fraunces/Inter/JetBrains Mono typography is not bundled. Check visual consistency on supported operating systems.
- Restore the former `next/font/google` imports and CSS variables to roll back; this restores the external build-network requirement.

## 8. Git and review

- **Branch / base:** `main` / `3a11e7cfd44ef3a28eb9df011fe16bf44a327274`.
- **Implementation commit / PR:** None; changes remain local and uncommitted.
- [x] No font package or asset was added.
- [x] Production build passes in the approved local execution context.
- [x] Typecheck, lint, and SEC-001 regression tests pass.
- [ ] Review exact typography on supported production operating systems.
