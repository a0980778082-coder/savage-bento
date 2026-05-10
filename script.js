const API_URL = "https://script.google.com/macros/s/AKfycbyBESdAi94VoMo8AAa_1FgRfWA-qyL-SUxsqUuQhSmdqof81gyRSAKEiTRRPkemc6j5/exec"; 

let scheduleData = [];
let offRequestsData = [];
let userRate = 0; 
let currentUser = "";
let currentPin = "";
let currentTab = "today";
let selectedDates = []; 
let serverCalculatedHrs = 0;
let serverCalculatedBasePay = 0;

async function login() {
    currentUser = document.getElementById('loginName').value;
    currentPin = document.getElementById('loginPin').value;
    if (!currentUser || !currentPin) return alert("請登入");
    const btn = document.getElementById('loginBtn');
    btn.innerText = "驗證中..."; btn.disabled = true;
    try {
        const resp = await fetch(`${API_URL}?name=${encodeURIComponent(currentUser)}&pin=${currentPin}`);
        const res = await resp.json();
        if (res === "AUTH_FAILED") {
            alert("❌ 密碼錯誤");
            btn.innerText = "進入系統"; btn.disabled = false;
        } else {
            scheduleData = res.schedule || [];
            offRequestsData = res.offRequests || [];
            userRate = res.rate || 0; 
            window.currentBonus = res.monthlyBonus || 0;
            serverCalculatedHrs = res.calculatedHrs || 0;
            serverCalculatedBasePay = res.calculatedBasePay || 0;
            document.getElementById('login-screen').style.display = 'none';
            document.getElementById('main-app').style.display = 'block';
            showToday();
        }
    } catch (e) { alert("連線失敗"); btn.innerText = "進入系統"; btn.disabled = false; }
}

// --- 排休功能 (我要排休) ---
function showOffCalendar() {
    currentTab = "applyOff";
    updateActive(3); 
    document.getElementById('filter-bar').style.display = 'none';
    document.getElementById('user-welcome').innerHTML = "<div>選擇日期辦理排休</div>";
    const list = document.getElementById('schedule-list');
    list.innerHTML = "";
    selectedDates = [];
    
    const cal = document.createElement('div');
    cal.style = "display:grid; grid-template-columns:repeat(7,1fr); gap:5px; background:white; padding:15px; border-radius:15px;";
    const now = new Date();
    for(let i=0; i<14; i++){
        let d = new Date(); d.setDate(now.getDate() + i);
        let dateStr = (d.getMonth()+1).toString().padStart(2,'0') + "/" + d.getDate().toString().padStart(2,'0');
        let dayBtn = document.createElement('div');
        dayBtn.innerText = dateStr;
        dayBtn.style = "padding:10px 5px; border:1px solid #eee; text-align:center; border-radius:8px; font-size:12px; cursor:pointer;";
        dayBtn.onclick = () => {
            if(selectedDates.includes(dateStr)) {
                selectedDates = selectedDates.filter(x => x !== dateStr);
                dayBtn.style.background = "white"; dayBtn.style.color = "black";
            } else {
                selectedDates.push(dateStr);
                dayBtn.style.background = "#e74c3c"; dayBtn.style.color = "white";
            }
        };
        cal.appendChild(dayBtn);
    }
    list.appendChild(cal);
    const form = document.createElement('div');
    form.innerHTML = `<select id="offSlot" style="width:100%; padding:12px; margin:15px 0; border-radius:8px;"><option value="全天排休">全天排休</option><option value="早班排休">早班排休</option><option value="晚班排休">晚班排休</option></select><textarea id="offNote" placeholder="原因" style="width:100%; padding:10px; border-radius:8px; box-sizing:border-box;"></textarea><button onclick="submitOff()" style="width:100%; padding:15px; background:#e74c3c; color:white; border:none; border-radius:12px; margin-top:15px; font-weight:bold;">送出排休申請</button>`;
    list.appendChild(form);
}

async function submitOff() {
    if(selectedDates.length === 0) return alert("請先選擇日期");
    const btn = event.target; btn.innerText = "傳送中..."; btn.disabled = true;
    try {
        const resp = await fetch(API_URL, { method: 'POST', body: JSON.stringify({ mode: "offRequest", name: currentUser, dates: selectedDates, slot: document.getElementById('offSlot').value, note: document.getElementById('offNote').value }) });
        if(await resp.text() === "SUCCESS") { alert("✅ 申請成功！"); location.reload(); }
    } catch (e) { alert("申請失敗"); btn.innerText = "送出排休申請"; btn.disabled = false; }
}

// --- 外送補貼 ---
function showSubsidyModal() {
    const modalHtml = `<div id="subsidy-modal" style="position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.8);display:flex;align-items:center;justify-content:center;z-index:9999;"><div style="background:white;padding:25px;border-radius:15px;width:85%;max-width:400px;"><h3 style="margin:0 0 15px 0;">⛽ 外送里程回報</h3><label>起始里程：<input type="number" id="startKm" style="width:100%;padding:10px;margin-top:5px;"></label><label>結束里程：<input type="number" id="endKm" style="width:100%;padding:10px;margin-top:5px;"></label><label>今日油價：<input type="number" step="0.1" id="oilPrice" value="29.5" style="width:100%;padding:10px;margin-top:5px;"></label><div style="display:flex;gap:10px;margin-top:15px;"><button onclick="submitSubsidy()" style="flex:1;padding:12px;background:#27ae60;color:white;border:none;border-radius:8px;">送出</button><button onclick="document.getElementById('subsidy-modal').remove()" style="flex:1;padding:12px;background:#999;color:white;border:none;border-radius:8px;">取消</button></div></div></div>`;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
}

