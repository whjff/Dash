import "../core/global.css";
import "./overlay.css";
import { listen } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/tauri";
import musicWhite from "../assets/icons/music-white.png";
import musicBlack from "../assets/icons/music-black.png";
import valorantIcon from "../assets/icons/valorant.svg";
import warframeIcon from "../assets/icons/warframe.png";
import fortniteIcon from "../assets/icons/fortnite.png";
import rustIcon from "../assets/icons/rust.png";
import robloxIcon from "../assets/icons/roblox.svg";
import destiny2Icon from "../assets/icons/destiny2.png";
import { GAME_DEFINITIONS, type GameId } from "../core/games";

type GamePreference = { enabled:boolean; autoHide:boolean };
type Preferences = {
  enableOverlay:boolean; displayUptime:boolean; games:Record<GameId,GamePreference>; displaySpotify:boolean;
  displayIcons:boolean; displayMilliseconds:boolean; leadingZeros:boolean; dashTimerFormat:string; valorantTimerFormat:string; clickThrough:boolean; launchOnStartup:boolean;
  autoHideSpotify:boolean; compactMode:boolean; oledBlack:boolean;
  overlaySize:string; overlayLayout:string; overlayPosition:string; customOverlayX:number; customOverlayY:number;
  overlayBackgroundOpacity:number; primaryBackground:string; secondaryBackground:string;
  primaryHighlight:string; infoTextColor:string;
};
type State = { uptimeMs:number; games:Record<GameId,number|null>; spotify:{title:string;artist:string;isPlaying:boolean;hasMedia:boolean} };

const root = document.querySelector<HTMLDivElement>("#overlay")!;
let prefs: Preferences;
let state: State = {uptimeMs:0, games:{valorant:null,warframe:null,fortnite:null,rust:null,roblox:null,destiny2:null}, spotify:{title:"",artist:"",isPlaying:false,hasMedia:false}};
let uptimeOffset = 0;
let lastWindowSize = {width:0,height:0};
let stateReceivedAt = performance.now();

function measureNaturalRowWidth() {
  const previous = root.style.getPropertyValue("--content-width");
  root.style.removeProperty("--content-width");
  const rows = Array.from(root.querySelectorAll<HTMLElement>(".row"));
  const width = rows.reduce((max, row) => {
    const rect = row.getBoundingClientRect();
    return Math.max(max, Math.ceil(Math.max(rect.width, row.scrollWidth)));
  }, 0);
  if (previous) root.style.setProperty("--content-width", previous);
  return width;
}

let resizeQueued = false;
function resizeToContent() {
  if (resizeQueued) return;
  resizeQueued = true;
  requestAnimationFrame(() => {
    resizeQueued = false;
    const rows = Array.from(root.querySelectorAll<HTMLElement>(".row"));
    if (!rows.length) return;

    if (prefs.overlayLayout === "vertical") {
      root.style.removeProperty("--content-width");
      const rowWidth = Math.max(120, measureNaturalRowWidth());
      root.style.setProperty("--content-width", `${rowWidth}px`);
    } else {
      root.style.removeProperty("--content-width");
    }

    requestAnimationFrame(() => {
      const rect = root.getBoundingClientRect();
      const cssWidth = Math.ceil(Math.max(root.scrollWidth, rect.width));
      const cssHeight = Math.ceil(Math.max(root.scrollHeight, rect.height));
      const scale = window.devicePixelRatio || 1;
      const width = Math.ceil(cssWidth * scale);
      const height = Math.ceil(cssHeight * scale);
      if (Math.abs(width-lastWindowSize.width) < 2 && Math.abs(height-lastWindowSize.height) < 2) return;
      lastWindowSize = {width,height};
      invoke("resize_overlay", {width,height}).catch(console.error);
    });
  });
}


const icons = {
  clock: `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 6v6l4 2" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`
};

let useDarkIcons = false;

const gameIcons = {
  valorant: valorantIcon,
  warframe: warframeIcon,
  fortnite: fortniteIcon,
  rust: rustIcon,
  roblox: robloxIcon,
  destiny2: destiny2Icon
} as const;

function gameImageIcon(kind:GameId) {
  return `<img class="game-icon-image" src="${gameIcons[kind]}" alt="" aria-hidden="true">`;
}

