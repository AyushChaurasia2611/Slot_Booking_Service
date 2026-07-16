# System Design - Slot Booking Service

This document explains the system design, architecture, database design, and key execution flows of the Slot Booking Service.

---

## 1. System Architecture

The application is structured as a three-tier architecture utilizing Next.js (App Router), Prisma, and PostgreSQL.

```mermaid
graph TD
    A[Client Browser] -->|HTTP Requests| B[Next.js App Server]
    B -->|API Routes / App Context| C[Route Handlers / API]
    C -->|Prisma Client| D[PostgreSQL Database]
    
    subgraph UI Components
        A1[Header / Auth Switcher]
        A2[Customer Dashboard]
        A3[My Bookings Panel]
        A4[Provider Manage Panel]
    end
    
    subgraph Database Models
        D1[User Table]
        D2[Slot Table]
    end
    
    A --> A1
    A --> A2
    A --> A3
    A --> A4
    D --> D1
    D --> D2
```

---

## 2. Database Schema

The database design represents a one-to-many relationship from `User` to `Slot` twice:
1. `providerId`: Tracks the provider who created the slot (owner).
2. `bookedById` (nullable): Tracks the customer who booked the slot (booker).

```mermaid
erDiagram
    USER {
        string id PK
        string email UK
        string name
        enum role "PROVIDER | CUSTOMER"
        string timezone
        datetime createdAt
        datetime updatedAt
    }
    SLOT {
        string id PK
        datetime startTime "UTC"
        datetime endTime "UTC"
        string providerId FK
        string bookedById FK "Nullable"
        datetime createdAt
        datetime updatedAt
    }
    USER ||--o{ SLOT : "provides (providerId)"
    USER ||--o{ SLOT : "books (bookedById)"
```

### Constraints & Indexes
- **Indexes**:
  - `@@index([providerId])` - Speeds up fetching slots by a specific provider (very common for dashboard filtering).
  - `@@index([bookedById])` - Speeds up querying a customer's specific bookings.
  - `@@index([startTime])` - Optimizes date range filters when loading available slots.
- **On Delete Behaviors**:
  - If a provider is deleted (`onDelete: Cascade`), all their corresponding slots are deleted.
  - If a customer is deleted (`onDelete: SetNull`), the booking is released (`bookedById` becomes `null`), returning the slot to an available state.

---

## 3. Key Concurrency & Transaction Workflows

### Concurrency-Safe Booking Flow
To prevent race conditions where two customers attempt to book the same slot at the exact same millisecond, the database update checks that `bookedById` is still `null` at update time.

```mermaid
sequenceDiagram
    autonumber
    actor CustomerA as Customer A
    actor CustomerB as Customer B
    participant API as Bookings API (/api/bookings)
    participant DB as PostgreSQL Database

    CustomerA->>API: POST /api/bookings (slotId = "S1")
    CustomerB->>API: POST /api/bookings (slotId = "S1")
    
    Note over API,DB: Concurrency-safe query: UPDATE Slot WHERE id="S1" AND bookedById IS NULL
    
    API->>DB: Exec transaction for Customer A
    activate DB
    DB-->>API: 1 row updated (Success)
    deactivate DB
    API-->>CustomerA: HTTP 200 (Success)
    
    API->>DB: Exec transaction for Customer B
    activate DB
    DB-->>API: 0 rows updated (P2025 Error)
    deactivate DB
    API-->>CustomerB: HTTP 409 Conflict (Already Booked)
```

### Atomic Rescheduling Flow
Rescheduling involves releasing an existing booking and claiming a new available slot. This must happen atomically inside a transaction to prevent partial state updates (e.g., losing the original booking if the new slot booking fails).

```mermaid
sequenceDiagram
    autonumber
    actor Customer as Customer
    participant API as Bookings API (PUT /api/bookings)
    participant DB as PostgreSQL Database

    Customer->>API: Reschedule (Old Slot = "S1", New Slot = "S2")
    
    rect rgb(240, 244, 255)
        Note over API,DB: Prisma $transaction Begins
        API->>DB: Step 1: UPDATE Slot WHERE id="S1" AND bookedById=userId SET bookedById=NULL
        DB-->>API: Success (Old Slot Released)
        
        API->>DB: Step 2: UPDATE Slot WHERE id="S2" AND bookedById=NULL SET bookedById=userId
        alt New Slot is Available
            DB-->>API: Success (New Slot Booked)
            Note over API,DB: Transaction Committed Successfully
            API-->>Customer: HTTP 200 (Rescheduled successfully)
        else New Slot is Already Booked (Race condition)
            DB-->>API: P2025 Error (Failed to claim "S2")
            Note over API,DB: Transaction Rolled Back. "S1" restored as Booked.
            API-->>Customer: HTTP 409 Conflict (Reschedule failed)
        end
    end
```

---

## 4. Timezone Management Model

Timezone synchronization is resolved by decoupling **storage**, **creation**, and **display**:

```
+--------------------------------------------------------+
| 1. CREATION (Provider Alice, New York)                  |
|    - Alice inputs: 2026-07-17 at 9:00 AM (America/NY)   |
|    - System converts input local time to UTC:          |
|      "2026-07-17 09:00:00" @ New York -> 1:00 PM UTC   |
|    - Stored in PostgreSQL: "2026-07-17T13:00:00Z"      |
+--------------------------+-----------------------------+
                           |
                           v
+--------------------------------------------------------+
| 2. STORAGE (PostgreSQL Database)                       |
|    - Always stored in UTC format.                      |
+--------------------------+-----------------------------+
                           |
                           v
+--------------------------------------------------------+
| 3. DISPLAY (Customer Charlie, Tokyo)                   |
|    - Charlie views slots in Tokyo zone (Asia/Tokyo)    |
|    - App reads UTC value: "2026-07-17T13:00:00Z"       |
|    - Converts dynamically: 1:00 PM UTC -> 10:00 PM JST  |
|    - Charlie sees: Friday, July 17, 10:00 PM           |
+--------------------------------------------------------+
```

### Date Range Boundary Calculations
When filtering slots for a specific date (e.g. `2026-07-17`) in a timezone (e.g. `America/New_York`), we calculate the precise UTC boundaries:
- **Start**: `2026-07-17 00:00:00.000` New York time $\to$ `2026-07-17T04:00:00.000Z` UTC.
- **End**: `2026-07-17 23:59:59.999` New York time $\to$ `2026-07-18T03:59:59.999Z` UTC.
The Prisma query then checks `startTime >= start` and `startTime <= end`, ensuring that all slots falling into that New York day are returned, regardless of the customer's local viewing zone.
