(function(){
 'use strict';
 const KEY='bamco-emission-exact-r83-v2',OLD_KEY='bamco-emission-exact-r83-v2',ARCHIVE='bamco-emission-deleted-tests-v1';
 const {groups:GROUPS,pollutants:P,units:UNIT}=window.EMISSION_SCHEMA;
 const $=id=>document.getElementById(id),clone=value=>structuredClone(value);
 const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const number=value=>value!==''&&value!=null&&Number.isFinite(Number(value))?Number(value):null;
 const display=value=>value==null||value===''?'—':typeof value==='number'?value.toLocaleString('en-US',{maximumSignificantDigits:7}):String(value);
 const FACES={
  Pass:'<svg viewBox="0 0 40 40" aria-hidden="true"><circle cx="20" cy="20" r="17" fill="#e5f4ec" stroke="#18804e" stroke-width="2"/><circle cx="14" cy="16" r="1.8" fill="#18804e"/><circle cx="26" cy="16" r="1.8" fill="#18804e"/><path d="M11.5 23 Q20 34 28.5 23" fill="none" stroke="#18804e" stroke-width="2.3" stroke-linecap="round"/></svg>',
  Fail:'<svg viewBox="0 0 40 40" aria-hidden="true"><circle cx="20" cy="20" r="17" fill="#ffe7e7" stroke="#c34648" stroke-width="2"/><path d="M11 15 L16 16 M24 16 L29 15" fill="none" stroke="#c34648" stroke-width="2" stroke-linecap="round"/><circle cx="14" cy="18.5" r="1.5" fill="#c34648"/><circle cx="26" cy="18.5" r="1.5" fill="#c34648"/><path d="M13 29 Q20 21 27 29" fill="none" stroke="#c34648" stroke-width="2" stroke-linecap="round"/><path d="M29 20 Q25 26 29 27.5 Q33 26 29 20" fill="#d2575b"/></svg>'
 };
 let rows=[],draft=null,original=null,cleanDraft=null,mode='open',pendingFiles=[],inputIndex=0,storageError='',saving=false,lastTrigger=null;
 function normalize(r){r.cells??={};r.id=r.cells.C5||r.id;r.date=r.cells.C6||r.date;r.model=r.cells.C15||r.model;r.results??={};r.attachments??=[];r.history??=[];r.phaseData??={};r.limits??={};r.resultUnits??={};r.limitsUnits??={};return r}
 function getSaved(){
  try{const raw=localStorage.getItem(KEY),legacy=raw?null:localStorage.getItem(OLD_KEY);let parsed=raw?JSON.parse(raw):legacy?JSON.parse(legacy):null;
   if(parsed&&!Array.isArray(parsed)&&Array.isArray(parsed.records))parsed=parsed.records;
   if(parsed!==null&&(!Array.isArray(parsed)||parsed.some(r=>!r||typeof r.id!=='string'||!r.id)))throw Error('The saved test register is not valid.');
   const data=parsed??[];if(new Set(data.map(r=>r.id)).size!==data.length)throw Error('Duplicate test IDs were found in the saved register.');
   return data.map(normalize);
  }catch(e){storageError='Saved tests could not be read. The original data has been kept unchanged. '+e.message;return null}
 }
 function persist(data){if(storageError)throw Error(storageError);localStorage.setItem(KEY,JSON.stringify(data))}
 function stable(value){if(value===null||typeof value!=='object')return JSON.stringify(value);if(Array.isArray(value))return '['+value.map(stable).join(',')+']';return '{'+Object.keys(value).sort().map(k=>JSON.stringify(k)+':'+stable(value[k])).join(',')+'}'}
 function getPath(object,path){return path.split('.').reduce((v,k)=>v?.[k],object)}
 function setPath(object,path,value){const parts=path.split('.'),last=parts.pop();let target=object;for(const key of parts){if(!target[key]||typeof target[key]!=='object')target[key]={};target=target[key]}target[last]=value}
 function phaseKeys(r){return Array.from({length:Math.max(1,Math.min(8,Number(r.cyclePhaseCount)||2))},(_,i)=>'p'+(i+1))}
 function phaseLabel(r,p){if(p==='combined')return 'Combined';return r.phaseNames?.[p]||((r.cycle==='WLTC'&&Number(r.cyclePhaseCount)===4)?['Low','Medium','High','Extra high'][Number(p.slice(1))-1]:r.cycle==='NEDC'&&Number(r.cyclePhaseCount)===2?['Urban','Extra urban'][Number(p.slice(1))-1]:'Phase '+p.slice(1))}
 function corrected(r,p){const raw=number(r.results?.[p]?.combined),factor=number(r.correctionFactor);return raw==null||factor==null||factor<=0?null:raw*factor}
 function explicitResult(value){const s=String(value||'').trim().toLowerCase();return ['pass','passed','قبول','قبولی'].includes(s)?'Pass':['fail','failed','رد','مردود'].includes(s)?'Fail':null}
 function result(r){
  const explicit=explicitResult(r.cells?.C151)||explicitResult(r.finalResult)||explicitResult(r.compliance);if(explicit)return explicit;
  if(!r.limitStandard||/not assigned|not assessed/i.test(r.limitStandard))return 'Not assessed';
  const applicable=P.filter(p=>number(r.limits?.[p]??r['limit'+p])!=null&&number(r.limits?.[p]??r['limit'+p])>=0);if(!applicable.length)return 'Not assessed';
  let assessed=0,failed=false;for(const p of applicable){const value=corrected(r,p),limit=number(r.limits?.[p]??r['limit'+p]);if(value==null||(r.resultUnits?.[p]||UNIT[p])!==(r.limitsUnits?.[p]||UNIT[p]))continue;assessed++;if(value>limit)failed=true}
  return failed?'Fail':assessed===applicable.length?'Pass':'Not assessed';
 }
 function statusHTML(r){const s=result(r);return s==='Pass'||s==='Fail'?'<span class="status-face '+s.toLowerCase()+'" role="img" aria-label="'+(s==='Pass'?'Pass · green smiling face':'Fail · red crying face')+'" title="'+esc(s)+'">'+FACES[s]+'<span>'+s+'</span></span>':'<span class="pending-status">Not assessed</span>'}
 function render(){
  $('testRows').innerHTML=rows.length?rows.map(r=>'<tr><td>'+esc(r.id)+'</td><td>'+esc(display(r.date))+'</td><td>'+esc(display(r.model))+'</td><td>'+statusHTML(r)+'</td><td><div class="row-actions"><button class="row-action open" data-action="open" data-id="'+esc(r.id)+'">Open</button><button class="row-action" data-action="edit" data-id="'+esc(r.id)+'">Edit</button><button class="row-action delete" data-action="delete" data-id="'+esc(r.id)+'">Delete</button></div></td></tr>').join(''):'<tr><td colspan="5" class="empty-table">No tests recorded. Select Create Test to add a test.</td></tr>';
  $('createTest').disabled=Boolean(storageError);if(storageError)$('pageNotice').textContent=storageError;
 }
 function today(){const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Tehran',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());return ['year','month','day'].map(type=>parts.find(p=>p.type===type).value).join('-')}
 function uuid(){if(window.crypto?.randomUUID)return window.crypto.randomUUID();const bytes=window.crypto?.getRandomValues?window.crypto.getRandomValues(new Uint8Array(16)):Array.from({length:16},()=>Math.floor(Math.random()*256));return [...bytes].map(x=>x.toString(16).padStart(2,'0')).join('')}
 function createId(){let id;do{id='EM-'+today().slice(0,4)+'-'+uuid().slice(0,8).toUpperCase()}while(rows.some(r=>r.id===id));return id}
 function newTest(){const id=createId();return normalize({id,date:today(),model:'',testStatus:'Draft',cells:{C5:id,C6:today()}})}
 function field(label,path,type='text',options='',section=-1,valueOverride){
  const value=valueOverride!==undefined?valueOverride:getPath(draft,path),editable=mode==='edit'||mode==='create',id='record-field-'+(++inputIndex);
  let cell;
  if(!editable||type==='computed')cell='<span class="field-value" '+(type==='computed'?'data-calculated="'+esc(path)+'"':'')+'>'+esc(display(value))+'</span>';
  else{
   const readOnly=path==='cells.C5'&&mode!=='create';
   const attrs=' id="'+id+'" data-key="'+esc(path)+'" data-section="'+section+'" '+(readOnly?'readonly ':'')+(path==='cells.C5'?'required maxlength="128" ':'')+(path==='cyclePhaseCount'?'min="1" max="8" ':'');
   if(type==='select'){
    const opts=options.split('|').filter(Boolean);if(value!=null&&value!==''&&!opts.includes(String(value)))opts.unshift(String(value));
    cell='<select'+attrs+'><option value="">Select…</option>'+opts.map(v=>'<option value="'+esc(v)+'" '+(v===String(value)?'selected':'')+'>'+esc(v)+'</option>').join('')+'</select>';
   }else if(type==='textarea'||(/notes|remarks|description|changes|cause|action|services|procedure|conditions|composition|purpose|configuration/i.test(label)&&type==='text')){
    cell='<textarea'+attrs+' rows="2">'+esc(value??'')+'</textarea>';
   }else cell='<input'+attrs+' type="'+type+'" '+(type==='number'?'step="any" ':'')+'value="'+esc(value??'')+'">';
  }
  return '<tr><th scope="row">'+(editable&&type!=='computed'?'<label for="'+id+'">'+esc(label)+'</label>':esc(label))+'</th><td>'+cell+'</td></tr>';
 }
 function subheading(label){return '<tr class="subsection-row"><th colspan="2">'+esc(label)+'</th></tr>'}
 function extraRows(section){
  let html='';
  if(false&&section===10){for(const p of P){html+=subheading(p);html+=field(p+' · measurement unit','resultUnits.'+p,'select',[...new Set([draft.resultUnits[p]||UNIT[p],UNIT[p],'g/km','mg/km','#/km','ppm','%','g/test','mg/test'])].join('|'),section,draft.resultUnits[p]||UNIT[p]);for(const phase of [...phaseKeys(draft),'combined'])html+=field(p+' · '+phaseLabel(draft,phase),'results.'+p+'.'+phase,'number','',section);}}
  if(false&&section===11){for(const phase of phaseKeys(draft)){html+=subheading(phaseLabel(draft,phase));for(const [key,label] of [['distance','Distance (km)'],['duration','Duration (s)'],['fuel','Fuel consumption (L/100 km)'],['energy','Energy consumption (kWh/100 km)']])html+=field(label,'phaseData.'+phase+'.'+key,'number','',section);}}
  if(false&&section===14){for(const p of P){html+=subheading(p);html+=field(p+' · raw combined ('+(draft.resultUnits[p]||UNIT[p])+')','raw.'+p,'computed','',section,draft.results[p]?.combined);html+=field(p+' · corrected ('+(draft.resultUnits[p]||UNIT[p])+')','corrected.'+p,'computed','',section,corrected(draft,p));html+=field(p+' · limit','limits.'+p,'number','',section,draft.limits[p]??draft['limit'+p]??'');html+=field(p+' · limit unit','limitsUnits.'+p,'select',[...new Set([draft.limitsUnits[p]||UNIT[p],UNIT[p],'g/km','mg/km','#/km','ppm','%','g/test','mg/test'])].join('|'),section,draft.limitsUnits[p]||UNIT[p]);}}
  if(section===16){
   const files=[...draft.attachments,...pendingFiles.map(x=>({id:x.id,name:x.file.name,size:x.file.size,kind:'Attachment',pending:true}))];
   html+='<tr><th scope="row">Attached files</th><td><div class="attachment-list">'+(files.length?files.map(a=>'<div class="attachment-file"><span>'+esc(a.name)+'<small>'+esc(a.kind||'Attachment')+' · '+esc(display(Math.round(a.size/1024)))+' KB'+(a.pending?' · pending save':'')+'</small></span>'+(!a.pending?'<button type="button" class="row-action" data-download="'+esc(a.id)+'">Download</button>':'')+'</div>').join(''):'—')+'</div></td></tr>';
   if(mode==='edit'||mode==='create')html+='<tr><th scope="row"><label for="recordAttachments">Add attachments</label></th><td><input id="recordAttachments" type="file" multiple><p class="field-hint">Raw data, laboratory report, images, ECU files and other documents. Maximum 50 MB per file.</p></td></tr>';
  }
  return html;
 }
 function renderDialog(){
  inputIndex=0;
  $('dialogMode').textContent=mode==='create'?'CREATE TEST':mode==='delete'?'DELETE TEST':mode==='edit'?'EDIT TEST':'TEST DETAILS';
  $('dialogTitle').textContent=mode==='create'?'New emission test':draft.id;
  $('dialogBody').innerHTML=GROUPS.map(([name,fields],section)=>'<section class="record-section" data-record-section="'+section+'"><h3>'+String(section+1).padStart(2,'0')+' · '+esc(name)+'</h3><table class="field-table"><colgroup><col class="field-label-col"><col class="field-value-col"></colgroup><tbody>'+fields.map(([key,label,type,opts])=>field(label,key,type||'text',opts||'',section)).join('')+'</tbody></table></section>').join('');
  $('saveRecord').hidden=!['edit','create'].includes(mode);$('editRecord').hidden=mode!=='open';$('confirmDelete').hidden=mode!=='delete';$('cancelDialog').textContent=['edit','create'].includes(mode)?'Cancel':'Close';
  $('dialogNotice').className='';
  $('dialogNotice').textContent=mode==='delete'?'Delete this test and remove it from the register?':mode==='create'?'Enter the test details in order, then select Save Test.':mode==='edit'?'Changes are applied when you select Save Test.':'';
 }
 function open(modeName,id,trigger){const selected=id?rows.find(r=>r.id===id):null;if(id&&!selected)return;mode=modeName;original=selected?clone(selected):null;draft=selected?clone(selected):newTest();pendingFiles=[];lastTrigger=trigger||document.activeElement;renderDialog();if(['edit','create'].includes(mode)){collect();cleanDraft=clone(draft)}else cleanDraft=null;$('dialogBody').scrollTop=0;$('testDialog').showModal();document.body.classList.add('dialog-open');}
 function collectOne(el){const key=el.dataset.key;if(!key||el.readOnly)return;const value=el.type==='number'?(el.value===''?(key.startsWith('results.')||key.startsWith('limits.')?null:''):Number(el.value)):el.value;setPath(draft,key,value)}
 function collect(){document.querySelectorAll('#dialogBody [data-key]').forEach(collectOne);if(draft?.cells){draft.id=draft.cells.C5||draft.id;draft.date=draft.cells.C6||'';draft.model=draft.cells.C15||''}}
 function refreshCalculations(){document.querySelectorAll('[data-calculated]').forEach(el=>{const [kind,p]=el.dataset.calculated.split('.');el.textContent=display(kind==='raw'?draft.results?.[p]?.combined:corrected(draft,p));})}
 function dirty(){if(!draft||!['edit','create'].includes(mode))return false;collect();return pendingFiles.length>0||stable(draft)!==stable(cleanDraft)}
 function close(){if(saving)return;if(dirty()){$('discardDialog').showModal();return}finishClose()}
 function finishClose(){$('discardDialog').close();$('testDialog').close();document.body.classList.remove('dialog-open');draft=null;original=null;cleanDraft=null;pendingFiles=[];lastTrigger?.focus?.()}
 function notice(message,error=false){$('dialogNotice').textContent=message;$('dialogNotice').className=error?'error':''}
 function changes(before,after){
  const diff=[];const walk=(a,b,prefix)=>{for(const key of new Set([...Object.keys(a||{}),...Object.keys(b||{})])){if(['history','updatedAt'].includes(key)&&!prefix)continue;const path=prefix?prefix+'.'+key:key,av=a?.[key],bv=b?.[key];if(stable(av)===stable(bv))continue;if(av&&bv&&typeof av==='object'&&typeof bv==='object'&&!Array.isArray(av)&&!Array.isArray(bv))walk(av,bv,path);else diff.push({key:path,before:clone(av??null),after:clone(bv??null)})}};walk(before||{},after||{},'');return diff;
 }
 let fileDatabase;
 function openFiles(){return fileDatabase??=new Promise((resolve,reject)=>{const request=indexedDB.open('bamco-emission-files',1);request.onupgradeneeded=()=>request.result.createObjectStore('files');request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error)})}
 async function putFile(id,file){const db=await openFiles();return new Promise((resolve,reject)=>{const tx=db.transaction('files','readwrite');tx.objectStore('files').put(file,id);tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error||Error('Attachment storage was interrupted.'))})}
 async function getFile(id){const db=await openFiles();return new Promise((resolve,reject)=>{const request=db.transaction('files','readonly').objectStore('files').get(id);request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error)})}
 async function downloadFile(id){
  try{const a=draft.attachments.find(x=>x.id===id);if(!a)throw Error('Attachment not found.');if(a.path)throw Error('This attachment belongs to a central record. Its existing file has been preserved.');const file=await getFile(id);if(!file)throw Error('The original file is not stored on this device.');const url=URL.createObjectURL(file),link=document.createElement('a');link.href=url;link.download=a.name;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}
  catch(e){notice(e.message,true)}
 }
 async function save(event){
  event.preventDefault();if(saving||!draft)return;collect();const id=String(draft.cells?.C5||draft.id||'').trim();if(!id||id.length>128||id.includes('/'))return notice('Enter a unique test ID of up to 128 characters, without a slash.',true);
  
  draft.id=id;draft.cells??={};draft.cells.C5=id;draft.date=draft.cells.C6||'';draft.model=draft.cells.C15||'';let latest=getSaved();if(!latest)return notice(storageError,true);
  const saved=latest.find(r=>r.id===id);
  if(mode==='create'&&saved)return notice('This test ID already exists. Choose a different ID.',true);
  if(mode==='edit'&&(!saved||stable(saved)!==stable(original)))return notice('This test changed in another window. Your edits are kept here; reopen the latest record before saving.',true);
  saving=true;$('saveRecord').disabled=true;
  try{
   const uploaded=[];for(const pending of pendingFiles){await putFile(pending.id,pending.file);uploaded.push({id:pending.id,testId:id,name:pending.file.name,size:pending.file.size,type:pending.file.type,kind:'Attachment',at:new Date().toISOString()})}draft.attachments.push(...uploaded);pendingFiles=[];
   const at=new Date().toISOString();draft.history=[...(original?.history||[]),...changes(original,draft).map(x=>({...x,at,actor:'Local device (unverified)',section:GROUPS.findIndex(([,fields])=>fields.some(([k])=>k===x.key.split('.')[0]))}))];draft.updatedAt=at;
   // Re-read after asynchronous file writes so unrelated edits are preserved.
   latest=getSaved();if(!latest)throw Error(storageError);const current=latest.find(r=>r.id===id);
   if(mode==='create'&&current)throw Error('This test ID was created elsewhere. Choose a different ID.');
   if(mode==='edit'&&(!current||stable(current)!==stable(original)))throw Error('This test changed while saving. Your edits are kept here; reopen the latest record.');
   const next=mode==='create'?[...latest,clone(draft)]:latest.map(r=>r.id===id?clone(draft):r);
   persist(next);rows=next;render();$('pageNotice').textContent=id+' saved.';saving=false;finishClose();
  }catch(e){notice('Could not save: '+e.message,true)}
  finally{saving=false;$('saveRecord').disabled=false}
 }
 function remove(){
  if(!original||saving)return;try{const latest=getSaved();if(!latest)throw Error(storageError);const current=latest.find(r=>r.id===original.id);if(!current||stable(current)!==stable(original))throw Error('This test changed in another window. Reopen it before deleting.');
   const archive=JSON.parse(localStorage.getItem(ARCHIVE)||'[]');archive.push({deletedAt:new Date().toISOString(),record:current});localStorage.setItem(ARCHIVE,JSON.stringify(archive));
   const next=latest.filter(r=>r.id!==original.id);persist(next);rows=next;render();$('pageNotice').textContent=original.id+' deleted.';finishClose();
  }catch(e){notice('Could not delete: '+e.message,true)}
 }
 $('createTest').onclick=()=>open('create',null,$('createTest'));
 $('testRows').onclick=event=>{const action=event.target.closest('[data-action]');if(action){if(action.dataset.action==='excel'){window.BAMCOExcel?.exportOne(action.dataset.id);return}open(action.dataset.action,action.dataset.id,action)}};
 $('closeDialog').onclick=close;$('cancelDialog').onclick=close;
 $('testDialog').addEventListener('cancel',event=>{event.preventDefault();close()});
 $('keepEditing').onclick=()=>$('discardDialog').close();$('discardChanges').onclick=finishClose;
 $('editRecord').onclick=()=>{mode='edit';renderDialog();collect();cleanDraft=clone(draft);$('dialogBody').scrollTop=0};
 $('testForm').onsubmit=save;$('confirmDelete').onclick=remove;
 $('dialogBody').addEventListener('input',event=>{if(event.target.dataset.key){collectOne(event.target);refreshCalculations()}});
 $('dialogBody').addEventListener('change',event=>{
  const input=event.target;if(input.dataset.key){collectOne(input);if(input.dataset.key==='cyclePhaseCount'||input.dataset.key==='cycle'){collect();const top=$('dialogBody').scrollTop;renderDialog();$('dialogBody').scrollTop=top}else refreshCalculations()}
  if(input.id==='recordAttachments'){const files=[...input.files];if(files.some(file=>file.size>52428800)){notice('Each attachment must be no larger than 50 MB.',true);input.value='';return}collect();pendingFiles.push(...files.map(file=>({id:uuid(),file})));const top=$('dialogBody').scrollTop;renderDialog();$('dialogBody').scrollTop=top}
 });
 $('dialogBody').addEventListener('click',event=>{const button=event.target.closest('[data-download]');if(button)downloadFile(button.dataset.download)});
 window.addEventListener('storage',event=>{if(event.key===KEY){const latest=getSaved();if(latest){rows=latest;render();if(draft&&original&&stable(rows.find(r=>r.id===original.id))!==stable(original))notice('This test changed in another window. Review the latest saved record before saving.',true)}}});
 window.addEventListener('beforeunload',event=>{if(dirty()){event.preventDefault();event.returnValue=''}});
 const initial=getSaved();rows=initial||[];if(initial&&!localStorage.getItem(KEY))try{persist(initial)}catch(e){storageError='Tests could not be stored: '+e.message}
 render();
 // Pure record-result logic for validation without modifying saved records.
 window.EmissionRegisterMath={result,corrected};
}());
