/* Reuse only shared fields from records already authorized and loaded by this page. */
(function(){
 'use strict';
 const text=value=>String(value??'').trim();
 const key=value=>text(value).normalize('NFKC').replace(/[\s\u200c_-]+/g,' ').toLocaleLowerCase('en-US');
 const fields=['C14','C16','C21','C24','C25','C26','C27','C28','C29','C30','C31','C33','C35','C36','C37','C50','C66','C67'];
 const model=row=>text(row.cells?.C15||row.model);
 function unique(values){const found=new Map();for(const value of values){const label=text(value);if(label&&!found.has(key(label)))found.set(key(label),label)}return [...found.values()].sort((a,b)=>a.localeCompare(b));}
 function build(records){
  const rows=records.filter(row=>!row.demo),models=unique(rows.map(model)),laboratories=unique(rows.map(row=>row.cells?.C9||row.lab));
  return {models,laboratories,defaults(selected){
   const matches=rows.filter(row=>key(model(row))===key(selected)),cells={};let conflicts=0;
   for(const field of fields){
    const values=matches.map(row=>row.cells?.[field]).filter(value=>text(value)!=='');
    const distinct=unique(values);
    if(distinct.length===1)cells[field]=values[0];else if(distinct.length>1)conflicts++;
   }
   return {model:models.find(value=>key(value)===key(selected))||text(selected),cells,conflicts};
  }};
 }
 window.EmissionVehicleDefaults=Object.freeze({build});
})();
