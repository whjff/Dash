import "../core/global.css";
import "./window.css";
import { invoke } from "@tauri-apps/api/tauri";
import { appWindow } from "@tauri-apps/api/window";
import { GAME_DEFINITIONS } from "../core/games";

type GamePreference = { enabled:boolean; autoHide:boolean };
type P = Record<string, any> & { games?:Record<string,GamePreference> };
const app=document.querySelector<HTMLElement>("#app")!; let p:P; let activeTab:"settings"|"appearance"="settings"; let previewTimer:number|undefined;
const checkbox=(key:string,label:string)=>`<label class="check"><input type="checkbox" data-key="${key}" ${p[key]?"checked":""}><span>${label}</span></label>`;
const select=(key:string,label:string,opts:(string|string[])[])=>`<label class="field"><span>${label}</span><select data-key="${key}">${opts.map(o=>{const [value,text]=Array.isArray(o)?o:[o,o.replace(/-/g," ")];return `<option value="${value}" ${p[key]===value?"selected":""}>${text}</option>`}).join("")}</select></label>`;
const color=(key:string,label:string)=>`<label class="field"><span>${label}</span><input type="color" data-key="${key}" value="${p[key]}"></label>`;
function ensureGamePreferences(){
  p.games ??= {};
  for(const game of GAME_DEFINITIONS){
    p.games[game.id] ??={enabled:true,autoHide:true};
  }
}
const gameCheckbox=(gameId:string,key:keyof GamePreference,label:string)=>{
  const checked=p.games?.[gameId]?.[key] ? "checked" : "";
  return `<label class="check"><input type="checkbox" data-game-id="${gameId}" data-game-key="${key}" ${checked}><span>${label}</span></label>`;
};
const gameDisplayControls=()=>GAME_DEFINITIONS.map(game=>gameCheckbox(game.id,"enabled",`Display ${game.name} timer`)).join("");
const gameAutoHideControls=()=>GAME_DEFINITIONS.map(game=>gameCheckbox(game.id,"autoHide",`Auto-hide ${game.name} when inactive`)).join("");
function applyPreferencesTheme(){
  const root=document.documentElement;
  root.style.setProperty("--prefs-primary",(p.backgroundColor ?? p.primaryBackground)||"#12171c");
  root.style.setProperty("--prefs-secondary",(p.secondaryBackgroundColor ?? p.secondaryBackground)||"#180f1c");
  root.style.setProperty("--prefs-highlight",(p.textColor ?? p.primaryHighlight)||"#20c7ae");
  root.style.setProperty("--prefs-info",(p.accentColor ?? p.infoTextColor)||"#d2d8ed");
}
function render(){ensureGamePreferences();applyPreferencesTheme();app.innerHTML=`<div class="top-drag-zone" data-tauri-drag-region aria-hidden="true"></div><div class="left-header-drag-zone" data-tauri-drag-region aria-hidden="true"></div><header data-tauri-drag-region><h1 class="dash-title" data-tauri-drag-region>DASH</h1><button id="close" aria-label="Close preferences">×</button></header><nav><button class="tab ${activeTab==="settings"?"active":""}" data-tab="settings">Settings</button><button class="tab ${activeTab==="appearance"?"active":""}" data-tab="appearance">Appearance</button></nav>
<section id="settings" ${activeTab==="settings"?"":"hidden"}>
<h2>Overlay</h2>${checkbox("enableOverlay","Enable overlay")}${checkbox("displayUptime","Display Dash uptime")}${gameDisplayControls()}${checkbox("displaySpotify","Display Spotify now playing")}${checkbox("displayIcons","Display icons")}${checkbox("clickThrough","Click-through overlay")}
<h2>Timer Formats</h2>${select("dashTimerFormat","Dash timer format",[["compact","Compact — 2h 23m 4s"],["long","Long — 02 hours 23 mins 04 sec"],["digital","Digital — 02:23:04"]])}${select("valorantTimerFormat","Game timer format",[["compact","Compact — 23m 45s"],["stopwatch","Stopwatch — 23:45.234"],["digital","Digital — 00:23:45"]])}${checkbox("displayMilliseconds","Show stopwatch milliseconds")}${checkbox("leadingZeros","Use leading zeros")}
<h2>Behavior</h2>${checkbox("launchOnStartup","Launch on Windows startup")}${checkbox("autoHideSpotify","Auto-hide Spotify when inactive")}${gameAutoHideControls()}${checkbox("compactMode","Compact mode")}${checkbox("oledBlack","OLED black theme")}
<h2>Layout</h2>${select("overlaySize","Overlay size",["small","medium","large"])}${select("overlayLayout","Overlay layout",["vertical","horizontal"])}${select("overlayPosition","Overlay position",["top-left","top-right","bottom-left","bottom-right"])}
<label class="field"><span>X offset</span><input type="number" data-key="customOverlayX" value="${p.customOverlayX}" min="0"></label><label class="field"><span>Y offset</span><input type="number" data-key="customOverlayY" value="${p.customOverlayY}" min="0"></label><label class="field"><span>Background opacity</span><input type="range" data-key="overlayBackgroundOpacity" value="${p.overlayBackgroundOpacity}" min="0" max="100"><output>${p.overlayBackgroundOpacity}%</output></label>
</section>
<section id="appearance" ${activeTab==="appearance"?"":"hidden"}><h2>Colors</h2>${color("primaryBackground","Background color")}${color("secondaryBackground","Secondary background color")}${color("primaryHighlight","Text color")}${color("infoTextColor","Accent color")}<button id="resetColors" class="secondary">Reset colors</button></section>
<footer><button id="resetTimer" class="secondary">Reset Dash Timer</button><button id="save">Save Changes</button></footer>`;bind();}
function queueAppearancePreview(){
  if(previewTimer!==undefined) window.clearTimeout(previewTimer);
  previewTimer=window.setTimeout(()=>invoke("set_preferences",{preferences:p}).catch(console.error),80);
}
function bind(){
  document.querySelectorAll<HTMLInputElement>("[data-game-id][data-game-key]").forEach(el=>el.addEventListener("input",()=>{
    const gameId=el.dataset.gameId!;
    const gameKey=el.dataset.gameKey as keyof GamePreference;
    p.games![gameId][gameKey]=el.checked;
  }));

  document.querySelectorAll<HTMLInputElement|HTMLSelectElement>("[data-key]").forEach(el=>el.addEventListener("input",()=>{
    const k=el.dataset.key!;
    p[k]=el instanceof HTMLInputElement&&el.type==="checkbox"?el.checked:el instanceof HTMLInputElement&&["number","range"].includes(el.type)?Number(el.value):el.value;
    if(el.type==="range")el.nextElementSibling!.textContent=el.value+"%";

    // Color changes preview immediately. A custom color disables OLED black,
    // otherwise OLED would intentionally hide the selected backgrounds.
    if(el instanceof HTMLInputElement&&el.type==="color"){
      p.oledBlack=false;
      applyPreferencesTheme();
      queueAppearancePreview();
    }
  }));

  document.querySelectorAll<HTMLButtonElement>(".tab").forEach(b=>b.onclick=()=>{
    activeTab=b.dataset.tab as "settings"|"appearance";
    document.querySelectorAll(".tab").forEach(x=>x.classList.toggle("active",x===b));
    (document.querySelector("#settings") as HTMLElement).hidden=activeTab!=="settings";
    (document.querySelector("#appearance") as HTMLElement).hidden=activeTab!=="appearance";
  });

  (document.querySelector("#save") as HTMLButtonElement).onclick=async()=>{
    const button=document.querySelector("#save") as HTMLButtonElement;
    await invoke("set_preferences",{preferences:p});
    const original=button.textContent;
    button.textContent="Saved";
    button.disabled=true;
    setTimeout(()=>{button.textContent=original;button.disabled=false;},900);
  };
  (document.querySelector("#close") as HTMLButtonElement).onclick=()=>appWindow.hide();
  (document.querySelector("#resetTimer") as HTMLButtonElement).onclick=()=>invoke("reset_uptime");
  (document.querySelector("#resetColors") as HTMLButtonElement).onclick=async()=>{
    Object.assign(p,{primaryBackground:"#12171c",secondaryBackground:"#180f1c",primaryHighlight:"#20c7ae",infoTextColor:"#d2d8ed",oledBlack:false});
    activeTab="appearance";
    applyPreferencesTheme();
    await invoke("set_preferences",{preferences:p});
    render();
  };
}
(async()=>{p=await invoke("get_preferences");render();})();
