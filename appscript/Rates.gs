function getCurrentRate() {
  var rates = getAll(SHEET.RATES);
  if (!rates.length) return null;
  rates.sort(function(a, b) {
    var d = new Date(b.effective_date) - new Date(a.effective_date);
    return d !== 0 ? d : toInt(b.id) - toInt(a.id);
  });
  return rates[0];
}

function ratesList() {
  var rates   = getAll(SHEET.RATES);
  var current = getCurrentRate();
  rates.sort(function(a, b) {
    var d = new Date(b.effective_date) - new Date(a.effective_date);
    return d !== 0 ? d : toInt(b.id) - toInt(a.id);
  });
  rates.forEach(function(r) {
    r.id           = toInt(r.id);
    r.electric_rate = toNum(r.electric_rate);
    r.water_rate   = toNum(r.water_rate);
    r.other_fee    = toNum(r.other_fee);
    r.is_current   = current ? String(r.id) === String(current.id) : false;
  });
  return respond(rates);
}

function rateCreate(p, userId) {
  var name = (p.name || '').trim();
  if (!name) return respondError('กรุณาระบุชื่อเรท');

  var id = withLock(function() {
    var newId = nextId(SHEET.RATES);
    appendRow(SHEET.RATES, {
      id:             newId,
      name:           name,
      electric_rate:  toNum(p.electric_rate),
      water_rate:     toNum(p.water_rate),
      other_fee:      toNum(p.other_fee),
      effective_date: p.effective_date || Utilities.formatDate(new Date(),'Asia/Bangkok','yyyy-MM-dd'),
      notes:          p.notes          || '',
      created_at:     nowStr()
    });
    return newId;
  });
  logActivity(userId, 'add_rate', 'เพิ่มเรทค่าใช้จ่าย ' + name, 'rates', id);
  var rates = getAll(SHEET.RATES);
  var rate  = rates.find(function(r) { return String(r.id) === String(id); });
  if (rate) { rate.id = toInt(rate.id); rate.electric_rate = toNum(rate.electric_rate); rate.water_rate = toNum(rate.water_rate); rate.other_fee = toNum(rate.other_fee); rate.is_current = true; }
  return respond(rate);
}

function rateUpdate(p, userId) {
  var id   = toInt(p.id);
  var name = (p.name || '').trim();
  if (!id || !name) return respondError('ข้อมูลไม่ครบ');

  withLock(function() {
    updateRow(SHEET.RATES, id, {
      name:           name,
      electric_rate:  toNum(p.electric_rate),
      water_rate:     toNum(p.water_rate),
      other_fee:      toNum(p.other_fee),
      effective_date: p.effective_date || Utilities.formatDate(new Date(),'Asia/Bangkok','yyyy-MM-dd'),
      notes:          p.notes          || ''
    });
  });
  logActivity(userId, 'edit_rate', 'แก้ไขเรทค่าใช้จ่าย ' + name, 'rates', id);
  var rates   = getAll(SHEET.RATES);
  var current = getCurrentRate();
  var rate    = rates.find(function(r) { return String(r.id) === String(id); });
  if (rate) { rate.id = toInt(rate.id); rate.electric_rate = toNum(rate.electric_rate); rate.water_rate = toNum(rate.water_rate); rate.other_fee = toNum(rate.other_fee); rate.is_current = current ? String(rate.id) === String(current.id) : false; }
  return respond(rate);
}

function rateSetCurrent(p, userId) {
  var id   = toInt(p.id);
  var today = Utilities.formatDate(new Date(),'Asia/Bangkok','yyyy-MM-dd');
  withLock(function() {
    updateRow(SHEET.RATES, id, { effective_date: today });
  });
  logActivity(userId, 'set_current_rate', 'ตั้งเรทปัจจุบัน id=' + id, 'rates', id);
  return respond({ message: 'ตั้งเรทปัจจุบันเรียบร้อย' });
}

function rateDelete(p, userId) {
  var id    = toInt(p.id);
  var rates = getAll(SHEET.RATES);
  if (rates.length <= 1) return respondError('ต้องมีอย่างน้อย 1 เรท');
  withLock(function() { deleteRow(SHEET.RATES, id); });
  logActivity(userId, 'delete_rate', 'ลบเรทค่าใช้จ่าย id=' + id, 'rates', id);
  return respond({ message: 'ลบเรียบร้อย' });
}
