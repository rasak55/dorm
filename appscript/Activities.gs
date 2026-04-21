function logActivity(userId, action, description, module, refId) {
  try {
    appendRow(SHEET.ACTIVITIES, {
      id:          nextId(SHEET.ACTIVITIES),
      user_id:     userId || '',
      action:      action      || '',
      description: description || '',
      module:      module      || '',
      ref_id:      refId       || '',
      created_at:  nowStr()
    });
  } catch(e) { /* ไม่หยุดระบบถ้า log ไม่ได้ */ }
}

function activitiesList(p) {
  var module = p.module || '';
  var search = (p.search || '').toLowerCase();
  var date   = p.date   || '';
  var limit  = Math.min(toInt(p.limit) || 200, 500);

  var users = getAll(SHEET.USERS);
  var rows  = getAll(SHEET.ACTIVITIES);

  rows.sort(function(a, b) { return new Date(b.created_at) - new Date(a.created_at); });

  if (module) rows = rows.filter(function(r) { return r.module === module; });
  if (search) rows = rows.filter(function(r) { return r.description.toLowerCase().includes(search) || r.action.toLowerCase().includes(search); });
  if (date)   rows = rows.filter(function(r) { return r.created_at.slice(0,10) === date; });

  rows = rows.slice(0, limit);
  rows.forEach(function(r) {
    r.id = toInt(r.id);
    var u = users.find(function(u) { return String(u.id) === String(r.user_id); });
    r.full_name = u ? u.full_name : '';
  });
  return respond(rows);
}

function activitiesClear(p, userId) {
  var days = toInt(p.days) || 30;
  var cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);

  var sheet   = getSheet(SHEET.ACTIVITIES);
  var headers = HEADERS[SHEET.ACTIVITIES];
  var colIdx  = headers.indexOf('created_at');
  var data    = sheet.getDataRange().getValues();

  withLock(function() {
    // ลบจากล่างขึ้นบน เพื่อไม่ให้ row index เปลี่ยน
    for (var i = data.length - 1; i >= 1; i--) {
      var dt = new Date(data[i][colIdx]);
      if (!isNaN(dt) && dt < cutoff) sheet.deleteRow(i + 1);
    }
  });

  logActivity(userId, 'clear_log', 'ลบ log เก่ากว่า ' + days + ' วัน', 'history', null);
  return respond({ message: 'ลบ log เก่ากว่า ' + days + ' วันเรียบร้อย' });
}
