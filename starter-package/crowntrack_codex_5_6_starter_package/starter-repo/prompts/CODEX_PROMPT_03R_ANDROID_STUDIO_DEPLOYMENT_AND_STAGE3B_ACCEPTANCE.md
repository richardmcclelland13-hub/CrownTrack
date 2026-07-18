# CrownTrack ADV — Prompt 03R
## Android Studio deployment recovery, complete Stage 3B native acceptance, and GitHub synchronization

You are the principal CrownTrack implementation engineer, Android native-debugging lead, security reviewer, QA owner, and release owner for this bounded milestone.

Use CodexPro as the primary repository interface.

Work from the existing feature branch:

`stage-3b-signed-membership-messages`

Expected current `HEAD`:

`e720703 chore(crewlink): checkpoint reciprocal-trust acceptance recovery`

Earlier coherent Stage 3B checkpoint:

`2b15104 chore(crewlink): checkpoint Stage 3B acceptance closure`

Accepted product baseline:

`3fcdc8a stage 3a: add secure device identity and pairing`

Real source repository:

`starter-package/crowntrack_codex_5_6_starter_package/starter-repo/`

User-authorized GitHub repository:

`https://github.com/richardmcclelland13-hub/CrownTrack`

Normalized HTTPS Git remote:

`https://github.com/richardmcclelland13-hub/CrownTrack.git`

The user reports that Android Studio is open and an Android virtual device is running. Treat that as a useful starting condition, but verify the actual emulator serial, state, package, viewport, density, and bundle before relying on it.

This is a continuation from a committed Stage 3B recovery checkpoint. It is not a rewrite, re-scaffold, dependency modernization, repository cleanup, or Stage 4A implementation session.

Do not guess. Do not assume a remote is empty, authentication works, a branch was pushed, Android Studio targets the expected checkout, Metro serves the current source, a tap succeeded, state persisted, or documentation is current. Prove every material claim.

---

# 1. Verified starting checkpoint

Verify these facts against the live workspace before relying on them:

- current branch is `stage-3b-signed-membership-messages`;
- current `HEAD` is `e720703`;
- Stage 3B remains `Needs fixes`, not accepted;
- no Stage 3B acceptance commit exists;
- local Git currently has no configured remote or upstream;
- GitHub CLI was previously unavailable;
- the user has now supplied the exact GitHub repository URL;
- the worktree contains unrelated outer package material, old untracked prompts, `.ai-bridge`, ZIPs, stage inputs, and five apparent CRLF-only skill metadata diffs;
- checkpoint `e720703` contains the Hermes recovery and honest records only;
- the native reciprocal-trust failure was reproduced from confirmed pairing and an epoch-1 local-owned group;
- the visible sanitized native error was `Property 'structuredClone' doesn't exist`;
- the proven failure layer was the signed in-memory repository/harness clone path under Hermes;
- the portable clone fallback replaced those runtime calls;
- a focused no-`structuredClone` regression now proves reciprocal trust and an epoch-2 membership grant;
- latest recorded Windows checks passed with 73/73 unit tests and 13/13 relay tests;
- latest recorded Android export bundled 641 modules at about 2.3 MB;
- Expo Doctor passed 18/18 and dependency alignment passed;
- latest recorded audits are 17 advisories: 6 high, 11 moderate, 0 critical;
- repaired source has not yet been proven on-device;
- the previous release install path failed during Expo/Gradle embedding because `index.js` was resolved from the monorepo root instead of the Expo app root;
- the remaining signed membership, policy/outbox/ACK/retry, inbound/adversarial/Map, lifecycle, deletion, visual, and accessibility matrices remain incomplete;
- generated Android projects, APKs, databases, logs, raw screenshots, UI XML, keys, invitations, signatures, envelopes, and exact coordinates must remain untracked.

When live evidence differs, record the difference and use live evidence as truth.

---

# 2. Terminal objective

Complete one large, continuous engineering session with this endpoint:

