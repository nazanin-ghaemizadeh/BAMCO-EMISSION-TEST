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
 const dom=await setup([{id:'old-a',cells:{C15:'Vehicle A',C14:'Example manufacturer',C66:'0.745',C9:'ISQI Vehicle Emission Test & Research Center',C17:'DO-NOT-COPY',E99:'123'}},{id:'old-b',cells:{C15:'Vehicle A',C14:'Example manufacturer',C66:'0.745',C9:'AIRIC Emission Lab EURO V'}}]);t.after(()=>dom.window.close());const w=dom.window,d=w.document;
 d.getElementById('createTest').click();const field=key=>d.querySelector('[data-key="cells.'+key+'"]');const id=field('C5').value;
 const picker=d.getElementById('vehiclePreset');picker.value='Vehicle A';picker.dispatchEvent(new w.Event('change',{bubbles:true}));
 assert.equal(field('C15').value,'Vehicle A');assert.equal(field('C14').value,'Example manufacturer');assert.equal(field('C66').value,'0.745');assert.equal(field('C17').value,'');assert.equal(field('E99').value,'');assert.equal(field('C5').value,id);
 assert.equal(field('C9').tagName,'SELECT');assert.deepEqual([...field('C9').options].map(o=>o.value),['','Iran Standard & Quality Inspection Co. (ISQI)','AIRIC Emission Lab EURO V']);
 assert.equal(d.activeElement,d.getElementById('dialogBody'));
 assert.match(d.getElementById('vehiclePresetSources').textContent,/old-a/);
 field('C14').value='My manual change';picker.dispatchEvent(new w.Event('change',{bubbles:true}));assert.equal(field('C14').value,'My manual change');
 w.dispatchEvent(new w.CustomEvent('bamco:central-reconnecting',{detail:{message:'Reconnecting'}}));assert.equal(d.getElementById('testDialog').open,true);assert.equal(field('C14').value,'My manual change');
 w.dispatchEvent(new w.CustomEvent('bamco:central-ready'));await tick();assert.equal(field('C14').value,'My manual change');assert.equal(d.getElementById('testDialog').open,true);
});
test('latest test date wins, empty and placeholder fields fall back to older tests of the same vehicle',async t=>{
 const records=[
  {id:'older',updatedAt:'2026-11-11',cells:{C6:'1405/05/01',C15:'Vehicle A',C14:'Older maker',C30:'Automatic',C66:'0.750',C27:'1,500',C94:'-0.25',C18:'\\t—',C110:'\\t1,250',C82:'Older cycle'}},
  {id:'latest',updatedAt:'2026-11-01',cells:{C6:'1405/07/14',C15:'Vehicle A',C14:'New maker',C30:'AT',C66:'0.745',C27:'',C94:0,C110:'N/A',C82:'Custom saved cycle',C123:1,C83:4,C84:7,C19:600,C17:'PRIVATE-VIN',C151:'Pass'}},
  {id:'unrelated',cells:{C6:'1405/08/01',C15:'Vehicle B',C18:2026,C27:9000}},
  {id:'demo',demo:true,cells:{C15:'DEMO',C9:'Demo lab'}}
 ];
 const dom=await setup(records);t.after(()=>dom.window.close());const w=dom.window,d=w.document;
 const preset=w.EmissionVehicleDefaults.build(records).defaults('vehicle a');
 assert.equal(preset.cells.C14,'New maker');assert.equal(preset.cells.C30,'AT');assert.equal(preset.cells.C66,.745);assert.equal(preset.cells.C27,1500);assert.equal(preset.cells.C94,0);assert.equal(preset.cells.C110,1250);assert.equal(preset.cells.C18,undefined);
 assert.equal(preset.sources.C27.id,'older');assert.equal(preset.sources.C66.id,'latest');
 for(const field of ['C5','C6','C9','C17','C19','C83','C84','C151'])assert.equal(preset.cells[field],undefined);
 d.getElementById('createTest').click();const picker=d.getElementById('vehiclePreset');assert.equal([...picker.options].some(o=>o.value==='DEMO'),false);picker.value='Vehicle A';picker.dispatchEvent(new w.Event('change',{bubbles:true}));assert.equal(d.querySelector('[data-key="cells.C82"]').value,'Custom saved cycle');assert.equal(d.querySelector('[data-key="cells.C94"]').value,'0');
});
test('switching vehicles replaces previous defaults without carrying VIN or overwriting user input',async t=>{
 const dom=await setup([{id:'a',cells:{C15:'Vehicle A',C14:'Maker A',C27:'1000',C110:'1250'}},{id:'b',cells:{C15:'Vehicle B',C14:'Maker B'}}]);t.after(()=>dom.window.close());const w=dom.window,d=w.document;
 d.getElementById('createTest').click();const picker=d.getElementById('vehiclePreset');for(const value of ['Vehicle A','Vehicle B']){picker.value=value;picker.dispatchEvent(new w.Event('change',{bubbles:true}));}
 assert.equal(d.querySelector('[data-key="cells.C14"]').value,'Maker B');assert.equal(d.querySelector('[data-key="cells.C27"]').value,'');
 assert.equal(d.querySelector('[data-key="cells.C110"]').value,'');
});
test('both stored ISQI names select the same option; laboratory selection returns focus to the form',async t=>{
 const dom=await setup([{id:'legacy',cells:{C15:'Vehicle A',C9:'ISQI Vehicle Emission Test & Research Center'}}]);t.after(()=>dom.window.close());const w=dom.window,d=w.document;
 d.querySelector('[data-action="edit"]').click();const lab=d.querySelector('[data-key="cells.C9"]');
 assert.equal(lab.options.length,3);assert.equal(lab.value,'Iran Standard & Quality Inspection Co. (ISQI)');
 lab.focus();lab.value='AIRIC Emission Lab EURO V';lab.dispatchEvent(new w.Event('change',{bubbles:true}));
 assert.equal(d.activeElement,d.getElementById('dialogBody'));assert.match(lab.selectedOptions[0].textContent,/SAIPA/);
});
test('arrow keys scroll from single-line fields without changing values, while multiline and dropdown controls keep native navigation',async t=>{
 const dom=await setup([]);t.after(()=>dom.window.close());const w=dom.window,d=w.document;d.getElementById('createTest').click();const body=d.getElementById('dialogBody'),calls=[];
 Object.defineProperties(body,{scrollHeight:{value:3000},clientHeight:{value:600}});body.scrollBy=options=>calls.push(options.top);
 const down=new w.KeyboardEvent('keydown',{key:'ArrowDown',bubbles:true,cancelable:true});d.getElementById('dialogTitle').dispatchEvent(down);assert.equal(down.defaultPrevented,true);assert.deepEqual(calls,[64]);
 const field=d.querySelector('[data-key="cells.C5"]'),value=field.value;field.focus();field.dispatchEvent(new w.KeyboardEvent('keydown',{key:'ArrowDown',bubbles:true,cancelable:true}));assert.deepEqual(calls,[64,64]);assert.equal(field.value,value);
 for(const control of [d.getElementById('vehiclePreset'),d.querySelector('textarea')])control.dispatchEvent(new w.KeyboardEvent('keydown',{key:'ArrowDown',bubbles:true,cancelable:true}));assert.deepEqual(calls,[64,64]);
 field.dispatchEvent(new w.KeyboardEvent('keydown',{key:'PageDown',bubbles:true,cancelable:true}));assert.deepEqual(calls,[64,64,480]);
 field.dispatchEvent(new w.KeyboardEvent('keydown',{key:'ArrowUp',bubbles:true,cancelable:true}));assert.deepEqual(calls,[64,64,480,-64]);
});
