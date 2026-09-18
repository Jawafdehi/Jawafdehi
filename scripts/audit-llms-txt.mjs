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

// Claims a status code cannot check.
//
// The status-only loop below has a blind spot that a review found the hard way:
// llms.txt advertised `/api/entities?query={name}` as entity search, and that
// endpoint answers `200` with a `total` — so the probe passed while an agent
// following the file was told the archive holds ONE person named Poudel. It
// matches the start of an entity's IRI slug, not names, and `/api/search/` returns
// 1117 for the same word.
//
// So a promise about what an endpoint MEANS needs an assertion about its body. Each
// check names the promise in llms.txt it is holding to account; `assert` returns a
// failure string, or null when the claim holds.
const SEMANTIC_CHECKS = [
  {
    promise: 'entity search finds an entity by NAME, not by the start of its slug',
    url: 'https://api.jawafdehi.org/api/search/?q=sebon&type=entity',
    assert: (json) =>
      (json?.count ?? 0) > 0
        ? null
        : `count is ${json?.count}. "sebon" names an entity whose slug does not start ` +
          `with it, which is exactly the case a slug-prefix lookup misses — if the ` +
          `endpoint llms.txt advertises for names cannot find it, the file is pointing ` +
          `agents at a lookup and calling it search.`,
  },
  {
    promise: 'the slug-prefix lookup is documented as a lookup, because it answers 200 either way',
    url: 'https://api.jawafdehi.org/api/entities?query=sebon',
    assert: (json) =>
      (json?.total ?? -1) === 0
        ? null
        : `total is ${json?.total}, not 0. This check exists to keep llms.txt's warning ` +
          `truthful: it tells agents ?query= is a slug-prefix lookup and cites sebon as ` +
          `the miss. If the endpoint has since learned to match names, delete the ` +
          `warning rather than leaving a stale one.`,
  },
];

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
    // `manual`, not `follow`. Following meant a 301 to a login page reported as
    // `ok 200` — which is how llms.txt came to advertise a Swagger URL that
    // redirects anonymous callers to sign in. An agent does not necessarily follow,
    // and even when it does, the URL it was GIVEN should be the canonical one. A
    // redirect is therefore a finding, with its target named so the fix is obvious.
    const res = await fetch(url, { redirect: 'manual', signal: controller.signal });
    const body = await res.arrayBuffer();
    return {
      status: res.status,
      bytes: body.byteLength,
      location: res.headers.get('location') ?? undefined,
      body,
    };
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

  const { status, bytes, error, location } = await probe(url);
  probed += 1;
  const ok = (status >= 200 && status < 300) || (mayBeDenied && [401, 403, 404].includes(status));
  if (!ok) problems.push({ claimed, url, status, error, location });

  const size = String(bytes).padStart(9);
  const note = error ? `  (${error})` : location ? `  → ${location}` : '';
  console.log(`${ok ? 'ok ' : 'BAD'} ${String(status).padEnd(3)} ${size}  ${url}${note}`);
}

console.log(`\n--- probed ${probed} URL(s) from public/llms.txt`);

console.log(`\n--- ${SEMANTIC_CHECKS.length} claim(s) about what the answers MEAN`);
for (const { promise, url, assert } of SEMANTIC_CHECKS) {
  const { status, error, body } = await probe(url);
  if (status < 200 || status >= 300) {
    problems.push({ claimed: url, url, status, error: error ?? `semantic check could not run` });
    console.log(`BAD ${String(status).padEnd(3)}  ${promise}\n          ${url}`);
    continue;
  }
  let failure;
  try {
    failure = assert(JSON.parse(new TextDecoder().decode(body)));
  } catch (parseError) {
    failure = `response was not JSON: ${parseError instanceof Error ? parseError.message : parseError}`;
  }
  if (failure) problems.push({ claimed: promise, url, status, error: failure });
  console.log(`${failure ? 'BAD' : 'ok '} ${String(status).padEnd(3)}  ${promise}`);
  if (failure) console.log(`          ${failure}`);
}

if (problems.length > 0) {
  console.log(`\n### ${problems.length} claim(s) do not hold:\n`);
  for (const { claimed, url, status, error, location } of problems) {
    console.log(`  ${String(status)}  ${claimed}`);
    if (url !== claimed) console.log(`        probed as: ${url}`);
    if (location) console.log(`        redirects to: ${location}  (put the target in llms.txt instead)`);
    if (error) console.log(`        ${error}`);
  }
  console.log('\nFix public/llms.txt (or the API) — an agent follows these literally.');
  process.exit(1);
}

console.log('### every claim in llms.txt checks out');
