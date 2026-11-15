import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import maplibregl, { type GeoJSONSource, type Map as MapLibreMap, type ExpressionSpecification } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { Feature, FeatureCollection, Geometry, GeoJsonProperties } from 'geojson';

type GeoCollection = FeatureCollection<Geometry, GeoJsonProperties>;
type Place = { state: string | null; county: string | null };
type PublishedContest = { id: string; office: 'us_senate' | 'us_house'; district: string | null; result_status: string; election_date: string };
type EventRecord = { id: string; headline: string; summary: string; happened_at: string; event_kind: string; source_url?: string };
type View = 'overview' | 'races' | 'timeline' | 'accountability' | 'sources';
const EMPTY: GeoCollection = { type: 'FeatureCollection', features: [] };
const DEM_2024 = new Set(['CA','CO','CT','DE','HI','IL','MA','MD','ME','MN','NH','NJ','NM','NY','OR','RI','VA','VT','WA']);
const BLUE = '#2868b0', RED = '#c43c51';
const STATE_NAMES: Record<string, string> = {
 AL:'Alabama',AK:'Alaska',AZ:'Arizona',AR:'Arkansas',CA:'California',CO:'Colorado',CT:'Connecticut',
 DE:'Delaware',FL:'Florida',GA:'Georgia',HI:'Hawaii',ID:'Idaho',IL:'Illinois',IN:'Indiana',
 IA:'Iowa',KS:'Kansas',KY:'Kentucky',LA:'Louisiana',ME:'Maine',MD:'Maryland',MA:'Massachusetts',
 MI:'Michigan',MN:'Minnesota',MS:'Mississippi',MO:'Missouri',MT:'Montana',NE:'Nebraska',
 NV:'Nevada',NH:'New Hampshire',NJ:'New Jersey',NM:'New Mexico',NY:'New York',
 NC:'North Carolina',ND:'North Dakota',OH:'Ohio',OK:'Oklahoma',OR:'Oregon',
 PA:'Pennsylvania',RI:'Rhode Island',SC:'South Carolina',SD:'South Dakota',TN:'Tennessee',
 TX:'Texas',UT:'Utah',VT:'Vermont',VA:'Virginia',WA:'Washington',WV:'West Virginia',
 WI:'Wisconsin',WY:'Wyoming'
};
const STATES = Object.keys(STATE_NAMES).sort((a,b)=>STATE_NAMES[a].localeCompare(STATE_NAMES[b]));

