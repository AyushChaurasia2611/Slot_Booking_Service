# Slot Booking Service

A premium, timezone-aware, concurrency-safe Slot Booking application built using **Next.js (App Router)**, **PostgreSQL**, and **Prisma ORM**.

---

## 🚀 How to Run the App Easily

Follow these quick steps to get the app running locally on your machine:

### 1. Boot up PostgreSQL
We have provided a Docker Compose configuration to easily boot a PostgreSQL database locally. In the project root, run:
```bash
docker compose up -d
```
This spins up a PostgreSQL instance on port `5432` with username `postgres`, password `password`, and database `slotbooking`.

### 2. Configure Environment Variables
Copy the template configuration into a new `.env` file (if you have not done so already):
```bash
cp .env.example .env
```
*(The default values in `.env` are configured to match the docker-compose settings out-of-the-box).*

### 3. Install Dependencies
```bash
npm install
```

### 4. Run Migrations & Seed the Database
Apply migrations to create database tables, compile the Prisma client, and run the seed script to populate mock accounts and slots:
```bash
# Apply database migrations
npx prisma migrate dev --name init

# Generate the Prisma Client
npx prisma generate

# Seed the database
npx prisma db seed
```

### 5. Launch the Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your web browser.

---

## 👥 Seed Data Accounts

The seed script creates the following mock accounts:

| Name | Role | Location | Default Timezone |
|---|---|---|---|
| **Alice** | Provider | New York | `America/New_York` |
| **Bob** | Provider | London | `Europe/London` |
| **Charlie** | Customer | Tokyo | `Asia/Tokyo` |
| **Dave** | Customer | Delhi | `Asia/Kolkata` |

*To test the system from different perspectives, select any user from the **Acting As** dropdown in the top-right header of the web page.*

---

## 🧪 Running Concurrency Verification

We have created an automated test script to programmatically assert the double-booking concurrency lock. Once your PostgreSQL database is running and migrated, run:
```bash
npm run test:concurrency
```
This script will:
1. Create temporary test accounts and a single available slot.
2. Fire two parallel booking requests in the exact same millisecond.
3. Assert that **exactly one** request succeeds and the other fails with a transaction conflict error.
4. Clean up its test records.

---

## 📂 Key Architecture Documents

We have created the following files to explain the project design and details:
- **[DECISIONS.md](file:///c:/Users/ayush/Desktop/Bluepen/DECISIONS.md)**: Engineering choices, trade-offs, weaknesses, and future improvements.
- **[SYSTEM_DESIGN.md](file:///c:/Users/ayush/Desktop/Bluepen/SYSTEM_DESIGN.md)**: Full system architecture, database schema diagrams, and transaction sequences.
