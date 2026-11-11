const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),{JSDOM}=require('jsdom');
const tick=()=>new Promise(resolve=>setImmediate(resolve));
async function setup(records){
 const dom=new JSDOM(fs.readFileSync('index.html','utf8'),{url:'https://nazanin-ghaemizadeh.github.io/BAMCO-EMISSION-TEST/',runScripts:'outside-only'}),w=dom.window;
 w.structuredClone=structuredClone;w.HTMLDialogElement.prototype.showModal=function(){this.open=true};w.HTMLDialogElement.prototype.close=function(){this.open=false};
 w.BamcoCentral={ready:()=>true,user:()=>({id:'test-user'}),all:async()=>records.map(data=>({data:structuredClone(data),id:data.id,revision:1})),request:async()=>[{revision:2}]};
 for(const path of ['form-schema.js','r83-form-adjustments.js','vehicle-defaults.js','register.js','keyboard-scroll.js'])w.eval(fs.readFileSync(path,'utf8'));
 await tick();return dom;
}
test('vehicle selection fills shared fields, offers labs and leaves test identity and results untouched',async t=>{
 const dom=await setup([{id:'old-a',cells:{C15:'BAC X3 PRO',C14:'Example manufacturer',C66:'0.745',C9:'Lab A',C17:'DO-NOT-COPY',E99:'123'}},{id:'old-b',cells:{C15:'BAC X3 PRO',C14:'Example manufacturer',C66:'0.745',C9:'Lab B'}}]);t.after(()=>dom.window.close());const w=dom.window,d=w.document;
 d.getElementById('createTest').click();const field=key=>d.querySelector('[data-key="cells.'+key+'"]');const id=field('C5').value;
 const picker=d.getElementById('vehiclePreset');picker.value='BAC X3 PRO';picker.dispatchEvent(new w.Event('change',{bubbles:true}));
 assert.equal(field('C15').value,'BAC X3 PRO');assert.equal(field('C14').value,'Example manufacturer');assert.equal(field('C66').value,'0.745');assert.equal(field('C17').value,'');assert.equal(field('E99').value,'');assert.equal(field('C5').value,id);
 assert.equal(field('C9').tagName,'SELECT');assert.deepEqual([...field('C9').options].map(o=>o.value),['','Lab A','Lab B']);
 field('C14').value='My manual change';picker.dispatchEvent(new w.Event('change',{bubbles:true}));assert.equal(field('C14').value,'My manual change');
 w.dispatchEvent(new w.CustomEvent('bamco:central-reconnecting',{detail:{message:'Reconnecting'}}));assert.equal(d.getElementById('testDialog').open,true);assert.equal(field('C14').value,'My manual change');
 w.dispatchEvent(new w.CustomEvent('bamco:central-ready'));await tick();assert.equal(field('C14').value,'My manual change');assert.equal(d.getElementById('testDialog').open,true);
});
test('conflicting density is not guessed and synthetic defaults are excluded',async t=>{
 const dom=await setup([{id:'a',cells:{C15:'BAC X3 PRO',C66:'0.745'}},{id:'b',cells:{C15:'BAC X3 PRO',C66:'0.750'}},{id:'demo',demo:true,cells:{C15:'DEMO',C9:'Demo lab'}}]);t.after(()=>dom.window.close());const w=dom.window,d=w.document;
 d.getElementById('createTest').click();const picker=d.getElementById('vehiclePreset');assert.equal([...picker.options].some(o=>o.value==='DEMO'),false);picker.value='BAC X3 PRO';picker.dispatchEvent(new w.Event('change',{bubbles:true}));assert.equal(d.querySelector('[data-key="cells.C66"]').value,'');
});
test('switching vehicles replaces previous defaults without carrying VIN or overwriting user input',async t=>{
 const dom=await setup([{id:'a',cells:{C15:'Vehicle A',C14:'Maker A',C27:'1000'}},{id:'b',cells:{C15:'Vehicle B',C14:'Maker B'}}]);t.after(()=>dom.window.close());const w=dom.window,d=w.document;
 d.getElementById('createTest').click();const picker=d.getElementById('vehiclePreset');for(const value of ['Vehicle A','Vehicle B']){picker.value=value;picker.dispatchEvent(new w.Event('change',{bubbles:true}));}
 assert.equal(d.querySelector('[data-key="cells.C14"]').value,'Maker B');assert.equal(d.querySelector('[data-key="cells.C27"]').value,'');
});
test('arrow keys scroll the dialog but leave typing and select navigation native',async t=>{
 const dom=await setup([]);t.after(()=>dom.window.close());const w=dom.window,d=w.document;d.getElementById('createTest').click();const body=d.getElementById('dialogBody'),calls=[];
 Object.defineProperties(body,{scrollHeight:{value:3000},clientHeight:{value:600}});body.scrollBy=options=>calls.push(options.top);
 const down=new w.KeyboardEvent('keydown',{key:'ArrowDown',bubbles:true,cancelable:true});d.getElementById('dialogTitle').dispatchEvent(down);assert.equal(down.defaultPrevented,true);assert.deepEqual(calls,[64]);
 const field=d.querySelector('[data-key="cells.C5"]');field.dispatchEvent(new w.KeyboardEvent('keydown',{key:'ArrowDown',bubbles:true,cancelable:true}));assert.deepEqual(calls,[64]);
 d.getElementById('vehiclePreset').dispatchEvent(new w.KeyboardEvent('keydown',{key:'ArrowDown',bubbles:true,cancelable:true}));assert.deepEqual(calls,[64]);
});
