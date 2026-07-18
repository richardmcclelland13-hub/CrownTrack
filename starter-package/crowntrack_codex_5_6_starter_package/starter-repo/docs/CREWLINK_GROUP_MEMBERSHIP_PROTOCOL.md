# CrewLink group membership protocol — Stage 3B

Pairing/trust proves a known key relationship; it is not group authorization. A locally owned group begins at epoch 1. An owner grants only a paired trusted device and advances to epoch 2. Revocation advances once to epoch 3 and creates a terminal tombstone for that exact identity; it cannot be regranted in Stage 3B.

Membership transitions use the sole authority stream `membership-${authorityDeviceId}` and are persisted atomically with high-water state. Imported groups may bootstrap only from the first valid trusted-owner grant addressed to the local identity. Older, future, replayed, unauthorized, or tombstoned transitions are rejected.

Restart-safe presentation is based on local persisted group, membership, epoch, and tombstone records. A volatile development-rider simulation must never override those local facts.
