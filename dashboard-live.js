(function(){
 'use strict';
 const P=['CO','THC','NMHC','NOx','CO2','PM','PN','CH4'];
 const UNIT={CO:'mg/km',THC:'mg/km',NMHC:'mg/km',NOx:'mg/km',CO2:'g/km',PM:'mg/km',PN:'#/km',CH4:'mg/km'};
 const ROW={CO:99,THC:100,NMHC:101,NOx:102,CO2:103,PM:104,PN:105,CH4:106};
 const LIMIT_CELL={CO:'C123',THC:'C124',NMHC:'C125',NOx:'C126',PM:'C134',PN:'C135'};
 const COLORS=['#206c56','#4f82a5','#d28743','#936db0','#c45d70','#329b94','#8c7b31','#60758a'];
 const state={rows:[],ids:new Set(),pollutants:new Set(P),project:'',model:'',ecu:'',cycle:'',phase:'combined',from:'',to:'',loaded:false};
 const charts=[];
 const $=id=>document.getElementById(id);
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const n=v=>v!==''&&v!=null&&Number.isFinite(Number(v))?Number(v):null;
 const fmt=(v,d=2)=>v==null?'Unknown':Number(v).toLocaleString('en-US',{maximumFractionDigits:d});
 const cell=(r,k)=>r.cells?.[k];
 const value=(r,...keys)=>{for(const k of keys){const v=k.startsWith('C')?cell(r,k):r[k];if(v!==undefined&&v!==null&&v!=='')return v}return ''};
 function phaseValue(r,p,phase='combined'){
  const direct=n(r.results?.[p]?.[phase]);if(direct!=null)return direct;
  const col=phase==='p1'?'C':phase==='p2'?'D':'E';return n(cell(r,col+ROW[p]));
 }
 function massIndex(r){return r.co2>0&&r.mass>0?Number((r.co2/r.mass*100).toFixed(4)):n(cell(r,'C111'))}
 function limitValue(r,p){return n(r.limits?.[p]??r['limit'+p]??(LIMIT_CELL[p]?cell(r,LIMIT_CELL[p]):null))}
 function unitOf(r,p){return r.resultUnits?.[p]||UNIT[p]}
 function limitUnit(r,p){return r.limitsUnits?.[p]||UNIT[p]}
 function correction(r){return n(r.correctionFactor??cell(r,'C121'))}
 function corrected(r,p){const raw=phaseValue(r,p,'combined'),f=correction(r);return raw==null||f==null||f<=0?null:raw*f}
 function assessment(r){
  const explicit=String(value(r,'finalResult','compliance','C151')).trim().toLowerCase();
  if(['pass','passed','Pass','Pass'].includes(explicit))return 'Pass';
  if(['fail','failed','Fail','Fail'].includes(explicit))return 'Fail';
  let assessed=0,failed=false;for(const p of P){const raw=corrected(r,p)??phaseValue(r,p,'combined'),lim=limitValue(r,p);if(raw==null||lim==null||unitOf(r,p)!==limitUnit(r,p))continue;assessed++;if(raw>lim)failed=true}
  return failed?'Fail':assessed?'Pass':'Unknown';
 }
 function normalize(r){
  const t1=n(cell(r,'C57')),t2=n(cell(r,'C58'));
  return {...r,id:String(value(r,'id','C5')||'—'),date:String(value(r,'date','C6')),model:String(value(r,'model','C15')),project:String(value(r,'project','testPurpose','C10')||'No project'),ecu:String(value(r,'ecu','calibration','C41')||'Unknown'),cycle:String(value(r,'cycle','C82')||'Unknown'),mileage:n(value(r,'mileage','C19')),temperature:n(r.temperature)??(t1!=null&&t2!=null?(t1+t2)/2:t1??t2),fuel:n(r.fuelConsumption)??n(cell(r,'E109')),co2:phaseValue(r,'CO2','combined')??n(r.co2Weighted),mass:(()=>{const current=n(cell(r,'C110')),legacy=n(cell(r,'C90')),co2=phaseValue(r,'CO2','combined');return legacy>0&&current>0&&co2!=null&&Math.abs(current-co2)<0.01?legacy:current>0?current:legacy>0?legacy:null})(),validity:String(value(r,'validity','C117')||'Not assessed'),speedTrace:Array.isArray(r.speedTrace)?r.speedTrace:[]};
 }
 function filtered(){return state.rows.filter(r=>(!state.project||r.project===state.project)&&(!state.model||r.model===state.model)&&(!state.ecu||r.ecu===state.ecu)&&(!state.cycle||r.cycle===state.cycle)&&(!state.from||r.date>=state.from)&&(!state.to||r.date<=state.to))}
 function selected(){return filtered().filter(r=>state.ids.has(r.id))}
 function optionValues(key){return [...new Set(state.rows.map(r=>r[key]).filter(Boolean))].sort((a,b)=>String(a).localeCompare(String(b),'fa'))}
 function selectHTML(id,label,key){return '<label>'+label+'<select id="'+id+'"><option value="">All</option>'+optionValues(key).map(v=>'<option '+(state[key]===v?'selected':'')+'>'+esc(v)+'</option>').join('')+'</select></label>'}
 function card(no,title,subtitle,id,wide=false){return '<article class="dashboard-card '+(wide?'wide':'')+'"><div class="dashboard-card-head"><div><h3>'+no+' -  '+title+'</h3><p>'+subtitle+'</p></div><button class="dashboard-export" data-export="'+id+'">PNG</button></div><div class="chart-box"><canvas id="'+id+'"></canvas></div></article>'}
 function heatmapHTML(list){
  return '<article class="dashboard-card wide"><div class="dashboard-card-head"><div><h3>4 -  Limit Utilization Heatmap</h3><p>Percentage of the recorded limit; missing limits are shown as “Unknown» ”.</p></div></div><div class="dashboard-heatmap"><table><thead><tr><th>Test ID</th>'+[...state.pollutants].map(p=>'<th>'+p+'</th>').join('')+'</tr></thead><tbody>'+list.map(r=>'<tr><th>'+esc(r.id)+'</th>'+[...state.pollutants].map(p=>{const raw=corrected(r,p)??phaseValue(r,p,state.phase),lim=limitValue(r,p);if(raw==null||lim==null||lim<=0||unitOf(r,p)!==limitUnit(r,p))return '<td class="unknown">Unknown</td>';const u=100*raw/lim,cls=u>100?'over':u>=80?'near':'ok';return '<td class="'+cls+'" title="Value: '+esc(fmt(raw,4))+' '+esc(unitOf(r,p))+' | Limit: '+esc(fmt(lim,4))+' | Margin: '+esc(fmt(lim-raw,4))+'">'+esc(fmt(u,1))+'%</td>'}).join('')+'</tr>').join('')+'</tbody></table></div></article>';
 }
 function unitComparisonHTML(){
  const groups=[...new Set([...state.pollutants].map(p=>UNIT[p]))];
  return '<article class="dashboard-card wide"><div class="dashboard-card-head"><div><h3>1 -  Multi-Test Pollutant Comparison</h3><p>Each unit is charted separately to avoid mixing incompatible scales.</p></div></div><div class="dashboard-unit-grid">'+groups.map((u,i)=>'<div class="dashboard-unit-chart"><strong>'+esc(u)+'</strong><div class="chart-box"><canvas id="unitChart'+i+'"></canvas></div></div>').join('')+'</div></article>';
 }
 function render(){
  clearCharts();const root=$('dashboardPanel');if(!root)return;const list=selected(),visible=filtered(),measured=list.reduce((s,r)=>s+[...state.pollutants].filter(p=>phaseValue(r,p,state.phase)!=null).length,0),fail=list.filter(r=>assessment(r)==='Fail').length,pass=list.filter(r=>assessment(r)==='Pass').length,assessed=pass+fail;
  root.innerHTML='<div class="dashboard-hero"><div><h2>Emission Test Analytics Dashboard</h2><p>All charts are sourced directly from central database records.</p></div><span class="live-badge">Live Central Database</span></div>'+
   '<div class="dashboard-kpis">'+[['Selected Tests',list.length],['Measured Results',measured],['Pass Rate',assessed?fmt(100*pass/assessed,1)+'%':'Unknown'],['Failed Tests',fail],['Unknown Limits',list.reduce((s,r)=>s+[...state.pollutants].filter(p=>limitValue(r,p)==null).length,0)],['CO₂ / Mass Index',list.length===1?(massIndex(list[0])??'Unknown'):(list.filter(r=>massIndex(r)!=null).length+' calculated') ]].map((x,i)=>'<div class="dashboard-kpi '+(i===3&&fail?'alert':'')+'"><span>'+x[0]+'</span><strong>'+x[1]+'</strong></div>').join('')+'</div>'+
   '<details class="dashboard-filters" open><summary>Filters and Data Selection</summary><div class="dashboard-filter-body"><div class="dashboard-filter-grid">'+selectHTML('dfProject','Project','project')+selectHTML('dfModel','Vehicle','model')+selectHTML('dfEcu','Calibration Version','ecu')+selectHTML('dfCycle','Test Cycle','cycle')+'<label>Phase<select id="dfPhase"><option value="combined" '+(state.phase==='combined'?'selected':'')+'>Combined</option><option value="p1" '+(state.phase==='p1'?'selected':'')+'>Phase 1</option><option value="p2" '+(state.phase==='p2'?'selected':'')+'>Phase 2</option></select></label><label>From Solar Date<input id="dfFrom" inputmode="numeric" placeholder="1405/01/01" value="'+esc(state.from)+'"></label><label>To Solar Date<input id="dfTo" inputmode="numeric" placeholder="1405/12/29" value="'+esc(state.to)+'"></label></div><div class="dashboard-choice-row"><div class="dashboard-choice-group"><span>Tests ('+list.length+' of '+visible.length+')</span><div class="dashboard-choices">'+visible.map(r=>'<label class="dashboard-choice"><input type="checkbox" data-test-id="'+esc(r.id)+'" '+(state.ids.has(r.id)?'checked':'')+'>'+esc(r.id)+'</label>').join('')+'</div></div><div class="dashboard-choice-group"><span>Pollutants</span><div class="dashboard-choices">'+P.map(p=>'<label class="dashboard-choice"><input type="checkbox" data-pollutant="'+p+'" '+(state.pollutants.has(p)?'checked':'')+'>'+p+'</label>').join('')+'</div></div></div><div class="dashboard-filter-actions"><button class="btn primary" id="applyDashboardFilters">Apply Filters</button><button class="btn" id="selectVisibleTests">Select All Filtered Tests</button><button class="btn" id="resetDashboardFilters">Reset</button></div></div></details>'+
   (list.length?sectionsHTML(list):'<div class="dashboard-empty">No records match the selected filters.</div>');
  bind();if(list.length)draw(list);
 }
 function sectionsHTML(list){return '<section class="dashboard-section"><h2 class="dashboard-section-title">Compliance and Limits</h2><div class="dashboard-grid">'+unitComparisonHTML()+card(2,'Percentage of Legal Limit','The 100% reference line indicates the recorded limit.','utilization',true)+card(3,'Remaining Margin or Exceedance','Positive values indicate margin; negative values indicate exceedance.','headroom',true)+heatmapHTML(list)+card(5,'Raw vs Corrected Results','Uses the correction factor recorded for each test.','rawCorrected')+card(6,'Test Phase Comparison','Phase 1, Phase 2 and combined results for the selected pollutant.','phaseProfile')+'</div></section>'+
  '<section class="dashboard-section"><h2 class="dashboard-section-title">Engineering Comparison and Trends</h2><div class="dashboard-grid">'+card(7,'ECU Calibration Comparison','Average selected pollutant result by calibration version.','ecuCompare',true)+card(8,'Change from Baseline','Percentage change relative to the first selected test.','baselineDelta',true)+card(9,'Test Repeatability','Coefficient of variation of combined results; lower is better.','repeatability')+card(10,'Time Trend','Tests Sorted by Solar Hijri test date.','timeTrend')+card(11,'Mileage vs Pollutant','Each point represents a test; correlation does not establish causation.','mileageRelation')+card(12,'Temperature vs Pollutant','Mean test-phase temperature versus result.','temperatureRelation')+'</div></section>'+
  '<section class="dashboard-section"><h2 class="dashboard-section-title">Fuel, Carbon and Pollutant Balance</h2><div class="dashboard-grid">'+card(13,'Fuel Consumption','Liters per 100 km for selected tests.','fuelUse')+card(14,'CO₂ Emissions','Grams per kilometer for selected tests.','co2Chart')+card(15,'Fuel Consumption vs CO₂','Each point represents a test with both measurements.','fuelCo2')+card(16,'Pollutant Balance','Average percentage of recorded limits.','pollutantBalance')+card(21,'CO₂ / Mass in Running Order × 100','Calculated from combined CO₂ (g/km) and vehicle mass (kg).','co2MassIndex',true)+'</div></section>'+
  '<section class="dashboard-section"><h2 class="dashboard-section-title">Cycle, Quality and Project Status</h2><div class="dashboard-grid">'+card(17,'Target vs Actual Speed','Based only on recorded raw time-speed data.','speedTrace',true)+card(18,'Cycle Distance Execution','Reference versus actual distance.','distanceExecution')+card(19,'Project Pass/Fail Status','Based on final results or assessable limits.','projectStatus')+card(20,'Data Completeness','Percentage of records with key fields and results.','completeness',true)+'</div></section>';
 }
 function bind(){
  $('applyDashboardFilters').onclick=()=>{state.project=$('dfProject').value;state.model=$('dfModel').value;state.ecu=$('dfEcu').value;state.cycle=$('dfCycle').value;state.phase=$('dfPhase').value;state.from=$('dfFrom').value.trim();state.to=$('dfTo').value.trim();state.ids=new Set([...document.querySelectorAll('[data-test-id]:checked')].map(x=>x.dataset.testId));state.pollutants=new Set([...document.querySelectorAll('[data-pollutant]:checked')].map(x=>x.dataset.pollutant));if(!state.pollutants.size)state.pollutants.add('NOx');render()};
  $('selectVisibleTests').onclick=()=>{state.ids=new Set(filtered().map(r=>r.id));render()};
  $('resetDashboardFilters').onclick=()=>{Object.assign(state,{project:'',model:'',ecu:'',cycle:'',phase:'combined',from:'',to:''});state.ids=new Set(state.rows.map(r=>r.id));state.pollutants=new Set(P);render()};
  document.querySelectorAll('[data-export]').forEach(b=>b.onclick=()=>{const canvas=$(b.dataset.export);if(!canvas)return;const a=document.createElement('a');a.download='BAMCO-'+b.dataset.export+'.png';a.href=canvas.toDataURL('image/png',1);a.click()});
 }
 function clearCharts(){while(charts.length)charts.pop().destroy()}
 function emptyCanvas(id,message='Insufficient data to draw this chart.'){const canvas=$(id);if(canvas)canvas.parentElement.innerHTML='<div class="dashboard-chart-empty">'+esc(message)+'</div>'}
 function referenceLine(y,label){return {id:'ref'+y+Math.random(),afterDraw(chart){const s=chart.scales.y;if(!s||y<s.min||y>s.max)return;const ctx=chart.ctx,py=s.getPixelForValue(y),a=chart.chartArea;ctx.save();ctx.strokeStyle='#c87932';ctx.setLineDash([6,5]);ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(a.left,py);ctx.lineTo(a.right,py);ctx.stroke();ctx.setLineDash([]);ctx.fillStyle='#8b5b2d';ctx.font='12px "Times New Roman"';ctx.fillText(label,a.left+7,py-7);ctx.restore()}}}
 function make(id,type,labels,datasets,unit,extra={}){
  const valid=datasets.some(d=>Array.isArray(d.data)&&d.data.some(v=>v!=null&&(typeof v!=='object'||(v.x!=null&&v.y!=null))));if(!valid)return emptyCanvas(id);
  if(!window.Chart)return emptyCanvas(id,'Chart library failed to load; please refresh.');
  const reference=extra.reference,scales=extra.scales||{x:{grid:{display:false}},y:{beginAtZero:true,title:{display:true,text:unit},grid:{color:'#e7eeea'}}};
  // Canvas text ignores CSS. Explicitly set fonts on every Chart.js text renderer,
  // including custom per-chart scale options and tooltip/legend defaults.
  const chartFont={family:'Times New Roman',size:13};
  for(const axis of Object.values(scales)){if(!axis||typeof axis!=='object')continue;axis.ticks={...(axis.ticks||{}),font:{...chartFont,...(axis.ticks?.font||{}),family:'Times New Roman'}};axis.title={...(axis.title||{}),font:{...chartFont,...(axis.title?.font||{}),family:'Times New Roman'}};}
  if(extra.options?.scales)for(const axis of Object.values(extra.options.scales)){if(!axis||typeof axis!=='object')continue;axis.ticks={...(axis.ticks||{}),font:{...chartFont,...(axis.ticks?.font||{}),family:'Times New Roman'}};axis.title={...(axis.title||{}),font:{...chartFont,...(axis.title?.font||{}),family:'Times New Roman'}};}
  if(window.Chart?.defaults?.font)window.Chart.defaults.font.family='Times New Roman';
  const chart=new Chart($(id),{type,data:{labels,datasets:datasets.map((d,i)=>({borderWidth:2,borderRadius:type==='bar'?5:0,tension:.22,pointRadius:type==='line'?3:4,backgroundColor:d.backgroundColor||COLORS[i%COLORS.length],borderColor:d.borderColor||COLORS[i%COLORS.length],...d}))},options:{font:{family:'Times New Roman',size:13},responsive:true,maintainAspectRatio:false,devicePixelRatio:2,interaction:{mode:type==='scatter'?'nearest':'index',intersect:false},plugins:{legend:{position:'bottom',labels:{usePointStyle:true,boxWidth:8,font:{family:'Times New Roman',size:12}}},tooltip:{titleFont:{family:'Times New Roman'},bodyFont:{family:'Times New Roman'},footerFont:{family:'Times New Roman'},backgroundColor:'#173b38',titleColor:'#fff',bodyColor:'#eff8f4',padding:12,cornerRadius:9,callbacks:{label:c=>{const raw=typeof c.parsed==='object'?(c.parsed.y??c.parsed.r):c.parsed,meta=c.dataset.meta?.[c.dataIndex],lines=[c.dataset.label+': '+fmt(raw,4)+(unit?' '+unit:'')];if(meta){lines.push('Test ID: '+meta.id);if(meta.limit!=null)lines.push('Limit: '+fmt(meta.limit,4)+' '+(meta.unit||unit));else lines.push('Limit: Unknown');if(meta.distance!=null)lines.push('Margin to Limit: '+fmt(meta.distance,4)+' '+(meta.unit||unit));}return lines}}}},scales,...extra.options},plugins:[...(reference!=null?[referenceLine(reference,extra.referenceLabel||'Reference')]:[])]});charts.push(chart);return chart;
 }
 function primary(){return state.pollutants.has('NOx')?'NOx':[...state.pollutants][0]||'NOx'}
 function meta(r,p,raw){const lim=limitValue(r,p);return {id:r.id,limit:lim,distance:lim!=null&&raw!=null?lim-raw:null,unit:unitOf(r,p)}}
 function draw(list){
  clearCharts();const ps=[...state.pollutants],p=primary(),unit=UNIT[p],labels=list.map(r=>r.id),scalar=r=>phaseValue(r,p,state.phase),dateSorted=list.slice().sort((a,b)=>a.date.localeCompare(b.date,'en'));
  const units=[...new Set(ps.map(x=>UNIT[x]))];units.forEach((u,i)=>{const ups=ps.filter(x=>UNIT[x]===u);make('unitChart'+i,'bar',ups,list.map((r,j)=>({label:r.id,data:ups.map(x=>phaseValue(r,x,state.phase)),backgroundColor:COLORS[j%COLORS.length],meta:ups.map(x=>meta(r,x,phaseValue(r,x,state.phase)))})),u)});
  make('utilization','bar',ps,list.map((r,j)=>({label:r.id,data:ps.map(x=>{const v=corrected(r,x)??phaseValue(r,x,state.phase),l=limitValue(r,x);return v!=null&&l>0&&unitOf(r,x)===limitUnit(r,x)?100*v/l:null}),backgroundColor:COLORS[j%COLORS.length],meta:ps.map(x=>meta(r,x,corrected(r,x)??phaseValue(r,x,state.phase)))})),'%',{reference:100,referenceLabel:'100% · Limit'});
  make('headroom','bar',ps,list.map((r,j)=>({label:r.id,data:ps.map(x=>{const v=corrected(r,x)??phaseValue(r,x,state.phase),l=limitValue(r,x);return v!=null&&l>0&&unitOf(r,x)===limitUnit(r,x)?100*(l-v)/l:null}),backgroundColor:COLORS[j%COLORS.length]})),'%',{reference:0,referenceLabel:'Limit'});
  make('rawCorrected','bar',labels,[{label:'Raw',data:list.map(r=>phaseValue(r,p,'combined')),meta:list.map(r=>meta(r,p,phaseValue(r,p,'combined')))},{label:'Corrected',data:list.map(r=>corrected(r,p)),meta:list.map(r=>meta(r,p,corrected(r,p)))}],unit);
  make('phaseProfile','bar',['Phase 1','Phase 2','Combined'],list.map((r,i)=>({label:r.id,data:['p1','p2','combined'].map(f=>phaseValue(r,p,f)),backgroundColor:COLORS[i%COLORS.length],meta:['p1','p2','combined'].map(f=>meta(r,p,phaseValue(r,p,f)))})),unit);
  const ecus=[...new Set(list.map(r=>r.ecu))];make('ecuCompare','bar',ecus,[{label:p,data:ecus.map(k=>avg(list.filter(r=>r.ecu===k).map(scalar))),meta:ecus.map(k=>{const r=list.find(x=>x.ecu===k);return meta(r,p,avg(list.filter(x=>x.ecu===k).map(scalar)))})}],unit);
  const base=list[0],baseValue=scalar(base);make('baselineDelta','bar',labels,[{label:'Change vs '+base.id,data:list.map(r=>baseValue&&scalar(r)!=null?100*(scalar(r)-baseValue)/baseValue:null),backgroundColor:list.map((_,i)=>COLORS[i%COLORS.length])}],'%',{reference:0,referenceLabel:'Baseline Test'});
  make('repeatability','bar',ps,[{label:'Coefficient of Variation',data:ps.map(x=>cv(list.map(r=>phaseValue(r,x,'combined'))))}],'%');
  make('timeTrend','line',dateSorted.map(r=>(r.date||'No Date')+' · '+r.id),[{label:p,data:dateSorted.map(scalar),meta:dateSorted.map(r=>meta(r,p,scalar(r)))}],unit);
  make('mileageRelation','scatter',[],list.map((r,i)=>({label:r.id,data:r.mileage!=null&&scalar(r)!=null?[{x:r.mileage,y:scalar(r)}]:[],backgroundColor:COLORS[i%COLORS.length],meta:[meta(r,p,scalar(r))]})),unit,{scales:{x:{type:'linear',title:{display:true,text:'Mileage (km)'}},y:{title:{display:true,text:p+' · '+unit}}}});
  make('temperatureRelation','scatter',[],list.map((r,i)=>({label:r.id,data:r.temperature!=null&&scalar(r)!=null?[{x:r.temperature,y:scalar(r)}]:[],backgroundColor:COLORS[i%COLORS.length],meta:[meta(r,p,scalar(r))]})),unit,{scales:{x:{type:'linear',title:{display:true,text:'Temperature (°C)'}},y:{title:{display:true,text:p+' · '+unit}}}});
  make('fuelUse','bar',labels,[{label:'Fuel Consumption',data:list.map(r=>r.fuel),backgroundColor:list.map((_,i)=>COLORS[i%COLORS.length])}],'L/100 km');
  make('co2MassIndex','bar',labels,[{label:'CO₂ / Mass × 100',data:list.map(massIndex),backgroundColor:list.map((_,i)=>COLORS[i%COLORS.length])}],'Index');
  make('co2Chart','bar',labels,[{label:'CO₂',data:list.map(r=>r.co2),backgroundColor:list.map((_,i)=>COLORS[i%COLORS.length]),meta:list.map(r=>meta(r,'CO2',r.co2))}],'g/km');
  make('fuelCo2','scatter',[],list.map((r,i)=>({label:r.id,data:r.fuel!=null&&r.co2!=null?[{x:r.fuel,y:r.co2}]:[],backgroundColor:COLORS[i%COLORS.length],meta:[meta(r,'CO2',r.co2)]})),'g/km',{scales:{x:{type:'linear',title:{display:true,text:'Fuel Consumption (L/100 km)'}},y:{title:{display:true,text:'CO₂ (g/km)'}}}});
  make('pollutantBalance','radar',ps,[{label:'Mean Limit Utilization',data:ps.map(x=>avg(list.map(r=>{const v=corrected(r,x)??phaseValue(r,x,'combined'),l=limitValue(r,x);return v!=null&&l>0&&unitOf(r,x)===limitUnit(r,x)?100*v/l:null}))),backgroundColor:'#206c5633',borderColor:'#206c56'}],'%',{options:{scales:{r:{beginAtZero:true,suggestedMax:100,angleLines:{color:'#dce8e1'},grid:{color:'#dce8e1'}}}}});
  const focus=list.find(r=>r.speedTrace.some(x=>n(x.time)!=null&&n(x.target)!=null&&n(x.actual)!=null)),trace=focus?focus.speedTrace.filter(x=>n(x.time)!=null&&n(x.target)!=null&&n(x.actual)!=null):[];make('speedTrace','line',trace.map(x=>n(x.time)),[{label:'Target Speed',data:trace.map(x=>n(x.target)),pointRadius:0},{label:'Actual Speed',data:trace.map(x=>n(x.actual)),pointRadius:0}],'km/h',{scales:{x:{title:{display:true,text:'Time (s)'},grid:{display:false}},y:{beginAtZero:true,title:{display:true,text:'Speed (km/h)'}}}});
  const refDistance=r=>n(r.cycleDistance)??sum([n(cell(r,'C83')),n(cell(r,'C84'))]),actualDistance=r=>n(r.actualDistance);make('distanceExecution','bar',labels,[{label:'Reference Distance',data:list.map(refDistance)},{label:'Actual Distance',data:list.map(actualDistance)}],'km');
  const projects=[...new Set(list.map(r=>r.project))];make('projectStatus','bar',projects,[{label:'Pass',data:projects.map(k=>list.filter(r=>r.project===k&&assessment(r)==='Pass').length),backgroundColor:'#2a8b62'},{label:'Fail',data:projects.map(k=>list.filter(r=>r.project===k&&assessment(r)==='Fail').length),backgroundColor:'#c34d51'},{label:'Not Assessed',data:projects.map(k=>list.filter(r=>r.project===k&&assessment(r)==='Unknown').length),backgroundColor:'#a6b0aa'}],'Test Count');
  const completenessLabels=['Date','Vehicle','Calibration','Cycle',...ps];make('completeness','bar',completenessLabels,[{label:'Completion Percentage',data:completenessLabels.map(k=>100*list.filter(r=>({Date:r.date,Vehicle:r.model,Calibration:r.ecu==='Unknown'?'':r.ecu,Cycle:r.cycle==='Unknown'?'':r.cycle})[k]||P.includes(k)&&phaseValue(r,k,'combined')!=null).length/list.length),backgroundColor:completenessLabels.map((_,i)=>COLORS[i%COLORS.length])}],'%',{reference:100,referenceLabel:'Complete'});
 }
 function avg(values){const a=values.filter(v=>v!=null);return a.length?a.reduce((s,v)=>s+v,0)/a.length:null}
 function cv(values){const a=values.filter(v=>v!=null);if(a.length<2)return null;const m=avg(a);if(!m)return null;return 100*Math.sqrt(a.reduce((s,v)=>s+(v-m)**2,0)/(a.length-1))/Math.abs(m)}
 function sum(values){const a=values.filter(v=>v!=null);return a.length?a.reduce((s,v)=>s+v,0):null}
 let refreshPromise=null;
 async function refresh(){
  const root=$('dashboardPanel');if(!root)return;
  if(!window.BamcoCentral?.ready()){if(!state.loaded)root.innerHTML='<div class="dashboard-loading">Central database connection is unavailable.</div>';return}
  if(refreshPromise)return refreshPromise;
  refreshPromise=(async()=>{
   try{const records=await window.BamcoCentral.all('emission_tests');state.rows=records.map(x=>normalize(x.data||x));{const latestIds=new Set(state.rows.map(r=>r.id));state.ids=new Set([...state.ids].filter(id=>latestIds.has(id)));for(const id of latestIds)state.ids.add(id);state.loaded=true;}if(!$('dashboardPanel').hidden)render()}
   catch(error){if(!state.loaded&& !$('dashboardPanel').hidden)root.innerHTML='<div class="dashboard-loading">Failed to load dashboard data: '+esc(error.message)+'</div>'}
   finally{refreshPromise=null}
  })();return refreshPromise;
 }
 function rootWaiting(){const root=$('dashboardPanel');if(!root||state.loaded)return;root.innerHTML='<div class="dashboard-loading" role="status"><strong>Dashboard is waiting for an authorized database session.</strong><p>To display live test results, sign in to BAMCO Task Management and open Emission Test from its module menu. Keep the Task Management tab open.</p><p>Opening this page directly does not provide a database session.</p><p><a href="https://nazanin-ghaemizadeh.github.io/BAMCO-TASK-MANAGEMENT/" target="_blank" rel="noopener noreferrer">Open BAMCO Task Management</a></p></div>'}
 function activate(name){const dashboard=name==='dashboard';$('dashboardPanel').hidden=!dashboard;$('registerPanel').hidden=dashboard;$('pageNotice').hidden=dashboard;$('createTest').hidden=dashboard;$('dashboardTab').classList.toggle('is-active',dashboard);$('registerTab').classList.toggle('is-active',!dashboard);$('dashboardTab').toggleAttribute('aria-current',dashboard);$('registerTab').toggleAttribute('aria-current',!dashboard);if(dashboard){if(window.BamcoCentral?.ready()){if(state.loaded)render();refresh()}else rootWaiting()}else clearCharts()}
 $('dashboardTab').onclick=()=>activate('dashboard');$('registerTab').onclick=()=>activate('register');
 window.addEventListener('bamco:central-ready',()=>refresh());
 window.addEventListener('bamco:emission-tests-updated',()=>refresh());
 window.addEventListener('bamco:central-locked',event=>{if(!$('dashboardPanel').hidden)$('dashboardPanel').innerHTML='<div class="dashboard-loading">'+esc(event.detail?.message||'Database connection is unavailable.')+'</div>'});
 setInterval(()=>{if(document.visibilityState==='visible'&&window.BamcoCentral?.ready())refresh()},30000);
 if(window.BamcoCentral?.ready())refresh();
}());
