import React,{useCallback,useEffect,useRef,useState} from 'react';
import {Activity,ArrowUpRight,Bell,BookOpen,BrainCircuit,Check,ChevronDown,ChevronRight,CircleHelp,Download,FileJson,Grid2X2,Leaf,Menu,Network,Plus,Radio,Save,Settings2,ShieldCheck,SlidersHorizontal,TrendingUp,X,Zap} from 'lucide-react';
import {api,API,dateLabel,clock,fmt} from './api';
import {Modal,ScenarioForm} from './components/UI';
import {Overview,Simulation,Forecasting,DemandResponse,Anomalies,Reports} from './components/Pages';

const NAV=[['overview','Overview',Grid2X2],['forecasting','AI Forecasting',BrainCircuit],['simulation','Live Grid Simulation',Network],['response','Demand Response',Zap],['anomalies','Anomaly Detection',Activity],['reports','Analytics & Reports',TrendingUp]];
const COPY={overview:['Grid overview','One city. A clearer view of every megawatt.'],forecasting:['See the demand ahead.','Compare trained models against real, held-out electricity measurements.'],simulation:['The city, in motion.','Explore how weather, consumption, and dispatch shape the grid.'],response:['Shift loads. Keep the lights on.','Constrained scheduling that makes better use of available energy.'],anomalies:['Spot the unexpected.','Trace unusual consumption back to its time and source.'],reports:['Every decision, measured.','Review saved scenarios, compare outcomes, and export the evidence.']};

function Brand(){return <div className="brand"><svg viewBox="0 0 32 36" width="30" height="34" aria-hidden="true"><path d="M1 8 L15 0 L15 12 L1 20Z M18 1 L31 8 L31 22 L18 15Z M2 24 L15 16 L29 24 L16 33Z" fill="currentColor"/></svg><span>gridwise<span className="brand-dot">.</span></span></div>}

