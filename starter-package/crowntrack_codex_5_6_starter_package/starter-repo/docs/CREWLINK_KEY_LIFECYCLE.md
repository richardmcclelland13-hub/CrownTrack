# CrewLink key lifecycle

| Phase | Private seed | Public metadata | Required action |
| --- | --- | --- | --- |
| Clean install | Absent | Absent | Rider may explicitly create identity |
| Ready | SecureStore only | SQLite | Pairing/signing may proceed |
| Missing private key | Absent | SQLite | Reset; never regenerate silently |
| Reset required | Present without matching public row, malformed, or mismatched | Possibly present | Explicit destructive reset |
| Revoked peer | N/A | SQLite with `revoked_at` | Explicit re-pair policy; old identity cannot restore |
| Complete deletion | Absent | Identity/trust/pairing tables empty | Relaunch remains `not_created` |

Private seeds never enter SQLite, React state, logs, errors, normal UI, accessibility labels, or committed evidence. Public fingerprints are shortened in the UI. Development simulator keys are fixed, explicitly non-secret fixtures and never represent a physical rider or production identity.
