import {createSaveStore} from './browser-saves.js';
import {serializeBackup,parseBackup,MAX_BACKUP_SIZE} from './portable-save.js';
import {indexPeople,searchPeople} from './player-explorer.js';
import {tournamentStory} from './tournament-story.js';
import {NATIONS,PLAYERS,OPPONENTS,CATALOGUE,configureCatalogue,canDraft,ROUND_COUNT,roundFixtures,lineupExpectation,initialState,playerById,nationById,average,createOffer,selectPlayer,sortBoards,startTournament,simulateRound,standings,rotateReserve,setBoardOrder,restoreSave,draftValue,completeDraft,quickSim,previewRound,recommendedLineup,previewTeams,applyRecommendedLineup} from './engine.js';
import {TRAITS,TRAIT_BONUS_CAP,CAREER_PROFILES,traitById,traitLabel,careerProfile,contextLabel} from './traits.js';
import {STYLES,SWINGS,styleById,fixedProfile,profileFatigue,formLabel,FORM_ELO,FATIGUE_ELO} from './player-profile.js';
import {ERA_DISCLAIMER,ERA_ADJUSTMENT_CAP} from './rating-rules.js';
import {HISTORY_KEY,parseRunHistory,serializeRunHistory,snapshotRun,keepBestRuns} from './run-history.js';

