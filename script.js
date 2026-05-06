const API_URL = "https://script.google.com/macros/s/AKfycbyBESdAi94VoMo8AAa_1FgRfWA-qyL-SUxsqUuQhSmdqof81gyRSAKEiTRRPkemc6j5/exec"; 

let scheduleData = [];
let offRequestsData = [];
let userRate = 0; 
let currentUser = "";
let currentPin = "";
let currentTab = "today";
let selectedDates = [];

// 1. 登入系統
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
            window.currentBonus = res.totalBonus || 0;
            document.getElementById('login-screen').style.display = 'none';
            document.getElementById('main-app').style.display = 'block';
            showToday();
        }
    } catch (e) { alert("連線失敗！"); btn.innerText = "進入系統"; btn.disabled = false; }
}

// 2. 薪資計算邏輯 (優先採用後台手動微調時數)
function calculateSalary(month) {
    let bonus = Number(window.currentBonus) || 0;
    
    // 正職判斷 (底薪 >= 1000)
    if (userRate >= 1000) {
        let total = Number(userRate) + bonus;
        return { text: `本月薪資預估：$${total.toLocaleString()} (含獎金)` };
    }
    
    // 時薪夥伴計算
    let hrs = 0;
    const myS = scheduleData.filter(i => String(i.employeeName).trim() === currentUser.trim() && i.date.startsWith(month));
    
    myS.forEach(i => {
        // 如果後台 G 欄有填寫「實撥時數」，優先使用該數值
        if (i.actualHrs && !isNaN(i.actualHrs) && i.actualHrs !== "") {
            hrs += Number(i.actualHrs);
        } else {
            const n = i.timeSlot.match(/\d+/g);
            if (n && n.length >= 2) { 
                let h = parseInt(n[1]) - parseInt(n[0]); 
                if (h > 0) hrs += h; 
            }
        }
    });
    
    let total = (hrs * userRate) + bonus;
    return { text: `本月總時數：${hrs}hr / 薪資預估：$${total.toLocaleString()}` };
}

// 3. 下載 PDF 薪資單
async function downloadPDF(month) {
    const btn = event.target;
    const originalText = btn.innerText;
    btn.innerText = "產生中..."; btn.disabled = true;

    try {
        const url = `${API_URL}?mode=downloadPDF&name=${encodeURIComponent(currentUser)}&pin=${currentPin}&month=${month}`;
        const resp = await fetch(url);
        const base64 = await resp.text();
        
        const link = document.createElement('a');
        link.href = `data:application/pdf;base64,${base64}`;
        link.download = `${currentUser}_${month}月薪資單.pdf`;
        link.click();
        
        btn.innerText = originalText; btn.disabled = false;
    } catch (e) {
        alert("下載失敗，請稍後再試");
        btn.innerText = originalText; btn.disabled = false;
    }
}

// 4. 畫面渲染
function render(data, title, type = 'schedule') {
    let sub = "";
    const m = document.getElementById('monthFilter').value;
    
    // 當在「全店總表」且有選月份時，顯示薪資預估與下載按鈕
    if (type === 'schedule' && m !== 'all' && currentTab === 'week') {
        const res = calculateSalary(m);
        sub = `
            <div style="font-size:0.85em; color:#e67e22; margin-top:5px; font-weight:bold;">
                ${res.text}
                <button onclick="downloadPDF('${m}')" style="margin-left:8px; padding:3px 10px; background:#34495e; color:white; border:none; border-radius:5px; font-size:11px; cursor:pointer;">下載PDF</button>
            </div>`;
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
        
        const calBtn = (!isOff && type === 'schedule' && n === currentUser) ? `<a href="${getCalendarLink(d, s)}" target="_blank" style="color: #3498db; margin-left: 10px;"><i class="fa-regular fa-calendar-plus"></i></a>` : "";
        
        card.innerHTML = `<div style="flex:1;"><div style="font-weight:bold; display:flex; align-items:center;">${d}${calBtn}</div><div style="color:${isOff?'#e74c3c':'#7f8c8d'}; margin-top:5px; font-weight:bold;">${s}</div>${note ? `<div style="font-size:0.85em; color:#999; margin-top:3px;">原因：${note}</div>` : ""}</div><div style="font-weight:bold; color:#34495e;">${n}</div>`;
        list.appendChild(card);
    });
}

