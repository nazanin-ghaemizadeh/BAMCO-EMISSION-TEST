'use strict';
/* Publishable key only. All access is checked by database and storage RLS. */
const EMISSION_URL='https://zhhongjhhbvpmoquvkhl.supabase.co';
const EMISSION_PUBLIC_KEY='sb_publishable_OtVZC49dnnQarqPv3XLgDw_EUKC7FtD';
const cloudClient=window.supabase?.createClient(EMISSION_URL,EMISSION_PUBLIC_KEY,{auth:{storageKey:'bamco-emission-auth-v1'}});
let cloudBusy=false,cloudUser=null;
function cloudStatus(message){$('cloudStatus').textContent=message}
function cloudError(error){return new Error(error?.message||String(error))}
function centralPayload(r){let copy=structuredClone(r);delete copy.history;return copy}
function localSnapshot(){try{return JSON.parse(localStorage.getItem(LOCAL_CACHE)||'null')?.map(normalizeRecord)||DEMO_RECORDS.map(x=>normalizeRecord(structuredClone(x)))}catch{return DEMO_RECORDS.map(x=>normalizeRecord(structuredClone(x)))}}
const cloudAPI={
 user:null,
 async refresh(){
  if(!cloudClient||!cloudUser)throw Error('Sign in first.');
  if(dataMode==='cloud'&&dirtyIds.size)throw Error('Save or export pending central drafts before refreshing.');let data=[],offset=0;for(;;){let result=await cloudClient.from('emission_tests').select('*').order('created_at',{ascending:true}).range(offset,offset+499);if(result.error)throw cloudError(result.error);data.push(...result.data);if(result.data.length<500)break;offset+=500;}
  cloudRecords=data.map(x=>normalizeRecord(x.data));cloudRevisions=Object.fromEntries(data.map(x=>[x.id,x.revision]));
  if(dataMode==='cloud'){
   if(dirtyIds.size)throw Error('Save or export pending central drafts before refreshing.');
   rows=cloudRecords.map(x=>structuredClone(x));if(!rows.length)newRecord();if(!rows.some(x=>x.id===current))current=rows[0].id;show();
  }
  cloudStatus('Signed in · '+cloudUser.email+' · '+data.length+' central tests');
 },
 async saveRecord(r){
  if(!cloudClient||!cloudUser)throw Error('Sign in first.');
  if(cloudBusy)return notify('A central save is already in progress.');
  cloudBusy=true;cloudStatus('Saving central record…');
  try{
   const copy=centralPayload(r),revision=cloudRevisions[r.id];let query=revision?cloudClient.from('emission_tests').update({data:copy,updated_by:cloudUser.id}).eq('id',r.id).eq('revision',revision):cloudClient.from('emission_tests').insert({id:r.id,data:copy,created_by:cloudUser.id,updated_by:cloudUser.id});
   let {data,error}=await query.select('id,revision').maybeSingle();if(error)throw cloudError(error);
   if(!data)throw Error('This test changed on another device or you lack edit access. Your draft is preserved. Export it before reloading central records.');
   cloudRevisions[r.id]=data.revision;const changedDuringSave=JSON.stringify(copy)!==JSON.stringify(centralPayload(r));if(!changedDuringSave)dirtyIds.delete(r.id);let index=cloudRecords.findIndex(x=>x.id===r.id);if(index<0)cloudRecords.push(structuredClone(r));else cloudRecords[index]=structuredClone(r);persistRecords();updateSaveStatus();cloudStatus('Central save confirmed · revision '+data.revision);notify(changedDuringSave?'Central snapshot saved; newer edits are still a device draft.':'Test saved in the central database');
  }catch(e){cloudStatus('Central save failed · draft kept on this device');notify(e.message);throw e}finally{cloudBusy=false}
 },
 async history(id){let {data,error}=await cloudClient.from('emission_test_history').select('*').eq('test_id',id).order('occurred_at',{ascending:false}).limit(200);if(error)throw cloudError(error);return data},
 async upload(testId,id,file){let safe=file.name.replace(/[^a-zA-Z0-9._-]/g,'_'),path=testId+'/'+id+'-'+safe;let {error}=await cloudClient.storage.from('emission-attachments').upload(path,file,{upsert:false,contentType:file.type||'application/octet-stream'});if(error)throw cloudError(error);return path},
 async download(path){let {data,error}=await cloudClient.storage.from('emission-attachments').download(path);if(error)throw cloudError(error);return data},
 async deleteRecord(r){
  if(!cloudUser)throw Error('Sign in first.');if(!cloudRevisions[r.id]){rows=rows.filter(x=>x.id!==r.id);dirtyIds.delete(r.id);persistRecords();show();return}
  if(!confirm('Delete central test '+r.id+'? Its server audit trail is retained.'))return;
  let {data,error}=await cloudClient.from('emission_tests').delete().eq('id',r.id).eq('revision',cloudRevisions[r.id]).select('id');if(error)throw cloudError(error);if(!data.length)throw Error('Delete blocked: access denied or this test changed elsewhere. Refresh after exporting your draft.');
  rows=rows.filter(x=>x.id!==r.id);delete cloudRevisions[r.id];dirtyIds.delete(r.id);persistRecords();show();notify('Central record deleted; audit retained');
 }
};
window.emissionCloud=cloudAPI;
async function runCloud(action){try{await action()}catch(e){notify(e.message)}}
async function useCentral(){if(dataMode==='local')persistRecords();if(!cloudUser)throw Error('Sign in to use central records.');if(dataMode==='cloud'&&dirtyIds.size)throw Error('Save pending central drafts before reloading.');await cloudAPI.refresh();dataMode='cloud';dirtyIds.clear();viewFilter='all';rows=cloudRecords.map(x=>structuredClone(x));if(!rows.length)newRecord();if(!rows.some(x=>x.id===current))current=rows[0].id;$('dataMode').value='cloud';show()}
function useLocal(){dataMode='local';rows=localSnapshot();dirtyIds.clear();current=rows.some(x=>x.id===current)?current:rows[0].id;viewFilter='all';$('dataMode').value='local';show();cloudStatus(cloudUser?'Signed in · viewing device records':'Device records · central sign-in available')}
$('dataMode').onchange=e=>runCloud(async()=>{if(e.target.value==='cloud'){try{await useCentral()}catch(err){$('dataMode').value=dataMode;throw err}}else useLocal()});
$('cloudLogin').onsubmit=async e=>{
 e.preventDefault();if(!cloudClient)return notify('Sign-in library could not load. Check your connection.');$('cloudSignIn').disabled=true;
 try{let {data,error}=await cloudClient.auth.signInWithPassword({email:$('cloudEmail').value.trim(),password:$('cloudPassword').value});$('cloudPassword').value='';if(error)throw cloudError(error);cloudUser=data.user;cloudAPI.user=cloudUser;let {data:allowed,error:accessError}=await cloudClient.rpc('can_access_feature',{p_feature_key:'emissionTests',p_action:'view'});if(accessError)throw cloudError(accessError);if(!allowed)throw Error('This account needs Emission Tests access in BAMCO comprehensive user management.');await useCentral();$('cloudAuth').open=false;}
 catch(err){cloudStatus('Sign-in / access failed');notify(err.message)}finally{$('cloudSignIn').disabled=false}
};
$('cloudSignOut').onclick=()=>runCloud(async()=>{if(dataMode==='cloud'&&dirtyIds.size)throw Error('Save or export pending drafts before signing out.');if(cloudClient)await cloudClient.auth.signOut();cloudUser=null;cloudAPI.user=null;useLocal()});
$('cloudReload').onclick=()=>runCloud(()=>cloudAPI.refresh());
$('publishLocal').onclick=()=>runCloud(async()=>{
 if(dataMode!=='local')throw Error('Choose device records and select the test to copy.');if(!cloudUser)throw Error('Sign in first, then return to device records to copy a test.');
 const r=structuredClone(selected()),localAttachments=r.attachments.slice();if(!confirm('Copy '+r.id+' to the central database? Existing central tests will never be overwritten.'))return;
 let {data,error}=await cloudClient.from('emission_tests').select('id').eq('id',r.id).maybeSingle();if(error)throw cloudError(error);if(data)throw Error('This ID already exists centrally. Open the central test to edit it.');
 r.attachments=localAttachments.filter(a=>a.path);let {data:inserted,error:insertError}=await cloudClient.from('emission_tests').insert({id:r.id,data:centralPayload(r),created_by:cloudUser.id,updated_by:cloudUser.id}).select('revision').single();if(insertError)throw cloudError(insertError);
 cloudRevisions[r.id]=inserted.revision;let missing=[];
 for(const a of localAttachments.filter(a=>!a.path)){let file=await localFile(a.id);if(!file){missing.push(a.name);continue}try{a.path=await cloudAPI.upload(r.id,a.id,file);r.attachments.push(a)}catch(e){missing.push(a.name)}}
 if(r.attachments.length){let {error:e}=await cloudClient.from('emission_tests').update({data:centralPayload(r),updated_by:cloudUser.id}).eq('id',r.id).eq('revision',inserted.revision);if(e)throw cloudError(e);}
 cloudStatus('Copied '+r.id+' to central records');notify(missing.length?'Test copied. These files need reattachment: '+missing.join(', '):'Test and available attachments copied centrally');
});
$('recoverDraft').onclick=()=>runCloud(async()=>{
 if(!cloudUser)throw Error('Sign in first.');let raw=localStorage.getItem('bamco-emission-cloud-draft-'+cloudUser.id);if(!raw)throw Error('No saved central drafts on this device.');let data=JSON.parse(raw);downloadBlob(new Blob([JSON.stringify({version:2,records:data},null,2)],{type:'application/json'}),'BAMCO-Central-Device-Drafts.json');notify('Draft backup exported; import into device records to review it.');
});
if(cloudClient)cloudClient.auth.getSession().then(async({data})=>{if(data.session){cloudUser=data.session.user;cloudAPI.user=cloudUser;cloudStatus('Signed in · '+cloudUser.email+' · choose Central records to load');}else cloudStatus('Device records · central sign-in available')}).catch(e=>cloudStatus('Central connection unavailable'));
setInterval(()=>{if(dataMode==='cloud'&&cloudUser&&!dirtyIds.size&&!cloudBusy&&document.visibilityState==='visible'&&tab!=='entry')runCloud(()=>cloudAPI.refresh())},30000);
