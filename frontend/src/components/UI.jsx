import React,{useEffect,useRef} from 'react';
import { Play,Pause,RotateCcw,ChevronLeft,ChevronRight,X,SlidersHorizontal,ArrowUpRight,ShieldCheck,Sun,Wind,PlugZap,Info } from 'lucide-react';
import {fmt,money,clock,dateLabel,LOAD_NAMES} from '../api';
import {Sparkline} from './Charts';

export function Panel({title,eyebrow,action,children,className=''}) {
  return <section className={`panel ${className}`}><div className="panel-heading"><div>{eyebrow&&<div className="eyebrow">{eyebrow}</div>}<h2>{title}</h2></div>{action}</div>{children}</section>;
}
export function Metric({label,value,unit,note,icon:Icon,values=[],accent=false}) {
  return <article className={`metric ${accent?'metric-accent':''}`}><div className="metric-top"><span>{label}</span>{Icon&&<Icon size={17}/>}</div><div className="metric-value">{value}<small>{unit}</small></div><div className="metric-bottom"><span>{note}</span>{values.length>0&&<Sparkline values={values} color={accent?'#9fcb79':'#73a38b'}/>}</div></article>;
}
export function Modal({title,children,onClose,wide=false}) {
  const ref=useRef(null);
  useEffect(()=>{
    const previous=document.activeElement;ref.current?.querySelector('button,input,select')?.focus();
    const handler=e=>{
      if(e.key==='Escape')onClose();
      if(e.key==='Tab'){
        const targets=[...ref.current.querySelectorAll('button:not(:disabled),a[href],input,select,[tabindex="0"]')];
        if(e.shiftKey&&document.activeElement===targets[0]){e.preventDefault();targets.at(-1)?.focus()}
        else if(!e.shiftKey&&document.activeElement===targets.at(-1)){e.preventDefault();targets[0]?.focus()}
      }
    };
    document.addEventListener('keydown',handler);const overflow=document.body.style.overflow;document.body.style.overflow='hidden';
    return()=>{document.removeEventListener('keydown',handler);document.body.style.overflow=overflow;previous?.focus()};
  },[onClose]);
  return <div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)onClose()}}><section ref={ref} role="dialog" aria-modal="true" aria-label={title} className={`modal ${wide?'modal-wide':''}`}><header><h2>{title}</h2><button className="icon-button" onClick={onClose} aria-label="Close dialog"><X size={20}/></button></header><div className="modal-content">{children}</div></section></div>;
}
export function Playback({row,total,index,setIndex,playing,setPlaying,speed,setSpeed,optimized}) {
  return <div className="playback"><div className="playback-top"><div className="play-buttons"><button className="play-button" onClick={()=>setPlaying(!playing)} aria-label={playing?'Pause simulation':'Play simulation'}>{playing?<Pause size={17}/>:<Play size={17}/>}</button><button className="icon-button" onClick={()=>{setIndex(0);setPlaying(false)}} aria-label="Restart simulation"><RotateCcw size={16}/></button><button className="icon-button" onClick={()=>{setPlaying(false);setIndex(Math.max(0,index-1))}} aria-label="Previous interval"><ChevronLeft size={16}/></button><button className="icon-button" onClick={()=>{setPlaying(false);setIndex(Math.min(total-1,index+1))}} aria-label="Next interval"><ChevronRight size={16}/></button><div className="simulation-clock">{clock(row.timestamp)}<span>{dateLabel(row.timestamp)} · IST</span></div></div><div className="playback-right"><span className={`pill ${optimized?'green':'neutral'}`}>{optimized?'Optimized dispatch':'Original dispatch'}</span><label className="speed-select"><span>Speed</span><select aria-label="Simulation speed" value={speed} onChange={e=>setSpeed(Number(e.target.value))}><option value={1}>1×</option><option value={2}>2×</option><option value={4}>4×</option><option value={8}>8×</option></select></label></div></div><input className="timeline" aria-label="Simulation timeline" type="range" min="0" max={total-1} value={index} onChange={e=>{setIndex(Number(e.target.value));setPlaying(false)}}/><div className="timeline-labels"><span>00:00</span><span>{total===96?'06:00':`Day ${total===192?'1':'2'} · 00:00`}</span><span>{total===96?'12:00':`Day ${total===192?'2':'3'} · 00:00`}</span><span>{total===96?'18:00':`${total/4}h horizon`}</span><span>{total>96?`Day ${total/96} · `:""}23:45</span></div></div>;
}

