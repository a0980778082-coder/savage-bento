const API_URL = "https://script.google.com/macros/s/AKfycbyBESdAi94VoMo8AAa_1FgRfWA-qyL-SUxsqUuQhSmdqof81gyRSAKEiTRRPkemc6j5/exec"; 

let scheduleData = [];
let offRequestsData = [];
let userRate = 0; 
let currentUser = "";
let currentPin = "";
let currentTab = "today";
let selectedDates = [];

// 登入
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
            document.getElementById('login-screen').style.display = 'none';
            document.getElementById('main-app').style.display = 'block';
            showToday();
        }
    } catch (e) { 
        console.error(e);
        alert("連線失敗！請確認大腦 API 網址是否正確並已設為所有人"); 
        btn.innerText = "進入系統"; btn.disabled = false; 
    }
}

// 薪資計算 (本越薪資預估)
function calculateSalary(month) {
    if (userRate >= 1000) return { text: `本越薪資預估：$${userRate}` };
    let hrs = 0;
    const myS = scheduleData.filter(i => String(i.employeeName).trim() === currentUser.trim() && i.date.startsWith(month));
    myS.forEach(i => {
        const n = i.timeSlot.match(/\d+/g);
        if (n && n.length >= 2) { let h = parseInt(n[1]) - parseInt(n[0]); if (h > 0) hrs += h; }
    });
    return { text: `本越薪資預估：${hrs}hr / $${hrs * userRate}` };
}

// 日曆連結
function getCalendarLink(dStr, tSlot) {
    const y = new Date().getFullYear();
    const [m, d] = dStr.split('/');
    const full = `${y}${m}${d}`;
    const t = encodeURIComponent(`小野人上班：${tSlot}`);
    let s = "090000", e = "140000";
    if (tSlot.includes("晚") || tSlot.includes("17")) { s = "170000"; e = "210000"; }
    return `https://www.google.com/calendar/render?action=TEMPLATE&text=${t}&dates=${full}T${s}/${full}T${e}&location=${encodeURIComponent('小野人Dade店')}&sf=true&output=xml`;
}

// 畫面渲染
function render(data, title, type = 'schedule') {
    let sub = "";
    const mF = document.getElementById('monthFilter').value;
    if (type === 'schedule' && mF !== 'all' && currentTab === 'week') {
        const res = calculateSalary(mF); sub = `<div style="font-size:0.85em; color:#e67e22; margin-top:5px; font-weight:bold;">${res.text}</div>`;
    }
    document.getElementById('user-welcome').innerHTML = `<div>${title}${sub}</div>`;
    const list = document.getElementById('schedule-list');
    list.innerHTML = data.length === 0 ? '<p style="text-align:center; padding:50px; color:#999;">查無紀錄</p>' : "";
    data.forEach(item => {
        const d = type === 'off' ? item["申請日期"] : item.date;
        const n = type === 'off' ? item["員工姓名"] : item.employeeName;
        const s = type === 'off' ? item["申請時段"] : item.timeSlot;
        const note = type === 'off' ? (item["備註"] || "") : "";
        if (n === "宋菁" || n === "小金") return;
        const card = document.createElement('div');
        const isOff = type === 'off' || (s && s.includes('排休'));
        card.style = `border-left: 8px solid ${isOff?'#e74c3c':'#27ae60'}; background: white; margin: 12px 0; padding: 15px; border-radius: 12px; box-shadow: 0 3px 6px rgba(0,0,0,0.05); display: flex; justify-content: space-between; align-items: center;`;
        const cal = (!isOff && type === 'schedule' && n === currentUser) ? `<a href="${getCalendarLink(d, s)}" target="_blank" style="color:#3498db; margin-left:10px;"><i class="fa-regular fa-calendar-plus"></i></a>` : "";
        card.innerHTML = `<div style="flex:1;"><div style="font-weight:bold; display:flex; align-items:center;">${d}${cal}</div><div style="color:${isOff?'#e74c3c':'#7f8c8d'}; margin-top:5px; font-weight:bold;">${s}</div>${note?`<div style="font-size:0.85em; color:#999; margin-top:3px;">原因：${note}</div>`:""}</div><div style="font-weight:bold;">${n}</div>`;
        list.appendChild(card);
    });
}

// 其他按鈕功能
function showToday() { currentTab = "today"; updateActive(0); document.getElementById('filter-bar').style.display='none'; const now = new Date(); const t = (now.getMonth()+1).toString().padStart(2,'0')+"/"+now.getDate().toString().padStart(2,'0'); render(scheduleData.filter(i=>i.date===t), `今日班表 (${t})`); }
function showThisWeek(m="all") { currentTab = "week"; updateActive(1); document.getElementById('filter-bar').style.display='flex'; let f = (m==="all")?scheduleData:scheduleData.filter(i=>i.date&&i.date.startsWith(m)); render(f, m==="all"?"全店總表":`${m}月 全店總表`); }
function applyMonthFilter() { const m = document.getElementById('monthFilter').value; if(currentTab==="week") showThisWeek(m); else if(currentTab==="off") showMyOff(m); }
function showMyOff(m="all") { currentTab = "off"; updateActive(2); document.getElementById('filter-bar').style.display='flex'; let my = offRequestsData.filter(i=>String(i["員工姓名"]).trim()===String(currentUser).trim()); if(m!=="all") my = my.filter(i=>i["申請日期"]&&i["申請日期"].startsWith(m)); render(my, `${currentUser} 的 ${m==='all'?'所有':m+'月'} 申請`, 'off'); }
function updateActive(idx) { const btns = document.querySelectorAll('.tab-bar button'); btns.forEach((b,i)=>b.style.color=(i===idx)?'#e74c3c':'#7f8c8d'); }
function toggleModal(s) { document.getElementById('off-form-modal').style.display=s?'flex':'none'; if(s) { selectedDates=[]; updateDateUI(); document.getElementById('offNote').value=''; } }
function addDateToList() { const i = document.getElementById('offDateInput'); if(!i.value) return; const p = i.value.split('-'); const d = `${p[1]}/${p[2]}`; if(!selectedDates.includes(d)) { selectedDates.push(d); updateDateUI(); } i.value=''; }
function updateDateUI() { document.getElementById('selected-dates-container').innerHTML = selectedDates.map(d=>`<span style="background:#eee; padding:5px 10px; border-radius:15px; margin:3px; display:inline-block; font-size:13px;">${d}</span>`).join(''); }
async function submitMultipleOffRequests() {
    const note = document.getElementById('offNote').value;
    const btn = document.getElementById('submitOffBtn');
    if(selectedDates.length===0 || !note) return alert("請選日期與原因");
    let w = ""; selectedDates.forEach(date => { const o = offRequestsData.filter(i => i["申請日期"]===date && i["員工姓名"].trim()!==currentUser.trim()); if(o.length>0) w += `⚠️ ${date} 同事 (${o.map(i=>i["員工姓名"]).join('、')}) 已排休\n`; });
    if(!confirm(w?`${w}\n確定送出？`:`確定申請？`)) return;
    btn.disabled=true; btn.innerText="傳送中...";
    try { for(let date of selectedDates) { await fetch(API_URL,{method:'POST',mode:'no-cors',body:JSON.stringify({name:currentUser,pin:currentPin,date:date,note:note})}); } alert("✅ 成功！"); btn.disabled=false; btn.innerText="送出申請"; toggleModal(false); showToday(); } catch(e) { alert("❌ 失敗"); btn.disabled=false; btn.innerText="送出申請"; }
}