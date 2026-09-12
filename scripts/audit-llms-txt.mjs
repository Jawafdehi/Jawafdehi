#!/usr/bin/env node
// Probe every URL asserted in public/llms.txt against the live site and API.
//
// llms.txt is the one file on this site whose entire job is to make promises to a
// machine. A wrong endpoint there is worse than no endpoint: an agent follows it,
// gets a 404, and concludes the archive has no API. The file cannot be checked by
// a unit test because the only thing worth checking is whether the live services
// answer, so this is a script a maintainer runs — before editing llms.txt, and
// after the API changes shape.
//
// It found real defects on its first run: an endpoint that 404s for anonymous
// callers advertised as public, `{court}` left undefined so every guess 404s,
// `?limit=` silently ignored on two list endpoints, and static-page URLs written
// without the trailing slash the site actually canonicalises to.
//
//   node scripts/audit-llms-txt.mjs
//
// Exits non-zero when a claim does not hold, so it can gate a release if wanted.
// Needs network. Not part of `bun run test`.

import { readFileSync } from 'node:fs';

const LLMS = new URL('../public/llms.txt', import.meta.url);
const TIMEOUT_MS = 70_000;

// Real, verified values. A template that fails to substitute is then the DOC's
// fault (an undocumented placeholder) rather than this script's.
const SUBSTITUTIONS = [
  ['{court}/{case_number}', 'okhaldhungadc/083-C4-0003'],
  ['{source}/{ident}', 'court_order/20260430.fdcbffb5'],
  ['{prefix}/{slug}', 'deptofsurvey/department-of-survey'],
  ['/author/{slug}', '/author/sambhav-koirala'],
  ['/case/{slug}', '/case/damak-baluwatar-land-fraud'],
  ['/cases/{slug}/', '/cases/damak-baluwatar-land-fraud/'],
  ['{case_url}', 'https://jawafdehi.org/case/damak-baluwatar-land-fraud'],
  ['{query}', 'ncell'],
  ['{name}', 'poudel'],
];

// Endpoints llms.txt itself documents as credentialed. For these a 401/403/404 to
// an anonymous caller IS the documented behaviour — the file lists them precisely
// so an agent can tell "needs auth" apart from "does not exist".
const DOCUMENTED_AS_DENIED = ['/api/case-update-proposals/', '/api/cases/{slug}/history/'];

// Hosts we do not own; their availability is not ours to assert.
const SKIP_HOSTS = ['creativecommons.org'];

function urlsIn(text) {
  const found = text.match(/https?:\/\/[^\s<>()[\]`,"|]+/g) ?? [];
  return [...new Set(found.map((u) => u.replace(/[.,]+$/, '')))].sort();
}

function substitute(url) {
  let out = url;
  for (const [token, value] of SUBSTITUTIONS) out = out.split(token).join(value);
  return out;
}

async function probe(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { redirect: 'follow', signal: controller.signal });
    const body = await res.arrayBuffer();
    return { status: res.status, bytes: body.byteLength };
  } catch (error) {
    return { status: 0, bytes: 0, error: error instanceof Error ? error.message : String(error) };
  } finally {
    clearTimeout(timer);
  }
}

const text = readFileSync(LLMS, 'utf8');
const problems = [];
let probed = 0;

for (const claimed of urlsIn(text)) {
  if (SKIP_HOSTS.some((host) => claimed.includes(host))) continue;

  const mayBeDenied = DOCUMENTED_AS_DENIED.some((path) => claimed.includes(path));
  const url = substitute(claimed);

  if (url.includes('{')) {
    problems.push({ claimed, url, status: 'UNSUBSTITUTED' });
    console.log(`BAD  ---  ${claimed}\n          placeholder left unresolved: ${url}`);
    continue;
  }

  const { status, bytes, error } = await probe(url);
  probed += 1;
  const ok = (status >= 200 && status < 300) || (mayBeDenied && [401, 403, 404].includes(status));
  if (!ok) problems.push({ claimed, url, status, error });

  const size = String(bytes).padStart(9);
  console.log(`${ok ? 'ok ' : 'BAD'} ${String(status).padEnd(3)} ${size}  ${url}${error ? `  (${error})` : ''}`);
}

console.log(`\n--- probed ${probed} URL(s) from public/llms.txt`);

if (problems.length > 0) {
  console.log(`\n### ${problems.length} claim(s) do not hold:\n`);
  for (const { claimed, url, status, error } of problems) {
    console.log(`  ${String(status)}  ${claimed}`);
    if (url !== claimed) console.log(`        probed as: ${url}`);
    if (error) console.log(`        ${error}`);
  }
  console.log('\nFix public/llms.txt (or the API) — an agent follows these literally.');
  process.exit(1);
}

console.log('### every claim in llms.txt checks out');
