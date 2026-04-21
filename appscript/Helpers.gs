// ===== ค่าคงที่ชื่อ Sheet =====
var SHEET = {
  USERS:    'users',
  ROOMS:    'rooms',
  TENANTS:  'tenants',
  RATES:    'utility_rates',
  METERS:   'meter_readings',
  BILLS:    'bills',
  ACTIVITIES: 'activities',
  SESSIONS: 'sessions'
};

var HEADERS = {
  users:          ['id','username','password_hash','full_name','role','created_at'],
  rooms:          ['id','room_number','floor','room_type','rent_price','status','description','created_at','updated_at'],
  tenants:        ['id','room_id','full_name','id_card','phone','email','address','emergency_contact','emergency_phone','start_date','end_date','deposit','status','notes','created_at','updated_at'],
  utility_rates:  ['id','name','electric_rate','water_rate','other_fee','effective_date','notes','created_at'],
  meter_readings: ['id','room_id','bill_month','bill_year','prev_electric','curr_electric','prev_water','curr_water','created_at'],
  bills:          ['id','room_id','tenant_id','bill_month','bill_year','rent_amount','electric_units','electric_amount','water_units','water_amount','other_amount','other_description','total_amount','due_date','status','notes','created_at','updated_at'],
  activities:     ['id','user_id','action','description','module','ref_id','created_at'],
  sessions:       ['token','user_id','username','full_name','role','created_at','expires_at']
};

// ===== ดึง Sheet =====
function getSheet(name) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(name);
  if (!sheet) throw new Error('ไม่พบ Sheet: ' + name);
  return sheet;
}

// ===== แปลง row array เป็น object =====
function rowToObj(headers, row) {
  var obj = {};
  headers.forEach(function(h, i) { obj[h] = row[i] !== undefined ? row[i] : ''; });
  return obj;
}

// ===== ดึงข้อมูลทั้งหมดจาก Sheet เป็น array ของ objects =====
function getAll(sheetName) {
  var sheet = getSheet(sheetName);
  var data  = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];
  var headers = data[0];
  return data.slice(1).map(function(row) { return rowToObj(headers, row); });
}

// ===== หาแถวตาม id (row index 1-based ใน sheet, รวม header) =====
function findRowById(sheetName, id) {
  var sheet = getSheet(sheetName);
  var data  = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(id)) return i + 1; // 1-based
  }
  return -1;
}

// ===== หาแถวตาม column อื่น =====
function findRowByField(sheetName, fieldName, value) {
  var headers = HEADERS[sheetName];
  var colIdx  = headers.indexOf(fieldName);
  if (colIdx < 0) return -1;
  var sheet = getSheet(sheetName);
  var data  = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][colIdx]) === String(value)) return i + 1;
  }
  return -1;
}

// ===== ID ถัดไป =====
function nextId(sheetName) {
  var sheet  = getSheet(sheetName);
  var data   = sheet.getDataRange().getValues();
  if (data.length <= 1) return 1;
  var maxId = 0;
  for (var i = 1; i < data.length; i++) {
    var id = parseInt(data[i][0]);
    if (!isNaN(id) && id > maxId) maxId = id;
  }
  return maxId + 1;
}

// ===== เพิ่มแถว =====
function appendRow(sheetName, obj) {
  var sheet   = getSheet(sheetName);
  var headers = HEADERS[sheetName];
  var row     = headers.map(function(h) { return obj[h] !== undefined ? obj[h] : ''; });
  sheet.appendRow(row);
}

// ===== อัปเดตแถว =====
function updateRow(sheetName, id, updates) {
  var sheet   = getSheet(sheetName);
  var headers = HEADERS[sheetName];
  var rowNum  = findRowById(sheetName, id);
  if (rowNum < 0) return false;
  var rowData = sheet.getRange(rowNum, 1, 1, headers.length).getValues()[0];
  var obj     = rowToObj(headers, rowData);
  Object.keys(updates).forEach(function(k) { if (obj.hasOwnProperty(k)) obj[k] = updates[k]; });
  var newRow  = headers.map(function(h) { return obj[h] !== undefined ? obj[h] : ''; });
  sheet.getRange(rowNum, 1, 1, headers.length).setValues([newRow]);
  return true;
}

// ===== ลบแถว =====
function deleteRow(sheetName, id) {
  var sheet  = getSheet(sheetName);
  var rowNum = findRowById(sheetName, id);
  if (rowNum < 0) return false;
  sheet.deleteRow(rowNum);
  return true;
}

// ===== วันเวลาปัจจุบัน =====
function nowStr() {
  return Utilities.formatDate(new Date(), 'Asia/Bangkok', 'yyyy-MM-dd HH:mm:ss');
}

// ===== JSON Response =====
function respond(data) {
  return ContentService
    .createTextOutput(JSON.stringify({ success: true, data: data }))
    .setMimeType(ContentService.MimeType.JSON);
}

function respondError(message, code) {
  return ContentService
    .createTextOutput(JSON.stringify({ success: false, message: message || 'เกิดข้อผิดพลาด' }))
    .setMimeType(ContentService.MimeType.JSON);
}

// ===== Lock for concurrent writes =====
function withLock(fn) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    return fn();
  } finally {
    lock.releaseLock();
  }
}

// ===== แปลงตัวเลข =====
function toNum(v) { var n = parseFloat(v); return isNaN(n) ? 0 : n; }
function toInt(v) { var n = parseInt(v);   return isNaN(n) ? 0 : n; }
