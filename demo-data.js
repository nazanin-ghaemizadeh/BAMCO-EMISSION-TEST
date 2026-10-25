const DEMO_RECORDS=Array.from({length:10},(_,i)=>{const n=i+1,group=Math.floor(i/2),model=i%3===0?'BAC X3':'BAC X3 Pro',engine=model==='BAC X3'?'1.5T':'1.5T GDI',ecu=['ECU-CAL-A01','ECU-CAL-A02','ECU-CAL-B01','ECU-CAL-B02','ECU-CAL-C01'][group],cat=['TWC-A','TWC-A','TWC-B','TWC-B','TWC-C'][group],changes=['Baseline mapping','Idle and cold-start adjustment','Injection timing revision','Catalyst warm-up strategy','Oxygen feedback optimization'];const r={id:'R83-2026-'+String(n).padStart(3,'0'),date:'2026-10-'+String(3+i*2).padStart(2,'0'),report:'DEMO-LAB-R83-'+String(n).padStart(3,'0'),lab:'BAMCO Demonstration Emission Laboratory',standard:'ECE R83 · DEMO (amendment not assigned)',cycle:'Type I · Demo Cycle',statusNote:['Baseline measurement','Repeatability check','Calibration verification','Cold-start evaluation','Post-calibration measurement'][i%5],model,vin:'DEMO-BAC-X3-'+String(100000+i),engine,transmission:i%3===0?'6AT':'CVT',mileage:800+i*320,mass:1420+(i%3)*35,fuel:'Demo Reference Gasoline',temperature:21+(i%5),humidity:43+(i*3)%16,pressure:+(100.4+(i%5)*.24).toFixed(2),soak:10+(i%3),dyno:'Demo Chassis Dyno CD-02',operator:['Demo Operator A','Demo Operator B','Demo Operator C'][i%3],ecu,ecuPart:'DEMO-ECU-15T-'+(model==='BAC X3'?'01':'02'),software:'SW-2.'+group+'.'+(i%2),catalyst:cat,catAge:Math.max(0,400+i*260),oxygen:i<4?'Upstream UEGO + downstream HO2S':'Upstream UEGO + downstream HO2S (revised)',hardwareNotes:'DEMO ONLY · '+changes[group],changeDate:'2026-10-'+String(3+i*2).padStart(2,'0'),changeId:'DEMO-ECN-'+String(100+n),changeType:['Baseline','Calibration','Calibration','Aftertreatment','Sensor feedback'][group],before:group===0?'Initial reference setup':['Initial reference setup','ECU-CAL-A01','ECU-CAL-A02','ECU-CAL-B01','ECU-CAL-B02'][group],after:ecu+' / '+cat,notes:changes[group]+'; simulated engineering record, not a verified laboratory conclusion.',results:{}};const base={CO:325,THC:55,NMHC:38,NOx:42,CO2:174,PM:1.85,PN:2.8e11};const improvement=[1.04,1.01,.95,.92,.87,.85,.81,.79,.74,.72][i];for(const p of ['CO','THC','NMHC','NOx','CO2','PM','PN']){let factor=improvement*(1+(i%3-1)*.025),combined=base[p]*factor,first=combined*(1.18+(i%3)*.035),second=combined*(.79+(i%4)*.025);r.results[p]={p1:+first.toPrecision(5),p2:+second.toPrecision(5),combined:+combined.toPrecision(5)}}return r});
/* Plausible, internally consistent synthetic engineering examples — NOT certified results. */
DEMO_RECORDS.forEach((r,i)=>{
 const j=Math.floor(i/2), repeat=i%2;
 const dates=['2026-10-03','2026-10-05','2026-10-07','2026-10-09','2026-10-11','2026-10-13','2026-10-15','2026-10-17','2026-10-19','2026-10-21'];
 const co2=Number(r.results.CO2.combined), nox=Number(r.results.NOx.combined);
 Object.assign(r,{
 date:dates[i],testTime:repeat?'10:15':'08:30',testType:'Chassis dynamometer · Type I',testPurpose:repeat?'Repeatability / verification':'Calibration development',testRun:repeat+1,testStatus:'Completed — simulated',testSite:'Demonstration chassis dynamometer cell',manufacturer:'BAMCO (synthetic example)',variant:r.model==='BAC X3'?'1.5T 6AT':'1.5T GDI CVT',modelYear:'2026',vehicleClass:'M1',engineDisplacement:1498,ratedPower:r.model==='BAC X3'?110:118,ratedTorque:r.model==='BAC X3'?210:230,emissionGrade:'Illustrative engineering target',ecuHardware:'HW-1.2',calibrationId:r.ecu,cvn:'DEMO-CVN-'+String(1201+j),ecuChangeSummary:['Reference mapping','Cold-start enrichment reduction','Injection timing optimization','Catalyst light-off tuning','Closed-loop lambda control refinement'][j],catType:'Three-way catalyst',gpfDpf:'Not fitted (demo configuration)',egr:'Internal EGR / VVT',obdStatus:'Ready (simulated)',dtc:'None (simulated)',inertia:r.mass,roadLoadA:112+3*j,roadLoadB:0.42,roadLoadC:0.035,tirePressure:'230 front / 230 rear',tireType:'205/55 R16',fuelLevel:55+i*2,batterySoc:82-i%4,coolantInitial:23+i%3,oilInitial:22+i%3,preconditioning:'Reference preconditioning cycle; overnight soak',maintenance:'No service between repeat runs',vehicleLoad:0,acSetting:'A/C off; auxiliaries minimized',ambientStart:r.temperature,ambientEnd:r.temperature+1,fuelBatch:'SYN-FUEL-2026-10',fuelDensity:0.745,fuelSulfur:'<10 mg/kg (assumed)',fuelEthanol:0,fuelOctane:'RON 95 (assumed)',lubricant:'5W-30 synthetic (illustrative)',coolant:'50/50 ethylene glycol mixture',dynoSerial:'DEMO-DYNO-002',dynoCalibration:'2026-09-20',analyzer:'Synthetic gas analyzer GA-01',analyzerSerial:'DEMO-GA-001',analyzerCalibration:'2026-09-25',cvs:'Illustrative CVS sampling system',cvsSerial:'DEMO-CVS-001',pnCounter:'DEMO-PNC-001',pmBalance:'DEMO-PMB-001',sampleSystem:'Dilution tunnel (illustrative)',zeroSpan:'Pass — simulated',leakCheck:'Pass — simulated',witness:'Demo Supervisor',cycleClass:'Illustrative 2-phase laboratory cycle',cyclePhaseCount:2,cycleDuration:1180,cycleDistance:11.0,targetSpeed:'Reference trace — synthetic',actualDistance:Number((11+(repeat?.02:-.01)).toFixed(2)),maxSpeedDeviation:repeat?1.2:1.5,timeOutsideTolerance:repeat?1:2,driver:'Demo Driver '+(repeat?'B':'A'),drivingMode:'Normal',gearStrategy:'Automatic',cycleInterruptions:'None',validity:'Valid — illustrative only',invalidReason:'',fuelConsumption:Number((co2/23.2).toFixed(2)),fuelMass:Number((co2*11/1000*745/23.2).toFixed(1)),co2Weighted:co2,energyConsumption:'',electricRange:'',correctionFactor:1,calculationMethod:'Approximate gasoline carbon balance (demo only)',engineRpm:'750–4300 rpm',engineLoad:45,coolantAverage:88,lambda:1.001,shortFuelTrim:1.2,longFuelTrim:-0.8,intakeTemp:26,exhaustTemp:440,canLog:'SYN-CAN-'+r.id,obdLog:'SYN-OBD-'+r.id,limitStandard:'Not assigned — no homologation conclusion',limitCO:'',limitTHC:'',limitNMHC:'',limitNOx:'',limitPM:'',limitPN:'',compliance:'Not assessed — demonstration',nonconformities:'None recorded (synthetic)',rootCause:'',correctiveAction:'',actionOwner:'Development engineering',actionStatus:'Monitoring',reviewer:'Demo Reviewer',approvalDate:'',approvalStatus:'Demo / not approved',rawDataRef:'SYN-RAW-'+r.id,labReportRef:r.report,chartRef:'Synthetic chart generated from sample values',ecuFileRef:'SYN-ECU-'+r.ecu,attachmentRef:'No actual laboratory attachments',changeDate:dates[i]
 });
 // Phase 1 is higher for cold start; phase 2 is lower; combined is a weighted aggregate.
 for(const p of ['CO','THC','NMHC','NOx','CO2','PM','PN']){
  const combined=Number(r.results[p].combined);
  const p1=Number((combined*1.24).toPrecision(5));
  const p2=Number((combined*.76).toPrecision(5));
  r.results[p]={p1,p2,combined};
 }
});

