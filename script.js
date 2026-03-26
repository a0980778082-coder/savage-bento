const API_URL = "https://script.google.com/macros/s/AKfycbxDDhl0i7b17T5ujFeM2zC_IjOoKrOlz3R9ih8ZO-cT9_R2mQbEPBKoYuLNSWO3p9zB/exec";

let allData = [];
let currentMode = 'thisWeek';

async function loadRealData() {
    const list = document.getElementById('schedule-list');
    list.innerHTML = '<p class="msg">正在讀取最新班表...</p>';
    try {
        const response = await fetch(API_URL);
        allData = await response.json();
        showThisWeek(); 
    } catch (error) { list.innerHTML = '<p class="msg">⚠️ 讀取失敗</p>'; }
}

// 修正 ISO 日期格式 (2026-03-25T...) 為好讀格式 (03/26)
function formatDate(dateStr) {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const mm = (d.getMonth() + 1).toString().padStart(2, '0');
    const dd = d.getDate().toString().padStart(2, '0');
    return `${mm}/${dd}`;
}

function renderSchedule(data) {
    const list = document.getElementById('schedule-list');
    list.innerHTML = '';
    if (data.length === 0) {
        list.innerHTML = `<p class="msg">目前尚無排班</p>`;
        return;
    }
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

function showThisWeek() {
    currentMode = 'thisWeek';
    updateActiveBtn('btn-thisweek');
    const now = new Date();
    const day = now.getDay();
    const diffToMonday = day === 0 ? -6 : 1 - day;
    const monday = new Date(now.setDate(now.getDate() + diffToMonday));
    const weekDates = [];
    for(let i=0; i<7; i++) {
        let d = new Date(monday.getTime() + i * 24 * 60 * 60 * 1000);
        weekDates.push(formatDate(d));
    }
    document.getElementById('week-display').innerText = `本週區間：${weekDates[0]} ~ ${weekDates[6]}`;
    const filtered = allData.filter(item => weekDates.includes(formatDate(item.date)));
    renderSchedule(filtered);
}

function showAll() {
    currentMode = 'all';
    updateActiveBtn('btn-all');
    document.getElementById('week-display').innerText = "顯示所有日期班表";
    renderSchedule(allData);
}

function updateActiveBtn(id) {
    document.getElementById('btn-thisweek').classList.remove('active');
    document.getElementById('btn-all').classList.remove('active');
    document.getElementById(id).classList.add('active');
}

function filterSchedule() {
    const keyword = document.getElementById('nameFilter').value.trim().toLowerCase();
    const filtered = allData.filter(item => 
        (item.employeeName || "").toLowerCase().includes(keyword) || formatDate(item.date).includes(keyword)
    );
    renderSchedule(filtered);
}

function toggleModal(show) { document.getElementById('off-form-modal').style.display = show ? 'flex' : 'none'; }

async function submitOffRequest() {
    const name = document.getElementById('offName').value;
    const time = document.getElementById('offTime').value;
    const date = document.getElementById('offDate').value;
    const note = document.getElementById('offNote').value;
    const btn = document.getElementById('submitBtn');

    if (!name || !date) return alert("請選擇姓名與日期");
    btn.disabled = true;
    btn.innerText = "傳送中...";
    try {
        await fetch(API_URL, { method: 'POST', mode: 'no-cors', body: JSON.stringify({ name, time, date, note }) });
        alert("申請已成功送出！");
        toggleModal(false);
    } catch (e) { alert("傳送失敗"); }
    finally { btn.disabled = false; btn.innerText = "送出申請"; }
}

window.onload = loadRealData;