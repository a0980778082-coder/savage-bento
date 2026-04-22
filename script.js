// 請務必確認 API_URL 是最新部署的那一串！
const API_URL = "https://script.google.com/macros/s/AKfycbyBESdAi94VoMo8AAa_1FgRfWA-qyL-SUxsqUuQhSmdqof81gyRSAKEiTRRPkemc6j5/exec"; 

let scheduleData = [];
let offRequestsData = [];
let currentUser = "";
let currentPin = "";

async function login() {
    currentUser = document.getElementById('loginName').value;
    currentPin = document.getElementById('loginPin').value;
    if (!currentUser || !currentPin) return alert("請選名字並填密碼");

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

function render(data, title, type = 'schedule') {
    document.getElementById('user-welcome').innerText = title;
    const list = document.getElementById('schedule-list');
    list.innerHTML = "";

    if (!data || data.length === 0) {
        list.innerHTML = `<p style="text-align:center; padding:50px; color:#999;">查無 ${title} 紀錄</p>`;
        return;
    }
    
    data.forEach(item => {
        const d = type === 'off' ? item["申請日期"] : item.date;
        const n = type === 'off' ? item["員工姓名"] : item.employeeName;
        const s = type === 'off' ? item["申請時段"] : item.timeSlot;
        const note = type === 'off' ? (item["備註"] || "") : "";

        // 過濾掉舊名字
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

function showToday() {
    updateActive(0);
    const now = new Date();
    // 強制取得台灣時間的 MM/dd
    const today = Utilities_FormatDate(now);
    const filtered = scheduleData.filter(i => i.date === today);
    render(filtered, `今日班表 (${today})`);
}

function Utilities_FormatDate(date) {
    const m = (date.getMonth() + 1).toString().padStart(2, '0');
    const d = date.getDate().toString().padStart(2, '0');
    return `${m}/${d}`;
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

// 申請排休功能 (toggleModal, addDateToList, submitMultipleOffRequests 保持不變)