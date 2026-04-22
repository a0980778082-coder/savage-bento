const API_URL = "https://script.google.com/macros/s/AKfycbyBESdAi94VoMo8AAa_1FgRfWA-qyL-SUxsqUuQhSmdqof81gyRSAKEiTRRPkemc6j5/exec"; 

let scheduleData = [];
let offRequestsData = [];
let currentUser = "";
let currentPin = "";
let selectedDates = [];

async function login() {
    currentUser = document.getElementById('loginName').value;
    currentPin = document.getElementById('loginPin').value;
    if (!currentUser || !currentPin) return alert("請選名字並填密碼");

    document.getElementById('loginBtn').innerText = "驗證中...";
    try {
        const resp = await fetch(`${API_URL}?name=${encodeURIComponent(currentUser)}&pin=${currentPin}`);
        const json = await resp.json();

        if (json === "AUTH_FAILED") {
            alert("❌ 密碼錯誤！");
            document.getElementById('loginBtn').innerText = "進入系統";
        } else {
            scheduleData = json.schedule;
            offRequestsData = json.offRequests;
            document.getElementById('login-screen').style.display = 'none';
            document.getElementById('main-app').style.display = 'block';
            showToday();
        }
    } catch (e) {
        alert("連線失敗，請檢查網路或大腦部署");
        document.getElementById('loginBtn').innerText = "進入系統";
    }
}

function render(data, title, isOffRequest = false) {
    document.getElementById('user-welcome').innerText = title;
    const list = document.getElementById('schedule-list');
    list.innerHTML = data.length === 0 ? '<p style="text-align:center; padding:50px; color:#999;">目前尚無紀錄</p>' : '';
    
    data.forEach(item => {
        const card = document.createElement('div');
        // 如果是抓 off_requests，欄位名稱會是「申請日期」和「員工姓名」
        const date = isOffRequest ? item["申請日期"] : item.date;
        const name = isOffRequest ? item["員工姓名"] : item.employeeName;
        const slot = isOffRequest ? item["申請時段"] : item.timeSlot;
        const note = isOffRequest ? `備註：${item["備註"] || ''}` : '';

        const isOff = isOffRequest || (slot || '').includes('排休');
        
        card.style = `border-left: 8px solid ${isOff?'#e74c3c':'#27ae60'}; background: white; margin: 12px 0; padding: 15px; border-radius: 12px; box-shadow: 0 3px 6px rgba(0,0,0,0.05);`;
        card.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <div>
                    <div style="font-weight:bold; font-size:1.1em; color:#2c3e50;">${date}</div>
                    <div style="color:${isOff?'#e74c3c':'#7f8c8d'}; margin-top:5px; font-weight:bold;">${slot}</div>
                    <div style="font-size:0.85em; color:#999; margin-top:3px;">${note}</div>
                </div>
                <div style="font-size: 1.2em; font-weight: bold; color:#34495e;">${name}</div>
            </div>
        `;
        list.appendChild(card);
    });
}

function showToday() {
    updateActive(0);
    const now = new Date();
    const today = `${(now.getMonth()+1).toString().padStart(2,'0')}/${now.getDate().toString().padStart(2,'0')}`;
    render(scheduleData.filter(i => i.date === today), `今日班表 (${today})`);
}

function showThisWeek() {
    updateActive(1);
    render(scheduleData, "全店排班總表"); // 直接秀出所有已排班資料
}

// 【我的排休】 - 現在改為抓取 off_requests 分頁的資料
function showMyOff() {
    updateActive(2);
    // 依據「員工姓名」過濾
    const myOff = offRequestsData.filter(i => i["員工姓名"] === currentUser);
    render(myOff, `${currentUser} 的申請紀錄 (含跨月)`, true);
}

function updateActive(idx) {
    const btns = document.querySelectorAll('.tab-bar button');
    btns.forEach((b, i) => b.style.color = (i===idx)? '#e74c3c' : '#7f8c8d');
}

// 排休申請功能 (略，維持不變)
function toggleModal(s) {
    document.getElementById('off-form-modal').style.display = s ? 'flex' : 'none';
    if(s) { selectedDates = []; updateDateUI(); }
}
function addDateToList() {
    const input = document.getElementById('offDateInput');
    if (!input.value) return;
    const parts = input.value.split('-');
    const d = `${parts[1]}/${parts[2]}`;
    if (!selectedDates.includes(d)) { selectedDates.push(d); updateDateUI(); }
}
function updateDateUI() {
    document.getElementById('selected-dates-container').innerHTML = selectedDates.map(d => `<span style="background:#eee; padding:5px 10px; border-radius:15px; margin:3px; display:inline-block; font-size:13px;">${d}</span>`).join('');
}
async function submitMultipleOffRequests() {
    const note = document.getElementById('offNote').value;
    if (selectedDates.length === 0 || !note) return alert("請選日期與原因");
    for (let date of selectedDates) {
        await fetch(API_URL, { method: 'POST', mode: 'no-cors', body: JSON.stringify({ name: currentUser, pin: currentPin, date: date, note: note }) });
    }
    alert("✅ 申請成功！");
    location.reload();
}