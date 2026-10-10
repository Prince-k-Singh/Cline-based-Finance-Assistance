# PaisaSaathi 💰

**Your Household Money Coach** - A financial planning web application for Indian households.

## Features

- 📊 **Dashboard** - Income, expenses, surplus overview
- 💸 **Transactions** - Track and categorize spending
- 📁 **Budgets** - Category-wise budget limits
- 🎯 **Goals** - Savings goals with progress tracking
- 🔮 **EMI Simulator** - Calculate loan payments
- 🤖 **AI Assistant** - Cline SDK powered queries

## Quick Start

```bash
npm install
cp .env.example .env
# Add your CLINE_API_KEY
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Tech Stack

- Next.js 16, React 19, TypeScript
- Tailwind CSS 4
- SQLite + Drizzle ORM
- Cline SDK

## Cline SDK Tools

1. `get_budget_summary` - Monthly finances
2. `get_category_spending` - Category breakdown
3. `calculate_emi` - EMI calculation
4. `get_goals_progress` - Goal tracking

## Privacy

- No bank passwords or UPI PINs required
- Demo data clearly labeled
- Local SQLite storage

## License

MIT
