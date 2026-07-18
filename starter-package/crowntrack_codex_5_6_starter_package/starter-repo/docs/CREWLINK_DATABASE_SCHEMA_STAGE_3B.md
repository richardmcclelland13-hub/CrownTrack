# CrewLink database schema — Stage 3B

The Expo SQLite schema is forward-only and initialized transactionally. Signed state is held in verified group/membership/tombstone, membership record, seen/replay, stream high-water, local sequence, signed location, signed outbox, signed ACK, observation, rejection, policy, identity, trusted peer, and pairing invitation tables.

The private seed is not stored in SQLite; it remains in Expo SecureStore. The repository validates signed command preconditions before committing state. Deletion clears scoped signed tables, legacy Crew rows, identity/trust/invitation rows, and SecureStore seed through the development facade/reset path. Raw databases are never tracked as evidence.

Schema version 9 is a forward-only, idempotent repair for falsely-versioned v7/v8 databases. It creates missing signed objects including the rejection table, repairs required rejection-retention and group-origin columns before migration execution, and final validation rejects missing required tables or columns. Existing identity, trusted-peer, and valid CrewLink rows are preserved.
