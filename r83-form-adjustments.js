(function(){
'use strict';
const schema=window.EMISSION_SCHEMA;if(!schema)return;
for(const [section,fields] of schema.groups){
 for(const f of fields){const k=f[0];
 if(k==='cells.C49'||k==='cells.C61'||k==='cells.C62'||k==='cells.C74'||k==='cells.C75'){f[1]=f[1].replace(/\\s*\\(kPa\\)/g,'').replace(/\\s*\\(mbar\\)/g,'')+' (mbar)';}
 if(k==='cells.C90')f[1]='Mass in running order (kg)';
 if(k==='cells.C110')f[1]='Weighted CO2 (g/km)';
 if(k==='cells.C111'){f[1]='CO2 / Mass in running order x 100';f[2]='computed';}
 }
 for(let i=fields.length-1;i>=0;i--){if(['cells.C121','cells.C143','cells.C149'].includes(fields[i][0]))fields.splice(i,1);}
 if(section==='CYCLE EXECUTION QUALITY'){
  for(const k of ['114','115','116']){const i=fields.findIndex(f=>f[0]==='cells.C'+k);if(i>=0){fields[i][1]+=' - Phase I';fields.splice(i+1,0,['cells.D'+k,fields[i][1].replace('Phase I','Phase II'),'text']);}}
 }
}
})();
