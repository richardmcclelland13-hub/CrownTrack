# Stage 3A security review

- Date: 2026-07-12
- Status: Accepted; independent final diff review passed

## Main-agent review

- Identity creation is explicit; startup has no key-generation path.
- Missing/mismatched private seed returns a visible recovery state without replacement.
- Private seed is generated with Expo Crypto, stored only in Expo SecureStore, and absent from SQLite schemas, React state, logs, errors, and evidence.
- Invitation signature/expiry validation precedes code display and staging.
- Staging creates no trust and does not consume the invitation.
- Confirmation re-verifies and transactionally writes trust, consumes the invitation, and clears its payload.
- Cancel, expiry, replay, key change, and revocation are enforced before trust writes.
- Revocation and terminal invitation state persist across restart.
- Reset covers SecureStore plus identity/trust/pairing SQLite state; complete deletion also clears CrewLink.
- Development controls are labelled as a local simulator and not a physical phone.
- No encryption claim is made. Pairing authenticates identity/integrity only.

## Evidence safety

Git review must reject APKs, database snapshots, logs, debug keystores, raw invitations, full keys/signatures, private seeds, and secret-bearing screenshots. Committed native evidence is redacted Markdown only.

## Independent review

The reviewer found one P2 issue: validly signed non-date timestamps could bypass expiry because JavaScript comparisons against `NaN` are false. The verifier now rejects non-finite issue/expiry timestamps and reversed/equal validity intervals before signature acceptance or staging. Tests cover validly signed invalid issue time, invalid expiry time, and reversed intervals. Typecheck, lint, all 38 repository tests, all 9 relay tests, and Android export passed after the fix.

The reviewer revalidated the correction and found no remaining acceptance blocker. Residual risks are the documented Expo SDK 52 advisories and unverified iOS runtime.
