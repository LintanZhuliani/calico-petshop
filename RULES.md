# PetShop_01 AI Guidelines & Rules

## 1. Dashboard & Metrics Performance
**Rule:** NEVER fetch full entity arrays (e.g. `/products`, `/transactions`, `/transfers`) to the frontend JUST to count them, sum them, or generate chart data. 
**Reasoning:** As the database grows, downloading megabytes of data to calculate a simple integer causes severe lag and browser crashes (e.g. the Dashboard Loading Issue).
**Action:** Always create backend endpoints (like `/api/dashboard/summary`) that use SQL aggregations (`count`, `sum`, `group by`) and return only the final lightweight statistics to the frontend.

## 2. Authorization & Cashier Limits
**Rule:** Cashiers must NEVER have access to product management, stock editing, or sensitive financial reports unless explicitly overridden.
**Reasoning:** Cashiers are only responsible for ringing up sales. Giving them product edit access causes data integrity risks (e.g. accidental stock deletion).
**Action:** Use `isAdmin` checks heavily in the frontend (e.g. hiding "Kelola Produk" buttons) and validate `role === 'admin'` in the backend routes for sensitive mutations.

## 3. Data Integrity & Transactions
**Rule:** ALWAYS wrap multi-step database mutations (e.g. deducting stock across multiple FEFO batches, processing a checkout) inside `db.transaction(async (tx) => { ... })`.
**Reasoning:** To prevent partial data corruption if an error occurs mid-process.
**Action:** All service methods that update inventory or create transactions must accept an optional `tx` parameter to allow them to participate in a parent transaction.

## 4. Archive/Soft Delete vs Hard Delete
**Rule:** When fetching aggregates or alerts (e.g. Low Stock, Expiring Soon), ALWAYS filter out archived items: `.where(eq(product.isArchived, false))`.
**Reasoning:** Failing to filter archived items causes "ghost" notifications for products that the user already deleted/archived.

## 5. Cashier Segregation & Aggregation
**Rule:** Every transaction MUST record `cashierId` and `cashierName`. Admin dashboards MUST aggregate (`SUM`) all cashiers' totals in a branch, while Kasir views MUST strictly isolate queries to their own `cashierId`.
**Reasoning:** Prevents cashiers from viewing each other's financial data, while ensuring the business owner (Admin) gets a unified store-wide summary.
**Action:** When creating summary/aggregation endpoints (e.g., `/api/dashboard/summary`), always conditionally filter by `cashierId`: if `role === 'admin'`, ignore `cashierId`; if `role === 'kasir'`, enforce `eq(transaction.cashierId, req.user.id)`.
