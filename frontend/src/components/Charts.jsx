import React, { useState } from 'react';
import { ResponsiveContainer, ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, Brush } from 'recharts';
import { clock, dateLabel, fmt } from '../api';

export function Sparkline({ values, color = '#258064' }) {
  const lo=Math.min(...values), hi=Math.max(...values), span=Math.max(.01,hi-lo);
  const points=values.map((v,i)=>`${i/Math.max(1,values.length-1)*100},${30-(v-lo)/span*25}`).join(' ');
  return <svg className="sparkline" viewBox="0 0 100 36" aria-hidden="true"><polyline points={points} fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>;
}

function ChartTip({ active,payload,label,unit }) {
  if (!active || !payload?.length) return null;
  return <div className="chart-tooltip"><strong>{dateLabel(label)} · {clock(label)} IST</strong>{payload.map(p=><div key={p.dataKey}><span><i style={{background:p.color}}/>{p.name}</span><b>{fmt(p.value)} {unit}</b></div>)}</div>;
}

export function EnergyChart({data,lines,unit='MW',height=265,onSelect,brush=false,threshold,current}) {
  const [hidden,setHidden]=useState([]);
  const daily=data?.length<=3;
  return <div className="energy-chart"><div className="chart-key">{lines.map(l=><button key={l.key} className={hidden.includes(l.key)?'muted':''} onClick={()=>setHidden(h=>h.includes(l.key)?h.filter(k=>k!==l.key):[...h,l.key])}><i style={{background:l.color}}/>{l.name}</button>)}<span className="axis-unit">{unit} · {daily?'daily average':'interval average'}</span></div>
    <div style={{height,width:'100%',minWidth:0}}><ResponsiveContainer width="100%" height="100%"><ComposedChart data={data} margin={{top:16,right:16,left:-16,bottom:0}} onClick={e=>{if(e?.activePayload?.[0] && onSelect) onSelect(e.activePayload[0].payload.index ?? e.activeTooltipIndex);}}>
      <defs>{lines.map(l=><linearGradient key={l.key} id={`fill-${l.key}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={l.color} stopOpacity={.19}/><stop offset="100%" stopColor={l.color} stopOpacity={.015}/></linearGradient>)}</defs>
      <CartesianGrid vertical={false} stroke="#e9ece7" strokeDasharray="3 4"/>
      <XAxis dataKey="timestamp" tickFormatter={s=>daily?dateLabel(s):clock(s)} axisLine={false} tickLine={false} minTickGap={45} tick={{fill:'#88928a',fontSize:11}}/>
      <YAxis axisLine={false} tickLine={false} tick={{fill:'#7b887b',fontSize:11}} tickFormatter={v=>Number(v.toFixed(unit==='score'?2:1))}/>
      <Tooltip content={<ChartTip unit={unit}/>} cursor={{stroke:'#a1afa5',strokeDasharray:'3 3'}}/>
      {threshold!==undefined&&<ReferenceLine y={threshold} stroke="#ce6344" strokeDasharray="4 4" label={{value:'Alert threshold',position:'insideTopRight',fontSize:11,fill:'#bd644b'}}/>}
      {current&&<ReferenceLine x={current} stroke="#83958a" strokeDasharray="3 3"/>}
      {lines.filter(l=>!hidden.includes(l.key)).map(l=>l.area?<Area key={l.key} type="monotone" dataKey={l.key} name={l.name} stroke={l.color} strokeWidth={2} fill={`url(#fill-${l.key})`} isAnimationActive={false}/>:<Line key={l.key} type="monotone" dataKey={l.key} name={l.name} stroke={l.color} strokeWidth={l.width||2} strokeDasharray={l.dashed?'5 4':undefined} dot={daily?{r:4}:false} activeDot={{r:4}} isAnimationActive={false}/>)}
      {brush&&data.length>3&&<Brush dataKey="timestamp" height={22} stroke="#b6c7ba" fill="#f6f8f4" tickFormatter={clock} travellerWidth={7}/>}
    </ComposedChart></ResponsiveContainer></div>
  </div>;
}

export const POWER_LINES=[
  {key:'demand_before',name:'Original demand',color:'#3f596b',dashed:true},
  {key:'demand_after',name:'Optimized demand',color:'#24836b',width:2.5},
  {key:'renewable_mw',name:'Renewable estimate',color:'#a4ba6b',area:true},
  {key:'supply_capacity_mw',name:'Renewable + grid capacity',color:'#b9ac8e',dashed:true,width:1.3},
];
