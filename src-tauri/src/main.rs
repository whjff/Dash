#![cfg_attr(all(not(debug_assertions), target_os = "windows"), windows_subsystem = "windows")]

use directories::ProjectDirs;
use serde::{Deserialize, Serialize};
use std::{collections::HashMap, fs, path::PathBuf, sync::Arc, time::{Duration, Instant}};
use sysinfo::{ProcessExt, System, SystemExt};
use tauri::{
    async_runtime, AppHandle, CustomMenuItem, Manager, PhysicalPosition, PhysicalSize,
    State, SystemTray, SystemTrayEvent, SystemTrayMenu, SystemTrayMenuItem, WindowBuilder,
    WindowEvent, WindowUrl,
};
use tokio::sync::Mutex;
use winreg::{enums::HKEY_CURRENT_USER, RegKey};
use windows::Media::Control::GlobalSystemMediaTransportControlsSessionManager;

const APP_NAME: &str = "Dash";

struct GameDefinition {
    id: &'static str,
    process_aliases: &'static [&'static str],
}

const GAME_DEFINITIONS: &[GameDefinition] = &[
    GameDefinition {
        id: "valorant",
        process_aliases: &["valorant-win64-shipping"],
    },
    GameDefinition {
        id: "warframe",
        process_aliases: &["warframe"],
    },
    GameDefinition {
        id: "fortnite",
        process_aliases: &["fortniteclient-win64-shipping"],
    },
    GameDefinition {
        id: "rust",
        process_aliases: &["rustclient.exe", "rust.exe", "rustclient"],
    },
    GameDefinition {
        id: "roblox",
        process_aliases: &["robloxplayerbeta.exe"],
    },
    GameDefinition {
        id: "destiny2",
        process_aliases: &["destiny2.exe", "destiny2"],
    },
];