function fromURL(): Place {
 const qs = new URLSearchParams(window.location.search);
 const state = (qs.get('state') || '').toUpperCase();
 const county = qs.get('county') || '';
 return { state: Object.hasOwn(STATE_NAMES, state) ? state : null, county: /^\d{5}$/.test(county) && Object.hasOwn(STATE_NAMES,state) ? county : null };
}
function navigateURL(place: Place) {
 const url = new URL(window.location.href);
 if (place.state) url.searchParams.set('state',place.state); else url.searchParams.delete('state');
 if (place.county) url.searchParams.set('county',place.county); else url.searchParams.delete('county');
 window.history.pushState(place,'',url);
}
async function json<T>(url:string,signal?:AbortSignal):Promise<T>{
 const response=await fetch(url,{signal,credentials:'same-origin',headers:{Accept:'application/json'}});
 if(!response.ok) throw new Error('The public data service is unavailable');
 return response.json() as Promise<T>;
}
function nameOf(feature: Feature):string{
 return String(feature.properties?.NAME || feature.properties?.BASENAME || feature.properties?.name || 'Unknown');
}
function stateCode(feature: Feature):string{
 return String(feature.properties?.STUSPS || feature.properties?.STATE_ABBR || feature.properties?.USPS || '').toUpperCase();
}
function flattenGeometry(geometry:Geometry, callback:(lon:number,lat:number)=>void){
 if(!geometry || !('coordinates' in geometry)) return;
 const walk=(item:unknown):void=>{
  if(!Array.isArray(item))return;
  if(item.length>=2 && typeof item[0]==='number' && typeof item[1]==='number'){
   callback(item[0],item[1]);return;
  }
  item.forEach(walk);
 };
 walk(geometry.coordinates);
}
function fitFeature(map:MapLibreMap,feature:Feature,level:'state'|'county',reduced:boolean){
 const code = stateCode(feature);
 // Alaska crosses the antimeridian, so use an explicit continental camera.
 if(level==='state' && code==='AK'){ map.easeTo({center:[-152,63],zoom:3.45,duration:reduced?0:900,essential:false});return }
 if(level==='state' && code==='HI'){ map.easeTo({center:[-156.6,20.8],zoom:6.1,duration:reduced?0:900,essential:false});return }
 let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
 flattenGeometry(feature.geometry,(lon,lat)=>{
  if(lon < -180 || lon > 180 || lat < -90 || lat > 90)return;
  minX=Math.min(minX,lon);minY=Math.min(minY,lat);maxX=Math.max(maxX,lon);maxY=Math.max(maxY,lat);
 });
 if(!Number.isFinite(minX)||maxX-minX>170)return;
 const pad = level==='county'?{top:115,bottom:125,left:90,right:90}:{top:90,bottom:120,left:75,right:75};
 map.fitBounds([[minX,minY],[maxX,maxY]],{padding:pad,maxZoom:level==='county'?10.5:7.7,duration:reduced?0:1000,essential:false});
}
function label(place:Place,countyName?:string){
 return place.county && countyName ? countyName+' County, '+STATE_NAMES[place.state||''] : place.state ? STATE_NAMES[place.state] : 'United States';
}
function winner(code:string){return DEM_2024.has(code)?'Harris / Democratic':'Trump / Republican'}
function useReducedMotion() {
 const [reduced,setReduced]=useState(()=>window.matchMedia('(prefers-reduced-motion: reduce)').matches);
 useEffect(()=>{
  const media=window.matchMedia('(prefers-reduced-motion: reduce)');
  const update=()=>setReduced(media.matches);
  media.addEventListener('change',update);
  return ()=>media.removeEventListener('change',update);
 },[]);
 return reduced;
}

