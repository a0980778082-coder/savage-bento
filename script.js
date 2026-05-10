const API_URL = "https://script.google.com/macros/s/AKfycbyBESdAi94VoMo8AAa_1FgRfWA-qyL-SUxsqUuQhSmdqof81gyRSAKEiTRRPkemc6j5/exec"; 

let scheduleData = [];
let offRequestsData = [];
let userRate = 0; 
let currentUser = "";
let currentPin = "";
let currentTab = "today";
let serverCalculatedHrs = 0;
let serverCalculatedBasePay = 0;

async function login() {
    currentUser = document.getElementById('loginName').value;
    currentPin = document.getElementById('loginPin').value;
    if (!currentUser || !currentPin) return alert("請選名字並填寫密碼");
    const btn = document.getElementById('loginBtn');
    btn.innerText = "驗證中..."; btn.disabled = true;
    try {
        const resp = await fetch(`${API_URL}?name=${encodeURIComponent(currentUser)}&pin=${currentPin}`);
        const res = await resp.json();
        if (res === "AUTH_FAILED") {
            alert("❌ 密碼錯誤！");
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
    } catch (e) { alert("連線失敗！"); btn.innerText = "進入系統"; btn.disabled = false; }
}

function showSubsidyModal() {
    const modalHtml = `
    <div id="subsidy-modal" style="position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.8);display:flex;align-items:center;justify-content:center;z-index:9999;">
        <div style="background:white;padding:25px;border-radius:15px;width:85%;max-width:400px;">
            <h3 style="margin:0 0 15px 0;">⛽ 外送里程回報</h3>
            <label style="display:block;margin-bottom:10px;">起始里程：<input type="number" id="startKm" placeholder="例如: 12500" style="width:100%;padding:10px;margin-top:5px;box-sizing:border-box;"></label>
            <label style="display:block;margin-bottom:10px;">結束里程：<input type="number" id="endKm" placeholder="例如: 12515" style="width:100%;padding:10px;margin-top:5px;box-sizing:border-box;"></label>
            <label style="display:block;margin-bottom:20px;">今日 92 油價：<input type="number" step="0.1" id="oilPrice" value="29.5" style="width:100%;padding:10px;margin-top:5px;box-sizing:border-box;"></label>
            <div style="display:flex;gap:10px;">
                <button onclick="submitSubsidy()" style="flex:1;padding:12px;background:#27ae60;color:white;border:none;border-radius:8px;font-weight:bold;">送出回報</button>
                <button onclick="document.getElementById('subsidy-modal').remove()" style="flex:1;padding:12px;background:#999;color:white;border:none;border-radius:8px;">取消</button>
            </div>
        </div>
    </div>`;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
}

async function submitSubsidy() {
    const start = document.getElementById('startKm').value;
    const end = document.getElementById('endKm').value;
    const oil = document.getElementById('oilPrice').value;
    if(!start || !end || !oil) return alert("請填寫完整資訊");
    if(parseFloat(end) <= parseFloat(start)) return alert("結束里程必須大於起始里程");

    const btn = event.target;
    btn.innerText = "傳送中..."; btn.disabled = true;
    try {
        const resp = await fetch(API_URL, {
            method: 'POST',
            body: JSON.stringify({ name: currentUser, start: start, end: end, oilPrice: oil })
        });
        const result = await resp.text();
        if(result === "SUCCESS") {
            alert("✅ 回報成功！油錢已自動累計至薪資。");
            document.getElementById('subsidy-modal').remove();
            applyMonthFilter(); // 重新整理薪資數據
        } else { alert("❌ 儲存失敗：" + result); }
    } catch (e) { alert("❌ 網路連線失敗"); }
    btn.innerText = "送出回報"; btn.disabled = false;
}

function calculateSalary(month) {
    let bonus = Number(window.currentBonus) || 0;
    let total = (userRate >= 1000) ? (Number(userRate) + bonus) : (serverCalculatedBasePay + bonus);
    return { text: `本月預估薪資：$${total.toLocaleString()} (含獎金/補貼)` };
}

async function applyMonthFilter() {
    const m = document.getElementById('monthFilter').value;
    if (m !== 'all') {
        document.getElementById('user-welcome').innerHTML = "<div>資料同步中...</div>";
        try {
            const resp = await fetch(`${API_URL}?name=${encodeURIComponent(currentUser)}&pin=${currentPin}&month=${m}`);
            const res = await resp.json();
            window.currentBonus = res.monthlyBonus || 0;
            serverCalculatedHrs = res.calculatedHrs || 0;
            serverCalculatedBasePay = res.calculatedBasePay || 0;
        } catch (e) { console.log("同步失敗"); }
    }
    if (currentTab === "week") showThisWeek(m);
    else if (currentTab === "off") showMyOff(m);
}

function downloadPDF(month) {
    window.location.href = `${API_URL}?mode=downloadPDF&name=${encodeURIComponent(currentUser)}&pin=${currentPin}&month=${month}`;
}

function render(data, title, type = 'schedule') {
    const m = document.getElementById('monthFilter').value;
    let sub = "";
    if (type === 'schedule' && m !== 'all' && currentTab === 'week') {
        const res = calculateSalary(m);
        sub = `<div style="font-size:0.85em;color:#e67e22;margin-top:5px;font-weight:bold;">${res.text}<br><button onclick="downloadPDF('${m}')" style="margin-top:8px;padding:5px 12px;background:#34495e;color:white;border:none;border-radius:5px;font-size:12px;">查看薪資明細</button> <button onclick="showSubsidyModal()" style="padding:5px 12px;background:#2980b9;color:white;border:none;border-radius:5px;font-size:12px;">⛽ 里程回報</button></div>`;
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
        card.innerHTML = `<div style="flex:1;"><div style="font-weight:bold;">${d}</div><div style="color:${isOff?'#e74c3c':'#7f8c8d'};margin-top:5px;font-weight:bold;">${s}</div></div><div style="font-weight:bold;color:#34495e;">${n}</div>`;
        list.appendChild(card);
    });
}

function showToday() { currentTab="today"; updateActive(0); document.getElementById('filter-bar').style.display='none'; const now=new Date(); const t=(now.getMonth()+1).toString().padStart(2,'0')+"/"+now.getDate().toString().padStart(2,'0'); render(scheduleData.filter(i=>i.date===t), `今日班表 (${t})`); }
function showThisWeek(m="all") { currentTab="week"; updateActive(1); document.getElementById('filter-bar').style.display='flex'; let f=(m==="all")?scheduleData:scheduleData.filter(i=>i.date&&i.date.startsWith(m)); render(f, m==="all"?"全店總表":`${m}月 全店總表`); }
function showMyOff(m="all") { currentTab="off"; updateActive(2); document.getElementById('filter-bar').style.display='flex'; let my=offRequestsData.filter(i=>String(i["員工姓名"]).trim()===String(currentUser).trim()); if(m!=="all") my=my.filter(i=>i["申請日期"]&&i["申請日期"].startsWith(m)); render(my, `${currentUser} 的申請`, 'off'); }
function updateActive(idx) { const btns=document.querySelectorAll('.tab-bar button'); btns.forEach((b,i)=>b.style.color=(i===idx)?'#e74c3c':'#7f8c8d'); }