export default function App(){
  const validPage=()=>NAV.some(n=>n[0]===location.hash.slice(1))?location.hash.slice(1):'overview';
  const [page,setPage]=useState(validPage),[run,setRun]=useState(null),[draft,setDraft]=useState(null),[scenarios,setScenarios]=useState([]),[models,setModels]=useState(null),[backtest,setBacktest]=useState(null),[history,setHistory]=useState(null),[runs,setRuns]=useState([]);
  const [busy,setBusy]=useState(true),[error,setError]=useState(''),[toast,setToast]=useState(''),[index,setIndex]=useState(36),[playing,setPlaying]=useState(false),[speed,setSpeed]=useState(1),[optimized,setOptimized]=useState(false),[selected,setSelected]=useState(null),[modal,setModal]=useState(null),[saveName,setSaveName]=useState(''),[mobileNav,setMobileNav]=useState(false);
  const requestId=useRef(0),mounted=useRef(true);
  const onError=useCallback(e=>setError(e.message||String(e)),[]);
  const closeModal=useCallback(()=>setModal(null),[]);
  const onNavigate=useCallback(id=>{location.hash=id;setPage(id);setMobileNav(false);window.scrollTo({top:0,behavior:'smooth'})},[]);
  useEffect(()=>{const change=()=>setPage(validPage());window.addEventListener('hashchange',change);return()=>window.removeEventListener('hashchange',change)},[]);
  const refreshRuns=async()=>{setRuns(await api('/runs'))};
  const onRefreshModels=async()=>{const [m,b]=await Promise.all([api('/models'),api('/backtest')]);setModels(m);setBacktest(b)};
  const acceptRun=result=>{setRun(result);setDraft(result.config);setOptimized(result.dispatch_optimized);setIndex(Math.min(36,result.series.length-1));setSelected(null);setPlaying(false)};
  const onRunConfig=async config=>{
    const id=++requestId.current;setBusy(true);setError('');setPlaying(false);
    try{const result=await api('/simulate',config);if(id!==requestId.current)return;acceptRun(result);await refreshRuns();setToast('Scenario calculated. Forecasts and dispatch plan are ready.');setModal(null)}
    catch(e){onError(e)}finally{if(id===requestId.current)setBusy(false)}
  };
  const initialize=async()=>{
    setBusy(true);setError('');
    try{
      const [s,m,b,h]=await Promise.all([api('/scenarios'),api('/models'),api('/backtest'),api('/history?days=7')]);
      if(!mounted.current)return;setScenarios(s);setModels(m);setBacktest(b);setHistory(h);
      const result=await api('/simulate',s[0].config);if(!mounted.current)return;acceptRun(result);await refreshRuns();
    }catch(e){onError(e)}finally{if(mounted.current)setBusy(false)}
  };
  useEffect(()=>{mounted.current=true;initialize();return()=>{mounted.current=false}},[]);
  useEffect(()=>{if(!toast)return;const t=setTimeout(()=>setToast(''),4500);return()=>clearTimeout(t)},[toast]);
  useEffect(()=>{
    if(!playing||!run||busy)return;
    const timer=setInterval(()=>setIndex(i=>{if(i>=run.series.length-1){setPlaying(false);return i}return i+1}),1000/speed);
    return()=>clearInterval(timer);
  },[playing,speed,run,busy]);
  const onDispatch=async value=>{
    setBusy(true);setPlaying(false);
    try{await api(`/runs/${run.id}/dispatch`,{optimized:value});setOptimized(value);setRun(r=>({...r,dispatch_optimized:value}));setToast(value?'Optimized schedule applied to the simulation.':'Original dispatch restored.');}
    catch(e){onError(e)}finally{setBusy(false)}
  };
  const onLoadRun=async id=>{setBusy(true);try{acceptRun(await api(`/runs/${id}`));setToast('Saved simulation restored.')}catch(e){onError(e)}finally{setBusy(false)}};
  const onSaveScenario=()=>{setSaveName(`${run.config.name} · custom`);setModal('save')};
  const saveScenario=async e=>{e.preventDefault();try{const saved=await api('/scenarios',{name:saveName.trim(),config:draft});setScenarios(s=>[...s,saved]);setModal(null);setToast(`Scenario “${saved.name}” saved.`)}catch(err){onError(err)}};
  const dirty=run&&draft&&JSON.stringify(run.config)!==JSON.stringify(draft);
  const row=run?.series[index];
  const props={row,run,draft,setDraft,models,backtest,history,runs,busy,dirty,index,setIndex,playing,setPlaying,speed,setSpeed,optimized,selected,setSelected,onNavigate,onDispatch,onRun:()=>onRunConfig(draft),onRunConfig,onError,onRefreshModels,onLoadRun,onSaveScenario};
  const CurrentPage={overview:Overview,forecasting:Forecasting,simulation:Simulation,response:DemandResponse,anomalies:Anomalies,reports:Reports}[page];
  const match=scenarios.find(s=>JSON.stringify(s.config)===JSON.stringify(run?.config));
  const handleFileLoad=e=>{
    const file=e.target.files?.[0];
    if(!file)return;
    const reader=new FileReader();
    reader.onload=evt=>{
      try{
        const parsed=JSON.parse(evt.target.result);
        if(parsed?.series?.length){
          acceptRun(parsed);
          setToast(`Imported "${parsed.config?.name || 'simulation run'}" from JSON.`);
        }else{
          onError(new Error('Invalid run JSON structure'));
        }
      }catch(err){onError(err)}
    };
    reader.readAsText(file);
  };
  return <div className="app-shell">
    {mobileNav&&<div className="sidebar-scrim" onClick={()=>setMobileNav(false)}/>}
    <aside className={`sidebar ${mobileNav?'open':''}`}><a className="brand-link" href="#overview" aria-label="Gridwise overview"><Brand/></a><div className="workspace-switch"><div className="workspace-icon"><Network size={19}/></div><div><strong>Pune microgrid</strong><span>Simulation workspace</span></div><ShieldCheck size={14}/></div><div className="nav-caption">WORKSPACE</div><nav>{NAV.map(([id,label,Icon])=><button key={id} className={page===id?'active':''} onClick={()=>onNavigate(id)}><Icon size={18}/><span>{label}</span>{id==='anomalies'&&run?.alerts.length>0?<b className="nav-count">{run.alerts.length}</b>:page===id&&<i/>}</button>)}</nav><div className="sidebar-bottom"><div className="side-note"><div className="side-note-icon"><Leaf size={19}/></div><strong>Energy, intelligently.</strong><p>Forecast. Adapt. Balance.</p><span>AI-powered grid operations</span></div><button className="help-button" onClick={()=>setModal('about')}><BookOpen size={17}/>Data & methodology<ArrowUpRight size={14}/></button><div className="backend-status"><span className={run?'green-dot':'amber-dot'}/><div><strong>{run?'Backend connected':busy?'Connecting…':'Connection required'}</strong><small>FastAPI · local simulation</small></div><span className="version">v1.0</span></div></div></aside>
    <div className="main-shell"><header className="topbar"><div className="breadcrumb"><button className="icon-button mobile-menu" onClick={()=>setMobileNav(true)} aria-label="Open navigation"><Menu size={20}/></button><span>Workspace</span><ChevronRight size={13}/><strong>{NAV.find(n=>n[0]===page)[1]}</strong></div><div className="topbar-actions"><span className="demo-label"><Radio size={13}/>Simulation environment</span><button className="icon-button notification-button" aria-label="View consumption alerts" onClick={()=>onNavigate('anomalies')}><Bell size={19}/>{run?.alerts.length>0&&<i/>}</button><span className="avatar" title="Grid operator">GO</span></div></header>
      <main><div className="page-heading"><div><div className="eyebrow">ENERGY INTELLIGENCE</div><h1>{COPY[page][0]}</h1><p>{COPY[page][1]}</p></div><div className="heading-actions">{import.meta.env.DEV&&<label className="button secondary" style={{cursor:'pointer'}} title="Load an exported simulation run JSON"><FileJson size={16}/>Load report JSON<input type="file" accept=".json" style={{display:'none'}} onChange={handleFileLoad}/></label>}<button className="button secondary" disabled={!run||busy} onClick={()=>setModal('scenario')}><SlidersHorizontal size={16}/>Configure scenario</button><button className="button primary" disabled={!run} onClick={()=>onNavigate('reports')}><Download size={16}/>Reports</button></div></div>
      {error&&<div role="alert" className="error-banner"><Activity size={19}/><div><strong>We couldn’t complete that request.</strong><p>{error}</p></div><button className="text-button" onClick={()=>setError('')} aria-label="Dismiss error"><X size={17}/></button></div>}
      {run?<><div className="context-bar"><div className="scenario-selector"><span className="context-label">SCENARIO</span><select aria-label="Choose scenario" disabled={busy} value={match?.id||'custom'} onChange={e=>{const chosen=scenarios.find(s=>String(s.id)===e.target.value);if(chosen)onRunConfig(chosen.config)}}>{!match&&<option value="custom">{run.config.name} · modified</option>}{scenarios.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select><button className="icon-button" aria-label="Save current scenario" onClick={onSaveScenario}><Save size={15}/></button></div><div className="context-meta"><span>{dateLabel(run.series[0].timestamp)} <b>·</b> {run.config.horizon}h horizon</span><span className="context-divider"/><span><i className={busy?'amber-dot':'green-dot'}/>{busy?'Calculating…':`${run.config.model==='baseline'?'Seasonal':run.config.model.toUpperCase()} model ready`}</span></div></div>
      <div className={busy?'page-content is-calculating':'page-content'} aria-busy={busy}><CurrentPage {...props}/></div><footer className="page-footer"><span><ShieldCheck size={13}/>Simulation values · {run.weather.mode} · no live infrastructure connected</span><button onClick={()=>setModal('about')}>Sources & assumptions <ArrowUpRight size={12}/></button></footer></>:<div className="loading-page">{busy?<><div className="loader"/><h2>Preparing your grid.</h2><p>Loading trained models and calculating the first scenario.</p></>:<><Network size={44}/><h2>The backend needs attention.</h2><p>Start the project with <code>npm run dev</code> from the project folder. The Python API must be available on port 8000.</p><button className="button primary" onClick={initialize}>Retry connection</button></>}</div>}
      </main>
    </div>
    {toast&&<div className="toast" role="status"><Check size={18}/>{toast}<button className="icon-button" onClick={()=>setToast('')} aria-label="Dismiss notification"><X size={14}/></button></div>}
    {modal==='scenario'&&draft&&<Modal title="Configure your scenario" onClose={closeModal}><p className="body-copy">Adjust the inputs, then run a new forecast and constrained dispatch calculation.</p><ScenarioForm {...{draft,setDraft,busy,dirty}} onRun={()=>onRunConfig(draft)}/></Modal>}
    {modal==='save'&&draft&&<Modal title="Save scenario" onClose={closeModal}><form onSubmit={saveScenario} className="save-form"><p className="body-copy">Save these scenario inputs for another run. Completed simulation results are already saved automatically.</p><label>Scenario name<input autoFocus required maxLength={80} value={saveName} onChange={e=>setSaveName(e.target.value)}/></label>{dirty&&<p className="small-note">This saves your pending input changes. Run the scenario to calculate their results.</p>}<button type="submit" className="button primary" disabled={!saveName.trim()}><Save size={16}/>Save scenario</button></form></Modal>}
    {modal==='about'&&<Modal title="Built on transparent calculations" onClose={closeModal} wide><div className="about-content"><div className="about-brand"><Brand/><span className="pill green">Working prototype</span></div><p className="body-copy">Gridwise connects household-demand forecasting, weather-based renewable estimates, and constrained load scheduling to one interactive city simulation. It does not control a physical grid.</p>{run&&<><h3>What each value means</h3><div className="provenance-grid"><div><span className="pill green">Real historical</span><p>UCI household meter readings from Sceaux, France. Training and holdout metrics stay in original kW.</p></div><div><span className="pill neutral">Predicted / estimated</span><p>LSTM, Transformer, and seasonal forecasts. Solar and wind use an Open-Meteo weather forecast and simplified engineering curves.</p></div><div><span className="pill amber">Simulated</span><p>Pune city loads, grid capacity, tariffs, equipment surges, dispatch and cost savings. No live city measurement is claimed.</p></div></div><h3>Model and dispatch assumptions</h3><ul>{run.assumptions.map(a=><li key={a}>{a}</li>)}</ul><p className="small-note">Weather snapshot: {run.weather.retrieved_at}. Data: {run.provenance.start} to {run.provenance.end}. Solver: {run.optimization.solver}.</p></>}<div className="source-links"><a href="https://archive.ics.uci.edu/dataset/235/individualhouseholdelectricpowerconsumption" target="_blank" rel="noreferrer">UCI dataset <ArrowUpRight size={14}/></a><a href="https://open-meteo.com/en/docs" target="_blank" rel="noreferrer">Open-Meteo <ArrowUpRight size={14}/></a><a href={`${API}/api/docs`} target="_blank" rel="noreferrer">API documentation <ArrowUpRight size={14}/></a></div></div></Modal>}
  </div>;
}
