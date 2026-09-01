/**
 * ============================================================
 * ECORP - DUYỆT THU HỌC PHÍ QUA TELEGRAM
 * ============================================================
 *
 * SHEET HOA DON
 *
 * A  = Đã thu
 * ...
 * CK = Mã hóa đơn
 * CL = Telegram Message ID
 * CM = Trạng thái
 * CN = (không còn dùng — trước đây lưu email người duyệt)
 * CO = Mã nhân viên + Họ tên  ← nguồn thông tin người duyệt duy nhất
 * CP = Ngày giờ duyệt
 *
 *
 * SHEET DSNS
 *
 * A = Email
 * B = Họ và tên
 * C = Mã nhân viên
 * D = Chức vụ
 * E = Telegram User ID   ← MỚI: dùng để xác thực người bấm nút
 *
 *
 * QUYỀN DUYỆT:
 * - Quản lý KD
 * - Lễ tân
 *
 *
 * THAY ĐỔI SO VỚI BẢN CŨ:
 * - Nút DUYỆT/KHÔNG DUYỆT không còn mở link web (url) — vì người
 *   duyệt không có quyền truy cập Sheet và dùng Gmail thường nên
 *   Session.getActiveUser() không lấy được email đáng tin cậy.
 * - Nút giờ dùng callback_data, xử lý ngay trong Telegram qua
 *   doPost (webhook). Xác thực bằng Telegram User ID (from.id),
 *   không cần quyền Sheet của người bấm — script luôn chạy bằng
 *   quyền Owner (Execute as Me).
 * - Sau khi duyệt: xóa message gốc, gửi message mới thông báo
 *   "X đã duyệt cho KH Y".
 * - Cần chạy setupTelegramWebhook() 1 lần sau khi deploy.
 * ============================================================
 */


/* ============================================================
 * 1. CẤU HÌNH
 * ============================================================
 */
function checkWebhook() {
  const token = getTelegramToken_();
  const url = "https://api.telegram.org/bot" + token + "/getWebhookInfo";
  const response = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
  Logger.log(response.getContentText());
}
const SPREADSHEET_URL =
  "https://docs.google.com/spreadsheets/d/1_atkI0HBXVT_wOWEEplc_q4L5dj2AGCHjf6XKOH3Ygs/edit?gid=646503498";

const SHEET_HOADON = "HOA DON";
const SHEET_DSNS = "DSNS";

/*
 * SAU KHI DEPLOY WEB APP:
 * thay URL bên dưới bằng URL /exec thật.
 * (Cần cho setupTelegramWebhook() trỏ đúng nơi Telegram gửi callback.)
 */
const WEB_APP_URL =
  "https://script.google.com/macros/s/AKfycbw8B3T9Rpteh4CxZOdOg0T6153h5aGB5H6UMle9UGLL6el6wXJI8BYmqIcFmOrNs8HNwg/exec";


/*
 * Telegram Chat ID
 */
const TELEGRAM_CHAT_ID =
  "-1002895214786";


/*
 * Token được lưu trong:
 * Apps Script → Project Settings → Script Properties
 * Property: TELEGRAM_BOT_TOKEN
 */
const TELEGRAM_TOKEN =
  "8083618334:AAHjmHB5gnnTkz5blzS3k6yxSEwDqZQ_5sY";


const ALLOWED_POSITIONS = ["quản lý kd", "lễ tân"];


/* ============================================================
 * 2. CỘT HOA DON
 * ============================================================
 */

const COL = {
  A: 1,       // Đã thu
  F: 6,       // SĐT
  G: 7,       // Họ tên HV
  H: 8,       // Phân loại
  I: 9,       // Cơ sở
  N: 14,      // Ngày CK
  O: 15,      // Người xuất
  CJ: 88,     // Tổng học phí
  CK: 89,     // Mã hóa đơn
  CL: 90,     // Telegram Message ID
  CM: 91,     // Trạng thái
  CN: 92,     // (không còn dùng)
  CO: 93,     // Mã NV + Họ tên
  CP: 94      // Ngày giờ duyệt
};


/* ============================================================
 * 3. MAPPING KHÓA HỌC
 * ============================================================
 *
 * Tên khóa (AL,AP,AT,AX,BB,BF,BJ,BN,BR,BV = Khóa 1..10)
 * Tiền đóng lần này (Q..Z = Khóa 1..10)
 * ============================================================
 */

