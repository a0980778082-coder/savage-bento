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

function calculateSalary(month) {
    let bonus = Number(window.currentBonus) || 0;
    if (userRate >= 1000) {
        let total = Number(userRate) + bonus;
        return { text: `本月薪資預估：$${total.toLocaleString()} (含獎金/扣款)` };
    }
    let total = serverCalculatedBasePay + bonus;
    return { text: `本月總時數：${serverCalculatedHrs}hr / 薪資預估：$${total.toLocaleString()}` };
}

async function applyMonthFilter() {
    const m = document.getElementById('monthFilter').value;
    if (m !== 'all') {
        document.getElementById('user-welcome').innerHTML = "<div>更新薪資資料中...</div>";
        try {
            const resp = await fetch(`${API_URL}?name=${encodeURIComponent(currentUser)}&pin=${currentPin}&month=${m}`);
            const res = await resp.json();
            window.currentBonus = res.monthlyBonus || 0;
            serverCalculatedHrs = res.calculatedHrs || 0;
            serverCalculatedBasePay = res.calculatedBasePay || 0;
        } catch (e) { console.log("無法獲取月份資料"); }
    }
    if (currentTab === "week") showThisWeek(m);
}

// 修正：點擊後直接在手機瀏覽器開啟 PDF 預覽
async function downloadPDF(month) {
    const btn = event.target;
    btn.innerText = "讀取中..."; btn.disabled = true;
    try {
        const url = `${API_URL}?mode=downloadPDF&name=${encodeURIComponent(currentUser)}&pin=${currentPin}&month=${month}`;
        const resp = await fetch(url);
        const base64 = await resp.text();
        
        // 將 Base64 轉換為 Blob 物件
        const byteCharacters = atob(base64);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const file = new Blob([byteArray], { type: 'application/pdf' });
        
        // 產生一個暫時的網址並直接開啟
        const fileURL = URL.createObjectURL(file);
        window.open(fileURL, '_blank');
        
        btn.innerText = "查看薪資單"; btn.disabled = false;
    } catch (e) { 
        alert("預覽失敗，請確認網路連線"); 
        btn.innerText = "查看薪資單"; btn.disabled = false; 
    }
}

function render(data, title, type = 'schedule') {
    let sub = "";
    const m = document.getElementById('monthFilter').value;
    if (type === 'schedule' && m !== 'all' && currentTab === 'week') {
        const res = calculateSalary(m);
        sub = `<div style="font-size:0.85em; color:#e67e22; margin-top:5px; font-weight:bold;">${res.text} <button onclick="downloadPDF('${m}')" style="margin-left:8px; padding:3px 10px; background:#34495e; color:white; border:none; border-radius:5px; font-size:11px; cursor:pointer;">查看薪資單</button></div>`;
    }
    document.getElementById('user-welcome').innerHTML = `<div>${title}${sub}</div>`;
    const list = document.getElementById('schedule-list');
    list.innerHTML = data.length === 0 ? '<p style="text-align:center; padding:50px; color:#999;">查無紀錄</p>' : "";
    data.forEach(item => {
        const d = item.date; const n = item.employeeName; const s = item.timeSlot;
        if (n === "宋菁" || n === "小金") return;
        const card = document.createElement('div');
        const isOff = s && s.includes('排休');
        card.style = `border-left: 8px solid ${isOff?'#e74c3c':'#27ae60'}; background: white; margin: 12px 0; padding: 15px; border-radius: 12px; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 3px 6px rgba(0,0,0,0.05);`;
        card.innerHTML = `<div><div style="font-weight:bold;">${d}</div><div style="color:${isOff?'#e74c3c':'#7f8c8d'}; margin-top:5px;">${s}</div></div><div style="font-weight:bold;">${n}</div>`;
        list.appendChild(card);
    });
}

function showToday() { currentTab = "today"; updateActive(0); document.getElementById('filter-bar').style.display = 'none'; const now = new Date(); const t = (now.getMonth() + 1).toString().padStart(2, '0') + "/" + now.getDate().toString().padStart(2, '0'); render(scheduleData.filter(i => i.date === t), `今日班表 (${t})`); }
function showThisWeek(m = "all") { currentTab = "week"; updateActive(1); document.getElementById('filter-bar').style.display = 'flex'; let f = (m === "all") ? scheduleData : scheduleData.filter(i => i.date && i.date.startsWith(m)); render(f, m === "all" ? "全店總表" : `${m}月 全店總表`); }
function updateActive(idx) { const btns = document.querySelectorAll('.tab-bar button'); btns.forEach((b, i) => b.style.color = (i===idx)? '#e74c3c' : '#7f8c8d'); }