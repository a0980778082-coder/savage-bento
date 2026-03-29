// ⚠️ 這是您的專屬 API 網址，請確認這一行正確
const API_URL = "https://script.google.com/macros/s/AKfycbyBESdAi94VoMo8AAa_1FgRfWA-qyL-SUxsqUuQhSmdqof81gyRSAKEiTRRPkemc6j5/exec"; 

let allData = [];

// 1. 從後端讀取班表資料
async function loadRealData() {
    const list = document.getElementById('schedule-list');
    try {
        const response = await fetch(API_URL, { cache: 'no-cache' });
        allData = await response.json();
        showThisWeek(); 
    } catch (error) {
        list.innerHTML = '<p class="msg">⚠️ 讀取失敗，請確認網路連線</p>';
    }
}

// 2. 格式化日期 (補零)
function formatDate(dateStr) {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return `${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getDate().toString().padStart(2, '0')}`;
}

// 3. 顯示班表清單
function renderSchedule(data) {
    const list = document.getElementById('schedule-list');
    list.innerHTML = data.length === 0 ? `<p class="msg">目前尚無排班</p>` : '';
    data.forEach(item => {
        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `
            <div class="card-info">
                <div class="date">${formatDate(item.date)} (${item.weekday || ''})</div>
                <div class="time">${item.timeSlot || ''}</div>
            </div>
            <div class="employee-name">${item.employeeName || ''}</div>
        `;
        list.appendChild(card);
    });
}

// 4. 只顯示本週班表
function showThisWeek() {
    const now = new Date();
    const day = now.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    const monday = new Date(now.setDate(now.getDate() + diff));
    const weekDates = Array.from({length: 7}, (_, i) => formatDate(new Date(monday.getTime() + i * 24*60*60*1000)));
    document.getElementById('week-display').innerText = `本週區間：${weekDates[0]} ~ ${weekDates[6]}`;
    renderSchedule(allData.filter(item => weekDates.includes(formatDate(item.date))));
}

// 5. 控制排休視窗開關
function toggleModal(show) {
    document.getElementById('off-form-modal').style.display = show ? 'flex' : 'none';
}

// 6. 送出排休申請 (包含重複申請檢查)
async function submitOffRequest() {
    const name = document.getElementById('offName').value;
    const dateInput = document.getElementById('offDate').value;
    const note = document.getElementById('offNote').value;
    const btn = document.getElementById('submitBtn');

    if (!name || !dateInput) return alert("請填寫姓名與日期");

    // 防呆：檢查日期是否已有人上班
    const targetDate = formatDate(dateInput);
    const conflict = allData.find(item => formatDate(item.date) === targetDate);
    if (conflict) {
        if (!confirm(`⚠️ 提醒：${targetDate} 已經有「${conflict.employeeName}」排定了！\n確定要繼續申請嗎？`)) return;
    }

    btn.disabled = true;
    btn.innerText = "傳送中...";
    try {
        await fetch(API_URL, { 
            method: 'POST', 
            mode: 'no-cors', 
            body: JSON.stringify({ name, date: dateInput, note, time: "全天排休" }) 
        });
        alert("申請已成功送出！");
        toggleModal(false);
    } catch (e) { alert("傳送失敗，請稍後再試"); }
    finally { btn.disabled = false; btn.innerText = "送出申請"; }
}

window.onload = loadRealData;