const COURSE_COLUMNS = [
  { nameCol: 38, amountCol: 17 },  // AL / Q  - Khóa 1
  { nameCol: 42, amountCol: 18 },  // AP / R  - Khóa 2
  { nameCol: 46, amountCol: 19 },  // AT / S  - Khóa 3
  { nameCol: 50, amountCol: 20 },  // AX / T  - Khóa 4
  { nameCol: 54, amountCol: 21 },  // BB / U  - Khóa 5
  { nameCol: 58, amountCol: 22 },  // BF / V  - Khóa 6
  { nameCol: 62, amountCol: 23 },  // BJ / W  - Khóa 7
  { nameCol: 66, amountCol: 24 },  // BN / X  - Khóa 8
  { nameCol: 70, amountCol: 25 },  // BR / Y  - Khóa 9
  { nameCol: 74, amountCol: 26 }   // BV / Z  - Khóa 10
];


/* ============================================================
 * 4. LẤY TELEGRAM TOKEN
 * ============================================================
 */

function getTelegramToken_() {
  return TELEGRAM_TOKEN;
}


/* ============================================================
 * 5. TEST TELEGRAM BOT
 * ============================================================
 * Chạy hàm này để kiểm tra token. Kết quả đúng: {"ok":true,...}
 * ============================================================
 */

function testTelegramBot() {

  const token = getTelegramToken_();
  const url = "https://api.telegram.org/bot" + token + "/getMe";

  const response = UrlFetchApp.fetch(url, {
    method: "get",
    muteHttpExceptions: true
  });

  Logger.log("TOKEN LENGTH = " + token.length);
  Logger.log("TELEGRAM getMe = " + response.getContentText());
}


/* ============================================================
 * 6. QUÉT HOA DON VÀ GỬI TELEGRAM
 * ============================================================
 */

function scanAndSendRequests() {

  const lock = LockService.getScriptLock();

  if (!lock.tryLock(30000)) {
    Logger.log("Đang có tiến trình khác chạy.");
    return;
  }

  try {

    const ss = SpreadsheetApp.openByUrl(SPREADSHEET_URL);
    const sheet = ss.getSheetByName(SHEET_HOADON);

    if (!sheet) {
      throw new Error('Không tìm thấy sheet "' + SHEET_HOADON + '".');
    }

    const lastRow = sheet.getLastRow();

    if (lastRow < 2) {
      Logger.log("HOA DON không có dữ liệu.");
      return;
    }

    // Đảm bảo đọc tới CP.
    const lastCol = Math.max(sheet.getLastColumn(), COL.CP);

    // Đọc toàn bộ dữ liệu một lần.
    const data = sheet.getRange(1, 1, lastRow, lastCol).getValues();

    for (let i = 1; i < data.length; i++) {

      const rowNumber = i + 1;
      const row = data[i];

      const daThu = clean_(row[COL.A - 1]);
      const maHoaDon = clean_(row[COL.CK - 1]);
      const trangThai = clean_(row[COL.CM - 1]);
      const phanLoai = clean_(row[COL.H - 1]);

      /*
       * ĐIỀU KIỆN GỬI:
       * H không phải "Cơ sở", A trống, CM trống
       */
      if (phanLoai === "" || phanLoai === "Cơ sở") continue;
if (daThu !== "") continue;

if (trangThai !== "" && trangThai !== "CHỜ DUYỆT") {
  continue;
}

      const hoTen = clean_(row[COL.G - 1]);
      const soDienThoai = clean_(row[COL.F - 1]);
      const coSo = clean_(row[COL.I - 1]);
      const nguoiXuat = clean_(row[COL.O - 1]);
      const ngayCK = formatDate_(row[COL.N - 1]);
      const tongHocPhi = formatMoney_(row[COL.CJ - 1]);

      /*
       * KHÓA HỌC:
       * Tên khóa có dữ liệu → hiển thị (kể cả tiền = 0)
       * Tên khóa trống → không hiển thị
       */
      const courses = [];

      COURSE_COLUMNS.forEach(function (course) {

        const courseName = clean_(row[course.nameCol - 1]);

        if (courseName !== "") {
          const amount = formatMoney_(row[course.amountCol - 1]);
          courses.push({ name: courseName, amount: amount });
        }
      });

      const message = buildTelegramMessage_({
        hoTen: hoTen,
        soDienThoai: soDienThoai,
        coSo: coSo,
        phanLoai: phanLoai,
        nguoiXuat: nguoiXuat,
        ngayCK: ngayCK,
        tongHocPhi: tongHocPhi,
        maHoaDon: maHoaDon,
        courses: courses
      });

      /* ------------------------------------------------------
       * TELEGRAM INLINE KEYBOARD
       *
       * Dùng callback_data thay vì url:
       * - url: cần đăng nhập Google → vướng quyền Sheet
       * - callback_data: xử lý ngay trong Telegram qua doPost,
       *   xác thực bằng Telegram User ID (from.id)
       *
       * Format: "D|<maHoaDon>" (DUYỆT) hoặc "K|<maHoaDon>" (KHÔNG DUYỆT)
       * Mã hóa đơn dạng G2612071115 (~11 ký tự) nên luôn nhỏ hơn
       * nhiều so với giới hạn 64 bytes của Telegram.
       * ------------------------------------------------------
       */

      const keyboard = {
        inline_keyboard: [
          [
            { text: "✅ DUYỆT", callback_data: "D|" + maHoaDon },
            { text: "❌ KHÔNG DUYỆT", callback_data: "K|" + maHoaDon }
          ]
        ]
      };

      const result = sendTelegramMessage_(message, keyboard);

      if (result && result.ok) {

        const messageId = result.result.message_id;

        sheet.getRange(rowNumber, COL.CL).setValue(messageId);   // Telegram Message ID
        sheet.getRange(rowNumber, COL.CM).setValue("ĐÃ GỬI");

        Logger.log("Đã gửi HOA DON dòng " + rowNumber + " - Message ID: " + messageId);

      } else {

        Logger.log("Telegram gửi thất bại dòng " + rowNumber + ": " + JSON.stringify(result));
      }

      // Nghỉ nhẹ giữa các message.
      Utilities.sleep(150);
    }

  } catch (error) {

    Logger.log("scanAndSendRequests ERROR: " + error.stack);

  } finally {

    lock.releaseLock();
  }
}


