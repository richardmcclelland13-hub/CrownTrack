# Stage 2.1 visual QA

Status: browser matrix complete; native text-scale and lifecycle checks remain pending.

| Viewport | Result | Evidence |
| --- | --- | --- |
| 360x800 | Pass: Map, CrewLink group creation, consent, queue, deletion, hazard separation, 48px visible controls, no horizontal overflow | `artifacts/stage-2-1-visual-qa/360x800-map.png`, `360x800-crew-persistence.png` |
| 390x844 | Pass: corrected SOS badge, wrapped rescue metrics, and redacted mock coordinate; no horizontal overflow | `artifacts/stage-2-1-visual-qa/390x844-sos-redacted.png` |
| 412x915 | Pass: Map and bottom tabs visible; no horizontal overflow | `artifacts/stage-2-1-visual-qa/412x915-map.png` |
| 768x1024 | Pass: packs/tablet layout and bottom tabs visible; no horizontal overflow | `artifacts/stage-2-1-visual-qa/768x1024-packs.png` |

All tested viewports returned `scrollWidth === innerWidth`. Map, Packs, Plan, Crew, and SOS tabs were opened. Consent gate, live/recent/stale/unknown states, queueing, transport controls, two-step deletion, hazard/SOS separation, and text labels alongside status colours were exercised.

Browser Back returns to the prior blank page after tab changes because app tabs are local state, not browser history. This is documented browser behavior, not a native Android back-button result. Browser tooling cannot prove system font scaling, keyboard, rotation, screen-reader focus, or native safe-area/system-bar behavior.
