# Saphyr: Foundational Mandates & Engineering Standards

This document serves as the primary reference for the Saphyr Finance project. All future development must strictly adhere to the patterns and aesthetics defined here.

## 1. Aesthetic & Design System
- **Tone:** Premium, private, minimalist, and high-contrast.
- **Color Palette:**
  - **OLED Dark Mode:** True `#000000` black for backgrounds and cards.
  - **Accents:** Electric Blue (`#3b82f6`) for primary actions and glowing elements.
  - **Borders:** Ultra-dark slates (`#111827`) to maintain OLED pixel integrity.
- **Typography:**
  - **Body:** 'Inter' system-ui.
  - **Financials:** 'JetBrains Mono' for all numeric balances and calculations to ensure mathematical precision.
- **Emoji Policy:** **STRICT ZERO EMOJI.** Use text-only labels (e.g., [ON], [OFF], EDIT, DONE, REMOVE) or simple geometric symbols like bullets (•).

## 2. Mobile Optimization ("Mobile Pro")
- **PWA Ready:** Standalone manifest support for "Add to Home Screen" without browser bars.
- **Navigation:**
  - Bottom Tab Bar for primary links (Dashboard, Accounts, Bills, Transactions, Settings).
  - Hamburger Menu remains available for secondary navigation on all screens.
- **Touch Targets:**
  - Minimum height of `48px` for buttons.
  - Inputs/Selects must be `16px` font-size to prevent iOS auto-zoom on focus.
- **Haptics:** Subtle `:active` scale transformation (0.96) on all clickable elements.

## 3. Core Architecture Patterns
- **Atomic Sync:** Updating critical data (like Salary) must return the new calculated state (like Tax Estimate) in the **same response** to prevent race conditions.
- **Income Architect 2.0:**
  - Step-by-step flow: Base Earnings -> Deductions -> Tax Assessment -> Final Net.
  - Support for both Salary and Hourly input modes.
  - Support for Manual Tax Overrides (Override actual paycheck tax vs auto-estimate).
- **Data Loading:** Throttled reloading (5s cooldown) via `lastFetched` state to prevent flicker and redundant server calls.
- **Transaction Virtualization:** Infinite scroll/Load More logic for transaction lists to ensure mobile performance.

## 4. Engineering Standards
- **Validation:** Every change must be build-verified (`npm run build`) before final delivery.
- **State Management:** Prioritize local component state for forms; use context for global user preferences and auth.
- **Precision:** All edits must be surgical and respect surrounding code style.
