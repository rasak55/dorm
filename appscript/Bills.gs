// ===== ดึงรายการบิล =====
function billsList(p) {
  var month   = toInt(p.month);
  var year    = toInt(p.year);
  var status  = p.status || '';
  var bills   = getAll(SHEET.BILLS).filter(function(b) {
    return toInt(b.bill_month) === month && toInt(b.bill_year) === year &&
           (!status || b.status === status);
  });
  var rooms   = getAll(SHEET.ROOMS);
  var tenants = getAll(SHEET.TENANTS);
  var meters  = getAll(SHEET.METERS);

  bills.forEach(function(b) {
    b.id              = toInt(b.id);
    b.room_id         = toInt(b.room_id);
    b.tenant_id       = toInt(b.tenant_id);
    b.bill_month      = toInt(b.bill_month);
    b.bill_year       = toInt(b.bill_year);
    b.rent_amount     = toNum(b.rent_amount);
    b.electric_units  = toNum(b.electric_units);
    b.electric_amount = toNum(b.electric_amount);
    b.water_units     = toNum(b.water_units);
    b.water_amount    = toNum(b.water_amount);
    b.other_amount    = toNum(b.other_amount);
    b.total_amount    = toNum(b.total_amount);
    var r = rooms.find(function(r)   { return String(r.id) === String(b.room_id); });
    var t = tenants.find(function(t) { return String(t.id) === String(b.tenant_id); });
    var m = meters.find(function(m)  { return String(m.room_id) === String(b.room_id) && toInt(m.bill_month) === b.bill_month && toInt(m.bill_year) === b.bill_year; });
    b.room_number   = r ? r.room_number : '';
    b.tenant_name   = t ? t.full_name   : '';
    b.prev_electric = m ? toNum(m.prev_electric) : null;
    b.curr_electric = m ? toNum(m.curr_electric) : null;
    b.prev_water    = m ? toNum(m.prev_water)    : null;
    b.curr_water    = m ? toNum(m.curr_water)    : null;
  });
  return respond(bills);
}

// ===== ห้องที่มีผู้เช่าพร้อมมิเตอร์ล่าสุด =====
function billsOccupiedRooms() {
  var rooms   = getAll(SHEET.ROOMS).filter(function(r) { return r.status === 'occupied'; });
  var tenants = getAll(SHEET.TENANTS).filter(function(t) { return t.status === 'active'; });
  var meters  = getAll(SHEET.METERS);

  var result = rooms.map(function(r) {
    var t = tenants.find(function(t) { return String(t.room_id) === String(r.id); });
    // หามิเตอร์ล่าสุด
    var roomMeters = meters.filter(function(m) { return String(m.room_id) === String(r.id); });
    roomMeters.sort(function(a, b) {
      if (toInt(b.bill_year) !== toInt(a.bill_year)) return toInt(b.bill_year) - toInt(a.bill_year);
      return toInt(b.bill_month) - toInt(a.bill_month);
    });
    var lastMeter = roomMeters[0] || null;
    return {
      id:               toInt(r.id),
      room_number:      r.room_number,
      floor:            toInt(r.floor),
      rent_price:       toNum(r.rent_price),
      tenant_name:      t ? t.full_name : '',
      last_electric:    lastMeter ? toNum(lastMeter.curr_electric) : null,
      last_water:       lastMeter ? toNum(lastMeter.curr_water)    : null,
      last_meter_month: lastMeter ? toInt(lastMeter.bill_month)    : null,
      last_meter_year:  lastMeter ? toInt(lastMeter.bill_year)     : null
    };
  });
  result.sort(function(a, b) { return a.floor - b.floor || a.room_number.localeCompare(b.room_number); });
  return respond(result);
}

// ===== upsert meter reading =====
function upsertMeter(roomId, month, year, prevE, currE, prevW, currW) {
  var meters  = getAll(SHEET.METERS);
  var existing = meters.find(function(m) {
    return String(m.room_id) === String(roomId) && toInt(m.bill_month) === month && toInt(m.bill_year) === year;
  });
  if (existing) {
    updateRow(SHEET.METERS, toInt(existing.id), { prev_electric: prevE, curr_electric: currE, prev_water: prevW, curr_water: currW });
  } else {
    appendRow(SHEET.METERS, { id: nextId(SHEET.METERS), room_id: roomId, bill_month: month, bill_year: year, prev_electric: prevE, curr_electric: currE, prev_water: prevW, curr_water: currW, created_at: nowStr() });
  }
}

