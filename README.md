<p align="center">
  <img src="public/icon-192.png" alt="Mailflare" width="84" />
</p>

<h1 align="center">Mailflare</h1>

<p align="center">
  <strong>The modern, privacy-first business email and workspace platform.</strong><br>
  Self-host custom domain email with optimal deliverability, automated SPF/DKIM/DMARC checks, anti-abuse protection, and multi-tenant workspace management.
</p>

<p align="center">
  <a href="#features">Features</a> •
  <a href="#deliverability--security">Deliverability</a> •
  <a href="#deploy">Deploy</a> •
  <a href="#self-host-with-docker">Self-Host</a> •
  <a href="#development">Development</a> •
  <a href="#docs">Docs</a>
</p>

---

## Overview

Mailflare gives individuals, startups, and agencies their own full-featured business email infrastructure without paying $6–$18/user/month to Google Workspace or Microsoft 365.

Run it on **Cloudflare Workers** or a single **Docker container**. Connect unlimited custom domains, manage team mailboxes, block spam, and monitor deliverability health with built-in SPF, DKIM, and DMARC verification.

<table>
  <tr>
    <td align="center"><img src="screenshots/1.png" alt="Inbox" width="360"><br><b>Fast Webmail & Conversation View</b></td>
    <td align="center"><img src="screenshots/2.png" alt="Domains" width="360"><br><b>Deliverability & DNS Health Score</b></td>
  </tr>
  <tr>
    <td align="center"><img src="screenshots/3.png" alt="Mailboxes" width="360"><br><b>Mailboxes, Aliases & Boosters</b></td>
    <td align="center"><img src="screenshots/6.png" alt="Drive" width="360"><br><b>Secure Cloud Drive & Attachments</b></td>
  </tr>
</table>

---

## Features

### 📬 Webmail & Inbox Experience
- **Sleek Modern Webmail**: Clean, high-performance interface with keyboard shortcuts, multi-account switcher, conversation threading, and quick search.
- **Filter Chips & Density Modes**: Instant one-click chips (`All`, `Unread`, `Starred`, `Has Attachment`) and switcher between **Comfortable** (multi-line snippet) and **Compact** (single-line Gmail style).
- **Drag & Drop Attachments**: Visual dropzone to drop files directly into messages.
- **Undo Send & Read Receipts**: Configurable undo send delay (5s, 10s, 20s, 30s) and privacy-first open tracking.

### 🛡️ Deliverability & Outbound Warmup
- **Deliverability Health Score Widget**: Real-time 0–100% compliance audit checking MX, SPF, DKIM, and DMARC to guarantee outbound messages stay out of Gmail and Yahoo spam folders.
- **Registrar DNS Assistant**: Automatic record generation with 1-click copyable values for GoDaddy, Namecheap, Route53, and Cloudflare.
- **DKIM Signing**: Native RSA domain key generation (`default._domainkey`) and automatic header signing.
- **Active Domain Gate**: Outbound sending is protected until the sending domain is verified.

### ⚙️ Self-Service Mailbox Controls (No Admin Needed)
- **Display Name (Send As)**: Team members can customize how their name appears per inbox (e.g. *"Support Team"* vs *"Alex Rivers"*).
- **Default Sender Identity**: Choose default sending identity from primary address or any active alias.
- **Rich Email Signatures**: Dedicated multi-line signature editor with live sanitized HTML preview.
- **Email Aliases**: Create disposable and routing aliases in 1-click.
- **Email Forwarding**: Auto-forward incoming mail to external backup addresses.
- **Storage & Quota Monitor**: Live visual breakdown of mailbox storage usage (messages vs attachments) with 1-click storage booster add-ons.
- **Blocked Senders**: Personal blocklist to route spammers and unwanted addresses straight to Trash.

