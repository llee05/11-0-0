import {validSave,RULES_VERSION,CATALOGUE} from './engine.js';
import {parseRunHistory,serializeRunHistory} from './run-history.js';
export const MAX_BACKUP_SIZE=10*1024*1024;
export function serializeBackup(game,runs,exportedAt=new Date().toISOString()){
  if(game!==null&&!validSave(game))throw new Error('The current game cannot be exported as a valid save.');
  parseRunHistory(serializeRunHistory(runs));
  return JSON.stringify({app:'11-0-0',version:1,exportedAt,game,runs},null,0);
}
export function parseBackup(raw){
  if(typeof raw!=='string'||raw.length>MAX_BACKUP_SIZE)throw new Error('Choose a backup smaller than 10 MB.');
  let file;try{file=JSON.parse(raw);}catch{throw new Error('This file is not valid JSON.');}
  if(file?.app!=='11-0-0'||file.version!==1||!Number.isFinite(Date.parse(file.exportedAt))||!Object.hasOwn(file,'game'))throw new Error('This is not a supported 11–0–0 backup.');
  let runs;try{runs=parseRunHistory(serializeRunHistory(file.runs));}catch{throw new Error('The completed reports in this file are invalid.');}
  const compatible=file.game!==null&&file.game?.rulesVersion===RULES_VERSION&&file.game?.catalogueRelease===CATALOGUE.release;
  if(compatible&&!validSave(file.game))throw new Error('The game in this file is malformed.');
  return {game:compatible?file.game:null,runs,exportedAt:file.exportedAt,hasGame:file.game!==null,compatible};
}