// ===== สร้างบิลทุกห้อง =====
function billsCreateAll(p, userId) {
  var month = toInt(p.month);
  var year  = toInt(p.year);
  var rate  = getCurrentRate();
  if (!rate) return respondError('ไม่พบอัตราค่าใช้จ่าย');

  var rooms   = getAll(SHEET.ROOMS).filter(function(r) { return r.status === 'occupied'; });
  var tenants = getAll(SHEET.TENANTS).filter(function(t) { return t.status === 'active'; });
  var bills   = getAll(SHEET.BILLS);
  var d       = new Date(year, month - 1, 1);
  var lastDay = new Date(year, month, 0).getDate();
  var due     = year + '-' + ('0'+month).slice(-2) + '-' + lastDay;

  var created = 0, skipped = 0;
  withLock(function() {
    rooms.forEach(function(r) {
      var existing = bills.find(function(b) { return String(b.room_id) === String(r.id) && toInt(b.bill_month) === month && toInt(b.bill_year) === year; });
      if (existing) { skipped++; return; }
      var tenant = tenants.find(function(t) { return String(t.room_id) === String(r.id); });
      if (!tenant) return;
      var newId = nextId(SHEET.BILLS);
      appendRow(SHEET.BILLS, { id: newId, room_id: r.id, tenant_id: tenant.id, bill_month: month, bill_year: year, rent_amount: toNum(r.rent_price), electric_units: 0, electric_amount: 0, water_units: 0, water_amount: 0, other_amount: 0, other_description: '', total_amount: toNum(r.rent_price), due_date: due, status: 'pending', notes: '', created_at: nowStr(), updated_at: nowStr() });
      upsertMeter(r.id, month, year, 0, 0, 0, 0);
      created++;
    });
  });
  logActivity(userId, 'create_all_bills', 'สร้างบิลอัตโนมัติ ' + created + ' ห้อง เดือน ' + month + '/' + year, 'finance', null);
  return respond({ created: created, skipped: skipped });
}

// ===== สร้างบิลเดี่ยว =====
function billCreate(p, userId) {
  var roomId = toInt(p.room_id);
  var month  = toInt(p.bill_month);
  var year   = toInt(p.bill_year);
  if (!roomId) return respondError('กรุณาเลือกห้อง');

  var bills = getAll(SHEET.BILLS);
  if (bills.find(function(b) { return String(b.room_id) === String(roomId) && toInt(b.bill_month) === month && toInt(b.bill_year) === year; }))
    return respondError('มีบิลของห้องนี้ในเดือนนี้แล้ว');

  var tenants = getAll(SHEET.TENANTS);
  var tenant  = tenants.find(function(t) { return String(t.room_id) === String(roomId) && t.status === 'active'; });
  if (!tenant) return respondError('ไม่พบผู้เช่าในห้องนี้');

  var rate      = getCurrentRate();
  var prevE     = toNum(p.prev_electric);
  var currE     = toNum(p.curr_electric);
  var prevW     = toNum(p.prev_water);
  var currW     = toNum(p.curr_water);
  var rent      = toNum(p.rent_amount);
  var other     = toNum(p.other_amount);
  var eu        = Math.max(0, currE - prevE);
  var wu        = Math.max(0, currW - prevW);
  var ea        = eu * toNum(rate ? rate.electric_rate : 0);
  var wa        = wu * toNum(rate ? rate.water_rate    : 0);
  var total     = rent + ea + wa + other;
  var lastDay   = new Date(year, month, 0).getDate();
  var due       = year + '-' + ('0'+month).slice(-2) + '-' + lastDay;

  var rooms = getAll(SHEET.ROOMS);
  var room  = rooms.find(function(r) { return String(r.id) === String(roomId); });

  var id = withLock(function() {
    var newId = nextId(SHEET.BILLS);
    appendRow(SHEET.BILLS, { id: newId, room_id: roomId, tenant_id: tenant.id, bill_month: month, bill_year: year, rent_amount: rent, electric_units: eu, electric_amount: ea, water_units: wu, water_amount: wa, other_amount: other, other_description: p.other_description || '', total_amount: total, due_date: due, status: 'pending', notes: p.notes || '', created_at: nowStr(), updated_at: nowStr() });
    upsertMeter(roomId, month, year, prevE, currE, prevW, currW);
    return newId;
  });
  logActivity(userId, 'create_bill', 'สร้างบิลห้อง ' + (room ? room.room_number : roomId) + ' เดือน ' + month + '/' + year, 'finance', id);

  var allBills = getAll(SHEET.BILLS);
  var bill     = allBills.find(function(b) { return String(b.id) === String(id); });
  if (bill) {
    bill.id = toInt(bill.id); bill.room_number = room ? room.room_number : ''; bill.tenant_name = tenant.full_name;
    bill.rent_amount = toNum(bill.rent_amount); bill.total_amount = toNum(bill.total_amount);
    bill.prev_electric = prevE; bill.curr_electric = currE; bill.prev_water = prevW; bill.curr_water = currW;
  }
  return respond(bill);
}

