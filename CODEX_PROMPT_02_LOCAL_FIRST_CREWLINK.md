# CrownTrack ADV — Codex Prompt 02
## Stage 2: Local-First App Foundation + CrewLink Transport Architecture

You are Codex 5.6 acting as the execution studio for CrownTrack ADV.

The product owner is Richard. ChatGPT is the product/engineering manager and acceptance gatekeeper. You are responsible for implementation, internal specialist delegation, testing, visual inspection, documentation, and a clear stop point.

The Stage 0/1 shell is reported complete in `starter-repo/` with:

- five tabs: Map, Packs, Plan, Crew, SOS
- Expo + React Native + TypeScript scaffold
- mock map/GPS/route/crew/pack/rescue states
- pure TypeScript domain logic
- reusable UI tokens/components
- domain tests
- passing typecheck, tests, lint, and Android Expo export
- 17 dependency audit warnings reported during install

Do not assume the previous stage is accepted until you inspect and verify it.

---

# Stage goal

Turn the mock shell into a serious local-first application foundation and define the architecture for buddy tracking across three connectivity conditions:

1. **Internet available** — cloud relay transport.
2. **No internet, riders close together** — nearby phone-to-phone transport.
3. **No internet, riders separated beyond phone radio range** — external off-grid radio transport such as Meshtastic/LoRa.

This stage must implement the shared data model, persistence boundary, transport abstraction, simulators, Crew UI states, and a local development relay. It must **not** pretend that a hosted server works without connectivity, and it must **not** implement real Bluetooth, LoRa, background GPS, MapLibre, or production cloud infrastructure yet.

This is a production-foundation milestone, not a throwaway demo.

---

# Mandatory first reads

Read before planning or editing:

1. `AGENTS.md`
2. `START_HERE.md`
3. `starter-repo/README.md`
4. `docs/PRODUCT_BRIEF.md`
5. `docs/MVP_SCOPE_LOCK.md`
6. `architecture/REPO_ARCHITECTURE.md`
7. `data-contracts/TYPESCRIPT_CONTRACTS.md`
8. `docs/LEGAL_DATA_GUARDRAILS.md`
9. `docs/CODEX_WORKFLOW.md`
10. `docs/QA_ACCEPTANCE_CHECKLIST.md`
11. all existing local `skills/*/SKILL.md`
12. the current code, tests, lockfile, package manifests, and git status

Also inspect any current Stage 0/1 report or screenshots in the repo.

---

# Studio operating model

Use Codex subagents deliberately. Do not have every agent edit the same files.

Create or use these specialist roles:

## 1. Lead architect
Read-only during discovery.

Responsibilities:

- inspect the current architecture
- identify coupling and missing boundaries
- propose the exact Stage 2 file plan
- review package/dependency choices
- confirm Android-first implementation remains compatible with iOS
- prevent unnecessary backend or framework churn

## 2. Offline communications research agent
Read-only.

Research only primary/official documentation.

Must compare:

- hosted internet relay
- Android nearby peer-to-peer options
- iOS nearby peer-to-peer options
- external LoRa/Meshtastic bridge
- Garmin Group Ride radio architecture
- Polaris cellular versus V2V group ride architecture
- background limitations and practical range limitations
- privacy, pairing, identity, replay, stale-position, and lost-link failure modes

Output an evidence-backed recommendation. No marketing guesses and no invented range claims.

## 3. Android platform agent
Review Android permissions, foreground/background constraints, local database choice, build implications, and later Nearby/BLE integration boundaries. Do not implement real background location in this stage.

## 4. iOS parity agent
Review every shared interface and dependency for iOS viability. Identify anything that would lock the project to Android. No iOS build is required on Windows, but the architecture must not make iOS an afterthought.

## 5. UI/UX agent
Audit Map and Crew flows for:

- map-first hierarchy
- one-hand use
- glove-friendly touch targets
- safe areas
- text scaling
- transport/offline clarity
- stale buddy clarity
- privacy consent clarity
- no misleading “live” status
- calm native-feeling presentation

This agent may propose changes but must not independently redesign the entire app.

## 6. Security/privacy agent
Threat-model location sharing:

- consent and revocation
- friend and ride-group trust
- pairing
- impersonation
- replayed/stale coordinates
- storage retention
- emergency sharing
- group membership changes
- compromised radio/device
- lost phone
- location data in logs
- dev relay limitations

## 7. Dependency auditor
Inspect the reported 17 warnings.

Rules:

- run the relevant audit command and capture machine-readable output
- classify direct versus transitive dependencies
- classify runtime versus development-only exposure
- identify non-breaking upgrades
- do not run `npm audit fix --force`
- do not replace major frameworks merely to make the warning count zero
- document accepted temporary risk with exact package paths and reason