function musicImageIcon() {
  const src = useDarkIcons ? musicBlack : musicWhite;
  return `<img src="${src}" alt="" aria-hidden="true">`;
}


function liveElapsed(base:number|null) {
  if (base === null) return null;
  return base + Math.max(0, performance.now() - stateReceivedAt);
}

function pad(value:number, width=2) {
  return prefs?.leadingZeros ? String(value).padStart(width, "0") : String(value);
}
function timerParts(ms:number) {
  const total = Math.max(0, ms);
  return {
    h: Math.floor(total / 3600000),
    m: Math.floor((total % 3600000) / 60000),
    totalMinutes: Math.floor(total / 60000),
    s: Math.floor((total % 60000) / 1000),
    ms: Math.floor(total % 1000)
  };
}
function fmtDash(ms:number) {
  const {h,m,s}=timerParts(ms);
  switch (prefs?.dashTimerFormat) {
    case "digital":
      return `${pad(h)}:${pad(m)}:${pad(s)}`;
    case "compact":
      return h ? `${h}h ${m}m ${s}s` : m ? `${m}m ${s}s` : `${s}s`;
    case "long":
    default:
      return `${pad(h)} hours ${pad(m)} mins ${pad(s)} sec`;
  }
}
function fmtGameTimer(ms:number) {
  const {h,m,totalMinutes,s,ms:millis}=timerParts(ms);
  switch (prefs?.valorantTimerFormat) {
    case "digital":
      return `${pad(h)}:${pad(m)}:${pad(s)}`;
    case "compact":
      return h ? `${h}h ${m}m ${s}s` : m ? `${m}m ${s}s` : `${s}s`;
    case "stopwatch":
    default: {
      const base = h > 0
        ? `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`
        : `${String(totalMinutes).padStart(2,"0")}:${String(s).padStart(2,"0")}`;
      return prefs?.displayMilliseconds ? `${base}.${String(millis).padStart(3,"0")}` : base;
    }
  }
}
function row(icon:"clock"|"music"|GameId, label:string, value:string, cls="", timer?:"uptime"|GameId) {
  const iconMarkup = icon === "clock"
    ? icons.clock
    : icon === "music"
      ? musicImageIcon()
      : gameImageIcon(icon as GameId);
  const iconElement = prefs.displayIcons ? `<span class="icon-slot"><span class="icon icon-${icon}">${iconMarkup}</span></span>` : "";
  const labelElement = label ? `<span class="label">${label}</span>` : "";
  const timerAttr = timer ? ` data-timer="${timer}"` : "";
  return `<div class="row ${cls}">${iconElement}<span class="row-content">${labelElement}<span class="value"${timerAttr}>${value}</span></span></div>`;
}
function parseColor(value:string): [number,number,number] {
  const hex=value.trim().replace("#","");
  if (/^[0-9a-f]{3}$/i.test(hex)) return hex.split("").map(c=>parseInt(c+c,16)) as [number,number,number];
  if (/^[0-9a-f]{6}$/i.test(hex)) return [parseInt(hex.slice(0,2),16),parseInt(hex.slice(2,4),16),parseInt(hex.slice(4,6),16)];
  const rgb=value.match(/\d+(?:\.\d+)?/g)?.slice(0,3).map(Number);
  return rgb?.length===3 ? rgb as [number,number,number] : [18,23,28];
}
function contrastFor(background:string) {
  const [r,g,b]=parseColor(background).map(v=>v/255) as [number,number,number];
  const linear=[r,g,b].map(v=>v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4));
  const luminance=.2126*linear[0]+.7152*linear[1]+.0722*linear[2];
  return luminance>.45 ? "#050505" : "#ffffff";
}
function render() {
  if (!prefs) return;
  // Preference previews can change the native window size externally.
  // Force a fresh content measurement on every complete rerender.
  lastWindowSize = {width:0,height:0};
  root.className = [prefs.overlayLayout, prefs.overlaySize, prefs.compactMode?"compact":"", prefs.oledBlack?"oled":"", useDarkIcons?"light-icons-dark":""].join(" ");
  const effectivePrimary=prefs.oledBlack ? "#000000" : prefs.primaryBackground;
  root.style.setProperty("--primary", effectivePrimary);
  root.style.setProperty("--secondary", prefs.oledBlack ? "#000000" : prefs.secondaryBackground);
  root.style.setProperty("--highlight", prefs.primaryHighlight);
  root.style.setProperty("--info", prefs.infoTextColor);
  const foregroundContrast = contrastFor(effectivePrimary);
  useDarkIcons = foregroundContrast === "#050505";
  root.classList.toggle("light-icons-dark", useDarkIcons);
  root.style.setProperty("--icon-contrast", foregroundContrast);
  root.style.setProperty("--text-contrast", foregroundContrast);
  root.style.setProperty("--opacity", String(prefs.overlayBackgroundOpacity/100));
  const rows:string[]=[];
  if (prefs.displayUptime) rows.push(row("clock", "", fmtDash((liveElapsed(state.uptimeMs) ?? 0)-uptimeOffset), "uptime", "uptime"));
  for (const game of GAME_DEFINITIONS) {
    const elapsed = state.games[game.id];
    const gamePrefs = prefs.games[game.id];
    const enabled = Boolean(gamePrefs?.enabled);
    const autoHide = Boolean(gamePrefs?.autoHide);
    if (enabled && (!autoHide || elapsed !== null)) {
      rows.push(row(
        game.id,
        "",
        elapsed === null ? "Not in game" : fmtGameTimer(liveElapsed(elapsed) ?? 0),
        game.id,
        elapsed === null ? undefined : game.id
      ));
    }
  }
  const showSpotify = state.spotify.hasMedia && state.spotify.isPlaying;
  if (prefs.displaySpotify && (!prefs.autoHideSpotify || showSpotify)) {
    const text = showSpotify ? `${escapeHtml(state.spotify.title)} <span class="artist">— ${escapeHtml(state.spotify.artist)}</span>` : "Nothing playing";
    rows.push(row("music", "", text, "spotify"));
  }
  root.innerHTML = rows.join("");

  // Image dimensions may not be available during the first layout pass.
  // Resize again as each game/music asset finishes loading so lower rows
  // never get clipped after a theme change or rerender.
  root.querySelectorAll<HTMLImageElement>("img").forEach(image => {
    if (!image.complete) {
      image.addEventListener("load", resizeToContent, {once:true});
      image.addEventListener("error", resizeToContent, {once:true});
    }
  });

  resizeToContent();
}
function escapeHtml(v:string){return v.replace(/[&<>'"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c]!));}

const contentObserver = new MutationObserver(() => resizeToContent());
contentObserver.observe(root, {subtree:true, childList:true, characterData:true});
window.addEventListener("resize", () => resizeToContent());

async function init(){
  prefs = await invoke("get_preferences");
  render();
  await listen<Preferences>("preferences-update", e=>{prefs=e.payload;render();});
  await listen<State>("overlay-state", e=>{state=e.payload;stateReceivedAt=performance.now();render();});
  await listen("uptime-reset-request", ()=>{uptimeOffset=state.uptimeMs;render();});
}
let lastTimerWidthKey = "";
function refreshTimers() {
  if (prefs) {
    const uptime = root.querySelector<HTMLElement>('[data-timer="uptime"]');
    const uptimeText = fmtDash((liveElapsed(state.uptimeMs) ?? 0) - uptimeOffset);
    if (uptime) uptime.textContent = uptimeText;
    const gameTimerLengths:string[]=[];
    for (const game of GAME_DEFINITIONS) {
      const elapsed = state.games[game.id];
      const timer = root.querySelector<HTMLElement>(`[data-timer="${game.id}"]`);
      const text = elapsed !== null ? fmtGameTimer(liveElapsed(elapsed) ?? 0) : "";
      if (timer && elapsed !== null) timer.textContent = text;
      gameTimerLengths.push(String(text.length));
    }
    const widthKey = `${uptimeText.length}:${gameTimerLengths.join(":")}`;
    if (widthKey !== lastTimerWidthKey) {
      lastTimerWidthKey = widthKey;
      resizeToContent();
    }
  }
  requestAnimationFrame(refreshTimers);
}
init().then(() => requestAnimationFrame(refreshTimers));
