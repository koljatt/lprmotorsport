# Flying-lap requalification after a lost verified lap

Status: DESIGN / NOT IMPLEMENTED. Never deploy or enable the requalification endpoint before its tests pass.

## Required gameplay

A failed verification must never move, stop, or reset the car. Continue the existing
120 Hz local simulation with the same car, obstacle, steering and lap timing state.
The affected lap is marked practice-only. The game keeps trying to reconnect
without interrupting driving.

At a later **start/finish crossing**, the new flying lap becomes official only if
the server is available **and** has already reconstructed and acknowledged the
trusted vehicle/world state at that crossing. If not, the crossing remains practice;
keep racing and try again at the next crossing. Do not retroactively mark laps
official after their start. No start lights, artificial countdown or grid reset.

UI states: Verified -> Recovering -> Practice (verification unavailable) ->
Requalifying (server rebuilding state) -> Verified flying lap (at an authorized
crossing). Show clear messages; do not claim a lap is verified before receipt.

## Security rule (non-negotiable)

A new server instance cannot accept client-provided coordinates, velocity,
physics/obstacle state, start tick, or timing as its authoritative flying start.
The only trustable start is a server-simulated checkpoint. Never turn an
unverified lap into an official lap by assigning a fresh session ID.

Potential implementation: bounded catch-up requalification.

1. During an official drive, record a bounded, ordered input history starting
   at a server-known canonical standing start, plus lap-boundary tick markers.
   Keep history after the session is lost while the player remains in the same
   uninterrupted local simulation. Recording must not use analytics consent.
   Cancel recovery if no trusted anchor/history exists or the history cap is hit.
2. Wake the verification service in parallel. Mint a short-lived signed start
   ticket, create a catch-up-only server session, and stream the original input
   history to it. Verify revision, identity, input hashes, consecutive ticks,
   simulation, car/people/obstacle state, and trusted checkpoint consistency.
   Server processes catch-up within tight CPU, memory, rate and age limits.
3. Absolutely **no signed lap receipts** can be produced in catch-up mode,
   regardless of how many finish lines are crossed. The server rejects
   fast-forward / catch-up requests from normal timed sessions.
4. When the simulation catches up to the player's live local simulation,
   wait for the next finish-line event. Flush and acknowledge precisely up to
   its tick. Only the server can establish that this tick is a legitimate lap
   boundary and that its reconstructed state matches. Resume strict wall-clock
   pacing from this checkpoint, and set an immutable eligibility boundary.
5. Only laps **beginning after** the server-authorized boundary receive
   signatures. All earlier laps stay practice-only. Maintain server checks for
   wall-clock lead, excessive lag, ordered batches, rate limits, revisions,
   races, session ownership, retries and crashes.
6. If the service cannot catch up before the crossing, do not try to
   backdate an official start. Try again at the next crossing. On mismatch,
   invalidate the candidate, show a reason, and never forge a state.
7. A hidden tab, restarted client simulation, corrupted/missing input history,
   expired session or unrecoverable physics divergence must fail closed. Never
   auto-reset the driving car; allow an explicit new standing start instead.

## Acceptance tests (must be automated before enabling)

- Official lap 1 interrupted mid-lap, recovery finishes before the next line:
  no teleport, lap 1 not saved, lap 2 can be signed if fully server-verified.
- Recovery completes just *after* a line: lap 2 remains practice, lap 3 can be
  official. No backdated receipts, irrespective of when the page saw the status.
- Failure during flying lap 2: lap 2 practice, later authorized flying lap
  official; state/velocity visually and physically continuous at every crossing.
- Two concurrent human/browser sessions; retries and duplicate/out-of-order
  input batches cannot duplicate receipts or alter acknowledged controls.
- Forged client coordinate/speed, fabricated crossing, modified history or
  attempt to submit a catch-up lap: server refuses. Signing starts only after
  the immutable authorized boundary.
- Service restart, 5/15/30-second network loss, 429 and 503 responses,
  slow render frame, lost acknowledgement, catch-up CPU timeout and exhausted
  replay limits: neither an invalid signed score nor a forced reset.
- Real 3D Chrome keyboard / touch control, at least three consecutive laps,
  at 60 and lower fps, and a two-player real-time test on the target service.

## Existing implementation

`verified-driving.js` currently cancels a failed session and preserves practice
driving; it has no trusted reconstruction/requalification path.
`verification/sessions.cjs` starts simulations only from its canonical grid
and does not support catch-up-only/rearm phases.
`experiment/live-client.js` streams inputs for an existing session.
`game.js` reports lap crossings from `drivingWorld.step()`.
Existing `scripts/check-verified-realtime.cjs` was extended to observe
two real-time consecutive laps for each of two clients, but that alone does
not test requalification.

Do not merge a partial implementation to `main`.