/* ============================================================
 * 7. TẠO NỘI DUNG TELEGRAM (message gửi yêu cầu duyệt)
 * ============================================================
 * Dùng HTML thay cho Markdown để 100.000đ không bị escape thành
 * 100\.000đ.
 * ============================================================
 */

function buildTelegramMessage_(info) {

  let message = "";

  message += "🧾 <b>DUYỆT THU HỌC PHÍ</b>\n\n";

  message += "👤 " + escapeHtml_(info.hoTen) + " | " + escapeHtml_(info.soDienThoai) + "\n";
  message += "🏢 " + escapeHtml_(info.coSo) + " | " + escapeHtml_(info.phanLoai) + "\n";
  message += "👨‍💼 " + escapeHtml_(info.nguoiXuat) + " | 📅 " + escapeHtml_(info.ngayCK) + "\n";
  message += "💰 Tổng HP: " + escapeHtml_(info.tongHocPhi) + "\n";

  if (info.courses && info.courses.length > 0) {

    message += "\n📚 <b>Khóa học:</b>\n";

    // 2 khóa / 1 dòng
    for (let i = 0; i < info.courses.length; i += 2) {

      const first = info.courses[i];
      let line = escapeHtml_(first.name) + ": " + escapeHtml_(first.amount);

      if (info.courses[i + 1]) {
        const second = info.courses[i + 1];
        line += " | " + escapeHtml_(second.name) + ": " + escapeHtml_(second.amount);
      }

      message += line + "\n";
    }
  }

  message += "\n🧾 <b>Mã hóa đơn:</b> <code>" + escapeHtml_(info.maHoaDon) + "</code>";

  return message;
}


/* ============================================================
 * 8. doGet — CHỈ CÒN LÀ TRANG THÔNG BÁO
 * ============================================================
 * Không còn xử lý duyệt qua đây (nút không còn dùng url).
 * Giữ lại phòng khi ai đó mở thẳng link /exec.
 * ============================================================
 */

function doGet(e) {

  return HtmlService.createHtmlOutput(
    buildResultHtml_(false, "Vui lòng duyệt trực tiếp bằng nút trong Telegram.")
  );
}


/* ============================================================
 * 8b. doPost — NHẬN CALLBACK_QUERY TỪ TELEGRAM (nút DUYỆT/KHÔNG DUYỆT)
 * ============================================================
 */

