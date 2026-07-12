# Stage 2 QA report

Status: needs fixes.

## Passing gates

| Gate | Result |
| --- | --- |
| `npm run typecheck` | Pass |
| `npm run lint` | Pass |
| `npm test` | Pass: 20/20 |
| `npm run test:relay` | Pass: 9/9 |
| Five local skill validations | Pass |
| `npm run export:android` | Pass: 1,023 modules, 2.71 MB Hermes bundle |
| Package boundary lint | Pass; no cross-package `src` imports |

Tests cover strict wire schemas, timestamps/TTL/future skew, duplicate IDs, stream sequence regression, opaque device IDs, all four freshness states, reduced precision, retention pruning, ACKs, cross-transport aggregation, forward-only migrations, consent, revocation, retry/reconnect, out-of-order fixes, deletion, transport failure simulation, relay token/room validation, malformed/oversize frames, rate limiting, reconnect, and room relay.

## Incomplete gates

- Browser matrix completed at 360x800 and partially at 390x844; 412x915 and 768x1024 could not run after the in-app browser detached.
- The required final independent QA subagent was started but produced no review because the subagent service hit its usage limit.
- Android validation is an Expo/Hermes bundle export only. There is no generated native project, Gradle build, emulator/device run, migration execution, or native SQLite runtime evidence.
- iOS is static parity/configuration review only on Windows; no Xcode, simulator, device, entitlement, permission, or native SQLite evidence.
- The mobile SQLite snapshot adapter and normalized CrewLink migration model are not yet one native repository implementation.

## Result rationale

The Stage 2 development foundation is internally testable and its automated checks pass. The milestone remains `Needs audit` because the responsive matrix, independent QA pass, and native platform validation are incomplete.
