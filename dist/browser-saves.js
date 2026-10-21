// A storage adapter with optimistic conflict detection and a serialized write queue.
// The browser supplies a Web Lock shared by tabs; tests supply an in-memory lock.
export function createSaveStore(storage,key,initialRaw,withLock=fn=>fn()){
  let base=initialRaw,queue=Promise.resolve();
  const changed=()=>storage.getItem(key)!==base;
  return {
    get raw(){return base;},changed,
    adopt(raw){base=raw;},
    flush(){return queue;},
    write(raw){
      const next=queue.then(()=>withLock(()=>{
        if(changed())return {ok:false,conflict:true};
        if(raw!==base){storage.setItem(key,raw);base=raw;}
        return {ok:true,conflict:false};
      }));
      queue=next.catch(()=>{});return next;
    },
  };
}
