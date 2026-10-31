/* Central BAMCO session: access tokens remain in memory and are never put in URLs. */
(()=>{'use strict';
 const URL='https://zhhongjhhbvpmoquvkhl.supabase.co',KEY='sb_publishable_OtVZC49dnnQarqPv3XLgDw_EUKC7FtD',ORIGIN='https://nazanin-ghaemizadeh.github.io';
 const module=document.currentScript.dataset.module,feature=module==='spc'?'statisticalProcessControl':'emissionTests';
 let token='',user=null,ready=false,generation=0,checking=false;
 const emit=(type,detail)=>window.dispatchEvent(new CustomEvent(type,{detail}));
 function lock(message){generation++;token='';user=null;ready=false;emit('bamco:central-locked',{message});}
 async function request(path,{method='GET',body,prefer,storage=false,blob=false}={}){
  if(!token||!user)throw Error('Open this module from Task Management after signing in.');
  const before=generation,headers={apikey:KEY,Authorization:'Bearer '+token};
  if(body!==undefined)headers['Content-Type']=body instanceof Blob?(body.type||'application/octet-stream'):'application/json';
  if(prefer)headers.Prefer=prefer;
  const response=await fetch(URL+(storage?'/storage/v1/':'/rest/v1/')+path,{method,headers,body:body===undefined?undefined:body instanceof Blob?body:JSON.stringify(body),cache:'no-store'});
  if(before!==generation)throw Error('Your signed-in account changed. Reopen this module.');
  if(!response.ok){let message=await response.text();if(response.status===401)lock('Your session expired. Reopen this module from Task Management.');throw Error(message||'The database did not confirm this operation.');}
  if(blob)return response.blob();const text=await response.text();return text?JSON.parse(text):null;
 }
 async function all(table,select='*') {let rows=[];for(let offset=0;;offset+=500){const page=await request(table+'?select='+select+'&order=created_at.asc&limit=500&offset='+offset);rows.push(...page);if(page.length<500)return rows;}}
 async function receive(event){
  if(event.origin!==ORIGIN||event.source!==window.opener||!event.data||typeof event.data.type!=='string'||!event.data.type.startsWith('bamco.'+module+'.'))return;
  if(event.data.type==='bamco.'+module+'.revoked'){lock('Session unavailable or access removed. Reopen from Task Management.');return;}
  if(event.data.type!=='bamco.'+module+'.session'||typeof event.data.accessToken!=='string'||typeof event.data.userId!=='string'||checking)return;
  if(ready&&user?.id===event.data.userId){token=event.data.accessToken;return;}
  checking=true;const attempt=++generation;token=event.data.accessToken;user={id:event.data.userId};ready=false;
  try{
   const r=await fetch(URL+'/auth/v1/user',{headers:{apikey:KEY,Authorization:'Bearer '+token}});if(!r.ok)throw Error('Session could not be verified.');const identity=await r.json();if(identity.id!==user.id)throw Error('Session identity mismatch.');
   const allowed=await request('rpc/can_access_feature',{method:'POST',body:{p_feature_key:feature,p_action:'view'}});if(!allowed)throw Error('Your account does not have access to this module.');
   if(attempt!==generation)return;user=identity;ready=true;emit('bamco:central-ready',{user:identity});
  }catch(error){if(attempt===generation)lock(error.message);}finally{checking=false;}
 }
 function ask(){try{if(window.opener&&!window.opener.closed)window.opener.postMessage({type:'bamco.'+module+'.request-session'},ORIGIN);else if(ready)lock('Task Management was closed. Reopen this module from Task Management.');}catch{lock('Reopen this module from Task Management.');}}
 window.BamcoCentral=Object.freeze({request,all,user:()=>user,ready:()=>ready,ask});window.addEventListener('message',receive);setInterval(ask,30000);window.addEventListener('focus',ask);ask();
})();
