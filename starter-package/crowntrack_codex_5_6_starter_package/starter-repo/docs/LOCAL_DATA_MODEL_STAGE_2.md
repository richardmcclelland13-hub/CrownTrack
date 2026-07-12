# Stage 2 local data model

## Boundary

Business logic depends on a `CrewRepository` interface. Node tests and Expo web use the in-memory implementation. Android/iOS use an Expo SQLite adapter. SQLite remains plaintext within the OS sandbox and is not described as encrypted storage.

## Tables/entities

| Entity | Purpose | Key/index |
| --- | --- | --- |
| `schema_migrations` / `user_version` | Forward-only schema level | version |
| `peers` | Local peer profile and revocation state | peer ID |
| `ride_groups` | Private local ride groups and membership epoch | group ID |
| `group_memberships` | Peer membership | unique group + peer |
| `share_policies` | Explicit enabled state, precision, retention, emergency default | group ID |
| `peer_positions` | Newest accepted location per peer | group + peer + recorded time |
| `location_history` | Bounded accepted history | group + peer + recorded time |
| `inbound_messages` | Cross-transport deduplication and replay scope | message ID; group + sender + device + stream + sequence |
| `message_deliveries` | Which transports delivered one message | message ID + transport |
| `outbox_messages` | Store-and-forward queue | status + next attempt |
| `pending_acknowledgements` | Recipient-level ACK state | message ID + receiver |
| `transport_status` | Latest adapter capability/link reason | transport kind |

## Transactions

Inbound acceptance validates first, then atomically records the message ID, sequence, delivery observation, latest position, retained history, and pending ACK. Disabling sharing atomically changes consent and removes unsent location envelopes. Local deletion stops transports before clearing CrewLink entities.

## Retention

Stage 2 defaults to 60 minutes and constrains policy to 5–1440 minutes. History and outbox expiry are pruned on startup and after writes. Deduplication records outlive message TTL long enough to prevent delayed replay but remain bounded. Product ownership must approve final defaults.

## Migration strategy

Use ordered forward-only SQL migrations in exclusive transactions. Enable `foreign_keys` and WAL. Bind every runtime value. Native migration and backup behavior still require Android/iOS device validation.

## Privacy limitations

Deleting local data cannot erase copies already received by peers, screenshots, exports, OS backups, or compromised devices. Android Auto Backup and iOS backup/data-protection policy require a future native security decision. Private keys are not implemented in Stage 2 and must later live behind platform secure storage.
