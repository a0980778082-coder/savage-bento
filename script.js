const API_URL = "https://script.google.com/macros/s/AKfycbyBESdAi94VoMo8AAa_1FgRfWA-qyL-SUxsqUuQhSmdqof81gyRSAKEiTRRPkemc6j5/exec"; 

let allData = [];

async function loadRealData() {
    const list = document.getElementById('schedule-list');
    try {
        const response = await fetch(API_URL, { cache: 'no-cache' });
        allData = await response.json();
        showToday(); 
    } catch (error) {
        list.innerHTML = '<p class="msg">⚠️ 讀取中或連線問題...</p>';
    }
}

function formatDate(dateStr) {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return `${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getDate().toString().padStart(2, '0')}`;
}

function renderSchedule(data) {
    const list = document.getElementById('schedule-list');
    list.innerHTML = data.length === 0 ? `<p class="msg">目前尚無排班</p>` : '';
    data.forEach(item => {
        const card = document.createElement('div');
        card.className = 'card';
        
        // 🌟 新增：如果時段包含「排休」，字體變紅色，背景變淺紅
        const isOff = (item.timeSlot || '').includes('排休');
        const cardStyle = isOff ? 'background-color: #ffeaea; border-left: 5px solid #e74c3c;' : '';
        const timeStyle = isOff ? 'color: #e74c3c; font-weight: bold;' : '';

        card.innerHTML = `
            <div class="card-info" style="${cardStyle}; padding: 10px; border-radius: 8px;">
                <div class="date">${formatDate(item.date)} (${item.weekday || ''})</div>
                <div class="time" style="${timeStyle}">${item.timeSlot || ''}</div>
            </div>
            <div class="employee-name">${item.employeeName || ''}</div>
        `;
        list.appendChild(card);
    });
}

function showToday() {
    updateActiveBtn('btn-today');
    const todayStr = formatDate(new Date());
    document.getElementById('week-display').innerText = `今日班表：${todayStr}`;
    const filtered = allData.filter(item => formatDate(item.date) === todayStr);
    renderSchedule(filtered);
}

function showThisWeek() {
    updateActiveBtn('btn-thisweek');
    const now = new Date();
    const day = now.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    const monday = new Date(now.setDate(now.getDate() + diff));
    const weekDates = Array.from({length: 7}, (_, i) => formatDate(new Date(monday.getTime() + i * 24*60*60*1000)));
    document.getElementById('week-display').innerText = `本週區間：${weekDates[0]} ~ ${weekDates[6]}`;
    renderSchedule(allData.filter(item => weekDates.includes(formatDate(item.date))));
}

function showAll() {
    updateActiveBtn('btn-all');
    document.getElementById('week-display').innerText = "顯示所有班表";
    renderSchedule(allData);
}

function updateActiveBtn(id) {
    ['btn-today', 'btn-thisweek', 'btn-all'].forEach(btnId => {
        const btn = document.getElementById(btnId);
        if (btn) btn.classList.remove('active');
    });
    const activeBtn = document.getElementById(id);
    if (activeBtn) activeBtn.classList.add('active');
}

function filterSchedule() {
    const keyword = document.getElementById('nameFilter').value.trim().toLowerCase();
    const filtered = allData.filter(item => 
        (item.employeeName || "").toLowerCase().includes(keyword) || formatDate(item.date).includes(keyword)
    );
    renderSchedule(filtered);
}

function toggleModal(show) {
    document.getElementById('off-form-modal').style.display = show ? 'flex' : 'none';
}

async function submitOffRequest() {
    const name = document.getElementById('offName').value;
    const dateInput = document.getElementById('offDate').value;
    const note = document.getElementById('offNote').value;
    const btn = document.getElementById('submitBtn');

    if (!name || !dateInput) return alert("請填寫姓名與日期");
    if (!note) return alert("請填寫備註 (例如: 家中有事，或註明代班人)");

    const targetDate = formatDate(dateInput);
    const conflict = allData.find(item => formatDate(item.date) === targetDate);
    if (conflict) {
        if (!confirm(`⚠️ 提醒：${targetDate} 已經有「${conflict.employeeName}」排定了！\n還要繼續申請嗎？`)) return;
    }

    btn.disabled = true;
    btn.innerText = "傳送中...";
    try {
        await fetch(API_URL, { 
            method: 'POST', 
            mode: 'no-cors', 
            body: JSON.stringify({ name, date: dateInput, note }) 
        });
        alert("申請已成功送出！");
        toggleModal(false);
    } catch (e) { alert("傳送失敗"); }
    finally { btn.disabled = false; btn.innerText = "送出申請"; }
}

window.onload = loadRealData;