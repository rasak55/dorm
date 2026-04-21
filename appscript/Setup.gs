/**
 * รัน Setup() ครั้งเดียวเพื่อสร้าง Sheet และข้อมูลเริ่มต้น
 * Extensions > Apps Script > เลือก Setup > Run
 */
function Setup() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  // สร้าง Sheet ทั้งหมด
  Object.keys(HEADERS).forEach(function(name) {
    var sheet = ss.getSheetByName(name);
    if (!sheet) {
      sheet = ss.insertSheet(name);
    } else {
      sheet.clear();
    }
    // ใส่ header row
    sheet.getRange(1, 1, 1, HEADERS[name].length).setValues([HEADERS[name]]);
    sheet.getRange(1, 1, 1, HEADERS[name].length).setFontWeight('bold').setBackground('#4285f4').setFontColor('#ffffff');
    sheet.setFrozenRows(1);
  });

  // ลบ Sheet เริ่มต้น "Sheet1" ถ้ามี
  var defaultSheet = ss.getSheetByName('Sheet1');
  if (defaultSheet && ss.getSheets().length > 1) ss.deleteSheet(defaultSheet);

  // ===== ข้อมูลเริ่มต้น =====

  // Admin user (password: admin1234)
  appendRow(SHEET.USERS, {
    id:            1,
    username:      'admin',
    password_hash: hashPassword('admin1234'),
    full_name:     'ผู้ดูแลระบบ',
    role:          'admin',
    created_at:    nowStr()
  });

  // อัตราค่าใช้จ่าย
  appendRow(SHEET.RATES, {
    id:             1,
    name:           'อัตราปกติ',
    electric_rate:  6.00,
    water_rate:     18.00,
    other_fee:      0,
    effective_date: Utilities.formatDate(new Date(),'Asia/Bangkok','yyyy-MM-dd'),
    notes:          'อัตราเริ่มต้น',
    created_at:     nowStr()
  });

  // ห้องตัวอย่าง
  [
    { id:1, room_number:'101', floor:1, room_type:'standard', rent_price:3500, status:'vacant',   description:'ห้องมาตรฐาน' },
    { id:2, room_number:'102', floor:1, room_type:'standard', rent_price:3500, status:'vacant',   description:'ห้องมาตรฐาน' },
    { id:3, room_number:'201', floor:2, room_type:'deluxe',   rent_price:4500, status:'vacant',   description:'ห้องดีลักซ์' },
    { id:4, room_number:'202', floor:2, room_type:'deluxe',   rent_price:4500, status:'vacant',   description:'ห้องดีลักซ์' },
  ].forEach(function(r) {
    appendRow(SHEET.ROOMS, Object.assign(r, { created_at: nowStr(), updated_at: nowStr() }));
  });

  // จัดรูปแบบ column width
  SpreadsheetApp.flush();

  SpreadsheetApp.getUi().alert(
    '✅ Setup เสร็จสิ้น!\n\n' +
    'สร้าง Sheet: ' + Object.keys(HEADERS).join(', ') + '\n' +
    'Admin: username=admin / password=admin1234\n\n' +
    'ขั้นตอนถัดไป:\n' +
    '1. Deploy > New deployment > Web App\n' +
    '2. Execute as: Me\n' +
    '3. Who has access: Anyone\n' +
    '4. คัดลอก URL ไปใส่ใน .env (VITE_GAS_URL)'
  );
}

/**
 * ทดสอบ API (รันใน Apps Script editor)
 */
function testApi() {
  var result = authLogin({ username: 'admin', password: 'admin1234' });
  Logger.log(result.getContent());
}
