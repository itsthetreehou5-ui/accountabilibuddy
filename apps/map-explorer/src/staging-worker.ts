/**
 * ABB MapLibre staging adapter.
 * No database, R2, authentication, publication, or PRM bindings.
 * Only proxies published, read-only ABB endpoints; the map shell is served as static assets.
 */
const PUBLIC_API = 'https://accountabilibuddy.itsthetreehou5.workers.dev';
const ALLOWED = [
 '/api/transparency',
 '/api/health',
 '/api/public/officials',
 '/api/public/coverage',
 '/api/public/events',
 '/api/public/ballot-measures',
 '/api/elections/contests',
 '/api/geography/states',
 '/api/geography/counties'
];
function isAllowed(pathname:string):boolean{
 return ALLOWED.some(prefix=>pathname===prefix||pathname.startsWith(prefix+'/'));
}
export default {
 async fetch(request:Request):Promise<Response>{
  const url=new URL(request.url);
  if(request.method!=='GET'&&request.method!=='HEAD')
   return Response.json({error:'read_only_preview'},{status:405,headers:{Allow:'GET, HEAD'}});
  if(url.pathname==='/')return Response.redirect(new URL('/map-lab/',url),302);
  if(!isAllowed(url.pathname))return Response.json({error:'not_found'},{status:404});
  const target=new URL(url.pathname+url.search,PUBLIC_API);
  try{
   const response=await fetch(target,{method:request.method,headers:{Accept:'application/json'},redirect:'manual',signal:AbortSignal.timeout(12000)});
   const out=new Headers();
   out.set('Content-Type',response.headers.get('Content-Type')||'application/json');
   out.set('Cache-Control','no-store');
   out.set('X-Content-Type-Options','nosniff');
   out.set('X-Robots-Tag','noindex, nofollow');
   return new Response(request.method==='HEAD'?null:response.body,{status:response.status,headers:out});
  }catch{
   return Response.json({error:'public_api_temporarily_unavailable',complete:false},{status:503,headers:{'Cache-Control':'no-store','X-Robots-Tag':'noindex, nofollow'}});
  }
 }
};
