# PayDesk Back Office AI Context

## Purpose

This repository is the PayDesk Back Office client. It is a Next.js 16 app with a Tauri desktop wrapper for store management workflows such as products, product setup, permissions, reports, billing, and logs.

## Important Rules For AI Agents

- Read `AGENTS.md` before editing. This project uses Next.js 16 with breaking API and file-structure changes compared with older Next.js versions.
- Before changing routing, rendering, or build behavior, read the relevant files under `node_modules/next/dist/docs/`.
- The app uses `output: "export"` in `next.config.ts`, so routes must remain compatible with static export and Tauri. Prefer static routes plus query strings over arbitrary dynamic routes unless static params are known at build time.
- Keep the current layout system: `BackOfficeShell`, primary sidebar, optional contextual sidebar, selected-store context, auth context, permissions, and existing UI styling.
- Do not introduce a second API client. Use `src/lib/apiClient.ts` and typed helpers in `src/features/*/api.ts`.

## Tech Stack

- Next.js 16 App Router
- React 19
- TypeScript
- Tailwind CSS 4
- Zod for client-side form validation
- Lucide icons
- Tauri 2 desktop shell

## Common Commands

```bash
npm run lint
npm run build
npm run dev
npm run desktop:dev
npm run desktop:build
```

There is currently no `npm test` script in this repository.

## Source Map

- `src/app/` - Next.js App Router pages.
- `src/components/layout/` - Back Office shell, sidebars, store switcher, gates, and placeholders.
- `src/components/products/` - Product item workflows.
- `src/components/product-setup/` - Product setup workspaces such as departments and price groups.
- `src/context/` - Auth and selected-store context.
- `src/features/` - Typed API helpers, navigation metadata, and domain types.
- `src/lib/apiClient.ts` - Central authenticated API wrapper.
- `src-tauri/` - Desktop wrapper configuration and Rust entry points.

## Backend Dependency

The client talks to `paydesk-backend` through `NEXT_PUBLIC_API_URL`, defaulting to `https://api.paydeskapp.com`. Production builds reject localhost API URLs.

## Price Groups Workspace

The price-group management workspace lives at:

- List/create route: `/product-setup/price-groups`
- Static-export-safe detail route: `/product-setup/price-groups/details?id=<priceGroupId>`

Key files:

- `src/components/product-setup/PriceGroupsWorkspace.tsx`
- `src/app/product-setup/price-groups/page.tsx`
- `src/app/product-setup/price-groups/details/page.tsx`
- `src/features/products/api.ts`
- `src/components/products/ItemsWorkspace.tsx`

The Items form uses active store price groups. When a user explicitly selects a price group, Unit Retail is defaulted from that group's `defaultUnitRetail`; loading an existing product does not overwrite its saved Unit Retail.

## Design Notes

- Use the existing PayDesk visual language: dense operational screens, 8px radius cards/controls, dark mode support, and accessible buttons/tabs/forms.
- Avoid landing-page style layouts for operational workspaces.
- Preserve independent scrolling behavior in the shell and avoid page-level horizontal overflow.