## 8. QA/test agent
Read-only review after implementation, followed by targeted fixes by the main agent.

Must test:

- domain logic
- persistence
- protocol validation
- relay behavior
- UI interaction
- visual layout
- accessibility basics
- Android build/export
- iOS compatibility at code/config level

Wait for discovery summaries before selecting the final implementation plan.

---

# Skills and MCP use

Use existing local skills when relevant.

Create these project-local skills if they do not already exist:

```text
skills/local-first-storage/SKILL.md
skills/crewlink-transport/SKILL.md
skills/location-sharing-security/SKILL.md
skills/mobile-visual-qa/SKILL.md
skills/dependency-audit/SKILL.md
```

Each skill must be narrow, auditable, and specific to CrownTrack. Do not install random third-party skills without inspecting their source and documenting why they are trusted.

MCP servers are allowed when they materially improve the work:

- Chrome DevTools MCP for browser interaction and visual inspection
- official documentation/search tooling
- GitHub tooling if the repo is connected

Do not add an MCP server merely because one exists. Document any MCP used and what it contributed.

---

# Required architecture decision

Create:

```text
docs/adr/ADR-0002-CREWLINK-OFFGRID-BUDDY-TRANSPORT.md
```

The ADR must state this truth clearly:

> GPS position acquisition can work without cellular service. Sharing that position with another rider requires a separate communications transport. A hosted internet server cannot relay data when neither rider has internet connectivity.

Design a transport-independent system named **CrewLink**.

Recommended conceptual layers:

```text
Location source
  -> Location envelope/protocol
  -> Local outbox and retention policy
  -> CrewLink coordinator
      -> Cloud relay transport
      -> Nearby peer transport
      -> External mesh-radio transport
  -> Deduplication / sequence / TTL / trust checks
  -> Local crew state
  -> UI
```

CrewLink must support multiple transports without making UI/domain code depend on a specific radio or server.

Do not finalize a hardware purchase or guarantee range in this stage.

---

# Required implementation

## A. Baseline audit and branch discipline

1. Inspect git status and current branch.
2. Create a Stage 2 branch if the environment allows:
   `stage-2-local-first-crewlink`
3. Re-run current validation before editing:
   - `npm run typecheck`
   - `npm test`
   - `npm run lint`
   - `npx expo export --platform android`
4. Run dependency audit and produce:
   `docs/audits/STAGE_2_DEPENDENCY_AUDIT.md`
5. Record baseline failures before changing code.

Do not hide or silently delete failures.

---

## B. Shared protocol package

Create a clean package or module such as:

```text
packages/crew-protocol/
```

Use strict TypeScript and runtime validation.

Define at minimum:

```ts
type TransportKind =
  | 'cloud'
  | 'nearby'
  | 'mesh_radio'
  | 'simulated';

type LinkState =
  | 'unavailable'
  | 'discovering'
  | 'connecting'
  | 'connected'
  | 'degraded'
  | 'disconnected';

type PresenceState =
  | 'live'
  | 'recent'
  | 'stale'
  | 'unknown';

interface PeerIdentity {
  peerId: string;
  displayName: string;
  publicKeyId?: string;
  deviceId: string;
}

interface LocationFix {
  latitude: number;
  longitude: number;
  altitudeM?: number;
  accuracyM?: number;
  headingDeg?: number;
  speedMps?: number;
  recordedAt: string;
}

interface LocationEnvelope {
  protocolVersion: number;
  messageId: string;
  sender: PeerIdentity;
  rideGroupId: string;
  sequence: number;
  sentAt: string;
  expiresAt: string;
  fix: LocationFix;
  transportHints?: TransportKind[];
}

interface CrewAck {
  messageId: string;
  receiverPeerId: string;
  receivedAt: string;
}

interface LocationSharePolicy {
  enabled: boolean;
  groupIds: string[];
  precision: 'exact' | 'reduced';
  retentionMinutes: number;
  emergencyOverride: boolean;
}
```

Add runtime schemas and tests.

Implement pure helpers for:

- envelope validation
- expiry/TTL checks
- sequence monotonicity
- duplicate detection
- presence/staleness calculation
- newest-position selection
- acknowledgement handling
- safe reduced-precision mode
- retention pruning
- transport status aggregation

Reject impossible coordinates, malformed timestamps, expired messages, wrong group IDs, duplicates, and sequence regressions.

---

## C. Local-first persistence

Implement a persistence abstraction for:

- friends/peers
- ride groups
- membership
- share policies/consent
- most recent peer position
- location history with retention
- outbound message queue
- inbound deduplication IDs
- transport status
- pending acknowledgements

