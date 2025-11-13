# PharmaDirect Frontend

Next.js 16 frontend application for the NDC Packaging & Quantity Calculator.

## Tech Stack

- **Framework**: Next.js 16 (React 19.2)
- **Language**: TypeScript 5
- **Styling**: Tailwind CSS 4
- **UI Components**: Radix UI (50+ components)
- **Forms**: React Hook Form + Zod validation
- **Authentication**: Firebase Authentication
- **State Management**: React Context API

## Getting Started

### Prerequisites

- Node.js 18+ (LTS recommended)
- pnpm 8+
- Firebase project setup (see below)

### Installation

```bash
# Install dependencies
pnpm install

# Copy environment template
cp env.example .env.local

# Edit .env.local with your Firebase config
# See "Firebase Setup" section below
```

### Firebase Setup

1. **Get Firebase Configuration**:
   - Go to [Firebase Console](https://console.firebase.google.com/)
   - Select project: `ndcpharma-8f3c6`
   - Go to Project Settings > General
   - Scroll to "Your apps" > Web app
   - Copy the config values

2. **Update `.env.local`**:
   ```env
   NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key-here
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=ndcpharma-8f3c6.firebaseapp.com
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=ndcpharma-8f3c6
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=ndcpharma-8f3c6.firebasestorage.app
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
   NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id
   
   # Backend API URL (local development)
   NEXT_PUBLIC_API_URL=http://localhost:5001/ndcpharma-8f3c6/us-central1/api
   ```

### Development

```bash
# Start development server
pnpm dev

# Open http://localhost:3000
```

### Test Users

Use these credentials to sign in (created in PR-08):

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@ndcpharma.com | Admin123! |
| Pharmacist | pharmacist@ndcpharma.com | Pharm123! |
| Technician | tech@ndcpharma.com | Tech123! |

## Project Structure

```
frontend/
├── app/                          # Next.js App Router
│   ├── auth/                    # Authentication pages
│   │   ├── signin/              # Sign in page
│   │   └── signup/              # Sign up page
│   ├── dashboard/               # Protected dashboard
│   │   ├── layout.tsx           # Dashboard layout with header
│   │   └── page.tsx             # Calculator page
│   ├── layout.tsx               # Root layout (with AuthProvider)
│   └── page.tsx                 # Landing page
│
├── components/                   # React components
│   ├── calculator/              # Calculator-specific components
│   │   ├── calculator.tsx       # Main calculator (form + results)
│   │   ├── calculator-form.tsx  # Input form
│   │   └── calculator-results.tsx # Results display
│   ├── ui/                      # Radix UI components
│   └── [other components]       # Landing page components
│
├── lib/                         # Utilities and configurations
│   ├── firebase.ts              # Firebase initialization
│   ├── auth-context.tsx         # Authentication context provider
│   ├── auth-guard.tsx           # Protected route HOC
│   ├── api-client.ts            # Backend API client
│   └── utils.ts                 # Helper functions
│
├── types/                       # TypeScript type definitions
│   └── api.ts                   # API request/response types
│
└── env.example                  # Environment variables template
```

## Features

### Authentication
- Firebase Authentication with email/password
- Protected routes (dashboard requires sign-in)
- Automatic token management and refresh
- User session persistence

### NDC Calculator
- **Structured SIG Input**: Dose, frequency, unit (dropdown)
- **Free-text SIG Input**: Natural language (experimental, AI parsing)
- Real-time form validation with Zod
- Drug name or RxCUI input
- Days supply (1-365 days)

### Results Display
- Normalized drug information (RxCUI, name, strength, dosage form)
- Total quantity calculation
- Recommended NDC packages with:
  - Active/inactive status badges
  - Package size, unit, dosage form
  - Marketing status
- Overfill/underfill percentages with color-coded badges:
  - Green: <5% (acceptable)
  - Yellow: 5-10% (caution)
  - Red: >10% (warning)
- Warnings section (if any)
- Excluded NDCs accordion (with reasons)
- Step-by-step explanations accordion

### Error Handling
- Network error detection
- Rate limiting with retry countdown
- Authentication errors (redirects to sign-in)
- Validation errors with field-specific messages
- User-friendly error messages

## Calculator Input Fields

### Drug Input
- **Label**: "Drug Name or RxCUI"
- **Examples**: "Lisinopril", "314076"
- **Validation**: 2-200 characters

### SIG (Prescription Directions)

**Mode 1: Structured Input (Recommended)**
- **Dose**: Number (e.g., 1, 2, 0.5)
- **Frequency**: Number (times per day, e.g., 1, 2, 3)
- **Unit**: Dropdown (tablet, capsule, mL, mg, etc.)

**Mode 2: Free Text (Experimental)**
- **Input**: Natural language (e.g., "Take 1 tablet by mouth twice daily")
- **Note**: AI parsing is experimental and may not always work correctly

### Days Supply
- **Range**: 1-365 days
- **Default**: 30 days

## Backend Integration

### API Endpoint
- **URL**: `http://localhost:5001/ndcpharma-8f3c6/us-central1/api/v1/calculate` (local)
- **Method**: POST
- **Authentication**: Bearer token (Firebase ID token)
- **Headers**:
  - `Content-Type: application/json`
  - `Authorization: Bearer {firebase-id-token}`

### Request Format
```json
{
  "drug": {
    "name": "Lisinopril"  // OR "rxcui": "314076"
  },
  "sig": {
    "dose": 1,
    "frequency": 1,
    "unit": "tablet"
  },
  "daysSupply": 30
}
```

### Response Format
```json
{
  "success": true,
  "data": {
    "drug": {
      "rxcui": "314076",
      "name": "Lisinopril 10 MG Oral Tablet",
      "dosageForm": "Oral Tablet",
      "strength": "10 MG"
    },
    "totalQuantity": 30,
    "recommendedPackages": [
      {
        "ndc": "00071-0156-23",
        "packageSize": 30,
        "unit": "TABLET",
        "dosageForm": "TABLET",
        "marketingStatus": "ACTIVE",
        "isActive": true
      }
    ],
    "overfillPercentage": 0,
    "underfillPercentage": 0,
    "warnings": [],
    "excluded": [],
    "explanations": [...]
  }
}
```

## Rate Limiting

Rate limits are enforced by the backend based on user role:

| Role | Limit |
|------|-------|
| Admin | Unlimited |
| Pharmacist | 200 requests/hour |
| Pharmacy Technician | 100 requests/hour |
| Anonymous (no auth) | 10 requests/hour |

When rate limited, the UI displays:
- Error message with retry countdown
- `Retry-After` timer from backend

## Build & Deployment

```bash
# Build for production
pnpm build

# Start production server
pnpm start

# Lint code
pnpm lint
```

## Troubleshooting

### "Firebase not initialized" error
- Make sure `.env.local` has all required Firebase config values
- Restart the dev server after changing `.env.local`

### "Network error" when submitting form
- Check that backend is running: `cd apps/functions && pnpm serve`
- Verify `NEXT_PUBLIC_API_URL` in `.env.local` matches backend URL

### Authentication errors
- Clear browser cookies and local storage
- Try signing in again
- Verify test user credentials

### "Rate limit exceeded"
- Wait for the countdown timer to expire
- Sign in as an admin user for unlimited requests
- Reduce request frequency

## Contributing

1. Create a new branch: `git checkout -b feature/my-feature`
2. Make changes
3. Run linter: `pnpm lint`
4. Build to check for errors: `pnpm build`
5. Commit: `git commit -m "feat: add my feature"`
6. Push: `git push origin feature/my-feature`
7. Create a pull request

## License

Proprietary - Foundation Health