function doPost(e) {

  const lock = LockService.getScriptLock();

  if (!lock.tryLock(30000)) {
    // Không xử lý kịp thì thôi — Telegram không tự retry callback_query.
    return ContentService.createTextOutput("locked");
  }

  try {

    const body = JSON.parse(e.postData.contents);
    const callback = body.callback_query;

    if (!callback) {
      // Không phải callback_query (VD update khác) → bỏ qua.
      return ContentService.createTextOutput("ignored");
    }

    const callbackQueryId = callback.id;
    const fromId = String(callback.from.id);
    const messageId = callback.message.message_id;

    /* --------------------------------------------------------
     * PARSE callback_data: "D|<maHD>" hoặc "K|<maHD>"
     * --------------------------------------------------------
     */

    const raw = clean_(callback.data);
    const parts = raw.split("|");

    if (parts.length !== 2) {
      answerCallbackQuery_(callbackQueryId, "Dữ liệu không hợp lệ.", true);
      return ContentService.createTextOutput("ok");
    }

    const actionCode = parts[0];
    const maHoaDon = parts[1];

    const action =
      actionCode === "D" ? "DUYET" :
      actionCode === "K" ? "KHONG_DUYET" :
      null;

    if (!action) {
      answerCallbackQuery_(callbackQueryId, "Thao tác không hợp lệ.", true);
      return ContentService.createTextOutput("ok");
    }

    /* --------------------------------------------------------
     * XÁC THỰC NGƯỜI BẤM QUA TELEGRAM USER ID (không qua email)
     * --------------------------------------------------------
     */

    const employee = findEmployeeByTelegramId_(fromId);

    if (!employee) {
      answerCallbackQuery_(callbackQueryId, "Tài khoản Telegram của bạn chưa được đăng ký trong DSNS.", true);
      return ContentService.createTextOutput("ok");
    }

    const position = normalizePosition_(employee.position);

    if (!ALLOWED_POSITIONS.includes(position)) {
      answerCallbackQuery_(callbackQueryId, "Bạn không có quyền duyệt hóa đơn.", true);
      return ContentService.createTextOutput("ok");
    }

    /* --------------------------------------------------------
     * MỞ SHEET (chạy bằng quyền Owner script — không phụ thuộc
     * quyền Sheet của người bấm)
     * --------------------------------------------------------
     */

    const ss = SpreadsheetApp.openByUrl(SPREADSHEET_URL);
    const sheet = ss.getSheetByName(SHEET_HOADON);

    if (!sheet) {
      throw new Error('Không tìm thấy sheet "' + SHEET_HOADON + '".');
    }

    const lastRow = sheet.getLastRow();

    if (lastRow < 2) {
      answerCallbackQuery_(callbackQueryId, "Không có dữ liệu hóa đơn.", true);
      return ContentService.createTextOutput("ok");
    }

    const ckValues = sheet.getRange(2, COL.CK, lastRow - 1, 1).getValues();

    let targetRow = -1;

    for (let i = 0; i < ckValues.length; i++) {
      if (clean_(ckValues[i][0]) === maHoaDon) {
        targetRow = i + 2;
        break;
      }
    }

    if (targetRow === -1) {
      answerCallbackQuery_(callbackQueryId, "Không tìm thấy hóa đơn: " + maHoaDon, true);
      return ContentService.createTextOutput("ok");
    }

    const currentStatus = clean_(sheet.getRange(targetRow, COL.CM).getValue());

    // Đã xử lý rồi thì không xử lý lại (tránh 2 người bấm cùng lúc).
    if (currentStatus === "DUYỆT" || currentStatus === "KHÔNG DUYỆT") {
      answerCallbackQuery_(callbackQueryId, "Hóa đơn này đã được xử lý trước đó.", true);
      return ContentService.createTextOutput("ok");
    }

    // Tên khách hàng — dùng để soạn message thông báo mới.
    const hoTen = clean_(sheet.getRange(targetRow, COL.G).getValue());

    const now = Utilities.formatDate(new Date(), "GMT+7", "dd/MM/yyyy HH:mm:ss");
    const nguoiDuyet = employee.employeeCode + " - " + employee.name;

    /* --------------------------------------------------------
     * GHI KẾT QUẢ VÀO SHEET
     * (CN không còn ghi — chỉ còn CO làm thông tin người duyệt)
     * --------------------------------------------------------
     */

    if (action === "DUYET") {
      sheet.getRange(targetRow, COL.A).setValue("Đã thu");
      sheet.getRange(targetRow, COL.CM).setValue("DUYỆT");
    } else {
      sheet.getRange(targetRow, COL.CM).setValue("KHÔNG DUYỆT");
    }

    sheet.getRange(targetRow, COL.CO).setValue(nguoiDuyet);
    sheet.getRange(targetRow, COL.CP).setValue(now);

    /* --------------------------------------------------------
     * PHẢN HỒI TOAST NGAY TRONG TELEGRAM
     * --------------------------------------------------------
     */

    answerCallbackQuery_(
      callbackQueryId,
      action === "DUYET" ? "Đã DUYỆT thành công." : "Đã ghi nhận KHÔNG DUYỆT.",
      false
    );

    /* --------------------------------------------------------
     * XÓA MESSAGE GỐC + GỬI MESSAGE MỚI THÔNG BÁO KẾT QUẢ
     * --------------------------------------------------------
     */

    deleteTelegramMessage_(messageId);

    const resultText =
      (action === "DUYET" ? "✅ " : "❌ ") +
      "<b>" + escapeHtml_(nguoiDuyet) + "</b>" +
      (action === "DUYET" ? " đã DUYỆT" : " đã KHÔNG DUYỆT") +
      " cho KH <b>" + escapeHtml_(hoTen) + "</b>";

    sendTelegramMessage_(resultText, null);

    return ContentService.createTextOutput("ok");

  } catch (error) {

    Logger.log("doPost ERROR: " + error.stack);
    return ContentService.createTextOutput("error");

  } finally {

    lock.releaseLock();
  }
}


