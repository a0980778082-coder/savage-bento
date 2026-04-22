const API_URL = "https://script.google.com/macros/s/AKfycbyBESdAi94VoMo8AAa_1FgRfWA-qyL-SUxsqUuQhSmdqof81gyRSAKEiTRRPkemc6j5/exec"; 

let allData = [];
let currentUser = "";
let currentPin = "";
let selectedDates = [];

// --- 1. 登入邏輯 ---
async function login() {
    currentUser = document.getElementById('loginName').value;
    currentPin = document.getElementById('loginPin').value;
    const btn = document.getElementById('loginBtn');
    if (!currentUser || !currentPin) return alert("請選名字並填密碼");

    btn.innerText = "驗證中...";
    try {
        const resp = await fetch(`${API_URL}?name=${encodeURIComponent(currentUser)}&pin=${currentPin}`);
        const text = await resp.text();
        if (text === "AUTH_FAILED") {
            alert("❌ 密碼不對喔！");
            btn.innerText = "進入系統";
        } else {
            allData = JSON.parse(text);
            document.getElementById('login-screen').style.display = 'none';
            document.getElementById('main-app').style.display = 'block';
            document.getElementById('user-welcome').innerText = `你好，${currentUser}`;
            showToday(); // 預設顯示今日
        }
    } catch (e) {
        alert("連線失敗，請檢查大腦網址");
        btn.innerText = "進入系統";
    }
}

// --- 2. 核心渲染 (畫面長相) ---
function renderSchedule(data, title) {
    document.getElementById('user-welcome').innerText = title;
    const list = document.getElementById('schedule-list');
    list.innerHTML = data.length === 0 ? '<p style="text-align:center; padding:50px; color:#999;">目前尚無排班資料</p>' : '';
    
    data.forEach(item => {
        const card = document.createElement('div');
        card.className = 'card';
        const isOff = (item.timeSlot || '').includes('排休');
        
        // 美化外框：上班綠色，排休紅色
        card.style = isOff 
            ? 'border-left: 8px solid #e74c3c; background:#fff5f5; margin:10px; padding:15px; border-radius:10px; display:flex; justify-content:space-between; align-items:center; box-shadow:0 2px 4px rgba(0,0,0,0.05);' 
            : 'border-left: 8px solid #27ae60; background:white; margin:10px; padding:15px; border-radius:10px; display:flex; justify-content:space-between; align-items:center; box-shadow:0 2px 4px rgba(0,0,0,0.05);';
        
        card.innerHTML = `
            <div>
                <div style="font-weight:bold; font-size:1.1em; color:#2c3e50;">${item.date} (${item.weekday || ''})</div>
                <div style="color:${isOff ? '#e74c3c' : '#7f8c8d'}; margin-top:5px; font-weight:${isOff?'bold':'normal'};">${item.timeSlot || ''}</div>
            </div>
            <div style="font-size:1.2em; font-weight:bold; color:#2c3e50;">${item.employeeName || ''}</div>
        `;
        list.appendChild(card);
    });
}

// --- 3. 三大查詢功能 ---

// 今日班表
function showToday() {
    updateActiveBtn(0);
    const now = new Date();
    const todayStr = `${(now.getMonth() + 1).toString().padStart(2, '0')}/${now.getDate().toString().padStart(2, '0')}`;
    const filtered = allData.filter(item => item.date === todayStr);
    renderSchedule(filtered, `今日班表 (${todayStr})`);
}

// 本週班表
function showThisWeek() {
    updateActiveBtn(1);
    const now = new Date();
    const day = now.getDay();
    const diff = day === 0 ? -6 : 1 - day; // 取得週一
    const monday = new Date(now.setDate(now.getDate() + diff));
    const weekDates = Array.from({length: 7}, (_, i) => {
        const d = new Date(monday.getTime() + i * 24*60*60*1000);
        return `${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getDate().toString().padStart(2, '0')}`;
    });
    const filtered = allData.filter(item => weekDates.includes(item.date));
    renderSchedule(filtered, "本週全店班表");
}

// 我的排休 (只看自己的排休紀錄)
function showMyOff() {
    updateActiveBtn(2);
    const filtered = allData.filter(item => 
        item.employeeName === currentUser && (item.timeSlot || '').includes('排休')
    );
    renderSchedule(filtered, `${currentUser} 的排休紀錄`);
}

// --- 4. 輔助功能 ---
function updateActiveBtn(index) {
    const btns = document.querySelectorAll('.tab-bar button');
    btns.forEach((b, i) => {
        if(i === index) b.style.color = '#e74c3c';
        else b.style.color = '#7f8c8d';
    });
}

function toggleModal(show) {
    document.getElementById('off-form-modal').style.display = show ? 'flex' : 'none';
    if(show) { selectedDates = []; updateDateUI(); }
}

function addDateToList() {
    const dateInput = document.getElementById('offDateInput');
    if (!dateInput.value) return;
    const parts = dateInput.value.split('-');
    const datePart = `${parts[1]}/${parts[2]}`; // 格式化為 04/22
    if (!selectedDates.includes(datePart)) {
        selectedDates.push(datePart);
        updateDateUI();
    }
}

function updateDateUI() {
    const container = document.getElementById('selected-dates-container');
    container.innerHTML = selectedDates.map(d => `<span style="background:#eee; padding:5px 10px; border-radius:15px; margin:3px; display:inline-block; font-size:14px;">${d}</span>`).join('');
}

async function submitMultipleOffRequests() {
    const note = document.getElementById('offNote').value;
    if (selectedDates.length === 0 || !note) return alert("請選日期並填寫備註");
    if (!confirm(`確定要幫 ${currentUser} 申請這 ${selectedDates.length} 天排休嗎？`)) return;

    for (let date of selectedDates) {
        await fetch(API_URL, {
            method: 'POST',
            mode: 'no-cors',
            body: JSON.stringify({ name: currentUser, pin: currentPin, date: date, note: note })
        });
    }
    alert("✅ 申請成功！");
    location.reload();
}