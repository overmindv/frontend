import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { URL } from 'node:url';
import { buildSchema } from 'graphql';

const pin = JSON.parse(readFileSync(new URL('../schema/pin.json', import.meta.url), 'utf8'));
const manifest = JSON.parse(readFileSync(new URL('../schema/manifest.json', import.meta.url), 'utf8'));
const schema = readFileSync(new URL('../schema/schema.graphqls', import.meta.url));
if (pin.repository !== 'overmindv/api-gateway' || manifest.repository !== pin.repository
    || !/^[a-f0-9]{40}$/.test(pin.commit) || manifest.commit !== pin.commit
    || manifest.format_version !== 1
    || createHash('sha256').update(schema).digest('hex') !== manifest.schema_sha256) {
  throw new Error('GraphQL schema provenance or checksum mismatch');
}
buildSchema(schema.toString('utf8'));
