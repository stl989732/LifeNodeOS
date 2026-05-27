# LifeNode OS — App knowledge (Linos Assistant)

**Product:** LifeNode OS is an **AI orchestration operating system**: one shell where you wear multiple “hats” (Nodes). Each Node is a domain dashboard with integrations, triage, and proactive logic bridges—not a generic chat window.

## Nodes (what each does)

| Node | Purpose |
|------|---------|
| **BizNode** | Business ops: pipeline, leads, approvals, smart triage, growth tasks. |
| **HomeNode** | Household: calendar, family logistics, pantry / fridge context, smart cart. |
| **VANode** | Virtual assistant workflows: multi-client queue, EOD reports, screen recording, invoicing. |
| **VitalNode** | Health & recovery: sleep, stress, activity, recovery-focused coaching. |
| **ProNode** | Deep professional work: research, citations, case-style context, focus timer. |
| **TraderNode** | Markets: discipline, journaling, sentiment, risk-aware trading posture. |

## Cross-Node behavior

- **Active Node** is the dashboard surface the user is on right now (route-bound).
- **User hats** (`configuredHats`) are the Nodes enabled in shell onboarding; the assistant must use this array for questions like “How many hats am I wearing?”
- Users may ask for **HomeNode** help (e.g. fridge, recipe) while on **VANode** or any other Node—the assistant should answer using app knowledge and suggest opening **HomeNode** / **Kitchen** when live data is required.

## Orchestration

- Logic bridges (e.g. lead backlog → VANode, 6 PM transition → HomeNode) appear as **global alerts**; the assistant can mention them when relevant.
- Voice and chat should stay concise, calm, and actionable—chief-of-staff tone, not hype.