export function ScenarioForm({draft,setDraft,onRun,busy,dirty,compact=false}) {
  const field=(key,value)=>setDraft(d=>({...d,[key]:value}));
  const ranges=[['demand_multiplier','Demand level',.5,2,.05,'×'],['irradiance_factor','Solar irradiance',0,1.5,.05,'×'],['wind_factor','Wind speed',0,2,.05,'×'],['temperature_offset','Temperature offset',-10,15,1,'°C'],['grid_capacity','Grid import limit',1,20,.5,'MW'],['solar_capacity','Installed solar',0,25,.5,'MW'],['wind_capacity','Installed wind',0,20,.5,'MW']];
  return <form className={`scenario-form ${compact?'compact':''}`} onSubmit={e=>{e.preventDefault();onRun()}}><fieldset disabled={busy}>
    <div className="form-pair"><label>Forecast horizon<select value={draft.horizon} onChange={e=>field('horizon',Number(e.target.value))}>{[24,48,72].map(h=><option key={h} value={h}>{h} hours</option>)}</select></label><label>Chart interval<select value={draft.resolution} onChange={e=>field('resolution',e.target.value)}><option value="15min">15 minutes</option><option value="hourly">Hourly</option><option value="daily">Daily mean</option></select></label></div>
    <label>Weather source<select value={draft.weather_mode} onChange={e=>field('weather_mode',e.target.value)}><option value="cached">Open-Meteo · offline snapshot</option><option value="live">Open-Meteo · fetch latest</option></select></label>
    <div className="sliders">{ranges.map(([key,label,min,max,step,unit])=><label key={key} className="slider-field"><span>{label}<b>{fmt(draft[key],step<1?2:0)} {unit}</b></span><input aria-label={label} type="range" min={min} max={max} step={step} value={draft[key]} onChange={e=>field(key,Number(e.target.value))}/></label>)}</div>
    <label className="check-field"><input type="checkbox" checked={draft.inject_anomaly} onChange={e=>field('inject_anomaly',e.target.checked)}/><span>Inject industrial surge<small>+4.2 MW · 17:00–18:30 each day</small></span></label>
    <button className="button primary full" type="submit"><SlidersHorizontal size={16}/>{busy?'Calculating scenario…':'Run scenario'}<ArrowUpRight size={16}/></button>{dirty&&<p className="form-note amber-text">Changes are pending. Run the scenario to apply.</p>}
  </fieldset></form>;
}

