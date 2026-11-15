import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../src/worker.js';
const req=(path,method='GET')=>new Request('https://accountabilibuddy.example'+path,{method});
test('public preview is accessible with security headers',async()=>{const r=await worker.fetch(req('/'),{});assert.equal(r.status,200);assert.match(await r.text(),/Democracy/);assert.equal(r.headers.get('x-frame-options'),'DENY')});
test('privileged paths are denied',async()=>{for(const p of ['/admin','/admin/users','/internal','/api/admin/claims']){const r=await worker.fetch(req(p),{});assert.equal(r.status,404)}});
test('public mutations are denied',async()=>{for(const p of ['/','/api/transparency','/api/health']){const r=await worker.fetch(req(p,'POST'),{});assert.equal(r.status,405)}});
test('transparency marks live data as not populated',async()=>{const r=await worker.fetch(req('/api/transparency'),{});const j=await r.json();assert.equal(j.verified_records_available,false);assert.equal(j.community_notes_published,false)});

test('national map and ABB identity are rendered',async()=>{
  const r=await worker.fetch(req('/'),{});
  const html=await r.text();
  assert.match(html,/ABB/);
  assert.match(html,/id="us-map"/);
  assert.match(html,/data-code="NM"/);
  assert.match(html,/data-code="CA"/);
  assert.match(html,/prefers-reduced-motion:reduce/);
});
test('public data API never accepts writes',async()=>{
  for(const p of ['/api/public/officials','/api/public/coverage','/api/integrations/status']){
    const r=await worker.fetch(req(p,'POST'),{});
    assert.equal(r.status,405,p);
  }
});
test('unreviewed officials cannot appear in published data API',async()=>{
  const db={prepare(sql){assert.match(sql,/publication_versions/);return {all:async()=>({results:[]})}}};
  const r=await worker.fetch(req('/api/public/officials'),{DB:db});
  const result=await r.json();
  assert.equal(r.status,200);
  assert.equal(result.verified_only,true);
  assert.deepEqual(result.items,[]);
});
test('state filters are validated',async()=>{
  const r=await worker.fetch(req('/api/public/officials?state=UNKNOWN'),{DB:{}});
  assert.equal(r.status,400);
});
test('PRM integration can degrade without disrupting ABB',async()=>{
  const r=await worker.fetch(req('/api/integrations/status'),{PRM:{health:async()=>{throw Error('staging unavailable')}}});
  const j=await r.json();
  assert.equal(r.status,200);
  assert.equal(j.prm.connected,false);
  assert.equal(j.prm.mutations_enabled,false);
});
test('coverage API does not invent national coverage',async()=>{
  const db={prepare(){return {first:async()=>({n:0}),all:async()=>({results:[]})}}};
  const r=await worker.fetch(req('/api/public/coverage'),{DB:db});
  const j=await r.json();
  assert.equal(j.verified_official_count,0);
  assert.equal(j.coverage_complete,false);
});

test('nonce-based CSP matches nonce-bearing inline scripts and styles',async()=>{
  const r=await worker.fetch(req('/'),{});
  const html=await r.text();
  const policy=r.headers.get('content-security-policy');
  assert.match(policy,/script-src 'nonce-[0-9a-f]{32}'/);
  assert.doesNotMatch(policy,/script-src 'unsafe-inline'/);
  const nonce=policy.match(/script-src 'nonce-([^']+)'/)[1];
  assert.ok(html.includes('<script nonce="'+nonce+'">'));
  assert.ok(html.includes('<style nonce="'+nonce+'">'));
});
test('offline icon endpoint returns an SVG',async()=>{
  const r=await worker.fetch(req('/abb-icon.svg'),{});
  assert.equal(r.status,200);
  assert.match(r.headers.get('content-type'),/image\/svg\+xml/);
});
test('public export admits incomplete coverage',async()=>{
  const db={prepare(){return {all:async()=>({results:[]})}}};
  const r=await worker.fetch(req('/api/public/export'),{DB:db});
  const j=await r.json();
  assert.equal(r.status,200);
  assert.equal(j.complete,false);
  assert.equal(j.verified_only,true);
  assert.deepEqual(j.records,[]);
  assert.match(r.headers.get('content-disposition'),/attachment/);
});

