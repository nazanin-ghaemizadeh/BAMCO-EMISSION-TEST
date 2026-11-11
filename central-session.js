/* Central session: tokens stay in memory; ordinary renewal does not close an open form. */
(()=>{
 'use strict';
 const URL='https://zhhongjhhbvpmoquvkhl.supabase.co',KEY='sb_publishable_OtVZC49dnnQarqPv3XLgDw_EUKC7FtD',ORIGIN='https://nazanin-ghaemizadeh.github.io';
 const module=document.currentScript.dataset.module,feature=module==='spc'?'statisticalProcessControl':'emissionTests';
 let token='',user=null,ready=false,generation=0,checking=false,queuedSession=null,renewal=null,lastActivity=0;
 const emit=(type,detail)=>window.dispatchEvent(new CustomEvent(type,{detail}));
 function completeRenewal(error){const pending=renewal;if(!pending)return;renewal=null;clearTimeout(pending.timer);error?pending.reject(error):pending.resolve();}
 function lock(message){generation++;token='';user=null;ready=false;queuedSession=null;completeRenewal(Error(message));emit('bamco:central-locked',{message});}
 function ask(force=false){
  try{
   if(window.opener&&!window.opener.closed){window.opener.postMessage({type:'bamco.'+module+'.request-session',refresh:force},ORIGIN);return true;}
  }catch{}
  return false;
 }
 function reconnect(message='Reconnecting to Task Management. Your open form is kept here.'){
  ready=false;emit('bamco:central-reconnecting',{message});
 }
 function renew(){
  if(renewal)return renewal.promise;
  let resolve,reject;const promise=new Promise((r,j)=>{resolve=r;reject=j});
  renewal={promise,resolve,reject,timer:setTimeout(()=>{reconnect();completeRenewal(Error('Could not renew the session. Keep this form open and sign in to Task Management again.'));},10000)};
  if(!ask(true)){reconnect();completeRenewal(Error('Keep this form open and reopen Task Management to reconnect.'));}
  return promise;
 }
 async function request(path,{method='GET',body,prefer,storage=false,blob=false}={}){
  if(!token||!user)throw Error('Open this module from Task Management after signing in.');
  const before=generation;
  const send=async()=>{
   const sentToken=token,headers={apikey:KEY,Authorization:'Bearer '+sentToken};
   if(body!==undefined)headers['Content-Type']=body instanceof Blob?(body.type||'application/octet-stream'):'application/json';
   if(prefer)headers.Prefer=prefer;
   const response=await fetch(URL+(storage?'/storage/v1/':'/rest/v1/')+path,{method,headers,body:body===undefined?undefined:body instanceof Blob?body:JSON.stringify(body),cache:'no-store'});
   if(before!==generation)throw Error('Your signed-in account changed. Reopen this module.');
   return {response,sentToken};
  };
  let {response,sentToken}=await send();
  if(response.status===401){
   if(token===sentToken)await renew();
   if(before!==generation)throw Error('Your signed-in account changed. Reopen this module.');
   ({response}=await send());
  }
  if(!response.ok){const message=await response.text();if(response.status===401)reconnect();throw Error(message||'The database did not confirm this operation.');}
  const result=blob?await response.blob():await response.text();
  if(before!==generation)throw Error('Your signed-in account changed. Reopen this module.');
  return blob?result:result?JSON.parse(result):null;
 }
 async function all(table,select='*'){let rows=[];for(let offset=0;;offset+=500){const page=await request(table+'?select='+select+'&order=created_at.asc&limit=500&offset='+offset);rows.push(...page);if(page.length<500)return rows;}}
 async function receive(event){
  if(event.origin!==ORIGIN||event.source!==window.opener||!event.data||typeof event.data.type!=='string')return;
  if(event.data.type==='bamco.'+module+'.revoked'){lock('Session ended or access removed. Reopen from Task Management.');return;}
  if(event.data.type==='bamco.'+module+'.reconnecting'){reconnect();return;}
  if(event.data.type!=='bamco.'+module+'.session'||typeof event.data.accessToken!=='string'||!event.data.accessToken||typeof event.data.userId!=='string')return;
  if(user?.id===event.data.userId&&user.verified){
   const recovered=!ready;token=event.data.accessToken;ready=true;completeRenewal();
   if(recovered)emit('bamco:central-ready',{user});return;
  }
  if(checking){if(user&&user.id!==event.data.userId)lock('The signed-in account changed.');queuedSession=event;return;}
  if(user&&user.id!==event.data.userId)lock('The signed-in account changed.');
  checking=true;const attempt=++generation,receivedToken=event.data.accessToken,receivedId=event.data.userId;
  token=receivedToken;user={id:receivedId};ready=false;
  try{
   const response=await fetch(URL+'/auth/v1/user',{headers:{apikey:KEY,Authorization:'Bearer '+receivedToken}});
   if(!response.ok)throw Error('Session could not be verified.');
   const identity=await response.json();if(identity.id!==receivedId)throw Error('Session identity mismatch.');
   const permission=await fetch(URL+'/rest/v1/rpc/can_access_feature',{method:'POST',headers:{apikey:KEY,Authorization:'Bearer '+receivedToken,'Content-Type':'application/json'},body:JSON.stringify({p_feature_key:feature,p_action:'view'}),cache:'no-store'});
   if(!permission.ok)throw Error('Access could not be verified.');
   if(!await permission.json())throw Error('Your account does not have access to this module.');
   if(attempt!==generation)return;
   user={...identity,verified:true};ready=true;completeRenewal();emit('bamco:central-ready',{user});
  }catch(error){if(attempt===generation){token='';user=null;reconnect(error.message);completeRenewal(error);}}
  finally{checking=false;const next=queuedSession;queuedSession=null;if(next)void receive(next);}
 }
 function activity(event){
  if(!event.isTrusted||!ready||!user||Date.now()-lastActivity<10000)return;
  lastActivity=Date.now();
  try{if(window.opener&&!window.opener.closed)window.opener.postMessage({type:'bamco.'+module+'.activity',userId:user.id},ORIGIN);}catch{}
 }
 window.BamcoCentral=Object.freeze({request,all,user:()=>user,ready:()=>ready,ask});
 window.addEventListener('message',receive);
 for(const event of ['pointerdown','keydown','wheel','touchstart'])document.addEventListener(event,activity,{passive:true});
 setInterval(()=>ask(),30000);setInterval(()=>{if(!ready)ask();},5000);
 window.addEventListener('focus',()=>ask());window.addEventListener('online',()=>ask());
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)ask();});ask();
})();
