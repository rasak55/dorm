function tenantsList(p) {
  var status  = p.status || '';
  var tenants = getAll(SHEET.TENANTS);
  var rooms   = getAll(SHEET.ROOMS);
  if (status) tenants = tenants.filter(function(t) { return t.status === status; });
  tenants.forEach(function(t) {
    t.id      = toInt(t.id);
    t.room_id = toInt(t.room_id);
    t.deposit = toNum(t.deposit);
    var r = rooms.find(function(r) { return String(r.id) === String(t.room_id); });
    t.room_number = r ? r.room_number : '';
  });
  return respond(tenants);
}

function tenantCreate(p, userId) {
  var roomId    = toInt(p.room_id);
  var fullName  = (p.full_name || '').trim();
  if (!roomId || !fullName) return respondError('กรุณากรอกข้อมูลให้ครบ');

  var rooms = getAll(SHEET.ROOMS);
  var room  = rooms.find(function(r) { return toInt(r.id) === roomId; });
  if (!room)                    return respondError('ไม่พบห้องนี้');
  if (room.status !== 'vacant') return respondError('ห้องนี้ไม่ว่าง');

  var id = withLock(function() {
    var newId = nextId(SHEET.TENANTS);
    appendRow(SHEET.TENANTS, {
      id:                newId,
      room_id:           roomId,
      full_name:         fullName,
      id_card:           p.id_card            || '',
      phone:             p.phone              || '',
      email:             p.email              || '',
      address:           p.address            || '',
      emergency_contact: p.emergency_contact  || '',
      emergency_phone:   p.emergency_phone    || '',
      start_date:        p.start_date         || Utilities.formatDate(new Date(),'Asia/Bangkok','yyyy-MM-dd'),
      end_date:          p.end_date           || '',
      deposit:           toNum(p.deposit),
      status:            'active',
      notes:             p.notes              || '',
      created_at:        nowStr(),
      updated_at:        nowStr()
    });
    updateRow(SHEET.ROOMS, roomId, { status: 'occupied', updated_at: nowStr() });
    return newId;
  });
  logActivity(userId, 'add_tenant', 'เพิ่มผู้เช่า ' + fullName + ' ห้อง ' + room.room_number, 'tenants', id);
  var tenants = getAll(SHEET.TENANTS);
  var rooms2  = getAll(SHEET.ROOMS);
  var t = tenants.find(function(t) { return String(t.id) === String(id); });
  if (t) { t.room_number = room.room_number; t.id = toInt(t.id); t.room_id = toInt(t.room_id); t.deposit = toNum(t.deposit); }
  return respond(t);
}

function tenantUpdate(p, userId) {
  var id       = toInt(p.id);
  var fullName = (p.full_name || '').trim();
  if (!id || !fullName) return respondError('ข้อมูลไม่ครบ');

  withLock(function() {
    updateRow(SHEET.TENANTS, id, {
      full_name:         fullName,
      id_card:           p.id_card           || '',
      phone:             p.phone             || '',
      email:             p.email             || '',
      address:           p.address           || '',
      emergency_contact: p.emergency_contact || '',
      emergency_phone:   p.emergency_phone   || '',
      start_date:        p.start_date        || '',
      end_date:          p.end_date          || '',
      deposit:           toNum(p.deposit),
      notes:             p.notes             || '',
      updated_at:        nowStr()
    });
  });
  logActivity(userId, 'edit_tenant', 'แก้ไขผู้เช่า ' + fullName, 'tenants', id);
  var tenants = getAll(SHEET.TENANTS);
  var rooms   = getAll(SHEET.ROOMS);
  var t = tenants.find(function(t) { return String(t.id) === String(id); });
  if (t) {
    var r = rooms.find(function(r) { return String(r.id) === String(t.room_id); });
    t.room_number = r ? r.room_number : '';
    t.id = toInt(t.id); t.room_id = toInt(t.room_id); t.deposit = toNum(t.deposit);
  }
  return respond(t);
}

function tenantCheckout(p, userId) {
  var id      = toInt(p.id);
  var tenants = getAll(SHEET.TENANTS);
  var tenant  = tenants.find(function(t) { return toInt(t.id) === id; });
  if (!tenant) return respondError('ไม่พบผู้เช่า');

  var rooms = getAll(SHEET.ROOMS);
  var room  = rooms.find(function(r) { return String(r.id) === String(tenant.room_id); });

  withLock(function() {
    updateRow(SHEET.TENANTS, id, {
      status:    'inactive',
      end_date:  Utilities.formatDate(new Date(),'Asia/Bangkok','yyyy-MM-dd'),
      updated_at: nowStr()
    });
    if (room) updateRow(SHEET.ROOMS, toInt(room.id), { status: 'vacant', updated_at: nowStr() });
  });
  logActivity(userId, 'checkout', 'ย้ายออก: ' + tenant.full_name + ' ห้อง ' + (room ? room.room_number : ''), 'tenants', id);
  return respond({ message: 'ย้ายออกเรียบร้อย' });
}

function tenantDelete(p, userId) {
  var id      = toInt(p.id);
  var tenants = getAll(SHEET.TENANTS);
  var tenant  = tenants.find(function(t) { return toInt(t.id) === id; });
  if (!tenant)                   return respondError('ไม่พบผู้เช่า');
  if (tenant.status === 'active') return respondError('ไม่สามารถลบผู้เช่าที่ยังอยู่อาศัย');

  withLock(function() { deleteRow(SHEET.TENANTS, id); });
  logActivity(userId, 'delete_tenant', 'ลบผู้เช่า ' + tenant.full_name, 'tenants', id);
  return respond({ message: 'ลบเรียบร้อย' });
}
