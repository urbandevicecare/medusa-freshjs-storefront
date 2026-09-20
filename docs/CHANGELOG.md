# Changelog

### v1.3.0 (Current)

- **Enhancement**: Removed the `PAYMENT_PROVIDERS` environment variable in favor
  of dynamically fetching and formatting payment providers from the Medusa
  backend.
- **Enhancement**: Added a GitHub Actions CI workflow to automatically build the
  storefront and attach release assets (ZIP archives) on version tags.

### v1.2.0

- **Enhancement**: Added beautiful frontend HTML rendering for repair documents
  (Job Card, Quote, Tax Invoice, Receipt) to match the order invoice styling.
- **Enhancement**: Introduced `STOREFRONT_URL` environment variable for robust
  QR code generation across invoices and repair documents.
- **Enhancement**: Seamless post-login redirects implemented across account and
  repair tracking portals. This release focuses heavily on integrating and
  refining the Medusa Repair Module frontend. The repair booking and tracking
  workflows have been completely overhauled to act as standalone services with
  secured routing and seamless UI integration. We've introduced robust frontend
  logging, eradicated legacy parsing errors, and delivered significant UI
  upgrades to the `PromoBanner` and global navigations for a more polished and
  responsive customer experience.

### v1.1.0

- **Feature**: Integrated comprehensive email verification flow spanning
  `/login`, `/register`, and `/verify-email` routes.
- **Feature**: Integrated Medusa Repair Module frontend paths mapping over
  `/repairs/track` and `account/repairs`.
- **Enhancement**: Migrated TrackRepairIsland functionality to Medusa V2 +
  Fresh.js 2.3's modern, minimal styling utilizing `slate` and `emerald`
  tailwind palettes.
- **Enhancement**: Implemented extensive frontend debugging utilizing
  `console.debug`, `console.info`, and `console.warn` for Medusa backend fetch
  requests.
- **Bug Fix**: Resolved silent JSON parsing errors leading to generic fallback
  error messages on the Verification Page.
- **UI Upgrade**: Applied View Transitions across all pages to ensure smooth
  client-side route navigation.

### v1.0.0 - Initial Release

- Core e-commerce routes (Shop, Cart, Checkout) implemented and mapped to Medusa
  workflows.
- Introduction of Fresh.js integration for storefront repair tracking via
  `TrackRepairIsland`.
- Baseline static pages (About Us, Careers, Contact, Legal Policies) launched.
