# Dash cleanup roadmap

## Stage 1 — Dash 1.4.2

- Consolidated overlay.css into one canonical rule set.
- Consolidated window.css into one canonical rule set.
- Removed historical version-by-version CSS patch blocks.
- Removed duplicate selectors and overridden declarations.
- Removed the temporary icon rebuild note.
- No application behavior or preference schema was intentionally changed.

## Planned next stages

1. Normalize internal color names with migration support.
2. Remove or redefine obsolete preferences.
3. Introduce a reusable game-definition registry.
4. Replace per-game timer state with data-driven game state.
5. Final validation and version bump to Dash 2.0.0.

## Stage 3 — Dash 1.4.4

- Removed the obsolete “Use accent color for emphasized text” checkbox.
- Removed the unused preference from TypeScript and Rust.
- Existing preference files remain compatible; the old key is safely ignored.
- Accent color now has one clear, consistent meaning with no additional toggle.

## Stage 4 — Dash 1.5.0

- Added a shared frontend GameDefinition registry.
- Preferences game controls are generated from the registry.
- Overlay game rows and live timer refreshes are generated from the registry.
- Centralized Rust process aliases in a backend game registry.
- Preserved the existing preference schema and overlay-state payload for compatibility.
- The next stage will replace the remaining per-game state fields with a data-driven map.

## Stage 5 — Dash 1.6.0

- Replaced six individual backend timer fields with one game-start map.
- Replaced six overlay payload timer fields with one serialized games map.
- Replaced frontend per-game state fields with Record<GameId, number | null>.
- Removed stateKey from the frontend game registry.
- Existing display and auto-hide preferences remain unchanged.
- New games no longer require new runtime timer-state fields.

## Stage 6 — Dash 1.7.0

- Replaced per-game display and auto-hide preferences with one games map.
- Added automatic migration from all legacy display*/autoHide* keys.
- Preferences UI and overlay now read nested game settings from the registry.
- Old keys are accepted when loading but no longer serialized when saving.
- Adding a new game no longer requires new preference fields.

## Stage 7 — Dash 1.8.0

- Dead-code and compatibility cleanup pass.
- Consolidated migration notes.
- No user-facing behavior changes.

## Stage 8 — Dash 1.9.0

- Stabilization pass completed.
- Project prepared for Dash 2.0.0 release.
- No intended behavior changes.
 
## Audit pass — Dash 1.9.1

- Removed the unused `last_spotify` state cache.
- Removed the unused `set_click_through` Tauri command.
- Removed duplicate frontend legacy-game migration; Rust remains the migration authority.
- Simplified game process checks to use registry entries directly.
- Renamed the shared game timer formatter and Dash polling thread.
- Removed an unused timer-parts property and an unnecessary exported type.
- Updated stale multi-game bundle description.
- Replaced the accumulated README with concise current documentation.
- Preserved historical release notes in `CHANGELOG.md`.
- Retained Rust legacy preference fields for upgrade compatibility through Dash 2.0.
