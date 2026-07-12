# Stage 2.1 implementation report

Status: implemented; needs fixes before acceptance.

## Delivered

- One canonical CrewLink migration plan and repository contract in `packages/crewlink`.
- Deterministic migration runner with exclusive native transactions, connection pragmas, schema validation, and a known Stage 2 legacy bridge backed up before destructive replacement.
- Expo SQLite adapter for peers, groups, consent, positions, outbox, acknowledgements, delivery observations, transport states, pruning, peer/group/local deletion, and non-sensitive diagnostics.
- Web uses the shared in-memory repository; UI no longer persists a competing CrewLink snapshot schema.
- Browser QA completed at four required viewports, including corrected 390px layout.
- Data-at-rest, Expo SDK migration, Android, iOS, schema, and QA documentation.
- Independent security/QA review completed; its legacy-bridge and peer-metadata findings were remediated and verified.

## Acceptance status

The current machine cannot perform Android runtime validation. Therefore no real native restart persistence, migration execution, deletion-after-restart, device system-bar, rotation, keyboard, or Android back-button claim is made. Stage 2.1 remains `Needs fixes` until that evidence and the final independent review are complete.