1. establish exact local Git and GitHub truth;
2. configure the supplied GitHub repository as `origin` when safe;
3. authenticate without exposing credentials;
4. push the existing committed Stage 3B history without force or rewrite;
5. verify the active Android Studio emulator and checkout;
6. get the current repaired JavaScript and native runtime onto that emulator using the simplest correct development path;
7. prove whether the previous monorepo entry-resolution failure is command invocation, Metro lifecycle, generated native configuration, or another exact cause;
8. fix only the proven deployment/build defect;
9. add focused regression or build-contract coverage when the defect belongs in source control;
10. complete the full Stage 3B Android native matrix;
11. complete visual and accessibility acceptance;
12. run all final Windows validation and dependency commands;
13. synchronize permanent documentation and sanitized evidence;
14. perform bounded final QA, architecture, security, and Git-scope review;
15. mark Stage 3B accepted only when every gate passes;
16. create and push the final scoped commit to the supplied GitHub repository.

Do not stop after adding `origin`, pushing the checkpoint, launching Metro, installing a debug build, fixing the first build issue, proving reciprocal trust, passing automated tests, or collecting partial screenshots.

Continue until Stage 3B is accepted or a genuine external blocker remains after the running Android Studio/emulator path and reasonable recovery methods have been exhausted.

Do not begin Stage 4A.

---

# 3. Mandatory CodexPro workflow

At the start:

1. call `open_current_workspace`;
2. call `read_handoff`;
3. call `show_changes` scoped to the real starter repo;
4. verify branch, `HEAD`, and checkpoint commits;
5. inspect the committed file lists for `2b15104` and `e720703`;
6. verify the real source root;
7. update `.ai-bridge/current-plan.md` so Prompt 03R is the active plan before source edits;
8. preserve the existing committed history and mixed worktree.

Use CodexPro `read`, `search`, `tree`, `show_changes`, `edit`, `apply_patch`, and `write` for repository inspection and edits.

Use native Windows PowerShell, Android Studio, ADB, Gradle, Expo CLI, Git, Git Credential Manager, and GitHub CLI where those tools are required.

CodexPro safe-shell restrictions are not proof that ADB, Git mutation, Android Studio, or GitHub operations are unavailable. Execute those operations from the trusted native Windows/Codex environment available to the implementation session.

Do not run Node or Expo verification from WSL against Windows-installed `node_modules`.

Avoid broad recursive reads, repeated full diffs, shell pipelines that hide failing exit codes, and rereading every prior Stage 3B prompt.

Prompt 03R is the execution authority for this session.

---

# 4. Required skills and research rules

Read and apply these repository skills before the corresponding work:

- `skills/location-sharing-security/SKILL.md`;
- `skills/local-first-storage/SKILL.md`;
- `skills/crewlink-transport/SKILL.md`;
- `skills/mobile-visual-qa/SKILL.md`;
- `skills/dependency-audit/SKILL.md`;
- `skills/qa-audit/SKILL.md`.

Use the installed GitHub publishing workflow for intentional remote configuration, staging, commit, and push.

Use the installed Windows computer-control capability only when it provides reliable interaction with Android Studio or its emulator. Prefer ADB/UIAutomator and Android Studio’s own run/debug tooling for deterministic device state.

For Expo, React Native Gradle Plugin, Metro, or monorepo behavior that is not demonstrated by the repository, consult only current official Expo or React Native documentation. Do not use random blog fixes, Stack Overflow snippets, or speculative Gradle patches as authority.

Relevant official principles to verify against the installed SDK/tooling rather than blindly copy:

- Expo SDK 52+ provides automatic npm-workspace monorepo support when standard Expo Metro configuration is used;
- Expo and EAS commands for a nested app should run from the Expo app directory;
- the React Native Gradle Plugin `root` should be the folder containing the app’s `package.json`;
- generated native projects may be regenerated with Expo Prebuild when they contain no required manual customizations;
- generated Android output is not product source and must not be committed in this project.

Do not perform a major Expo upgrade during Stage 3B.

---

# 5. Subagent policy and token guardrails

The main Codex agent owns:

- all decisions;
- all source edits;
- Android Studio and emulator execution;
- Git/GitHub operations;
- verification;
- evidence and acceptance decisions;
- staging, commit, and push.

Use at most two read-only subagents, and only when their bounded result can alter the implementation or acceptance decision.

Do not spawn agents merely because they are available.

Do not create duplicate reviewers, open-ended repository readers, or multiple agents investigating the same failure.

## Agent A — Android deployment/root-resolution reviewer

Use only after the main agent has reproduced the current deployment failure or proved that the app-root debug path succeeds.

Read-only scope:

