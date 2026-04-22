let currentUser = "";
let currentPin = "";

async function login() {
    currentUser = document.getElementById('loginName').value;
    currentPin = document.getElementById('loginPin').value;
    if (!currentUser || !currentPin) return alert("請填寫姓名與密碼");

    // 帶著名稱和密碼去跟大腦要資料
    const resp = await fetch(`${API_URL}?name=${currentUser}&pin=${currentPin}`);
    const text = await resp.text();

    if (text === "AUTH_FAILED") {
        alert("❌ 密碼錯誤喔！");
    } else {
        allData = JSON.parse(text);
        document.getElementById('login-screen').style.display = 'none';
        document.getElementById('main-app').style.display = 'block';
        document.getElementById('user-welcome').innerText = `你好，${currentUser}`;
        renderSchedule(allData);
    }
}