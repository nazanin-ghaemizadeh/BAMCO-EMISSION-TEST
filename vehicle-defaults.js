/* Reference values come only from authorized, saved tests of the selected vehicle. */
(function(){
 'use strict';
 const text=value=>String(value??'').replace(/\\[tnr]/g,' ').trim();
 const key=value=>text(value).normalize('NFKC').replace(/[\s\u200c_-]+/g,' ').toLocaleLowerCase('en-US');
 const present=value=>text(value)!==''&&!/^(?:[-–—]+|n\/?a|null|undefined)$/i.test(text(value));
 // Vehicle specifications and reusable test settings, never identity or measured results.
 const fields=['C14','C16','C18','C21','C24','C25','C26','C27','C28','C29','C30','C31','C33','C35','C36','C37','C50','C65','C66','C67','C82','C85','C89','C92','C93','C94','C95','C110','C123','C124','C125','C126','C134','C135'];
 const numeric=new Set(['C27','C28','C29','C66','C85','C92','C93','C94','C95','C110','C123','C124','C125','C126','C134','C135']);
 const laboratories=[
  {value:'Iran Standard & Quality Inspection Co. (ISQI)',label:'ISQI — Iran Standard & Quality Inspection Co. (ISQI)',aliases:['ISQI Vehicle Emission Test & Research Center']},
  {value:'AIRIC Emission Lab EURO V',label:'SAIPA — AIRIC Emission Lab EURO V',aliases:[]}
 ];
 function laboratory(value){return laboratories.find(lab=>[lab.value,...lab.aliases].some(alias=>key(alias)===key(value)))?.value||text(value);}
 const model=row=>text(row.cells?.C15||row.model);
 function unique(values){const found=new Map();for(const value of values){const label=text(value);if(present(label)&&!found.has(key(label)))found.set(key(label),label)}return [...found.values()].sort((a,b)=>a.localeCompare(b));}
 function clean(field,value){
  if(!present(value))return '';
  if(!numeric.has(field))return text(value);
  const parsed=Number(text(value).replace(/,/g,''));
  return Number.isFinite(parsed)?parsed:'';
 }
 function mass(row){
  const current=clean('C110',row.cells?.C110),legacy=clean('C110',row.cells?.C90),co2=clean('C110',row.results?.CO2?.combined??row.cells?.E103);
  if(legacy>0&&(current<=0||(co2!==''&&Math.abs(current-co2)<.01)))return legacy;
  return current>0?current:'';
 }
 function dateRank(row){
  const value=text(row.cells?.C6||row.date).replace(/[۰-۹]/g,c=>'۰۱۲۳۴۵۶۷۸۹'.indexOf(c)).replace(/[٠-٩]/g,c=>'٠١٢٣٤٥٦٧٨٩'.indexOf(c));
  const match=value.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  return match?Number(match[1]+match[2].padStart(2,'0')+match[3].padStart(2,'0')):0;
 }
 function build(records){
  const rows=records.filter(row=>!row.demo).slice().sort((a,b)=>dateRank(b)-dateRank(a)||text(b.updatedAt||b.updated_at).localeCompare(text(a.updatedAt||a.updated_at))),models=unique(rows.map(model));
  return {models,laboratories:laboratories.map(({value,label})=>({value,label})),defaults(selected){
   const matches=rows.filter(row=>key(model(row))===key(selected)),cells={},sources={};
   for(const field of fields){
    for(const row of matches){
     const value=field==='C110'?mass(row):clean(field,row.cells?.[field]);
     if(value==='')continue;
     cells[field]=value;sources[field]={id:row.cells?.C5||row.id,date:row.cells?.C6||row.date||''};break;
    }
   }
   return {model:models.find(value=>key(value)===key(selected))||text(selected),cells,sources};
  }};
 }
 window.EmissionVehicleDefaults=Object.freeze({build,laboratory});
})();
