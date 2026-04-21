# Skillforge

A **local-first IHK IT exam prep flashcard app** built with Next.js, TypeScript, and SQLite. Multiple users share a single deployed instance with manually-issued credentials. No cloud services, no external databases — everything runs on-device.

---

## Features

- 📚 **Multiple card types:** Flip cards (learn mode), multiple-choice (test mode), fill-in-the-blank
- 👥 **Multi-user support:** Credentials issued manually, no self-registration
- 📊 **Progress tracking:** Per-topic learning and test progress with visual indicators
- 🌙 **Dark mode:** Toggle via `next-themes`
- ⚡ **Server-driven:** Minimal client-side JavaScript (flip animation only)
- 🗄️ **Local database:** SQLite + Drizzle ORM, no external services

---

## Tech Stack

| Layer | Choice |
|---|---|
| **Framework** | Next.js 16 App Router, TypeScript |
| **Styling** | Tailwind CSS v4, shadcn/ui |
| **Font** | Inter |
| **Database** | SQLite via Drizzle ORM + `better-sqlite3` |
| **Auth** | Auth.js v5 (credentials provider, Drizzle adapter) |
| **Dark mode** | `next-themes` |

---

## Architecture

**Pattern:** Server Components + Server Actions. The card flip is the only client-side interactivity.

- All data reads happen in React Server Components
- All mutations (progress updates) go through Next.js Server Actions
- Auth.js v5 session is read server-side on every protected route
- `"use client"` is scoped to the `<FlashCard>` component only

---

## Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn

### Installation

```bash
git clone https://github.com/BXDN-LAB/skillforge.git
cd skillforge
npm install
```

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser.

### Database Setup

The SQLite database (`skillforge.db`) is created automatically on first run. To seed flashcards:

```bash
npm run seed
```

This reads `flashcards.json` and populates the database.

### Create Users

Users are created via manual DB insert or admin script (no self-registration). Example:

```bash
# Via script (if available)
npm run create-user username password

# Or manually in sqlite3
sqlite3 skillforge.db
INSERT INTO users (username, password, name) VALUES ('student1', '$2b$10$...bcrypt_hash...', 'Student One');
```

---

## File Structure

```
app/
├── (auth)/
│   └── login/page.tsx              # Username + password form
├── (app)/
│   ├── layout.tsx                  # Auth guard → /login if no session
│   ├── dashboard/page.tsx          # Per-topic progress overview
│   ├── topics/page.tsx             # Topic picker grid
│   └── study/[topic]/page.tsx      # Card study session (?mode=learn|test)
├── api/auth/[...nextauth]/route.ts # Auth.js v5 handler
│
lib/
├── auth.ts                         # Auth.js config + Drizzle adapter
├── db.ts                           # Drizzle client (better-sqlite3)
└── schema.ts                       # Drizzle table definitions

components/
└── flashcard.tsx                   # "use client" — flip animation + actions

scripts/
└── seed.ts                         # Reads flashcards.json → SQLite
```

---

## Data Model

### Card Types

| cardType | Study Mode | Interaction | Scoring |
|---|---|---|---|
| `flip` | Learn | Tap card to reveal | Self-judged: Got it / Review later |
| `multiple-choice` | Test | Tap 1 of 4 options | Auto: correct = `learned`, wrong = `review` |
| `fill-in` | Test | Type answer | Auto: trimmed, case-insensitive match = `learned` |

### Database Schema

All data stored in `skillforge.db` (SQLite):

**Auth tables (Auth.js required):**
- `users` → id, username (unique), password (bcrypt), name, createdAt
- `sessions` → sessionToken, userId FK, expires
- `accounts`, `verification_tokens` → OAuth fields (not used)

**App tables:**
- `flashcards` → id, topic, cardType, question, answer, options (JSON), images, sortOrder
- `user_progress` → userId FK, flashcardId FK, status (unseen|learned|review), updatedAt

### Seed Format (`flashcards.json`)

```json
[
  {
    "topic": "Netzwerke",
    "cardType": "flip",
    "question": "Was ist der Unterschied zwischen TCP und UDP?",
    "answer": "TCP ist verbindungsorientiert und zuverlässig...",
    "options": null,
    "sortOrder": 1
  },
  {
    "topic": "Netzwerke",
    "cardType": "multiple-choice",
    "question": "Welches Protokoll arbeitet auf Schicht 4?",
    "answer": "TCP",
    "options": ["IP", "TCP", "HTTP", "Ethernet"],
    "sortOrder": 2
  }
]
```

---

## Pages & User Flow

| Page | Purpose |
|---|---|
| `/login` | Username + password authentication |
| `/dashboard` | Per-topic progress bars (learn/test) and quick-start buttons |
| `/topics` | Topic picker grid with Learn/Test buttons |
| `/study/[topic]?mode=learn\|test` | Interactive card study session |

---

