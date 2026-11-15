import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Map as MapLibre, NavigationControl, setWorkerUrl, type GeoJSONSource, type Map as MapLibreMap, type ExpressionSpecification } from 'maplibre-gl';
import mapLibreWorkerURL from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
setWorkerUrl(mapLibreWorkerURL);
import 'maplibre-gl/dist/maplibre-gl.css';
import type { Feature, FeatureCollection, Geometry, GeoJsonProperties } from 'geojson';

type GeoCollection = FeatureCollection<Geometry, GeoJsonProperties>;
type Place = { state: string | null; county: string | null };
type PublishedContest = { id: string; office: 'us_senate' | 'us_house'; district: string | null; result_status: string; election_date: string };
type EventRecord = { id: string; headline: string; summary: string; happened_at: string; event_kind: string; source_url?: string };
type BallotMeasure = {id:string;designation:string;title:string;election_date:string;outcome:string;outcome_status:string;legal_status:string;source_url?:string};
type Official = {id:string;name:string;chamber:string;state_code:string;district:string|null;start_date?:string;end_date?:string};
type SourcedStatement = {id:string;statement:string;stated_at:string|null;source_url:string;source_title:string};
type SourcedAction = {id:string;kind:string;occurred_at:string;summary:string;source_url:string;source_title:string};
type ReviewedRelationship = {claim_id:string;action_id:string;relationship:string;rationale:string};
type OfficialReport = {official:Official;claims:SourcedStatement[];actions:SourcedAction[];reviewed_relationships:ReviewedRelationship[];complete:boolean};
type View = 'overview' | 'ballot' | 'races' | 'timeline' | 'accountability' | 'sources';
type Audience = 'simple' | 'explore' | 'research';
const EMPTY: GeoCollection = { type: 'FeatureCollection', features: [] };
const DEM_2024 = new Set(['DC','CA','CO','CT','DE','HI','IL','MA','MD','ME','MN','NH','NJ','NM','NY','OR','RI','VA','VT','WA']);
const BLUE = '#2868b0', RED = '#c43c51';
const STATE_NAMES: Record<string, string> = {
 AL:'Alabama',AK:'Alaska',AZ:'Arizona',AR:'Arkansas',CA:'California',CO:'Colorado',CT:'Connecticut',
 DC:'District of Columbia',DE:'Delaware',FL:'Florida',GA:'Georgia',HI:'Hawaii',ID:'Idaho',IL:'Illinois',IN:'Indiana',
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
 const [audience,setAudience]=useState<Audience>('simple');
 const [counties,setCounties]=useState<GeoCollection>(EMPTY);
 const [states,setStates]=useState<GeoCollection>(EMPTY);
 const [contests,setContests]=useState<PublishedContest[]>([]);
 const [events,setEvents]=useState<EventRecord[]>([]);
 const [ballotYear,setBallotYear]=useState('2026');
 const [officials,setOfficials]=useState<Official[]>([]);
 const [chosenOfficial,setChosenOfficial]=useState('');
 const [officialReport,setOfficialReport]=useState<OfficialReport|null>(null);
 const [officialDetailStatus,setOfficialDetailStatus]=useState<'idle'|'loading'|'ready'|'unavailable'>('idle');
 const [officialCoverage,setOfficialCoverage]=useState<'idle'|'loading'|'ready'|'unavailable'>('idle');
 const [measures,setMeasures]=useState<BallotMeasure[]>([]);
 const [ballotCoverage,setBallotCoverage]=useState<'idle'|'loading'|'ready'|'unavailable'>('idle');
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
  setView('overview');setGeography({state,county:null});
 },[setGeography]);
 const chooseCounty=useCallback((county:string|null)=>{
  setView('overview');setGeography({state:selectionRef.current.state,county});
 },[setGeography]);
 useEffect(()=>{
  if(!mapContainer.current||mapRef.current)return;
  let map:MapLibreMap;
  try{
   map=new MapLibre({
    container:mapContainer.current,
    style:'https://tiles.openfreemap.org/styles/liberty',
    center:[-97.6,39.5],zoom:3.3,
    minZoom:2.3,maxZoom:13,
    attributionControl:{compact:true},
    dragRotate:false,touchPitch:false,pitchWithRotate:false,
    cooperativeGestures:false
   });
  }catch(e){setMapError('This device could not start the WebGL map. The accessible state list below is still available.');return}
  mapRef.current=map;
  map.addControl(new NavigationControl({showCompass:false}),'top-left');
  map.on('load',()=>{
   map.addSource('abb-states',{type:'geojson',data:stateRef.current,promoteId:'STUSPS'});
   map.addLayer({id:'abb-state-fills',type:'fill',source:'abb-states',paint:{
    'fill-color':['match',['get','STUSPS'],...STATES.flatMap(code=>[code,DEM_2024.has(code)?BLUE:RED]),'#ced9e2'] as unknown as ExpressionSpecification,
    'fill-opacity':.68
   }});
   map.addLayer({id:'abb-state-borders',type:'line',source:'abb-states',paint:{'line-color':'#ffffff','line-width':1.5}});
   map.addSource('abb-counties',{type:'geojson',data:countyRef.current,promoteId:'GEOID'});
   map.addLayer({id:'abb-county-fills',type:'fill',source:'abb-counties',paint:{'fill-color':'#a0bacf','fill-opacity':.68}});
   map.addLayer({id:'abb-county-borders',type:'line',source:'abb-counties',paint:{'line-color':'#ffffff','line-width':1.35}});
   map.addLayer({id:'abb-county-selected',type:'line',source:'abb-counties',filter:['==',['get','GEOID'],'__none__'],paint:{'line-color':'#102e4a','line-width':3.8}});
   // County polygons overlay states; only the most specific geographic level should respond.
   map.on('click','abb-state-fills',e=>{
    const countyVisible=!!selectionRef.current.state && map.getLayoutProperty('abb-county-fills','visibility')!=='none';
    if(countyVisible){
     const hits=map.queryRenderedFeatures(e.point,{layers:['abb-county-fills']});
     if(hits.some(f=>/^\d{5}$/.test(String(f.properties?.GEOID||''))))return;
    }
    const f=e.features?.[0],code=f?.properties?.STUSPS;
    if(typeof code==='string'&&Object.hasOwn(STATE_NAMES,code))chooseState(code);
   });
   map.on('click','abb-county-fills',e=>{
    const f=e.features?.[0],geoid=String(f?.properties?.GEOID||'');
    if(/^\d{5}$/.test(geoid))chooseCounty(geoid);
   });
   ['abb-state-fills','abb-county-fills'].forEach(layerName=>{
    map.on('mouseenter',layerName,()=>{map.getCanvas().style.cursor='pointer'});
    map.on('mouseleave',layerName,()=>{map.getCanvas().style.cursor=''});
   });
   // Reconcile a state selected through the non-visual control before WebGL finished loading.
   const initial=selectionRef.current;
   if(initial.state){
    const county=initial.county?countyRef.current.features.find(f=>String(f.properties?.GEOID)===initial.county):undefined;
    const f=stateRef.current.features.find(f=>stateCode(f)===initial.state);
    if(county)fitFeature(map,county,'county',reduced);
    else if(f)fitFeature(map,f,'state',reduced);
    ['abb-county-fills','abb-county-borders','abb-county-selected'].forEach(id=>map.setLayoutProperty(id,'visibility','visible'));
    map.setFilter('abb-county-selected',['==',['get','GEOID'],initial.county||'__none__']);
   } else {
    ['abb-county-fills','abb-county-borders','abb-county-selected'].forEach(id=>map.setLayoutProperty(id,'visibility','none'));
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
  const filled:ExpressionSpecification=['match',['get','STUSPS'],...STATES.flatMap(code=>[code,layer==='baseline'?(DEM_2024.has(code)?BLUE:RED):'#94abc0']),'#d2dce5'] as unknown as ExpressionSpecification;
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
 useEffect(()=>{
  if(!place.state){setMeasures([]);setBallotCoverage('idle');return}
  const controller=new AbortController();
  setMeasures([]);setBallotCoverage('loading');
  json<{items:BallotMeasure[]}>('/api/public/ballot-measures?state='+encodeURIComponent(place.state)+'&year='+ballotYear,controller.signal)
   .then(data=>{if(!controller.signal.aborted){setMeasures(data.items||[]);setBallotCoverage('ready')}})
   .catch(e=>{if(e.name!=='AbortError'){setMeasures([]);setBallotCoverage('unavailable')}});
  return ()=>controller.abort();
 },[place.state,ballotYear]);
 useEffect(()=>{
  setOfficials([]);setChosenOfficial('');setOfficialReport(null);
  if(!place.state){setOfficialCoverage('idle');return}
  setOfficialCoverage('loading');
  const controller=new AbortController();
  json<{items:Official[]}>('/api/public/officials?state='+place.state,controller.signal)
   .then(data=>{if(!controller.signal.aborted){setOfficials(data.items||[]);setOfficialCoverage('ready')}})
   .catch(e=>{if(e.name!=='AbortError'){setOfficialCoverage('unavailable')}});
  return ()=>controller.abort();
 },[place.state]);
 useEffect(()=>{
  setOfficialReport(null);
  if(!chosenOfficial){setOfficialDetailStatus('idle');return}
  setOfficialDetailStatus('loading');
  const controller=new AbortController();
  json<OfficialReport>('/api/public/officials/'+encodeURIComponent(chosenOfficial),controller.signal)
   .then(data=>{if(!controller.signal.aborted){setOfficialReport(data);setOfficialDetailStatus('ready')}})
   .catch(e=>{if(e.name!=='AbortError'&&!controller.signal.aborted){setOfficialReport(null);setOfficialDetailStatus('unavailable')}});
  return ()=>controller.abort();
 },[chosenOfficial]);
 const currentName=label(place,countyName);
 const stateName=place.state?STATE_NAMES[place.state]:'';
 const stateCounties=useMemo(()=>counties.features.filter(f=>f.properties?.GEOID).sort((a,b)=>nameOf(a).localeCompare(nameOf(b))),[counties]);
 const goBack=()=>place.county?chooseCounty(null):place.state?chooseState(null):undefined;
 const cards=useMemo(()=>{
  if(view==='overview'){
   return [
    {eyebrow:'2024 PRESIDENTIAL · HISTORICAL',title:place.state?winner(place.state):'State-by-state winners',body:place.state?'FEC statewide popular-vote result, not a 2026 Senate or House result.':'Select a state to explore a dated national voting baseline.'},
    {eyebrow:'2026 · U.S. CONGRESS',title:contests.length?contests.length+' published contests':'Verified contests pending',body:'U.S. Senate races are statewide only when a seat is on the ballot. D.C. has no senators; its House delegate is nonvoting on final House passage.'},
    {eyebrow:'WHAT CHANGED HERE?',title:events.length?events.length+' sourced developments':'Local coverage being built',body:'Verified developments will connect documented actions, officials, original records and reviewed promise comparisons.'}
   ];
  }
  if(view==='ballot')return [
   {eyebrow:'BALLOT MEASURES · '+ballotYear,title:place.state?(measures.length?measures.length+' published measures':'No published measures yet'):'Choose your state',body:'Your vote remains private. Select a location and year to follow publicly documented outcomes, not your individual ballot.'},
   {eyebrow:'STATUS · SOURCED HISTORY',title:'Election result ≠ policy in effect',body:'A passed ballot measure may face implementation steps or court challenges. The status must show its date, jurisdiction, source and any later changes.'},
   {eyebrow:'COVERAGE / STATUS',title:ballotCoverage==='unavailable'?'Data temporarily unavailable':ballotCoverage==='loading'?'Checking published sources':'Reviewed sources only',body:'An empty result means ABB has not published measures for this selection, not that no ballot measure occurred. No personal voting history is inferred.'}
  ];
  if(view==='races')return [
   {eyebrow:'SENATE',title:contests.filter(c=>c.office==='us_senate').length+' published contests',body:'A state may have no U.S. Senate contest in the selected election year.'},
   {eyebrow:'HOUSE',title:contests.filter(c=>c.office==='us_house').length+' published district contests',body:'A county may intersect several congressional districts.'},
   {eyebrow:'REVIEW STATUS',title:'Only published records',body:'Missing contest data is a coverage gap, not proof that an election did not happen.'}
  ];
  if(view==='timeline')return [{eyebrow:'EVENT TIMELINE',title:events.length?events.length+' sourced developments':'Awaiting verified events',body:'Congressional actions, public statements, and law changes will be sorted by date and sourced to original documents.'}];
  if(view==='accountability')return [{eyebrow:'PROMISE → ACTION',title:'Check the role, not just the headline',body:'Signing, sponsoring, voting, public advocacy and rulings are different actions. ABB will link each to original sources before assessing alignment.'}];
  return [{eyebrow:'SOURCE PROVENANCE',title:'Public evidence and corrections',body:'Legislative records, reporting, reviews, revisions and data freshness will be independently inspectable.'}];
 },[view,place.state,contests,events,ballotYear,measures,ballotCoverage]);
 const prompt=audience==='simple'?'What do you need to understand?':audience==='explore'?'Choose a thread to investigate.':'Choose an evidence trail.';
 return <div className="app">
  <div className="utility"><span>ABB / THE PUBLIC RECORD, IN MOTION</span><span>MAP ENGINE PREVIEW · VERIFIED DATA ONLY</span></div>
  <header className="mast"><div className="brand">ABB<span>.</span><small>THE ACCOUNTABILITY BIG BOARD</small></div><nav><a href="/">Editorial homepage</a><a href="/api/transparency">Transparency</a><a href="https://github.com/itsthetreehou5-ui/accountabilibuddy">Source code</a></nav><span className="preview-pill">MAP ENGINE / STAGING</span></header>
  <main className="main">
   <div className="intro"><div><span className="eyebrow">WELCOME TO THE PUBLIC RECORD</span><h1>Every place has a story.<br/><em>Find yours.</em></h1></div><p>Go from the national picture to the county level, then follow the verified contests, official actions and original evidence. One location. One connected view.</p></div>
   <section className="quickstart" aria-label="Choose how deeply to explore ABB"><div className="quickstart-intro"><span className="eyebrow">START WITH A QUESTION</span><strong>{prompt}</strong></div><div className="audience-tabs" role="group" aria-label="Information detail level"><button type="button" aria-pressed={audience==='simple'} onClick={()=>setAudience('simple')}>Keep it simple</button><button type="button" aria-pressed={audience==='explore'} onClick={()=>setAudience('explore')}>Let me explore</button><button type="button" aria-pressed={audience==='research'} onClick={()=>setAudience('research')}>Research mode</button></div><div className="quick-questions"><button type="button" onClick={()=>setView('ballot')}>What happened to what I voted on? <span>↗</span></button><button type="button" onClick={()=>setView('accountability')}>What did this person actually do? <span>↗</span></button><button type="button" onClick={()=>setView(audience==='research'?'sources':'timeline')}>{audience==='research'?'Show me original sources':"What changed where I live?"} <span>↗</span></button></div></section>
   <div className="map-shell">
    <div className="map-pane">
     <div className="top-controls"><div className="crumb"><button onClick={()=>chooseState(null)}>United States</button>{place.state&&<><span>›</span><button onClick={()=>chooseCounty(null)}>{stateName}</button></>}{place.county&&<><span>›</span><strong>{countyName||place.county}</strong></>}</div><div className="nav-buttons"><button disabled={!place.state} onClick={goBack}>← Back</button><button onClick={()=>chooseState(null)}>⌂ Nation</button></div></div>
     <div ref={mapContainer} className="map" role="region" aria-label="Interactive national civic map"/>
     {mapError&&<div className="map-error" role="status">{mapError}</div>}{dataState==='loading'&&<div className="map-loading" role="status">Loading official state boundaries…</div>}
     <div className="map-overlay"><span>{place.county?'COUNTY VIEW':place.state?'STATE VIEW':'NATIONAL VIEW'}</span><strong>{currentName}</strong></div>
     <div className="map-controls"><label htmlFor="states">Find a state</label><select id="states" value={place.state||''} onChange={e=>chooseState(e.target.value||null)}><option value="">United States</option>{STATES.map(code=><option value={code} key={code}>{STATE_NAMES[code]}</option>)}</select>{!!place.state&&<><label htmlFor="counties">County</label><select id="counties" value={place.county||''} onChange={e=>chooseCounty(e.target.value||null)} disabled={!stateCounties.length}><option value="">All counties</option>{stateCounties.map(f=><option key={String(f.properties?.GEOID)} value={String(f.properties?.GEOID)}>{nameOf(f)}</option>)}</select></>}</div>
     <div className="legend"><div><b>{layer==='baseline'?'2024 Presidential · statewide popular vote':'Neutral geography'}</b><button onClick={()=>setLayer(layer==='baseline'?'neutral':'baseline')}>{layer==='baseline'?'Hide election colors':'Show 2024 winners'}</button></div>{layer==='baseline'&&<div className="legend-items"><span><i className="swatch red"/>Trump / Republican</span><span><i className="swatch blue"/>Harris / Democratic</span><small>No county lean implied. Maine/Nebraska can split electoral votes.</small><a href="https://www.fec.gov/resources/cms-content/documents/2024presgeresults.pdf" target="_blank" rel="noopener noreferrer">FEC results ↗</a></div>}</div>
    </div>
    <aside className="summary"><span className="eyebrow">ABB / YOUR GEOGRAPHY</span><h2>{currentName}</h2><p>{place.county?'County selected. See state-level elections and any published local developments. House district intersections are not yet available.':place.state?(place.state==='DC'?'Washington, D.C. has no U.S. senators and is represented by a nonvoting House delegate.':'County boundaries and related congressional contests are in view. Choose a county or explore the source-linked context below.'):'Select any state to focus the map and the entire civic report.'}</p>
     {place.state&&<div className="winner"><small>HISTORICAL BASELINE · 2024</small><strong>{winner(place.state)}</strong><span>Statewide presidential popular-vote winner</span></div>}
     <div className="summary-line"><span>2026 congressional contests</span><strong>{contests.length?contests.length+' published':'Not yet published'}</strong></div>
     <div className="summary-line"><span>Verified civic developments</span><strong>{events.length||'No published entries'}</strong></div>
     <div className="summary-line"><span>County boundaries</span><strong>{place.state?(countyError?'Unavailable':counties.features.length+' features'):'Choose state'}</strong></div>
     {resultsError&&<p role="status" className="status">Data services are temporarily unavailable. No results have been inferred.</p>}
     <button className="primary" onClick={()=>setView('races')}>Explore congressional races →</button>
     <a className="secondary-link" href="/api/transparency">How ABB verifies its information ↗</a>
    </aside>
   </div>
   <section className="context"><div className="context-header"><div><span className="eyebrow">CONTEXT IN ONE PLACE</span><h2>{place.state?'Inside '+currentName:'The story behind the map'}</h2></div><div className="tabs" aria-label="Explore the selected location">{([['overview','At a glance'],['ballot','My ballot'],['races','Races'],['timeline','Timeline'],['accountability','Promises & actions'],['sources','Receipts']] as [View,string][]).map(([id,label])=><button key={id} aria-pressed={view===id} onClick={()=>setView(id)}>{label}</button>)}</div></div>
    {view==='ballot'&&<div className="ballot-filters"><label htmlFor="ballot-year">Election year</label><select id="ballot-year" value={ballotYear} onChange={e=>setBallotYear(e.target.value)}>{['2026','2024','2022','2020','2018'].map(year=><option key={year} value={year}>{year}</option>)}</select><span>Select a state on the map to scope publicly published ballot measures. ABB cannot see how you voted.</span></div>}<div className="context-intro" role="status">{audience==='simple'?'Plain-language overview. Terms explained; no assumption that you already know the process.':audience==='explore'?'Follow developments, compare officials’ actions, and keep the selected geography in view.':'Evidence-focused view. Published records only; data gaps and dates are explicit.'}</div><div className="context-grid">{cards.map(c=><article className="context-card" key={c.eyebrow}><small>{c.eyebrow}</small><h3>{c.title}</h3><p>{c.body}</p></article>)}</div>
    {(view==='overview'||view==='timeline')&&events.length>0&&<section className="local-events" aria-label="Reviewed local developments"><div className="local-events-heading"><span className="eyebrow">WHAT CHANGED HERE? / SOURCED DEVELOPMENTS</span><strong>Recent verified updates for {currentName}</strong></div><div className="local-events-grid">{events.slice(0,audience==='simple'?2:6).map(event=><article key={event.id}><small>{event.happened_at} · {event.event_kind.replaceAll('_',' ')}</small><h3>{event.headline}</h3><p>{event.summary}</p>{event.source_url?.startsWith('https://')&&<a href={event.source_url} target="_blank" rel="noopener noreferrer">Read original evidence ↗</a>}</article>)}</div></section>}
    {audience==='research'&&place.state&&<section className="research-links" aria-label="Public data resources"><div><span className="eyebrow">RESEARCH / REPRODUCIBLE RECORDS</span><strong>Inspect the raw public record</strong></div><div><a href={'/api/elections/contests?state='+encodeURIComponent(place.state)+'&date=2026-11-03'} target="_blank" rel="noopener noreferrer">Published contest index ↗</a><a href={'/api/public/events?state='+encodeURIComponent(place.state)+(place.county?'&county='+place.county:'')} target="_blank" rel="noopener noreferrer">Published events JSON ↗</a><a href={'/api/public/ballot-measures?state='+encodeURIComponent(place.state)+'&year='+ballotYear} target="_blank" rel="noopener noreferrer">Ballot measures JSON ↗</a><a href="/api/transparency" target="_blank" rel="noopener noreferrer">Transparency ↗</a></div><p>These public APIs return only published records. An empty response describes ABB coverage, not the absence of political activity.</p></section>}
    {view==='accountability'&&<section className="officials-search" aria-label="Compare an official's documented statements and actions">
     <div className="officials-search-head"><div><strong>Who said it? What did they do?</strong><p>Choose a state and a published official. Statements and recorded actions are shown separately, with original sources. Reviewed comparisons appear only when independently verified.</p></div><div><label htmlFor="official-select">Published officials</label><select id="official-select" disabled={!officials.length} value={chosenOfficial} onChange={e=>setChosenOfficial(e.target.value)}><option value="">{!place.state?'Choose a state first':officialCoverage==='loading'?'Loading published profiles…':officials.length?'Choose an official…':'No profiles published yet'}</option>{officials.map(o=><option value={o.id} key={o.id}>{o.name} · {o.chamber==='senate'?'U.S. Senate':'U.S. House'}</option>)}</select></div></div>
     {officialCoverage==='unavailable'&&<p className="officials-status" role="status">Published profile lookup is temporarily unavailable. This is not evidence that officials have no records.</p>}
     {officialCoverage==='ready'&&!officials.length&&<p className="officials-status">ABB has not published verified official dossiers for this state yet. This does not mean the state lacks representatives or legislative activity.</p>}
     {chosenOfficial&&officialDetailStatus==='loading'&&<p className="officials-status" role="status">Checking the reviewed statement and action record…</p>}{chosenOfficial&&officialDetailStatus==='unavailable'&&<p className="officials-status" role="status">This published dossier could not be loaded. No conclusions about this person's voting record can be drawn from the missing response.</p>}
     {officialReport&&<div className="official-report">
      <header><span className="eyebrow">SOURCE-LINKED PROFILE</span><h3>{officialReport.official.name}</h3><p>Published statements and legislative actions; this profile may be incomplete.</p></header>
      <div className="official-report-columns">
       <div><h4>What they said</h4>{officialReport.claims.length?officialReport.claims.map(c=><article key={c.id}><small>{c.stated_at||'Date not recorded'}</small><p>{c.statement}</p>{c.source_url?.startsWith('https://')&&<a href={c.source_url} target="_blank" rel="noopener noreferrer">Original statement ↗</a>}</article>):<p className="officials-status">No reviewed statements have been published.</p>}</div>
       <div><h4>What they did</h4>{officialReport.actions.length?officialReport.actions.map(a=><article key={a.id}><small>{a.occurred_at} · {a.kind.replaceAll('_',' ')}</small><p>{a.summary}</p>{a.source_url?.startsWith('https://')&&<a href={a.source_url} target="_blank" rel="noopener noreferrer">Official action record ↗</a>}</article>):<p className="officials-status">No reviewed actions have been published.</p>}</div>
      </div>
      <div className="reviewed-comparisons"><h4>Reviewed connections</h4>{officialReport.reviewed_relationships.length?officialReport.reviewed_relationships.map((link,i)=><p key={link.claim_id+':'+link.action_id+':'+i}><b>{link.relationship.replaceAll('_',' ')}:</b> {link.rationale}</p>):<p>No reviewed statement-to-action comparison has been published. An absent comparison does not mean their positions were consistent.</p>}</div>
     </div>}
    </section>}
    {view==='ballot'&&measures.length>0&&<div className="ballot-measures" aria-label="Published ballot measures">{measures.map(measure=><article className="ballot-measure" key={measure.id}><small>{measure.designation} · {measure.election_date} · {measure.outcome_status}</small><strong>{measure.title}</strong><p>Public result: {measure.outcome}. Legal status: {measure.legal_status.replaceAll('_',' ')}.</p>{measure.source_url?.startsWith('https://')&&<a href={measure.source_url} target="_blank" rel="noopener noreferrer">Inspect primary source ↗</a>}</article>)}</div>}
    <p className="methodology">Official Census 2026 geographic boundaries. The red/blue national layer represents the 2024 presidential statewide popular-vote winner, not a 2026 congressional result. No unreviewed news, partisan county lean, or candidate attribution is fabricated.</p>
   </section>
  </main>
  <footer>ABB · Nonpartisan civic intelligence · <a href="https://maplibre.org/">MapLibre</a> · Geographic data: <a href="https://tigerweb.geo.census.gov/">U.S. Census Bureau</a> · Basemap: OpenFreeMap / OpenStreetMap</footer>
 </div>
}