async function submitSubsidy() {
    const start = document.getElementById('startKm').value; const end = document.getElementById('endKm').value; const oil = document.getElementById('oilPrice').value;
    if(!start || !end || !oil) return alert("請填完整");
    const btn = event.target; btn.innerText = "傳送中..."; btn.disabled = true;
    try {
        const resp = await fetch(API_URL, { method: 'POST', body: JSON.stringify({ mode: "oil", name: currentUser, start: start, end: end, oilPrice: oil }) });
        if(await resp.text() === "SUCCESS") { alert("✅ 回報成功！"); document.getElementById('subsidy-modal').remove(); applyMonthFilter(); }
    } catch (e) { alert("失敗"); }
    btn.innerText = "送出"; btn.disabled = false;
}

// --- 介面渲染 ---
function downloadPDF(month) { window.location.href = `${API_URL}?mode=downloadPDF&name=${encodeURIComponent(currentUser)}&pin=${currentPin}&month=${month}`; }

async function applyMonthFilter() {
    const m = document.getElementById('monthFilter').value;
    if (m !== 'all') {
        document.getElementById('user-welcome').innerHTML = "<div>同步中...</div>";
        try {
            const resp = await fetch(`${API_URL}?name=${encodeURIComponent(currentUser)}&pin=${currentPin}&month=${m}`);
            const res = await resp.json();
            window.currentBonus = res.monthlyBonus || 0;
            serverCalculatedHrs = res.calculatedHrs || 0;
            serverCalculatedBasePay = res.calculatedBasePay || 0;
            scheduleData = res.schedule || [];
            offRequestsData = res.offRequests || [];
        } catch (e) { console.log("同步失敗"); }
    }
    if (currentTab === "week") showThisWeek(m);
    else if (currentTab === "off") showMyOff(m);
}

function render(data, title, type = 'schedule') {
    const m = document.getElementById('monthFilter').value;
    let sub = "";
    if (type === 'schedule' && m !== 'all' && currentTab === 'week') {
        let total = (userRate >= 1000) ? (Number(userRate) + Number(window.currentBonus)) : (serverCalculatedBasePay + Number(window.currentBonus));
        sub = `<div style="font-size:0.85em;color:#e67e22;margin-top:5px;font-weight:bold;">本月預估：$${total.toLocaleString()}<br><button onclick="downloadPDF('${m}')" style="margin-top:8px;padding:5px 10px;background:#34495e;color:white;border:none;border-radius:5px;font-size:11px;">查看薪資單</button> <button onclick="showSubsidyModal()" style="padding:5px 10px;background:#2980b9;color:white;border:none;border-radius:5px;font-size:11px;">⛽ 里程回報</button></div>`;
    }
    document.getElementById('user-welcome').innerHTML = `<div>${title}${sub}</div>`;
    const list = document.getElementById('schedule-list');
    list.innerHTML = data.length === 0 ? '<p style="text-align:center;padding:50px;color:#999;">查無紀錄</p>' : "";
    data.forEach(item => {
        const d = type==='off'?item["申請日期"]:item.date;
        const n = type==='off'?item["員工姓名"]:item.employeeName;
        const s = type==='off'?item["申請時段"]:item.timeSlot;
        if (n === "宋菁" || n === "小金") return;
        const card = document.createElement('div');
        const isOff = type==='off'||(s&&s.includes('排休'));
        card.style = `border-left:8px solid ${isOff?'#e74c3c':'#27ae60'};background:white;margin:12px 0;padding:15px;border-radius:12px;display:flex;justify-content:space-between;align-items:center;box-shadow:0 3px 6px rgba(0,0,0,0.05);`;
        card.innerHTML = `<div style="flex:1;"><div style="font-weight:bold;">${d}</div><div style="color:${isOff?'#e74c3c':'#7f8c8d'};margin-top:5px;font-weight:bold;">${s}</div></div><div style="font-weight:bold;">${n}</div>`;
        list.appendChild(card);
    });
}

function showToday() { currentTab="today"; updateActive(0); document.getElementById('filter-bar').style.display='none'; const now=new Date(); const t=(now.getMonth()+1).toString().padStart(2,'0')+"/"+now.getDate().toString().padStart(2,'0'); render(scheduleData.filter(i=>i.date===t), `今日班表 (${t})`); }
function showThisWeek(m="all") { currentTab="week"; updateActive(1); document.getElementById('filter-bar').style.display='flex'; let f=(m==="all")?scheduleData:scheduleData.filter(i=>i.date&&i.date.startsWith(m)); render(f, m==="all"?"全店總表":`${m}月 全店總表`); }
function showMyOff(m="all") { currentTab="off"; updateActive(2); document.getElementById('filter-bar').style.display='flex'; let my=offRequestsData.filter(i=>String(i["員工姓名"]).trim()===String(currentUser).trim()); if(m!=="all") my=my.filter(i=>i["申請日期"]&&i["申請日期"].startsWith(m)); render(my, `${currentUser} 的申請紀錄`, 'off'); }
function updateActive(idx) { const btns=document.querySelectorAll('.tab-bar button'); btns.forEach((b,i)=>b.style.color=(i===idx)?'#e74c3c':'#7f8c8d'); }