## UI Design

- **Base colors:** `bg-zinc-50` (light) / `bg-zinc-950` (dark)
- **Cards:** `bg-white` (light) / `bg-zinc-900` (dark)
- **Buttons:** High contrast, min 44px tap targets
- **Mobile-first:** Responsive, no sidebars or modals
- **Dark mode:** Toggle in top navigation bar

---

## Deployment

### Local Development with HTTPS

For testing HTTPS locally without browser warnings:

```bash
# Install mkcert (generates self-signed certificates)
# macOS
brew install mkcert
# Ubuntu/Debian
sudo apt install mkcert

# Create local CA and certificate
mkcert -install
mkcert localhost 127.0.0.1

# Move certs to project
mkdir -p certs
mv localhost+1-key.pem certs/
mv localhost+1.pem certs/

# Run with HTTPS (requires next.js custom server or `npm run dev` with NODE_TLS_REJECT_UNAUTHORIZED=0)
NODE_TLS_REJECT_UNAUTHORIZED=0 npm run dev
```

Open `https://localhost:3000` (browser will warn about cert, click "Advanced" → "Proceed")

### Production Deployment (Ubuntu/Debian)

#### 1. Server Setup

```bash
# SSH into your server
ssh user@your-domain.com

# Install Node.js 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install nginx
sudo apt install -y nginx

# Install certbot for Let's Encrypt
sudo apt install -y certbot python3-certbot-nginx
```

#### 2. Application Setup

```bash
# Clone repository
git clone https://github.com/BXDN-LAB/skillforge.git /opt/skillforge
cd /opt/skillforge

# Install dependencies
npm ci --omit=dev

# Create .env.production
cp .env.example .env.production
# Edit with your values
nano .env.production
```

**`.env.production` template:**
```
AUTH_SECRET=your-long-random-string-here
DATABASE_URL=file:./skillforge.db
NODE_ENV=production
```

#### 3. Nginx Configuration

Create `/etc/nginx/sites-available/skillforge`:

```nginx
upstream nextjs_skillforge {
  server 127.0.0.1:3000;
}

server {
  listen 80;
  server_name your-domain.com;
  location /.well-known/acme-challenge/ {
    root /var/www/certbot;
  }
  location / {
    return 301 https://$server_name$request_uri;
  }
}

server {
  listen 443 ssl http2;
  server_name your-domain.com;

  ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
  ssl_protocols TLSv1.2 TLSv1.3;
  ssl_ciphers HIGH:!aNULL:!MD5;

  # Forward requests to Next.js
  location / {
    proxy_pass http://nextjs_skillforge;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_cache_bypass $http_upgrade;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
```

Enable the site:
```bash
sudo ln -s /etc/nginx/sites-available/skillforge /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

#### 4. SSL Certificate (Let's Encrypt)

```bash
sudo certbot certonly --nginx -d your-domain.com
# Answer prompts, cert will be installed at /etc/letsencrypt/live/your-domain.com/
```

#### 5. PM2 Process Manager

```bash
# Install PM2 globally
sudo npm install -g pm2

# Start application
cd /opt/skillforge
pm2 start npm --name "skillforge" -- start

# Save PM2 config to auto-restart on reboot
pm2 startup
pm2 save
```

#### 6. Verify

```bash
# Check PM2 status
pm2 status

# Check nginx status
sudo systemctl status nginx

# Test SSL
curl -I https://your-domain.com
```

---

## NEEDS DONE

These features are planned but not yet implemented:

### Phase 2: PDF Import + LLM Integration

- [ ] **PDF Text Extraction** (`lib/pdf.ts`)
  - Use `pdfjs-dist` to extract text from uploaded PDFs
  - Parse structure (headings, paragraphs, tables)
  - Output structured JSON for card generation

- [ ] **LLM Service** (`lib/llm.ts`)
  - Integrate with **Ollama** (local open-source LLM)
  - Accept extracted text → generate flashcard Q&A pairs
  - Support batch and streaming generation

- [ ] **PDF Import CLI** (`scripts/import-pdf.ts`)
  - Command: `npm run import:pdf <path> <topic> [--auto]`
  - `--auto` flag: use Ollama to generate cards automatically
  - Without flag: extract text only (manual creation later)
  - Insert generated cards into database

- [ ] **README PDF Usage Guide**
  - How to install and run Ollama locally
  - Example workflows: extract-only vs. auto-generate
  - Recommended LLM models for flashcard generation

### Phase 3: Admin Features (Future)

- [ ] **Admin Dashboard** (topic management, user management)
- [ ] **Web UI for PDF Upload** (instead of CLI-only)
- [ ] **Progress Export** (CSV, JSON)

---

## Out of Scope

- Spaced repetition algorithm
- User self-registration
- Image upload UI (images placed manually in `public/images/cards/`)
- Export/import of user progress
- Full admin panel

---

## License

MIT
