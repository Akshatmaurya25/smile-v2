# Smile App - AI UI/UX Design Brief for Stitch

## Project Overview

**App Name:** Smile
**Platform:** Mobile Application (iOS & Android)
**Framework:** React Native
**App Type:** Personal Finance / Expense Management & Bill Splitting App

### App Description
Smile is a modern expense tracking and bill-splitting application designed for young professionals and friend groups. It helps users track their daily expenses, split bills with friends, monitor borrowings, and visualize their spending patterns through beautiful charts and analytics.

### Design Philosophy
- **Dark Theme First:** The entire app uses a dark theme to reduce eye strain and provide a premium feel
- **Neon Accents:** Vibrant neon colors for highlights, charts, and interactive elements
- **Data Visualization:** Heavy emphasis on charts and visual representations of financial data
- **Minimal & Clean:** Clutter-free interface with focus on essential information
- **Smooth Animations:** Subtle micro-interactions and transitions for delightful UX

---

## Color Palette

```
Primary Colors:
- Background:        #0D0D0D (Deep Black)
- Surface:           #1A1A1A (Dark Gray)
- Card:              #242424 (Elevated Surface)
- Border:            #333333 (Subtle Borders)

Accent Colors (Neon):
- Primary Green:     #00FF88 (Success, Income, Primary Actions)
- Cyan:              #00D4FF (Secondary, Savings, Info)
- Magenta:           #FF00FF (Tertiary, Highlights)
- Gold:              #FFD700 (Warnings, Premium)
- Red:               #FF4444 (Errors, Expenses)

Text Colors:
- Primary Text:      #FFFFFF
- Secondary Text:    #888888
- Muted Text:        #555555
- Text on Primary:   #0D0D0D (Dark text on neon backgrounds)
```

---

## Typography

- **Display/Headers:** Bold, 28-32px
- **Titles:** Semi-bold, 20-24px
- **Body:** Regular, 14-16px
- **Caption:** Regular, 10-12px
- **Font Family:** System default (San Francisco for iOS, Roboto for Android)

---

## Screen Designs Required

---

### 1. Splash Screen

**Purpose:** Brand introduction while app loads

