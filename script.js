const API_URL="https://script.google.com/macros/s/AKfycbzbKd4NFaC9_ZsQ0GKYtGU8c3sd3uAp4BMipyX-5BhFYSbbh4S78ubgG_oMLFFU7FWg/exec";
let schedules=[],offs=[],user="",token="",tab="today",selected=[],summary={},months=[];

document.addEventListener("DOMContentLoaded",()=>{loadUsers();document.getElementById("pin").addEventListener("keydown",e=>{if(e.key==="Enter")login()})});

async function api(data,auth=true){
  if(API_URL.includes("請貼上")) throw Error("尚未設定 Apps Script 網址");
  const r=await fetch(API_URL,{method:"POST",headers:{"Content-Type":"text/plain;charset=utf-8"},body:JSON.stringify({...data,token:auth?token:undefined})});
  const t=await r.text(); let j; try{j=JSON.parse(t)}catch{throw Error(t||"伺服器回應錯誤")}
  if(j.ok===false) throw Error(j.message||"操作失敗"); return j;
}
async function loadUsers(){try{const r=await api({mode:"publicConfig"},false),s=document.getElementById("name");(r.users||[]).forEach(n=>s.insertAdjacentHTML("beforeend",`<option>${esc(n)}</option>`))}catch(e){msg(e.message)}}
async function login(){
  const n=document.getElementById("name").value.trim(),p=document.getElementById("pin").value.trim(),b=document.getElementById("loginBtn");
  if(!n||!p)return msg("請選擇姓名並輸入密碼");
  busy(b,true,"驗證中...");
  try{const r=await api({mode:"login",name:n,pin:p},false);user=r.user.name;token=r.token;schedules=r.schedule||[];offs=r.offRequests||[];summary=r.summary||{};months=r.months||[];document.getElementById("login").classList.add("hidden");document.getElementById("app").classList.remove("hidden");buildMonths();showToday()}catch(e){msg(e.message)}finally{busy(b,false,"登入系統")}
}
function buildMonths(){const s=document.getElementById("month");s.innerHTML='<option value="all">顯示全部</option>';months.forEach(m=>s.insertAdjacentHTML("beforeend",`<option value="${m}">${Number(m)} 月</option>`))}
function active(x){tab=x;document.querySelectorAll("nav button").forEach(b=>b.classList.toggle("active",b.dataset.tab===x))}
function filter(v){document.getElementById("filter").classList.toggle("hidden",!v)}
function head(t,s=""){document.getElementById("title").textContent=t;document.getElementById("sub").textContent=s}
function today(){const d=new Date();return`${String(d.getMonth()+1).padStart(2,"0")}/${String(d.getDate()).padStart(2,"0")}`}
function showToday(){active("today");filter(false);const d=today();renderSchedule(schedules.filter(x=>x.date===d),`今日班表（${d}）`,false)}
function showAll(){active("all");filter(true);applyFilter()}
function showMyOff(){active("off");filter(true);applyFilter()}
function applyFilter(){const m=document.getElementById("month").value;if(tab==="all"){const a=m==="all"?schedules:schedules.filter(x=>x.date?.startsWith(m+"/"));renderSchedule(a,m==="all"?"全店總表":`${Number(m)} 月全店總表`,true)}else if(tab==="off"){let a=offs.filter(x=>x.employeeName===user);if(m!=="all")a=a.filter(x=>x.requestDate?.startsWith(m+"/"));renderOff(a,`${user} 的排休申請`)}}
function renderSchedule(a,t,showSum){
  head(t,`登入者：${user}`);const l=document.getElementById("list");l.innerHTML="";
  if(showSum)l.innerHTML=`<div class="summary"><div>本月預估薪資</div><div class="money">$${Number(summary.netPay||0).toLocaleString()}</div><small>工時 ${Number(summary.hours||0).toFixed(1)} 小時・外送補貼 $${Number(summary.oilSubsidy||0).toLocaleString()}</small><div class="actions"><button class="blue" onclick="salarySlip()">查看薪資單</button><button class="outline" onclick="showOil()">里程回報</button></div></div>`;
  if(!a.length)return l.insertAdjacentHTML("beforeend",'<div class="empty">查無資料</div>');
  a.forEach(x=>l.insertAdjacentHTML("beforeend",`<div class="card ${x.timeSlot?.includes("排休")?"off":""}"><div><div class="date">${esc(x.date)} ${esc(x.weekday||"")}</div><div class="shift">${esc(x.timeSlot||"")}</div></div><div class="name">${esc(x.employeeName||"")}</div></div>`))
}
function renderOff(a,t){
  head(t,`登入者：${user}`);const l=document.getElementById("list");l.innerHTML=a.length?"":'<div class="empty">尚無排休申請</div>';
  a.forEach(x=>{const c=x.status==="已核准"?"approved":(x.status==="待審核"?"pendingP":"rejected");l.insertAdjacentHTML("beforeend",`<div class="card off ${x.status==="待審核"?"pending":""}"><div><div class="date">${esc(x.requestDate)}</div><div class="shift">${esc(x.slot)}</div><span class="pill ${c}">${esc(x.status||"待審核")}</span></div><div class="name">${esc(x.note||"")}</div></div>`)})
}
function showApply(){
  active("apply");filter(false);selected=[];head("我要排休","可多選未來 60 天");const l=document.getElementById("list");l.innerHTML='<div class="calendar" id="cal"></div>';
  const c=document.getElementById("cal");
  for(let i=0;i<60;i++){const d=new Date();d.setDate(d.getDate()+i);const ds=`${String(d.getMonth()+1).padStart(2,"0")}/${String(d.getDate()).padStart(2,"0")}`,b=document.createElement("button");b.className="day";b.textContent=ds;b.onclick=async()=>{if(selected.includes(ds)){selected=selected.filter(x=>x!==ds);b.classList.remove("selected");return}try{const r=await api({mode:"checkConflict",date:ds});const n=(r.conflicts||[]).filter(x=>x!==user);if(n.length)alert(`注意：${n.join("、")} 當天已有排休申請。`)}catch(e){toast(e.message)}selected.push(ds);b.classList.add("selected")};c.appendChild(b)}
  l.insertAdjacentHTML("beforeend",'<div class="form"><select id="slot"><option>全天排休</option><option>早班排休</option><option>晚班排休</option></select><textarea id="note" placeholder="排休原因（選填）"></textarea><button id="offBtn" class="red" style="width:100%" onclick="submitOff()">送出排休申請</button></div>')
}
async function submitOff(){if(!selected.length)return toast("請先選擇日期");const b=document.getElementById("offBtn");busy(b,true,"傳送中...");try{const r=await api({mode:"offRequest",dates:selected,slot:document.getElementById("slot").value,note:document.getElementById("note").value.trim()});offs=r.offRequests||offs;toast("排休申請已送出");showMyOff()}catch(e){toast(e.message)}finally{busy(b,false,"送出排休申請")}}
function showOil(){document.getElementById("list").innerHTML='<div class="form"><h3>外送里程回報</h3><input id="start" type="number" placeholder="起始里程"><input id="end" type="number" placeholder="結束里程"><input id="oil" type="number" value="29.5" step="0.1" placeholder="今日 92 油價"><button id="oilBtn" style="width:100%;background:#27ae60;color:#fff" onclick="submitOil()">送出里程</button></div>'}
async function submitOil(){const s=Number(start.value),e=Number(end.value),o=Number(oil.value),b=document.getElementById("oilBtn");if(!s||!e||!o)return toast("請完整填寫");if(e<=s)return toast("結束里程必須大於起始里程");if(e-s>300)return toast("單次里程超過 300 公里");busy(b,true,"傳送中...");try{const r=await api({mode:"oil",start:s,end:e,oilPrice:o});summary=r.summary||summary;toast("里程回報成功");showAll()}catch(x){toast(x.message)}finally{busy(b,false,"送出里程")}}
async function salarySlip(){try{const m=document.getElementById("month").value==="all"?String(new Date().getMonth()+1).padStart(2,"0"):document.getElementById("month").value,r=await api({mode:"salarySlip",month:m}),w=window.open("","_blank");if(!w)return toast("瀏覽器阻擋新視窗");w.document.write(r.html);w.document.close()}catch(e){toast(e.message)}}
function busy(b,x,t){if(b){b.disabled=x;b.textContent=t}}function msg(t){document.getElementById("msg").textContent=t||""}
function toast(t){const x=document.getElementById("toast");x.textContent=t;x.classList.remove("hidden");clearTimeout(toast.t);toast.t=setTimeout(()=>x.classList.add("hidden"),2600)}
function esc(v){return String(v??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;")}
