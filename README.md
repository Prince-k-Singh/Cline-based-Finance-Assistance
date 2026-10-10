# Prospera

**AI-Powered Financial Planning Assistant for Indian Middle-Class Families**

Prospera is a comprehensive personal finance management tool designed specifically for Indian households. It combines a deterministic financial calculation engine with AI-powered advisory capabilities using the Cline SDK, delivering transparent, accurate, and culturally relevant financial guidance.

---

## Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [Technology Stack](#technology-stack)
- [System Requirements](#system-requirements)
- [Installation](#installation)
- [Configuration](#configuration)
- [Usage](#usage)
- [Architecture](#architecture)
- [API Reference](#api-reference)
- [Engine Modules](#engine-modules)
- [AI Integration](#ai-integration)
- [Supported Languages](#supported-languages)
- [Project Structure](#project-structure)
- [Development](#development)
- [Testing](#testing)
- [Deployment](#deployment)
- [Security Considerations](#security-considerations)
- [Disclaimer](#disclaimer)
- [License](#license)
- [Contributing](#contributing)

---

## Overview

Prospera addresses the unique financial planning needs of Indian middle-class families by providing:

- India-specific expense categories and benchmarks across metro, large, and small cities
- Support for joint family structures with multiple earners, children, and dependent parents
- Integration with Indian financial instruments (FDs, PPF, EPF, NPS, gold, mutual funds)
- Tax slab awareness for accurate post-tax return calculations
- Multi-language support including Hindi, Bengali, Tamil, Telugu, Marathi, Gujarati, Kannada, and Assamese

The core design principle ensures that **all numerical calculations are deterministic and transparent**. The AI assistant never fabricates figures; every rupee amount originates from the TypeScript calculation engine.

---

## Key Features

### Financial Planning Modules

| Module | Description | Key Outputs |
|--------|-------------|-------------|
| Budget Analysis | Categorizes expenses across 18 categories with three spending tiers | Today vs Optimised vs Bare-minimum budgets, EMI ratio, wants cap |
| Emergency Fund | Dynamic fund sizing based on household risk factors | 3-12 months coverage, target amount, gap analysis, insurance checks |
| Lifestyle Planning | Goal-based savings with inflation-adjusted targets | Future costs, recommended vehicles, affordability timelines |
| Portfolio Management | Age and risk-adjusted asset allocation | Current vs suggested mix, rebalancing moves, projections |
| Financial Health Score | Holistic assessment across multiple dimensions | 0-100 score with component breakdown |

### Expense Categories

| Category | Type | Description |
|----------|------|-------------|
| Housing | Need | Rent or home EMI payments |
| Food | Need | Groceries and household food |
| Utilities | Need | Electricity, water, gas, maintenance |
| Transport | Need | Daily commute and vehicle expenses |
| Education | Fixed | School and college fees |
| Healthcare | Fixed | Medical expenses and medicines |
| Insurance | Fixed | Premium payments |
| EMIs | Fixed | Loan repayments excluding housing |
| Phone and Internet | Need | Communication expenses |
| Clothing and Household | Need | Essential purchases |
| Domestic Help | Need | Household staff and childcare |
| Eating Out | Want | Restaurant and food delivery |
| Entertainment | Want | Movies, events, hobbies |
| Shopping | Want | Non-essential purchases |
| Subscriptions | Want | OTT and digital services |
| Travel | Want | Vacations and holidays |
| Festivals | Want | Celebrations and gifts |
| Miscellaneous | Want | Other discretionary spending |

### Asset Classes Supported

| Asset Type | Expected Return | Tax Treatment | Liquidity | Risk Level |
|------------|-----------------|---------------|-----------|------------|

### Live Market Insights

The application fetches real-time market data without requiring API keys:

| Data Source | Information | Update Frequency |
|-------------|-------------|------------------|
| Yahoo Finance | Nifty 50 index levels and returns | 6 hours |
| Yahoo Finance | Gold prices (MCX) | 6 hours |
| Yahoo Finance | USD/INR exchange rate | 6 hours |
| World Bank API | India CPI inflation data | 6 hours |

Market analysis includes:

- EWMA volatility calculations
- Drawdown measurements from 52-week highs
- Log-linear trend analysis with R-squared values
- 200-day moving average z-scores
- Market regime classification (normal, stretched, correction)

### Predictive Analytics

- Spending pattern analysis using historical data
- Median-based baseline with robust z-score anomaly detection
- Mid-month spending forecasts
- Category-specific trend identification
- Early warning alerts for potential budget overruns

### Statement Import

- Paste bank or credit card statements directly
- Rule-based transaction categorization
- AI-assisted categorization for unrecognized merchants
- Multi-month statement support
- Automatic expense mapping to budget categories

### Monthly Check-ins

- Track actual vs planned spending
- Category drift analysis
- Personalized AI-generated insights
- Historical trend visualization
- Scheduled monthly reminders

---

## Technology Stack

### Frontend

| Technology | Version | Purpose | Documentation |
|------------|---------|---------|---------------|
| [React](https://react.dev/) | 19.3.0 | UI framework | https://react.dev/reference/react |
| [Vite](https://vitejs.dev/) | 8.3.4 | Build tool and dev server | https://vitejs.dev/guide/ |
| [Recharts](https://recharts.org/) | 3.10.1 | Chart visualizations | https://recharts.org/en-US/api |
| [TypeScript](https://www.typescriptlang.org/) | 7.0.2 | Type-safe JavaScript | https://www.typescriptlang.org/docs/ |

### Backend

| Technology | Version | Purpose | Documentation |
|------------|---------|---------|---------------|
| [Node.js](https://nodejs.org/) | 22+ | Runtime environment | https://nodejs.org/docs/latest-v22.x/api/ |
| [Express](https://expressjs.com/) | 5.3.0 | HTTP server framework | https://expressjs.com/en/5x/api.html |
| [Zod](https://zod.dev/) | 4.6.5 | Schema validation | https://zod.dev/ |
| [tsx](https://tsx.is/) | 4.23.15 | TypeScript execution | https://tsx.is/ |

### AI and Machine Learning

| Technology | Version | Purpose | Documentation |
|------------|---------|---------|---------------|
| [Cline SDK](https://www.npmjs.com/package/@cline/sdk) | 0.0.92 | AI agent framework | https://github.com/cline/cline |

### Development Tools

| Tool | Version | Purpose |
|------|---------|---------|
| [Vitest](https://vitest.dev/) | 5.0.3 | Unit testing framework |
| [Playwright](https://playwright.dev/) | 1.64.0 | End-to-end testing |
| [Concurrently](https://www.npmjs.com/package/concurrently) | 10.0.6 | Parallel script execution |

---

## System Requirements

| Requirement | Minimum | Recommended |
|-------------|---------|-------------|
| Node.js | 22.0.0 | Latest LTS |
| RAM | 2 GB | 4 GB |
| Storage | 500 MB | 1 GB |
| Browser | Chrome 90+ / Firefox 90+ / Safari 14+ / Edge 90+ | Latest versions |

---

## Installation

### Clone the Repository

```bash
git clone https://github.com/Prince-k-Singh/Cline-based-Finance-Assistance.git
cd Cline-based-Finance-Assistance
```

### Install Dependencies

```bash
npm install
```

### Environment Setup

```bash
cp .env.example .env
```

Edit the `.env` file to add your API keys for AI features (optional).

---

## Configuration

### Environment Variables

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| CLINE_PROVIDER | No | AI provider identifier | anthropic, openai, gemini, openrouter |
| CLINE_MODEL | No | Model identifier | claude-sonnet-4-20250514, gpt-4o |
| ANTHROPIC_API_KEY | No | Anthropic API key | sk-ant-... |
| OPENAI_API_KEY | No | OpenAI API key | sk-... |
| GEMINI_API_KEY | No | Google Gemini API key | AI... |
| OPENROUTER_API_KEY | No | OpenRouter API key | sk-or-... |
| CLINE_API_KEY | No | Generic Cline API key | Varies by provider |
| PORT | No | Server port (default: 8787) | 8787 |

### Supported AI Providers

| Provider | Models | Documentation |
|----------|--------|---------------|
| Anthropic | Claude 3.5 Sonnet, Claude 3 Opus | https://docs.anthropic.com/ |
| OpenAI | GPT-4o, GPT-4 Turbo | https://platform.openai.com/docs |
| Google | Gemini Pro, Gemini Ultra | https://ai.google.dev/docs |
| OpenRouter | Multiple providers | https://openrouter.ai/docs |


| Cash / Savings Account | 3% | Income Slab | High | Very Low |
| Fixed Deposits | 6.6% | Income Slab | Medium | Low |
| Debt / Arbitrage Funds | 7% | Income Slab | High | Low |
| Gold / Gold ETF | 8% | LTCG | Medium | Medium |
| Investment Property | 7% | LTCG | Low | Medium |
| Equity Index Funds | 11% | LTCG | High | High |
| Direct Stocks | 10% | LTCG | High | Very High |
| EPF / PPF / NPS | 8% | Exempt | Locked | Low |
| Endowment Policies | 5% | Exempt | Locked | Low |


---

## Usage

### Development Mode

Run both frontend and backend with hot reloading:

```bash
npm run dev
```

This starts:
- Web interface at http://localhost:5173
- API server at http://localhost:8787

### Individual Services

```bash
# Frontend only
npm run dev:web

# Backend only
npm run dev:api
```

### Production Build

```bash
# Build the application
npm run build

# Start production server
npm start
```

The production server serves both the API and the built frontend on port 8787.

### Running Tests

```bash
# Run all tests
npm test

# Type checking
npm run typecheck

# Agent smoke test
npm run smoke
```

### MCP Server Mode

Expose finance tools via Model Context Protocol:

```bash
npm run mcp
```

Add to Cline configuration:

```json
{
  "prospera": {
    "command": "npx",
    "args": ["tsx", "server/mcp.ts"],
    "cwd": "<path-to>/Cline-based-Finance-Assistance"
  }
}
```

---

## Architecture

### System Overview

```
+------------------+     +------------------+     +------------------+
|                  |     |                  |     |                  |
|   React UI       |<--->|   Express API    |<--->|   Cline SDK      |
|   (Browser)      |     |   (Node.js)      |     |   (AI Agent)     |
|                  |     |                  |     |                  |
+--------+---------+     +--------+---------+     +------------------+
         |                        |
         |                        v
         |               +------------------+
         |               |                  |
         +-------------->|  Finance Engine  |
                         |  (Pure TS)       |
                         |                  |
                         +------------------+
```

### Data Flow

```
User Input --> Validation (Zod) --> Engine Calculation --> Plan Generation
                                           |
                                           v
                                    AI Tool Calls <-- Ask Prospera Chat
                                           |
                                           v
                                    Formatted Response
```

### Key Design Principles

| Principle | Implementation |
|-----------|----------------|
| Deterministic Calculations | All financial math in pure TypeScript functions |
| Transparent Assumptions | Every rate and benchmark in assumptions.ts |
| AI Grounding | Agent can only use tool results, never invents numbers |
| Offline Capability | Core calculations work without AI or internet |
| Privacy First | No personal data leaves the browser without explicit action |

---

## API Reference

### Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | /api/health | Server status and AI availability | No |
| POST | /api/plan | Generate complete financial plan | No |
| POST | /api/chat | Ask Prospera AI assistant | No |
| POST | /api/statement | Import and categorize statements | No |
| POST | /api/checkin | Monthly spending check-in | No |
| GET | /api/checkins | List all check-ins | No |
| POST | /api/market | Live market analysis | No |
| GET | /api/news | Financial news feed | No |
| POST | /api/market/briefing | AI market briefing | No |
| GET | /api/history | Spending history | No |
| POST | /api/history | Save monthly spending | No |
| DELETE | /api/history | Clear spending history | No |
| POST | /api/forecast | Mid-month spending forecast | No |

### Request Example: Generate Plan

```bash
POST /api/plan
Content-Type: application/json

{
  "household": {
    "age": 35,
    "cityTier": "metro",
    "earners": 2,
    "jobType": "private",
    "adults": 2,
    "children": 1,
    "dependentParents": 0,
    "netMonthlyIncome": 200000,
    "annualBonus": 300000,
    "monthlyInvesting": 40000,
    "riskAppetite": "medium",
    "hasHealthInsurance": true,
    "healthCover": 1000000,
    "termCover": 10000000,
    "taxSlabPct": 30,
    "expenses": { ... },
    "holdings": { ... },
    "goals": [ ... ],
    "loans": [ ... ]
  }
}
```

### Request Example: Ask Prospera

```bash
POST /api/chat
Content-Type: application/json

{
  "household": { ... },
  "question": "Can we afford a car worth 12 lakhs?",
  "history": [],
  "language": "Hindi"
}
```



---

## Engine Modules

### Core Calculation Modules

| Module | File | Primary Functions |
|--------|------|-------------------|
| Budget | budget.ts | computeBudget(), householdUnits() |
| Emergency | emergency.ts | computeEmergency(), emergencyMonths() |
| Lifestyle | lifestyle.ts | computeLifestyle(), planGoal(), vehicleAffordability() |
| Portfolio | portfolio.ts | computePortfolio(), postTaxReturn(), realReturn() |
| Plan | plan.ts | buildPlan() |
| Score | score.ts | Financial health scoring |
| Statement | statement.ts | parseStatement(), categoriseDescription() |
| Check-in | checkin.ts | compareMonth() |
| Market | market.ts | Market data processing |
| Anomaly | anomaly.ts | Spending anomaly detection |

### Assumptions Module

All configurable parameters are centralized in assumptions.ts:

| Category | Parameters |
|----------|------------|
| Inflation | Base rate, goal-specific inflation |
| Assets | Pre-tax returns, tax treatment, worst-year scenarios |
| Benchmarks | City-tier specific spending floors |
| Insurance | Term cover multiples, health cover recommendations |
| Goals | Investment vehicles by time horizon |
| Vehicle | Down payment ratios, loan terms, affordability limits |

---

## AI Integration

### Cline SDK Tools

| Tool Name | Purpose | Input Parameters |
|-----------|---------|------------------|
| get_plan | Retrieve current financial plan | None |
| recompute_budget | What-if budget analysis | Modified income/expenses |
| emergency_fund_target | Emergency fund calculations | Custom months/changes |
| goal_planner | Plan for specific goals | Goal name, cost, timeline |
| vehicle_affordability | Vehicle purchase analysis | Vehicle price |
| portfolio_compare | Investment allocation analysis | None |
| prepay_vs_invest | Loan prepayment decision | Loan details, lump sum |
| get_assumptions | View calculation assumptions | None |
| market_impact | Live market analysis | None |
| spending_forecast | Mid-month predictions | Partial month spending |

### Agent Behavior

The AI assistant operates under strict guidelines:

1. Never invents numerical values
2. Always cites source tool for any figure
3. States underlying assumptions
4. Avoids naming specific securities or insurers
5. Includes risk disclosures with return mentions
6. Responds in user's language and script
7. Maintains concise responses (under 150 words)

---

## Supported Languages

| Language | Script | Voice Input |
|----------|--------|-------------|
| English | Latin | Supported |
| Hindi | Devanagari | Supported |
| Bengali | Bengali | Supported |
| Assamese | Bengali | Supported |
| Tamil | Tamil | Supported |
| Telugu | Telugu | Supported |
| Marathi | Devanagari | Supported |
| Gujarati | Gujarati | Supported |
| Kannada | Kannada | Supported |

Voice input uses the browser's Web Speech API (Chrome, Edge recommended).

---

## Project Structure

```
Cline-based-Finance-Assistance/
|-- data/                      # Cached data files
|   |-- news-cache.json        # Cached news feed
|-- scripts/                   # Utility scripts
|   |-- agent-smoke.ts         # AI integration test
|-- server/                    # Backend server
|   |-- index.ts               # Express server and routes
|   |-- advisor.ts             # Ask Prospera agent
|   |-- tools.ts               # Cline SDK tool definitions
|   |-- llm.ts                 # LLM configuration
|   |-- mcp.ts                 # MCP server implementation
|   |-- market-data.ts         # Live market data fetching
|   |-- news.ts                # News feed aggregation
|   |-- macro-agent.ts         # Market analysis agent
|   |-- statement-agent.ts     # Statement categorization agent
|   |-- checkin.ts             # Check-in logic and scheduler
|   |-- history.ts             # Spending history management
|-- src/
|   |-- engine/                # Core calculation engine
|   |   |-- index.ts           # Module exports
|   |   |-- types.ts           # TypeScript type definitions
|   |   |-- assumptions.ts     # All configurable parameters
|   |   |-- math.ts            # Mathematical utilities
|   |   |-- budget.ts          # Budget calculations
|   |   |-- emergency.ts       # Emergency fund logic
|   |   |-- lifestyle.ts       # Goal and lifestyle planning
|   |   |-- portfolio.ts       # Investment allocation
|   |   |-- plan.ts            # Plan generation
|   |   |-- score.ts           # Financial health scoring
|   |   |-- statement.ts       # Statement parsing
|   |   |-- checkin.ts         # Check-in comparison
|   |   |-- market.ts          # Market data processing
|   |   |-- market-insights.ts # Market insight generation
|   |   |-- anomaly.ts         # Anomaly detection
|   |   |-- sample.ts          # Sample household data
|   |-- ui/                    # React frontend
|       |-- App.tsx            # Main application component
|       |-- api.ts             # API client
|       |-- InputForm.tsx      # Household data form
|       |-- styles.css         # Application styles
|       |-- components.tsx     # Reusable UI components
|       |-- onboarding/        # Onboarding flow
|       |-- tabs/              # Main application tabs
|-- tests/                     # Test files
|-- .env.example               # Environment template
|-- package.json               # Dependencies and scripts
|-- tsconfig.json              # TypeScript configuration
|-- vite.config.ts             # Vite configuration
```



---

## Development

### Code Style

- TypeScript strict mode enabled
- Functional programming patterns preferred
- Pure functions for all calculations
- Zod schemas for runtime validation
- JSDoc comments for public APIs

### Adding New Features

1. Define types in src/engine/types.ts
2. Add assumptions to src/engine/assumptions.ts
3. Implement calculation in appropriate engine module
4. Export from src/engine/index.ts
5. Create API endpoint if needed
6. Add Cline SDK tool wrapper in server/tools.ts
7. Build UI components
8. Write tests

### Hot Module Replacement

The development server supports HMR for:
- React components
- CSS modules
- Engine calculations (requires page refresh)

---

## Testing

### Unit Tests

Engine calculations are tested with Vitest:

```bash
npm test
```

### Smoke Tests

Verify AI integration:

```bash
npm run smoke
```

### Manual Testing

1. Start development server
2. Enter sample household data
3. Verify all tabs render correctly
4. Test Ask Prospera with sample questions
5. Import a sample statement
6. Complete a monthly check-in

---

## Deployment

### Docker Deployment

```dockerfile
FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 8787
CMD ["npm", "start"]
```

### Environment Variables for Production

```bash
NODE_ENV=production
PORT=8787
CLINE_PROVIDER=anthropic
CLINE_MODEL=claude-sonnet-4-20250514
ANTHROPIC_API_KEY=your-key-here
```

### Static Hosting

The frontend can be deployed separately:

```bash
npm run build
# Deploy contents of dist/ to any static host
```

Configure API URL via environment or proxy.

---

## Security Considerations

| Aspect | Implementation |
|--------|----------------|
| Data Storage | Local browser storage only (localStorage) |
| API Communication | HTTPS recommended for production |
| AI Requests | Household data sent to AI provider (no PII by default) |
| Input Validation | Zod schemas on all API endpoints |
| Rate Limiting | Not implemented (add for production) |
| Authentication | Not implemented (single-user design) |

### Privacy Notes

- No user accounts or server-side data persistence
- Household data stored in browser localStorage
- AI requests contain financial figures but no identifying information
- News and market data fetched from public sources
- No analytics or tracking implemented

---

## Disclaimer

This application is provided for educational and informational purposes only. It does not constitute financial, investment, tax, or legal advice.

Key limitations:

- Return assumptions are historical estimates, not guarantees
- Tax rules may change; consult a tax professional
- Insurance recommendations are general guidelines
- The application is not affiliated with any financial institution
- The developers are not SEBI-registered investment advisers

Users should:

- Review all assumptions in src/engine/assumptions.ts
- Consult qualified professionals before major financial decisions
- Verify calculations independently for critical decisions
- Understand that past performance does not indicate future results

---

## License

This project is open source. See the LICENSE file for details.

---

## Contributing

Contributions are welcome. Please:

1. Fork the repository
2. Create a feature branch
3. Write tests for new functionality
4. Ensure all tests pass
5. Submit a pull request

### Areas for Contribution

- Additional regional language support
- Enhanced market data sources
- Mobile application development
- Additional financial instruments
- Improved accessibility
- Performance optimizations
- Documentation improvements

---

## Acknowledgments

- Financial planning principles based on established Indian personal finance frameworks
- Market data provided by Yahoo Finance and World Bank
- AI capabilities powered by the Cline SDK
- Built with open-source technologies

---

## Contact

For issues and feature requests, please use the GitHub issue tracker.

Repository: https://github.com/Prince-k-Singh/Cline-based-Finance-Assistance