export default function App(){
 const [place,setPlace]=useState<Place>(fromURL);
 const [view,setView]=useState<View>('overview');
 const [counties,setCounties]=useState<GeoCollection>(EMPTY);
 const [states,setStates]=useState<GeoCollection>(EMPTY);
 const [contests,setContests]=useState<PublishedContest[]>([]);
 const [events,setEvents]=useState<EventRecord[]>([]);
 const [countyName,setCountyName]=useState('');
 const [dataState,setDataState]=useState<'loading'|'ready'|'unavailable'>('loading');
 const [mapError,setMapError]=useState('');
 const [countyError,setCountyError]=useState('');
 const [resultsError,setResultsError]=useState(false);
 const [layer,setLayer]=useState<'baseline'|'neutral'>('baseline');
 const reduced=useReducedMotion();
 const mapContainer=useRef<HTMLDivElement>(null);
 const mapRef=useRef<MapLibreMap|null>(null);
 const stateRef=useRef<GeoCollection>(EMPTY);
 const countyRef=useRef<GeoCollection>(EMPTY);
 const selectionRef=useRef(place);
 const suppressClick=useRef(false);
 const setGeography=useCallback((next:Place,updateHistory=true)=>{
  selectionRef.current=next;
  setPlace(next);
  if(updateHistory)navigateURL(next);
 },[]);
 useEffect(()=>{
  const onPop=()=>setGeography(fromURL(),false);
  window.addEventListener('popstate',onPop);
  return ()=>window.removeEventListener('popstate',onPop);
 },[setGeography]);
 useEffect(()=>{
  const controller=new AbortController();
  json<GeoCollection>('/api/geography/states',controller.signal).then(data=>{
   if(data.type!=='FeatureCollection'||!Array.isArray(data.features)||!data.features.length)throw Error('No state geometry');
   stateRef.current=data;setStates(data);setDataState('ready');
  }).catch(e=>{if(e.name!=='AbortError'){setDataState('unavailable');setMapError('Official Census state geometry is temporarily unavailable. Choose a state from the list to continue.')}});
  return ()=>controller.abort();
 },[]);
 useEffect(()=>{
  countyRef.current=EMPTY;setCounties(EMPTY);setCountyName('');
  setCountyError('');
  if(!place.state)return;
  const controller=new AbortController();
  json<GeoCollection>('/api/geography/counties?state='+encodeURIComponent(place.state),controller.signal).then(data=>{
   if(data.type!=='FeatureCollection'||!Array.isArray(data.features))throw Error('Invalid county boundaries');
   countyRef.current=data;setCounties(data);
  }).catch(e=>{if(e.name!=='AbortError')setCountyError('County boundaries are temporarily unavailable. State-level exploration still works.')});
  return ()=>controller.abort();
 },[place.state]);
 useEffect(()=>{
  if(!place.state){setEvents([]);setContests([]);setResultsError(false);return}
  const controller=new AbortController();
  setResultsError(false);
  const race='/api/elections/contests?state='+place.state+'&date=2026-11-03';
  const local='/api/public/events?state='+place.state+(place.county?'&county='+place.county:'');
  Promise.allSettled([
   json<{items:PublishedContest[]}>(race,controller.signal),
   json<{items:EventRecord[]}>(local,controller.signal)
  ]).then(results=>{
   if(controller.signal.aborted)return;
   if(results[0].status==='fulfilled')setContests(results[0].value.items||[]);else{setContests([]);setResultsError(true)}
   if(results[1].status==='fulfilled')setEvents(results[1].value.items||[]);else{setEvents([]);setResultsError(true)}
  });
  return ()=>controller.abort();
 },[place.state,place.county]);
 useEffect(()=>{
  if(!place.county||!counties.features.length)return;
  const feature=counties.features.find(f=>String(f.properties?.GEOID)===place.county);
  setCountyName(feature?nameOf(feature):'');
 },[place.county,counties]);
 const chooseState=useCallback((state:string|null)=>{
  suppressClick.current=false;setView('overview');setGeography({state,county:null});
 },[setGeography]);
 const chooseCounty=useCallback((county:string|null)=>{
  setView('overview');setGeography({state:selectionRef.current.state,county});
 },[setGeography]);
 useEffect(()=>{
  if(!mapContainer.current||mapRef.current)return;
  let map:MapLibreMap;
  try{
   map=new maplibregl.Map({
    container:mapContainer.current,
    style:'https://tiles.openfreemap.org/styles/liberty',
    center:[-97.6,39.5],zoom:3.3,
    minZoom:2.3,maxZoom:13,
    attributionControl:true,
    dragRotate:false,touchPitch:false,pitchWithRotate:false,
    cooperativeGestures:false
   });
  }catch(e){setMapError('This device could not start the WebGL map. The accessible state list below is still available.');return}
  mapRef.current=map;
  map.addControl(new maplibregl.NavigationControl({showCompass:false}),'top-left');
  map.on('load',()=>{
   map.addSource('abb-states',{type:'geojson',data:stateRef.current,promoteId:'STUSPS'});
   map.addLayer({id:'abb-state-fills',type:'fill',source:'abb-states',paint:{
    'fill-color':['match',['get','STUSPS'],...STATES.flatMap(code=>[code,DEM_2024.has(code)?BLUE:RED]),'#ced9e2'] as unknown as ExpressionSpecification,
    'fill-opacity':.68
   }});
   map.addLayer({id:'abb-state-borders',type:'line',source:'abb-states',paint:{'line-color':'#ffffff','line-width':1.5}});
   map.addSource('abb-counties',{type:'geojson',data:EMPTY,promoteId:'GEOID'});
   map.addLayer({id:'abb-county-fills',type:'fill',source:'abb-counties',paint:{'fill-color':'#a0bacf','fill-opacity':.68}});
   map.addLayer({id:'abb-county-borders',type:'line',source:'abb-counties',paint:{'line-color':'#ffffff','line-width':1.35}});
   map.addLayer({id:'abb-county-selected',type:'line',source:'abb-counties',filter:['==',['get','GEOID'],'__none__'],paint:{'line-color':'#102e4a','line-width':3.8}});
   map.on('click','abb-state-fills',e=>{
    if(suppressClick.current)return;
    const f=e.features?.[0],code=f?.properties?.STUSPS;
    if(typeof code==='string'&&Object.hasOwn(STATE_NAMES,code))chooseState(code);
   });
   map.on('click','abb-county-fills',e=>{
    const f=e.features?.[0],geoid=f?.properties?.GEOID;
    if(geoid&&/^\d{5}$/.test(String(geoid))){
     suppressClick.current=true;chooseCounty(String(geoid));
     queueMicrotask(()=>{suppressClick.current=false});
    }
   });
   ['abb-state-fills','abb-county-fills'].forEach(layerName=>{
    map.on('mouseenter',layerName,()=>{map.getCanvas().style.cursor='pointer'});
    map.on('mouseleave',layerName,()=>{map.getCanvas().style.cursor=''});
   });
   // Reconcile a state selected through the non-visual control before WebGL finished loading.
   const initial=selectionRef.current;
   if(initial.state){
    const f=stateRef.current.features.find(f=>stateCode(f)===initial.state);
    if(f)fitFeature(map,f,'state',reduced);
   }
  });
  map.on('error',e=>{console.warn('ABB map engine error',e.error?.message||e)});
  return ()=>{map.remove();mapRef.current=null};
 },[chooseState,chooseCounty,reduced]);
 useEffect(()=>{
  const map=mapRef.current;if(!map||!map.isStyleLoaded())return;
  (map.getSource('abb-states') as GeoJSONSource|undefined)?.setData(states);
 },[states]);
 useEffect(()=>{
  const map=mapRef.current;if(!map||!map.getSource('abb-counties'))return;
  (map.getSource('abb-counties') as GeoJSONSource).setData(counties);
 },[counties]);
 useEffect(()=>{
  const map=mapRef.current;if(!map||!map.getLayer('abb-state-fills'))return;
  const filled:ExpressionSpecification=['match',['get','STUSPS'],...STATES.flatMap(code=>[code,layer==='baseline'?(DEM_2024.has(code)?BLUE:RED):'#94abc0']),'#d2dce5'] as unknown as maplibregl.ExpressionSpecification;
  map.setPaintProperty('abb-state-fills','fill-color',filled);
 },[layer,states]);
 useEffect(()=>{
  const map=mapRef.current;
  if(!map||!map.getLayer('abb-counties'))return;
  const visible=!!place.state;
  map.setLayoutProperty('abb-county-fills','visibility',visible?'visible':'none');
  map.setLayoutProperty('abb-county-borders','visibility',visible?'visible':'none');
  map.setLayoutProperty('abb-county-selected','visibility',visible?'visible':'none');
  map.setFilter('abb-county-selected',['==',['get','GEOID'],place.county||'__none__']);
  if(place.county){
   const county=countyRef.current.features.find(f=>String(f.properties?.GEOID)===place.county);
   if(county)fitFeature(map,county,'county',reduced);
   return;
  }
  if(place.state){
   const state=stateRef.current.features.find(f=>stateCode(f)===place.state);
   if(state)fitFeature(map,state,'state',reduced);
  }else map.fitBounds([[-126,23],[-66,50]],{padding:45,duration:reduced?0:950,essential:false});
 },[place,counties,states,reduced]);
 const currentName=label(place,countyName);
 const stateName=place.state?STATE_NAMES[place.state]:'';
 const stateCounties=useMemo(()=>counties.features.filter(f=>f.properties?.GEOID).sort((a,b)=>nameOf(a).localeCompare(nameOf(b))),[counties]);
 const goBack=()=>place.county?chooseCounty(null):place.state?chooseState(null):undefined;
 const cards=useMemo(()=>{
  if(view==='overview'){
   return [
    {eyebrow:'2024 PRESIDENTIAL · HISTORICAL',title:place.state?winner(place.state):'State-by-state winners',body:place.state?'FEC statewide popular-vote result, not a 2026 Senate or House result.':'Select a state to explore a dated national voting baseline.'},
    {eyebrow:'2026 · U.S. CONGRESS',title:contests.length?contests.length+' published contests':'Verified contests pending',body:'U.S. Senate races are statewide only when a seat is on the ballot. House races are congressional-district based.'},
    {eyebrow:'WHAT CHANGED HERE?',title:events.length?events.length+' sourced developments':'Local coverage being built',body:'Verified developments will connect documented actions, officials, original records and reviewed promise comparisons.'}
   ];
  }
  if(view==='races')return [
   {eyebrow:'SENATE',title:contests.filter(c=>c.office==='us_senate').length+' published contests',body:'A state may have no U.S. Senate contest in the selected election year.'},
   {eyebrow:'HOUSE',title:contests.filter(c=>c.office==='us_house').length+' published district contests',body:'A county may intersect several congressional districts.'},
   {eyebrow:'REVIEW STATUS',title:'Only published records',body:'Missing contest data is a coverage gap, not proof that an election did not happen.'}
  ];
  if(view==='timeline')return [{eyebrow:'EVENT TIMELINE',title:events.length?events.length+' sourced developments':'Awaiting verified events',body:'Congressional actions, public statements, and law changes will be sorted by date and sourced to original documents.'}];
  if(view==='accountability')return [{eyebrow:'PROMISE → ACTION',title:'Check the role, not just the headline',body:'Signing, sponsoring, voting, public advocacy and rulings are different actions. ABB will link each to original sources before assessing alignment.'}];
  return [{eyebrow:'SOURCE PROVENANCE',title:'Public evidence and corrections',body:'Legislative records, reporting, reviews, revisions and data freshness will be independently inspectable.'}];
 },[view,place.state,contests,events]);
 return <div className="app">
  <div className="utility"><span>ABB / THE PUBLIC RECORD, IN MOTION</span><span>MAP ENGINE PREVIEW · VERIFIED DATA ONLY</span></div>
  <header className="mast"><div className="brand">ABB<span>.</span><small>THE ACCOUNTABILITY BIG BOARD</small></div><nav><a href="/">Editorial homepage</a><a href="/api/transparency">Transparency</a><a href="https://github.com/itsthetreehou5-ui/accountabilibuddy">Source code</a></nav><span className="preview-pill">MAP ENGINE / STAGING</span></header>
  <main className="main">
   <div className="intro"><div><span className="eyebrow">WELCOME TO THE PUBLIC RECORD</span><h1>Every place has a story.<br/><em>Find yours.</em></h1></div><p>Go from the national picture to the county level, then follow the verified contests, official actions and original evidence. One location. One connected view.</p></div>
   <div className="map-shell">
    <div className="map-pane">
     <div className="top-controls"><div className="crumb"><button onClick={()=>chooseState(null)}>United States</button>{place.state&&<><span>›</span><button onClick={()=>chooseCounty(null)}>{stateName}</button></>}{place.county&&<><span>›</span><strong>{countyName||place.county}</strong></>}</div><div className="nav-buttons"><button disabled={!place.state} onClick={goBack}>← Back</button><button onClick={()=>chooseState(null)}>⌂ Nation</button></div></div>
     <div ref={mapContainer} className="map" role="region" aria-label="Interactive national civic map"/>
     {mapError&&<div className="map-error" role="status">{mapError}</div>}{dataState==='loading'&&<div className="map-loading" role="status">Loading official state boundaries…</div>}
     <div className="map-overlay"><span>{place.county?'COUNTY VIEW':place.state?'STATE VIEW':'NATIONAL VIEW'}</span><strong>{currentName}</strong></div>
     <div className="map-controls"><label htmlFor="states">Find a state</label><select id="states" value={place.state||''} onChange={e=>chooseState(e.target.value||null)}><option value="">United States</option>{STATES.map(code=><option value={code} key={code}>{STATE_NAMES[code]}</option>)}</select>{!!place.state&&<><label htmlFor="counties">County</label><select id="counties" value={place.county||''} onChange={e=>chooseCounty(e.target.value||null)} disabled={!stateCounties.length}><option value="">All counties</option>{stateCounties.map(f=><option key={String(f.properties?.GEOID)} value={String(f.properties?.GEOID)}>{nameOf(f)}</option>)}</select></>}</div>
     <div className="legend"><div><b>{layer==='baseline'?'2024 Presidential · statewide popular vote':'Neutral geography'}</b><button onClick={()=>setLayer(layer==='baseline'?'neutral':'baseline')}>{layer==='baseline'?'Hide election colors':'Show 2024 winners'}</button></div>{layer==='baseline'&&<div className="legend-items"><span><i className="swatch red"/>Trump / Republican</span><span><i className="swatch blue"/>Harris / Democratic</span><small>No county lean implied. Maine/Nebraska can split electoral votes.</small><a href="https://www.fec.gov/resources/cms-content/documents/2024presgeresults.pdf" target="_blank" rel="noopener noreferrer">FEC results ↗</a></div>}</div>
    </div>
    <aside className="summary"><span className="eyebrow">ABB / YOUR GEOGRAPHY</span><h2>{currentName}</h2><p>{place.county?'County selected. See state-level elections and any published local developments. House district intersections are not yet available.':place.state?'County boundaries and related congressional contests are in view. Choose a county or explore the source-linked context below.':'Select any state to focus the map and the entire civic report.'}</p>
     {place.state&&<div className="winner"><small>HISTORICAL BASELINE · 2024</small><strong>{winner(place.state)}</strong><span>Statewide presidential popular-vote winner</span></div>}
     <div className="summary-line"><span>2026 congressional contests</span><strong>{contests.length?contests.length+' published':'Not yet published'}</strong></div>
     <div className="summary-line"><span>Verified civic developments</span><strong>{events.length||'No published entries'}</strong></div>
     <div className="summary-line"><span>County boundaries</span><strong>{place.state?(countyError?'Unavailable':counties.features.length+' features'):'Choose state'}</strong></div>
     {resultsError&&<p role="status" className="status">Data services are temporarily unavailable. No results have been inferred.</p>}
     <button className="primary" onClick={()=>setView('races')}>Explore congressional races →</button>
     <a className="secondary-link" href="/api/transparency">How ABB verifies its information ↗</a>
    </aside>
   </div>
   <section className="context"><div className="context-header"><div><span className="eyebrow">CONTEXT IN ONE PLACE</span><h2>{place.state?'Inside '+currentName:'The story behind the map'}</h2></div><div className="tabs" aria-label="Explore the selected location">{([['overview','At a glance'],['races','Races'],['timeline','Timeline'],['accountability','Promises & actions'],['sources','Receipts']] as [View,string][]).map(([id,label])=><button key={id} aria-pressed={view===id} onClick={()=>setView(id)}>{label}</button>)}</div></div>
    <div className="context-grid">{cards.map(c=><article className="context-card" key={c.eyebrow}><small>{c.eyebrow}</small><h3>{c.title}</h3><p>{c.body}</p></article>)}</div>
    <p className="methodology">Official Census 2026 geographic boundaries. The red/blue national layer represents the 2024 presidential statewide popular-vote winner, not a 2026 congressional result. No unreviewed news, partisan county lean, or candidate attribution is fabricated.</p>
   </section>
  </main>
  <footer>ABB · Nonpartisan civic intelligence · <a href="https://maplibre.org/">MapLibre</a> · Geographic data: <a href="https://tigerweb.geo.census.gov/">U.S. Census Bureau</a> · Basemap: OpenFreeMap / OpenStreetMap</footer>
 </div>
}
