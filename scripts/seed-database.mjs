import { openDatabase } from '../server/sqlite.mjs';
import { readCatalogue } from '../server/catalog.mjs';
const db=openDatabase();
try{console.log(JSON.stringify((await readCatalogue(db)).metadata,null,2));}finally{db.close();}
