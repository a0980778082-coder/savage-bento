const API_URL = "https://script.google.com/macros/s/AKfycbyBESdAi94VoMo8AAa_1FgRfWA-qyL-SUxsqUuQhSmdqof81gyRSAKEiTRRPkemc6j5/exec"; 

let scheduleData = [];
let offRequestsData = [];
let currentUser = "";
let currentPin = "";
let selectedDates = [];

// 1. 登入邏輯
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
        alert("連線失敗！請確認大腦部署版本已更新，且設為「所有人」");
        btn.innerText = "進入系統";
    }
}

// 2. 畫面渲染
function render(data, title, type = 'schedule') {
    document.getElementById('user-welcome').innerText = title;
    const list = document.getElementById('schedule-list');
    list.innerHTML = "";

    if (!data || data.length === 0) {
        list.innerHTML = `<p style="text-align:center; padding:50px; color:#999;">目前查無 ${title} 紀錄</p>`;
        return;
    }
    
    data.forEach(item => {
        const d = type === 'off' ? item["申請日期"] : item.date;
        const n = type === 'off' ? item["員工姓名"] : item.employeeName;
        const s = type === 'off' ? item["申請時段"] : item.timeSlot;
        const note = type === 'off' ? (item["備註"] || "") : "";

        // 過濾舊名防呆
        if (n === "宋菁" || n === "小金") return;

        const card = document.createElement('div');
        const isOff = type === 'off' || (s && s.includes('排休'));
        card.style = `border-left: 8px solid ${isOff?'#e74c3c':'#27ae60'}; background: white; margin: 12px 0; padding: 15px; border-radius: 12px; box-shadow: 0 3px 6px rgba(0,0,0,0.05); display: flex; justify-content: space-between; align-items: center;`;
        card.innerHTML = `
            <div>
                <div style="font-weight:bold; font-size:1.1em; color:#2c3e50;">${d}</div>
                <div style="color:${isOff?'#e74c3c':'#7f8c8d'}; margin-top:5px; font-weight:bold;">${s}</div>
                ${note ? `<div style="font-size:0.85em; color:#999; margin-top:3px;">原因：${note}</div>` : ""}
            </div>
            <div style="font-size: 1.2em; font-weight: bold; color:#34495e;">${n}</div>
        `;
        list.appendChild(card);
    });
}

// 3. 查詢切換
function showToday() {
    updateActive(0);
    const now = new Date();
    const m = (now.getMonth() + 1).toString().padStart(2, '0');
    const d = now.getDate().toString().padStart(2, '0');
    const today = `${m}/${d}`;
    const filtered = scheduleData.filter(i => i.date === today);
    render(filtered, `今日班表 (${today})`);
}

function showThisWeek() {
    updateActive(1);
    render(scheduleData, "全店排班總表");
}

function showMyOff() {
    updateActive(2);
    const myData = offRequestsData.filter(i => String(i["員工姓名"]).trim() === String(currentUser).trim());
    render(myData, `${currentUser} 的申請紀錄`, 'off');
}

function updateActive(idx) {
    const btns = document.querySelectorAll('.tab-bar button');
    btns.forEach((b, i) => b.style.color = (i===idx)? '#e74c3c' : '#7f8c8d');
}

// 4. 排休申請邏輯
function toggleModal(s) {
    document.getElementById('off-form-modal').style.display = s ? 'flex' : 'none';
    if(s) { selectedDates = []; updateDateUI(); }
}

function addDateToList() {
    const input = document.getElementById('offDateInput');
    if (!input.value) return;
    const parts = input.value.split('-');
    const d = `${parts[1]}/${parts[2]}`;
    if (!selectedDates.includes(d)) {
        selectedDates.push(d);
        updateDateUI();
    }
    input.value = '';
}

function updateDateUI() {
    document.getElementById('selected-dates-container').innerHTML = selectedDates.map(d => `<span style="background:#eee; padding:5px 10px; border-radius:15px; margin:3px; display:inline-block; font-size:13px;">${d}</span>`).join('');
}

async function submitMultipleOffRequests() {
    const note = document.getElementById('offNote').value;
    if (selectedDates.length === 0 || !note) return alert("請選日期並填寫原因");
    if (!confirm(`確定要申請這 ${selectedDates.length} 天排休嗎？`)) return;

    try {
        for (let date of selectedDates) {
            await fetch(API_URL, {
                method: 'POST',
                mode: 'no-cors',
                body: JSON.stringify({ name: currentUser, pin: currentPin, date: date, note: note })
            });
        }
        alert("✅ 申請成功！");
        location.reload();
    } catch (e) {
        alert("❌ 傳送失敗");
    }
}