const API_URL = "https://script.google.com/macros/s/AKfycbyBESdAi94VoMo8AAa_1FgRfWA-qyL-SUxsqUuQhSmdqof81gyRSAKEiTRRPkemc6j5/exec"; 

let scheduleData = [];
let offRequestsData = [];
let userRate = 0; 
let currentUser = "";
let currentPin = "";
let currentTab = "today";
let selectedDates = [];

// 1. 登入
async function login() {
    currentUser = document.getElementById('loginName').value;
    currentPin = document.getElementById('loginPin').value;
    if (!currentUser || !currentPin) return alert("請選名字並填寫密碼");
    const btn = document.getElementById('loginBtn');
    btn.innerText = "驗證中..."; btn.disabled = true;
    try {
        const resp = await fetch(`${API_URL}?name=${encodeURIComponent(currentUser)}&pin=${currentPin}`);
        const res = await resp.json();
        if (res === "AUTH_FAILED") {
            alert("❌ 密碼錯誤！");
            btn.innerText = "進入系統"; btn.disabled = false;
        } else {
            scheduleData = res.schedule || [];
            offRequestsData = res.offRequests || [];
            userRate = res.rate || 0; 
            document.getElementById('login-screen').style.display = 'none';
            document.getElementById('main-app').style.display = 'block';
            showToday();
        }
    } catch (e) { alert("連線失敗！"); btn.innerText = "進入系統"; btn.disabled = false; }
}

// 2. 薪資計算邏輯 (支援正職與時薪)
function calculateSalary(month) {
    if (userRate >= 1000) {
        return { type: "正職", salary: userRate, text: `本越薪資預估：$${userRate}` };
    }

    let totalHours = 0;
    const mySchedule = scheduleData.filter(i => 
        String(i.employeeName).trim() === currentUser.trim() && 
        i.date.startsWith(month)
    );

    mySchedule.forEach(item => {
        const nums = item.timeSlot.match(/\d+/g);
        if (nums && nums.length >= 2) {
            const hours = parseInt(nums[1]) - parseInt(nums[0]);
            if (hours > 0) totalHours += hours;
        }
    });

    const salary = totalHours * userRate;
    return { type: "時薪", salary: salary, hours: totalHours, text: `本月薪資預估：${totalHours}hr / $${salary}` };
}

// 3. 產生日曆連結
function getCalendarLink(dateStr, timeSlot) {
    const year = new Date().getFullYear();
    const [month, day] = dateStr.split('/');
    const fullDate = `${year}${month}${day}`;
    const title = encodeURIComponent(`小野人上班：${timeSlot}`);
    const location = encodeURIComponent(`小野人餐盒製造所 (Dade店)`);
    let startTime = "090000", endTime = "140000";
    if (timeSlot.includes("晚") || timeSlot.includes("17")) { startTime = "170000"; endTime = "210000"; }
    return `https://www.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${fullDate}T${startTime}/${fullDate}T${endTime}&location=${location}&sf=true&output=xml`;
}

// 4. 畫面渲染
function render(data, title, type = 'schedule') {
    let subTitle = "";
    const month = document.getElementById('monthFilter').value;
    // 只有在切換到「全店總表」並篩選月份時才顯示薪資
    if (type === 'schedule' && month !== 'all' && currentTab === 'week') {
        const res = calculateSalary(month);
        subTitle = `<div style="font-size:0.85em; color:#e67e22; margin-top:5px; font-weight:bold;">${res.text}</div>`;
    }

    document.getElementById('user-welcome').innerHTML = `<div>${title}${subTitle}</div>`;
    const list = document.getElementById('schedule-list');
    list.innerHTML = data.length === 0 ? '<p style="text-align:center; padding:50px; color:#999;">查無紀錄</p>' : "";
    
    data.forEach(item => {
        const d = type === 'off' ? item["申請日期"] : item.date;
        const n = type === 'off' ? item["員工姓名"] : item.employeeName;
        const s = type === 'off' ? item["申請時段"] : item.timeSlot;
        const note = type === 'off' ? (item["備註"] || "") : "";
        if (n === "宋菁" || n === "小金") return;

        const card = document.createElement('div');
        const isOff = type === 'off' || (s && s.includes('排休'));
        card.style = `border-left: 8px solid ${isOff?'#e74c3c':'#27ae60'}; background: white; margin: 12px 0; padding: 15px; border-radius: 12px; box-shadow: 0 3px 6px rgba(0,0,0,0.05); display: flex; justify-content: space-between; align-items: center;`;
        const calBtn = (!isOff && type === 'schedule' && n === currentUser) ? `<a href="${getCalendarLink(d, s)}" target="_blank" style="color: #3498db; margin-left: 10px; font-size: 1.2em;"><i class="fa-regular fa-calendar-plus"></i></a>` : "";
        card.innerHTML = `<div style="flex:1;"><div style="font-weight:bold; display:flex; align-items:center; color:#2c3e50;">${d}${calBtn}</div><div style="color:${isOff?'#e74c3c':'#7f8c8d'}; margin-top:5px; font-weight:bold;">${s}</div>${note ? `<div style="font-size:0.85em; color:#999; margin-top:3px;">原因：${note}</div>` : ""}</div><div style="font-weight:bold; color:#34495e;">${n}</div>`;
        list.appendChild(card);
    });
}

// 5. 其他功能邏輯 (維持 4.7