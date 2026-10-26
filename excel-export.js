(function(){'use strict';
const KEY='bamco-emission-sheets-v1',OLD='bamco-emission-engineering-v3';
const schema=window.EMISSION_SCHEMA;
const NAVY='092E38',GREEN='206C56',SAGE='E5F4EC',INK='19363A',LINE='CBDDD7',WHITE='FFFFFF';
function records(){let raw=localStorage.getItem(KEY)||localStorage.getItem(OLD);let a=raw?JSON.parse(raw):DEMO_RECORDS;return Array.isArray(a)?a:a.records||[]}
function value(x){return x==null?'':typeof x==='object'?JSON.stringify(x):x}
function safe(x){return String(x||'Test').replace(/[\\/*?:\[\]]/g,'-').slice(0,31)}
function notify(msg){let el=document.getElementById('pageNotice');if(el)el.textContent=msg;else alert(msg)}
function saveFile(buffer,name){let url=URL.createObjectURL(new Blob([buffer],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}));let a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1200)}
async function exportOne(id){
 if(!window.ExcelJS)throw Error('Excel export library unavailable. Reload the page while online.');
 const r=records().find(x=>x.id===id);if(!r)throw Error('Test not found.');
 const wb=new ExcelJS.Workbook();wb.creator='BAMCO Engineering';wb.title='Emission Test · '+r.id;wb.subject='ECE R83 test data record';
 const ws=wb.addWorksheet(safe(r.id),{views:[{state:'frozen',ySplit:3}],pageSetup:{paperSize:9,orientation:'landscape',fitToPage:true,fitToWidth:1,fitToHeight:0}});
 ws.columns=[{width:7},{width:42},{width:30},{width:25},{width:24},{width:20}];
 ws.mergeCells('A1:F1');let title=ws.getCell('A1');title.value='BAMCO  |  EMISSION TEST ENGINEERING';title.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FF'+NAVY}};title.font={name:'Aptos Display',size:18,bold:true,color:{argb:'FF'+WHITE}};title.alignment={vertical:'middle',indent:1};ws.getRow(1).height=40;
 ws.mergeCells('A2:F2');let sub=ws.getCell('A2');sub.value='TEST RECORD  /  '+r.id+'  /  '+(r.model||'')+'  /  '+(r.date||'');sub.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FF'+SAGE}};sub.font={name:'Aptos',size:12,bold:true,color:{argb:'FF'+GREEN}};sub.alignment={vertical:'middle',indent:1};ws.getRow(2).height=30;
 let row=3;
 function section(name){ws.mergeCells(row,1,row,6);let c=ws.getCell(row,1);c.value=name.toUpperCase();c.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FF'+GREEN}};c.font={name:'Aptos',size:11,bold:true,color:{argb:'FF'+WHITE}};c.alignment={vertical:'middle',indent:1};ws.getRow(row).height=25;row++}
 function line(cells,header=false){let current=ws.getRow(row);current.height=23;for(let i=1;i<=6;i++){let c=current.getCell(i);c.value=value(cells[i-1]);c.font={name:'Aptos',size:10,color:{argb:'FF'+INK},bold:header||i===2};c.alignment={vertical:'middle',wrapText:true};c.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FF'+(header?'D5E9E0':row%2===0?'F5F9F7':WHITE)}};c.border={top:{style:'thin',color:{argb:'FF'+LINE}},bottom:{style:'thin',color:{argb:'FF'+LINE}},left:{style:'thin',color:{argb:'FF'+LINE}},right:{style:'thin',color:{argb:'FF'+LINE}}}}row++}
 for(const [name,fields] of schema.groups){section(name);if(fields.length){line(['','FIELD','RECORDED VALUE','','',''],true);for(const [key,label] of fields)line(['',label,r[key]])}
 if(name==='Raw emission results'){line(['','POLLUTANT','PHASE 1','PHASE 2','COMBINED','UNIT'],true);for(const p of schema.pollutants)line(['',p,r.results?.[p]?.p1,r.results?.[p]?.p2,r.results?.[p]?.combined,r.resultUnits?.[p]||schema.units[p]||'']);for(const [phase,record] of Object.entries(r.phaseData||{}))line(['',phase+' data',record])}
 if(name==='Calculations and limits'){line(['','POLLUTANT','LIMIT','UNIT','',''],true);for(const p of schema.pollutants)line(['',p,r.limits?.[p]??r['limit'+p],r.limitsUnits?.[p]||schema.units[p]||''])}}
 section('Attachments');line(['','FILE NAME','TYPE','DATE','',''],true);for(const f of r.attachments||[])line(['',f.name,f.kind,f.at]);
 section('Record change history');line(['','FIELD','BEFORE','AFTER','DATE','ACTOR'],true);for(const h of r.history||[])line(['',h.key,h.before??h.oldValue,h.after??h.newValue,h.at,h.actor]);
 ws.headerFooter.oddFooter='BAMCO · Product Engineering & Homologation    Page &P of &N';
 const buffer=await wb.xlsx.writeBuffer();saveFile(buffer,'BAMCO_Emission_'+String(r.id).replace(/[^a-zA-Z0-9_-]/g,'_')+'.xlsx');
}
window.BAMCOExcel={exportOne:async id=>{try{await exportOne(id)}catch(e){notify('Excel export: '+e.message)}}};
}());