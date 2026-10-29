import React from 'react';
import { fmt, LOAD_NAMES } from '../api';

const NODES=[
  {id:'solar',name:'Solar park',x:150,y:105,kind:'solar'},
  {id:'wind',name:'Wind farm',x:440,y:80,kind:'wind'},
  {id:'utility',name:'Utility grid',x:735,y:105,kind:'utility'},
  {id:'residential',name:'Residential',x:125,y:295,kind:'houses'},
  {id:'hospital',name:'Hospital',x:765,y:290,kind:'hospital'},
  {id:'industrial',name:'Industry',x:155,y:485,kind:'factory'},
  {id:'commercial',name:'Commercial',x:440,y:485,kind:'towers'},
  {id:'ev',name:'EV charging',x:735,y:485,kind:'ev'},
  {id:'water',name:'Water pumps',x:290,y:350,kind:'water'},
  {id:'hvac',name:'HVAC',x:600,y:350,kind:'hvac'},
];
function Block({x=0,y=0,w=32,h=45,d=13,fill='#e2e8df',roof='#f8faf5'}) {
  return <g transform={`translate(${x},${y})`}><path d={`M0 0 L${w} ${-d} L${w} ${-h-d} L0 ${-h}Z`} fill={fill} stroke="#84978b" strokeWidth=".8"/><path d={`M${w} ${-d} L${w+d} ${-d*2} L${w+d} ${-h-d*2} L${w} ${-h-d}Z`} fill="#aabbb0" stroke="#84978b" strokeWidth=".8"/><path d={`M0 ${-h} L${w} ${-h-d} L${w+d} ${-h-d*2} L${d} ${-h-d}Z`} fill={roof} stroke="#84978b" strokeWidth=".8"/>{[0,1,2].map(i=><path key={i} d={`M6 ${-10-i*11} l17 -7`} stroke="#7d9a89" strokeWidth="3"/>)}</g>;
}
function Art({kind,windSpeed=0}) {
  if(kind==='solar')return <g>{[-36,1].map((x,i)=><g key={x} transform={`translate(${x},${i?-3:9})`}><path d="M-4 1 L3 25 M34 -15 L34 10" stroke="#879e8b" strokeWidth="3"/><path d="M-15 -15 L21 -31 L48 -9 L12 7Z" fill="#598a7d" stroke="#33665a"/><path d="M-2 -21 L25 1 M10 -26 L37 -5 M-6 -7 L31 -23 M3 0 L40 -15" stroke="#b2d1bb" strokeWidth="1.1"/></g>)}</g>;
  if(kind==='wind')return <g>{[-30,22].map((x,i)=><g key={x} transform={`translate(${x},${i?3:15})`}><path d="M-2 0 L0 -63 L3 0Z" fill="#dae4db" stroke="#799081"/><g className="turbine" style={{transformOrigin:'0px -62px',animationDuration:`${Math.max(1.2,12/(windSpeed+1))}s`,animationPlayState:windSpeed>.2?'running':'paused'}}><path d="M0 -62 L-4 -99 Q2 -109 4 -89Z M0 -62 L35 -46 Q40 -39 29 -42Z M0 -62 L-24 -35 Q-34 -32 -25 -45Z" fill="#f8faf5" stroke="#80968a"/></g><circle cy="-62" r="4" fill="#6e9b7d"/></g>)}</g>;
  if(kind==='houses')return <g><Block x={-43} y={9} w={29} h={28}/><path d="M-49 -18 L-28 -49 L1 -32 L-14 -22Z" fill="#648574" stroke="#557461"/><Block x={0} y={19} w={31} h={29}/><path d="M-6 -10 L16 -42 L47 -24 L31 -10Z" fill="#849a78" stroke="#657d66"/></g>;
  if(kind==='factory')return <g><Block x={-44} y={14} w={65} h={29} roof="#c2d1c4"/><Block x={-29} y={-24} w={9} h={37} d={5}/><Block x={-8} y={-32} w={9} h={32} d={5}/><path d="M-44 -15 L-33 -30 L-19 -20 L-7 -37 L8 -25 L21 -40 L21 -28Z" fill="#f0f4ec" stroke="#809485"/></g>;
  if(kind==='towers')return <g><Block x={-39} y={13} w={26} h={72}/><Block x={-2} y={22} w={32} h={53}/><path d="M-32 -25 L-13 -33 M-32 -36 L-13 -44 M-32 -47 L-13 -55" stroke="#699180" strokeWidth="4"/></g>;
  if(kind==='hospital')return <g><Block x={-37} y={16} w={61} h={38} roof="#f3f6ef"/><Block x={-12} y={-26} w={20} h={16} d={9}/><path d="M-20 -15 l0 15 m-7 -4 l14 -6" stroke="#c77259" strokeWidth="5"/></g>;
  if(kind==='ev')return <g><path d="M-38 -6 L-38 20 M39 -26 L39 3" stroke="#8a9f8c" strokeWidth="4"/><path d="M-50 -17 L22 -43 L48 -23 L-24 3Z" fill="#b9d49a" stroke="#759a64"/>{[-21,10].map(x=><g key={x} transform={`translate(${x},5)`}><path d="M-9 14 L-9 -7 L1 -11 L7 -5 L7 9Z" fill="#527d6b"/><path d="M-3 -5 L2 -7 L-1 0 L3 -1 L-3 7 L-1 1 L-5 2Z" fill="#daedaa"/></g>)}</g>;
  if(kind==='water')return <g><path d="M-22 -13 L-22 14 Q0 28 22 14 L22 -13Z" fill="#b3cdd0" stroke="#709597"/><ellipse cy="-13" rx="22" ry="9" fill="#dfebea" stroke="#709597"/><path d="M22 1 L34 -5 L34 11" fill="none" stroke="#759a98" strokeWidth="5"/></g>;
  if(kind==='hvac')return <g><Block x={-30} y={13} w={45} h={25} roof="#e5ece6"/><ellipse cx="-3" cy="-19" rx="14" ry="8" fill="#769183"/><path d="M-13 -19 L6 -19 M-2 -25 L-2 -13" stroke="#d5e4d7" strokeWidth="2.5"/></g>;
  return <g><path d="M-22 22 L0 -68 L23 5 M-13 -8 L17 -19 M-18 8 L20 -3 M-10 -27 L12 -36 M-29 -39 L26 -57 M-32 -21 L31 -43 M-22 -8 L0 -47 L19 -21" fill="none" stroke="#7d9283" strokeWidth="3"/><path d="M-29 -39 L-29 -30 M26 -57 L26 -48 M-32 -21 L-32 -12 M31 -43 L31 -34" stroke="#607b66" strokeWidth="3"/></g>;
}

