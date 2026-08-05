# Dash

Dash is a local Windows overlay for game-session timers, Dash uptime, and Spotify now playing.

## Supported games

- Valorant
- Warframe
- Fortnite
- Rust
- Roblox
- Destiny 2

Game detection is local and process-based. Dash does not inject into games, inspect game memory, automate input, or require game-account credentials.

## Features

- Content-sized vertical or horizontal overlay
- Automatic local game-session timers
- Spotify media-session display
- Custom background, secondary background, text, and accent colors
- Automatic light/dark icon contrast
- Overlay sizing and four-corner positioning
- Click-through mode
- Compact and OLED-black modes
- Windows startup option
- System-tray controls
- Single running instance

## Build on Windows

Install Node.js, Rust, and Visual Studio Build Tools with **Desktop development with C++**, then run:

```powershell
npm install
npm run tauri build
```

The MSI is generated under:

```text
src-tauri\target\release\bundle\msi\
```

## Configuration

Dash stores preferences locally under its Windows application configuration directory. Existing pre-registry game settings are migrated automatically.

## Privacy

Dash processes local Windows process and media-session information. It does not include telemetry, account login, or an active updater.

## License and attribution

Dash is distributed under the GNU General Public License v3. See `LICENSE.md`.

This project was derived from Groundsub, which was itself based on Threepole. The original project notes and acknowledgements are retained in `README-original.md`.

Dash is an independent project and is not affiliated with Riot Games, Digital Extremes, Epic Games, Facepunch Studios, Roblox Corporation, Bungie, Spotify, or Microsoft.
