// ===== จุดเริ่มต้น GET request =====
function doGet(e) {
  try {
    var p        = e.parameter || {};
    var resource = p.resource  || '';
    var action   = p.action    || 'list';

    // ถ้าไม่มี resource → serve React app
    if (!resource) {
      return HtmlService.createHtmlOutputFromFile('index')
        .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
        .setSandboxMode(HtmlService.SandboxMode.IFRAME);
    }

    // Auth ไม่ต้องการ token
    if (resource === 'auth') {
      if (action === 'me')     return authMe(p);
      if (action === 'logout') return authLogout(p);
      return respondError('action ไม่ถูกต้อง');
    }

    // ทุก resource อื่นต้องการ token
    var sess = verifyToken(p.token);
    if (!sess) return respondError('Unauthorized - กรุณาล็อกอินใหม่', 401);
    var userId = toInt(sess.user_id);

    if (resource === 'dashboard')  return dashboardGet(userId);
    if (resource === 'rooms')      return roomsList();
    if (resource === 'tenants')    return tenantsList(p);
    if (resource === 'bills') {
      if (action === 'occupied_rooms') return billsOccupiedRooms();
      return billsList(p);
    }
    if (resource === 'rates')      return ratesList();
    if (resource === 'reports')    return reportsGet(p);
    if (resource === 'activities') return activitiesList(p);

    return respondError('resource ไม่ถูกต้อง');
  } catch(err) {
    return respondError('Server error: ' + err.message);
  }
}

// ===== จุดเริ่มต้น POST request =====
function doPost(e) {
  try {
    var p        = e.parameter || {};
    var resource = p.resource  || '';
    var action   = p.action    || '';

    // Login ไม่ต้องการ token
    if (resource === 'auth' && action === 'login') return authLogin(p);

    // ทุก action อื่นต้องการ token
    var sess = verifyToken(p.token);
    if (!sess) return respondError('Unauthorized - กรุณาล็อกอินใหม่', 401);
    var userId = toInt(sess.user_id);

    if (resource === 'auth' && action === 'logout') return authLogout(p);

    if (resource === 'rooms') {
      if (action === 'create') return roomCreate(p, userId);
      if (action === 'update') return roomUpdate(p, userId);
      if (action === 'delete') return roomDelete(p, userId);
    }

    if (resource === 'tenants') {
      if (action === 'create')   return tenantCreate(p, userId);
      if (action === 'update')   return tenantUpdate(p, userId);
      if (action === 'checkout') return tenantCheckout(p, userId);
      if (action === 'delete')   return tenantDelete(p, userId);
    }

    if (resource === 'bills') {
      if (action === 'create_all') return billsCreateAll(p, userId);
      if (action === 'create')     return billCreate(p, userId);
      if (action === 'update')     return billUpdate(p, userId);
      if (action === 'delete')     return billDelete(p, userId);
    }

    if (resource === 'rates') {
      if (action === 'create')      return rateCreate(p, userId);
      if (action === 'update')      return rateUpdate(p, userId);
      if (action === 'set_current') return rateSetCurrent(p, userId);
      if (action === 'delete')      return rateDelete(p, userId);
    }

    if (resource === 'activities' && action === 'clear') return activitiesClear(p, userId);

    return respondError('resource/action ไม่ถูกต้อง');
  } catch(err) {
    return respondError('Server error: ' + err.message);
  }
}

// ===== Dashboard =====
function dashboardGet(userId) {
  var rooms   = getAll(SHEET.ROOMS);
  var tenants = getAll(SHEET.TENANTS).filter(function(t) { return t.status === 'active'; });
  var bills   = getAll(SHEET.BILLS);
  var now     = new Date();
  var month   = now.getMonth() + 1;
  var year    = now.getFullYear();

  var monthlyIncome = bills.filter(function(b) { return toInt(b.bill_month) === month && toInt(b.bill_year) === year && b.status === 'paid'; })
    .reduce(function(s, b) { return s + toNum(b.total_amount); }, 0);

  var roomStatus = {};
  rooms.forEach(function(r) { roomStatus[r.status] = (roomStatus[r.status] || 0) + 1; });

  // 6 เดือนล่าสุด
  var MONTHS = ['','ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];
  var chart6 = [];
  for (var i = 5; i >= 0; i--) {
    var d = new Date(year, month - 1 - i, 1);
    var m = d.getMonth() + 1, y = d.getFullYear();
    var income = bills.filter(function(b) { return toInt(b.bill_month) === m && toInt(b.bill_year) === y && b.status === 'paid'; })
      .reduce(function(s, b) { return s + toNum(b.total_amount); }, 0);
    chart6.push({ label: MONTHS[m], value: income, month: m, year: y });
  }

  // Recent activities
  var users    = getAll(SHEET.USERS);
  var activities = getAll(SHEET.ACTIVITIES);
  activities.sort(function(a, b) { return new Date(b.created_at) - new Date(a.created_at); });
  var recent = activities.slice(0, 10).map(function(a) {
    a.id = toInt(a.id);
    var u = users.find(function(u) { return String(u.id) === String(a.user_id); });
    a.full_name = u ? u.full_name : '';
    return a;
  });

  return respond({
    stats: {
      total_rooms:     rooms.length,
      vacant_rooms:    (roomStatus['vacant']      || 0),
      occupied_rooms:  (roomStatus['occupied']    || 0),
      maintenance_rooms: (roomStatus['maintenance'] || 0),
      active_tenants:  tenants.length,
      monthly_income:  monthlyIncome,
      pending_bills:   bills.filter(function(b) { return b.status === 'pending'; }).length,
      overdue_bills:   bills.filter(function(b) { return b.status === 'overdue'; }).length,
      room_status:     roomStatus
    },
    chart6months: chart6,
    recent:       recent
  });
}