- root `package.json`;
- `apps/mobile/package.json`;
- `apps/mobile/app.json`;
- `apps/mobile/index.js`;
- `apps/mobile/babel.config.js`;
- Metro configuration if present;
- generated Android `settings.gradle`, `app/build.gradle`, and Gradle properties only as local evidence;
- exact sanitized failing command and relevant task output;
- official Expo/React Native documentation already selected by the main agent.

Return no more than:

- five evidence-backed observations;
- the exact resolved app root and entry file for each tested command path;
- the single best-supported root cause;
- the smallest durable fix;
- whether the fix belongs in tracked source, generated Android output, command procedure, or no code at all;
- one focused regression/build-contract recommendation.

Do not edit files. Do not recommend an Expo major upgrade. Do not review CrewLink protocol code.

## Agent B — final Stage 3B acceptance reviewer

Use only after native and visual matrices are complete and documentation is updated.

Read-only scope:

- files changed after `e720703`;
- directly supporting Stage 3B contracts;
- sanitized native evidence and reports;
- staged Git diff.

Review only:

- app-root/build changes are minimal and reproducible;
- local pairing, reciprocal development trust, and signed membership remain distinct;
- signature, epoch, replay, tombstone, consent, retry, ACK, and deletion behavior remains correct;
- local outbound state is never presented as a buddy position;
- safe snapshots, logs, screenshots, and evidence contain no protected material;
- native, visual, and deletion claims are supported;
- permanent docs match actual commands and results;
- staged scope contains no unrelated or generated files.

Return blockers and high findings first, with exact file/line evidence. Cap output at twelve findings. Do not edit files.

The main agent must independently validate all agent findings.

When context grows, write a concise `.ai-bridge` checkpoint and continue. Do not restart discovery or ask a new agent to rediscover completed work.

---

# 6. Bounded read-first set

Read only this initial set:

1. repository `AGENTS.md`;
2. this Prompt 03R;
3. `.ai-bridge/current-plan.md`;
4. `.ai-bridge/agent-status.md`;
5. `.ai-bridge/decisions.md`;
6. `.ai-bridge/open-questions.md`;
7. `.ai-bridge/codex-status.md`;
8. commit summaries and file lists for `2b15104` and `e720703`;
9. root `package.json`;
10. `apps/mobile/package.json`;
11. `apps/mobile/app.json`;
12. `apps/mobile/index.js`;
13. `apps/mobile/babel.config.js`;
14. generated Android build files needed to understand the current local build only;
15. `apps/mobile/src/crew/useCrewDevelopment.ts`;
16. `apps/mobile/src/crew/signedDevelopmentRuntime.ts`;
17. `packages/crewlink/src/signed-development-harness.ts`;
18. `packages/crewlink/src/signed-repository.ts`;
19. focused Stage 3B tests;
20. `docs/PROJECT_STATE.md`;
21. `docs/STAGE_3B_IMPLEMENTATION_REPORT.md`;
22. Stage 3B native, visual, QA, security, iOS parity, and dependency reports;
23. Stage 3B native evidence matrices.

Read other files only for a concrete command failure, dependency, data-flow question, documentation claim, or staging decision.

---

# 7. Phase A — exact GitHub setup and checkpoint protection

The user explicitly authorizes this GitHub repository:

`https://github.com/richardmcclelland13-hub/CrownTrack.git`

## 7.1 Establish local truth

Verify:

- current branch;
- current `HEAD`;
- local commits not reachable from a remote;
- current remotes;
- current upstream;
- staged and unstaged state;
- the five skill YAML diffs;
- prohibited untracked material.

Confirm the five `skills/*/agents/openai.yaml` files are line-ending-only changes before restoring them to `HEAD`. If any semantic change exists, preserve and investigate it instead.

Do not touch unrelated untracked outer package material or old prompts.

## 7.2 Establish authentication safely

Check:

- `git --version`;
- `gh --version`;
- `gh auth status` when `gh` exists;
- active Git credential helper without printing credentials.

When `gh` is missing, prefer one of these verified paths:

1. install GitHub CLI through the trusted Windows package manager, authenticate through its browser/device flow, then verify `gh auth status`; or
2. use normal HTTPS Git with Git Credential Manager and an interactive browser sign-in.

Never:

- place a personal access token in the remote URL;
- print a token;
- save a token in `.ai-bridge`, docs, source, logs, or shell history;
- disable TLS verification;
- use a credential copied from an unrelated account.

## 7.3 Configure and verify `origin`