Use a migration-capable local database appropriate for the existing Expo/React Native architecture. Prefer the lowest-risk supported choice.

Requirements:

- Android-first
- iOS-compatible
- persistence code isolated behind interfaces
- tests use an in-memory implementation or test database
- Expo web may use an in-memory fallback if native SQLite is not available
- no business logic in React components
- no sensitive coordinates written to normal console logs
- provide a clear data deletion path

Create:

```text
docs/LOCAL_DATA_MODEL_STAGE_2.md
```

Include tables/entities, indexes, retention behavior, and migration strategy.

---

## D. CrewLink transport interfaces and simulators

Create a transport interface similar to:

```ts
interface CrewTransport {
  readonly kind: TransportKind;
  getState(): LinkState;
  start(context: TransportContext): Promise<void>;
  stop(): Promise<void>;
  send(message: LocationEnvelope): Promise<SendResult>;
  subscribe(handler: (message: LocationEnvelope) => void): Unsubscribe;
  subscribeState(handler: (state: LinkState) => void): Unsubscribe;
}
```

Create a coordinator/multiplexer that:

- accepts one outbound envelope
- selects allowed transports
- can send through more than one transport
- deduplicates inbound copies
- records which transport delivered a message
- marks data stale correctly
- does not call a buddy “live” solely because the local GPS is live
- supports store-and-forward/outbox retry
- avoids uncontrolled retry loops
- exposes clear status to the UI

Implement:

```text
MockCloudTransport
MockNearbyTransport
MockMeshRadioTransport
```

These must simulate:

- connected
- delayed
- dropped packet
- out-of-order packet
- duplicate packet
- transport unavailable
- reconnect
- stale peer

Do not implement real Bluetooth, real Meshtastic, or real internet deployment in this stage.

---

## E. Local development relay

Add a small local-only TypeScript relay service, preferably:

```text
apps/relay/
```

Purpose:

- prove the online CrewLink protocol end-to-end
- support multiple local clients in a ride-group room
- relay validated location envelopes and acknowledgements
- enable web/Android development testing

Requirements:

- WebSocket or similarly appropriate real-time local transport
- in-memory rooms only
- runtime schema validation
- message size limits
- rate limiting appropriate for a dev service
- no coordinate logging by default
- no database
- no deployment
- no production claim
- no hardcoded public URL
- config through environment variables
- explicit warning in README that authentication is development-only

Use an ephemeral development token or similarly minimal local gate so the relay is not an open unauthenticated socket by default.

Add relay unit/integration tests.

---

## F. Frontend integration

Upgrade the Crew tab from static mock cards into a usable development flow backed by CrewLink state.

Required states:

- no ride group
- ride group created
- friend added locally
- location sharing off
- location sharing on
- cloud connected
- nearby available/unavailable
- mesh radio not paired
- mesh radio simulated connected
- buddy live
- buddy recent
- buddy stale
- buddy unknown
- peer removed/revoked
- offline with queued outbound update

Required UI elements:

- current ride-group card
- explicit location-sharing consent control
- transport status summary
- buddy row with last update age and source transport
- “live/recent/stale” labels with text, not color alone
- simulated connection controls in a clearly labeled developer panel
- delete local crew/location data action
- radio pairing placeholder that says hardware is required
- no fake “satellite” or “long range” claim

The Map tab may show simulated buddy markers, but it must display source/staleness correctly and remain map-first.

Preserve the current design system unless the UI agent identifies measurable issues. Do not rewrite the whole shell for style.

---

## G. Android/iOS boundary plan

Create:

```text
docs/CREWLINK_PLATFORM_BOUNDARIES.md
```

Document:

- shared TypeScript responsibilities
- Android native adapter boundary
- iOS native adapter boundary
- future nearby transport adapter
- future BLE/Meshtastic adapter
- future background location service
- permissions that will be needed later
- why Chrome/web validation is supplemental rather than proof of native behavior

No real permissions are required in this stage unless a dependency genuinely requires them. Do not add speculative permissions.

---

# Required testing and QA

## Unit tests

Cover:

- protocol validation
- malformed and expired envelopes
- duplicate and out-of-order packets
- presence state thresholds
- retention pruning
- outbox retry limits
- multi-transport deduplication
- consent disabled behavior
- group mismatch rejection
- reduced precision
- rescue/emergency override rules if implemented

## Integration tests

At minimum:

1. two simulated riders join the same group
2. rider A sends a position
3. rider B receives it
4. duplicate delivery through two transports is stored once
5. delayed packets do not replace newer positions
6. link loss moves the buddy from live to recent to stale
7. queued outbound messages retry after reconnection
8. revoked sharing stops new sends

