# Rev Cloud Blueprint - Monetization Web App

This Next.js application provides authentication, licensing, and monetization services for the Rev Cloud Blueprint VS Code extension.

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ installed
- Supabase account and project setup
- Vercel account (for deployment)

### Local Development

1. **Set up environment variables:**
   - Copy environment variables from `ENV_SETUP.md`
   - Create `.env.local` file (see ENV_SETUP.md for template)

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Run development server:**
   ```bash
   npm run dev
   ```

4. **Open browser:**
   ```
   http://localhost:3000
   ```

## 📚 Documentation

**Start here:** → **[NEXT_STEPS_CHECKLIST.md](./NEXT_STEPS_CHECKLIST.md)** ← Complete deployment guide

### Core Documentation

- **[NEXT_STEPS_CHECKLIST.md](./NEXT_STEPS_CHECKLIST.md)** - Quick action items to deploy (START HERE!)
- **[IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md)** - What's implemented and how it works
- **[DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)** - Detailed deployment instructions
- **[ENV_SETUP.md](./ENV_SETUP.md)** - Environment variables guide

### System Documentation

- **[../../docs/User Journey & Authentication Flow.md](../../docs/User%20Journey%20%26%20Authentication%20Flow.md)** - User experience design
- **[../../docs/monetization_roadmap.md](../../docs/monetization_roadmap.md)** - Feature roadmap
- **[../../docs/DATABASE_SCHEMA.md](../../docs/DATABASE_SCHEMA.md)** - Database design
- **[../../docs/SUPABASE_STATUS_CHECK.md](../../docs/SUPABASE_STATUS_CHECK.md)** - Database status

## 🏗️ Architecture

### Tech Stack

- **Framework:** Next.js 15 with App Router
- **Styling:** Tailwind CSS
- **Authentication:** Supabase Auth
- **Database:** PostgreSQL (via Supabase)
- **Deployment:** Vercel
- **Domain:** blueprint.forceweaver.com

### Key Features

- ✅ Email/password authentication
- ✅ Automatic callback flow for VS Code extension
- ✅ Device token generation and validation
- ✅ Free tier license management
- ⏳ OAuth providers (Google, GitHub, Microsoft) - Coming soon
- ⏳ Stripe payment integration - Coming soon

## 📁 Project Structure

```
apps/monetization-web/
├── app/
│   ├── api/                 # API routes
│   │   ├── auth/
│   │   │   └── login-callback/  # Device token generation
│   │   └── license/
│   │       └── validate/    # Token validation
│   ├── login/               # Login page & form
│   ├── signup/              # Signup page & form
│   ├── dashboard/           # User dashboard
│   └── components/          # Shared components
├── lib/
│   ├── supabase/            # Supabase client utilities
│   ├── token-generator.ts   # Secure token generation
│   └── license-validation.ts # License validation logic
└── [Documentation files]
```

## 🔑 Environment Variables

Required environment variables (see `ENV_SETUP.md` for details):

```bash
NEXT_PUBLIC_APP_URL=https://blueprint.forceweaver.com
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_key
```

## 🚀 Deployment

### Quick Deploy

```bash
# Link to Vercel (already done)
vercel link

# Deploy to production
vercel --prod
```

### Complete Setup

Follow the step-by-step guide in **[NEXT_STEPS_CHECKLIST.md](./NEXT_STEPS_CHECKLIST.md)**

Time to deploy: ~35 minutes

## 🧪 Testing

### Local Testing

```bash
# Start dev server
npm run dev

# Test login
open http://localhost:3000/login

# Test signup
open http://localhost:3000/signup
```

### Production Testing

After deployment, verify:
- Homepage loads
- Login/signup work
- API endpoints respond
- Database records created

See `DEPLOYMENT_GUIDE.md` for detailed testing procedures.

## 🔒 Security

- Device tokens: 64-char cryptographically secure random hex
- Service role key: Never exposed to browser
- Redirect URIs: Validated to only allow localhost
- HTTPS: Required for all production traffic
- Environment variables: Sensitive keys marked in Vercel

## 📊 API Endpoints

### Authentication
- `POST /api/auth/login-callback` - Generate device token after login

### License Management
- `POST /api/license/validate` - Validate device token

See `IMPLEMENTATION_SUMMARY.md` for complete API documentation.

## 🛠️ Development

### Install Dependencies

```bash
npm install
```

### Run Development Server

```bash
npm run dev
```

### Build for Production

```bash
npm run build
```

### Run Production Build Locally

```bash
npm run start
```

## 📞 Support

If you encounter issues:
1. Check `NEXT_STEPS_CHECKLIST.md` for common setup issues
2. Review `DEPLOYMENT_GUIDE.md` → "Troubleshooting" section
3. Check Vercel logs: `vercel logs`
4. Check Supabase logs: Dashboard → Logs

## 📄 License

See the [LICENSE](../../LICENSE) file for details.

---

**Ready to deploy?** → Start with **[NEXT_STEPS_CHECKLIST.md](./NEXT_STEPS_CHECKLIST.md)** 🚀