If no `origin` exists, add exactly:

`https://github.com/richardmcclelland13-hub/CrownTrack.git`

If `origin` already exists:

- compare it to the user-authorized repository;
- do not silently replace a different remote;
- record the mismatch and use an additional clearly named remote only when required to preserve an existing legitimate remote.

After configuration:

- run a read-only remote reference query;
- identify whether the repository is empty;
- identify its default branch when available;
- identify whether `stage-3b-signed-membership-messages` exists remotely;
- compare local and remote hashes;
- detect divergence.

Do not force-push.

Do not merge or rebase remote history without explicit evidence and a safe need.

When the remote branch is absent or strictly behind local history, push:

`stage-3b-signed-membership-messages`

with upstream tracking.

Verify that remote references contain both:

- `2b15104`;
- `e720703`.

If the remote contains unrelated or divergent history, do not overwrite it. Push the current feature branch only when Git accepts it as a normal non-force update. Otherwise preserve exact hashes and continue local work without destructive Git action.

Do not open a pull request during this session.

Update `.ai-bridge` after remote setup and checkpoint push.

---

# 8. Phase B — verify Android Studio and the virtual device

The user reports Android Studio and a virtual device are already running.

Verify rather than assume:

- Android Studio process is active;
- which project Android Studio has open;
- the open project corresponds to this checkout’s `apps/mobile/android` directory when native tooling is used;
- ADB executable location;
- all connected device serials;
- target device state is `device`, not `offline` or `unauthorized`;
- emulator API level, ABI, model, and boot completion;
- viewport and density;
- package `com.crowntrack.adv` installation and version;
- current foreground activity;
- whether the installed app is debug/development or release;
- whether port 8081 is in use;
- whether an existing Metro process serves this checkout.

Do not assume the serial remains `emulator-5554`. Resolve the active serial dynamically and use it consistently.

When multiple devices exist, select the Android Studio virtual device matching the user’s running emulator and pass the serial explicitly to ADB and Expo commands.

Keep raw logs, screenshots, UI hierarchy XML, databases, APKs, and temporary files outside the repository.

---

# 9. Phase C — load current repaired source on the emulator

Prioritize the development/debug path because Stage 3B native acceptance does not require a production release binary.

## 9.1 Use the Expo app directory as command root

Run Expo commands from:

`apps/mobile/`

Do not use an invocation that causes Expo CLI to treat the monorepo root as the app root.

Before modifying source, prove the resolved configuration:

- Expo project root;
- Metro project root;
- workspace root;
- resolved app entry file for Android;
- React Native Gradle Plugin `root`;
- Gradle `entryFile`;
- current Node and Expo CLI versions.

The correct app entry is expected to be:

`apps/mobile/index.js`

but verify the absolute path.

## 9.2 Preferred current-bundle path

Use a persistent Windows terminal or Android Studio terminal from `apps/mobile` to run the development server. It must remain alive for the entire native test session.

Preferred sequence, adjusted to live tooling:

1. start Expo/Metro for the development client with cache cleared;
2. verify Metro reports the `apps/mobile` project root;
3. reverse port 8081 for the selected emulator when required;
4. launch the installed development client/package;
5. perform the ordinary dev-menu Reload;
6. verify the current source by checking a known post-`e720703` behavior rather than relying only on timestamps;
7. confirm no red screen and no `structuredClone` failure.

Do not start Metro as a background process in a shell that terminates immediately.

## 9.3 Rebuild only when needed

When the installed development client cannot load current source or lacks required native modules, rebuild from the Expo app directory using one of:

- `npx expo run:android --device <verified-serial>`;
- Android Studio’s debug Run action against the verified emulator;
- a direct Gradle debug assemble/install task from `apps/mobile/android` when it preserves the correct app root.

Use one path at a time and capture its exact result.

Do not use a release build as the first recovery mechanism.

Do not regenerate native projects until current generated configuration and manual customization risk are inspected.

---

# 10. Phase D — resolve the monorepo entry/build issue without guessing

If the app-root development path works, document that the prior failure was specific to the previous release/embed invocation and continue native QA before spending more time on release tooling.

Still run a bounded build-contract check later so the failure is not silently left unexplained.

If the app-root development or debug build still resolves the repository-root `index.js`, reproduce the exact failure with command, working directory, Gradle task, resolved paths, and relevant sanitized output.

Classify the cause into one proven layer:

- Expo command launched from the wrong directory;
- npm workspace invocation changed effective project root;
- stale generated Android project;
- stale Metro/Expo cache;
- incorrect React Native Gradle Plugin `root`;
- incorrect `entryFile` resolution;
- Android Studio opened a different checkout or native directory;
- stale Gradle daemon/build cache;
- drive/substitution path mismatch;
- another evidence-backed cause.

Use Agent A only after the main agent has collected this evidence.

## 10.1 Smallest-fix rule

Prefer fixes in this order:

1. correct command working directory and persistent Metro lifecycle;
2. clear only the relevant Metro/Expo/Gradle cache;
3. correct a tracked package script or documented native-launch command;
4. regenerate the untracked Android project with `npx expo prebuild --clean --platform android` only after confirming there are no required manual native customizations;
5. add a minimal tracked Expo config/plugin or build-contract script only when the generated default cannot represent the required monorepo root;
6. patch generated native files only as a local diagnostic, never as the final tracked solution.

Do not:

- hardcode the user’s absolute Windows path in source;
- hardcode an emulator serial;
- commit `apps/mobile/android`;
- commit a debug keystore;
- add a second `index.js` at the repository root as a workaround;
- copy the app into a new repository;
- disable workspace resolution;
- upgrade Expo major versions;
- delete user state to hide a build defect.

## 10.2 Build regression proof

When the issue requires a tracked source change, add the smallest meaningful proof, such as:

- a script that resolves and asserts the Expo app root and Android entry file;
- a package-script test proving native commands execute with `apps/mobile` as the project root;
- a configuration test around a source-controlled build helper.

Do not add a brittle test that only searches text in generated Gradle files.

When no source defect exists, do not invent a code change. Record the corrected procedure and continue.

Update `.ai-bridge` after current-source deployment succeeds.

---

# 11. Phase E — prove the Hermes reciprocal-trust repair on-device

From a state with:

- READY identity;
- confirmed local pairing;
- local-owned epoch-1 group;
- reciprocal trust not yet confirmed;

use fresh UIAutomator bounds to execute `Confirm reciprocal development trust`.

Prove:

- the control is enabled and reachable;
- the action runs;
- the visible state changes to reciprocal trust confirmed;
- sanitized `lastAction` reports success;
- no `structuredClone` error appears;
- membership remains unauthorized until the explicit grant;
- the grant gate becomes enabled only after both local pairing and reciprocal simulator trust;
- explicit signed grant advances the local group to epoch 2;
- development rider membership becomes active;
- persisted local membership survives force-stop/relaunch;
- simulator-only reciprocal state is represented honestly after a new runtime.

Do not auto-confirm reciprocal trust.

Do not persist fake remote simulator trust as though it were physical-peer local trust.

Do not bypass explicit signed membership.

If the repair still fails, capture sanitized `lastAction` and filtered application logs, prove the new failure layer, fix only that defect, add focused regression, and repeat.

---

# 12. Phase F — complete the remaining Stage 3B native matrix

Execute the full matrix, not a representative sample.

## 12.1 Identity and pairing

Prove:

- explicit identity creation;
- stable fingerprint after relaunch;
- private seed absent from SQLite and evidence;
- invitation validation alone creates no trust;
- Cancel and Android Back clear staged pairing state;
- explicit pairing confirmation creates local trust;
- confirmed pairing uses the expected development-rider public key;
- missing-key simulation enters visible recovery without silent regeneration.

## 12.2 Membership, epochs, and tombstone

Prove:

- epoch-1 local-owned group;
- reciprocal simulator trust action;
- explicit epoch-2 signed grant;
- active membership persistence;
- unauthorized mutation blocked;
- owner self-revocation blocked;
- explicit revocation advances to epoch 3;
- terminal tombstone persists;
- same identity cannot be re-granted in Stage 3B;
- delayed epoch-2 traffic is rejected after revocation.

## 12.3 Consent, policy, outbox, ACK, and retry

Prove:

- sharing defaults off;
- reduced precision and 15-minute retention;
- policy changes invalidate consent/sharing when required;
- consent and sharing remain separate actions;
- queueing is blocked without active membership, consent, and sharing;
- offline queue persists;
- cloud reconnect flushes durable outbox state;
- only a valid verified ACK clears the intended item;
- forged ACK does not clear the item;
- consent revocation and sharing disable purge unauthorized queued updates;
- retry authorization is checked again before metadata commit;
- connected transport is never presented as a current buddy position.

