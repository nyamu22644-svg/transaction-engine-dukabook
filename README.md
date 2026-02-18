# 🛒 Transaction Engine - DukaBook

**Enterprise-grade transaction processing platform for SME retail operations**

A scalable, production-ready system for managing retail store operations, inventory, payments, and multi-user access with real-time transaction processing and secure data handling.

---

## 📊 Tech Stack

### Frontend
- **React 18** - Component framework with TypeScript
- **Vite** - Lightning-fast build tooling
- **TailwindCSS** - Utility-first styling
- **Lucide React** - Consistent icon system

### Backend & Data
- **Supabase (PostgreSQL)** - Relational database with Row-Level Security
- **Supabase Auth** - JWT-based authentication
- **TypeScript** - Type-safe application logic

### Integrations
- **M-Pesa** - Mobile payment gateway
- **Intasend** - Payment processing
- **Firebase Cloud Messaging** - Push notifications
- **Barcode Scanning** - HTML5 QRCode

### DevOps & Deployment
- **Capacitor** - Native mobile (iOS/Android)
- **Electron** - Desktop application
- **Vite** - Modern tooling
- **npm/pnpm** - Package management

---

## 🎯 Problem Definition

### Challenge
Small-to-medium enterprises (SMEs) in emerging markets lack integrated, affordable transaction processing systems. Existing solutions fail to address:

- **Fragmented Operations**: Cash tracking, inventory, and sales not unified
- **Multi-user Complexity**: Managing customer access without system overhead
- **Payment Integration**: No native mobile payment gateway support
- **Data Security**: Sensitive business data vulnerable in cloud-first architecture
- **Offline Capability**: Systems fail when internet connectivity is unreliable
- **Scalability**: Cannot grow from single-store to multi-store operations

### Impact
SME retailers lose revenue to inefficient processes, cannot verify stock accuracy, struggle with staff accountability, and cannot process mobile payments—critical in emerging markets.

---

## 🏗️ Architecture Explanation

### System Design Philosophy: **Scalable Transaction Processing**

```
┌─────────────────────────────────────────────────────────┐
│                    CLIENT LAYER                          │
│  React Frontend + Capacitor Mobile + Electron Desktop   │
└────────────────┬────────────────────────────────────────┘
                 │
┌────────────────▼────────────────────────────────────────┐
│              AUTHENTICATION LAYER                        │
│  Supabase Auth (JWT) + Row-Level Security Policies      │
└────────────────┬────────────────────────────────────────┘
                 │
┌────────────────▼────────────────────────────────────────┐
│              APPLICATION LAYER                          │
│  • Store Management (Primary & Additional Access Codes) │
│  • Transaction Processing (Sales, Inventory, Payments)  │
│  • Multi-user Access Control (Hybrid Authorization)     │
│  • Real-time Analytics (Dashboard & Reports)            │
└────────────────┬────────────────────────────────────────┘
                 │
┌────────────────▼────────────────────────────────────────┐
│              PAYMENT GATEWAY LAYER                       │
│  M-Pesa Integration | Intasend C2B | C2B Payments       │
└────────────────┬────────────────────────────────────────┘
                 │
┌────────────────▼────────────────────────────────────────┐
│              DATA LAYER (PostgreSQL)                     │
│  Normalized Schema | RLS Policies | Indexes             │
│  • stores | users | transactions | inventory            │
│  • subscriptions | payments | store_access_codes        │
└─────────────────────────────────────────────────────────┘
```

### Hybrid Access Code System
The platform implements a **two-tier access model** for enhanced security and flexibility:

#### Primary Code
- **Storage**: `stores.access_code` (immutable)
- **Generated**: During store signup
- **Permissions**: Cannot be deleted or modified
- **Use Case**: Recovery mechanism and legacy compatibility

#### Additional Codes (Owner-Managed)
- **Storage**: `store_access_codes` table
- **Management**: Owners create/deactivate dynamically
- **Lifecycle**: Can be revoked per staff member
- **Audit Trail**: Tracks creation, usage, and deactivation

**Benefits of Hybrid Approach:**
✅ Backward compatibility with primary code  
✅ Granular staff access control  
✅ Independent code lifecycle management  
✅ Security without operational friction  

---

## 📋 Key Features

### Core Functionality
- ✅ Real-time sales entry and transaction logging
- ✅ Barcode scanning for inventory tracking
- ✅ Multi-user dashboard with role-based access
- ✅ Integrated payment processing (M-Pesa, Intasend)
- ✅ Stock management with FIFO/FEFO support
- ✅ Sales analytics and reporting
- ✅ Subscription billing management
- ✅ Hybrid access code system for staff management

### Security
- ✅ Row-Level Security (RLS) policies
- ✅ JWT authentication with expiry
- ✅ Encrypted data transmission
- ✅ Audit logging for transactions
- ✅ Rate limiting on API endpoints

### Data Management
- ✅ Query optimization with indexed searches
- ✅ Transactional integrity with PostgreSQL ACID
- ✅ Data consistency across multi-store operations
- ✅ Performance monitoring and analytics

---

## 🧠 Systems Thinking

### Emergent Properties
The platform exhibits characteristics greater than sum of parts:

1. **Self-Regulating Feedback Loops**
   - Stock alerts trigger reorders
   - Low payment triggers subscription reminders
   - Staff activity monitored through access codes