/* ============================================================
 * 9. TÌM NHÂN SỰ TRONG DSNS THEO TELEGRAM USER ID (cột E)
 * ============================================================
 */

function findEmployeeByTelegramId_(telegramId) {

  const ss = SpreadsheetApp.openByUrl(SPREADSHEET_URL);
  const sheet = ss.getSheetByName(SHEET_DSNS);

  if (!sheet) {
    throw new Error('Không tìm thấy sheet "DSNS".');
  }

  const lastRow = sheet.getLastRow();

  if (lastRow < 2) {
    return null;
  }

  // Đọc A:E (thêm cột E = Telegram User ID so với bản cũ chỉ đọc A:D).
  const data = sheet.getRange(2, 1, lastRow - 1, 5).getValues();

  for (let i = 0; i < data.length; i++) {

    const rowTelegramId = clean_(data[i][4]);   // cột E

    if (rowTelegramId !== "" && rowTelegramId === telegramId) {

      return {
        email: clean_(data[i][0]),
        name: clean_(data[i][1]),
        employeeCode: clean_(data[i][2]),
        position: clean_(data[i][3])
      };
    }
  }

  return null;
}


/* ============================================================
 * 10. NORMALIZE CHỨC VỤ
 * ============================================================
 */

function normalizePosition_(value) {
  return clean_(value).toLowerCase().replace(/\s+/g, " ");
}


/* ============================================================
 * 11. GỬI TELEGRAM MESSAGE
 * ============================================================
 * keyboard có thể là null (message không có nút bấm, VD message
 * thông báo kết quả sau khi duyệt).
 * ============================================================
 */

function sendTelegramMessage_(message, keyboard) {

  const token = getTelegramToken_();
  const url = "https://api.telegram.org/bot" + token + "/sendMessage";

  const payload = {
    chat_id: TELEGRAM_CHAT_ID,
    text: message,
    parse_mode: "HTML",
    disable_web_page_preview: true
  };

  if (keyboard) {
    payload.reply_markup = keyboard;
  }

  const response = UrlFetchApp.fetch(url, {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  });

  const text = response.getContentText();

  Logger.log("Telegram response: " + text);

  return JSON.parse(text);
}


/* ============================================================
 * 11b. TRẢ LỜI CALLBACK_QUERY
 * ============================================================
 * Bắt buộc gọi sau mỗi callback_query, nếu không nút sẽ hiện
 * loading vô hạn trên máy người bấm.
 * ============================================================
 */

function answerCallbackQuery_(callbackQueryId, text, showAlert) {

  const token = getTelegramToken_();
  const url = "https://api.telegram.org/bot" + token + "/answerCallbackQuery";

  const payload = {
    callback_query_id: callbackQueryId,
    text: text,
    show_alert: !!showAlert
  };

  UrlFetchApp.fetch(url, {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  });
}


/* ============================================================
 * 12. XÓA TELEGRAM MESSAGE
 * ============================================================
 */

