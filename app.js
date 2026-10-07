const KEY="sequenceData"; const PASS="ADMTHE";
const $=id=>document.getElementById(id);
let data=JSON.parse(localStorage.getItem(KEY)||'{"days":1,"last":null,"missed":false}');
function todayKey(){return new Date().toISOString().slice(0,10)}
function save(){localStorage.setItem(KEY,JSON.stringify(data))}
function hexToRgb(h){h=h.replace("#","");return [parseInt(h.slice(0,2),16),parseInt(h.slice(2,4),16),parseInt(h.slice(4,6),16)]}
function rgbToHex(r,g,b){return "#"+[r,g,b].map(v=>Math.round(v).toString(16).padStart(2,"0")).join("")}
function mixColor(a,b,t){const A=hexToRgb(a),B=hexToRgb(b);return rgbToHex(A[0]+(B[0]-A[0])*t,A[1]+(B[1]-A[1])*t,A[2]+(B[2]-A[2])*t)}
function flameColor(d){
  const stops=[[1,"#ffd21a"],[50,"#ff1744"],[100,"#9b20ff"],[200,"#20baff"],[300,"#ffffff"]];
  if(d<=1)return stops[0][1];
  if(d>=300)return stops[4][1];
  for(let i=1;i<stops.length;i++){
    const [day2,c2]=stops[i], [day1,c1]=stops[i-1];
    if(d<=day2)return mixColor(c1,c2,(d-day1)/(day2-day1));
  }
  return "#ffffff";
}
function render(){
  const zero = data.days <= 0;
  const c=zero ? "#777c82" : flameColor(data.days);
  const inner=zero ? "#8d9398" : (data.days>=300 ? "#8d9398" : mixColor(c,"#ff8a00",0.38));
  document.documentElement.style.setProperty("--flame",c);
  document.documentElement.style.setProperty("--flame-inner",inner);
  document.documentElement.style.setProperty("--flame-core", data.days>=300 ? "#fff4df" : "#fff4df");
  $("bigFlame").style.setProperty("--flame",c);
  $("bigFlame").style.setProperty("--flame-inner",inner);
  $("miniFlame").style.setProperty("--flame",c);
  $("miniFlame").style.setProperty("--flame-inner",inner);
  $("bigFlame").classList.toggle("zero", zero);
  $("miniFlame").classList.toggle("zero", zero);
  $("count").classList.toggle("zero", zero);
  document.querySelectorAll(".lvl").forEach(el=>{
    const levelColor=getComputedStyle(el).getPropertyValue("--level").trim()||c;
    el.style.setProperty("--level",levelColor);
  });
  $("count").style.color=c;
  $("count").style.textShadow=`0 0 18px ${c}77`;
  $("count").textContent=data.days;
  $("subtitle").textContent=data.days===1?"dia de ofensiva":"dias de ofensiva";
  if(data.days>=300){document.querySelector(".app").classList.add("final")} else document.querySelector(".app").classList.remove("final");
}
function timer(){let n=new Date(), m=new Date(n);m.setHours(24,0,0,0);let total=Math.max(0,Math.floor((m-n)/1000));let h=String(Math.floor(total/3600)).padStart(2,"0");let rest=total%3600;let mi=String(Math.floor(rest/60)).padStart(2,"0");let se=String(rest%60).padStart(2,"0");$("timer").textContent=`${h}:${mi}:${se}`;$("risk").classList.toggle("show",total<=5400&&data.last!==todayKey())}
$("dots").onclick=()=> {startFireSound(); $("menu").classList.toggle("open")};
$("soundBtn").onclick=()=>toggleSound();
document.addEventListener("click",e=>{if(!e.target.closest("header"))$("menu").classList.remove("open")});
$("today").onclick=()=>{let t=todayKey();if(data.last!==t){data.days++;data.last=t;data.missed=false;save();render()}};
$("restart").onclick=()=>{ $("menu").classList.remove("open");$("shade").classList.add("on");$("resetModal").classList.add("show")};
$("no").onclick=closeModals;
$("yes").onclick=()=>{data={days:0,last:todayKey(),missed:false};save();render();closeModals()};
$("debug").onclick=()=>{ $("menu").classList.remove("open");$("shade").classList.add("on");$("debugModal").classList.add("show");$("pass").focus()};
$("debugAccessClose").onclick=closeModals;
$("enter").onclick=()=>{if($("pass").value===PASS){$("debugModal").classList.remove("show");$("debugPanel").classList.add("show");$("error").textContent=""}else $("error").textContent="Senha incorreta."};
$("plus").onclick=()=>{data.days++;data.last=todayKey();data.missed=false;save();render()};

