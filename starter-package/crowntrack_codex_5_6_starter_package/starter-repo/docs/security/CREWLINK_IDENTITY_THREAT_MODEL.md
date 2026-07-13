# CrewLink identity threat model

- Status: Accepted for Stage 3A
- Date: 2026-07-12
- Scope: local device identity and offline pairing only

## Assets and trust boundaries

The private Ed25519 seed is the highest-value asset. It is generated with Expo Crypto and stored only through Expo SecureStore. SQLite contains public identity, fingerprints, invitation lifecycle metadata, and trusted-peer metadata. The copy/paste channel and development simulator are untrusted inputs. A relay or transport is not trusted with authenticity decisions.

## Threats and controls

| Threat | Stage 3A control | Residual risk |
| --- | --- | --- |
| Forged invitation | Ed25519 signature over a canonical invitation payload | A compromised private seed can sign valid invitations |
| Tampering | Canonical verification fails before a comparison code is shown | Metadata remains visible to the out-of-band channel |
| Replay | Invitation IDs persist as used/cancelled records; expiry is enforced | Terminal identifiers are retained locally until complete deletion |
| Trust without consent | Validation stages only; explicit Confirm writes trust and consumes the invitation | Riders must compare the code through an independent human channel |
| Device key substitution | A known device ID with a different key becomes `key_changed` | Recovery requires an explicit reset/re-pair policy |
| Revoked peer restoration | Revocation persists; old/same-identity invitations cannot restore trust | No remote revocation distribution exists yet |
| Missing or mismatched seed | UI reports `missing_private_key` or `reset_required`; no silent regeneration | The rider must reset and pair again |
| Local database disclosure | No private seed is stored in SQLite | Public identity/trust metadata and future location content are not encrypted at rest |
| Log/evidence disclosure | Errors are generic; UI/evidence omit payloads, keys, signatures, seeds, and full fingerprints | OS-level compromise is out of scope |

## Security boundary

Pairing authenticates the origin and integrity of pairing data. It does not encrypt invitation content, location content, or transport traffic. Signed location messages and ride-group membership are deferred to Stage 3B. Real GPS, networking, Bluetooth, Nearby, Meshtastic, and production accounts are out of scope.
