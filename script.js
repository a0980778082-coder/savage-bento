const API_URL = "https://script.google.com/macros/s/AKfycbyBESdAi94VoMo8AAa_1FgRfWA-qyL-SUxsqUuQhSmdqof81gyRSAKEiTRRPkemc6j5/exec"; 

let scheduleData = [];
let offRequestsData = [];
let currentUser = "";
let currentPin = "";
let currentTab = "today";
let selectedDates = [];

// 1. 登入
async function login() {
    currentUser = document.getElementById('loginName').value;
    currentPin = document.getElementById('loginPin').value;
    if (!currentUser || !currentPin) return alert("請選名字並輸入密碼");

    const btn = document.getElementById('loginBtn');
    btn.innerText = "驗證中...";
    try {
        const resp = await fetch(`${API_URL}?name=${encodeURIComponent(currentUser)}&pin=${currentPin}`);
        const res = await resp.json();

        if (res === "AUTH_FAILED") {
            alert("❌ 密碼錯誤！");
            btn.innerText = "進入系統";
        } else {
            scheduleData = res.schedule || [];
            offRequestsData = res.offRequests || [];
            document.getElementById('login-screen').style.display = 'none';
            document.getElementById('main-app').style.display = 'block';
            showToday();
        }
    } catch (e) {
        alert("連線失敗！");
        btn.innerText = "進入系統";
    }
}

// 2. 篩選切換
function applyMonthFilter() {
    const month = document.getElementById('monthFilter').value;
    if (currentTab === "week") showThisWeek(month);
    else if (currentTab === "off") showMyOff(month);
}

// 3. 按鈕功能
function showToday() {
    currentTab = "today";
    updateActive(0);
    document.getElementById('filter-bar').style.display = 'none';
    const now = new Date();
    const today = (now.getMonth() + 1).toString().padStart(2, '0') + "/" + now.getDate().toString().padStart(2, '0');
    render(scheduleData.filter(i => i.date === today), `今日班表 (${today})`);
}

function showThisWeek(m = "all") {
    currentTab = "week";
    updateActive(1);
    document.getElementById('filter-bar').style.display = 'flex';
    let filtered = (m === "all") ? scheduleData : scheduleData.filter(i => i.date && i.date.startsWith(m));
    render(filtered, m === "all" ? "全店班表總覽" : `${m}月 全店班表`);
}

function showMyOff(m = "all") {
    currentTab = "off";
    updateActive(2);
    document.getElementById('filter-bar').style.display = 'flex';
    let myData = offRequestsData.filter(i => String(i["員工姓名"]).trim() === String(currentUser).trim());
    if (m !== "all") myData = myData.filter(i => i["申請日期"] && i["申請日期"].startsWith(m));
    render(myData, `${currentUser} 的 ${m === "all" ? '所有' : m + '月'} 申請`, 'off');
}

function render(data, title, type = 'schedule') {
    document.getElementById('user-welcome').innerText = title;
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
        card.innerHTML = `<div><div style="font-weight:bold;">${d}</div><div style="color:${isOff?'#e74c3c':'#7f8c8d'}; margin-top:5px;">${s}</div>${note ? `<div style="font-size:0.8em; color:#999;">原因：${note}</div>`:""}</div><div style="font-weight:bold;">${n}</div>`;
        list.appendChild(card);
    });
}

function updateActive(idx) {
    const btns = document.querySelectorAll('.tab-bar button');
    btns.forEach((b, i) => b.style.color = (i===idx)? '#e74c3c' : '#7f8c8d');
}

// 4. 排休申請 (toggleModal, addDateToList, submitMultipleOffRequests 保持不變)
function toggleModal(s) { document.getElementById('off-form-modal').style.display = s ? 'flex' : 'none'; if(s) { selectedDates = []; updateDateUI(); } }
function addDateToList() { const input = document.getElementById('offDateInput'); if (!input.value) return; const parts = input.value.split('-'); const d = `${parts[1]}/${parts[2]}`; if (!selectedDates.includes(d)) { selectedDates.push(d); updateDateUI(); } input.value = ''; }
function updateDateUI() { document.getElementById('selected-dates-container').innerHTML = selectedDates.map(d => `<span style="background:#eee; padding:5px 10px; border-radius:15px; margin:3px; display:inline-block; font-size:13px;">${d}</span>`).join(''); }
async function submitMultipleOffRequests() {
    const note = document.getElementById('offNote').value;
    if (selectedDates.length === 0 || !note) return alert("請選日期與原因");
    for (let date of selectedDates) {
        await fetch(API_URL, { method: 'POST', mode: 'no-cors', body: JSON.stringify({ name: currentUser, pin: currentPin, date: date, note: note }) });
    }
    alert("✅ 申請成功！");
    location.reload();
}