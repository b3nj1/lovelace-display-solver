# Step 1 — ESPHome Service Contract Cleanup

## Step discipline reference

- Discipline rules: `esphome_display_solver_plan.md` (anchor: step-discipline) through (anchor: signoff-format)
- Implementation Steps index: `esphome_display_solver_plan.md` (anchor: implementation-steps)

## Plan section references

- Phase 1 deliverables: `esphome_display_solver_plan.md` (anchor: phase1)
- ESPHome service contract (stable target): (anchor: phase1-contract-table)
- Icon page cycling ESPHome contract: (anchor: icon-page-cycling)
- What ESPHome side keeps: (anchor: esphome-side-keeps)

## Context

The current `set_display_glyphs` service has approximately 35 parameters. Two are
candidates for removal because they are either never read by the ESPHome display
lambda or are always sent as a hardcoded constant:

| Parameter | Reason to remove |
|---|---|
| `icon_scroll` | Accepted by the service but never read by the display lambda — superseded by solver-controlled page dwell |
| `info_glyph_font` | Always sent as the hardcoded value `3`; never varies |

This step produces **documentation and ESPHome YAML artifacts only**. No TypeScript
or Python source files are created here.

## Deliverables

### 1. Stable API surface document

Create `docs/esphome-service-contract.md` documenting the stable, versioned ESPHome
service contract after the two removals. It must include:

- The full list of remaining parameters with type, array/scalar flag, and description
- The exact target contract from (anchor: phase1-contract-table) reproduced verbatim
- A "Removed parameters" table listing `icon_scroll` and `info_glyph_font` with
  the rationale for each removal
- A version label (`v1.0`) at the top so future breaking changes can be tracked
- A note that icon page cycling requires no new ESPHome parameters (see
  (anchor: icon-page-cycling)) — the solver sends successive page slices using the
  existing `x[]`, `y[]`, `glyph[]` etc. arrays; paging state is managed entirely in
  the solver host layer

### 2. ESPHome YAML reference snippet

Create `docs/esphome-reference.yaml` containing:

- A minimal but complete example ESPHome YAML `api:` → `services:` block that
  declares the `set_display_glyphs` service with all post-removal parameters
- Comments on each parameter explaining its role
- A second block showing the `display:` lambda reading from the service's stored
  globals — enough for a user to understand the full device-side contract

### 3. Migration note

In `docs/esphome-service-contract.md`, add a "Migration from pre-v1.0" section that:

- Lists the two removed parameters
- States that the solver (Node-RED / AppDaemon / Lovelace card) must stop sending
  these fields; sending unknown parameters causes an ESPHome runtime warning
- Provides the one-line ESPHome YAML change needed per parameter removal

Note: `icon_scroll` removal stands. Paging is achieved by the solver sending
successive page slices using the existing glyph arrays — no new parameters.

## Constraints

- Do not modify any source files outside `docs/`
- Do not modify `legacy_hacked_display_solver/` — it is reference-only and will be
  deleted before shipping (see anchor: esphome-side-keeps context)
- The YAML in `docs/esphome-reference.yaml` must be syntactically valid ESPHome YAML
  (no Jinja2 lambdas needed — comment-stub them)

## Agent instructions

### dev agent

Write both files listed above. The content is documentation and YAML — there is no
TypeScript or Python to implement. Treat accuracy and completeness as the primary
quality bar.

### test agent

There is no executable code in this step. Instead:

1. Validate that `docs/esphome-reference.yaml` is syntactically valid YAML (run
   `python3 -c "import yaml, sys; yaml.safe_load(open(sys.argv[1]))" docs/esphome-reference.yaml`).
2. Verify `docs/esphome-service-contract.md` contains all required sections
   (stable contract, removed parameters table, migration note, version label,
   icon-paging note).
3. Cross-check that every parameter in the stable contract table (anchor: phase1-contract-table)
   appears in `docs/esphome-reference.yaml` and vice versa — no orphan parameters.
4. Confirm that `icon_scroll` and `info_glyph_font` do **not** appear in the stable
   contract table or the YAML example.
5. Confirm that the ESPHome YAML display lambda requires no modification to support
   icon paging (it draws whatever glyphs it receives).

Report results as a checklist. All items must pass before sign-off.

### user-review agent

Review `docs/esphome-service-contract.md` and `docs/esphome-reference.yaml` for:

- Clarity: could an ESPHome user who has never seen this project follow the migration
  instructions without ambiguity?
- Completeness: are parameter descriptions sufficient to understand what data to send?
- Naming: are parameter names consistent with the ESPHome convention (snake_case,
  no abbreviations that aren't obvious)?
- Migration note: is the impact of sending a removed parameter clearly stated?

File issues as numbered list. Each issue must be resolved before sign-off.

### code-review agent

This step has no source code. Review the YAML for:

- Structural validity: does the YAML schema match what ESPHome's `api: services:`
  block actually accepts?
- Array alignment comment: is it clear that all array parameters must have the same
  length on every call?
- No extraneous parameters that were meant to be removed

File issues as numbered list. All must be resolved before sign-off.