## 12.4 Inbound buddy, duplicate, tamper, and Map

Prove:

- signed development-rider message is delivered remote-to-local;
- local repository stores the accepted remote position;
- Map consumes safe fixed/mock geometry and freshness/source metadata only;
- local outbound queue or ACK never creates a buddy marker;
- nearby duplicate adds an observation without a second position;
- tampered message is rejected and receives no ACK;
- forged/untrusted ACK is rejected;
- old-epoch message is rejected after revocation;
- retained revoked position appears as `LAST KNOWN — REVOKED`, never live;
- no exact coordinates, keys, signatures, raw envelopes, invitations, or device IDs appear in UI, logs, screenshots, or committed evidence.

## 12.5 Runtime lifecycle

Prove:

- one local SQLite repository is authoritative;
- start is idempotent;
- stop removes subscriptions;
- repeated reconstruction does not duplicate subscriptions or records;
- fresh reconstruction hydrates pairing, group, membership, tombstone, policy, outbox/ACK, accepted inbound buddy, and newest rejection state;
- force-stop/relaunch is distinguished from an ordinary dev-menu Reload;
- volatile simulator state is not mislabelled as persisted local authority.

## 12.6 Complete deletion and two clean relaunches

From a populated state, execute complete local deletion.

Prove removal of:

- identity metadata;
- secure private key;
- staged invitations;
- trusted peers;
- groups;
- memberships;
- tombstones;
- policies;
- outbox;
- accepted locations;
- ACKs;
- observations;
- rejections.

Then prove:

- UI returns to `NOT CREATED`;
- first clean relaunch remains empty;
- second clean relaunch remains empty;
- identity is not silently recreated;
- recipient/backups disclosure remains visible.

Use sanitized row counts and schema names only. Never commit a raw database.

---

# 13. Phase G — visual and accessibility acceptance

Apply the mobile visual QA skill using the running Android emulator and supported device profiles.

Verify:

- 360×800;
- 390×844;
- 412×915;
- 768×1024.

Use emulator resizing, additional AVD profiles, or a documented equivalent that genuinely produces the required logical viewport. Record the actual viewport and density for each result.

Across the collective matrix verify:

- all five tabs;
- SOS regression;
- Crew scrolling reaches every action and final status;
- reciprocal-trust action and result remain reachable;
- no clipping, overlap, hidden controls, or unreachable content;
- safe areas;
- Android Back dismissal;
- manual invitation keyboard cleanup;
- destructive confirmation dismissal;
- long development-rider name;
- large comparison code;
- disabled reasons;
- text-plus-color status;
- practical text scaling;
- approximately 48dp field-critical targets;
- Map live/recent/stale/unknown/revoked wording;
- no protected material in screenshots.

Screenshots must be sanitized before entering the repository.

Browser evidence may supplement but never replace native evidence.

---

# 14. Phase H — focused and final Windows verification

After each source fix, run the narrowest relevant tests first.

Then run the full native-Windows gate from the real starter repo:

```powershell
npm run typecheck
npm test
npm run test:relay
npm run lint
npm run export:android
npx expo-doctor
npx expo install --check
npm ls --depth=0
npm audit --json
npm audit --omit=dev --json
```

Also run the corrected Android development/build contract from `apps/mobile` and record:

- working directory;
- resolved project root;
- resolved entry file;
- selected emulator serial;
- build/install result;
- current-source reload result.

Record exact:

- unit-test total;
- relay-test total;
- Android export module count and bundle size;
- Expo Doctor result;
- Expo dependency alignment;
- top-level package health;
- full audit counts;
- omit-dev audit counts;
- direct/transitive and runtime/build/dev exposure;
- whether non-breaking remediation exists.

Do not copy old totals.

Do not run `npm audit fix --force`.

Do not upgrade Expo major versions.

---

# 15. Phase I — permanent documentation and sanitized evidence

Update verified facts consistently in:

