(function(){'use strict';
const $=id=>document.getElementById(id);
function text(value){if(value==null)return '';if(value instanceof Date)return value.toISOString().slice(0,10);if(typeof value==='object'){if('result'in value)return text(value.result);if(value.richText)return value.richText.map(x=>x.text).join('');if('text'in value)return value.text;throw Error('Unsupported Excel cell value.');}return value;}
const norm=s=>String(s).toLowerCase().replace(/\(\s*(?:kpa|mbar)\s*\)/g,'').replace(/[^a-z0-9\u00b3]/g,'');
function parseWorksheet(ws){
 const schema=window.EMISSION_SCHEMA,bySection=new Map(schema.groups.map(([name,fields])=>[norm(name),new Map(fields.map(([key,label])=>[norm(label),key]))]));
 const record={cells:{},results:{},attachments:[],history:[],testStatus:'Draft'};
 let fields=null,mapped=0;
 ws.eachRow(row=>{
  const heading=norm(text(row.getCell(1).value));if(bySection.has(heading)){fields=bySection.get(heading);return;}
  if(!fields)return;const label=norm(text(row.getCell(2).value));if(!label||label==='field'||label==='filename')return;
  const key=fields.get(label);const value=text(row.getCell(3).value);
  if(!key){if(value!==''&&value!=null)throw Error('Unrecognized field: '+text(row.getCell(2).value));return;}
  let v=value;if(key==='cells.C6'&&typeof v==='number')v=new Date(Math.round((v-25569)*86400000)).toISOString().slice(0,10);
  record.cells[key.slice(6)]=v;mapped++;
 });
 if(mapped<10)throw Error('This file does not match the BAMCO emission template.');
 record.id=String(record.cells.C5||'').trim();record.date=record.cells.C6;record.model=record.cells.C15||'';
 if(!record.id)throw Error('Fill in Unique test ID in the template.');if(!record.date)throw Error('Fill in Date in the template.');
 return record;
}
async function importFile(file){
 if(!/\.xlsx$/i.test(file.name))throw Error('Select an .xlsx file.');if(file.size>10*1024*1024)throw Error('The workbook must be no larger than 10 MB.');
 if(!window.ExcelJS)throw Error('Excel library unavailable. Reload the page while online.');
 const wb=new ExcelJS.Workbook();await wb.xlsx.load(await file.arrayBuffer());if(wb.worksheets.length!==1)throw Error('Use a template containing one test worksheet.');
 const record=parseWorksheet(wb.worksheets[0]);return window.EmissionImportRecord(record);
}
$('importTest').onclick=()=>$('importTestFile').click();
$('importTestFile').onchange=async event=>{const file=event.target.files[0];if(!file)return;$('importTest').disabled=true;$('pageNotice').textContent='Importing test…';try{const id=await importFile(file);$('pageNotice').textContent=id+' imported into the central database.';}catch(e){$('pageNotice').textContent='Import failed: '+e.message;}finally{$('importTest').disabled=false;event.target.value='';}};
$('downloadTemplate').onclick=async()=>{try{const response=await fetch('template-data.json?v=20261102');if(!response.ok)throw Error('Template download unavailable.');const encoded=await response.json(),bytes=Uint8Array.from(atob(encoded),c=>c.charCodeAt(0));const url=URL.createObjectURL(new Blob([bytes],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'})),a=document.createElement('a');a.href=url;a.download='BAMCO_Emission_Template.xlsx';a.click();setTimeout(()=>URL.revokeObjectURL(url),1200);}catch(e){$('pageNotice').textContent=e.message;}};
window.BAMCOExcelImport={parseWorksheet};
}());
