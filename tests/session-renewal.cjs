const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),{JSDOM}=require('jsdom');
const tick=()=>new Promise(resolve=>setImmediate(resolve));
const ORIGIN='https://nazanin-ghaemizadeh.github.io';
async function setup(){
 const dom=new JSDOM('<script data-module="emission"></script>',{url:ORIGIN+'/BAMCO-EMISSION-TEST/',runScripts:'outside-only'}),w=dom.window,messages=[],calls=[],events=[];
 const opener={closed:false,postMessage(message){messages.push(message);if(message.refresh)queueMicrotask(()=>send('new-token'));}};Object.defineProperty(w,'opener',{value:opener});Object.defineProperty(w.document,'currentScript',{value:w.document.querySelector('script')});
 const send=(accessToken,userId='user-a',source=opener,origin=ORIGIN)=>w.dispatchEvent(new w.MessageEvent('message',{origin,source,data:{type:'bamco.emission.session',accessToken,userId}}));
 w.fetch=async(url,options={})=>{calls.push({url,token:options.headers.Authorization});if(url.endsWith('/auth/v1/user'))return Response.json({id:'user-a'});if(url.includes('can_access_feature'))return Response.json(true);return options.headers.Authorization==='Bearer old-token'?Response.json({error:'expired'},{status:401}):Response.json([{id:'test-record'}]);};
 for(const type of ['bamco:central-ready','bamco:central-locked','bamco:central-reconnecting'])w.addEventListener(type,()=>events.push(type));
 w.eval(fs.readFileSync('central-session.js','utf8'));send('old-token');await tick();return{dom,w,send,messages,calls,events,opener};
}
test('401 renews once and retries without locking the page; concurrent requests share renewal',async t=>{
 const f=await setup();t.after(()=>f.dom.window.close());const data=await Promise.all([f.w.BamcoCentral.request('emission_tests'),f.w.BamcoCentral.request('emission_tests')]);
 assert.equal(data[0][0].id,'test-record');assert.equal(f.messages.filter(m=>m.refresh).length,1);assert.equal(f.events.includes('bamco:central-locked'),false);assert.equal(f.w.BamcoCentral.ready(),true);
});
test('closing the parent does not clear an already authorized page on heartbeat',async t=>{
 const f=await setup();t.after(()=>f.dom.window.close());f.opener.closed=true;f.w.BamcoCentral.ask();assert.equal(f.w.BamcoCentral.ready(),true);assert.equal(f.events.includes('bamco:central-locked'),false);
});
test('messages from an unrelated source are ignored and explicit revocation still locks',async t=>{
 const f=await setup();t.after(()=>f.dom.window.close());f.send('untrusted','user-a',{});f.send('untrusted','user-a',f.opener,'https://example.test');await tick();
 f.w.dispatchEvent(new f.w.MessageEvent('message',{origin:ORIGIN,source:f.opener,data:{type:'bamco.emission.revoked'}}));assert.equal(f.w.BamcoCentral.ready(),false);assert.equal(f.w.BamcoCentral.user(),null);assert.equal(f.events.includes('bamco:central-locked'),true);
});