- `CHANGELOG.md`;
- `README.md`;
- `docs/BUILD_TRACKER.md`;
- `docs/PROJECT_STATE.md`;
- `docs/STAGE_3B_IMPLEMENTATION_REPORT.md`;
- `docs/CREWLINK_DATABASE_SCHEMA_STAGE_3B.md` when schema facts changed;
- `docs/CREWLINK_GROUP_MEMBERSHIP_PROTOCOL.md` when simulator-state clarification changed;
- `docs/CREWLINK_SIGNED_MESSAGE_PROTOCOL.md` when protocol behavior changed;
- `docs/audits/STAGE_3B_ANDROID_NATIVE_QA.md`;
- `docs/audits/STAGE_3B_VISUAL_QA.md`;
- `docs/audits/STAGE_3B_QA_REPORT.md`;
- `docs/audits/STAGE_3B_SECURITY_REVIEW.md`;
- `docs/audits/STAGE_3B_IOS_PARITY_REVIEW.md` when source changes affect parity;
- `docs/audits/STAGE_3B_DEPENDENCY_AUDIT.md`;
- `artifacts/stage-3b-native-qa/README.md`;
- `artifacts/stage-3b-native-qa/EVIDENCE_MATRIX.md`;
- `artifacts/stage-3b-native-qa/ANDROID_ACCEPTANCE_MATRIX.md`;
- `artifacts/stage-3b-native-qa/DATABASE_TRUTH_REDACTED.md`.

Remove stale claims about:

- no Git remote;
- no pushed checkpoint;
- 72 tests when the final total differs;
- repaired source not running on-device;
- reciprocal trust remaining blocked by `structuredClone`;
- release/embed failure being the active native blocker when corrected;
- incomplete matrices that are now complete;
- Stage 3B acceptance status.

Keep iOS runtime explicitly unverified/static-only unless actually run.

Do not fabricate evidence from source inspection.

---

# 16. Durable memory protocol

Maintain concise operational memory throughout the session.

Update:

- `.ai-bridge/current-plan.md` — active workstream and next action;
- `.ai-bridge/agent-status.md` — files touched, commands, exact results, native proof, GitHub state, blockers;
- `.ai-bridge/decisions.md` — durable architecture/security/build/release decisions only;
- `.ai-bridge/open-questions.md` — unresolved external blockers or product-owner choices only;
- `.ai-bridge/codex-status.md` — current terminal result;
- `.ai-bridge/execution-log.jsonl` — one concise event per meaningful checkpoint;
- `.ai-bridge/implementation-diff.patch` — final review-oriented diff when practical.

Required checkpoints:

1. local Git and worktree truth;
2. GitHub authentication/remote verification;
3. push of existing checkpoints;
4. Android Studio/emulator truth;
5. app-root and entry-resolution proof;
6. current repaired bundle running on-device;
7. reciprocal repair proof;
8. membership/delivery/adversarial matrix;
9. lifecycle/deletion matrix;
10. visual/accessibility matrix;
11. final Windows checks and audits;
12. final review;
13. final commit and push.

Do not place credentials, tokens, raw command logs, raw UI XML, exact coordinates, signatures, keys, invitations, or giant copied diffs in memory.

`.ai-bridge` remains uncommitted operational memory.

If context pressure appears, update memory and continue. Do not return a progress-only response while executable work remains.

---

# 17. Final bounded review

Before staging:

1. call `show_changes` for the real starter repo;
2. compare changes against `e720703`;
3. inspect every changed tracked file;
4. verify the five skill YAML files are clean or excluded;
5. run Agent B when useful;
6. resolve all blocker/high findings;
7. rerun affected focused checks;
8. verify permanent docs match final evidence;
9. verify no generated Android source or protected material is included;
10. verify no old prompts or outer package files are swept in;
11. verify primary Crew and Map paths remain signed v2;
12. verify legacy v1 remains isolated;
13. verify no Stage 4A implementation exists;
14. inspect staged names and staged diff before commit.

Do not perform speculative cleanup or broad refactors.

---

# 18. Stage 3B acceptance gate

Mark Stage 3B `Accepted` only when all of these pass:

- supplied GitHub remote configured and verified;
- checkpoint commits pushed without rewrite;
- running Android emulator verified;
- current repaired source loaded on-device;
- app-root/entry resolution is correct and reproducible;
- no Hermes `structuredClone` failure remains;
- reciprocal trust works immediately and visibly;
- local pairing, reciprocal simulator trust, and signed membership remain separate;
- explicit signed grant produces persisted epoch-2 membership;
- schema-v9 repair and rejection ordering remain passing;
- identity/private-key isolation passes;
- consent/policy/outbox/ACK/retry matrix passes;
- inbound buddy/duplicate/tamper/Map matrix passes;
- epoch-3 revocation/tombstone/old-epoch matrix passes;
- lifecycle/reconstruction matrix passes;
- complete deletion plus two clean relaunches passes;
- visual/accessibility matrix passes;
- final Windows commands pass;
- final review has no unresolved blocker/high finding;
- permanent docs and evidence are current and sanitized.