test('editorial redesign and interactive data journalism previews render',async()=>{
  const r=await worker.fetch(req('/'),{});
  const html=await r.text();
  assert.match(html,/id="visualizations"/);
  assert.match(html,/id="viz-tabs"/);
  assert.match(html,/data-viz="seats"/);
  assert.match(html,/data-viz="timeline"/);
  assert.match(html,/data-viz="network"/);
  assert.match(html,/data-layer="representation"/);
  assert.match(html,/id="us-map"/);
  assert.match(html,/100 U\.S\. Senate seats/);
  assert.match(html,/not live results/);
});

test('map-first homepage offers immediate state answers',async()=>{
 const r=await worker.fetch(req('/'),{});
 const html=await r.text();
 assert.match(html,/id="hero-explorer"/);
 assert.match(html,/id="hero-state-select"/);
 assert.match(html,/id="hero-answer-title"/);
 assert.match(html,/heroMap\.id='hero-map-svg'/);
 assert.match(html,/heroMap\.addEventListener\('click'/);
 assert.match(html,/heroUpdate\(\)/);
 assert.match(html,/A precise address is needed/);
});

test('map interactions smoothly interpolate and honor reduced motion',async()=>{
 const r=await worker.fetch(req('/'),{});
 const html=await r.text();
 assert.match(html,/function easedMapZoom/);
 assert.match(html,/requestAnimationFrame\(tick\)/);
 assert.match(html,/cancelAnimationFrame\(previous\)/);
 assert.match(html,/reduceMotion\.matches/);
 assert.match(html,/targetViewport\(heroMap,active,2\.5\)/);
 assert.match(html,/ABB warm editorial system/);
});

test('county geography requires an allowable state and never guesses election lean',async()=>{
 const invalid=await worker.fetch(req('/api/geography/counties?state=XX'),{});
 assert.equal(invalid.status,400);
 const page=await worker.fetch(req('/'),{});
 const h=await page.text();
 assert.match(h,/function renderCounties/);
 assert.match(h,/data-race="senate"/);
 assert.match(h,/data-race="house"/);
 assert.match(h,/County lean will appear only with verified results/);
});
test('Census county geometry is filtered to selected state',async()=>{
 const prior=globalThis.fetch;
 const response={type:'FeatureCollection',features:[
  {type:'Feature',properties:{GEOID:'35001',NAME:'Bernalillo',STATE:'35'},geometry:{type:'Polygon',coordinates:[[[-106.8,35],[-106.5,35],[-106.5,35.2],[-106.8,35]]]}},
  {type:'Feature',properties:{GEOID:'06001',NAME:'Alameda',STATE:'06'},geometry:{type:'Polygon',coordinates:[[[-122.4,37.7],[-122.1,37.7],[-122.1,37.9],[-122.4,37.7]]]}}
 ]};
 globalThis.fetch=async()=>new Response(JSON.stringify(response),{status:200,headers:{'Content-Type':'application/geo+json'}});
 try{
  const r=await worker.fetch(req('/api/geography/counties?state=NM'),{});
  assert.equal(r.status,200);
  const body=await r.json();
  assert.equal(body.results_status,'geography_only_not_election_results');
  assert.equal(body.features.length,1);
  assert.equal(body.features[0].properties.GEOID,'35001');
 }finally{globalThis.fetch=prior}
});

test('unpublished election contests never appear in state race API',async()=>{
 const db={prepare(sql){assert.match(sql,/publication_status='published'/);return{bind(state,date){assert.equal(state,'NM');assert.equal(date,'2026-11-03');return{all:async()=>({results:[]})}}}}};
 const r=await worker.fetch(req('/api/elections/contests?state=NM'),{DB:db});
 const j=await r.json();
 assert.equal(r.status,200);
 assert.equal(j.published_only,true);
 assert.deepEqual(j.items,[]);
 assert.equal(j.complete,false);
});
test('election race endpoints reject unsupported states and mutations',async()=>{
 assert.equal((await worker.fetch(req('/api/elections/contests?state=ZZ'),{})).status,400);
 assert.equal((await worker.fetch(req('/api/elections/contests?state=NM','POST'),{})).status,405);
});
test('ABB maps distinguish unverified county lean from election data',async()=>{
 const r=await worker.fetch(req('/'),{});
 const html=await r.text();
 assert.match(html,/id="county-select"/);
 assert.match(html,/function loadStateContests/);
 assert.match(html,/data-race="senate"/);
 assert.match(html,/data-race="house"/);
 assert.match(html,/No 2026 contests have been published/);
});
