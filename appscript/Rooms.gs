function roomsList() {
  var rooms   = getAll(SHEET.ROOMS);
  var tenants = getAll(SHEET.TENANTS).filter(function(t) { return t.status === 'active'; });
  rooms.forEach(function(r) {
    r.id         = toInt(r.id);
    r.floor      = toInt(r.floor);
    r.rent_price = toNum(r.rent_price);
    var t = tenants.find(function(t) { return String(t.room_id) === String(r.id); });
    r.tenant_name = t ? t.full_name : '';
  });
  return respond(rooms);
}

function roomCreate(p, userId) {
  var roomNumber = (p.room_number || '').trim();
  if (!roomNumber) return respondError('กรุณาระบุเลขห้อง');

  var existing = getAll(SHEET.ROOMS);
  if (existing.find(function(r) { return r.room_number === roomNumber; }))
    return respondError('เลขห้องนี้มีอยู่แล้ว');

  var id = withLock(function() {
    var newId = nextId(SHEET.ROOMS);
    appendRow(SHEET.ROOMS, {
      id:          newId,
      room_number: roomNumber,
      floor:       toInt(p.floor) || 1,
      room_type:   p.room_type   || 'standard',
      rent_price:  toNum(p.rent_price),
      status:      p.status      || 'vacant',
      description: p.description || '',
      created_at:  nowStr(),
      updated_at:  nowStr()
    });
    return newId;
  });
  logActivity(userId, 'add_room', 'เพิ่มห้อง ' + roomNumber, 'rooms', id);
  var rooms = getAll(SHEET.ROOMS);
  var room  = rooms.find(function(r) { return String(r.id) === String(id); });
  return respond(room);
}

function roomUpdate(p, userId) {
  var id         = toInt(p.id);
  var roomNumber = (p.room_number || '').trim();
  if (!id || !roomNumber) return respondError('ข้อมูลไม่ครบ');

  var existing = getAll(SHEET.ROOMS);
  if (existing.find(function(r) { return r.room_number === roomNumber && toInt(r.id) !== id; }))
    return respondError('เลขห้องนี้มีอยู่แล้ว');

  withLock(function() {
    updateRow(SHEET.ROOMS, id, {
      room_number: roomNumber,
      floor:       toInt(p.floor) || 1,
      room_type:   p.room_type   || 'standard',
      rent_price:  toNum(p.rent_price),
      status:      p.status      || 'vacant',
      description: p.description || '',
      updated_at:  nowStr()
    });
  });
  logActivity(userId, 'edit_room', 'แก้ไขห้อง ' + roomNumber, 'rooms', id);
  var rooms = getAll(SHEET.ROOMS);
  return respond(rooms.find(function(r) { return String(r.id) === String(id); }));
}

function roomDelete(p, userId) {
  var id   = toInt(p.id);
  var rooms = getAll(SHEET.ROOMS);
  var room  = rooms.find(function(r) { return toInt(r.id) === id; });
  if (!room) return respondError('ไม่พบห้องนี้');
  if (room.status === 'occupied') return respondError('ไม่สามารถลบห้องที่มีผู้เช่าอยู่');

  withLock(function() { deleteRow(SHEET.ROOMS, id); });
  logActivity(userId, 'delete_room', 'ลบห้อง ' + room.room_number, 'rooms', id);
  return respond({ message: 'ลบเรียบร้อย' });
}
