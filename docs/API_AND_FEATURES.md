# Storefront API & Features

This document maps out all features and APIs available in the Medusa V2 +
Fresh.js Storefront, including their implementations and backend requirements.

## Feature Overview

- **Modern Architecture:** Built on Fresh.js utilizing islands architecture and
  view transitions for a smooth, SPA-like user experience with partial
  hydration.
- **E-commerce Ready:** Full integration with MedusaJS backend for browsing
  collections, managing carts, user authentication, and checkout flows.
- **Service Portals:** Dedicated portals for Trade-ins, Financing, and Mac
  Repairs. Customers can book repairs and track existing tickets in real-time.
- **Secure Authentication:** Robust user account system featuring secure login,
  signup, and email verification workflows directly integrated with the backend.
- **Customer Dashboard:** A centralized account area where customers can view
  their order history, saved addresses, and active repair tickets.
- **Performance & SEO:** Leverages Deno and Fresh's server-side rendering for
  optimal Core Web Vitals, enriched with standard SEO metadata and semantic
  HTML.
- **Responsive Design:** A polished, mobile-first design implemented tightly
  with Tailwind CSS, utilizing clean typographic pairings and custom SVG
  iconography.

---

## Repair Module Implementations

The storefront maps closely to the `medusajs-repair-module` running on the
backend.

### Secure Sensitive Repair Data

Currently, querying the repair status by Serial Number via the Store API can
expose sensitive fields (customer details, internal technician notes, associated
order IDs) to anyone with the serial number.

**Backend Requirements & Implementations:**

1. **Restrict Public Payload:** Modify the public
   `GET /store/repairs?serial={serial}` endpoint to return _only_ non-sensitive
   tracking information (e.g., status, device model, public status updates).
2. **Context-Aware Payload (Authentication Check):**
   - Check if the request contains an authenticated customer session
     (`req.user.customer_id` or equivalent Medusa auth context).
   - If the authenticated customer matches the customer attached to the repair
     order, return the **full payload** (including associated order links,
     internal details approved for customer viewing, etc.).
   - If unauthenticated (or wrong customer), omit the sensitive fields.
3. (Optional) Create a strictly authenticated endpoint
   `GET /store/customers/me/repairs` to list full details for all repairs
   associated with the logged-in customer.

This ensures the storefront safely displays public tracking steps for guest
users (`/repairs/track`), while securely unlocking granular details when the
user logs into their dashboard (`/account/repairs`).

---

## Email Verification Workflow

The storefront includes a comprehensive email verification flow spanning the
`/login`, `/register`, and `/verify-email` frontend routes.

### Frontend Implementation

1. When a user registers on the storefront, a customer object is created in the
   Medusa backend.
2. The user is redirected or prompted to check their email.
3. The user clicks the verification link in their email and is taken to
   `/verify-email?token={token}&email={email}`.
4. The storefront frontend submits a `POST` request to
   `${MEDUSA_BACKEND_URL}/store/customers/verify-email`.
5. Upon successful response, the user is verified and can proceed to login.

### Backend Setup Requirements

To make the email verification flow function properly, you need to establish 3
things in your Medusa 2.15.* backend:

1. A subscriber listening to `customer.created` to generate a token and send an
   email.
2. A custom API route (`POST /store/customers/verify-email`) to accept the token
   and verify the account.
3. A notification provider installed and configured (like
   `@medusajs/notification-sendgrid` or direct Nodemailer transport).

#### 1. Event Subscriber (`src/subscribers/customer-created.ts`)

This subscriber listens for when a customer is created, generates a secure
random token, stores it in the database/metadata, and triggers an email
notification.

\`\`\`typescript import { SubscriberArgs, type SubscriberConfig } from
"@medusajs/framework"; import { ICustomerModuleService } from
"@medusajs/framework/types"; import { Modules } from
"@medusajs/framework/utils"; import { getAuthTemplate } from
"../../utils/email-templates"; import crypto from "crypto"; import nodemailer
from "nodemailer";

export default async function customerNotificationHandler({ event, container }:
SubscriberArgs<any>) { const logger = container.resolve("logger"); const data =
event.data;

if (event.name === "customer.created") { const customerService:
ICustomerModuleService = container.resolve(Modules.CUSTOMER); const customer =
await customerService.retrieveCustomer(data.id);

    // 1. Generate token
    const verificationToken = crypto.randomBytes(3).toString("hex").toUpperCase();

    // 2. Save token and mark as unverified
    await customerService.updateCustomers(customer.id, {
      metadata: {
        ...customer.metadata,
        verification_token: verificationToken,
        is_verified: false,
      },
    });

    // 3. Construct URL
    const storefrontUrl = process.env.STOREFRONT_URL || "https://your-storefront-url.com";
    const verificationUrl = \`\${storefrontUrl}/verify-email?token=\${verificationToken}&email=\${customer.email}\`;

    // 4. Dispatch Email (using direct nodemailer for example)
    const htmlContent = getAuthTemplate("customer-verification", {
      name: customer.first_name,
      verification_token: verificationToken,
      verification_url: verificationUrl,
    });

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || "465"),
      secure: true,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD },
    });

    await transporter.sendMail({
      from: process.env.SMTP_FROM,
      to: customer.email,
      subject: "Verify Your Account",
      html: htmlContent,
    });

} }

export const config: SubscriberConfig = { event: ["customer.created",
"auth.password_reset"], }; \`\`\`

#### 2. Email Template Utility (`src/utils/email-templates.ts`)

Provides the HTML template containing the verification URL and fallback token
text.

\`\`\`typescript export function getAuthTemplate(templateName: string, data:
any): string { if (templateName === "customer-verification") { return \`

<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
<h2>Verify Your Account</h2>
<p>Please click the link below to verify your email address:</p>
<a href="\${data.verification_url}">Verify Email</a>
<p>Or manually enter this token:
<strong>\${data.verification_token}</strong></p>
</div> \`; } return "<div>No template found</div>"; } \`\`\`

#### 3. Custom Verification API Route (`src/api/store/customers/verify-email/route.ts`)

Accepts the verification POST request from the storefront and checks the
metadata token.

\`\`\`typescript import { MedusaRequest, MedusaResponse } from
"@medusajs/framework/http"; import { ICustomerModuleService } from
"@medusajs/framework/types"; import { Modules } from
"@medusajs/framework/utils";

export const POST = async (req: MedusaRequest, res: MedusaResponse) => { const {
email, token } = req.body as { email: string; token: string };

if (!email || !token) { return res.status(400).json({ error: "Email and token
are required" }); }

const customerModuleService: ICustomerModuleService =
req.scope.resolve(Modules.CUSTOMER); const [customer] = await
customerModuleService.listCustomers({ email }, { take: 1 });

if (!customer) { return res.status(404).json({ error: "Customer not found" }); }

const storedToken = customer.metadata?.verification_token;

if (!storedToken || storedToken !== token) { return res.status(400).json({
error: "Invalid or expired verification token" }); }

// Token matches! Verify the customer await
customerModuleService.updateCustomers(customer.id, { metadata: {
...customer.metadata, verification_token: null, // Clear the token is_verified:
true, }, });

return res.status(200).json({ success: true, message: "Email verified
successfully" }); }; \`\`\`
