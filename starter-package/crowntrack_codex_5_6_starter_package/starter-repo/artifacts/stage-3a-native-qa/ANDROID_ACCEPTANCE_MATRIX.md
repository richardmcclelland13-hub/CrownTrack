# Android acceptance matrix — redacted

Date: 2026-07-12

## Identity

- Clean relaunch: `not_created`; no automatic identity.
- Explicit create: `ready`; shortened fingerprint `BGqb-g3Lt--nah…`.
- Force-stop/relaunch: same shortened fingerprint.
- SQLite: public identity present; zero private-seed/private-key columns.
- Missing-seed simulation: `missing_private_key`; force-stop/relaunch stayed missing with no replacement.
- Reset: success only after SecureStore and SQLite cleanup; repeat-safe behavior observed.

## Pairing

- Valid development rider invitation verified.
- Before Confirm: authentication code visible; trusted peer count remained zero.
- Explicit Confirm: one verified trusted peer.
- Force-stop/relaunch: trust remained verified.
- Long display name remained readable and scrollable.

## Negative and revocation

- Expired, tampered, and malformed invitations rejected.
- Cancel produced no trust; cancelled replay rejected.
- Consumed replay rejected.
- Replacement key displayed textual `KEY CHANGED`; trust unchanged.
- Revocation displayed textual `REVOKED` and survived relaunch.
- Consumed old invitation and a new invitation from the revoked identity could not restore trust.
- Rejected invitations never increased the trusted-peer count.

## Deletion

- Complete delete removed SecureStore seed.
- Identity, trusted-peer, pairing, group, peer, membership, position, latest-position, and outbox table counts were all zero.
- Two force-stop/relaunch cycles stayed `NOT CREATED`; deleted group did not return.

## UI

- Empty concealed paste field opened the Android keyboard; Back dismissed it without leaving Crew.
- Copy path was present in the Android system share sheet as **Copy to clipboard**.
- Scrolling, long names, error messages, and destructive confirmations were exercised.
- Status/navigation bars and bottom navigation remained visible without overlap.
- Trust states used text plus color.
- App configuration intentionally locks portrait orientation; a rotation request preserved the portrait layout.
- Accessibility inspection exposed the comparison code only after verification and exposed no payload, public key, signature, or private material.
