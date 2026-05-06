const API_URL = "https://script.google.com/macros/s/AKfycbyBESdAi94VoMo8AAa_1FgRfWA-qyL-SUxsqUuQhSmdqof81gyRSAKEiTRRPkemc6j5/exec"; 

let scheduleData = [];
let offRequestsData = [];
let userRate = 0; 
let currentBonus = 0; // 存儲總獎金
let currentUser = "";
let currentPin = "";
let currentTab = "today";
let selectedDates = [];

// 1. 登入
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
            window.currentBonus = res.totalBonus || 0; // 儲存獎金資訊
            document.getElementById('login-screen').style.display = 'none';
            document.getElementById('main-app').style.display = 'block';
            showToday();
        }
    } catch (e) { alert("連線失敗！"); btn.innerText = "進入系統"; btn.disabled = false; }
}

// 2. 薪資計算邏輯 (含下載按鈕文字)
function calculateSalary(month) {
    let bonus = window.currentBonus || 0;
    if (userRate >= 1000) {
        let total = userRate + bonus;
        return { text: `本月薪資預估：$${userRate} (底) + $${bonus} (獎) = $${total}` };
    }

    let hrs = 0;
    const myS = scheduleData.filter(i => String(i.employeeName).trim() === currentUser.trim() && i.date.startsWith(month));
    myS.forEach(i => {
        const n = i.timeSlot.match(/\d+/g);
        if (n && n.length >= 2) { let h = parseInt(n[1]) - parseInt(n[0]); if (h > 0) hrs += h; }
    });
    
    let base = hrs * userRate;
    let total = base + bonus;
    return { text: `本月薪資預估：$${base} (時) + $${bonus} (獎) = $${total}` };
}

// 3. 下載 PDF 功能
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
        alert("下載失敗");
        btn.innerText = originalText; btn.disabled = false;
    }
}

// 4. 畫面渲染 (核心：加入下載按鈕)
function render(data, title, type = 'schedule') {
    let subTitle = "";
    const month = document.getElementById('monthFilter').value;
    
    if (type === 'schedule' && month !== 'all' && currentTab === 'week') {
        const res = calculateSalary(month);
        subTitle = `
            <div style="font-size:0.85em; color:#e67e22; margin-top:5px; font-weight:bold;">
                ${res.text}
                <button onclick="downloadPDF('${month}')" style="margin-left:10px; padding:3px 10px; background:#34495e; color:white; border:none; border-radius:8px; font-size:12px; cursor:pointer;">下載PDF</button>
            </div>`;
    }

    document.getElementById('user-welcome').innerHTML = `<div>${title}${subTitle}</div>`;
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
        
        const calBtn = (!isOff && type === 'schedule' && n === currentUser) ? `<a href="${getCalendarLink(d, s)}" target="_blank" style="color: #3498db; margin-left: 10px; font-size: 1.2em;"><i class="fa-regular fa-calendar-plus"></i></a>` : "";
        
        card.innerHTML = `<div style="flex:1;"><div style="font-weight:bold; display:flex; align-items:center; color:#2c3e50;">${d}${calBtn}</div><div style="color:${isOff?'#e74c3c':'#7f8c8d'}; margin-top:5px; font-weight:bold;">${s}</div>${note ? `<div style="font-size:0.85em; color:#999; margin-top:3px;">原因：${note}</div>` : ""}</div><div style="font-weight:bold; color:#34495e;">${n}</div>`;
        list.appendChild(card);
    });
}

