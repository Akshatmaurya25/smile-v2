# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Smile** is an expense management and bill-splitting application built with React Native (frontend) and Node.js (backend) in a monorepo structure.

### Core Features
- Google OAuth authentication
- Expense tracking with categories (default + custom)
- Bill splitting between friends
- Borrowings/lending management with two-party confirmation for clearing
- Friend management via username/email
- Multi-currency support (INR default)
- In-app notifications for bill splits

## Tech Stack

### Frontend (React Native CLI)
- **React Native**: 0.83.1 (bare workflow, not Expo)
- **React**: 19.2.0
- **State Management**: Zustand with AsyncStorage persistence
- **Charts**: react-native-gifted-charts
- **Navigation**: React Navigation (native-stack + bottom-tabs)
- **HTTP Client**: Axios
- **TypeScript**: Strict mode

### Backend (/server)
- **Runtime**: Node.js with Express
- **Database**: PostgreSQL
- **ORM**: Prisma
- **Auth**: Google OAuth 2.0 + JWT
- **Validation**: Zod

## Commands

```bash
# Frontend (from root)
npm start                     # Start Metro bundler
npm run android              # Build and run on Android
npm run ios                  # Build and run on iOS
npm run lint                 # Run ESLint
npm test                     # Run Jest tests
npm test -- --watch          # Run tests in watch mode
npm test -- <path>           # Run single test file

# iOS specific (first time or after native dep changes)
bundle install               # Install CocoaPods Ruby bundler
bundle exec pod install      # Install iOS native dependencies

# Backend (from /server)
npm run dev                  # Start dev server with hot reload
npm run build               # Build TypeScript to dist/
npm start                   # Run production build
npm run migrate             # Run Prisma migrations (prisma migrate dev)
npm run generate            # Generate Prisma client
npm run seed                # Seed default categories
npm run db:studio           # Open Prisma Studio
```

## Project Structure

```
/src
  /api            # Centralized API calls (auth, users, expenses, friends, notifications)
  /components     # Reusable UI components
  /hooks          # Custom React hooks
  /navigation     # React Navigation setup (RootNavigator, AuthNavigator, MainNavigator)
  /screens        # Screen components (Login, Home, Profile, Friends, Settings, AddExpense)
  /store          # Zustand stores (authStore, expenseStore, friendStore, notificationStore)
  /styles         # Theme constants (colors, spacing, typography, shadows)
  /types          # TypeScript interfaces and types
  /utils          # Helper functions

/server
  /prisma         # Prisma schema and seed file
  /src
    /routes       # Express route handlers
    /middleware   # Auth middleware, error handler
    /services     # JWT service
```

## UI/Design Guidelines

- **Theme**: Dark mode (#0D0D0D background) with neon accents
- **Primary colors**: #00FF88 (green), #00D4FF (cyan), #FF00FF (magenta)
- **Logo**: Use `logo.svg` for app icon; white logo variant for in-app usage
- **Homepage**: Greeting → 3 metric cards (Income/Expenses/Borrowings) → Pie chart → Bar chart → Quick actions
- **Navigation**: Bottom tabs (Home, Friends, Add[center FAB], Profile, Settings)

## Data Architecture

### Frontend State Strategy
- Zustand stores cache all fetched data
- `authStore` persisted to AsyncStorage (user session survives app restart)
- 5-minute cache duration before auto-refresh
- Manual refresh via pull-to-refresh or explicit button tap

### API Pattern
- All API calls in `/src/api/*.ts` use centralized Axios client
- Auth token auto-attached via interceptor
- Token refresh handled automatically on 401
- Response format: `{ success: boolean, data: T, message?: string }`

## Key User Flows

1. **Auth**: LoginScreen → Google Sign-In → Backend verifies → JWT issued → Navigate to Home
2. **Add Friend**: Search (username/email) → Send request → Receiver accepts/rejects → Notification sent
3. **Add Expense**: Enter amount → Select category → Optional: select friends to split → Create
4. **Split Bill**: Expense created with splits → Each friend gets notification → Shows in their borrowings
5. **Clear Borrowing**: Borrower confirms payment → Lender confirms → Both confirmed = cleared

## Environment Variables

```bash
# Frontend (.env)
API_URL=http://localhost:3000/api
GOOGLE_CLIENT_ID=<web-client-id>

# Backend (/server/.env)
DATABASE_URL=postgresql://user:pass@localhost:5432/smile_db
JWT_SECRET=<random-string>
JWT_REFRESH_SECRET=<random-string>
GOOGLE_CLIENT_ID=<web-client-id>
GOOGLE_CLIENT_SECRET=<client-secret>
PORT=3000
```

## Database Schema (Key Models)

- **User**: id, email, username, displayName, profileImage, googleId, currency
- **Category**: id, name, icon, color, isDefault, userId (null for defaults)
- **Expense**: id, amount, currency, description, categoryId, paidById, date
- **ExpenseSplit**: id, expenseId, userId, amount, isPaid, confirmedByPayer, confirmedByPayee
- **Friendship**: id, userId, friendId, status (PENDING/ACCEPTED/REJECTED)
- **Notification**: id, userId, type, title, message, data, isRead
