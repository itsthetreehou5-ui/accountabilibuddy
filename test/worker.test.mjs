import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../src/worker.js';
const req=(path,method='GET')=>new Request('https://accountabilibuddy.example'+path,{method});
test('public preview is accessible with security headers',async()=>{const r=await worker.fetch(req('/'),{});assert.equal(r.status,200);assert.match(await r.text(),/Democracy/);assert.equal(r.headers.get('x-frame-options'),'DENY')});
test('privileged paths are denied',async()=>{for(const p of ['/admin','/admin/users','/internal','/api/admin/claims']){const r=await worker.fetch(req(p),{});assert.equal(r.status,404)}});
test('public mutations are denied',async()=>{for(const p of ['/','/api/transparency','/api/health']){const r=await worker.fetch(req(p,'POST'),{});assert.equal(r.status,405)}});
test('transparency marks live data as not populated',async()=>{const r=await worker.fetch(req('/api/transparency'),{});const j=await r.json();assert.equal(j.verified_records_available,false);assert.equal(j.community_notes_published,false)});