export default function GridScene({row,optimized,playing,selected,onSelect}) {
  if(!row)return null;
  const mode=optimized?'after':'before';
  const loads=row[`loads_${mode}`],delivered=row[`delivered_${mode}`];
  const unmet=row[`unmet_${mode}`];
  const usedFactor=row.renewable_mw>0?row[`renewable_used_${mode}`]/row.renewable_mw:0;
  const value=id=>id==='solar'?row.solar_mw*usedFactor:id==='wind'?row.wind_mw*usedFactor:id==='utility'?row[`grid_import_${mode}`]:delivered[id];
  return <div className={`grid-scene ${playing?'':'paused'}`}>
    <div className="map-coordinate">PUNE MICROGRID <span>18.5204° N · 73.8567° E</span></div>
    <div className="map-state"><i className={unmet>.001?'amber-dot':'green-dot'}/>{unmet>.001?'Supply constrained':'Grid balanced'}</div>
    <svg viewBox="0 0 900 580" className="city-svg" aria-label="Interactive smart city energy flow diagram">
      <defs><pattern id="map-dots" width="20" height="20" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r=".7" fill="#c4cec2"/></pattern><linearGradient id="hub-roof" x2="1" y2="1"><stop stopColor="#e1efcb"/><stop offset="1" stopColor="#bad28d"/></linearGradient></defs>
      <rect width="900" height="580" fill="url(#map-dots)"/>
      <path d="M45 212 L430 62 L853 215 L462 412Z M50 407 L440 257 L850 407" fill="none" stroke="#e8ede4" strokeWidth="22"/>
      <path d="M45 212 L430 62 L853 215 L462 412Z M50 407 L440 257 L850 407" fill="none" stroke="#fff" strokeWidth="1.5" strokeDasharray="9 8"/>
      {NODES.map(node=>{
        const v=value(node.id); const source=['solar','wind','utility'].includes(node.id);
        const color=source?'#6d9f6c':unmet>.001&&node.id!=='hospital'?'#c79652':'#88a79b';
        const path=source?`M${node.x} ${node.y+18} V${node.y+65} L440 247`:`M440 255 L${node.x} ${node.y-40} V${node.y}`;
        return <g key={node.id}><path d={path} fill="none" stroke="#dbe3d8" strokeWidth="4"/>{v>.005&&<path d={path} className="flow-line" fill="none" stroke={color} strokeWidth={Math.min(5,1.5+v*.45)} strokeDasharray="7 12" style={{animationDuration:`${Math.max(.4,2.5/(v+.6))}s`}}/>}</g>;
      })}
      <g transform="translate(440,260)" role="button" tabIndex="0" aria-label="Inspect central substation" onClick={()=>onSelect('hub')} onKeyDown={e=>{if(e.key==='Enter')onSelect('hub')}} className="map-node">
        <ellipse cy="6" rx="76" ry="35" fill="#d7e7c4" opacity=".5"/>
        <path d="M-64 0 L0 -28 L65 0 L0 30Z" fill="#d5e0c8" stroke="#b9c8ab"/><path d="M-64 0 L0 30 L65 0 L65 9 L0 39 L-64 9Z" fill="#bdcbb2"/>
        <Block x={-38} y={2} w={61} h={35} d={16} fill="#dbe8c8" roof="url(#hub-roof)"/>
        <path d="M-10 -32 L4 -37 L-3 -22 L9 -27 L-11 -4 L-6 -19 L-17 -14Z" fill="#5e8051"/>
        <text y="66" textAnchor="middle" className="hub-title">CENTRAL SUBSTATION</text><text y="84" textAnchor="middle" className="hub-value">{fmt(row[`demand_${mode}`])} MW demand</text>
      </g>
      {NODES.map(node=>{
        const v=value(node.id);const load=loads[node.id];const change=optimized&&load!==undefined?load-row.loads_before[node.id]:0;
        return <g key={node.id} transform={`translate(${node.x},${node.y})`} className={`map-node ${selected===node.id?'selected':''}`} role="button" tabIndex="0" aria-label={`Inspect ${node.name}, ${fmt(v)} megawatts`} onClick={()=>onSelect(node.id)} onKeyDown={e=>{if(e.key==='Enter')onSelect(node.id)}}>
          <ellipse cy="12" rx="64" ry="26" className="node-shadow" fill={selected===node.id?'#dce9c5':'#e4eadf'}/><Art kind={node.kind} windSpeed={row.wind_ms}/>
          <text y="47" textAnchor="middle" className="node-name">{node.name}{node.id==='hospital'?' ⁺':''}</text>
          <text y="64" textAnchor="middle" className="node-power">{fmt(v)} MW{Math.abs(change)>.03?`  ${change>0?'+':''}${fmt(change)}`:''}</text>
          {node.id==='industrial'&&row.anomaly_score<0&&row.injected_extra_mw>0&&<g transform="translate(40,-48)"><circle r="11" fill="#c8704b"/><text textAnchor="middle" y="4" fill="white" fontSize="14" fontWeight="700">!</text></g>}
        </g>;
      })}
    </svg>
    <div className="map-legend"><span><i className="legend-flow"/>Delivered electricity</span><span><i className="legend-node"/>Click a node to inspect</span><span className="map-scale">DIAGRAM · NOT TO SCALE</span></div>
  </div>;
}
