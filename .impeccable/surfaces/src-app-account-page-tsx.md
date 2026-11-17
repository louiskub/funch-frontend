---
version: 1
slug: "src-app-account-page-tsx"
primary_target: "src/app/account/page.tsx"
related_targets: ["src/features/i18n/messages/en.json","src/features/i18n/messages/th.json"]
---

# Account surface

Scope: Customer account profile at `/account`, with Admin support. Mode: Operate. The main task is updating contact details. Keep sign-in/register prompts, redirect behavior, saving/error states, logout, role visibility, bookings navigation, and the Admin portal link. Preferences, password reset, email verification, and booking management are outside this surface.

## Direction contract

THESIS: Lead with the signed-in person's identity and make profile editing the primary task, instead of presenting a generic settings dashboard.

OWN-WORLD: Use Easy Days · Original: white canvas, Manrope, blue actions, light-blue supporting surfaces, and the existing form and button language. Keep color values in `globals.css` tokens.

STORY: The user recognizes their account, edits their name, email, or phone, saves changes, visits bookings, or signs out. Admins also see their role and portal link. Signed-out visitors can still sign in or register without losing the redirect.

FIRST VIEWPORT: Center a spacious account workspace beneath the solid white navbar. Place the page title and supporting text above an identity header with avatar, display name, and role. Below, give the profile form the larger column and a compact actions area the smaller column. Keep save beside the fields; place bookings and role-aware Admin navigation in the actions area, with sign-out separated below.

FORM: Identity-first profile, structure 6 of 7, chosen in the account surface round. Seed reference: `seed:5fcce8a59e8e52ab`.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
