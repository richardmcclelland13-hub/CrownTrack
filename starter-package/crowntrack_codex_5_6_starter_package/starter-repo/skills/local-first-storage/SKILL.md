---
name: local-first-storage
description: Implement or audit CrownTrack local-first persistence, including CrewLink repositories, SQLite migrations, retention, outbox state, deduplication, acknowledgements, consent, and deletion. Use for any task that stores private ride-group or location data on device.
---

# Local-first storage

1. Define a platform-neutral repository interface before choosing a database.
2. Keep business rules in pure TypeScript; keep Expo SQLite imports in the mobile native adapter.
3. Use an in-memory implementation for Node tests and Expo web.
4. Make migrations forward-only, transactional, and versioned with `PRAGMA user_version`.
5. Enable foreign keys and WAL; bind all values.
6. Atomically deduplicate inbound messages, enforce sequence, update latest position, append retained history, and create acknowledgements.
7. Check sharing consent before enqueue and every retry. Disabling sharing must purge unsent location updates.
8. Bound history, outbox, deduplication, and acknowledgement retention. Prune on startup and after writes.
9. Make local deletion explicit and verifiable. State that peer copies and backups cannot be recalled.
10. Never claim SQLite is encrypted. Document backup and device-compromise limitations.

Completion requires repository contract tests, migration documentation, no coordinate logging, and Android/iOS boundary notes.