let fireExtinguished=false;
function toggleDebugFire(){
  fireExtinguished=!fireExtinguished;
  $("bigFlame").classList.toggle("extinguished",fireExtinguished);
  $("miniFlame").classList.toggle("extinguished",fireExtinguished);
  const b=$("debugFire");
  b.classList.toggle("on",!fireExtinguished);
  b.textContent=fireExtinguished?"🔥 ACENDER FOGO":"🔥 APAGAR FOGO";
}
$("debugFire").onclick=toggleDebugFire;
$("leave").onclick=closeModals;
$("debugClose").onclick=closeModals;
function closeModals(){document.querySelectorAll(".modal,.debugPanel").forEach(x=>x.classList.remove("show"));$("shade").classList.remove("on");$("pass").value=""}

async function requestNotificationPermission(){if(!("Notification" in window))return;if(Notification.permission==="default"){try{await Notification.requestPermission()}catch(e){}}}
function sendRiskNotification(){if(!("Notification" in window)||Notification.permission!=="granted")return;const t=todayKey();if(data.last===t||localStorage.getItem("sequenceRiskNotified")===t)return;localStorage.setItem("sequenceRiskNotified",t);try{new Notification("Sua ofensiva está em risco 🔥",{body:"Falta 1 hora e meia para meia-noite. Marque hoje para não perder sua sequência!",icon:"icons/icon.svg",tag:"sequence-risk"})}catch(e){}}
function checkRiskNotification(){const now=new Date(),midnight=new Date(now);midnight.setHours(24,0,0,0);const remaining=midnight-now;if(remaining<=5400000&&remaining>5340000)sendRiskNotification()}
$("today").addEventListener("click",requestNotificationPermission);
setInterval(checkRiskNotification,30000);

setInterval(timer,1000);timer();render();

// Som ambiente de labareda: suave, contínuo e com pequenas crepitações.
let audioCtx=null, fireGain=null, fireSource=null, fireOn=true, audioReady=false;
function makeFireSound(){
  if(audioReady)return;
  const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;
  audioCtx=new AC();
  const rate=audioCtx.sampleRate, seconds=12, len=rate*seconds;
  const buf=audioCtx.createBuffer(1,len,rate), ch=buf.getChannelData(0);
  let low=0, mid=0, smooth=0;
  for(let i=0;i<len;i++){
    low += (Math.random()*2-1-low)*0.0045;
    mid += (Math.random()*2-1-mid)*0.018;
    smooth += (Math.random()*2-1-smooth)*0.0012;
    const t=i/rate;
    const breath=0.55+0.45*(0.5+0.5*Math.sin(t*1.15)+0.18*Math.sin(t*2.37));
    let sample=(low*.22+mid*.10+smooth*.35)*breath;
    sample += (Math.random()*2-1)*0.0012;
    if(Math.random()<0.00011){
      const burst=Math.floor(rate*(0.025+Math.random()*0.075));
      for(let j=0;j<burst&&i+j<len;j++){
        const env=Math.exp(-j/(rate*.022));
        ch[i+j]+=((Math.random()*2-1)*.045)*env;
      }
    }
    ch[i]+=sample;
  }
  fireSource=audioCtx.createBufferSource();fireSource.buffer=buf;fireSource.loop=true;
  const hp=audioCtx.createBiquadFilter();hp.type="highpass";hp.frequency.value=55;hp.Q.value=.2;
  const lp=audioCtx.createBiquadFilter();lp.type="lowpass";lp.frequency.value=1150;lp.Q.value=.3;
  fireGain=audioCtx.createGain();fireGain.gain.value=.006;
  fireSource.connect(hp).connect(lp).connect(fireGain).connect(audioCtx.destination);
  fireSource.start();audioReady=true;
}
function startFireSound(){
  makeFireSound();
  if(audioCtx&&audioCtx.state==="suspended")audioCtx.resume();
  if(fireGain)fireGain.gain.setTargetAtTime(fireOn?.012:0,audioCtx.currentTime,.2);
}
function clickSound(){
  if(!audioCtx||!fireOn)return;
  const o=audioCtx.createOscillator(),g=audioCtx.createGain();
  o.type="sine";o.frequency.setValueAtTime(440,audioCtx.currentTime);
  o.frequency.exponentialRampToValueAtTime(330,audioCtx.currentTime+.055);
  g.gain.setValueAtTime(.0001,audioCtx.currentTime);
  g.gain.exponentialRampToValueAtTime(.014,audioCtx.currentTime+.008);
  g.gain.exponentialRampToValueAtTime(.0001,audioCtx.currentTime+.07);
  o.connect(g).connect(audioCtx.destination);o.start();o.stop(audioCtx.currentTime+.075);
}
function toggleSound(){
  fireOn=!fireOn;startFireSound();
  const s=$("soundBtn");
  if(s)s.innerHTML=(fireOn?"🔊":"🔇")+' <span>Som: '+(fireOn?"ligado":"desligado")+'</span>';
}
document.addEventListener("pointerdown",()=>startFireSound(),{once:true});
document.addEventListener("click",e=>{if(e.target.closest("button"))clickSound()});
