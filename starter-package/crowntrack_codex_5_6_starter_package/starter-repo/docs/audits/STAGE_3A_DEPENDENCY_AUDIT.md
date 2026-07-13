# Stage 3A dependency audit

- Date: 2026-07-12
- Status: Accepted with documented Expo SDK residual risk

## Selected packages

| Package | Version | License | Purpose |
| --- | --- | --- | --- |
| `@noble/curves` | 1.8.1 | MIT | Portable Ed25519 implementation |
| `@noble/hashes` | 1.8.0 | MIT | SHA-256 transcript/fingerprint hashing |
| `expo-secure-store` | 14.0.1 | MIT | Platform-backed private-seed storage |
| `expo-crypto` | 14.0.2 | MIT | Secure random bytes |

`npm ls` resolved all four. Expo Doctor passed 18/18 and `expo install --check` reported dependencies up to date. Hermes/native Android sign/verify and SecureStore persistence passed.

## Audit result

- Full tree: 1,013 dependencies; 17 advisories — 11 moderate, 6 high, 0 critical.
- Production scope: 868 dependencies; the same 17 advisories.
- No advisory names the four selected Stage 3A packages.

The residual paths are the existing Expo SDK 52 CLI/config/build graph, including `@expo/cli`, `tar`, `cacache`, `@xmldom/xmldom`, `postcss`, `uuid`, and related Expo configuration packages. ADR-0004 already defers the major Expo migration. This stage did not run `npm audit fix --force`, upgrade Expo, or add unrelated dependencies.