fn is_game_running(system: &System, game: &GameDefinition) -> bool {
    system.processes().values().any(|process| {
        let name = process.name().to_ascii_lowercase();
        game.process_aliases.iter().any(|alias| {
            let alias = alias.to_ascii_lowercase();
            name == alias || name.contains(&alias)
        })
    })
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", default)]
struct GamePreference {
    enabled: bool,
    auto_hide: bool,
}

impl Default for GamePreference {
    fn default() -> Self {
        Self {
            enabled: true,
            auto_hide: true,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", default)]
struct Preferences {
    enable_overlay: bool,
    display_uptime: bool,
    games: HashMap<String, GamePreference>,
    #[serde(skip_serializing)]
    display_valorant: Option<bool>,
    #[serde(skip_serializing)]
    display_warframe: Option<bool>,
    #[serde(skip_serializing)]
    display_fortnite: Option<bool>,
    #[serde(skip_serializing)]
    display_rust: Option<bool>,
    #[serde(skip_serializing)]
    display_roblox: Option<bool>,
    #[serde(skip_serializing)]
    display_destiny2: Option<bool>,
    display_spotify: bool,
    display_icons: bool,
    display_milliseconds: bool,
    leading_zeros: bool,
    dash_timer_format: String,
    valorant_timer_format: String,
    click_through: bool,
    launch_on_startup: bool,
    auto_hide_spotify: bool,
    #[serde(skip_serializing)]
    auto_hide_valorant: Option<bool>,
    #[serde(skip_serializing)]
    auto_hide_warframe: Option<bool>,
    #[serde(skip_serializing)]
    auto_hide_fortnite: Option<bool>,
    #[serde(skip_serializing)]
    auto_hide_rust: Option<bool>,
    #[serde(skip_serializing)]
    auto_hide_roblox: Option<bool>,
    #[serde(skip_serializing)]
    auto_hide_destiny2: Option<bool>,
    compact_mode: bool,
    oled_black: bool,
    overlay_size: String,
    overlay_layout: String,
    overlay_position: String,
    custom_overlay_x: i32,
    custom_overlay_y: i32,
    overlay_background_opacity: i32,
    primary_background: String,
    secondary_background: String,
    primary_highlight: String,
    info_text_color: String,
}

impl Default for Preferences {
    fn default() -> Self {
        let games = GAME_DEFINITIONS
            .iter()
            .map(|game| (game.id.to_string(), GamePreference::default()))
            .collect();

        Self {
            enable_overlay: true,
            display_uptime: true,
            games,
            display_valorant: None,
            display_warframe: None,
            display_fortnite: None,
            display_rust: None,
            display_roblox: None,
            display_destiny2: None,
            display_spotify: true,
            display_icons: true,
            display_milliseconds: true,
            leading_zeros: true,
            dash_timer_format: "long".into(),
            valorant_timer_format: "stopwatch".into(),
            click_through: true,
            launch_on_startup: false,
            auto_hide_spotify: true,
            auto_hide_valorant: None,
            auto_hide_warframe: None,
            auto_hide_fortnite: None,
            auto_hide_rust: None,
            auto_hide_roblox: None,
            auto_hide_destiny2: None,
            compact_mode: false,
            oled_black: false,
            overlay_size: "medium".into(),
            overlay_layout: "vertical".into(),
            overlay_position: "bottom-left".into(),
            custom_overlay_x: 25,
            custom_overlay_y: 25,
            overlay_background_opacity: 50,
            primary_background: "#12171c".into(),
            secondary_background: "#180f1c".into(),
            primary_highlight: "#20c7ae".into(),
            info_text_color: "#d2d8ed".into(),
        }
    }
}

impl Preferences {
    fn migrate_legacy_games(&mut self) {
        let legacy = [
            ("valorant", self.display_valorant, self.auto_hide_valorant),
            ("warframe", self.display_warframe, self.auto_hide_warframe),
            ("fortnite", self.display_fortnite, self.auto_hide_fortnite),
            ("rust", self.display_rust, self.auto_hide_rust),
            ("roblox", self.display_roblox, self.auto_hide_roblox),
            ("destiny2", self.display_destiny2, self.auto_hide_destiny2),
        ];

        for (id, enabled, auto_hide) in legacy {
            let entry = self.games.entry(id.to_string()).or_default();
            if let Some(enabled) = enabled {
                entry.enabled = enabled;
            }
            if let Some(auto_hide) = auto_hide {
                entry.auto_hide = auto_hide;
            }
        }

        self.display_valorant = None;
        self.display_warframe = None;
        self.display_fortnite = None;
        self.display_rust = None;
        self.display_roblox = None;
        self.display_destiny2 = None;
        self.auto_hide_valorant = None;
        self.auto_hide_warframe = None;
        self.auto_hide_fortnite = None;
        self.auto_hide_rust = None;
        self.auto_hide_roblox = None;
        self.auto_hide_destiny2 = None;

        for game in GAME_DEFINITIONS {
            self.games.entry(game.id.to_string()).or_default();
        }
    }
}

#[derive(Clone, Serialize, Default, PartialEq)]
#[serde(rename_all = "camelCase")]
struct MediaInfo {
    title: String,
    artist: String,
    is_playing: bool,
    has_media: bool,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct OverlayState {
    uptime_ms: u128,
    games: HashMap<String, Option<u128>>,
    spotify: MediaInfo,
}

struct AppState {
    preferences: Mutex<Preferences>,
    game_started: Mutex<HashMap<&'static str, Instant>>,
}

type SharedState = Arc<AppState>;

fn config_path() -> PathBuf {
    let base = ProjectDirs::from("com", "Dash", "Dash")
        .map(|p| p.config_dir().to_path_buf())
        .unwrap_or_else(|| PathBuf::from("."));
    base.join("preferences.json")
}

fn load_preferences() -> Preferences {
    let mut preferences: Preferences = fs::read_to_string(config_path())
        .ok()
        .and_then(|s| serde_json::from_str::<Preferences>(&s).ok())
        .unwrap_or_default();
    preferences.migrate_legacy_games();
    preferences
}

fn save_preferences(prefs: &Preferences) -> Result<(), String> {
    let path = config_path();
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    fs::write(path, serde_json::to_vec_pretty(prefs).map_err(|e| e.to_string())?)
        .map_err(|e| e.to_string())
}

fn set_startup(enabled: bool) -> Result<(), String> {
    let hkcu = RegKey::predef(HKEY_CURRENT_USER);
    let (run, _) = hkcu
        .create_subkey("Software\\Microsoft\\Windows\\CurrentVersion\\Run")
        .map_err(|e| e.to_string())?;
    if enabled {
        let exe = std::env::current_exe().map_err(|e| e.to_string())?;
        run.set_value(APP_NAME, &format!("\"{}\" --background", exe.display()))
            .map_err(|e| e.to_string())?;
    } else {
        let _ = run.delete_value(APP_NAME);
    }
    Ok(())
}

async fn apply_overlay_preferences(handle: &AppHandle, prefs: &Preferences) {
    let Some(window) = handle.get_window("overlay") else { return; };
    let _ = window.set_ignore_cursor_events(prefs.click_through);
    let _ = if prefs.enable_overlay { window.show() } else { window.hide() };

    // The overlay frontend sizes the native window to its real rendered content.
    // Do not force a preset size here when colors/preferences are previewed,
    // otherwise multi-game rows can be clipped until their text changes.
    if let (Ok(current_size), Ok(Some(monitor))) = (window.outer_size(), window.primary_monitor()) {
        let size = monitor.size();
        let w = current_size.width as i32;
        let h = current_size.height as i32;
        let margin_x = prefs.custom_overlay_x.max(0);
        let margin_y = prefs.custom_overlay_y.max(0);
        let (x, y) = match prefs.overlay_position.as_str() {
            "top-right" => (size.width as i32 - w - margin_x, margin_y),
            "bottom-right" => (size.width as i32 - w - margin_x, size.height as i32 - h - margin_y),
            "bottom-left" => (margin_x, size.height as i32 - h - margin_y),
            _ => (margin_x, margin_y),
        };
        let _ = window.set_position(PhysicalPosition::new(x, y));
    }
}

#[tauri::command]
async fn resize_overlay(handle: AppHandle, state: State<'_, SharedState>, width: u32, height: u32) -> Result<(), String> {
    let Some(window) = handle.get_window("overlay") else { return Ok(()); };
    let width = width.clamp(120, 1200);
    let height = height.clamp(24, 500);
    window.set_size(PhysicalSize::new(width, height)).map_err(|e| e.to_string())?;

    let prefs = state.preferences.lock().await.clone();
    if let Ok(Some(monitor)) = window.primary_monitor() {
        let size = monitor.size();
        let margin_x = prefs.custom_overlay_x.max(0);
        let margin_y = prefs.custom_overlay_y.max(0);
        let (x, y) = match prefs.overlay_position.as_str() {
            "top-right" => (size.width as i32 - width as i32 - margin_x, margin_y),
            "bottom-right" => (size.width as i32 - width as i32 - margin_x, size.height as i32 - height as i32 - margin_y),
            "bottom-left" => (margin_x, size.height as i32 - height as i32 - margin_y),
            _ => (margin_x, margin_y),
        };
        window.set_position(PhysicalPosition::new(x, y)).map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
async fn get_preferences(state: State<'_, SharedState>) -> Result<Preferences, String> {
    Ok(state.preferences.lock().await.clone())
}

#[tauri::command]
async fn set_preferences(handle: AppHandle, state: State<'_, SharedState>, mut preferences: Preferences) -> Result<(), String> {
    preferences.migrate_legacy_games();
    set_startup(preferences.launch_on_startup)?;
    save_preferences(&preferences)?;
    *state.preferences.lock().await = preferences.clone();
    apply_overlay_preferences(&handle, &preferences).await;
    handle.emit_all("preferences-update", preferences).map_err(|e| e.to_string())
}

#[tauri::command]
async fn reset_uptime(handle: AppHandle) -> Result<(), String> {
    handle.emit_all("uptime-reset-request", ()).map_err(|e| e.to_string())
}


fn open_preferences(handle: &AppHandle) -> tauri::Result<()> {
    if let Some(window) = handle.get_window("preferences") {
        window.set_always_on_top(true)?;
        window.show()?;
        window.set_focus()?;
        return Ok(());
    }
    WindowBuilder::new(handle, "preferences", WindowUrl::App("src/window/window.html".into()))
        .title("Dash Preferences")
        .decorations(false)
        .always_on_top(true)
        .inner_size(455.0, 740.0)
        .resizable(false)
        .build()?;
    Ok(())
}

async fn spotify_info() -> Result<MediaInfo, String> {
    let manager = GlobalSystemMediaTransportControlsSessionManager::RequestAsync()
        .map_err(|e| e.to_string())?.await.map_err(|e| e.to_string())?;
    let sessions = manager.GetSessions().map_err(|e| e.to_string())?;
    for i in 0..sessions.Size().map_err(|e| e.to_string())? {
        let session = sessions.GetAt(i).map_err(|e| e.to_string())?;
        let app_id = session.SourceAppUserModelId().map_err(|e| e.to_string())?.to_string();
        if !app_id.to_ascii_lowercase().contains("spotify") { continue; }
        let props = session.TryGetMediaPropertiesAsync().map_err(|e| e.to_string())?.await.map_err(|e| e.to_string())?;
        let playback = session.GetPlaybackInfo().map_err(|e| e.to_string())?;
        let title = props.Title().map_err(|e| e.to_string())?.to_string();
        let artist = props.Artist().map_err(|e| e.to_string())?.to_string();
        return Ok(MediaInfo {
            has_media: !title.is_empty() || !artist.is_empty(),
            is_playing: playback.PlaybackStatus().map_err(|e| e.to_string())?.0 == 4,
            title,
            artist,
        });
    }
    Ok(MediaInfo::default())
}

fn poll_loop(handle: AppHandle, state: SharedState) {
    // Windows media-session objects are apartment-bound and are not `Send`.
    // Keep their complete async lifecycle on this one dedicated OS thread.
    // Initialize Windows Runtime on this dedicated media-polling thread.
    // windows-rs 0.44 does not provide windows::core::initialize_mta().
    let _apartment = unsafe {
        windows::Win32::System::WinRT::RoInitialize(
            windows::Win32::System::WinRT::RO_INIT_MULTITHREADED,
        )
    }
    .ok();
    let mut system = System::new();
    let local_uptime_origin = Instant::now();

    loop {
        system.refresh_processes();
        let games = async_runtime::block_on(async {
            let mut started = state.game_started.lock().await;
            let mut elapsed = HashMap::with_capacity(GAME_DEFINITIONS.len());

            for game in GAME_DEFINITIONS {
                if is_game_running(&system, game) {
                    let start = started.entry(game.id).or_insert_with(Instant::now);
                    elapsed.insert(game.id.to_string(), Some(start.elapsed().as_millis()));
                } else {
                    started.remove(game.id);
                    elapsed.insert(game.id.to_string(), None);
                }
            }

            elapsed
        });

        let media = async_runtime::block_on(spotify_info()).unwrap_or_default();

        let payload = OverlayState {
            uptime_ms: local_uptime_origin.elapsed().as_millis(),
            games,
            spotify: media,
        };
        let _ = handle.emit_all("overlay-state", payload);
        std::thread::sleep(Duration::from_millis(500));
    }
}

fn main() {
    let background_launch = std::env::args().any(|arg| arg == "--background");
    let prefs = load_preferences();
    let state = Arc::new(AppState {
        preferences: Mutex::new(prefs.clone()),
        game_started: Mutex::new(HashMap::new()),
    });

    let tray = SystemTray::new().with_menu(
        SystemTrayMenu::new()
            .add_item(CustomMenuItem::new("toggle", "Show / Hide Overlay"))
            .add_item(CustomMenuItem::new("click", "Toggle Click-Through"))
            .add_item(CustomMenuItem::new("preferences", "Open Preferences"))
            .add_item(CustomMenuItem::new("reset", "Reset Dash Timer"))
            .add_native_item(SystemTrayMenuItem::Separator)
            .add_item(CustomMenuItem::new("quit", "Exit")),
    );

    tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, _argv, _cwd| {
            // A second launch reuses the existing Dash process.
            if let Some(window) = app.get_window("overlay") {
                let _ = window.show();
                let _ = window.set_always_on_top(true);
            }
            if let Some(window) = app.get_window("preferences") {
                let _ = window.show();
                let _ = window.set_focus();
            }
        }))
        .manage(state.clone())
        .system_tray(tray)
        .setup(move |app| {
            let handle = app.handle();
            let overlay = WindowBuilder::new(&handle, "overlay", WindowUrl::App("src/overlay/overlay.html".into()))
                .title(APP_NAME)
                .transparent(true)
                .decorations(false)
                .always_on_top(true)
                .skip_taskbar(true)
                .resizable(false)
                .build()?;
            overlay.set_ignore_cursor_events(prefs.click_through)?;
            if !prefs.enable_overlay { overlay.hide()?; }
            let h = handle.clone();
            let p = prefs.clone();
            async_runtime::spawn(async move { apply_overlay_preferences(&h, &p).await; });
            let h = handle.clone();
            let s = state.clone();
            std::thread::Builder::new()
                .name("dash-poller".into())
                .spawn(move || poll_loop(h, s))?;

            if !background_launch {
                open_preferences(&handle)?;
            }
            Ok(())
        })
        .on_window_event(|event| {
            if event.window().label() != "preferences" {
                return;
            }

            match event.event() {
                WindowEvent::CloseRequested { api, .. } => {
                    api.prevent_close();
                    let _ = event.window().hide();
                }
                WindowEvent::Resized(size) if size.width == 0 && size.height == 0 => {
                    let _ = event.window().hide();
                }
                _ => {}
            }
        })
        .on_system_tray_event(|app, event| {
            match event {
                // A normal left-click opens (or focuses) Preferences.
                SystemTrayEvent::LeftClick { .. } => {
                    let _ = open_preferences(app);
                }
                // Right-click continues to use the native tray menu.
                SystemTrayEvent::MenuItemClick { id, .. } => {
                    match id.as_str() {
                        "toggle" => if let Some(w) = app.get_window("overlay") { if w.is_visible().unwrap_or(false) { let _ = w.hide(); } else { let _ = w.show(); } },
                        "click" => {
                            let state = app.state::<SharedState>().inner().clone();
                            let handle = app.clone();
                            async_runtime::spawn(async move {
                                let mut prefs = state.preferences.lock().await;
                                prefs.click_through = !prefs.click_through;
                                let _ = save_preferences(&prefs);
                                if let Some(window) = handle.get_window("overlay") {
                                    let _ = window.set_ignore_cursor_events(prefs.click_through);
                                }
                                let _ = handle.emit_all("preferences-update", prefs.clone());
                            });
                        },
                        "preferences" => { let _ = open_preferences(app); },
                        "reset" => { let _ = app.emit_all("uptime-reset-request", ()); },
                        "quit" => app.exit(0),
                        _ => {}
                    }
                }
                _ => {}
            }
        })
        .invoke_handler(tauri::generate_handler![get_preferences, set_preferences, reset_uptime, resize_overlay])
        .run(tauri::generate_context!())
        .expect("failed to run Dash");
}
