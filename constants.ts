
export const ADMIN_EMAIL = 'xinyiliu@ntnu.edu.tw'; 

/**
 * 重要：請將部署後的 Google Apps Script 網址貼在下方
 */
export const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbx9plr2nCZ8g52HcPsAqmL9r4Jz7R0csh3ZmeNr2e3R4F0RV0FP9hkxYhnLwiyGqOnW/exec';

// 這段代碼是專門給 Google Apps Script 用的，不需要 export 關鍵字在 GAS 裡面
export const GOOGLE_APPS_SCRIPT_CODE = `/**
 * International Week 2026 - 後端連動代碼
 * 請將此段代碼「完全覆蓋」貼入 Google Apps Script 的 Code.gs 中
 */
function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.tryLock(10000);
  
  try {
    var data = JSON.parse(e.postData.contents);
    var nickname = data.nickname;
    var country = data.favoriteCountry;
    var day = data.eventDay;
    var tags = (data.selectedTags || []).join(", ");
    var feedback = data.feedback;
    var time = data.timestamp;
    var adminEmail = "${ADMIN_EMAIL}";
    
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheets()[0];
    
    // 如果是新表，自動建立標題列
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(["活動天數", "打卡時間", "學生暱稱", "推薦國家", "評價標籤", "詳細留言"]);
      sheet.getRange(1, 1, 1, 6).setFontWeight("bold").setBackground("#f3f3f3");
    }
    
    // 寫入試算表
    sheet.appendRow([day, time, nickname, country, tags, feedback]);
    
    // 自動發送通知郵件給管理員
    MailApp.sendEmail({
      to: adminEmail,
      subject: "【國際週打卡通知】" + nickname + " 推薦了 " + country,
      body: "收到新的打卡紀錄：\\n\\n" +
            "學生暱稱：" + nickname + "\\n" +
            "推薦國家：" + country + "\\n" +
            "活動天數：" + day + "\\n" +
            "評價標籤：" + tags + "\\n" +
            "詳細留言：" + (feedback || "無") + "\\n\\n" +
            "打卡時間：" + time
    });

    return ContentService.createTextOutput(JSON.stringify({ "status": "success" }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ "status": "error", "message": err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}

function doGet() {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheets()[0];
    var data = sheet.getDataRange().getValues();
    var entries = [];
    
    // 取得最近打卡資料 (跳過標題)
    for (var i = Math.max(1, data.length - 20); i < data.length; i++) {
      entries.push({
        eventDay: data[i][0],
        timestamp: data[i][1],
        nickname: data[i][2],
        favoriteCountry: data[i][3],
        tags: data[i][4],
        feedback: data[i][5]
      });
    }
    
    entries.reverse();

    return ContentService.createTextOutput(JSON.stringify({
      feed: entries
    })).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ "status": "error" }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}`;
