# Saphyr: Foundational Mandates & Engineering Standards

This document serves as the primary reference for the Saphyr Finance project. All future development must strictly adhere to the patterns and aesthetics defined here.

## 1. Aesthetic & Design System
- **Tone:** Premium, private, minimalist, and high-contrast.
- **The Saphyr Brand:** The primary logo and loading splash screen MUST utilize the precision-cut Sapphire Gemstone shape (via `clip-path`) and an inner multi-stop light-refraction gradient, complemented by a pulsing `drop-shadow`.
- **The Dual-Glow Architecture:** ALL structural cards (Dashboard modules, Settings sections, Tech Spec gauges) MUST utilize the dual-border glow system:
  - **4px Top Border**
  - **5px Left Border**
  - **Dynamic Shimmer:** The borders must use the `--shimmer-primary` gradient (or its success/danger variants) with a 600% background size and a linear animation to create a white-hot sweeping light effect.
  - The default color for these structural borders is Saphyr Blue (`var(--primary)`), implemented via the `.glow-primary` or `.glow-saphyr` classes.
- **Button Styling:**
  - Base buttons use standard styling with a subtle shadow.
  - Primary "Call to Action" buttons (e.g., "Sign In", "Log Transaction", "Export") MUST use the `.primary-btn` class or inline styles to apply an intense, radiant box-shadow glow that matches the user's active accent color. Toggle buttons only glow when actively selected.
- **Color Palette & Themes:**
  - **OLED Dark Mode:** True `#000000` black backgrounds with hyper-contrasted neon accents for maximum battery savings.
  - **Standard Dark Mode:** Soft `#09090b` for low-light reading.
  - **Light Mode:** Cool `#f4f7fb` with reduced glare.
- **Typography:**
  - **Body:** 'Inter' system-ui.
  - **Financials:** 'JetBrains Mono' for all numeric balances and calculations to ensure mathematical precision.
- **Emoji Policy:** Emojis are strictly limited. Use text-only labels (e.g., [ON], [OFF], [SHOW], [HIDE]) or simple geometric symbols like bullets (•). The only exception is the 🔒 for the Privacy Shield.

## 2. Mobile Optimization ("Mobile Pro")
- **PWA Ready:** Standalone manifest support (`mobile-web-app-capable`) for "Add to Home Screen" without browser bars.
- **Navigation:** Bottom Tab Bar for primary links, Hamburger Menu for secondary navigation.
- **Form Inputs:** 
  - Currency inputs must use `.currency-input-wrapper` with the `$` prefix embedded *inside* the box.
  - Date inputs must use native OS pickers (via `showPicker()`) on click.

## 3. Core Architecture Patterns
- **Client-Side Intelligence:** Features like Algorithmic Merchant Categorization and Anomaly Detection MUST be processed in the browser (frontend) to maximize data privacy and minimize server load.
- **Privacy-First Data Ingestion:** Bulk CSV Imports are parsed and validated entirely client-side using the `FileReader` API. Raw files are NEVER sent to the backend.
- **The "What-If" Sandbox:** Simulation tools (like loan or purchase calculators) must exist in an isolated state that pulls live metrics but never accidentally mutates the production database.
- **Security & Portability:**
  - **Blur-on-Idle:** The application must automatically blur its state via `visibilitychange` listeners when the tab loses focus.
  - **Data Ownership:** Users must always have the ability to export their entire encrypted/stringified state as a raw JSON Vault Backup.
  - **Authentication:** Support for both Email and TOTP (Authenticator App) 2FA methods.
  - **Automatic Sweep:** Support for an automated monthly sweep function that moves unallocated capital into a designated savings goal.

## 4. Engineering Standards
- **Validation:** Every change must be build-verified (`npm run build`) before final delivery.
- **State Management:** Prioritize local component state for forms; use context for global user preferences and auth.
- **Precision:** All edits must be surgical and respect surrounding code style.