export function NodeInspector({selected,row,optimized,run,onClose}) {
  const mode=optimized?'after':'before';
  const labels={solar:'Solar park',wind:'Wind farm',utility:'Utility grid',hub:'Central substation',...LOAD_NAMES};
  const source=selected==='solar'||selected==='wind';
  let details=[];
  let chips=[];
  let caption='';

  if(source){
    const available=row[`${selected}_mw`];
    const used=row.renewable_mw?available*row[`renewable_used_${mode}`]/row.renewable_mw:0;
    details=[['Estimated available',`${fmt(available)} MW`],['Dispatched to loads',`${fmt(used)} MW`],['Curtailed',`${fmt(available-used)} MW`],['Installed capacity',`${fmt(run.config[`${selected}_capacity`])} MW`]];
    chips=[`CAP ${fmt(run.config[`${selected}_capacity`])} MW`, 'EST RENEWABLE'];
  }
  else if(selected==='utility'||selected==='hub'){
    details=[['City requested demand',`${fmt(row[`demand_${mode}`])} MW`],['Grid imports',`${fmt(row[`grid_import_${mode}`])} MW`],['Grid capacity',`${fmt(run.config.grid_capacity)} MW`],['Unmet demand',`${fmt(row[`unmet_${mode}`])} MW`]];
    chips=[`CAP ${fmt(run.config.grid_capacity)} MW`, row[`unmet_${mode}`]>.001?'CONSTRAINED':'BALANCED'];
  }
  else {
    const shift = run.optimization?.shifts?.find(s=>s.id===selected);
    const requested = row[`loads_${mode}`]?.[selected] ?? 0;
    const delivered = row[`delivered_${mode}`]?.[selected] ?? 0;
    const servedPct = requested > 1e-6 ? (delivered / requested) * 100 : 100;
    const adjustment = (row.loads_after?.[selected] ?? 0) - (row.loads_before?.[selected] ?? 0);

    details=[
      ['Requested power',`${fmt(requested)} MW`],
      ['Delivered power',`${fmt(delivered)} MW`],
      ['Served ratio',`${fmt(servedPct,1)}%`],
      ['Schedule adjustment',`${Math.abs(adjustment)>.001?(adjustment>0?'+':'')+fmt(adjustment)+' MW':'0.00 MW'}`],
    ];

    if (shift) {
      details.push(
        ['Headroom capacity',`${fmt(shift.capacity_mw)} MW`],
        ['Flexible share',`${Math.round((shift.flexible_share||0)*100)}%`],
        ['Max shift',shift.critical?'0 h':`±${shift.max_shift_hours} h`],
        ['Operating window',shift.operating_window],
        ['Rescheduled energy',`${fmt(shift.shifted_mwh)} MWh`]
      );

      if (shift.critical) {
        chips.push('CRITICAL', 'PROTECTED');
      } else {
        chips.push(`WINDOW ${shift.operating_window}`, `MAX SHIFT ±${shift.max_shift_hours}h`, `FLEX ${Math.round((shift.flexible_share||0)*100)}%`);
        if (selected === 'ev') chips.push('SESSIONS 00-07 / 07-17 / 17-24');
      }

      if (shift.shifted_mwh > 0.001) {
        const cutTime = shift.largest_reduction_at ? clock(shift.largest_reduction_at) : 'n/a';
        const incTime = shift.largest_increase_at ? clock(shift.largest_increase_at) : 'n/a';
        caption = `${shift.name} moved ${fmt(shift.shifted_mwh)} MWh within ±${shift.max_shift_hours} h inside ${shift.operating_window}; largest cut at ${cutTime}, largest increase at ${incTime}.`;
      }
    }

    const alert = run.alerts?.find(a => row.index >= a.start_index && row.index <= a.end_index);
    if (alert && (alert.injected ? selected === 'industrial' : selected === 'residential')) {
      details.push(['Active alert', `${alert.title} (${alert.severity})`]);
      chips.push(`ALERT: ${alert.severity.toUpperCase()}`);
    }
  }

  return <div className="node-inspector">
    <div className="inspector-heading">
      <span><i className="green-dot"/>{labels[selected]}</span>
      <button className="icon-button" aria-label="Close node inspector" onClick={onClose}><X size={14}/></button>
    </div>
    {chips.length>0&&<div className="inspector-chips">{chips.map((c,i)=><span key={i} className={`constraint-chip ${c.includes('CRITICAL')||c.includes('ALERT')?'critical':''}`}>{c}</span>)}</div>}
    {details.map(([label,value])=><div className="definition" key={label}><span>{label}</span><strong>{value}</strong></div>)}
    {caption&&<div className="inspector-caption">{caption}</div>}
  </div>;
}

export function SupplyMix({row,optimized,run}) {
  const mode=optimized?'after':'before';
  const factor=row.renewable_mw?row[`renewable_used_${mode}`]/row.renewable_mw:0;
  const sources=[['Solar',row.solar_mw*factor,'#b6cc83',Sun],['Wind',row.wind_mw*factor,'#719b8c',Wind],['Grid import',row[`grid_import_${mode}`],'#93a6b1',PlugZap]];
  return <div className="supply-mix">{sources.map(([name,value,color,Icon])=><div className="source-row" key={name}><div><span><Icon size={16}/>{name}</span><strong>{fmt(value)}<small> MW</small></strong></div><div className="meter-track"><i style={{width:`${value/Math.max(.01,row[`demand_${mode}`])*100}%`,background:color}}/></div></div>)}<div className="mix-footer"><span>Renewable share</span><strong>{fmt(row[`renewable_used_${mode}`]/row[`demand_${mode}`]*100,1)}%</strong></div><p className="small-note">Delivered power at {clock(row.timestamp)}. Renewable output is weather-estimated; grid supply is simulated.</p></div>;
}
