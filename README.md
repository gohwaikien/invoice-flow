# InvoiceFlow - Invoice Management System

A modern full-stack invoice management application with OCR-powered data extraction, dual user roles (Supplier & Business), payment tracking, and Google OAuth authentication.

![Next.js](https://img.shields.io/badge/Next.js-16-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)
![Prisma](https://img.shields.io/badge/Prisma-5.22-teal)
![TailwindCSS](https://img.shields.io/badge/TailwindCSS-4.0-cyan)

## Features

### For Suppliers
- 📤 Upload invoices (PDF/images)
- 🔍 Automatic OCR extraction of invoice data
- 📊 Track payment status in real-time
- 📋 View complete payment history

### For Businesses
- 📥 View invoices assigned to you
- 💳 Add payments with slip uploads
- 📈 Track payment progress
- 🧾 Access payment records

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 16 (App Router) |
| Styling | Tailwind CSS 4.0 |
| Database | PostgreSQL + Prisma |
| Auth | NextAuth.js v5 (Google OAuth) |
| OCR | Google Cloud Vision API |
| Storage | AWS S3 / Cloudflare R2 |

## Prerequisites

- Node.js 20.x or later
- PostgreSQL database
- Google Cloud Console project (for OAuth & Vision API)
- S3-compatible storage (AWS S3 or Cloudflare R2)

## Setup Instructions

### 1. Clone and Install

```bash
cd invoice_app
npm install
```

### 2. Environment Variables

Create a `.env` file in the root directory:

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/invoice_app?schema=public"

# NextAuth.js
AUTH_SECRET="your-auth-secret-generate-with-openssl-rand-base64-32"
AUTH_URL="http://localhost:3000"

# Google OAuth (get from https://console.cloud.google.com/apis/credentials)
AUTH_GOOGLE_ID="your-google-client-id"
AUTH_GOOGLE_SECRET="your-google-client-secret"

# AWS S3 / Cloudflare R2 for file storage
S3_BUCKET_NAME="your-bucket-name"
S3_REGION="auto"
S3_ENDPOINT="https://your-account-id.r2.cloudflarestorage.com"
S3_ACCESS_KEY_ID="your-access-key"
S3_SECRET_ACCESS_KEY="your-secret-key"

# Google Cloud Vision API (for OCR)
GOOGLE_CLOUD_API_KEY="your-api-key"
```

### 3. Set Up Google OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Create a new project or select existing
3. Configure OAuth consent screen
4. Create OAuth 2.0 Client ID (Web application)
5. Add authorized redirect URIs:
   - `http://localhost:3000/api/auth/callback/google` (development)
   - `https://yourdomain.com/api/auth/callback/google` (production)
6. Copy Client ID and Client Secret to your `.env`

### 4. Set Up Database

```bash
# Generate Prisma client
npx prisma generate

# Push schema to database
npx prisma db push

# (Optional) Open Prisma Studio to view data
npx prisma studio
```

### 5. Set Up Storage (Cloudflare R2 Example)

1. Go to Cloudflare Dashboard → R2
2. Create a new bucket
3. Create API token with read/write permissions
4. Copy credentials to your `.env`

### 6. Set Up Google Cloud Vision API (Optional)

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Enable Cloud Vision API
3. Create API key or service account
4. Add to your `.env`

Note: Without this configured, the app will use mock OCR data.

### 7. Run the Application

```bash
# Development
npm run dev

# Production build
npm run build
npm start
```

Visit `http://localhost:3000` to access the application.

## User Flow

### First-time Users
1. Sign in with Google
2. Choose role: **Supplier** or **Business**
3. Access role-specific dashboard

### Suppliers
1. Upload invoice (drag & drop or browse)
2. OCR extracts: invoice number, date, recipient, amount
3. Optionally assign to a business user (by email)
4. Track payments as they come in

### Businesses
1. View invoices assigned to you
2. Click "Pay" to add a payment
3. Enter amount and optionally upload payment slip
4. Invoice status updates automatically

## Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── auth/[...nextauth]/    # NextAuth handlers
│   │   ├── files/[key]/           # Signed URL generation
│   │   ├── invoices/              # Invoice CRUD
│   │   └── user/role/             # Role assignment
│   ├── auth/signin/               # Sign-in page
│   ├── dashboard/                 # Main dashboard
│   └── onboarding/                # Role selection
├── components/
│   ├── ui/                        # Reusable UI components
│   ├── InvoiceTable.tsx           # Invoice list
│   ├── InvoiceUpload.tsx          # Upload form
│   ├── PaymentModal.tsx           # Payment form
│   └── InvoiceDetailModal.tsx     # Invoice details
├── lib/
│   ├── auth.ts                    # NextAuth config
│   ├── prisma.ts                  # Prisma client
│   ├── s3.ts                      # S3 utilities
│   └── ocr.ts                     # OCR extraction
└── types/
    └── next-auth.d.ts             # Type extensions
```

## API Routes

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/invoices` | List invoices (filtered by role) |
| POST | `/api/invoices` | Create invoice (suppliers only) |
| GET | `/api/invoices/[id]` | Get invoice details |
| PATCH | `/api/invoices/[id]` | Update invoice |
| DELETE | `/api/invoices/[id]` | Delete invoice |
| POST | `/api/invoices/[id]/payments` | Add payment |
| POST | `/api/user/role` | Set user role |
| GET | `/api/files/[key]` | Get signed file URL |

## Deployment

### Vercel (Recommended)

1. Push to GitHub
2. Import to Vercel
3. Add environment variables
4. Deploy

### Docker

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npx prisma generate
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

## Contributing

1. Fork the repository
2. Create feature branch
3. Commit changes
4. Open pull request

## License

MIT License - feel free to use this project for personal or commercial purposes.