// 5. 其他功能 (showToday, showThisWeek, showMyOff 等維持不變)
function showToday() { currentTab = "today"; updateActive(0); document.getElementById('filter-bar').style.display = 'none'; const now = new Date(); const today = (now.getMonth() + 1).toString().padStart(2, '0') + "/" + now.getDate().toString().padStart(2, '0'); render(scheduleData.filter(i => i.date === today), `今日班表 (${today})`); }
function showThisWeek(m = "all") { currentTab = "week"; updateActive(1); document.getElementById('filter-bar').style.display = 'flex'; let filtered = (m === "all") ? scheduleData : scheduleData.filter(i => i.date && i.date.startsWith(m)); render(filtered, m === "all" ? "全店總表" : `${m}月 全店總表`); }
function applyMonthFilter() { const month = document.getElementById('monthFilter').value; if (currentTab === "week") showThisWeek(month); else if (currentTab === "off") showMyOff(month); }
function showMyOff(m = "all") { currentTab = "off"; updateActive(2); document.getElementById('filter-bar').style.display = 'flex'; let myData = offRequestsData.filter(i => String(i["員工姓名"]).trim() === String(currentUser).trim()); if (m !== "all") myData = myData.filter(i => i["申請日期"] && i["申請日期"].startsWith(m)); render(myData, `${currentUser} 的 ${m === 'all' ? '所有' : m + '月'} 申請`, 'off'); }
function updateActive(idx) { const btns = document.querySelectorAll('.tab-bar button'); btns.forEach((b, i) => b.style.color = (i===idx)? '#e74c3c' : '#7f8c8d'); }
function getCalendarLink(dateStr, timeSlot) { const year = new Date().getFullYear(); const [month, day] = dateStr.split('/'); const fullDate = `${year}${month}${day}`; const title = encodeURIComponent(`小野人上班：${timeSlot}`); const location = encodeURIComponent(`小野人餐盒製造所 (Dade店)`); let startTime = "090000", endTime = "140000"; if (timeSlot.includes("晚") || timeSlot.includes("17")) { startTime = "170000"; endTime = "210000"; } return `https://www.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${fullDate}T${startTime}/${fullDate}T${endTime}&location=${location}&sf=true&output=xml`; }
function toggleModal(s) { document.getElementById('off-form-modal').style.display = s ? 'flex' : 'none'; if(s) { selectedDates = []; updateDateUI(); document.getElementById('offNote').value = ''; } }
function addDateToList() { const input = document.getElementById('offDateInput'); if (!input.value) return; const parts = input.value.split('-'); const d = `${parts[1]}/${parts[2]}`; if (!selectedDates.includes(d)) { selectedDates.push(d); updateDateUI(); } input.value = ''; }
function updateDateUI() { document.getElementById('selected-dates-container').innerHTML = selectedDates.map(d => `<span style="background:#eee; padding:5px 10px; border-radius:15px; margin:3px; display:inline-block; font-size:13px;">${d}</span>`).join(''); }
async function submitMultipleOffRequests() {
    const note = document.getElementById('offNote').value;
    const btn = document.getElementById('submitOffBtn');
    if (selectedDates.length === 0 || !note) return alert("請選日期與原因");
    let warningMsg = "";
    selectedDates.forEach(date => {
        const others = offRequestsData.filter(item => item["申請日期"] === date && item["員工姓名"].trim() !== currentUser.trim());
        if (others.length > 0) { const names = others.map(i => i["員工姓名"]).join('、'); warningMsg += `⚠️ ${date} 已經有同事 (${names}) 排休了\n`; }
    });
    let confirmMsg = `確定要申請這 ${selectedDates.length} 天排休嗎？`;
    if (warningMsg) confirmMsg = `${warningMsg}\n店裡可能人手不足，確定還要送出申請嗎？`;
    if (!confirm(confirmMsg)) return;
    btn.disabled = true; btn.style.background = "#ccc"; btn.innerText = "傳送中...";
    try {
        for (let date of selectedDates) {
            await fetch(API_URL, { method: 'POST', mode: 'no-cors', body: JSON.stringify({ name: currentUser, pin: currentPin, date: date, note: note }) });
        }
        alert("✅ 申請成功！");
        btn.disabled = false; btn.style.background = "#e74c3c"; btn.innerText = "送出申請";
        toggleModal(false); showToday(); 
    } catch (e) { alert("❌ 傳送失敗"); btn.disabled = false; btn.style.background = "#e74c3c"; btn.innerText = "送出申請"; }
}