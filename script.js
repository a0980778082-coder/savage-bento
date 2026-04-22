const API_URL = "https://script.google.com/macros/s/AKfycbyBESdAi94VoMo8AAa_1FgRfWA-qyL-SUxsqUuQhSmdqof81gyRSAKEiTRRPkemc6j5/exec"; 

let allData = [];
let selectedDates = []; // 用來存多個日期

async function loadRealData() {
    try {
        const response = await fetch(API_URL, { cache: 'no-cache' });
        allData = await response.json();
        showToday(); 
    } catch (error) {
        document.getElementById('schedule-list').innerHTML = '<p class="msg">⚠️ 連線不穩，請重整網頁</p>';
    }
}

// 渲染畫面邏輯
function renderSchedule(data) {
    const list = document.getElementById('schedule-list');
    list.innerHTML = data.length === 0 ? `<p class="msg">目前尚無資料</p>` : '';
    data.forEach(item => {
        const card = document.createElement('div');
        card.className = 'card';
        const isOff = (item.timeSlot || '').includes('排休');
        const cardStyle = isOff ? 'background-color: #ffeaea; border-left: 5px solid #e74c3c;' : '';
        const timeStyle = isOff ? 'color: #e74c3c; font-weight: bold;' : '';

        card.innerHTML = `
            <div class="card-info" style="${cardStyle}">
                <div class="date">${item.date} (${item.weekday || ''})</div>
                <div class="time" style="${timeStyle}">${item.timeSlot || ''}</div>
            </div>
            <div class="employee-name">${item.employeeName || ''}</div>
        `;
        list.appendChild(card);
    });
}

// 功能：只看我的排休
function showOnlyMyOff() {
    const name = document.getElementById('nameFilter').value.trim();
    if (!name) return alert("請先在上方搜尋框輸入您的「姓名」喔！");
    
    updateActiveBtn('btn-my-off');
    document.getElementById('week-display').innerText = `${name} 的所有排休紀錄`;
    const filtered = allData.filter(item => 
        item.employeeName === name && (item.timeSlot || '').includes('排休')
    );
    renderSchedule(filtered);
}

// --- 多日期選擇邏輯 ---

function addDateToList() {
    const dateInput = document.getElementById('offDateInput');
    const dateValue = dateInput.value;
    if (!dateValue) return;
    if (selectedDates.includes(dateValue)) return alert("這個日期已經選過囉！");
    
    selectedDates.push(dateValue);
    updateSelectedDatesUI();
    dateInput.value = ''; // 清空輸入框
}

function updateSelectedDatesUI() {
    const container = document.getElementById('selected-dates-container');
    if (selectedDates.length === 0) {
        container.innerHTML = '<p style="font-size: 12px; color: #888;">尚未選擇日期</p>';
        return;
    }
    container.innerHTML = selectedDates.map(d => 
        `<span style="display:inline-block; background:#eee; padding:2px 8px; margin:2px; border-radius:15px; font-size:13px;">
            ${d} <b onclick="removeDate('${d}')" style="color:red; cursor:pointer;">×</b>
        </span>`
    ).join('');
}

function removeDate(date) {
    selectedDates = selectedDates.filter(d => d !== date);
    updateSelectedDatesUI();
}

async function submitMultipleOffRequests() {
    const name = document.getElementById('offName').value;
    const note = document.getElementById('offNote').value;
    const btn = document.getElementById('submitBtn');

    if (!name || selectedDates.length === 0) return alert("請填寫姓名並至少新增一個日期");
    if (!note) return alert("請填寫備註");

    if (!confirm(`確定要一次申請這 ${selectedDates.length} 天的排休嗎？`)) return;

    btn.disabled = true;
    btn.innerText = "批次傳送中...";

    try {
        // 逐一傳送日期
        for (let date of selectedDates) {
            await fetch(API_URL, { 
                method: 'POST', 
                mode: 'no-cors', 
                body: JSON.stringify({ name, date, note }) 
            });
        }
        alert("🎉 所有申請已成功送出！");
        closeOffModal();
    } catch (e) { alert("傳送過程發生錯誤"); }
    finally { btn.disabled = false; btn.innerText = "一次送出所有申請"; }
}

function closeOffModal() {
    selectedDates = [];
    updateSelectedDatesUI();
    document.getElementById('offNote').value = '';
    toggleModal(false);
}

// 其餘基礎功能保留 (showToday, showThisWeek, filterSchedule, updateActiveBtn, toggleModal) ...
// (註：此處簡略，請將您原本 script.js 剩下的 showToday 等功能接在下面即可)
function showToday() {
    updateActiveBtn('btn-today');
    const now = new Date();
    const todayStr = `${(now.getMonth() + 1).toString().padStart(2, '0')}/${now.getDate().toString().padStart(2, '0')}`;
    document.getElementById('week-display').innerText = `今日：${todayStr}`;
    renderSchedule(allData.filter(item => item.date === todayStr));
}
function updateActiveBtn(id) {
    ['btn-today', 'btn-thisweek', 'btn-my-off'].forEach(b => document.getElementById(b)?.classList.remove('active'));
    document.getElementById(id)?.classList.add('active');
}
function toggleModal(show) { document.getElementById('off-form-modal').style.display = show ? 'flex' : 'none'; }
function filterSchedule() {
    const k = document.getElementById('nameFilter').value.toLowerCase();
    renderSchedule(allData.filter(i => (i.employeeName||"").includes(k) || (i.date||"").includes(k)));
}
window.onload = loadRealData;