// ===== แก้ไขบิล =====
function billUpdate(p, userId) {
  var id    = toInt(p.id);
  var bills = getAll(SHEET.BILLS);
  var bill  = bills.find(function(b) { return String(b.id) === String(id); });
  if (!bill) return respondError('ไม่พบบิล');

  var rate  = getCurrentRate();
  var prevE = toNum(p.prev_electric);
  var currE = toNum(p.curr_electric);
  var prevW = toNum(p.prev_water);
  var currW = toNum(p.curr_water);
  var rent  = toNum(p.rent_amount);
  var other = toNum(p.other_amount);
  var eu    = Math.max(0, currE - prevE);
  var wu    = Math.max(0, currW - prevW);
  var ea    = eu * toNum(rate ? rate.electric_rate : 0);
  var wa    = wu * toNum(rate ? rate.water_rate    : 0);
  var total = rent + ea + wa + other;

  withLock(function() {
    updateRow(SHEET.BILLS, id, { rent_amount: rent, electric_units: eu, electric_amount: ea, water_units: wu, water_amount: wa, other_amount: other, total_amount: total, status: p.status || bill.status, updated_at: nowStr() });
    upsertMeter(toInt(bill.room_id), toInt(bill.bill_month), toInt(bill.bill_year), prevE, currE, prevW, currW);
  });

  var rooms   = getAll(SHEET.ROOMS);
  var tenants = getAll(SHEET.TENANTS);
  var r = rooms.find(function(r)   { return String(r.id) === String(bill.room_id); });
  var t = tenants.find(function(t) { return String(t.id) === String(bill.tenant_id); });
  logActivity(userId, 'update_bill', 'แก้ไขบิลห้อง ' + (r ? r.room_number : bill.room_id), 'finance', id);

  var updated = getAll(SHEET.BILLS).find(function(b) { return String(b.id) === String(id); });
  if (updated) {
    updated.id = toInt(updated.id); updated.room_number = r ? r.room_number : ''; updated.tenant_name = t ? t.full_name : '';
    updated.total_amount = toNum(updated.total_amount); updated.rent_amount = toNum(updated.rent_amount);
    updated.prev_electric = prevE; updated.curr_electric = currE; updated.prev_water = prevW; updated.curr_water = currW;
  }
  return respond(updated);
}

// ===== ลบบิล =====
function billDelete(p, userId) {
  var id    = toInt(p.id);
  var bills = getAll(SHEET.BILLS);
  var bill  = bills.find(function(b) { return String(b.id) === String(id); });
  if (!bill)                 return respondError('ไม่พบบิล');
  if (bill.status === 'paid') return respondError('ไม่สามารถลบบิลที่ชำระแล้ว');

  var rooms = getAll(SHEET.ROOMS);
  var room  = rooms.find(function(r) { return String(r.id) === String(bill.room_id); });
  withLock(function() { deleteRow(SHEET.BILLS, id); });
  logActivity(userId, 'delete_bill', 'ลบบิลห้อง ' + (room ? room.room_number : bill.room_id), 'finance', id);
  return respond({ message: 'ลบเรียบร้อย' });
}