**Visual Elements:**
- Centered Smile logo (smiley face icon)
- App name "Smile" below logo
- Subtle neon glow animation around logo
- Dark background (#0D0D0D)

**Animation:**
- Logo fades in with scale animation
- Neon glow pulses gently
- Transitions to Login/Home screen

---

### 2. Login Screen

**Purpose:** User authentication via Google Sign-In

**Visual Elements:**
- Large Smile logo at top (with dark background container, rounded corners)
- App name "Smile" in bold white text
- Tagline: "Smart expense sharing made simple"
- Feature preview section with 3 items:
  - 💰 "Track expenses"
  - 👥 "Split bills"
  - 📊 "Visualize spending"
- Google Sign-In button (white background, Google icon, "Continue with Google" text)
- Terms & Privacy disclaimer at bottom

**Layout:**
```
┌─────────────────────────────┐
│                             │
│         [LOGO]              │
│         Smile               │
│   Smart expense sharing     │
│       made simple           │
│                             │
│   💰        👥        📊    │
│  Track    Split    Visualize│
│                             │
│  ┌─────────────────────┐    │
│  │ G  Continue with    │    │
│  │    Google           │    │
│  └─────────────────────┘    │
│                             │
│  By continuing, you agree   │
│  to our Terms & Privacy     │
└─────────────────────────────┘
```

**Interactions:**
- Google button has press state with slight scale down
- Loading spinner appears during authentication

---

### 3. Home Screen (Dashboard)

**Purpose:** Main dashboard showing financial overview, charts, and recent transactions

**Data Displayed:**

```typescript
// User Data
user: {
  displayName: string;      // "John Doe"
  profileImage: string;     // URL to profile picture
  email: string;
}

// Stats Data
stats: {
  totalIncome: number;      // 50000
  totalExpenses: number;    // 32500
  expensesByCategory: [
    { categoryName: "Food & Dining", total: 8500, percentage: 26, color: "#FF6B6B", icon: "🍕" },
    { categoryName: "Transportation", total: 5200, percentage: 16, color: "#4ECDC4", icon: "🚗" },
    { categoryName: "Shopping", total: 7800, percentage: 24, color: "#FF00FF", icon: "🛍️" },
    { categoryName: "Entertainment", total: 4500, percentage: 14, color: "#00D4FF", icon: "🎬" },
    { categoryName: "Bills", total: 6500, percentage: 20, color: "#FFD700", icon: "💡" }
  ],
  monthlyExpenses: [
    { month: "2024-01", total: 28000 },
    { month: "2024-02", total: 31000 },
    { month: "2024-03", total: 29500 },
    { month: "2024-04", total: 32500 }
  ]
}

// Settings Data
monthlyIncome: number;      // User-set income: 50000
statsPeriod: string;        // "monthly" | "weekly" | "daily" | "quarterly" | "yearly"

// Recent Transactions
expenses: [
  {
    id: string,
    amount: 450,
    description: "Dinner at Restaurant",
    category: { name: "Food & Dining", icon: "🍕", color: "#FF6B6B" },
    createdAt: "2024-04-15T19:30:00Z"
  },
  // ... more expenses
]
```

**Visual Elements:**

**A. Header Section**
- Greeting text: "Good morning," (dynamic based on time)
- User name in bold
- Profile picture (circular, 44px) on right side
- If no profile picture, show initial in neon green circle

**B. Stats Cards Row (3 cards, horizontal scroll on small screens)**
- **Income Card:** Green left border, shows monthly income, "Set in settings" subtext
- **Expenses Card:** Red left border, shows total expenses, "This monthly" subtext
- **Savings Card:** Cyan left border, shows (Income - Expenses), "Remaining" subtext

**C. Expense Breakdown Chart (Donut/Pie Chart)**
- Card with title "Expense Breakdown" and subtitle "This month by category"
- Donut chart with:
  - Hole in center showing total amount
  - 5 colored segments for top categories
  - Neon colors for each segment
- Legend on the right side with colored dots and category names

**D. Monthly Trend Chart (Bar Chart)**
- Card with title "Monthly Trend" and subtitle "Your spending over time"
- Vertical bar chart showing 4-6 months
- Bars in neon green color
- X-axis: Month labels
- Subtle glow effect on bars

**E. Quick Actions Row (3 buttons)**
- "Add Expense" with ➕ icon
- "Split Bill" with 👥 icon
- "View Reports" with 📈 icon
- Dark surface background with border

**F. Recent Transactions List**
- Card with title "Recent Transactions" and subtitle "All your expenses"
- Each transaction item shows:
  - Category icon in colored circle (left)
  - Description and category name (middle)
  - Amount in red with minus sign (right)
  - Date below amount (Today/Yesterday/Date)

**Layout:**
```
┌─────────────────────────────┐
│ Good morning,          [👤] │
│ John Doe                    │
├─────────────────────────────┤
│ ┌───────┐┌───────┐┌───────┐ │
│ │Income ││Expense││Savings│ │
│ │₹50,000││₹32,500││₹17,500│ │
│ │Set in ││This   ││Remain-│ │
│ │setting││monthly││ing    │ │
│ └───────┘└───────┘└───────┘ │
├─────────────────────────────┤
│ Expense Breakdown           │
│ This month by category      │
│  ┌─────────┐  • Food    26% │
│  │  DONUT  │  • Transport16%│
│  │ ₹32,500 │  • Shopping24% │
│  │  Total  │  • Fun     14% │
│  └─────────┘  • Bills   20% │
├─────────────────────────────┤
│ Monthly Trend               │
│ Your spending over time     │
│   ▓▓▓                       │
│   ▓▓▓  ▓▓▓                  │
│   ▓▓▓  ▓▓▓  ▓▓▓  ▓▓▓       │
│   Jan  Feb  Mar  Apr        │
├─────────────────────────────┤
│ [➕ Add] [👥 Split] [📈 View]│
├─────────────────────────────┤
│ Recent Transactions         │
│ All your expenses           │
│ ┌─────────────────────────┐ │
│ │🍕 Dinner at Restaurant  │ │
│ │   Food & Dining    -₹450│ │
│ │                   Today │ │
│ ├─────────────────────────┤ │
│ │🚗 Uber to Office        │ │
│ │   Transportation   -₹180│ │
│ │               Yesterday │ │
│ └─────────────────────────┘ │
└─────────────────────────────┘
```

**Interactions:**
- Pull-to-refresh to reload data
- Tap on profile picture navigates to Profile
- Tap on transaction opens detail view
- Quick action buttons navigate to respective screens
- Charts should have subtle animation on load

---

### 4. Add Expense Screen

**Purpose:** Add new expense with optional bill splitting

**Data Input:**

```typescript
// Form Data
expenseInput: {
  amount: number;           // Required: 450
  description: string;      // Optional: "Dinner at Restaurant"
  categoryId: string;       // Required: selected category
  splits: [                 // Optional: split with friends
    { userId: string, amount: number }
  ]
}

// Available Data
categories: [
  { id: "1", name: "Food & Dining", icon: "🍕", color: "#FF6B6B" },
  { id: "2", name: "Transportation", icon: "🚗", color: "#4ECDC4" },
  { id: "3", name: "Shopping", icon: "🛍️", color: "#FF00FF" },
  { id: "4", name: "Entertainment", icon: "🎬", color: "#00D4FF" },
  { id: "5", name: "Bills & Utilities", icon: "💡", color: "#FFD700" },
  { id: "6", name: "Health", icon: "🏥", color: "#00FF88" },
  { id: "7", name: "Travel", icon: "✈️", color: "#9B59B6" },
  { id: "8", name: "Groceries", icon: "🛒", color: "#2ECC71" },
  { id: "9", name: "Other", icon: "📦", color: "#888888" }
]

friends: [
  { id: "1", user: { displayName: "Jane Smith", email: "jane@email.com" } },
  { id: "2", user: { displayName: "Bob Wilson", email: "bob@email.com" } }
]
```

**Visual Elements:**

**A. Header**
- Back button (left)
- Title: "Add Expense"
- Dark background

**B. Amount Input (Hero Section)**
- Large currency symbol (₹) in neon green
- Huge input field for amount (48-64px font)
- Auto-focus on amount field
- Numeric keyboard

**C. Description Input**
- Label: "Description (optional)"
- Text input with placeholder "What was this expense for?"
- Dark card background

**D. Category Picker**
- Label: "Category"
- Touchable selector showing selected category or "Select a category"
- Opens bottom sheet modal with category grid
- Categories in 3-column grid with icon and name
- Selected category has neon green border

**E. Split with Friends**
- Label: "Split with friends"
- Touchable selector showing "Add friends to split" or "Split with X friends"
- Opens bottom sheet modal with:
  - Toggle: "Equal Split" / "Custom"
  - Friend list with checkboxes
  - Custom amount input per friend (if custom mode)
- Split summary below selector showing each friend's share

**F. Submit Button**
- Full-width button at bottom
- Neon green background
- Text: "Add Expense"
- Loading state with spinner

**Layout:**
```
┌─────────────────────────────┐
│ ← Add Expense               │
├─────────────────────────────┤
│                             │
│         ₹ 450               │
│      (large input)          │
│                             │
├─────────────────────────────┤
│ Description (optional)      │
│ ┌─────────────────────────┐ │
│ │ Dinner at Restaurant    │ │
│ └─────────────────────────┘ │
├─────────────────────────────┤
│ Category                    │
│ ┌─────────────────────────┐ │
│ │ 🍕 Food & Dining      › │ │
│ └─────────────────────────┘ │
├─────────────────────────────┤
│ Split with friends          │
│ ┌─────────────────────────┐ │
│ │ Split with 2 friends  › │ │
│ └─────────────────────────┘ │
│ ┌─────────────────────────┐ │
│ │ Jane Smith      ₹150.00 │ │
│ │ Bob Wilson      ₹150.00 │ │
│ └─────────────────────────┘ │
├─────────────────────────────┤
│ ┌─────────────────────────┐ │
│ │      Add Expense        │ │
│ └─────────────────────────┘ │
└─────────────────────────────┘
```

**Toast Notification:**
- Success: Green toast at top "Expense added successfully!"
- Error: Red toast at top with error message
- Auto-dismiss after 2.5 seconds

---

### 5. Friends Screen

**Purpose:** Manage friends, view pending requests, see borrowings

**Data Displayed:**

```typescript
friends: [
  {
    id: string,
    user: {
      id: string,
      displayName: "Jane Smith",
      email: "jane@email.com",
      profileImage: string | null
    },
    status: "accepted"
  }
]

pendingRequests: [
  {
    id: string,
    user: { displayName: "New Person", email: "new@email.com" },
    status: "pending"
  }
]

borrowings: [
  {
    odId: string,
    odUser: { displayName: "Jane Smith" },
    amount: 500,
    type: "owe",        // "owe" = you owe them, "owed" = they owe you
    isPaid: false,
    expense: { description: "Dinner split" }
  }
]
```

**Visual Elements:**

**A. Header**
- Title: "Friends"
- Add friend button (+ icon) on right

**B. Tabs/Segments**
- "Friends" tab (default)
- "Requests" tab (with badge count if pending)
- "Borrowings" tab

**C. Friends Tab Content**
- Search bar to filter friends
- List of friends with:
  - Profile picture or initial avatar
  - Display name
  - Email below name
  - Options menu (three dots)

**D. Requests Tab Content**
- Incoming requests with Accept/Decline buttons
- Outgoing requests with "Pending" status

**E. Borrowings Tab Content**
- Summary cards at top:
  - "You Owe" total (in red)
  - "Owed to You" total (in green)
- List of individual borrowings:
  - Person name and avatar
  - Amount (red if you owe, green if owed)
  - Related expense description
  - "Mark as Paid" button

**F. Add Friend Modal**
- Search input for email/username
- Search results list
- "Send Request" button

**Layout:**
```
┌─────────────────────────────┐
│ Friends                 [+] │
├─────────────────────────────┤
│ [Friends] [Requests•2] [₹]  │
├─────────────────────────────┤
│ 🔍 Search friends...        │
├─────────────────────────────┤
│ ┌─────────────────────────┐ │
│ │ [👤] Jane Smith         │ │
│ │      jane@email.com   ⋮ │ │
│ ├─────────────────────────┤ │
│ │ [👤] Bob Wilson         │ │
│ │      bob@email.com    ⋮ │ │
│ └─────────────────────────┘ │
│                             │
│ --- Borrowings Tab ---      │
│ ┌───────────┐┌────────────┐ │
│ │ You Owe   ││ Owed to You│ │
│ │  ₹1,500   ││   ₹800     │ │
│ │   (red)   ││  (green)   │ │
│ └───────────┘└────────────┘ │
│ ┌─────────────────────────┐ │
│ │ Jane Smith              │ │
│ │ Dinner split    -₹500   │ │
│ │         [Mark as Paid]  │ │
│ └─────────────────────────┘ │
└─────────────────────────────┘
```

---

### 6. Profile Screen

**Purpose:** View and edit user profile, manage account

**Data Displayed:**

```typescript
user: {
  id: string,
  email: "john@email.com",
  username: "johndoe",
  displayName: "John Doe",
  profileImage: string | null,
  currency: "INR",          // "INR" | "USD" | "EUR" | "GBP"
  createdAt: string
}

customCategories: [
  { id: string, name: "Custom Category", icon: "🎯", color: "#FF00FF" }
]

currencies: [
  { code: "INR", symbol: "₹", name: "Indian Rupee" },
  { code: "USD", symbol: "$", name: "US Dollar" },
  { code: "EUR", symbol: "€", name: "Euro" },
  { code: "GBP", symbol: "£", name: "British Pound" }
]
```

**Visual Elements:**

**A. Profile Header**
- Large profile picture (100px) with camera edit badge
- Email below picture
- Neon green border around avatar

**B. Profile Information Section**
- Card with "Profile Information" title
- Edit button on header
- Fields:
  - Username (editable in edit mode)
  - Display Name (editable)
  - Default Currency (selector with currency options)
- Save button (appears in edit mode)

**C. My Categories Section**
- Card with "My Categories" title
- Add button (+ Add)
- List of custom categories with icon and name
- Empty state: "No custom categories yet"

**D. Account Section**
- Logout button (red text) with door icon

**Layout:**
```
┌─────────────────────────────┐
│         [Profile Pic]       │
│           📷 edit           │
│       john@email.com        │
├─────────────────────────────┤
│ Profile Information   [Edit]│
│ ┌─────────────────────────┐ │
│ │ Username               │ │
│ │ johndoe                │ │
│ ├─────────────────────────┤ │
│ │ Display Name           │ │
│ │ John Doe               │ │
│ ├─────────────────────────┤ │
│ │ Default Currency       │ │
│ │ ₹ INR  $ USD  € EUR    │ │
│ └─────────────────────────┘ │
├─────────────────────────────┤
│ My Categories        [+ Add]│
│ ┌─────────────────────────┐ │
│ │ No custom categories   │ │
│ │ yet                    │ │
│ └─────────────────────────┘ │
├─────────────────────────────┤
│ Account                     │
│ ┌─────────────────────────┐ │
│ │ 🚪 Logout              │ │
│ └─────────────────────────┘ │
└─────────────────────────────┘
```

---

### 7. Settings Screen

**Purpose:** App preferences and configuration

**Data Displayed:**

```typescript
settings: {
  monthlyIncome: number,        // 50000
  statsPeriod: string,          // "daily" | "weekly" | "monthly" | "quarterly" | "yearly"
  notificationsEnabled: boolean,
  darkMode: boolean             // Always true for now
}
```

**Visual Elements:**

**A. Header**
- Title: "Settings"

**B. Budget & Stats Section**
- **Monthly Income:**
  - Icon: 💰
  - Label: "Monthly Income"
  - Subtext: "Set your expected income"
  - Current value on right (₹50,000 or "Not set")
  - Opens modal with large number input

- **Stats Period:**
  - Icon: 📊
  - Label: "Stats Period"
  - Subtext: "View stats by period"
  - Current selection on right
  - Opens modal with options:
    - Daily
    - Weekly
    - Monthly (default)
    - Quarterly
    - Yearly

**C. Preferences Section**
- **Notifications:**
  - Icon: 🔔
  - Toggle switch (neon green when on)

- **Dark Mode:**
  - Icon: 🌙
  - Toggle switch (always on, disabled)

**D. About Section**
- Terms of Service (link)
- Privacy Policy (link)
- App Version: 1.0.0

**E. Support Section**
- Help & FAQ
- Contact Support (opens email)

**F. Footer**
- "Made with love by Smile Team"

**Layout:**
```
┌─────────────────────────────┐
│ Settings                    │
├─────────────────────────────┤
│ BUDGET & STATS              │
│ ┌─────────────────────────┐ │
│ │ 💰 Monthly Income       │ │
│ │    Set your expected    │ │
│ │    income      ₹50,000 ›│ │
│ ├─────────────────────────┤ │
│ │ 📊 Stats Period         │ │
│ │    View stats by        │ │
│ │    period      Monthly ›│ │
│ └─────────────────────────┘ │
├─────────────────────────────┤
│ PREFERENCES                 │
│ ┌─────────────────────────┐ │
│ │ 🔔 Notifications    [•] │ │
│ ├─────────────────────────┤ │
│ │ 🌙 Dark Mode        [•] │ │
│ └─────────────────────────┘ │
├─────────────────────────────┤
│ ABOUT                       │
│ ┌─────────────────────────┐ │
│ │ 📄 Terms of Service   › │ │
│ │ 🔒 Privacy Policy     › │ │
│ │ ℹ️  App Version    1.0.0 │ │
│ └─────────────────────────┘ │
├─────────────────────────────┤
│   Made with love by Smile   │
└─────────────────────────────┘
```

**Modals:**

**Income Input Modal:**
```
┌─────────────────────────────┐
│ Monthly Income          ✕   │
├─────────────────────────────┤
│ Set your expected monthly   │
│ income to track savings     │
│                             │
│         ₹ 50000             │
│      (large input)          │
│                             │
│ ┌─────────────────────────┐ │
│ │         Save            │ │
│ └─────────────────────────┘ │
└─────────────────────────────┘
```

**Stats Period Modal:**
```
┌─────────────────────────────┐
│ Stats Period            ✕   │
├─────────────────────────────┤
│   Daily                     │
│   Weekly                    │
│ ✓ Monthly            (green)│
│   Quarterly                 │
│   Yearly                    │
└─────────────────────────────┘
```

---

### 8. Bottom Navigation Bar

**Purpose:** Primary navigation between main screens

**Tabs:**
1. 🏠 Home
2. 👥 Friends
3. ➕ (Floating Add Button - Neon Green)
4. 👤 Profile
5. ⚙️ Settings

**Visual Elements:**
- Dark surface background (#1A1A1A)
- Icons: 20px, muted when inactive
- Labels: 9px below icons
- Active state: Full opacity icon, neon green label
- Center FAB: 50px circular button, neon green, elevated with shadow
- FAB has glow effect

**Layout:**
```
┌─────────────────────────────────────┐
│  🏠      👥      [+]      👤      ⚙️ │
│ Home  Friends   ADD   Profile  Settings │
└─────────────────────────────────────┘
```

---

## Additional UI Components

### Toast Notifications
- Position: Top of screen, below status bar
- Success: Neon green background with dark text
- Error: Red background with white text
- Info: Cyan background with dark text
- Auto-dismiss after 2.5 seconds
- Slide-in animation from top

### Loading States
- Skeleton screens for data loading
- Pull-to-refresh with neon green spinner
- Button loading: Spinner replaces text

### Empty States
- Friendly illustrations (optional)
- Clear message explaining the empty state
- CTA button to add first item

### Modals/Bottom Sheets
- Slide up from bottom
- Dark surface background
- Rounded top corners (20px radius)
- Dark overlay behind (80% black)
- Close button (✕) on top right

---

## Animation Guidelines

1. **Screen Transitions:** Slide horizontally for navigation, slide up for modals
2. **Charts:** Animate on first load (bars grow, pie segments expand)
3. **Buttons:** Scale down slightly on press (0.95x)
4. **Toast:** Slide down from top with spring animation
5. **FAB:** Subtle pulse/glow animation when idle
6. **Cards:** Subtle shadow increase on press

---

## Accessibility Considerations

- Minimum touch target: 44x44px
- Sufficient color contrast for text
- Clear focus states for inputs
- Screen reader labels for icons
- Haptic feedback on important actions

---

## Design Deliverables Needed

1. **Splash Screen** - Logo animation concept
2. **Login Screen** - Full design with states
3. **Home Screen** - Dashboard with all components
4. **Add Expense Screen** - Form with modals
5. **Friends Screen** - All 3 tabs
6. **Profile Screen** - View and edit modes
7. **Settings Screen** - With modals
8. **Bottom Navigation** - All states
9. **Component Library:**
   - Buttons (primary, secondary, ghost)
   - Input fields
   - Cards
   - Modals
   - Toast notifications
   - Charts (pie, bar)
   - List items
   - Avatars
   - Badges
   - Toggle switches

---

## Reference Style

- Modern fintech apps (Cred, Jupiter, Fi)
- Dark theme with neon accents
- Clean typography with ample whitespace
- Glassmorphism for cards (subtle)
- Smooth micro-interactions
- Data-driven visualizations

---

*This is a React Native mobile application targeting iOS and Android platforms. All designs should be optimized for mobile viewports (375px - 428px width) with consideration for both platforms' design guidelines while maintaining a consistent custom dark theme.*
