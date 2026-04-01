# Kanban Redesign Brief

## What We Want

Redesign the CTE kanban web UI into a polished, interactive app. The mockup at `../cte-kanban-redesign/kanban-mockup.html` is the VISUAL REFERENCE for the brand aesthetic — use it as inspiration, NOT as code to copy-paste. Build something more complex, interactive, and alive.

## Design Reference

- **Mockup**: `../cte-kanban-redesign/kanban-mockup.html` (1316 lines, static HTML). Use this for: color palette, typography (Inter + JetBrains Mono), circuit traces, grain overlay, ambient orbs, column layout, card styling. Do NOT copy its HTML/CSS literally.
- **Logo**: Replace the wireframe owl SVG with `public/claudio-owl-pixel-art.png` (the Claudio pixel art logo). Use it in the header/nav area.
- **Brand colors**: Amber #F59E0B (primary energy), Blue #3B82F6 (data/analysis), dark backgrounds (#0A0A0A, #18181B).

## Requirements

1. **Real interactivity**: Drag & drop cards between columns (use native HTML5 drag and drop or a lightweight lib). Cards should actually move.
2. **Smooth animations**: CSS transitions on card movement, column hover states, card expansion. Minimalist and purposeful — nothing flashy, everything intentional.
3. **Micro-interactions**: Subtle hover effects, status pill animations, priority indicators that breathe. The In Progress column should feel alive.
4. **Task data**: Connect to the existing CTE API (the Express server in this project at `src/server.ts`). Load real tasks, allow status changes via drag and drop.
5. **Responsive columns**: Backlog, Ready, In Progress, Review, Done — matching the CTE statuses.
6. **Card detail**: Click a card to expand it with full description, metadata, timestamps.
7. **The existing `public/kanban.html`** is the current production UI (51KB). You can study it for the API integration patterns, but the visual design should come from the mockup reference, not from the old UI.

## Technical Constraints

- Must work as a single-page app served by the existing CTE Express server (`src/server.ts` serves `public/`)
- Keep it as `public/kanban.html` (replace the existing one)
- Self-contained: all CSS inlined or in `<style>`, minimal external dependencies
- Google Fonts OK (Inter, JetBrains Mono)
- Must work in Chromium (headless and headed)
- The CTE API endpoints are in `src/server.ts` — read them to understand the data model

## Quality Bar

Pablo explicitly said: "no literalmente copie y pegue el html, sino que lo haga mas complejo. Interactivo, con animaciones simples y minimalistas." The mockup is a static picture. The result should be a living, breathing app.
