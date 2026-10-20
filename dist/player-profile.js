import {careerProfile} from './traits.js';

export const PROFILE_RULESET = 'squad-profiles-3';
export const STYLES = [
  {id:'attacking',name:'Attacking',description:'Sharp play: +16 Elo. Quiet play: −8. Draw chance −4 points.'},
  {id:'positional',name:'Positional',description:'Quiet or technical play: +12 Elo. Sharp play: −6.'},
  {id:'defensive',name:'Defensive',description:'Against an attacking style: +12 Elo. Draw chance +4 points.'},
  {id:'universal',name:'Universal',description:'Every match condition: +4 Elo.'},
];
export const styleById = id => STYLES.find(s=>s.id===id);
export const FORM_ELO = 12;
export const SWINGS = [0,32,24,16,8,4];
export const formLabel = form => ['Cold','Below par','Neutral','In form','Hot'][form+2];
// These are balance presets derived from the career trait’s game archetype, not
// sourced measurements of a real person's stamina or consistency.
const presets = {
  attacker:['attacking',3,2], sacrificer:['attacking',3,1], dynamic:['attacking',3,2],
  tactician:['attacking',3,2], positional:['positional',3,5], prophylaxis:['defensive',4,5],
  counterattacker:['defensive',4,4], defender:['defensive',4,4], endgame:['positional',4,4],
  simplifier:['positional',4,5], grinder:['positional',5,5], rook:['positional',4,4],
  exchange:['positional',4,3], universal:['universal',4,4], coordinator:['positional',4,4],
  practical:['defensive',3,4], innovator:['attacking',3,3], preparation:['positional',3,4],
  specialist:['attacking',3,3], flexible:['universal',3,3], unorthodox:['attacking',3,1],
  calculator:['universal',3,4], intuitive:['universal',4,4], 'time-trouble':['attacking',3,2],
  materialist:['defensive',5,4],
};
export function fixedProfile(player) {
  const career=careerProfile(player);
  if(!career)return null;
  const [style,stamina,consistency]=presets[career.trait];
  return {style,stamina,consistency};
}
export function rollProfile(player,rng=Math.random) {
  const level=()=>1+Math.floor(rng()*5);
  const profile=fixedProfile(player)||{style:STYLES[Math.floor(rng()*STYLES.length)].id,stamina:level(),consistency:level()};
  // Form belongs to this run, including for profiled players.
  return {...profile,form:Math.floor(rng()*5)-2};
}
export const rollProfiles = (players,rng=Math.random)=>Object.fromEntries(players.map(p=>[p.id,rollProfile(p,rng)]));
export function validProfile(profile,player) {
  if(!profile||typeof profile!=='object'||Array.isArray(profile)||Object.keys(profile).length!==4||!styleById(profile.style)||!['stamina','consistency'].every(k=>Number.isInteger(profile[k])&&profile[k]>=1&&profile[k]<=5)||!validForm(profile.form))return false;
  const fixed=fixedProfile(player);
  return !fixed||Object.entries(fixed).every(([key,value])=>profile[key]===value);
}
export function validProfiles(ids,profiles,lookup) {
  return !!profiles&&typeof profiles==='object'&&!Array.isArray(profiles)&&Object.keys(profiles).length===ids.length&&ids.every(id=>Object.hasOwn(profiles,id)&&validProfile(profiles[id],lookup(id)));
}
export const validForm = form=>Number.isInteger(form)&&form>=-2&&form<=2;
export const MAX_FATIGUE = 100;
export const FATIGUE_BUFFER = 24;
export const REST_RECOVERY = 30;
// Load changes only after a round is played. A substitution alone grants no rest.
export const nextFatigue = (load,playing,profile)=>Math.max(0,Math.min(MAX_FATIGUE,load+(playing?14-profile.stamina:-REST_RECOVERY)));
export const profileFatigue = (trait,load)=>Math.max(0,load-FATIGUE_BUFFER)*(trait==='grinder'?0.5:1);
export const validFatigue = load=>Number.isInteger(load)&&load>=0&&load<=MAX_FATIGUE;
export const performanceSwing = (consistency,rng)=>Math.round((rng()*2-1)*SWINGS[consistency])||0;
export function styleEffect(style,other,context) {
  switch(style){
    case 'attacking':return {bonus:context.kind==='sharp'?16:context.kind==='quiet'?-8:0,draw:-0.04};
    case 'positional':return {bonus:['quiet','technical'].includes(context.kind)?12:context.kind==='sharp'?-6:0,draw:0};
    case 'defensive':return {bonus:other==='attacking'?12:0,draw:0.04};
    default:return {bonus:4,draw:0};
  }
}
export function nextForm(form,score,expected) {
  const difference=score-expected;
  return Math.max(-2,Math.min(2,form+(difference>0.15?1:difference< -0.15?-1:0)));
}
export const restedForm = form=>form-Math.sign(form);
// Independent per player/round; previewing or moving boards
// never rerolls a player's daily performance.
export function performanceSeed(seed,round,teamId,playerId) {
  let value=2166136261;
  for(const c of `${seed}:${round}:${teamId}:${playerId}`)value=Math.imul(value^c.charCodeAt(0),16777619);
  return value>>>0;
}
