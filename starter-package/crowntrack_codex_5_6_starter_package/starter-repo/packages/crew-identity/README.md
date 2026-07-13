# Crew identity

Stage 3A owns portable Ed25519 identity and offline pairing. The native adapter stores only a 32-byte private seed in SecureStore; public identity, pairing state, trust metadata and replay records use SQLite. Invitations sign a canonical UTF-8 payload, expire, support cancellation and are marked used to reject replay. This proves origin and integrity only: it does not encrypt location content or create ride-group membership (Stage 3B).
