# Architecture & Engineering Decisions

## 1. Technology Choices
- **Next.js (App Router)**: Offers a unified framework for server-rendered components, API endpoints (Route Handlers), and client-side interactivity, minimizing setup complexity.
- **Prisma ORM (v7.8)**: Adopted Prisma 7 for its native TypeScript generation. Note that Prisma 7 has removed the `url` property from the `schema.prisma` file, requiring database configs to reside in `prisma.config.ts`.
- **SQLite (better-sqlite3)**: Transitioned database engine to SQLite via the `@prisma/adapter-better-sqlite3` driver adapter to ensure the application runs out-of-the-box on local reviewer environments without requiring any external PostgreSQL server or Docker setup. The database is stored inside a local file (`prisma/dev.db`).
- **Tailwind CSS (v4)**: Modern style architecture utilizing CSS variables and utility classes, allowing for smooth transition animations and clean layouts.

## 2. Key Architecture Designs
- **Session Auth Switching**: Instead of deploying heavy authenticators (like Clerk or Auth.js) which require external API keys, we built a custom cookie-based session API. For developer review convenience, we placed a user switcher in the navigation bar to allow swapping between mock Providers and Customers in one click.
- **Double Booking Prevention (Optimistic Concurrency)**:
  To prevent multiple users from booking the same slot simultaneously, bookings are updated only if `bookedById` is currently `null`:
  ```typescript
  prisma.slot.update({
    where: { id: slotId, bookedById: null },
    data: { bookedById: userId }
  })
  ```
  If another request has already booked it, the row update will find 0 matching records and throw a Prisma P2025 error, which is caught and returned as an HTTP 409 Conflict. This avoids heavy database locks.
- **Atomic Rescheduling (Transactions)**:
  Rescheduling is run in a database transaction (`prisma.$transaction`). It attempts to release the old slot (ensuring the user owns it) and claim the new slot (ensuring it is currently free) in a single database round-trip. If either step fails, the entire transaction aborts, ensuring data integrity.
- **Timezone Management**:
  To ensure timezone safety, all date-times are stored as UTC in SQLite. When creating slots, providers select their local time and input timezone; the app maps it to UTC. When clients browse, their selected timezone in the header translates calendar bounds for date filtering, and translates UTC timestamps into local strings in the UI.

## 3. System Weaknesses & Trade-offs
- **Mock Auth**: Session auth relies on simple cookie claims without passwords or security verification. Fine for review, but would be upgraded to Auth.js with password hashing or OAuth in production.
- **No Real-Time Sync**: If a slot gets booked, it only disappears for other users upon page refresh or clicking a filter. A WebSocket or SSE (Server-Sent Events) setup would provide live updates.

## 4. Future Improvements
- **Recurring Slots**: Ability for providers to create slots recursively (e.g., "every Monday from 9 AM to 5 PM").
- **Email Notifications**: Integration with Resend/Nodemailer to notify parties when bookings are confirmed, rescheduled, or cancelled.
- **Calendar Integrations**: Sync bookings with Google Calendar or Outlook iCal invites.
