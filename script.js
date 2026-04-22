const API_URL = "請換成您部署後的exec網址"; 

let allData = [];
let currentUser = "";
let currentPin = "";
let selectedDates = [];

// --- 登入邏輯 ---
async function login() {
    currentUser = document.getElementById('loginName').value;
    currentPin = document.getElementById('loginPin').value;
    const btn = document.querySelector('#login-screen button');

    if (!currentUser || !currentPin) return alert("請填寫姓名與密碼");

    btn.innerText = "驗證中...";
    try {
        // 帶著名稱和密碼去跟大腦要資料
        const resp = await fetch(`${API_URL}?name=${encodeURIComponent(currentUser)}&pin=${currentPin}`);
        const text = await resp.text();

        if (text === "AUTH_FAILED") {
            alert("❌ 密碼錯誤喔！");
            btn.innerText = "進入系統";
        } else {
            allData = JSON.parse(text);
            // 登入成功，切換畫面
            document.getElementById('login-screen').style.display = 'none';
            document.getElementById('main-app').style.display = 'block';
            document.getElementById('user-welcome').innerText = `你好，${currentUser}`;
            showToday(); // 預設顯示今日班表
        }
    } catch (e) {
        alert("連線失敗，請檢查大腦網址是否正確");
        btn.innerText = "進入系統";
    }
}

// --- 顯示班表邏輯 ---
function renderSchedule(data) {
    const list = document.getElementById('schedule-list');
    list.innerHTML = data.length === 0 ? `<p class="msg">目前尚無排班</p>` : '';
    data.forEach(item => {
        const card = document.createElement('div');
        card.className = 'card';
        const isOff = (item.timeSlot || '').includes('排休');
        const cardStyle = isOff ? 'background-color: #ffeaea; border-left: 5px solid #e74c3c;' : '';
        const timeStyle = isOff ? 'color: #e74c3c; font-weight: bold;' : '';

        card.innerHTML = `
            <div class="card-info" style="${cardStyle}; padding: 10px; border-radius: 8px;">
                <div class="date">${item.date} (${item.weekday || ''})</div>
                <div class="time" style="${timeStyle}">${item.timeSlot || ''}</div>
            </div>
            <div class="employee-name">${item.employeeName || ''}</div>
        `;
        list.appendChild(card);
    });
}

function showToday() {
    const now = new Date();
    const todayStr = `${(now.getMonth() + 1).toString().padStart(2, '0')}/${now.getDate().toString().padStart(2, '0')}`;
    renderSchedule(allData.filter(item => item.date === todayStr));
}

// --- 排休申請邏輯 ---
function toggleModal(show) {
    document.getElementById('off-form-modal').style.display = show ? 'flex' : 'none';
}

async function submitMultipleOffRequests() {
    const note = document.getElementById('offNote').value;
    if (selectedDates.length === 0 || !note) return alert("請選擇日期並填寫備註");

    if (!confirm(`確定要幫 ${currentUser} 申請這 ${selectedDates.length} 天的排休嗎？`)) return;

    try {
        for (let date of selectedDates) {
            // 送出時連同 currentUser 和 currentPin 一起送去驗證
            await fetch(API_URL, { 
                method: 'POST', 
                mode: 'no-cors', 
                body: JSON.stringify({ 
                    name: currentUser, 
                    pin: currentPin, 
                    date: date, 
                    note: note 
                }) 
            });
        }
        alert("🎉 排休申請已送出！");
        location.reload(); // 重新載入以更新畫面
    } catch (e) {
        alert("傳送失敗");
    }
}

// 輔助功能：日期多選
function addDateToList() {
    const dateInput = document.getElementById('offDateInput');
    const val = dateInput.value;
    if (!val) return;
    if (!selectedDates.includes(val)) {
        selectedDates.push(val);
        updateDateUI();
    }
    dateInput.value = '';
}

function updateDateUI() {
    const container = document.getElementById('selected-dates-container');
    container.innerHTML = selectedDates.map(d => `<span class="date-tag">${d} <i onclick="removeDate('${d}')">×</i></span>`).join('');
}

function removeDate(d) {
    selectedDates = selectedDates.filter(x => x !== d);
    updateDateUI();
}