## Relay tests

Test:

- valid room join
- invalid token
- wrong group
- malformed message
- oversize message
- rate limit
- disconnect/reconnect
- two-client location delivery

## Browser and visual QA

Use Chrome access or Chrome DevTools MCP.

Run the Expo web target and interact with the app rather than only inspecting source code.

Test at these viewport sizes:

- 360 × 800
- 390 × 844
- 412 × 915
- 768 × 1024

Test font scaling or browser text scaling where practical.

Click and inspect:

- all five tabs
- Crew ride-group creation
- sharing consent
- all simulated transport states
- buddy live/recent/stale changes
- map buddy markers
- data deletion confirmation
- SOS tab regression
- back/close interactions

Look specifically for:

- clipped text
- overlapping controls
- unsafe top/bottom areas
- broken scroll
- hidden buttons
- unreadable contrast
- undersized touch targets
- accidental double actions
- labels relying only on color
- modal/sheet content behind navigation
- landscape/tablet disasters

Capture screenshots into:

```text
artifacts/stage-2-visual-qa/
```

Create:

```text
docs/audits/STAGE_2_VISUAL_QA.md
```

Chrome verification does not replace native verification.

## Native/build QA

Run all applicable checks, including:

```text
npm run typecheck
npm test
npm run lint
npx expo export --platform android
```

Also run the relay build/tests.

If an Android emulator or connected device is available, launch and smoke-test it. If unavailable, document exactly what was and was not validated.

On Windows, do not claim an iOS build passed. Perform static/config parity review and document remaining Mac/iPhone validation.

---

# Required documentation and process updates

Create or update:

```text
AGENTS.md
docs/BUILD_TRACKER.md
CHANGELOG.md
docs/adr/ADR-0002-CREWLINK-OFFGRID-BUDDY-TRANSPORT.md
docs/LOCAL_DATA_MODEL_STAGE_2.md
docs/CREWLINK_PLATFORM_BOUNDARIES.md
docs/audits/STAGE_2_DEPENDENCY_AUDIT.md
docs/audits/STAGE_2_SECURITY_PRIVACY_REVIEW.md
docs/audits/STAGE_2_VISUAL_QA.md
docs/audits/STAGE_2_QA_REPORT.md
docs/STAGE_2_IMPLEMENTATION_REPORT.md
```

Add this permanent studio rule to `AGENTS.md`:

> Every milestone must use independent architecture, QA, UI/UX, and security/privacy review when relevant. UI changes must be interacted with in a browser or device, inspected at multiple viewport sizes, and checked for clipping, overlap, safe-area, scroll, accessibility, and state clarity. Browser testing is supplemental to native platform validation.

Update the build tracker to show Stage 2 as `Needs audit`, not `Accepted`.

---

# Explicit non-goals

Do not add or claim:

- real phone GPS
- Android foreground location service
- iOS background location
- MapLibre
- real map tiles
- real nearby/Bluetooth/Wi-Fi Direct transport
- real Meshtastic connection
- purchased radio hardware
- satellite connectivity
- production user accounts
- production authentication
- production cloud deployment
- public friend discovery
- public location sharing
- guaranteed radio range
- trail legality claims
- automatic `npm audit fix --force`

Do not expose exact location in logs, screenshots, test snapshots, or sample data using a real person’s home/work coordinates.

---

# Acceptance gate

Stage 2 passes only if:

- the previous Stage 0/1 baseline is still green
- dependency findings are classified and documented
- CrewLink has transport-independent protocol and coordinator boundaries
- local persistence is implemented behind interfaces
- simulators reproduce real failure modes
- local dev relay works and is clearly non-production
- Crew UI accurately shows connectivity and staleness
- location sharing requires explicit consent
- cross-transport duplicate positions are handled
- tests cover failure modes, not only happy paths
- Chrome visual interaction was completed and documented
- Android export/build check passes
- iOS compatibility review is documented honestly
- security/privacy agent has reviewed the design
- all docs and tracker entries are updated

---

# Final response format

Return exactly these sections:

1. **Stage result:** pass / needs fixes / blocked
2. **Executive summary**
3. **Architecture decision**
4. **Subagents used and their findings**
5. **Skills/MCP used**
6. **Files created/changed**
7. **Dependency audit**
8. **Commands run**
9. **Test results**
10. **Browser visual QA results**
11. **Android validation**
12. **iOS parity review**
13. **Security/privacy findings**
14. **Known limitations**
15. **Evidence/artifact paths**
16. **Recommended Stage 3**
17. **Exact questions requiring product-owner decisions**

Stop after Stage 2. Do not start real GPS, MapLibre, nearby radio, Meshtastic, or production backend work.
