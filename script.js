const API_URL = "https://script.google.com/macros/s/AKfycbyBESdAi94VoMo8AAa_1FgRfWA-qyL-SUxsqUuQhSmdqof81gyRSAKEiTRRPkemc6j5/exec"; 

let allData = [];
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
        const text = await resp.text();
        if (text === "AUTH_FAILED") {
            alert("❌ 密碼錯誤！");
            btn.innerText = "進入系統";
        } else {
            allData = JSON.parse(text);
            document.getElementById('login-screen').style.display = 'none';
            document.getElementById('main-app').style.display = 'block';
            showToday();
        }
    } catch (e) {
        alert("連線失敗，請確認大腦部署為「所有人」並重新整理網頁");
        btn.innerText = "進入系統";
    }
}

// 2. 顯示班表渲染
function render(data, title) {
    document.getElementById('user-welcome').innerText = title;
    const list = document.getElementById('schedule-list');
    list.innerHTML = data.length === 0 ? '<p style="text-align:center; padding:50px; color:#999;">目前尚無資料</p>' : '';
    
    data.forEach(item => {
        const card = document.createElement('div');
        const isOff = (item.timeSlot || '').includes('排休');
        card.style = `border-left: 8px solid ${isOff?'#e74c3c':'#27ae60'}; background: white; margin: 12px 0; padding: 15px; border-radius: 12px; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 3px 6px rgba(0,0,0,0.05);`;
        card.innerHTML = `
            <div>
                <div style="font-weight:bold; font-size:1.1em; color:#2c3e50;">${item.date} (${item.weekday || ''})</div>
                <div style="color:${isOff?'#e74c3c':'#7f8c8d'}; margin-top:5px; font-weight:${isOff?'bold':'normal'};">${item.timeSlot || ''}</div>
            </div>
            <div style="font-size: 1.2em; font-weight: bold; color:#34495e;">${item.employeeName || ''}</div>
        `;
        list.appendChild(card);
    });
}

// 3. 按鈕切換功能
function showToday() {
    updateActive(0);
    const now = new Date();
    const today = `${(now.getMonth()+1).toString().padStart(2,'0')}/${now.getDate().toString().padStart(2,'0')}`;
    const filtered = allData.filter(i => i.date === today);
    render(filtered, `今日班表 (${today})`);
}

function showThisWeek() {
    updateActive(1);
    const now = new Date();
    const day = now.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    const mon = new Date(now.setDate(now.getDate() + diff));
    const weekDates = Array.from({length:7}, (_, i) => {
        const d = new Date(mon.getTime() + i*86400000);
        return `${(d.getMonth()+1).toString().padStart(2,'0')}/${d.getDate().toString().padStart(2,'0')}`;
    });
    const filtered = allData.filter(i => weekDates.includes(i.date));
    render(filtered, "本週全店班表");
}

// 我的排休 - 顯示所有未來(含下個月)的假
function showMyOff() {
    updateActive(2);
    const myOff = allData.filter(i => i.employeeName === currentUser && (i.timeSlot || '').includes('排休'));
    myOff.sort((a,b) => a.date.localeCompare(b.date)); // 依照日期排序
    render(myOff, `${currentUser} 的所有排休計畫`);
}

function updateActive(idx) {
    const btns = document.querySelectorAll('.tab-bar button');
    btns.forEach((b, i) => b.style.color = (i===idx)? '#e74c3c' : '#7f8c8d');
}

// 4. 排休申請功能
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
    if (selectedDates.length === 0 || !note) return alert("請填寫日期與原因");
    if (!confirm(`確定幫 ${currentUser} 申請這 ${selectedDates.length} 天排休？`)) return;

    for (let date of selectedDates) {
        await fetch(API_URL, { method: 'POST', mode: 'no-cors', body: JSON.stringify({ name: currentUser, pin: currentPin, date: date, note: note }) });
    }
    alert("✅ 申請成功！請等候老闆更新班表。");
    location.reload();
}