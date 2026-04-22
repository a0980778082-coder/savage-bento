function doGet(e) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const name = e.parameter.name;
  const pin = e.parameter.pin;

  // 驗證身份
  const userSheet = ss.getSheetByName("Users");
  const userData = userSheet.getDataRange().getValues();
  let authenticated = false;
  for (let i = 1; i < userData.length; i++) {
    if (userData[i][0] == name && userData[i][1] == pin) {
      authenticated = true;
      break;
    }
  }

  if (!authenticated) return ContentService.createTextOutput("AUTH_FAILED").setMimeType(ContentService.MimeType.TEXT);

  // 驗證成功才抓班表 (Sheet1)
  const sheet = ss.getSheetByName("Sheet1");
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const result = [];
  for (let i = 1; i < data.length; i++) {
    let obj = {};
    for (let j = 0; j < headers.length; j++) {
      let value = data[i][j];
      if (value instanceof Date) value = Utilities.formatDate(value, "GMT+8", "MM/dd");
      obj[headers[j]] = value;
    }
    result.push(obj);
  }
  return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  try {
    const params = JSON.parse(e.postData.contents);
    
    // 排休申請也檢查密碼
    const userSheet = ss.getSheetByName("Users");
    const userData = userSheet.getDataRange().getValues();
    let auth = false;
    for (let i = 1; i < userData.length; i++) {
      if (userData[i][0] == params.name && userData[i][1] == params.pin) {
        auth = true; break;
      }
    }
    if (!auth) return ContentService.createTextOutput("AUTH_FAILED");

    let sheet = ss.getSheetByName("off_requests");
    if (!sheet) sheet = ss.insertSheet("off_requests");
    sheet.appendRow([new Date(), params.name, params.date, "全天排休", params.note]);
    return ContentService.createTextOutput("SUCCESS");
  } catch (f) { return ContentService.createTextOutput("ERROR"); }
}