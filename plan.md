# FLOWTRACE — Orbital Observatory redesign

The user requests the visual style of two supplied references only, with space meteorites added. Preserve the current FastAPI integration, real experiment filters, charts, selections, comparisons, insights, evidence, source-pressure annotations and scientific limitations. Do not reuse their NASA logos, satellite statistics or climate content. Do not reopen attached reference images with a file tool.

## Design direction

Combine the first reference's cinematic Earth-at-night horizon and large editorial heading with the second reference's glowing cyan orbital controls and translucent instrument panels. Replace the fixed sidebar with a compact top navigation. A wide hero presents a blue planetary atmosphere and floating rocky meteorites, with generous left-aligned white typography. Meteorites and planet imagery are explicitly decorative; no meteorite data or simulated experimental measurements are introduced.

Use near-black backgrounds, icy blue accents, soft glass panels, thin blue borders, rounded pill navigation, restrained glow and expansive typography. Keep all scientific charts deterministic and legible. Active navigation has a blue ring rather than a block highlight. Existing outcome colors retain their scientific meaning. Motion is limited to subtle decorative ambient drift and brief interactive transitions, disabled by reduced-motion settings.

## Implementation and structure

`Home.tsx` retains API queries and application state but adopts the new top navigation and footer. `SpaceHero.tsx` is a reusable, decorative hero with real-data CTA actions. `Explorer.tsx` keeps its filtering and metrics, displays the new hero and section title. `orbital.css` owns the navigation, backdrop, hero and responsive structure. `orbital-panels.css` themes scientific panels and dialogs without changing their behavior. Existing `index.css` remains the shared functional CSS; the new theme sheets are loaded after it. Original artwork is generated for the planned hero only. Package local artwork when available so the downloadable version does not depend on Manus-specific asset routes. Existing routes and APIs remain unchanged. No new dependencies are required.

The updated source ZIP and a small visual-update ZIP support the user's existing Windows installation without requiring another dependency install. The backend remains unchanged.

## Approved chatbot extension

The user approved the research-chat plan on 14 November 2026. Add `/chat` with a dark orbital console, safe Markdown, suggestion-filled composer, anonymous browser-session history, optional up-to-four actual record context, explicit waiting/stop/copy/new-chat/retry behavior and privacy/scientific cautions. Keep the existing FastAPI backend and scientific proxy unchanged.

Use server-only `FLOWTRACE_CHAT_WEBHOOK_URL` with the same-origin Express `POST /api/chat` adapter, bounded request/response validation, finite timeout and basic process-local rate/concurrency limits. The supplied URL is configured through protected environment storage, not committed. Chat is independent of the scientific API's loading/error gate. `shared/chat.ts` connects frontend requests and server validation; `server/chatProxy.ts`, client chat modules and `chat.css` keep concerns separated. Register the route in App, Home and the static manifest. Provide cumulative client+server+shared ZIPs and n8n setup guidance.

The live n8n POST is currently not registered; the app displays a safe UNREGISTERED error rather than a fabricated answer. Context-grounding instructions and memory must be configured and verified in the user's workflow. The existing installed Markdown renderer is reused and loaded only with the lazy chatbot page, avoiding a new dependency installation.

## Approved Flame in Freefall simulation extension

The user approved a full simulation plan and immediate execution on 14 November 2026. `SIMULATION_PLAN.md` is the complete sourced implementation/design plan. Add `/simulation` as an educational 2D reduced-order reactive-transport lab, not NASA-validated CFD or a material fire-safety predictor. Preserve all existing scientific and chat workflows, private configuration and backend data. Use deterministic normalized fields, an explicit heuristic buoyancy velocity, documented developer-selected constants, manual oxygen/airflow/buoyancy controls, preset examples, synchronized 1g comparison, model-time history, optional honest real-condition import and labelled JSON/CSV exports. Model outputs never enter observational API records or chatbot record context.

Extend the orbital design with a computed chamber and responsive instrument controls; reuse existing libraries rather than installing dependencies or generating decorative illustrations. `client/src/lib/simulation.ts` owns the model, separate canvas/trace components render it, `Simulation.tsx` owns interactions/provenance and `simulation.css` owns the theme. Home exposes the lazy route independently of API availability; App/manifest register it. Deliver the complete plan and cumulative/full ZIPs and save the accepted implementation.