function deleteTelegramMessage_(messageId) {

  const token = getTelegramToken_();
  const url = "https://api.telegram.org/bot" + token + "/deleteMessage";

  const payload = {
    chat_id: TELEGRAM_CHAT_ID,
    message_id: Number(messageId)
  };

  const response = UrlFetchApp.fetch(url, {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  });

  Logger.log("Delete Telegram message: " + response.getContentText());
}


/* ============================================================
 * 13. FORMAT TIỀN
 * ============================================================
 */

function formatMoney_(value) {

  // Trống = 0đ
  if (value === null || value === undefined || value === "") {
    return "0đ";
  }

  let number;

  if (typeof value === "number") {

    number = value;

  } else {

    // Nếu là "100.000 đ" / "100,000" / "100000" → lấy phần số.
    const raw = String(value).replace(/[^\d.-]/g, "");
    number = Number(raw);
  }

  if (isNaN(number)) {
    return "0đ";
  }

  return Math.round(number).toLocaleString("vi-VN") + "đ";
}


/* ============================================================
 * 14. FORMAT NGÀY
 * ============================================================
 */

function formatDate_(value) {

  if (value === null || value === undefined || value === "") {
    return "";
  }

  // Nếu là Date thật từ Google Sheet.
  if (Object.prototype.toString.call(value) === "[object Date]") {
    return Utilities.formatDate(value, "GMT+7", "dd/MM/yyyy");
  }

  // Nếu Sheet đang trả chuỗi.
  return String(value).trim();
}


/* ============================================================
 * 15. CLEAN STRING
 * ============================================================
 */

function clean_(value) {

  if (value === null || value === undefined) {
    return "";
  }

  return String(value).trim();
}


/* ============================================================
 * 16. ESCAPE HTML TELEGRAM
 * ============================================================
 * Không escape dấu "." vì đang dùng HTML parse_mode
 * (100.000đ vẫn hiển thị đúng, không cần \. như Markdown).
 * ============================================================
 */

function escapeHtml_(value) {

  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}


/* ============================================================
 * 17. HTML TRANG THÔNG BÁO (doGet)
 * ============================================================
 */

function buildResultHtml_(success, message) {

  const icon = success ? "✅" : "⚠️";
  const title = success ? "Hoàn tất" : "Không thể xử lý";

  return `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${title}</title>
<style>
* { box-sizing: border-box; }
body {
  margin: 0;
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  font-family: Arial, sans-serif;
  background: linear-gradient(135deg, #002e80, #0b5fdb);
}
.card {
  width: 100%;
  max-width: 460px;
  padding: 38px 28px;
  background: #ffffff;
  border-radius: 22px;
  text-align: center;
  box-shadow: 0 20px 60px rgba(0,0,0,.25);
}
.icon { font-size: 54px; margin-bottom: 16px; }
h1 { margin: 0 0 12px; font-size: 24px; color: #0b1f3a; }
p { margin: 0; font-size: 16px; line-height: 1.6; color: #596579; }
</style>
</head>
<body>
<div class="card">
  <div class="icon">${icon}</div>
  <h1>${title}</h1>
  <p>${escapeHtml_(message)}</p>
</div>
</body>
</html>
`;
}


/* ============================================================
 * 18. TẠO TRIGGER (scan mỗi 1 phút)
 * ============================================================
 */

function setupTrigger() {

  const triggers = ScriptApp.getProjectTriggers();

  // Chỉ xóa trigger của scanAndSendRequests, không đụng trigger khác.
  triggers.forEach(function (trigger) {
    if (trigger.getHandlerFunction() === "scanAndSendRequests") {
      ScriptApp.deleteTrigger(trigger);
    }
  });

  ScriptApp.newTrigger("scanAndSendRequests").timeBased().everyMinutes(1).create();

  Logger.log("Đã tạo trigger scanAndSendRequests mỗi 1 phút.");
}


/* ============================================================
 * 19. SET WEBHOOK CHO BOT (chạy tay 1 lần sau khi deploy)
 * ============================================================
 * Nếu không chạy hàm này, Telegram sẽ không gửi callback_query
 * (nút DUYỆT/KHÔNG DUYỆT) tới doPost.
 * ============================================================
 */

function setupTelegramWebhook() {

  const token = getTelegramToken_();
  const url =
    "https://api.telegram.org/bot" + token + "/setWebhook?url=" + encodeURIComponent(WEB_APP_URL);

  const response = UrlFetchApp.fetch(url, { muteHttpExceptions: true });

  Logger.log("setWebhook = " + response.getContentText());
}