const $=s=>document.querySelector(s);
// Theme preferences stay independent of game saves and catalogue availability.
const THEME_KEY='11-0-0:theme',systemTheme=matchMedia('(prefers-color-scheme: dark)');
let preferredTheme=null;
try{const saved=localStorage.getItem(THEME_KEY);if(saved==='light'||saved==='dark')preferredTheme=saved;}catch{}
function applyTheme(){
  const theme=preferredTheme||(systemTheme.matches?'dark':'light');
  document.documentElement.dataset.theme=theme;
  $('#theme-toggle').setAttribute('aria-pressed',String(theme==='dark'));
  $('#theme-toggle').title=`Switch to ${theme==='dark'?'light':'dark'} mode`;
  $('meta[name="theme-color"]').content=theme==='dark'?'#121a16':'#163c32';
}
applyTheme();
systemTheme.addEventListener('change',()=>{if(!preferredTheme)applyTheme();});
$('#theme-toggle').addEventListener('click',()=>{
  preferredTheme=document.documentElement.dataset.theme==='dark'?'light':'dark';
  applyTheme();
  try{localStorage.setItem(THEME_KEY,preferredTheme);}catch{ /* The choice still applies to this tab. */ }
});
window.addEventListener('storage',event=>{
  if(event.key!==THEME_KEY&&event.key!==null)return;
  preferredTheme=event.newValue==='light'||event.newValue==='dark'?event.newValue:null;
  applyTheme();
});
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const icons={arrow:'↗',spin:'<svg class="spin-icon" viewBox="0 0 16 16" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M13.5 8a5.5 5.5 0 1 1-1.6-3.9L14 2M14 6.5h-4.5V2"/></svg>',chevron:'→',check:'✓',close:'×',king:'♔',queen:'♕',rook:'♖',knight:'♘',bishop:'♗',pawn:'♙'};
const pieces=['king','queen','rook','knight','pawn'];
$('#main').innerHTML='<div class="content-wrap catalogue-loading" role="status">Opening the chess archive…</div>';
try{
  const response=await (window.__cataloguePromise||fetch(document.querySelector('meta[name="catalogue-url"]')?.content||'/api/catalog'));
  if(!response.ok)throw new Error('Catalogue unavailable');
  configureCatalogue(await response.json());
}catch(error){
  $('#main').innerHTML='<div class="content-wrap catalogue-loading"><h1>The archive is taking a moment.</h1><p>Your saved game is still in this browser.</p><a class="primary-button" href="./">Try again</a></div>';
  throw error;
}
const SAVE_KEY='11-0-0:save:v4';
let saveNotice='',initialSaveRaw=null,backupBlocked=false;
let bestRuns=[],historyNotice='',historyWritable=true,recordedTournament=null,runRound=11,runView='matches';
try{
  const previous=localStorage.getItem(HISTORY_KEY);
  if(previous){
    try{bestRuns=parseRunHistory(previous);}
    catch{localStorage.setItem(`${HISTORY_KEY}:backup`,previous);historyNotice='Your unreadable best-run records were preserved in a backup. New completed runs can be recorded.';}
  }
}catch{historyWritable=false;historyNotice='Best-run records could not be loaded. Browser storage is unavailable; new records will last for this tab only.';}
let boardOrderDialogActive=false,planningBaseline=0,planningTrigger="preview";
let state=initialState(),selectedSlot=0,swapSlot=null,busy=false,quickSimRunning=false,selectedRound=null,view='matches',toastTimer,storageFailed=false;
try {
  const previous=localStorage.getItem(SAVE_KEY);initialSaveRaw=previous;
  if(previous){
    let saved;try{saved=JSON.parse(previous);}catch{ /* Preserve malformed saves too. */ }
    const restored=restoreSave(saved);
    if(restored)state=restored;
    else{localStorage.setItem(`${SAVE_KEY}:backup`,previous);saveNotice='The game rules or archive have changed. Your previous save is preserved in a backup; a fresh draft is ready.';}
  }else if(localStorage.getItem('11-0-0:save:v3')||localStorage.getItem('11-0-0:save:v2')||localStorage.getItem('11-0-0:save:v1'))saveNotice='Player profiles are here. Your older game remains stored separately; a fresh draft uses stamina, styles and form.';
}catch {backupBlocked=initialSaveRaw!==null; /* Never replace a save whose backup failed. */ }
selectedSlot=Math.max(0,state.squad.indexOf(null));
const withBrowserLock=(name,fn)=>navigator.locks?navigator.locks.request(`11-0-0:${name}`,fn):Promise.resolve().then(fn);
let saveStore=null,storageConflict=false,pendingBackup=null;
try{saveStore=createSaveStore(localStorage,SAVE_KEY,initialSaveRaw,fn=>withBrowserLock('active-save',fn));}catch{}
function saveStatus(){
  const el=$('#save-status');el.hidden=!storageConflict&&!storageFailed&&!backupBlocked;
  el.innerHTML=backupBlocked?'<p>Your previous save could not be backed up. Its original browser copy is preserved; this new game lasts in this tab until you download it.</p><button class="text-button" data-action="export-original">Download previous save</button><button class="secondary-button" data-action="export-backup">Download this game</button>':storageConflict?'<p>Another tab updated this game. This tab is paused so it cannot overwrite newer progress.</p><button class="secondary-button" data-action="load-latest">Load latest game</button><button class="text-button" data-action="export-backup">Export this tab’s game</button>':storageFailed?'<p>Browser storage could not save your game. Keep this tab open or download a backup.</p><button class="secondary-button" data-action="export-backup">Download backup</button>':'';
}
function conflict(){storageConflict=true;saveStatus();}
function canMutate(){
  if(storageConflict){toast('Load the latest game or export this tab’s game before continuing.');return false;}
  try{if(saveStore?.changed()){conflict();return false;}}catch{storageFailed=true;saveStatus();}
  return true;
}
function save(){
  if(backupBlocked){saveStatus();return;}
  if(storageConflict)return;
  if(!saveStore){storageFailed=true;saveStatus();return;}
  saveStore.write(JSON.stringify(state)).then(result=>{if(result.conflict)conflict();else if(storageFailed){storageFailed=false;saveStatus();}}).catch(()=>{
    if(!storageFailed)toast('Browser storage is unavailable. Keep this tab open or download a backup.');
    storageFailed=true;saveStatus();
  });
}
async function persistRuns(runs){
  return withBrowserLock('best-runs',()=>{
    if(!historyWritable)throw new Error('History storage unavailable');
    const raw=localStorage.getItem(HISTORY_KEY);let stored=[];
    if(raw){try{stored=parseRunHistory(raw);}catch{localStorage.setItem(`${HISTORY_KEY}:backup`,raw);}}
    bestRuns=runs.reduce(keepBestRuns,stored);
    localStorage.setItem(HISTORY_KEY,serializeRunHistory(bestRuns));
  });
}
function rememberCompletedRun(){
  if(state.phase!=='results'||recordedTournament===state.tournament)return;
  recordedTournament=state.tournament;
  const run=snapshotRun(state),next=keepBestRuns(bestRuns,run);
  if(next===bestRuns)return;
  bestRuns=next;
  persistRuns(bestRuns).catch(()=>toast('Your best-run record is available in this tab, but browser storage could not save it.'));
}
window.addEventListener('storage',event=>{if(event.key===SAVE_KEY||event.key===null){try{if(saveStore?.changed())conflict();}catch{storageFailed=true;saveStatus();}}});
async function loadLatest(){
  try{
    await saveStore?.flush();const raw=localStorage.getItem(SAVE_KEY),latest=raw?restoreSave(JSON.parse(raw)):initialState();
    if(!latest)throw new Error('The latest game uses incompatible rules. Export this tab’s game before reloading the app.');
    state=latest;saveStore?.adopt(raw);storageConflict=false;selectedSlot=Math.max(0,state.squad.indexOf(null));selectedRound=null;view='matches';swapSlot=null;
    $('#dialog').close();saveStatus();render();toast('Latest game loaded. You can continue in this tab.');
  }catch(error){toast(error.message||'The latest game could not be loaded. Your current tab is unchanged.');}
}
function downloadBackup(game=state,runs=bestRuns){
  try{
    const blob=new Blob([serializeBackup(game,runs)],{type:'application/json'}),url=URL.createObjectURL(blob),link=document.createElement('a');
    link.href=url;link.download=`11-0-0-${game?'backup':'reports'}-${new Date().toISOString().slice(0,10)}.json`;document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }catch(error){toast(error.message||'The backup could not be created.');}
}
let offlineRegistration=null,offlineMessage='Enable offline play to keep this release and its catalogue on this device.',offlineBusy=false;
function offlineControls(){
  return `<section class="offline-controls"><h3>Play without a connection</h3><p id="offline-status" role="status">${esc(offlineMessage)}</p><div class="data-actions"><button class="secondary-button" data-action="enable-offline" ${offlineBusy||!('serviceWorker' in navigator)?'disabled':''}>${offlineBusy?'Preparing offline play…':offlineRegistration?.active?'Check for offline updates':'Make available offline'}</button>${offlineRegistration?.waiting?'<button class="primary-button" data-action="offline-update">Reload with the update</button>':''}</div><p class="planning-note">Offline play starts after preparation succeeds. Updates wait until you choose to reload or close the old tabs. Download a backup to keep a separate copy of your progress.</p></section>`;
}
function refreshOfflineControls(){const box=$('#offline-controls');if(box)box.innerHTML=offlineControls();}
function watchOfflineRegistration(registration){
  offlineRegistration=registration;
  const refresh=()=>{offlineMessage=registration.waiting?'An offline update is ready. Your current game is saved before reloading.':registration.active?'This release is available offline on this device.':'Preparing offline play…';refreshOfflineControls();};
  const watch=()=>{registration.installing?.addEventListener('statechange',()=>{const worker=registration.installing;refresh();if(worker?.state==='redundant'){offlineMessage='Offline preparation did not finish. Check your connection and try again.';refreshOfflineControls();}});};
  registration.addEventListener('updatefound',watch);watch();refresh();
}
async function enableOffline(){
  if(offlineBusy||!('serviceWorker' in navigator))return;
  offlineBusy=true;offlineMessage='Preparing this release and its catalogue…';refreshOfflineControls();
  try{
    const registration=await navigator.serviceWorker.register('./sw.js',{scope:'./',updateViaCache:'none'});watchOfflineRegistration(registration);
    await registration.update();
    const worker=registration.installing;
    if(worker)await new Promise((resolve,reject)=>{
      const timer=setTimeout(()=>reject(new Error('Preparation is taking too long. Try again when connected.')),30000);
      const finish=()=>{if(['installed','activated'].includes(worker.state)){clearTimeout(timer);resolve();}else if(worker.state==='redundant'){clearTimeout(timer);reject(new Error('The release changed or a download failed. Try preparing offline play again.'));}};
      worker.addEventListener('statechange',finish);finish();
    });
    offlineMessage=registration.waiting?'An offline update is ready. Reload when you are ready.':registration.active?'This release is available offline on this device.':'Finishing offline preparation…';
  }catch(error){offlineMessage=error.message||'Offline preparation could not finish. Try again when connected.';}
  finally{offlineBusy=false;refreshOfflineControls();}
}
async function useOfflineUpdate(){
  if(!offlineRegistration?.waiting)return;
  await saveStore?.flush();if(!canMutate()||storageFailed||backupBlocked){toast('Download your current game or load the latest save before updating.');return;}
  navigator.serviceWorker.addEventListener('controllerchange',()=>location.reload(),{once:true});
  offlineRegistration.waiting.postMessage({type:'ACTIVATE_UPDATE'});
}
if('serviceWorker' in navigator)navigator.serviceWorker.getRegistration(new URL('./',location.href)).then(registration=>{
  if(registration){watchOfflineRegistration(registration);registration.update().catch(()=>{});}
}).catch(()=>{});
function dataDialog(){
  modal(`<span class="section-number">YOUR GAME. YOUR DEVICE.</span><h2 id="dialog-title">Saves &amp; offline.</h2><p class="dialog-lead">Download your game and Best runs to keep a copy or move between browsers. Import previews the contents before replacing progress. Reports from older rules can be imported independently.</p><div class="data-actions"><button class="primary-button" data-action="export-backup">Download game &amp; reports</button><button class="secondary-button" data-action="export-reports">Download Best runs only</button></div><label class="input-label" for="backup-file">IMPORT A BACKUP OR REPORT FILE</label><input id="backup-file" type="file" accept="application/json,.json"><p class="planning-note">JSON backups up to 10 MB. Incompatible active games stay unplayable; valid completed reports remain readable. Importing reports merges the best three without duplicate entries.</p><div id="backup-preview" role="status"></div><div id="offline-controls">${offlineControls()}</div><button class="primary-button" data-action="close">Back to the game →</button>`);
}
async function previewBackup(file){
  pendingBackup=null;if(!file)return;
  try{
    if(file.size>MAX_BACKUP_SIZE)throw new Error('Choose a backup smaller than 10 MB.');
    pendingBackup=parseBackup(await file.text());const p=pendingBackup;
    $('#backup-preview').innerHTML=`<h3>Ready to review</h3><p>${p.game?`${esc(p.game.teamName)} · ${esc(p.game.phase)}${p.game.tournament?` · round ${p.game.tournament.round} of 11`:''}`:p.hasGame?'The active game uses another catalogue or rules version. Your current game will stay in place.':'Completed reports only.'}</p><p>${p.runs.length} completed ${p.runs.length===1?'report':'reports'} · exported ${esc(new Date(p.exportedAt).toLocaleDateString())}</p>${p.game?'<button class="primary-button" data-action="import-game">Replace current game &amp; merge reports</button>':''}${p.runs.length?'<button class="secondary-button" data-action="import-reports">Merge reports only</button>':''}<p class="planning-note">The current browser save and reports are backed up before replacement.</p>`;
  }catch(error){$('#backup-preview').textContent=error.message||'This file could not be read.';}
}
async function importBackup(includeGame){
  const p=pendingBackup;if(!p||includeGame&&!p.game)return;
  try{
    await saveStore?.flush();
    if(includeGame&&!canMutate())return;
    const oldGame=localStorage.getItem(SAVE_KEY),oldHistory=localStorage.getItem(HISTORY_KEY);
    if(oldGame)localStorage.setItem(`${SAVE_KEY}:backup`,oldGame);
    if(oldHistory)localStorage.setItem(`${HISTORY_KEY}:backup`,oldHistory);
    if(includeGame){
      if(!saveStore)throw new Error('Browser storage is unavailable. Import left your game unchanged.');
      const result=await saveStore.write(JSON.stringify(p.game));if(!result.ok){conflict();return;}
      state=p.game;recordedTournament=null;selectedSlot=Math.max(0,state.squad.indexOf(null));selectedRound=null;view='matches';swapSlot=null;
    }
    await persistRuns([...bestRuns,...p.runs]);pendingBackup=null;$('#dialog').close();render();toast(includeGame?'Game imported and Best runs merged.':'Best runs merged. Your active game is unchanged.');
  }catch(error){if(includeGame&&state===p.game){$('#dialog').close();render();toast('The game was imported, but browser storage could not merge its reports. Keep the backup file.');}else toast(error.message||'Import could not be saved. Your game is unchanged.');}
}
function toast(message){$('#toast').textContent=message;$('#toast').classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').classList.remove('visible'),4000);}
const label=(n)=>n===0.5?'½':String(n).replace('.5','½');
const scoreLabel=(a,b)=>`${label(a)} – ${label(b)}`;
const count=()=>state.squad.filter(Boolean).length;
const revealed=()=>state.mode==='classic'||state.phase!=='draft';
const rating=p=>revealed()?p.rating:'????';
const offerPeriod=n=>n.periodLabel||String(n.year);
const playerOrigin=p=>p.offerKind==='legends'?'Legends':p.federation;

function traitBadge(player,trait){
  const fixed=player.traitInfo?.career??careerProfile(player),definition=traitById(trait);
  const symbol=trait==='rook'?'♜':['preparation','specialist','innovator','flexible'].includes(trait)?'▤':['defender','prophylaxis','materialist','counterattacker'].includes(trait)?'◇':['endgame','simplifier','grinder','positional','coordinator','exchange'].includes(trait)?'⊞':['practical','time-trouble'].includes(trait)?'◷':trait===null?'—':'♞';
  return `<span class="trait-badge ${fixed?'career-trait':''} ${trait===null?'no-trait':''}" title="${esc(player.traitInfo?.description||definition?.description||'No match modifier.')}" data-trait="${esc(trait||'none')}"><span class="trait-icon" aria-hidden="true">${symbol}</span><span>${fixed?'Career':'Rolled'} · ${esc(player.traitInfo?.name||traitLabel(trait))}</span></span>`;
}
const signed=n=>`${n>0?'+':''}${n}`;
const sourceValue=p=>p.rawRating??p.baseRating;
const eraLine=p=>`${sourceValue(p)} source${p.eraAdjustment===undefined?'':` · ${signed(p.eraAdjustment)} era`}`;
function eraNotice(){return `<aside class="rating-notice"><strong>Era-balanced game ratings</strong><span>${esc(ERA_DISCLAIMER)}</span><button class="text-button" data-action="rating-guide">How ratings work ↗</button></aside>`;}
function ratingGuide(){modal(`<span class="section-number">RATINGS ACROSS THE ERAS</span><h2 id="dialog-title">A fairer fantasy field.</h2><p class="dialog-lead">${esc(ERA_DISCLAIMER)}</p><div class="rules-note"><strong>Source → Game → Effective</strong><p>The source rating is the original FIDE rating or labelled Chessmetrics estimate. The game rating maps an edition’s standing in its source list to the same rank in the fixed January 2026 list. Equal source ratings share the average reference value at their tied ranks. Changes are capped at ±${ERA_ADJUSTMENT_CAP} points and rounded to whole points.</p><p>Between observed ratings, the mapping interpolates. Beyond the observed range, it preserves the rating gap from the nearest endpoint. Short early lists use their published ranks only; missing lower-ranked players are not invented.</p><p>For example, Paul Morphy’s June 1859 source estimate is 2743. His era adjustment is +97, giving a game base of 2840. Match traits, style, form, daily performance and fatigue then produce his effective rating.</p><p>The same game bases govern drafting, board order, reserve planning, tournament seeding and the national opponent field for both sides. Country top fives follow source ratings. A country-year is playable only if at least one source rating is above 2650. Classic and Expert still control draft rating visibility.</p></div><button class="primary-button" data-action="close">Back to the game →</button>`);}
function profileText(profile,form=profile.form,formElo=FORM_ELO){return `${styleById(profile.style).name} style, stamina ${profile.stamina} of 5, consistency ${profile.consistency} of 5${form===null?'':`, ${formLabel(form)} form, ${signed(form*formElo)} Elo`}`;}
function profileMarkup(profile,form=profile.form,compact=false,formElo=FORM_ELO){
  return `<span class="player-profile ${compact?'compact-profile':''}"><span class="style-chip">${esc(styleById(profile.style).name)}</span>${compact?'':`<span class="profile-levels">Stamina ${profile.stamina}/5 · Consistency ${profile.consistency}/5</span>`}${form===null?'':`<span class="form-chip ${form>0?'hot':form<0?'cold':''}">${formLabel(form)} · ${signed(form*formElo)} Elo</span>`}</span>`;
}
function catalogueTrait(player){const fixed=careerProfile(player),profile=fixedProfile(player);return fixed?`${traitBadge(player,fixed.trait)}${profileMarkup(profile,null)}`:'<span class="trait-pending">Trait and profile roll when drawn</span>';}
function fatigueMarkup(team,id,resting=false){
  const load=team.loads[id],penalty=profileFatigue(team.traits[id],load);
  return `<span class="fatigue-status"><span>Fatigue load ${load}/100 · ${resting?(state.phase==='results'?'Rested last round':'Resting next round'):`−${penalty} Elo`}</span><meter class="fatigue-meter" min="0" max="100" low="25" high="65" optimum="0" value="${load}" aria-label="${esc(playerById(id).name)} fatigue load, ${load} of 100">${load}/100</meter></span>`;
}
function boardReadout(p,collapsed=false,formElo=FORM_ELO){
  const breakdown=`<small>LOAD ${p.fatigueLoad}/100 · ${p.streak} CONSECUTIVE ROUNDS</small><small>TRAIT ${signed(p.traitBonus)} · STYLE ${signed(p.styleBonus)}</small><small>FORM ${signed(p.formBonus)} · PERFORMANCE ${signed(p.performance)}</small>${p.drawShift?`<small>DRAW CHANCE ${signed(Math.round(p.drawShift*100))} POINTS</small>`:''}${p.afterForm===undefined?'':`<small>FORM AFTER GAME: ${formLabel(p.afterForm)} · LOAD ${p.afterFatigue}/100</small>`}`;
  return `${traitBadge(p,p.trait)}${profileMarkup(p,p.form,false,formElo)}<small class="effective-rating"><b>${p.rating}</b> EFFECTIVE ELO</small><small>${esc(eraLine(p))} → ${p.baseRating} GAME · FATIGUE −${p.fatigue}</small>${collapsed?`<details class="board-breakdown"><summary>Performance breakdown</summary>${breakdown}</details>`:breakdown}`;
}

function stepper(){const phase=state.phase==='draft'?count()===5?1:0:state.phase==='results'?3:2;return `<div class="stepper" aria-label="Game progress">${['Draft your team','Set your boards','Play the Olympiad'].map((text,i)=>`<div class="step ${phase===i?'current':''} ${phase>i?'done':''}"><span>${phase>i?'✓':`0${i+1}`}</span>${text}</div>${i<2?'<div class="step-line"></div>':''}`).join('')}</div>`;}
function hero(){return `<section class="hero"><div class="edition-line"><span>THE FANTASY CHESS OLYMPIAD</span><span>COLLECTED YEARS / ${CATALOGUE.earliestEditionYear}–${CATALOGUE.years[0]}</span></div><div class="hero-copy"><div class="eyebrow">FROM THE ARCHIVE. ONTO THE WORLD STAGE.</div><h1>Chess history. <br><em>Your next five.</em></h1><p>A country. A year. A collection of legends.<br>Draft across the eras and chase eleven wins on the world stage.</p></div><div class="hero-art" aria-hidden="true"><span class="folio-label">THE ALL-TIME COLLECTION</span><div class="folio-board"><img class="art-knight" src="./knight.svg" alt=""><img class="art-king" src="./king.svg" alt=""></div><span class="folio-year">${CATALOGUE.earliestEditionYear}<i> / </i>${CATALOGUE.years[0]}</span><div class="art-caption"><span>THE RECORD TO CHASE</span><strong>11 <i>–</i> 0 <i>–</i> 0</strong><small>WINS &nbsp; DRAWS &nbsp; LOSSES</small></div></div><div class="hero-bottom"><span>${CATALOGUE.countrySnapshotCount} COUNTRY-YEARS + ${CATALOGUE.legendCount} LEGENDS <b>·</b> ${CATALOGUE.countryCount} FEDERATIONS</span><div>FOUR BOARDS <b>·</b> ONE RESERVE <b>·</b> ELEVEN ROUNDS</div></div></section>`;}
function squadSlot(id,i){const p=playerById(id);return `<button class="squad-slot ${p?'filled':''} ${selectedSlot===i&&state.phase==='draft'?'selected':''} ${swapSlot===i?'swap-selected':''} ${i===4?'reserve-slot':''}" data-action="slot" data-slot="${i}" aria-pressed="${selectedSlot===i&&state.phase==='draft'}" ${p?'title="Click to swap positions"':''}><span class="slot-label">${i===4?'THE RESERVE':`BOARD 0${i+1}`} ${p?'<span class="slot-status" aria-hidden="true">●</span>':''}</span>${p?`<span class="piece-token" aria-hidden="true">${icons[pieces[i]]}</span><span class="slot-player">${esc(p.name)}</span><span class="slot-meta">${p.flag} ${playerOrigin(p)} ${p.year} <b>·</b> ${rating(p)}</span>${traitBadge(p,state.traits[p.id])}${profileMarkup(state.profiles[p.id],state.profiles[p.id].form,true)}`:`<span class="empty-piece" aria-hidden="true">${icons[pieces[i]]}</span><span class="slot-empty">${i===4?'Your secret weapon':'Your next great'}</span><span class="slot-plus" aria-hidden="true">+</span>`}</button>`;}
function squadPanel(){const complete=count()===5;return `<section class="squad-panel"><div class="panel-title"><div><span class="section-number">02 / YOUR LINEUP</span><h2>The dream team<span>.</span></h2></div><button class="text-button on-dark" data-action="team-name" aria-label="${esc(state.teamName)} — rename team">${esc(state.teamName)} <span aria-hidden="true">✎</span></button></div><div class="board-surface"><div class="board-coordinate coordinate-top">a <span>b</span> c <span>d</span> e <span>f</span> g <span>h</span></div><div class="squad-grid">${state.squad.slice(0,4).map(squadSlot).join('')}</div><div class="reserve-row"><span class="reserve-note">FOUR MINDS.<br>ONE MISSION.</span>${squadSlot(state.squad[4],4)}<span class="reserve-note reserve-right">THE ROAD<br>TO 11–0–0.</span></div><div class="board-coordinate coordinate-bottom">a <span>b</span> c <span>d</span> e <span>f</span> g <span>h</span></div></div><div class="squad-summary"><div><span class="mini-label">PLAYERS DRAFTED</span><strong>${count()}<small> / 5</small></strong></div><div><span class="mini-label">TEAM RATING</span><strong>${count()?state.mode==='expert'?'????':average(state.squad.slice(0,4)):'—'}<small> ELO</small></strong></div></div><div class="squad-profiles"><span>You choose the lineup.</span><button class="text-button on-dark" data-action="profiles" ${count()?'':'disabled'}>Team profiles ↗</button></div><div class="squad-panel-bottom"><span><span class="mint-dot"></span> ${complete?'Squad complete. Ready for the world.':'Select a board, then draft a player to fill it.'}</span><button class="text-button on-dark" data-action="sort">Order by rating ${icons.spin}</button></div></section>`;}

function compareDraft(){
  if(state.phase!=='draft'||!state.offer)return;
  const offer=state.offer,classic=state.mode==='classic';
  const values=classic?offer.players.filter(id=>canDraft(playerById(id),state.squad)).map(id=>draftValue(playerById(id),offer.traits[id],offer.profiles[id])):[];
  const best=Math.max(...values);
  modal(`<span class="section-number">YOUR CURRENT OFFER</span><h2 id="dialog-title">Compare the five.</h2><p class="dialog-lead">Balance immediate strength, specialist conditions and endurance. These are the assignments already rolled for this offer.</p>
    <div class="comparison-grid">${offer.players.map(id=>{
      const p=playerById(id),profile=offer.profiles[id],trait=offer.traits[id],available=canDraft(p,state.squad);
      const value=classic?draftValue(p,trait,profile):null;
      return `<article class="comparison-card"><span class="section-number">#${p.rank} · ${esc(playerOrigin(p))} ${p.year}${available?'':' · ALREADY DRAFTED'}</span><h3>${esc(p.name)}</h3>
        ${classic?`<p><strong>${p.rating}</strong> game Elo · ${eraLine(p)}</p><p class="comparison-outlook"><strong>${(value*100).toFixed(1)}%</strong> reference board score${available&&Math.abs(value-best)<1e-12?' · Highest available outlook':''}</p>`:'<p class="comparison-outlook">Expert · ratings and rating-derived estimates hidden</p>'}
        ${traitBadge(p,trait)}<p>${esc(traitById(trait)?.description||'No trait modifier.')}</p>${profileMarkup(profile)}
        <dl><div><dt>Workload per game</dt><dd>+${14-profile.stamina} load</dd></div><div><dt>Daily swing</dt><dd>±${SWINGS[profile.consistency]} Elo</dd></div><div><dt>Starting form</dt><dd>${signed(profile.form*FORM_ELO)} Elo, evolves during play</dd></div></dl>
        <button class="secondary-button" data-action="pick" data-id="${esc(id)}" ${available?'':'disabled'}>Draft ${esc(p.name)} →</button></article>`;
    }).join('')}</div>
    <p class="planning-note">${classic?'The reference outlook is the same estimate used by Quick Draft: average board score across nine appearances in eleven rounds against a neutral 2720 reference, integrating trait/style effects, fatigue, decaying starting form and daily swings. It is a comparison aid, not a forecast of your tournament.':'Expert keeps source ratings, game ratings and estimates derived from ratings hidden here. Compare visible traits, styles and profiles.'} Source observations and all five offered players stay unchanged.</p><button class="primary-button" data-action="close">Back to the offer →</button>`,'planning');
}
function candidateCard(id){
  const p=playerById(id),available=canDraft(p,state.squad),alreadyPicked=state.squad.filter(Boolean).some(id=>playerById(id).personId===p.personId);
  const reason=alreadyPicked?'Already in your squad':'';
  return `<button class="candidate" data-action="pick" data-id="${p.id}" ${busy||!available?'disabled':''}><span class="candidate-initial" aria-hidden="true">${esc(p.name.split(' ').at(-1).slice(0,1))}<span>${p.flag}</span></span><span class="candidate-info"><span class="candidate-title">#${p.rank} IN ${playerOrigin(p)} ${p.year} <span>${esc(p.title||'PLAYER')}</span></span><strong>${esc(p.name)}</strong><span class="candidate-rating">${rating(p)} <small>GAME ELO</small></span><span class="source-rating">${revealed()?`${eraLine(p)} · ${p.estimated?'estimate':'FIDE'} · ${p.year}`:'Source rating hidden'}${reason?` · ${reason}`:''}</span>${traitBadge(p,state.offer.traits[id])}<span class="trait-description">${esc(traitById(state.offer.traits[id])?.description||'No match modifier.')}</span>${profileMarkup(state.offer.profiles[id])}</span><span class="candidate-end" aria-hidden="true"><span class="pick-arrow">↗</span></span></button>`;
}
function draftConsole(){const offer=state.offer,nation=offer?nationById(offer.nation):null,complete=count()===5;return `<section class="draft-console"><div class="console-top"><span class="section-number">01 / THE DRAFT</span><span class="draft-pick">PICK <strong>${Math.min(5,count()+1)}</strong> OF 5</span></div><h2>${complete?'A team worth believing in.':'Greatness is in the draw.'}</h2><p class="console-description">${complete?'Your five are ready. Set your boards and take on the world.':'Country-year top fives and pre-1927 Legends collections.'}</p><div class="mode-switch" role="group" aria-label="Draft difficulty"><button data-action="mode" data-mode="classic" class="${state.mode==='classic'?'active':''}" ${count()||offer?'disabled':''}>Classic <span>Ratings visible</span></button><button data-action="mode" data-mode="expert" class="${state.mode==='expert'?'active':''}" ${count()||offer?'disabled':''}>Expert <span>Trust your instincts</span></button></div>${complete?`<div class="complete-draft"><span>♖</span><strong>The world is waiting.</strong><p>Four boards, eleven rounds.<br>How far can your team go?</p><div class="complete-stats"><span>${average(state.squad.slice(0,4))}<small>STARTING ELO</small></span><span>5<small>UNIQUE PLAYERS</small></span></div></div><button class="primary-button" data-action="start" ${busy?'disabled':''}>Enter the Olympiad <span>→</span></button><p class="under-button">Click two players on your team to swap their positions.</p>`:`<div class="nation-draw ${offer?'drawn':''} ${busy?'spinning':''}" aria-live="polite"><div class="nation-flag">${nation?nation.flag:'✧'}</div><div><span>${nation?(nation.kind==='legends'?'YOUR LEGENDS COLLECTION':'YOUR FEDERATION DRAW'):'THE WORLD IS YOUR PLAYER POOL'}</span><strong>${nation?`${esc(nation.name)} <b class="snapshot-year">${offerPeriod(nation)}</b>`:'Which country and year?'}</strong><small>${nation?`${nation.kind==='legends'?'MIXED ERAS · FIVE HISTORICAL GREATS':`${nation.code} / TOP FIVE · ${nation.source.date}`}`:`${CATALOGUE.countrySnapshotCount.toLocaleString()} country-year rolls + ${CATALOGUE.legendCount} Legends collections`}</small></div>${nation?'<span class="nation-code">'+nation.code+'</span>':'<span class="globe-grid" aria-hidden="true">◎</span>'}</div>${offer?`<button class="text-button compare-offer" data-action="draft-compare">Compare candidates ↗</button><div class="candidate-list">${offer.players.map(candidateCard).join('')}</div><button class="snapshot-source text-button" data-action="snapshot-source">Rating list &amp; source ↗</button><button class="reroll-button" data-action="reroll" ${!state.rerolls||busy?'disabled':''}>${icons.spin} &nbsp; Reroll nation <span>${state.rerolls} left</span></button><p class="under-button">Choose wisely. This pick is permanent.</p>`:`<button class="primary-button" data-action="spin" ${busy?'disabled':''}>${icons.spin} ${busy?quickSimRunning?'Simulating the Olympiad…':'Drawing your nation…':'Spin a nation'} <span>→</span></button><p class="under-button">${state.rerolls} nation rerolls available. Make them count.</p>`}`}</section>`;}
function bottomCards(){return `<section class="insight-row"><div class="insight"><span class="insight-icon">♙</span><div><strong>Build beyond borders</strong><p>Your dream team, drawn from across the world.</p></div></div><div class="insight"><span class="insight-icon">⚑</span><div><strong>The real team format</strong><p>Four active boards. One game-changing reserve.</p></div></div><div class="insight"><span class="insight-icon">✦</span><div><strong>Chase the impossible</strong><p>Eleven wins. No draws. No losses. Can you?</p></div></div></section>`;}
function renderDraft(){return `${hero()}<div class="content-wrap">${stepper()}<div class="game-toolbar"><div><button class="small-tag" data-action="archive">COUNTRIES &amp; YEARS ↗</button><button class="small-tag" data-action="explorer">PLAYERS &amp; EDITIONS ↗</button><button class="small-tag" data-action="field">ALL-TIME FIELD ↗</button><button class="small-tag" data-action="traits">PLAYER TRAITS ↗</button></div><div class="draft-shortcuts"><div class="draft-shortcut-buttons"><button class="text-button" data-action="quick" ${busy?'disabled':''}>Quick draft <span>↗</span></button><button class="quick-sim-button" data-action="quick-sim" aria-describedby="quick-sim-help" ${busy?'disabled':''}>${quickSimRunning?'Simulating…':'Quick sim'} <span aria-hidden="true">»</span></button></div><small id="quick-sim-help" aria-live="polite">${quickSimRunning?'Playing 11 rounds with automatic rotation…':count()===5?'Your squad. Auto-rotate all 11 rounds.':count()?'Keep your picks. Auto-draft and simulate.':'Auto-draft a squad. Play all 11 rounds.'}</small></div></div>${eraNotice()}<div class="draft-layout">${draftConsole()}${squadPanel()}</div>${bottomCards()}<div class="reset-row"><span><span class="mint-dot"></span> Your progress saves automatically in this browser.</span><button class="text-button" data-action="reset">Start fresh ${icons.spin}</button></div></div>`;}

function userMatch(round,game=state){const m=game.tournament.rounds[round-1]?.find(m=>m.a==='YOU'||m.b==='YOU');if(!m)return null;const us=m.a==='YOU';return {...m,us,ourPoints:us?m.points:4-m.points,opponent:game.tournament.teams.find(t=>t.id===(us?m.b:m.a))};}
function matchDetails(round,game=state){const match=userMatch(round,game);if(!match)return `<div class="awaiting-match"><span>♔</span><h2>Your Olympiad starts here.</h2><p>Play the first round to meet your opening opponent.</p></div>`;const result=match.ourPoints>2?'Victory':match.ourPoints===2?'Draw':'Defeat';return `<div class="match-heading"><h2 class="match-heading-title"><span>ROUND ${String(round).padStart(2,'0')} / MATCH REPORT</span></h2><span class="result-pill ${result.toLowerCase()}">${result}</span></div><div class="match-score"><div><span class="team-emblem">✦</span><strong>${esc(game.teamName)}</strong><small>YOUR FANTASY TEAM</small></div><strong>${scoreLabel(match.ourPoints,4-match.ourPoints)}</strong><div><span class="team-emblem">${esc(match.opponent.flag)}</span><strong>${esc(match.opponent.name)}</strong><small>${Math.round(match.boards.reduce((sum,b)=>sum+(match.us?b.b:b.a).baseRating,0)/4)} TEAM ELO</small></div></div><div class="board-results"><div class="board-results-head"><span>BOARD</span><span>YOUR GRANDMASTER</span><span>SCORE</span><span>OPPOSITION</span></div>${match.boards.map((b,i)=>{const us=match.us?b.a:b.b,other=match.us?b.b:b.a,points=match.us?b.score:1-b.score,white=match.us?b.white:!b.white;return `<div class="board-result"><span class="board-number">0${i+1}</span><div><strong><i class="color-dot ${white?'white':'black'}" title="${white?'White':'Black'} pieces"></i>${esc(us.name)}</strong>${boardReadout(us,true,game.formElo)}</div><span class="board-score ${points===1?'win':points===0?'loss':''}">${scoreLabel(points,1-points)}</span><div><strong>${esc(other.name.replace(' · board', ' · #'))}</strong>${boardReadout(other,true,game.formElo)}</div><small class="board-condition">${esc(contextLabel(b.context))}</small></div>`;}).join('')}</div>`;}
function table(full=false,rows=standings(state.tournament)){const me=rows.findIndex(t=>t.id==='YOU');let selected=full?rows:rows.slice(0,5);if(!full&&me>=5)selected=[...selected,rows[me]];return `<div class="standings-table"><div class="standings-row table-head"><span>#</span><span>TEAM</span><span>MP</span><span>BP</span>${full?'<span>SB</span>':''}</div>${selected.map(t=>`<div class="standings-row ${full?'full':''} ${t.id==='YOU'?'you':''}"><span>${rows.indexOf(t)+1}</span><strong><span class="table-flag">${esc(t.flag)}</span>${esc(t.name)}${t.id==='YOU'?'<small>YOU</small>':''}</strong><b>${t.mp}</b><span>${label(t.bp)}</span>${full?`<span>${label(t.sb)}</span>`:''}</div>`).join('')}</div>`;}
function tournamentSquad(){
  const t=state.tournament,own=t.teams.find(team=>team.id==='YOU');
  return `<div class="live-squad"><div class="live-squad-title"><span class="section-number">YOUR MATCHDAY FIVE</span><button class="text-button" data-action="rotate" ${state.phase==='results'?'disabled':''}>Rotate reserve ${icons.spin}</button></div><button class="text-button profile-button" data-action="profiles">Team profiles ↗</button><div class="live-player-list">${t.squad.map((id,i)=>{const p=playerById(id);return `<div class="live-player"><span class="live-player-position">${i===4?'R':`0${i+1}`}</span><span>${p.flag}</span><strong>${esc(p.name)}${traitBadge(p,state.traits[id])}${profileMarkup(state.profiles[id],own.forms[id])}<small>${p.rating} GAME ELO · ${eraLine(p)} · ${t.streaks[id]} CONSECUTIVE ROUNDS</small>${fatigueMarkup(own,id,i===4)}</strong><span class="energy ${i===4?'resting':''}" title="${i===4?'Resting':`${t.streaks[id]} consecutive rounds`}">${i===4?'↺':'●'}</span></div>`;}).join('')}</div></div>`;
}
function tournamentActions(done,rank,perfect){
  const round=state.tournament.round;
  return `<section class="next-round" aria-label="${done?'Tournament result actions':'Next round actions'}"><div class="round-intro">${done?`<span class="next-round-label">TOURNAMENT COMPLETE</span><strong>${perfect?'11–0–0. Legendary.':rank===1?'Gold looks good on you.':'The next run could be the one.'}</strong>`:`<div class="next-round-label"><span class="mint-dot"></span> NEXT UP / ROUND ${String(round+1).padStart(2,'0')}</div><p>${round===0?'The first move is yours.':round===10?'One last round. Make it count.':'New round. New opponent.'}</p>`}</div><div class="round-actions">${done?`<button class="primary-button" data-action="share">Copy result <span>↗</span></button><button class="secondary-button" data-action="reset">Build another team ${icons.spin}</button>`:`<button class="secondary-button preview-button" data-action="preview" ${busy?'disabled':''}>Preview next match ↗</button><button class="primary-button" data-action="next" ${busy?'disabled':''}>${busy?'Playing the boards…':`Play round ${round+1}`} <span>→</span></button><button class="text-button board-order-button" data-action="board-order" ${busy?'disabled':''}>Arrange boards ⇅</button><button class="text-button simulate-all" data-action="finish" ${busy?'disabled':''}>Auto-rotate &amp; finish ↗</button>`}</div></section>`;
}
function renderTournament(){const t=state.tournament,done=state.phase==='results',me=t.teams.find(x=>x.id==='YOU'),rank=standings(t).findIndex(x=>x.id==='YOU')+1,perfect=me.w===11;const round=selectedRound||t.round;return `<div class="tournament-hero"><div class="content-wrap"><span class="eyebrow"><span class="tiny-diamond">✦</span> ${done?'THE FINAL STANDING':'YOUR ROAD TO GOLD'}</span><h1>${done?perfect?'The perfect <em>eleven.</em>':rank===1?'On top of <em>the world.</em>':rank<=3?'A place on <em>the podium.</em>':'A run to <em>remember.</em>':'One team. <em>All in.</em>'}</h1><div class="tournament-hero-bottom"><p>${done?`You finished ${ordinal(rank)} of ${t.teams.length}. ${perfect?'Eleven wins. You made the impossible happen.':rank===1?'Olympiad champions. What a team.':'Every great run starts with a dream team.'}`:`${esc(state.teamName)} · Fantasy Olympiad · Round ${t.round} of 11`}</p><span class="live-tag"><i></i> ${done?'TOURNAMENT COMPLETE':'TOURNAMENT IN PROGRESS'}</span></div></div></div><div class="content-wrap tournament-content"><section class="tournament-stats"><div><span>MATCH RECORD</span><strong>${me.w}<i>–</i>${me.d}<i>–</i>${me.l}</strong><small>WINS · DRAWS · LOSSES</small></div><div><span>WORLD RANK</span><strong>${String(rank).padStart(2,'0')}<small> / ${t.teams.length}</small></strong><small>${rank<=3?'PODIUM POSITION':'KEEP CLIMBING'}</small></div><div><span>MATCH POINTS</span><strong>${me.mp}<small> / ${t.round*2||22}</small></strong><small>2 FOR A WIN · 1 FOR A DRAW</small></div><div><span>BOARD POINTS</span><strong>${label(me.bp)}<small> / ${t.round*4||44}</small></strong><small>EVERY BOARD COUNTS</small></div></section>${tournamentActions(done,rank,perfect)}${done?storyPanel(snapshotRun(state)):''}${eraNotice()}<div class="tournament-layout"><div class="tournament-main"><section class="match-panel"><div class="match-panel-toolbar"><div class="view-tabs" role="group" aria-label="Tournament view"><button class="${view==='matches'?'active':''}" data-action="view" data-view="matches">Your matches</button><button class="${view==='standings'?'active':''}" data-action="view" data-view="standings">Full standings</button></div><div class="match-tools"><button class="text-button" data-action="explorer">Player explorer ↗</button><button class="text-button" data-action="traits">Player traits ↗</button><button class="text-button" data-action="field">All-time field ↗</button></div></div>${view==='standings'?table(true):`<div class="round-tabs" role="group" aria-label="Select round">${Array.from({length:11},(_,i)=>{const m=userMatch(i+1);return `<button data-action="round" data-round="${i+1}" class="${round===i+1?'active':''} ${m?m.ourPoints>2?'won':m.ourPoints===2?'drawn':'lost':''}" ${i>=t.round?'disabled':''}>${String(i+1).padStart(2,'0')}<span>${m?m.ourPoints>2?'W':m.ourPoints===2?'D':'L':'·'}</span><span class="sr-only">${m?m.ourPoints>2?', won':m.ourPoints===2?', drawn':', lost':', unplayed'}</span></button>`;}).join('')}</div>${matchDetails(round)}`}</section>${done||view==='standings'?'':`<div class="mini-leaderboard"><div class="mini-leaderboard-heading"><h3>The chasing pack<span>.</span></h3><button class="text-button" data-action="view" data-view="standings">All ${t.teams.length} teams ↗</button></div>${table()}</div>`}</div><aside class="tournament-aside">${tournamentSquad()}</aside></div><div class="reset-row"><span><span class="mint-dot"></span> ${done?'Game ratings and simulated results. Your own alternate chess universe.':'Progress saved. Rotate your reserve to manage player fatigue.'}</span><button class="text-button" data-action="reset">New draft ${icons.spin}</button></div></div>`;}
function storyPanel(run,archived=false){
  const story=tournamentStory(run),leader=story.players[0],upset=story.upset,closest=story.closest;
  return `<section class="tournament-story" aria-label="Tournament story"><span class="section-number">ELEVEN ROUNDS. YOUR STORY.</span><h2>A team effort.</h2>
    <div class="story-highlights"><article><span>TOP SCORER</span><strong>${esc(leader.name)}</strong><p>${label(leader.points)} points from ${leader.games} games</p></article>
    <article><span>BIGGEST UPSET WIN</span><strong>${upset?esc(upset.player):'No underdog wins'}</strong><p>${upset?`Round ${upset.round} vs ${esc(upset.opponent)} · ${Math.round(upset.win*100)}% pre-match win chance`:'Your board wins came with at least equal expected chances.'}</p></article>
    <article><span>CLOSEST MATCH</span><strong>${scoreLabel(closest.points,4-closest.points)}</strong><p>Round ${closest.round} vs ${esc(closest.opponent)}</p></article></div>
    <h3>Your place after each round</h3><ol class="rank-trail">${story.ranks.map(r=>`<li><button data-action="${archived?'run-round':'story-round'}" ${archived?`data-id="${esc(run.id)}"`:''} data-round="${r.round}"><span>R${r.round}</span><strong>#${r.rank}</strong><small>${r.mp} MP</small><span class="sr-only"> — review round ${r.round}, ranked ${r.rank} of ${run.standings.length}</span></button></li>`).join('')}</ol>
    <div class="report-table-wrap" tabindex="0" role="region" aria-label="Player scoreboard"><table class="player-scoreboard"><caption>Your five · individual board scores</caption><thead><tr><th scope="col">Player</th><th scope="col">Games</th><th scope="col">W–D–L</th><th scope="col">Points</th><th scope="col">Forecast total</th></tr></thead><tbody>${story.players.map(p=>`<tr><th scope="row">${esc(p.name)}</th><td>${p.games}</td><td>${p.w}–${p.d}–${p.l}</td><td><strong>${label(p.points)}</strong></td><td>${p.expected===null?'Unavailable':p.expected.toFixed(2)}</td></tr>`).join('')}</tbody></table></div>
    <p class="planning-note">Forecast totals sum the expectations on boards actually played. Opponents and form adapt to results along the Swiss path; these are diagnostics, not unconditional tournament expectations. Equal highlights keep the earlier round.</p></section>`;
}
function ordinal(n){return `${n}${n%100>=11&&n%100<=13?'th':({1:'st',2:'nd',3:'rd'})[n%10]||'th'}`;}
const runDate=run=>new Date(run.completedAt).toLocaleDateString(undefined,{year:'numeric',month:'short',day:'numeric'});
function runHistory(){
  modal(`<span class="section-number">YOUR PERSONAL RECORDS</span><h2 id="dialog-title">Three runs to remember.</h2><p class="dialog-lead">Your best completed Olympiads, saved in this browser across new drafts. Ranked by match points, then wins, finishing place, Sonneborn–Berger and board points. Exact ties keep the earlier record.</p>${historyNotice?`<p role="status">${esc(historyNotice)}</p>`:''}<div class="run-list">${bestRuns.length?bestRuns.map((run,i)=>`<article class="run-card"><div class="run-card-heading"><span class="run-place">0${i+1}</span><div><h3>${esc(run.teamName)}</h3><p>${run.ratingRules?'Era-balanced ratings':'Original source ratings'} · Recorded ${esc(runDate(run))} · ${run.mode==='expert'?'Expert':'Classic'}</p></div><strong class="run-record">${run.summary.w}–${run.summary.d}–${run.summary.l}<small>WINS · DRAWS · LOSSES</small></strong></div><p class="run-card-score">${ordinal(run.rank)} / ${run.standings.length} · ${run.summary.mp} match points · ${label(run.summary.bp)} board points</p><p class="run-card-squad">${run.squad.map(p=>esc(p.name)).join(' · ')}</p><button class="secondary-button" data-action="run-details" data-id="${esc(run.id)}">View tournament <span aria-hidden="true">↗</span><span class="sr-only">: ${esc(run.teamName)}</span></button></article>`).join(''):'<div class="run-empty"><span aria-hidden="true">♔</span><h3>Your first record is waiting.</h3><p>Complete all eleven rounds, manually or with Quick sim. Your three best results and their tournament details will appear here.</p></div>'}</div><button class="primary-button" data-action="close">Back to the game →</button>`);
}
function runSquad(run){
  return `<p class="dialog-lead">The five players from this run, in their final lineup. Profiles show starting form; final readiness and individual scores appear below.</p><div class="team-profiles">${run.squad.map((p,i)=>{
    const scores=run.rounds.flatMap(r=>r.match.boards.flatMap(b=>b.a.id===p.id?[b.score]:b.b.id===p.id?[1-b.score]:[]));
    return `<article><strong>${esc(p.flag)} ${esc(p.name)}</strong><small>${i===4?'Final reserve':`Final board ${i+1}`} · ${esc(playerOrigin(p))} ${p.year} · ${p.rating} ${run.ratingRules?'GAME':'SOURCE'} ELO${run.ratingRules?` · ${eraLine(p)}`:''}</small>${traitBadge(p,p.trait)}${profileMarkup(p.profile,p.profile.form,false,run.formElo)}<p>${label(scores.reduce((sum,score)=>sum+score,0))} / ${scores.length} board points · ${scores.filter(s=>s===1).length} wins, ${scores.filter(s=>s===0.5).length} draws, ${scores.filter(s=>s===0).length} losses</p><p>Final form: ${formLabel(p.form)} · Final fatigue load: ${p.load}/100</p><a href="${esc(p.source.url)}" target="_blank" rel="noopener">Rating source · ${esc(p.source.date)} ↗</a></article>`;
  }).join('')}</div>`;
}
function runDetails(id){
  const run=bestRuns.find(run=>run.id===id);if(!run)return;
  const game={teamName:run.teamName,formElo:run.formElo,tournament:{teams:run.standings,rounds:run.rounds.map(round=>[round.match])}};
  const round=run.rounds[runRound-1],team=id=>run.standings.find(team=>team.id===id);
  modal(`<div class="run-detail"><button class="text-button" data-action="export-run" data-id="${esc(run.id)}">Download this report ↓</button><button class="text-button" data-action="history">← Best runs</button><span class="section-number">COMPLETED OLYMPIAD / ${run.mode==='expert'?'EXPERT':'CLASSIC'}</span><h2 id="dialog-title">${esc(run.teamName)}</h2><p class="dialog-lead">${run.ratingRules?'Era-balanced ratings':'Original source ratings'} · Recorded ${esc(runDate(run))} · ${ordinal(run.rank)} of ${run.standings.length} · ${run.summary.w}–${run.summary.d}–${run.summary.l}</p><div class="run-metrics"><div><span>MATCH POINTS</span><strong>${run.summary.mp} / 22</strong></div><div><span>BOARD POINTS</span><strong>${label(run.summary.bp)} / 44</strong></div><div><span>SONNEBORN–BERGER</span><strong>${label(run.summary.sb)}</strong></div></div><div class="view-tabs run-view-tabs" role="group" aria-label="Saved tournament view">${[['matches','Your matches'],['story','Tournament story'],['standings','Final standings'],['squad','Your squad']].map(([view,label])=>`<button data-action="run-view" data-id="${esc(run.id)}" data-view="${view}" class="${runView===view?'active':''}" aria-pressed="${runView===view}">${label}</button>`).join('')}</div>${runView==='story'?storyPanel(run,true):runView==='standings'?table(true,run.standings):runView==='squad'?runSquad(run):`<div class="round-tabs" role="group" aria-label="Select saved round">${run.rounds.map((r,i)=>{const points=r.match.a==='YOU'?r.match.points:4-r.match.points;return `<button data-action="run-round" data-id="${esc(run.id)}" data-round="${i+1}" class="${runRound===i+1?'active':''} ${points>2?'won':points===2?'drawn':'lost'}" aria-pressed="${runRound===i+1}">${String(i+1).padStart(2,'0')}<span>${points>2?'W':points===2?'D':'L'}</span><span class="sr-only">, ${points>2?'won':points===2?'drawn':'lost'}</span></button>`;}).join('')}</div>${matchDetails(runRound,game)}<details class="run-fixtures"><summary>All ${round.matches.length} matches in round ${runRound}</summary>${round.matches.map(m=>`<div><span>${esc(team(m.a).flag)} ${esc(team(m.a).name)}</span><strong>${scoreLabel(m.points,4-m.points)}</strong><span>${esc(team(m.b).flag)} ${esc(team(m.b).name)}</span></div>`).join('')}</details>`}<button class="primary-button" data-action="close">Back to the game →</button></div>`,true);
}
function render(){rememberCompletedRun();const focus=document.activeElement;const focusData={...focus?.dataset},focusAction=focusData.action;$('#main').innerHTML=state.phase==='draft'?renderDraft():renderTournament();save();if(focusAction){const candidates=[...document.querySelectorAll(`[data-action="${focusAction}"]`)];(candidates.find(el=>!el.disabled&&Object.entries(focusData).every(([key,value])=>el.dataset[key]===value)))?.focus({preventScroll:true});}}
let dialogTrigger=null;
function modal(html,wide=false){if(!$('#dialog').open)dialogTrigger=document.activeElement;$('#dialog').classList.toggle('history-dialog',wide===true);$('#dialog').classList.toggle('planning-dialog',wide==='planning');$('#dialog-content').innerHTML=`<button class="dialog-close" data-action="close" aria-label="Close dialog">×</button>${html}`;if(!$('#dialog').open)$('#dialog').showModal();$('#dialog').scrollTop=0;$('#dialog .dialog-close').focus({preventScroll:true});}
let peopleIndex=null,explorerLimit=60,explorerFilters={query:'',country:'',era:''};
function people(){return peopleIndex??=indexPeople(PLAYERS,NATIONS);}
function playerExplorer(){
  const federations=[...new Map(NATIONS.filter(n=>n.kind==='country').map(n=>[n.code,n.name])).entries()].sort((a,b)=>a[1].localeCompare(b[1]));
  modal(`<span class="section-number">THE PEOPLE IN THE ARCHIVE</span><h2 id="dialog-title">Find your chess history.</h2><p class="dialog-lead">Search players, country names or years. Canonical identities connect sampled editions while keeping namesakes separate.</p>
    <div class="explorer-filters"><div><label class="input-label" for="player-search">PLAYER, COUNTRY OR YEAR</label><input type="search" id="player-search" value="${esc(explorerFilters.query)}" placeholder="Try Fischer, Soviet Union or 1972" autocomplete="off"></div>
    <div><label class="input-label" for="player-country">FEDERATION</label><select id="player-country"><option value="">All federations</option>${federations.map(([code,name])=>`<option value="${esc(code)}" ${explorerFilters.country===code?'selected':''}>${esc(name)} (${esc(code)})</option>`).join('')}</select></div>
    <div><label class="input-label" for="player-era">SOURCE ERA</label><select id="player-era">${[['','All source eras'],['legends','Legends · before 1927'],['historical','Country estimates · 1927–1970'],['fide','FIDE · 1972–2026']].map(([value,name])=>`<option value="${value}" ${explorerFilters.era===value?'selected':''}>${name}</option>`).join('')}</select></div></div>
    <p id="explorer-count" role="status" aria-live="polite"></p><div id="explorer-results" class="explorer-results"></div><button class="primary-button" data-action="close">Back to the game →</button>`,'planning');
  renderPeople();$('#player-search').focus({preventScroll:true});
}
function renderPeople(){
  const matches=searchPeople(people(),explorerFilters);
  $('#explorer-count').textContent=`${matches.length} ${matches.length===1?'person':'people'} · showing ${Math.min(explorerLimit,matches.length)}`;
  $('#explorer-results').innerHTML=matches.length?`${matches.slice(0,explorerLimit).map(p=>`<button data-action="player-history" data-id="${esc(p.id)}"><strong>${esc(p.name)}</strong><span>${Math.min(...p.editions.map(e=>e.year))}–${Math.max(...p.editions.map(e=>e.year))} · ${p.editions.length} sampled ${p.editions.length===1?'edition':'editions'} · ${[...new Set(p.editions.map(e=>playerOrigin(e)))].map(esc).join(', ')}</span><span aria-hidden="true">↗</span></button>`).join('')}${matches.length>explorerLimit?'<button class="secondary-button" data-action="explorer-more">Show 60 more players</button>':''}`:'<p class="explorer-empty">No sampled editions match. Try a different name, federation or source era.</p>';
}
function playerHistory(personId){
  const person=people().find(p=>p.id===personId);if(!person)return;
  const editions=[...person.editions].sort((a,b)=>a.source.date.localeCompare(b.source.date)||a.id.localeCompare(b.id));
  const best=[...editions].sort((a,b)=>b.rating-a.rating||b.year-a.year||a.id.localeCompare(b.id))[0];
  modal(`<button class="text-button" data-action="explorer">← Player explorer</button><span class="section-number">${editions.length} SAMPLED EDITIONS</span><h2 id="dialog-title">${esc(person.name)}</h2><p class="dialog-lead">${person.names.length>1?`Source name variants: ${person.names.map(esc).join(' · ')}. `:''}Best sampled game edition: ${esc(playerOrigin(best))} ${best.year} · ${best.rating} game Elo (${best.rawRating} source, ${signed(best.eraAdjustment)} era).</p>
    ${catalogueTrait(best)}<div class="report-table-wrap" tabindex="0" role="region" aria-label="Sampled player editions"><table class="edition-table"><caption>Source ratings and game editions</caption><thead><tr><th scope="col">Source date</th><th scope="col">Period federation</th><th scope="col">Source</th><th scope="col">Era adjustment</th><th scope="col">Game</th><th scope="col">Evidence</th></tr></thead><tbody>${editions.map(p=>`<tr><th scope="row">${esc(p.source.date)}</th><td>${p.offerKind==='legends'?'Legends · no affiliation inferred':`${esc(nationById(p.nation).name)} (${esc(p.federation)})`}</td><td>${p.rawRating}<small>${p.estimated?'estimate':'FIDE'}</small></td><td>${signed(p.eraAdjustment)}</td><td><strong>${p.rating}</strong></td><td><a href="${esc(p.source.url)}" target="_blank" rel="noopener">Source ↗</a><button class="text-button" data-action="archive-country" data-id="${esc(p.nation)}">Full top five ↗</button></td></tr>`).join('')}</tbody></table></div>
    <p class="planning-note">These are selected source observations, not an exhaustive career history or a claim about a player's career peak. Federation follows each period's audited source; historical affiliations retain their temporal qualifications in the source notes. Legends infer no national affiliation. ${esc(ERA_DISCLAIMER)} Fixed profiles are game presets; unprofiled players roll only when offered in a draft.</p><button class="primary-button" data-action="explorer">Explore more players →</button>`,'planning');
}
function archive(){
  const years=CATALOGUE.requestedYears||CATALOGUE.years;
  modal(`<span class="section-number">THE CHESS ARCHIVE</span><h2 id="dialog-title">Countries. Years. Great players.</h2><p class="dialog-lead">${CATALOGUE.countrySnapshotCount.toLocaleString()} country-year rolls across ${CATALOGUE.countryCount} federation codes, plus ${CATALOGUE.legendCount} pre-1927 Legends collections. Country rolls show source top fives; Legends mix the strongest observed early editions across countries and years.</p><h3>Before 1927 · Legends</h3><p>Mixed-country collections of five distinct historical players. Each player keeps their actual rating date and source.</p><div class="archive-grid legends-grid">${NATIONS.filter(n=>n.kind==='legends').map(n=>`<button data-action="archive-country" data-id="${n.id}">${n.flag} ${esc(n.name)} <span>Before 1927</span></button>`).join('')}</div><label class="input-label" for="archive-year">EXPLORE A SNAPSHOT YEAR</label><select id="archive-year">${years.map(year=>`<option value="${year}">${year}</option>`).join('')}</select><div id="archive-countries"></div><div class="rules-note"><strong>Era-balanced game ratings.</strong><p>${esc(ERA_DISCLAIMER)} Only country-year snapshots with at least one player with a source rating above 2650 are included; all five players remain available within those snapshots.</p><strong>Earlier history is still being verified.</strong><p>${CATALOGUE.missingYears.length?`Years without a qualifying country top five: ${CATALOGUE.missingYears.join(', ')}.`:'Every scheduled year is represented. Early country coverage is selective; only audited top fives meeting the rating cutoff are available.'} Pre-1971 ratings are historical estimates. Audited country data begins in 1927; the first country snapshot above the cutoff is ${Math.min(...CATALOGUE.years)}. January 1944 still awaits an affiliation audit. Legends add earlier individual editions without asserting historical national teams.</p></div><button class="primary-button" data-action="close">Back to the draft →</button>`);
  renderArchiveYear(years[0]);
}
function renderArchiveYear(year){
  const nations=NATIONS.filter(n=>n.kind==='country'&&n.year===Number(year));
  $('#archive-countries').innerHTML=`<p class="archive-summary">${nations.length?`${nations.length} country snapshots · list dated ${nations[0].source.date}`:(CATALOGUE.belowCutoffYears||[]).includes(Number(year))?`No country snapshot has a source rating above 2650 for ${Number(year)}.`:`No audited country top five is available for ${Number(year)} yet.`}</p><div class="archive-grid">${nations.map(n=>`<button data-action="archive-country" data-id="${n.id}">${n.flag} ${esc(n.name)} <span>${n.year}</span></button>`).join('')}</div>`;
}
function snapshotSource(id=state.offer?.nation){
  const nation=nationById(id);if(!nation)return;
  modal(`<span class="section-number">${esc(nation.code)} / ${esc(offerPeriod(nation))}</span><h2 id="dialog-title">${nation.flag} ${esc(nation.name)} ${esc(offerPeriod(nation))}</h2><p class="dialog-lead">${nation.kind==='legends'?'A fictional collection of five distinct pre-1927 greats, selected by their best observed source estimates. Players span countries and years; this is not a historical national team.':"The source list’s top five by source rating. Players are included regardless of whether they played in that year’s Olympiad. Explicitly inactive players are excluded when activity flags are available."}</p><div class="source-roster">${nation.players.map(id=>{const p=playerById(id);return `<div><span>${p.rank}. ${esc(p.name)}${catalogueTrait(p)}${nation.kind==='legends'?`<a href="${esc(p.source.url)}" target="_blank" rel="noopener">${esc(p.source.date)} source ↗</a>`:''}</span><strong>${p.rawRating} <small>${p.estimated?'SOURCE ESTIMATE':'SOURCE FIDE'}</small><small>${p.rating} GAME · ${signed(p.eraAdjustment)} ERA</small></strong></div>`;}).join('')}</div><p class="dialog-lead">${nation.kind==='legends'?'Source dates appear with each player.':`List date: ${nation.source.date}.`} Published source ratings are preserved; the game column includes the era adjustment.</p><div class="rules-note">${nation.source.notes.map(note=>`<p>${esc(note)}</p>`).join('')}<a href="${esc(nation.source.url)}" target="_blank" rel="noopener">Open the rating source ↗</a></div><button class="primary-button" data-action="archive">Explore other years →</button>`);
}
function allTimeField(){
  modal(`<span class="section-number">THE ALL-TIME OLYMPIAD</span><h2 id="dialog-title">The strongest lineups.<br>Across the eras.</h2><p class="dialog-lead">Your squad faces these ${OPPONENTS.length} national A/B teams. Each roster combines five distinct players at their best recorded era-balanced country editions in this catalogue. Teams rank by the average of their four starting boards.</p><div class="archive-grid field-grid">${OPPONENTS.map((team,i)=>`<button data-action="field-team" data-id="${esc(team.id)}"><span>${i+1}. ${team.flag} ${esc(team.name)}</span><span>${team.rating} ELO</span></button>`).join('')}</div><div class="rules-note"><strong>One person. One opposing team.</strong><p>Players represent the federation of their highest era-balanced country edition, with the latest year breaking ties. Russia and the Soviet Union remain separate. A teams take their nation's strongest five; B teams take the next five and qualify on the same four-board average.</p><p>These are the best editions in our sourced snapshots. Lists sampled every two years can miss career peaks, and early country coverage is selective. ${esc(ERA_DISCLAIMER)} Legends collections are draft offers and remain outside this national field.</p></div><button class="primary-button" data-action="close">Back to the game →</button>`);
}
function allTimeTeam(id){
  const team=OPPONENTS.find(t=>t.id===id);if(!team)return;
  const field=state.tournament?(state.phase==='results'?state.tournament.teams:previewTeams(state.tournament)):null;
  const active=field?.find(t=>t.id===id),lineup=active?.lineup||team.players;
  modal(`<span class="section-number">ALL-TIME ${esc(team.code)} / TEAM ${team.division}</span><h2 id="dialog-title">${team.flag} ${esc(team.name)}</h2><p class="dialog-lead">${active?.rating??team.rating} Elo across ${active?(state.phase==='results'?'the final round’s':'the next round’s'):'four'} starting boards. Each player uses their strongest era-balanced country edition for this federation, after allocating each person to one nation.</p><div class="source-roster field-roster">${lineup.map((id,i)=>{const p=playerById(id);return `<div><span>${i===4?'R':i+1}. ${esc(p.name)}${active?`${traitBadge(p,active.traits[id])}${profileMarkup(active.profiles[id],active.forms[id])}${fatigueMarkup(active,id,i===4)}`:catalogueTrait(p)}<button class="text-button" data-action="archive-country" data-id="${esc(p.nation)}">${playerOrigin(p)} ${p.year} source <span aria-hidden="true">↗</span><span class="sr-only">: ${esc(p.name)}</span></button></span><strong>${p.rating} <small>GAME ELO</small><small>${eraLine(p)}</small></strong></div>`;}).join('')}</div><button class="primary-button" data-action="field">All ${OPPONENTS.length} national teams →</button>`);
}
function traitsGuide(){
  modal(`<span class="section-number">STYLE MEETS STRATEGY</span><h2 id="dialog-title">More than a rating.</h2><p class="dialog-lead">25 abilities give different players a reason to make your five. Source ratings stay visible; era-balanced game bases and traits change match probabilities under abstract conditions. These are fictional game mechanics, not measured Elo advantages or claims about a player's weaknesses.</p><div class="rules-note"><strong>Career traits and surprises.</strong><p>${CAREER_PROFILES.length} curated players keep one sourced, career-inspired trait across all their year editions. Everyone else rolls a trait when drawn: 25% no trait, otherwise an equal chance of each ability. Rolled traits describe this game only. Your pick keeps its roll through reloads; a new offer can roll differently. Opponents roll once from the tournament seed and keep their abilities too.</p><p>Preview the next round before rotating. A lower-rated specialist can overtake a stronger player in favorable conditions. Both sides use the same effects and fatigue. Individual trait bonuses are capped at ${TRAIT_BONUS_CAP} per side. Style, form and daily performance appear separately. Draw changes are percentage points, bounded to keep probabilities valid; they change variance while preserving Elo expected score. No actual chess moves are simulated.</p></div><h3 class="career-heading">Stamina and readiness</h3><div class="profile-guide"><p><strong>Stamina 1–5:</strong> each game adds 14 − stamina fatigue load, capped at 100. Sitting out removes 30. Load above 24 costs ${FATIGUE_ELO} effective Elo per point; grinders lose half as much. Both sides use these rules. Rest only occurs when a round is played.</p><p><strong>Form:</strong> Cold to Hot (−2 to +2), worth ${FORM_ELO} Elo per level. Exceed the expected board score by more than 0.15 to gain a level; underperform it by more than 0.15 to lose one. Rest moves form toward neutral.</p><p><strong>Consistency 1–5:</strong> daily swing limits are ${SWINGS.slice(1).map(s=>`±${s}`).join(', ')} Elo respectively. The preview shows the current round’s fixed performance. Opening previews or moving boards cannot reroll it.</p><p>Famous players have fixed game presets derived from their career archetype. Other players roll their profile with each offer. Everyone rolls starting form. Numerical stamina and consistency values are fictional balance choices, not measured personal qualities.</p></div><div class="style-guide">${STYLES.map(style=>`<article><h3>${esc(style.name)} style</h3><p>${esc(style.description)}</p></article>`).join('')}</div><h3 class="career-heading">Individual abilities</h3><div class="trait-guide">${TRAITS.map(t=>`<article><h3>${esc(t.name)}</h3><p>${esc(t.description)}</p></article>`).join('')}</div><h3 class="career-heading">Career-inspired traits</h3><p class="dialog-lead">One recurring aspect of each player's style, supported by a career profile, interview or analysis of multiple games. A career trait is a game interpretation of that evidence.</p><div class="career-list">${CAREER_PROFILES.map(p=>`<article><strong>${esc(p.name)} <span>${esc(traitLabel(p.trait))}</span></strong><p>${esc(p.reason)}</p><a href="${esc(p.source)}" target="_blank" rel="noopener">Read the source ↗</a></article>`).join('')}</div><button class="primary-button" data-action="close">Back to the game →</button>`);
}
function teamProfiles(){
  if(!count())return;
  const t=state.tournament,ids=t?.squad||state.squad,own=t?.teams.find(team=>team.id==='YOU');
  modal(`<span class="section-number">KNOW YOUR FIVE</span><h2 id="dialog-title">Team profiles.</h2><p class="dialog-lead">Compare styles, stamina, form and consistency before choosing your lineup. You manage the team and its reserve.</p><div class="team-profiles">${ids.filter(Boolean).map(id=>{const p=playerById(id),profile=state.profiles[id];return `<article><strong>${esc(p.name)}</strong><small>${ids[4]===id?'Reserve':'Active board'} · ${rating(p)} GAME ELO${revealed()?` · ${eraLine(p)}`:''}</small>${traitBadge(p,state.traits[id])}${profileMarkup(profile,own?own.forms[id]:profile.form)}${own?fatigueMarkup(own,id,ids[4]===id):''}</article>`;}).join('')}</div><button class="primary-button" data-action="close">Back to the game →</button>`);
}
function forecastPlayer(p,white){
  return `<div class="forecast-player"><span class="piece-colour"><i class="color-dot ${white?'white':'black'}" aria-hidden="true"></i>${white?'White':'Black'} pieces</span><strong>${esc(p.name)}</strong><div class="forecast-ratings"><span>${sourceValue(p)}<small>SOURCE ELO</small></span><b>→</b><span>${p.baseRating}<small>GAME ELO</small></span><b>→</b><span>${p.rating}<small>EFFECTIVE ELO</small></span></div>${traitBadge(p,p.trait)}${profileMarkup(p,p.form)}<p class="rating-calculation">${sourceValue(p)} source ${signed(p.eraAdjustment??0)} era = ${p.baseRating} game; ${signed(p.traitBonus)} trait ${signed(p.styleBonus)} style ${signed(p.formBonus)} form ${signed(p.performance)} daily −${p.fatigue} fatigue = <b>${p.rating}</b></p><p class="forecast-readiness">Load ${p.fatigueLoad}/100 · ${p.streak} consecutive rounds${p.drawShift?` · Draw modifier ${signed(Math.round(p.drawShift*100))} pp`:''}</p></div>`;
}
function forecastOdds(prob,us){
  const win=us?prob.win:prob.loss,loss=us?prob.loss:prob.win;
  return `<div class="forecast-odds"><div class="odds-bar" aria-hidden="true"><span style="width:${win*100}%"></span><span style="width:${prob.draw*100}%"></span><span style="width:${loss*100}%"></span></div><p><span><b>${Math.round(win*100)}%</b> win</span><span><b>${Math.round(prob.draw*100)}%</b> draw</span><span><b>${Math.round(loss*100)}%</b> loss</span></p></div>`;
}
function matchPreview(){matchPreparation();}
function matchPreparation(focusBoard=null,message=''){
  if(state.phase!=='tournament'||busy)return;
  const t=state.tournament,match=previewRound(t),us=match.a==='YOU';
  const teams=previewTeams(t),own=teams.find(team=>team.id==='YOU'),opponent=teams.find(team=>team.id===(us?match.b:match.a));
  const expected=match.boards.reduce((sum,b)=>sum+(us?b.probabilities.win:b.probabilities.loss)+b.probabilities.draw/2,0);
  if(!boardOrderDialogActive){planningBaseline=expected;planningTrigger=document.activeElement?.dataset.action||'preview';}
  const scroll=boardOrderDialogActive?$('#dialog').scrollTop:0;
  boardOrderDialogActive=true;
  const recommended=recommendedLineup(t),rest=playerById(recommended[4]),horizon=Math.min(3,ROUND_COUNT-t.round);
  const fixture=roundFixtures(t).find(m=>m.a==='YOU'||m.b==='YOU'),matchup={opponent,boards:fixture.boards,side:us?'a':'b'};
  const currentMP=lineupExpectation(own,t.squad,matchup),recommendedMP=lineupExpectation(own,recommended,matchup);
  const difference=expected-planningBaseline;
  modal(`<span class="section-number">ROUND ${t.round+1} / MATCH PREPARATION</span><h2 id="dialog-title">Your next four.</h2>
    <div class="preview-matchup"><div><span>✦ YOUR TEAM</span><strong>${esc(state.teamName)}</strong></div><span class="matchup-versus">vs</span><div><span>${esc(opponent.flag)} OPPOSITION</span><strong>${esc(opponent.name)}</strong></div></div>
    <div class="preparation-summary"><div aria-live="polite"><strong>${expected.toFixed(2)} / 4</strong><span>projected board points</span><small>${signed(Number(difference.toFixed(2)))} from when you opened this plan · results can vary</small></div><button class="primary-button" data-action="plan-play">Play round ${t.round+1} →</button></div>
    <div class="preparation-reserve"><label class="input-label" for="rest-player">REST THIS ROUND</label><select id="rest-player">${own.players.map(id=>`<option value="${esc(id)}" ${id===t.squad[4]?'selected':''}>${esc(playerById(id).name)} · load ${own.loads[id]}/100</option>`).join('')}</select><p>The incoming reserve takes the vacated board. A round of rest removes 30 load and moves form toward neutral.</p></div>
    <aside class="lineup-advice"><strong>Recommended rest: ${esc(rest.name)}</strong><p>Load ${own.loads[rest.id]} → ${Math.max(0,own.loads[rest.id]-30)} after this round. The planner weighs matchups and recovery over ${horizon} remaining ${horizon===1?'round':'rounds'}.</p><p>Current-round planner expectation: ${currentMP.toFixed(2)} → ${recommendedMP.toFixed(2)} / 2 match points. This uses neutral daily performance; recovery can favour a lower immediate score.</p><button class="secondary-button" data-action="recommend-lineup">Use recommended lineup ${icons.spin}</button></aside>
    <p id="board-order-help" class="planning-note">Swap starters using a board selector or move buttons. Changes save immediately. Opponents, colours, conditions and each player's daily performance stay fixed.</p>
    <p class="board-order-status" role="status">${esc(message)}</p>
    <div class="match-forecast">${match.boards.map((b,i)=>{
      const a=us?b.a:b.b,other=us?b.b:b.a,white=us?b.white:!b.white,id=t.squad[i];
      return `<article><div class="forecast-board-heading"><h3>Board ${i+1}</h3><span>${esc(contextLabel(b.context))}</span></div>
        <div class="board-order-row"><div class="board-order-position"><label for="board-order-${i}">Board ${i+1}</label></div><div class="board-order-player"><select id="board-order-${i}" data-board-order="${i}" aria-describedby="board-order-help">${own.players.filter(candidate=>t.squad.slice(0,4).includes(candidate)).map(candidate=>`<option value="${esc(candidate)}" ${id===candidate?'selected':''}>${esc(playerById(candidate).name)} · ${playerById(candidate).rating} Elo</option>`).join('')}</select></div><div class="board-move-controls">${[-1,1].map(direction=>`<button data-action="board-move" data-slot="${i}" data-direction="${direction}" aria-label="Move ${esc(a.name)} ${direction<0?'up':'down'} one board" ${i+direction<0||i+direction>3?'disabled':''}>${direction<0?'↑':'↓'}</button>`).join('')}</div><p class="board-order-opponent">vs <strong>${esc(other.name)}</strong> · ${other.baseRating} game Elo</p></div>
        <div class="forecast-pair">${forecastPlayer(a,white)}${forecastPlayer(other,!white)}</div>${forecastOdds(b.probabilities,us)}</article>`;
    }).join('')}</div>
    <div class="preview-reserves">${[own,opponent].map(team=>`<div><span>${team.id==='YOU'?'YOUR RESERVE':'OPPONENT RESERVE'}</span><strong>${esc(playerById(team.lineup[4]).name)}</strong>${fatigueMarkup(team,team.lineup[4],true)}</div>`).join('')}</div>
    <p class="planning-note">Projected board points sum the four visible board expectations. White receives 28 Elo. The planner uses the same traits, profiles and recovery rules for both teams and cannot see future results.</p>
    <div class="planning-actions"><button class="secondary-button" data-action="board-sort">Order by rating</button><button class="secondary-button" data-action="profiles">Review team profiles ↗</button><button class="text-button" data-action="close">Done</button></div>`,'planning');
  $('#dialog').scrollTop=scroll;
  if(focusBoard!==null)$(`#board-order-${focusBoard}`).focus({preventScroll:true});
}
function rules(){modal(`<span class="section-number">THE PLAYBOOK</span><h2 id="dialog-title">Five minds.<br>One perfect run.</h2><p class="dialog-lead">A fantasy team builder inspired by <a href="https://38-0-0.com/" target="_blank" rel="noopener">38–0–0</a>. Your challenge: win all eleven rounds. Choose Quick sim to keep your picks, auto-draft empty slots and play the full Olympiad with automatic reserve rotation.</p><ol class="rules-list"><li><span>01</span><div><strong>Spin. Choose. Repeat.</strong><p>Draw a country-year top five or a pre-1927 Legends collection and choose a player. People already drafted stay visible but cannot be picked again, even from a different year. Pick four active players and one reserve. Rolls favour stronger available leaders, with every qualifying country-year still possible. Two nation rerolls give you a second chance. Picks cannot be undone.</p></div></li><li><span>02</span><div><strong>Find your best four.</strong><p>Select an empty board before drafting. Click two filled slots to swap players. Active boards start in game-rating order. During the tournament, use Arrange boards to swap starters into any board. A substitute takes the exact board being rested.</p></div></li><li><span>03</span><div><strong>Take on the world.</strong><p>Play eleven rounds against the ${OPPONENTS.length} strongest all-time national A/B lineups in the catalogue. Your team completes the ${OPPONENTS.length+1}-team field. A board win is 1 point, a draw ½. Win the four-board match for 2 match points, or draw it for 1. Similar scores are paired with no rematches.</p></div></li><li><span>04</span><div><strong>Keep something in reserve.</strong><p>Each game adds 9–13 fatigue load according to stamina. Load is capped at 100; every point above 24 costs ${FATIGUE_ELO} effective Elo. Grinders lose half as much. Sitting out removes 30 load and moves form toward neutral. Opponents plan rotations up to three rounds ahead using traits, styles, match chances and recovery. Rotate manually, use the recommended lineup, or choose Auto-rotate &amp; finish to manage your reserve through the remaining rounds. You act as captain: choose the lineup, manage recovery and compare styles, form and consistency in the next-match preview. Higher Elo improves your chances, but guarantees nothing.</p></div></li></ol><div class="rules-note"><strong>Play to their strengths.</strong><p>Famous players have sourced career-inspired traits. Other players roll an ability or no trait each time they appear in an offer; picks keep that roll for the game. Preview the next match to see abstract conditions and both sides’ effects before choosing your reserve. Trait numbers and tradeoffs are fictional balance rules.</p><button class="text-button" data-action="traits">Explore all player traits ↗</button></div><div class="rules-note"><strong>A fantasy, grounded in chess.</strong><p>${esc(ERA_DISCLAIMER)} Country-year rolls require at least one player with a source rating above 2650. Top-five selection uses source ratings and federation, independent of Olympiad participation. A ${OPPONENTS.length+1}-team field, simplified Swiss pairings and simplified Sonneborn–Berger tiebreaks keep this prototype quick. No actual chess moves are played. Expert mode hides Elo during the draft; choose using playing styles, traits and your chess knowledge.</p><a href="https://handbook.fide.com/files/handbook/Olympiad2024.pdf" target="_blank" rel="noopener">The real Olympiad format ↗</a></div><button class="primary-button" data-action="close">Let's play <span>→</span></button>`);}
function newDraft(){state=initialState();selectedSlot=0;swapSlot=null;selectedRound=null;view='matches';busy=false;$('#dialog').close();render();window.scrollTo({top:0,behavior:'smooth'});toast('A fresh board. A new possibility.');}
function reset(){if(!count()&&!state.offer){newDraft();return;}modal(`<span class="section-number">A CLEAN SLATE</span><h2 id="dialog-title">One more run?</h2><p class="dialog-lead">This replaces your current team and tournament with a fresh draft. Your three best completed runs stay in Best runs.</p><button class="primary-button" data-action="confirm-reset">Start a new draft <span>→</span></button><button class="secondary-button" data-action="close">Keep my team</button>`);}
async function spin(reroll=false){if(busy||count()>=5||(!reroll&&state.offer)||(reroll&&(!state.offer||!state.rerolls)))return;busy=true;render();await new Promise(r=>setTimeout(r,550));if(!canMutate()){busy=false;render();return;}state.offer=createOffer(state.squad);if(reroll)state.rerolls--;busy=false;render();document.querySelector('.candidate')?.focus({preventScroll:true});}
function quick(){if(count())modal(`<span class="section-number">BUILD A COMPETITIVE FIVE</span><h2 id="dialog-title">Finish the draft?</h2><p class="dialog-lead">Keep your existing picks. The assistant weighs ratings, traits, playing styles and stamina for the remaining boards.</p><button class="primary-button" data-action="confirm-quick">Complete my team <span>→</span></button><button class="secondary-button" data-action="close">Back to the draft</button>`);else quickDraft();}
function quickDraft(){state=completeDraft(state);$('#dialog').close();render();toast('Your five are ready. Review your lineup and enter the Olympiad.');}
async function runQuickSim(){
  if(busy||state.phase!=='draft')return;
  busy=true;quickSimRunning=true;render();
  try{
    // Let the browser show the busy state before the synchronous simulation.
    await new Promise(resolve=>setTimeout(resolve,30));
    if(!canMutate())return;state=quickSim(state);selectedRound=ROUND_COUNT;view='matches';swapSlot=null;
    $('#dialog').close();
  }catch{toast('Quick sim could not finish. Your draft is saved.');}
  finally{busy=false;quickSimRunning=false;render();}
  if(state.phase==='results'){
    window.scrollTo({top:0,behavior:'auto'});
    const heading=$('h1');heading?.setAttribute('tabindex','-1');heading?.focus({preventScroll:true});
  }
}
async function advance(all=false){if(busy||state.phase!=='tournament')return;busy=true;render();await new Promise(r=>setTimeout(r,all?650:400));try {if(!canMutate())return;do{if(all)state.tournament=applyRecommendedLineup(state.tournament);state.tournament=simulateRound(state.tournament);}while(all&&state.tournament.round<11);selectedRound=state.tournament.round;view='matches';if(state.tournament.round===11)state.phase='results';}catch{toast('The round could not be completed. Your progress is saved.');}finally{busy=false;render();}}
function rotate(){matchPreparation();$('#rest-player')?.focus({preventScroll:true});}
function arrangeBoards(focusBoard=null,message=''){matchPreparation(focusBoard,message);}
async function share(){const t=state.tournament,me=t.teams.find(x=>x.id==='YOU'),rank=standings(t).findIndex(x=>x.id==='YOU')+1;const result=`11–0–0 · Fantasy Chess Olympiad\n${state.teamName}: ${me.w}–${me.d}–${me.l} | ${ordinal(rank)} / ${t.teams.length} | ${me.mp} match points\n${t.squad.slice(0,4).map(id=>playerById(id).name).join(' · ')}\nBuild your dream team: ${location.origin}${location.pathname}`;try{await navigator.clipboard.writeText(result);toast('Result copied. Your dream team deserves an audience.');}catch{modal(`<span class="section-number">YOUR OLYMPIAD RESULT</span><h2 id="dialog-title">A run worth sharing.</h2><p class="dialog-lead">Copy your result below.</p><textarea class="share-text" readonly aria-label="Result to copy">${esc(result)}</textarea><button class="primary-button" data-action="close">Done <span>✓</span></button>`);$('.share-text').select();}}
document.addEventListener('click',async event=>{
  const target=event.target.closest('[data-action]');if(!target||target.disabled)return;const action=target.dataset.action;
  if(busy&&!['rules','about','close','game','data','export-backup'].includes(action))return;
  const changesGame=['spin','reroll','mode','pick','slot','sort','team-name','quick','confirm-quick','quick-sim','start','next','finish','board-move','board-sort','recommend-lineup','rotate-pick','reset','confirm-reset','plan-play','import-game'];
  if(changesGame.includes(action)&&!canMutate())return;
  if(action==='data')dataDialog();
  if(action==='enable-offline')await enableOffline();
  if(action==='offline-update')await useOfflineUpdate();
  if(action==='load-latest')await loadLatest();
  if(action==='export-backup')downloadBackup();
  if(action==='export-original'&&initialSaveRaw){const url=URL.createObjectURL(new Blob([initialSaveRaw],{type:'application/json'})),link=document.createElement('a');link.href=url;link.download='11-0-0-previous-save.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
  if(action==='export-reports')downloadBackup(null,bestRuns);
  if(action==='export-run'){const run=bestRuns.find(r=>r.id===target.dataset.id);if(run)downloadBackup(null,[run]);}
  if(action==='import-game')await importBackup(true);
  if(action==='import-reports')await importBackup(false);
  if(action==='history')runHistory();
  if(action==='run-details'){runRound=11;runView='matches';runDetails(target.dataset.id);}
  if(action==='run-round'){runView='matches';runRound=Number(target.dataset.round);runDetails(target.dataset.id);document.querySelector(`[data-action="run-round"][data-round="${runRound}"]`)?.focus({preventScroll:true});}
  if(action==='run-view'){runView=target.dataset.view;runDetails(target.dataset.id);document.querySelector(`[data-action="run-view"][data-view="${runView}"]`)?.focus({preventScroll:true});}
  if(action==='rules')rules();if(action==='profiles')teamProfiles();if(action==='traits')traitsGuide();if(action==='preview')matchPreview();
  if(action==='explorer')playerExplorer();
  if(action==='player-history')playerHistory(target.dataset.id);
  if(action==='explorer-more'){explorerLimit+=60;renderPeople();}
  if(action==='draft-compare')compareDraft();
  if(action==='rating-guide')ratingGuide();if(action==='archive')archive();if(action==='field')allTimeField();if(action==='field-team')allTimeTeam(target.dataset.id);if(action==='archive-country')snapshotSource(target.dataset.id);if(action==='snapshot-source')snapshotSource();
  if(action==='about')modal(`<span class="section-number">INDEPENDENT BY DESIGN</span><h2 id="dialog-title">Chess. Reimagined.</h2><p class="dialog-lead">11–0–0 is an independent, unofficial prototype inspired by the random-draft football game <a href="https://38-0-0.com/" target="_blank" rel="noopener">38–0–0</a> and the team format of the Chess Olympiad.</p><p>Player names are real; historical ratings and labelled estimates come from sourced lists; traits, profiles and results are game data. This is not affiliated with FIDE, the Olympiad or 38–0–0. Your game saves in this browser.</p><button class="primary-button" data-action="close">Back to the board <span>→</span></button>`);
  if(action==='close')$('#dialog').close();
  if(action==='game')$('#main').scrollIntoView({behavior:'smooth'});
  if(action==='spin')await spin();
  if(action==='reroll')await spin(true);
  if(action==='mode'&&!count()&&!state.offer){state.mode=target.dataset.mode;render();}
  if(action==='pick'){const old=count();if(state.squad[selectedSlot])selectedSlot=state.squad.indexOf(null);state=selectPlayer(state,target.dataset.id,selectedSlot);if(count()>old){if($('#dialog').open)$('#dialog').close();const p=playerById(target.dataset.id);selectedSlot=Math.max(0,state.squad.indexOf(null));swapSlot=null;render();toast(`${p.name} joins your team.`);document.querySelector(count()===5?'[data-action="start"]':'[data-action="spin"]')?.focus({preventScroll:true});}}
  if(action==='slot'&&state.phase==='draft'){const i=Number(target.dataset.slot);if(!state.squad[i]){selectedSlot=i;swapSlot=null;}else if(swapSlot===null){swapSlot=i;toast('Select another filled slot to swap, or an empty slot to draft.');}else{[state.squad[swapSlot],state.squad[i]]=[state.squad[i],state.squad[swapSlot]];swapSlot=null;}render();}
  if(action==='sort'){if(state.mode==='expert'&&count()<5){toast('Automatic ordering is available when the draft is complete.');return;}state.squad=sortBoards(state.squad);selectedSlot=Math.max(0,state.squad.indexOf(null));swapSlot=null;render();toast('Your active boards are ordered by game rating.');}
  if(action==='team-name')modal(`<span class="section-number">MAKE IT YOURS</span><h2 id="dialog-title">Name your team.</h2><form id="team-form"><label class="input-label" for="team-name">TEAM NAME</label><input id="team-name" name="teamName" value="${esc(state.teamName)}" maxlength="30" required autocomplete="off"><button class="primary-button" type="submit">Save team name <span>✓</span></button></form>`);
  if(action==='quick')quick();if(action==='confirm-quick')quickDraft();if(action==='quick-sim')await runQuickSim();
  if(action==='start'&&count()===5){state.tournament=startTournament(state.squad,state.teamName,undefined,state.traits,state.profiles);state.squad=[...state.tournament.squad];state.phase='tournament';selectedRound=null;render();window.scrollTo({top:0,behavior:'smooth'});}
  if(action==='next')await advance();if(action==='finish')await advance(true);
  if(action==='story-round'){selectedRound=Number(target.dataset.round);view='matches';render();$('.match-panel').scrollIntoView({block:'start'});document.querySelector(`[data-action="round"][data-round="${selectedRound}"]`)?.focus({preventScroll:true});}
  if(action==='round'){selectedRound=Number(target.dataset.round);render();}
  if(action==='view'){view=target.dataset.view;render();}
  if(action==='board-order')arrangeBoards(0);
  if(action==='board-move'&&state.phase==='tournament'&&!busy){
    const from=Number(target.dataset.slot),to=from+Number(target.dataset.direction),order=state.tournament.squad.slice(0,4);
    if(to<0||to>3)return;
    [order[from],order[to]]=[order[to],order[from]];
    state.tournament=setBoardOrder(state.tournament,order);render();arrangeBoards(to,`${playerById(order[to]).name} moved to board ${to+1}. Your lineup is saved.`);
  }
  if(action==='board-sort'&&state.phase==='tournament'&&!busy){
    const t=state.tournament,active=t.teams.find(team=>team.id==='YOU').players.filter(id=>t.squad.slice(0,4).includes(id));
    state.tournament=setBoardOrder(t,sortBoards([...active,t.squad[4]]).slice(0,4));
    render();arrangeBoards(null,'Boards ordered by game rating.');$('#dialog [data-action="board-sort"]').focus();
  }
  if(action==='rotate'||action==='preview-rotate')rotate();
  if(action==='recommend-lineup'){state.tournament=applyRecommendedLineup(state.tournament);render();matchPreparation(null,'Recommended lineup selected. Recovery follows the round.');$('#dialog [data-action="recommend-lineup"]').focus({preventScroll:true});}
  if(action==='plan-play'){$('#dialog').close();await advance();}
  if(action==='rotate-pick'){state.tournament=rotateReserve(state.tournament,Number(target.dataset.slot));$('#dialog').close();render();toast('Reserve rotated in. Your other boards keep their positions.');}
  if(action==='reset')reset();if(action==='confirm-reset')newDraft();if(action==='share')await share();
});
document.addEventListener('submit',event=>{if(event.target.id!=='team-form')return;event.preventDefault();if(!canMutate())return;const name=$('#team-name').value.trim();if(!name){$('#team-name').setCustomValidity('Give your team a name.');$('#team-name').reportValidity();return;}state.teamName=name;$('#dialog').close();render();});
document.addEventListener('change',async event=>{
  if(event.target.id==='backup-file')await previewBackup(event.target.files[0]);
  if((event.target.id==='rest-player'||event.target.matches('[data-board-order]'))&&!canMutate())return;
  if(event.target.id==='rest-player'&&state.phase==='tournament'&&!busy){const slot=state.tournament.squad.indexOf(event.target.value);if(slot>=0&&slot<4){state.tournament=rotateReserve(state.tournament,slot);render();matchPreparation(null,'Reserve changed. Your other boards keep their positions.');$('#rest-player').focus({preventScroll:true});}}
  if(event.target.id==='player-country'||event.target.id==='player-era'){explorerFilters[event.target.id==='player-country'?'country':'era']=event.target.value;explorerLimit=60;renderPeople();}
  if(event.target.id==='archive-year')renderArchiveYear(event.target.value);
  if(event.target.matches('[data-board-order]')&&state.phase==='tournament'&&!busy){
    const from=Number(event.target.dataset.boardOrder),order=state.tournament.squad.slice(0,4),to=order.indexOf(event.target.value);
    if(to<0||from<0||from>3)return;
    [order[from],order[to]]=[order[to],order[from]];
    state.tournament=setBoardOrder(state.tournament,order);render();arrangeBoards(from,`Boards ${from+1} and ${to+1} swapped. Your lineup is saved.`);
  }
});
$('#dialog').addEventListener('close',()=>{if(boardOrderDialogActive){boardOrderDialogActive=false;document.querySelector(`[data-action="${planningTrigger}"]`)?.focus({preventScroll:true});}else if(dialogTrigger&&typeof dialogTrigger.focus==='function'&&dialogTrigger.isConnected){dialogTrigger.focus({preventScroll:true});}dialogTrigger=null;});
document.addEventListener('input',event=>{if(event.target.id==='player-search'){explorerFilters.query=event.target.value;explorerLimit=60;renderPeople();}if(event.target.id==='team-name')event.target.setCustomValidity('');});
$('#dialog').addEventListener('click',event=>{if(event.target===$('#dialog')){const rect=$('#dialog').getBoundingClientRect();if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom)$('#dialog').close();}});
render();
if(saveNotice||historyNotice)toast([saveNotice,historyNotice].filter(Boolean).join(' '));
