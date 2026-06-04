# Step 15 — HACS Compliance, README, and Release Workflow

## Step discipline reference

- Discipline rules: `esphome_display_solver_plan.md` lines 1080–1125
- Implementation Steps index: `esphome_display_solver_plan.md` lines 1127–1145

## Plan section references

- HACS plugin requirements: lines 953–958
- hacs.json content: CLAUDE.md "hacs.json" section
- Success criteria: lines 1067–1077
- Key External References: lines 1052–1064
- HACS plugin file resolution: CLAUDE.md "HACS plugin file resolution order"

## Prerequisites

- Step 13 (main card element) complete
- Step 14 (editor) complete
- `npm run build` producing `dist/display-solver.js`
- All prior step tests passing

## Context

This step makes the plugin installable via HACS. It does not add product features.
The deliverables are documentation, configuration files, and a GitHub Actions release
workflow.

HACS requires:
1. `hacs.json` at the repo root (already created in Step 5; verify completeness here)
2. A `README.md` with meaningful content
3. The built artifact `dist/display-solver.js` (or in a GitHub Release asset)
4. A public GitHub repository with description, license, and at least one topic tag
5. Published GitHub Releases (not just tags) for versioned install/upgrade

The `lovelace-` prefix in the repo name is intentional: HACS strips it and looks for
`display-solver.js`, which is what `dist/display-solver.js` provides.

## Deliverables

### `hacs.json` (verify from Step 5)

The `hacs.json` at repo root must be:
```json
{
  "name": "Display Solver Card",
  "render_readme": false,
  "filename": "display-solver.js",
  "homeassistant": "2024.4.0",
  "hacs": "1.32.0"
}
```

Confirm `filename` matches `dist/display-solver.js` (the `dist/` prefix is resolved
by HACS automatically per its file resolution order).

### `README.md` (replace placeholder from Step 5)

Required sections (HACS shows the README in the store UI):

1. **Project name and description**: "Display Solver Card" — one paragraph explaining
   what the card does (priority-based icon/alert dashboard; drives ESPHome displays,
   canvas preview, and Chromecast from a single declarative entity config).

2. **Installation**:
   ```
   1. Go to HACS → Frontend → + Explore & Download Repositories
   2. Search for "Display Solver"
   3. Download and reload your browser
   4. Add the card to your dashboard via the card picker
   ```

3. **Quick start config**: A minimal but complete YAML example that a user can
   copy-paste into a new card. Use the stub config from `getStubConfig` (Step 13)
   as the base, with comments explaining each section.

4. **Entity config reference**: Document each field in `EntityConfig` with type,
   required/optional, and a one-line description. Match the schema in plan lines
   280–452.

5. **Display profile reference**: Document each field in `DisplayProfile` with type,
   required/optional, and description. Match plan lines 128–220.

6. **Viewing distance presets**: Table from plan lines 107–127.

7. **Glyph names**: Explain the four reference forms (MSS name, `mdi:`, `"entity"`,
   raw unicode). Link to the Material Symbols Sharp catalog and the MDI icon catalog.

8. **ESPHome setup**: Explain the ESPHome side requirements. Link to
   `docs/esphome-service-contract.md` and `docs/esphome-reference.yaml` from Step 1.

9. **Troubleshooting**: Common issues:
   - Glyph shows as blank → missing from `font_glyphs` / not compiled in firmware
   - Card shows "no layout found" → icon count outside all layout `min/max` ranges
   - ESPHome service call fails → check `profile.service` matches device name

### `info.md` (optional HACS rich description)

A shorter version of the README introduction, optimized for the HACS store UI.
Two or three paragraphs, no long code blocks.

### `.github/workflows/release.yml`

GitHub Actions workflow that:

1. Triggers on `push` to a tag matching `v*.*.*`.
2. Runs `npm ci && npm run build`.
3. Verifies `dist/display-solver.js` exists and is non-empty.
4. Creates a GitHub Release via `actions/create-release` (or `gh release create`)
   with the tag as the version.
5. Uploads `dist/display-solver.js` as a Release asset.

HACS downloads the `filename` from the latest Release; this workflow automates that.

The `dist/` directory should remain in `.gitignore` (built artifact, not committed).
HACS fetches it from the Release asset.

### `.gitignore` additions

Ensure the following are excluded if not already:
```
node_modules/
dist/
*.js.map
python_solver/__pycache__/
appdaemon/apps/display_solver/__pycache__/
```

### `YOUR_ORG` placeholder replacement

Step 5's scaffold used `YOUR_ORG` as a placeholder in:
- `customCards.push({ documentationURL: ... })`
- README installation links

Replace `YOUR_ORG` with the actual GitHub organization/username. If the final repo
URL is not yet known, leave a `# TODO: replace YOUR_ORG` comment but do not ship
without it resolved.

## Tests

### `tests/release.test.ts`

Verify the release workflow artifacts:

1. `hacs.json` is valid JSON and contains required keys (`name`, `filename`)
2. `hacs.json` `filename` is `"display-solver.js"`
3. `README.md` exists and contains all required section headings (H2 headers for
   Installation, Quick start, Entity config reference, etc.)
4. `dist/display-solver.js` exists after `npm run build` (build must have been run)
5. `.github/workflows/release.yml` is valid YAML

```ts
import { readFileSync, statSync } from 'fs';
import yaml from 'js-yaml';  // add as devDependency

test('hacs.json has required keys', () => { ... });
test('README.md has installation section', () => { ... });
test('dist/display-solver.js exists', () => { ... });
test('release.yml is valid YAML', () => { ... });
```

## Constraints

- `dist/display-solver.js` is **not** committed to git; it is produced by the release
  workflow and uploaded as a Release asset
- `hacs.json` is committed to the repo root (not `dist/`)
- The release workflow must run `npm ci` (not `npm install`) for reproducibility
- README must be written for an end user, not a developer — avoid TypeScript jargon

## Agent instructions

### dev agent

Implement `README.md` (replacing placeholder), `info.md`, `.github/workflows/release.yml`,
and verify `hacs.json`. Replace `YOUR_ORG` placeholder in all files. Update
`.gitignore`.

### test agent

Implement `tests/release.test.ts`. Add `js-yaml` as a devDependency if needed.
Run `npm test`. Zero failures.

Also manually verify: tag a test release, confirm the workflow runs, and confirm
`dist/display-solver.js` appears as a Release asset. (This is a manual verification
step; document the result in a comment in the test file.)

### user-review agent

This is the **primary user-facing review**. Read the full `README.md` as if you
are a Home Assistant user discovering this card in HACS for the first time:

1. Is the project description compelling and clear?
2. Is the Quick Start config truly a minimum viable example that works without
   any prior knowledge of the card?
3. Are the entity config and display profile reference tables complete? Are the
   field descriptions accurate and non-jargony?
4. Does the Troubleshooting section cover the most common failure modes?
5. Is it clear what ESPHome setup is needed? (A user might add the card not
   realizing they need to flash firmware first.)
6. Are all external links present and correct?

File every issue. All must be resolved before sign-off.

### code-review agent

Review `.github/workflows/release.yml`:
- `npm ci` used (not `npm install`)
- Build output verified before release creation
- Release upload uses correct artifact path (`dist/display-solver.js`)
- No hardcoded secrets; GitHub token uses `${{ secrets.GITHUB_TOKEN }}`
- Workflow trigger: `tags` pattern `v*.*.*` is correct syntax
- `dist/` in `.gitignore` confirmed