2. **Hierarchical Organization**
   - Super Admin → Owners → Staff → Customers
   - Each level has scoped permissions (RLS enforced)
   - Cascading deletions prevent orphaned data

3. **Network Effects**
   - Multi-user coordination improves inventory accuracy
   - Centralized analytics reveal business patterns
   - Payment history builds customer trust score

### Resilience Patterns
- **Redundancy**: Backup access codes prevent lockouts
- **Graceful Degradation**: Offline mode with sync pending
- **Load Balancing**: Connection pooling on database
- **Circuit Breaker**: Payment gateway fallback mechanism

---

## 📊 Data Thinking

### Data Architecture

**Normalized Schema** (3NF):
```
stores ──┬──→ users (1:M relationship)
         ├──→ transactions (1:M)
         ├──→ inventory (1:M)
         ├──→ store_access_codes (1:M) ← Hybrid codes
         ├──→ subscriptions (1:M)
         └──→ store_credentials (1:1)

transactions ──→ store_id, user_id, item_id, payment_id
inventory ──────→ store_id, product_id, quantity, unit_cost
```

### Data Flow Pipeline

```
Point of Sale Input
    ↓
Transaction Validation (Schema + Business Rules)
    ↓
PostgreSQL Insert (ACID Transaction)
    ↓
RLS Policy Check (Row-Level Security)
    ↓
Audit Log Insertion
    ↓
Real-time Dashboard Update (Pub/Sub)
    ↓
Analytics Aggregation (Scheduled)
```

### Query Optimization Strategy
- **Indexes on**: store_id, user_id, created_at, access_code
- **Materialized Views**: Daily sales summary, inventory count
- **Partition Key**: store_id for horizontal scaling
- **Caching**: Redis for frequently accessed codes

---

## 🤖 AI Curiosity

### Potential ML Enhancements (Future)

**1. Demand Forecasting**
- Input: Historical sales data (30-90 days)
- Model: ARIMA / Prophet time series
- Output: Predicted stock needs
- Value: Reduce overstock/understock by 20-30%

**2. Anomaly Detection**
- Input: Transaction patterns
- Model: Isolation Forest on transaction amounts
- Output: Flag unusual sales patterns
- Value: Detect staff fraud or data errors

**3. Customer Segmentation**
- Input: Purchase history + frequency
- Model: K-means clustering
- Output: Customer tiers (VIP, Regular, At-risk)
- Value: Personalized promotions and loyalty

**4. Price Optimization**
- Input: Cost, demand, competition pricing
- Model: Reinforcement learning (multi-armed bandit)
- Output: Dynamic price recommendations
- Value: 5-10% margin improvement

---

## 🛠️ Clean Engineering

### Code Organization
```
src/
├── components/        # React UI components
├── services/          # Business logic (Auth, Payments, Credentials)
├── hooks/             # React custom hooks
├── pages/             # Page components
├── types.ts           # TypeScript interfaces
├── utils/             # Helper functions
└── styles/            # Global styles
```

### Design Principles Applied

✅ **Single Responsibility**: Each service handles one domain  
✅ **Dependency Injection**: Services don't create dependencies  
✅ **Error Boundary**: Graceful error handling across components  
✅ **Type Safety**: 100% TypeScript coverage  
✅ **Async/Await**: Always handle promise rejections  
✅ **DRY**: Utility functions eliminate duplication  

### Testing Strategy
- **Unit Tests**: Services with mocked Supabase
- **Integration Tests**: Component + service interactions
- **E2E Tests**: Critical user flows (signup, payment, stock)
- **Performance Tests**: Query response time monitoring

### Best Practices
- ✅ No hardcoded values (use constants/config)
- ✅ Explicit error messages
- ✅ Consistent naming conventions
- ✅ Comments on complex business logic
- ✅ Git history preservation (squash before merge)

---

## 🚀 Quick Start

### Installation
```bash
# Clone repository
git clone https://github.com/nyamu22644-svg/transaction-engine-dukabook.git
cd transaction-engine-dukabook

# Install dependencies
npm install --legacy-peer-deps

# Configure environment
cp .env.example .env.local

# Start development server
npm run dev
```

### Environment Variables
```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_KEY=your_supabase_public_key
VITE_MPESA_CONSUMER_KEY=your_mpesa_key
VITE_INTASEND_KEY=your_intasend_key
```

### Database Setup
1. Run Supabase migrations in SQL Editor:
   ```sql
   -- Copy content from HYBRID_ACCESS_CODES_MIGRATION.sql
   ```

2. Enable Row-Level Security (RLS) on all tables

3. Create service_role exceptions for backend functions

---

## 📈 Performance Metrics

- **Page Load Time**: < 2s (optimized bundle)
- **API Response Time**: < 200ms (indexed queries)
- **Transaction Processing**: < 500ms (ACID guaranteed)
- **Database Connections**: Connection pooling (max 20)

---

## 📄 License

MIT License - See LICENSE.md for details

---

## 🙏 Contributing

Contributions welcome! Please:
1. Fork the repository
2. Create feature branch (`git checkout -b feature/description`)
3. Commit changes (`git commit -am 'Add description'`)
4. Push to branch (`git push origin feature/description`)
5. Create Pull Request

---

**Built for SMEs. Designed for scale. Engineered for reliability.**
