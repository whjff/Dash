# Dash change history

# Dash 1.9.0 — Stabilization Release

Final validation checkpoint before Dash 2.0.0.

# Dash 1.7.0 — Data-driven game preferences

- Game display and auto-hide settings now use a shared map.
- Existing settings migrate automatically.
- Preserved current Preferences UI and behavior.

# Dash 1.6.0 — Data-driven game state

- Game timers now use a shared map in Rust and TypeScript.
- Removed repeated per-game runtime state fields.
- Preserved current preferences and user-facing behavior.

# Dash 1.5.0 — Game registry foundation

- Centralized game metadata and process aliases.
- Removed repeated frontend rendering and timer-refresh code.
- Preserved current settings and behavior.

# Dash 1.4.4

- Removed the obsolete accent-color checkbox and preference field.
- Existing user configuration files remain compatible.

# Dash 1.4.1

- Corrected Appearance labels to Background, Secondary Background, Text, and Accent.
- Text color now controls game timers, uptime, statuses, and secondary Spotify text.
- Accent color now controls emphasized Spotify text and labels.
- Corrected the variable mapping broken by the previous refactor.

# Dash 1.3.3

- Fixed game rows being clipped after live appearance/color changes.
- Removed backend preset-size resets; overlay height now remains content-driven.
- Invalidates the frontend size cache on every full overlay render.
- Preferences now stays above the always-on-top overlay while editing settings.

# Dash 1.3.2

- Game timers and status text now automatically use black or white for background contrast.
- Highlight color is reserved for Spotify and important information.
- Overlay sizing reruns after icon assets load, preventing lower game rows from being clipped.
- Removed stale duplicate Fortnite and Rust icon imports.

# Dash 1.3.0 — Single-logo icon system

- Replaced black/white game icon pairs with one asset per game.
- Added user-supplied logos for Warframe, Valorant, Fortnite, Rust, Roblox, and Destiny 2.
- Game icons now recolor automatically for light and dark overlay backgrounds.
- Music icon behavior remains unchanged.
- Removed duplicated game icon assets.

# Dash 1.2.0 — Expanded game support

- Added Fortnite detection: FortniteClient-Win64-Shipping.exe.
- Added Rust detection: RustClient.exe / Rust.exe aliases.
- Added Roblox detection: RobloxPlayerBeta.exe.
- Added Destiny 2 detection: destiny2.exe.
- Added independent display and auto-hide controls for all four games.
- Added temporary monochrome built-in icons that follow overlay contrast.
- Existing Valorant and Warframe support remains unchanged.

# Dash 1.1.1

- Added user-supplied Warframe black and white logo assets.
- Converted both logos to transparent 256×256 PNGs.
- Warframe icon now switches automatically between black and white based on overlay brightness.
- Removed the temporary inline Warframe SVG.

# Dash 1.1.0 — Multi-game foundation

- Added local Warframe process detection and session timer.
- Kept Valorant detection and session timer.
- Added independent display and auto-hide toggles for both games.
- Both game timers share the selected Game Timer Format.
- No game APIs, injection, memory reading, or network access are used.

# Dash 1.0.0

- Preferences window now follows the selected Primary and Secondary background colors.
- Color changes preview immediately in both Preferences and the overlay.
- Highlight controls continue to use the selected Highlight color.
- Release numbering reset to 1.0.0.

# Dash 3.0.3

- Appearance color pickers now preview on the overlay immediately.
- Choosing a custom color disables OLED-black override.
- Reset Colors applies immediately and remains on the Appearance tab.
- Active tab is preserved when the Preferences UI rerenders.

# Dash 3.0.2

- Left-clicking the system-tray icon opens or focuses Preferences.
- Right-clicking still opens the native tray menu.

# Dash 3.0.1

- Fixed top and left header drag regions by inserting the actual rendered elements.
- The close button remains fully interactive.

# Dash 3.0.0

- Added invisible draggable regions above and beside the DASH header.
- Preserved normal interaction for the close button, tabs, controls, scrollbar, and footer buttons.
- Bumped application version to 3.0.0.

# Dash 2.5.2

- Reduced the DASH logo size.
- Moved the close button farther into the true top-right corner.
- Enlarged and brightened the dotted drag handle for clearer visibility.
- Preserved the compact window size and blue internal scrollbar.

# Dash 2.5.1

- Preferences window narrowed from 500px to 455px.
- DASH title reduced to 34px.
- Close button pinned to the true top-right corner.
- Entire header remains draggable.
- Added a larger dedicated drag zone and visible dotted drag handle.

# Dash 2.4.9

- Draco font is applied only to the DASH Preferences title.
- The close button is vertically aligned with the title.
- Preferences window enlarged to remove the outer native scrollbar.
- The blue internal settings scrollbar remains enabled.

# Dash 2.4.8

- Bundles Draco font assets for the Preferences title branding.
- Intended use: apply Draco only to the DASH title/header.

# Dash 2.4.7

- Removed the native Windows title bar from Preferences.
- The blue in-app close button hides Preferences to the tray.
- The blue header remains draggable so the window can still be moved.

# Dash 2.4.6

- Normal shortcut launches open Preferences.
- Windows startup launches silently in the tray.
- Saving preferences updates the overlay without closing Preferences.
- Closing or minimizing Preferences hides it back into the system tray.
- A second shortcut launch reopens/focuses the existing Preferences window.

# Dash 2.3.3

- Overlay labels removed: the uptime and Valorant rows now show only their icon and timer.
- For Valorant visibility, use Windowed Fullscreen/Borderless rather than exclusive fullscreen.

# Dash 2.1.2

This package already contains the final two-star Dash app/tray icon. Do not replace the icon files before building.

# Dash 2.1.0

Local-only Spotify and Valorant overlay.

## 2.1 icon update
- New orbit-star application and tray icon
- New scalable clock icon for Dash uptime
- New scalable Valorant icon
- Orbit-star icon for Spotify now playing
- Overlay icons automatically switch between white and black based on the configured background color

# Dash 2.0

A local-only, click-through Windows overlay showing:

- Dash uptime
- Valorant process-session timer
- Spotify now playing (Windows media sessions only)

No Bungie API, Riot API, Spotify Web API, account login, telemetry, updater, or online data lookup is used.

## Included customization

- Small, medium, and large sizes
- Vertical or horizontal layout
- Four-corner positioning with X/Y offsets
- Background opacity
- Primary, secondary, highlight, and info colors
- Click-through overlay
- Launch on Windows startup
- Auto-hide inactive Spotify and Valorant rows
- Compact mode
- OLED-black theme
- System tray controls

## Build on Windows

Install Node.js, Rust, and Visual Studio Build Tools with **Desktop development with C++**. Then open PowerShell in this folder:

```powershell
npm install
npm run tauri build
```

The MSI is created under:

```text
src-tauri\target\release\bundle\msi\
```

## Valorant timer note

Version 2.0 detects the local `VALORANT-Win64-Shipping.exe` process. It measures the Valorant game-process session, which may include time outside a live match depending on Riot's current client behavior. It does not inspect memory, inject code, automate input, or contact Riot services.


## 2.1.4 icon sizing update
- Normalized transparent music and Valorant assets.
- Fixed icon slots prevent images from overlapping text or neighboring rows.
- Valorant mark is intentionally slightly smaller than the clock and music note.


## Dash 2.4.5
- Enforces a single running instance. Launching Dash again reuses the existing tray/overlay process.