If any gate remains unverified, use `Needs fixes` or `Blocked` consistently.

Do not claim acceptance because the code appears correct or portable tests pass.

---

# 19. Commit and push policy

The working tree is mixed. Stage explicit paths only.

Never use `git add -A` from the outer workspace.

Intentionally include this execution prompt in the final scoped commit:

`prompts/CODEX_PROMPT_03R_ANDROID_STUDIO_DEPLOYMENT_AND_STAGE3B_ACCEPTANCE.md`

Do not stage older untracked prompts.

## Accepted path

When every acceptance gate passes:

1. update permanent docs to `Accepted`;
2. update `.ai-bridge`, but do not stage it;
3. stage only intentional source, tests, this 03R prompt, docs, and sanitized evidence changed after `e720703`;
4. inspect staged file names and staged diff;
5. create one commit:

   `feat(crewlink): accept Stage 3B signed membership and messages`

6. record the exact hash;
7. inspect the committed file list;
8. push the current branch to the supplied `origin`;
9. verify the remote branch contains `2b15104`, `e720703`, and the new acceptance commit;
10. do not open a pull request unless the user separately requests one.

## Honest checkpoint path

When Stage 3B remains incomplete but:

- deployment/build root cause is fixed or accurately isolated;
- source is coherent;
- automated checks pass;
- docs remain honest;
- staged scope is clean;
- no protected material exists;

create one commit:

`chore(android): checkpoint Stage 3B native acceptance recovery`

Include the 03R prompt and honest updated records. Push the feature branch and keep Stage 3B `Needs fixes` or `Blocked`.

## Do-not-commit path

Do not create a new commit when:

- source is knowingly broken;
- code-related automated gates fail;
- staged scope cannot be proven clean;
- secrets or raw evidence are present;
- documentation materially misstates the result.

The already committed checkpoints should still be pushed when remote/auth state is safe and non-divergent.

Never force-push.

Never amend `e720703`.

Never merge, tag, release, or push generated Android files.

---

# 20. Non-goals

Do not add or begin:

- Stage 4A MapLibre implementation;
- real GPS or background location;
- production networking or accounts;
- Bluetooth, Nearby Connections, or Meshtastic;
- real GPX workflows;
- production Alberta data ingestion;
- location-content encryption;
- Expo major upgrade;
- unrelated UI redesign;
- unrelated repository cleanup.

Do not claim:

- signatures encrypt location content;
- signed data proves physical truth;
- transport connectivity guarantees delivery;
- CrewLink is emergency-service or satellite communication;
- local deletion recalls peer or backup copies;
- simulator reciprocal trust is a persisted physical-peer state.

---

# 21. Required final response

Return these sections using verified facts only:

1. **Stage result** — accepted / needs fixes / blocked
2. **Executive summary**
3. **Verified starting Git state**
4. **GitHub authentication, remote, upstream, and checkpoint push result**
5. **CodexPro and subagent usage**
6. **Android Studio and emulator verification**
7. **Expo app-root and entry-resolution evidence**
8. **Deployment/build root cause and fix**
9. **Files changed**
10. **Hermes reciprocal-trust on-device proof**
11. **Identity and pairing proof**
12. **Membership, epoch, and tombstone proof**
13. **Consent, policy, outbox, ACK, and retry proof**
14. **Inbound buddy, duplicate, tamper, and Map proof**
15. **Lifecycle and reconstruction proof**
16. **Complete deletion and two-relaunch proof**
17. **Visual and accessibility results**
18. **Automated commands and exact totals**
19. **Dependency and security residual risks**
20. **Permanent documentation and evidence updates**
21. **Final Git scope review**
22. **Final commit hash, branch, remote, upstream, and push verification**
23. **Known limitations**
24. **Product-owner decisions still required**
25. **Recommended next milestone**

The recommended next milestone after genuine Stage 3B acceptance is a separately scoped Stage 4A MapLibre local-pack spike.

Do not implement Stage 4A in this session.

Do not return a progress-only checkpoint while executable work remains.