// 5. 導覽功能與工具函式
function showToday() { currentTab = "today"; updateActive(0); document.getElementById('filter-bar').style.display = 'none'; const now = new Date(); const t = (now.getMonth() + 1).toString().padStart(2, '0') + "/" + now.getDate().toString().padStart(2, '0'); render(scheduleData.filter(i => i.date === t), `今日班表 (${t})`); }
function showThisWeek(m = "all") { currentTab = "week"; updateActive(1); document.getElementById('filter-bar').style.display = 'flex'; let f = (m === "all") ? scheduleData : scheduleData.filter(i => i.date && i.date.startsWith(m)); render(f, m === "all" ? "全店總表" : `${m}月 全店總表`); }
function applyMonthFilter() { const m = document.getElementById('monthFilter').value; if (currentTab === "week") showThisWeek(m); else if (currentTab === "off") showMyOff(m); }
function showMyOff(m = "all") { currentTab = "off"; updateActive(2); document.getElementById('filter-bar').style.display = 'flex'; let my = offRequestsData.filter(i => String(i["員工姓名"]).trim() === String(currentUser).trim()); if (m !== "all") my = my.filter(i => i["申請日期"] && i["申請日期"].startsWith(m)); render(my, `${currentUser} 的 ${m === 'all' ? '所有' : m + '月'} 申請`, 'off'); }
function updateActive(idx) { const btns = document.querySelectorAll('.tab-bar button'); btns.forEach((b, i) => b.style.color = (i===idx)? '#e74c3c' : '#7f8c8d'); }

function getCalendarLink(dateStr, timeSlot) {
    const year = new Date().getFullYear();
    const [month, day] = dateStr.split('/');
    const fullDate = `${year}${month}${day}`;
    const title = encodeURIComponent(`小野人上班：${timeSlot}`);
    let startTime = "090000", endTime = "140000";
    if (timeSlot.includes("晚") || timeSlot.includes("17")) { startTime = "170000"; endTime = "210000"; }
    return `https://www.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${fullDate}T${startTime}/${fullDate}T${endTime}&location=${encodeURIComponent('小野人Dade店')}&sf=true&output=xml`;
}

// 6. 排休申請 (含碰撞偵測)
function toggleModal(s) { document.getElementById('off-form-modal').style.display = s ? 'flex' : 'none'; if(s) { selectedDates = []; document.getElementById('selected-dates-container').innerHTML = ''; document.getElementById('offNote').value = ''; } }
function addDateToList() { const input = document.getElementById('offDateInput'); if (!input.value) return; const p = input.value.split('-'); const d = `${p[1]}/${p[2]}`; if (!selectedDates.includes(d)) { selectedDates.push(d); document.getElementById('selected-dates-container').innerHTML += `<span style="background:#eee; padding:5px; margin:3px; border-radius:5px;">${d}</span>`; } input.value = ''; }
async function submitMultipleOffRequests() {
    const note = document.getElementById('offNote').value;
    const btn = document.getElementById('submitOffBtn');
    if (selectedDates.length === 0 || !note) return alert("請選日期與原因");
    let warn = ""; selectedDates.forEach(date => { const others = offRequestsData.filter(item => item["申請日期"] === date && item["員工姓名"].trim() !== currentUser.trim()); if (others.length > 0) warn += `⚠️ ${date} 同事 (${others.map(i=>i["員工姓名"]).join('、')}) 已排休\n`; });
    if (!confirm(warn ? `${warn}\n確定要送出申請嗎？` : "確定送出排休申請？")) return;
    btn.disabled = true; btn.innerText = "傳送中...";
    try {
        for (let date of selectedDates) {
            await fetch(API_URL, { method: 'POST', mode: 'no-cors', body: JSON.stringify({ name: currentUser, date: date, note: note }) });
        }
        alert("✅ 申請成功！");
        btn.disabled = false; btn.innerText = "送出申請";
        toggleModal(false); showToday(); 
    } catch (e) { alert("❌ 失敗"); btn.disabled = false; btn.innerText = "送出申請"; }
}