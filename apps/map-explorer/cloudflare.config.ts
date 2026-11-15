import { defineConfig } from 'cf/config';
/**
 * Isolation invariant: this may ONLY deploy to the dedicated ABB map staging Worker.
 * Never give it PRM, D1 or private evidence bindings.
 */
export default defineConfig({
 accountId:'b3d9fa5308aca21a2360126641449fba',
 worker:{
  name:'accountabilibuddy-map-staging',
  compatibilityDate:'2026-11-15',
  entrypoint:'./src/staging-worker.ts',
  assets:{
   basePath:'/map-lab',
   notFoundHandling:'single-page-application',
   runWorkerFirst:['/api/*','/']
  },
  workersDev:true,
  previewUrls:false,
  observability:{enabled:true}
 }
});
