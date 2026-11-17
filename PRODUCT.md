# Calrentar Car Rental

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Customers choose a rental vehicle type, branch, and pickup/return period. Administrators review requests and operate pickup, assignment, return, fleet, options, members, and reports across branches.

## Product Purpose

Make requesting a rental clear, with transparent dates, branch, currency, and booking status. Give branch staff the information needed to approve and fulfill a request.

## Operating Context

Multi-country, multi-branch rental service, including airport branches. A branch is distinct from an airport. Existing implementation uses Next.js, React, Tailwind, and a separate NestJS API.

## Capabilities and Constraints

- Customers reserve a CarType, not an individual Car. An administrator assigns a physical vehicle at pickup.
- Checkout creates PENDING, awaiting administrator approval. Mock payment succeeds at checkout; there is no real payment or card collection.
- Registration can happen during checkout. Pickup and return use the same branch in the MVP.
- Availability is estimated; approval and physical readiness are separate checks.
- Quotes originate in backend pricing rules, not client-side daily-rate multiplication.
- Show branch-local times and explicit currency codes. Reports show booking value, not cash receipts.
- Country and branch administration, loyalty, one-way rentals, and document uploads are outside the current MVP.
- Source of business truth: ../CONTEXT.md and ../docs/project-context.md.

## Brand Commitments

Selected on 2026-11-16: Easy Days · Original, using blue/light blue, white HTML body (#FFFFFF) including dark system preference, Manrope, a booking-first homepage, and a friendly, comfortable interface with rounded forms and generous space. Component library and styling stack decision: **shadcn/ui + Tailwind CSS**. DESIGN.md is the selected design authority. Hertz informed search initiation; Europcar informed vehicle and location presentation. Neither reference changes Calrentar business rules.

## Evidence on Hand

Working API-connected pages and frozen design captures. No customer reviews, awards, partner endorsements, or commercial benefit claims are approved for fabrication. Demo content must be labeled as such.

## Product Principles

- Make the next action and current booking status explicit.
- Help users compare vehicles using consistent information.
- Preserve the distinction between requesting, approving, and assigning.
- Keep design experiments isolated until the user selects a direction.

## Current Design Scope

The user selected Easy Days · Original after comparing palette variants and decided to build UI components with **shadcn/ui + Tailwind CSS**. DESIGN.md records the selected theme, tokens, and detailed implementation reference; docs/design/LUNA-HANDOFF.md provides a reusable task prompt. Frozen customer desktop/mobile and administrator desktop captures live in docs/design/easy-days-original/. Temporary preview routes and mock assets were cleaned up before commit, leaving only the authoritative design tokens and reference specifications. Implementation scope is assigned separately.