/* Related examples are paired repeats of the same synthetic vehicle. */
DEMO_RECORDS.forEach((r,i)=>{
 const group=Math.floor(i/2), repeat=i%2;
 r.project='DEMO · Calibration evaluation';
 r.model=group%2?'BAC X3':'BAC X3 Pro';
 r.variant=group%2?'1.5T 6AT':'1.5T GDI CVT';
 r.engine=group%2?'1.5T':'1.5T GDI';
 r.transmission=group%2?'6AT':'CVT';
 r.vin='DEMO-BAC-X3-'+String(100000+group);
 r.engineNumber='DEMO-ENG-'+String(1001+group);
 r.ratedPower=group%2?110:118;
 r.ratedTorque=group%2?210:230;
 r.ecuPart='DEMO-ECU-15T-'+(group%2?'01':'02');
 r.mass=group%2?1420:1455;r.inertia=r.mass;
 r.mileage=800+group*640+repeat*20;
 r.powertrain='Gasoline';r.driveType='FWD';
 r.parentTestId=repeat?'R83-2026-'+String(i).padStart(3,'0'):'';
 r.ventilation='Controlled cooling fan and cell extraction (synthetic)';
 r.phaseData={p1:{distance:5.5,duration:590,fuel:Number((r.fuelConsumption*1.24).toFixed(3))},p2:{distance:5.5,duration:590,fuel:Number((r.fuelConsumption*.76).toFixed(3))}};
});

