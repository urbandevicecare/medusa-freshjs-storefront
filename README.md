# Medusa V2 + Fresh.js 2.3 Storefront

A high-performance, SEO-optimized e-commerce storefront for Medusa V2 + Fresh.js
2.3. Built with Deno, Fresh.js, and MedusaJS, it provides a seamless shopping
experience for refurbished Macs along with integrated repair tracking and
customer services.

## 📚 Documentation

We have moved detailed information into dedicated documents to keep things easy
to navigate:

- **[Features & API Implementations](./docs/API_AND_FEATURES.md)**: Detailed
  mapping of all storefront features, architectural decisions, repair module
  integration, and the email verification setup.
- **[Changelog](./docs/CHANGELOG.md)**: Release history, updates, and bug fixes.

---

## Environment Variables

To properly run this storefront, create a `.env` file in the root directory and
populate it with the following variables:

```env
# Medusa Backend configuration
MEDUSA_BACKEND_URL="http://localhost:9000"
MEDUSA_PUBLISHABLE_KEY="pk_your_publishable_key_here"

# Storefront Branding configuration
STORE_NAME="Your Store Name"
STORE_DOMAIN="yourstore.com"
LOGO_URL="/logo.svg"
```

## Setup & Installation

Follow these steps to get your storefront up and running:

1. **Prerequisites:** Ensure you have [Deno](https://deno.land/) installed on
   your machine. You will also need a running MedusaJS backend instance.
2. **Clone the Repository:**
   ```bash
   git clone <repository_url>
   cd <repository_directory>
   ```
3. **Configure Environment Variables:** Create a `.env` file in the root
   directory and configure the variables detailed in the section above.
4. **Install Dependencies:** Deno will handle dependencies automatically on the
   first run, but you can explicitly cache them by running:
   ```bash
   deno cache main.ts
   ```
5. **Start Development Server:**
   ```bash
   deno task dev
   ```
   This will start the local development server (typically on port 8000).
6. **Production Build:** When deploying to production, use the build task to
   bundle assets for optimal performance:
   ```bash
   deno task build
   deno task start
   ```
