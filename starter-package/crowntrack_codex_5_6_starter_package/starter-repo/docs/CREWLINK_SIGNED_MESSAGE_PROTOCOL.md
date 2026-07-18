# CrewLink signed message protocol — Stage 3B

Stage 3B accepts strict v2 envelopes under `crowntrack-crewlink-signed/v1`. Canonical bytes are signed before transmission; an endpoint verifies frame shape, signature, trusted key, group, active membership, epoch, expiry/TTL, replay identity, and monotonic stream sequence before committing accepted data.

The relay and simulated transports are untrusted delivery pipes. They do not authenticate payload truth, persist messages, or guarantee delivery. Legacy v1 remains isolated for compatibility/regression only and is not reachable from the primary Crew path.

Outbound local location creation requires active membership, enabled sharing, confirmed consent, and current policy. Precision reduction happens before signing. Retry rechecks authorization in the repository transaction. A verified ACK clears only its matching durable local outbox item.

Inbound buddy state is a separate direction: the development rider signs a location, simulated transport delivers it to the local endpoint, and the local repository verifies and stores it before safe presentation. Exact coordinates, envelopes, keys, signatures, and identifiers do not reach UI, logs, errors, or evidence.
