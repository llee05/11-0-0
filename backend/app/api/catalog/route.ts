import { env } from 'cloudflare:workers';
import seed from '../../../catalogue-seed.json';
import { readCatalogue, seedStatements } from '../../../../server/catalog.mjs';

// Cache completed data only. Worker I/O promises belong to their originating
// request and must not be shared with another visitor or a cancelled request.
let cachedCatalogue: unknown;
export async function GET() {
  try {
    if (!env.DB) throw new Error('D1 is unavailable');
    const db = env.DB;
    if (!cachedCatalogue) {
      const current = await db.prepare('SELECT value FROM catalogue_metadata WHERE key=?').bind('catalogue').first<{value: string}>();
      if (!current || JSON.parse(current.value).release !== seed.release) {
        // Separate idempotent data import after schema migrations; D1 batch
        // publishes all country rosters and the release marker atomically.
        await db.batch(seedStatements(seed.data, seed.release).map(({sql,params}: {sql: string; params: unknown[]}) => db.prepare(sql).bind(...params)));
      }
      cachedCatalogue = await readCatalogue({
        all: async (sql: string, params: unknown[] = []) => (await db.prepare(sql).bind(...params).all()).results,
        first: (sql: string, params: unknown[] = []) => db.prepare(sql).bind(...params).first(),
      });
    }
    return Response.json(cachedCatalogue, { headers: { 'Cache-Control': 'no-cache' } });
  } catch {
    return Response.json({ error: 'The rating catalogue is temporarily unavailable. Please retry.' }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }
}