### 🛡️ Anti-Abuse & Free Trial Protection
- **OTP Email Verification**: 6-digit verification code sent to backup recovery email before workspace activation.
- **Disposable Domain Blocker**: Integrated with `@visulima/disposable-email-domains` to reject temporary/burner emails.
- **Trial Throttling**: 7-day free trial limited to 30 emails/day, 10 emails/hour, 1 domain, and 1 mailbox to prevent bad actors from burning server IP reputations.
- **Trial Countdown Banner**: In-app webmail banner displaying remaining trial days and 1-click upgrade button.

### 💳 Workspace Billing & Plans
- **Tiered Plans**: Starter, Pro, and Business tiers powered by Stripe.
- **Mailbox Storage Boosters**: Dedicated +1 GB storage add-ons for high-volume inboxes ($0.25/mo) without forcing whole-plan upgrades.
- **Extra Mailbox Add-ons**: Add team mailboxes on-demand.

---

## Deliverability & Security

Mailflare conforms strictly to the 2024 Google & Yahoo bulk sender requirements:

| Check | Requirement | Purpose |
|---|---|---|
| **MX** | Mail Exchanger | Routes incoming mail to your Mailflare instance |
| **SPF** | `v=spf1 ... ~all` | Authorizes your server IP or provider to send on your behalf |
| **DKIM** | `v=DKIM1; k=rsa; p=...` | Signs emails cryptographically with a private/public keypair |
| **DMARC** | `v=DMARC1; p=quarantine; ...` | Protects your domain from spoofing and phishing |

---

## Technical Stack

- **Framework**: Next.js 15 (App Router, React 19, TypeScript, Tailwind CSS)
- **Database Architecture**: SQLite / Cloudflare D1 (default), PostgreSQL, or MySQL with automated 3-dialect migration bundling (`drizzle-orm`)
- **Object Storage**: Cloudflare R2, Backblaze B2, AWS S3, or local disk
- **Outbound Email**: Built-in Mailflare engine, Cloudflare Email Routing, Resend, or Amazon SES
- **Authentication**: Session cookies, WebAuthn Passkeys, TOTP 2-Factor Authentication

---

## Self-Host with Docker

Run Mailflare on any VPS or homelab with Docker Compose in under 2 minutes:

```bash
# 1. Clone repository
git clone https://github.com/hieunc229/mailflare.git
cd mailflare

# 2. Configure environment
cp .env.docker.example .env.docker
# Edit .env.docker with your domain and secret keys

# 3. Start Mailflare
docker compose up -d --build
```

Open `http://your-server-ip:4008` to complete initial setup and create your primary admin account.

---

## Deploy to Cloudflare Workers

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/hieunc229/mailflare)

1. Click **Deploy to Cloudflare**. Keep the app name `mailflare`.
2. Create a scoped Cloudflare API token with `Email Sending:Edit`, `DNS Settings:Edit`, and `Email Routing:Edit` permissions.
3. Open `https://mailflare.<your-subdomain>.workers.dev/setup` to create the workspace owner account.

---

## Development

```bash
# 1. Install dependencies
pnpm install

# 2. Copy development variables
cp .dev.vars.example .dev.vars

# 3. Generate migration bundles and run dialect tests
pnpm run db:bundle
node --test tests/database-dialects.test.mjs

# 4. Start local development server
pnpm run dev
```

### Database Schema Updates
Any change to `src/db/schema/index.ts` must maintain synchronization across SQLite, PostgreSQL, and MySQL per `AGENTS.md`:

```bash
# Generate migrations for all 3 dialects
pnpm run db:generate
pnpm run db:generate:pg
pnpm run db:generate:mysql

# Refresh the migration bundle and run dialect verification
pnpm run db:bundle
node --test tests/database-dialects.test.mjs
```

---

## Documentation

- [Deployment Guide](docs/deployment.md)
- [Databases & Dialect Sync](docs/databases.md)
- [Sending & Receiving Providers](docs/providers.md)
- [Self-Hosting Guide](docs/self-hosting.md)
- [API & Webhooks](docs/api.md)

---

## License

See [LICENSE](LICENSE).
