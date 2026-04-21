// ===== Hash รหัสผ่านด้วย SHA-256 =====
function hashPassword(password) {
  var bytes = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    password,
    Utilities.Charset.UTF_8
  );
  return bytes.map(function(b) {
    return ('0' + (b & 0xff).toString(16)).slice(-2);
  }).join('');
}

// ===== สร้าง token =====
function generateToken() {
  return Utilities.getUuid().replace(/-/g, '');
}

// ===== ตรวจสอบ token =====
function verifyToken(token) {
  if (!token) return null;
  var sessions = getAll(SHEET.SESSIONS);
  var now      = new Date();
  var sess     = sessions.find(function(s) {
    return s.token === token && new Date(s.expires_at) > now;
  });
  return sess || null;
}

// ===== Login =====
function authLogin(p) {
  var username = (p.username || '').trim();
  var password = p.password || '';
  if (!username || !password) return respondError('กรุณากรอกข้อมูลให้ครบ');

  var users = getAll(SHEET.USERS);
  var user  = users.find(function(u) { return u.username === username; });
  if (!user || user.password_hash !== hashPassword(password)) {
    logActivity(null, 'login_failed', 'ล็อกอินไม่สำเร็จ: ' + username, 'auth', null);
    return respondError('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
  }

  var token     = generateToken();
  var expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 1); // 24 ชั่วโมง

  withLock(function() {
    appendRow(SHEET.SESSIONS, {
      token:      token,
      user_id:    user.id,
      username:   user.username,
      full_name:  user.full_name,
      role:       user.role,
      created_at: nowStr(),
      expires_at: Utilities.formatDate(expiresAt, 'Asia/Bangkok', 'yyyy-MM-dd HH:mm:ss')
    });
  });

  logActivity(user.id, 'login', 'ล็อกอินสำเร็จ', 'auth', null);

  return respond({
    token:     token,
    id:        user.id,
    username:  user.username,
    full_name: user.full_name,
    role:      user.role
  });
}

// ===== Logout =====
function authLogout(p) {
  var sess = verifyToken(p.token);
  if (sess) {
    logActivity(sess.user_id, 'logout', 'ออกจากระบบ', 'auth', null);
    // ลบ session
    var sheet   = getSheet(SHEET.SESSIONS);
    var headers = HEADERS[SHEET.SESSIONS];
    var colIdx  = headers.indexOf('token');
    var data    = sheet.getDataRange().getValues();
    for (var i = 1; i < data.length; i++) {
      if (data[i][colIdx] === p.token) { sheet.deleteRow(i + 1); break; }
    }
  }
  return respond({ message: 'Logged out' });
}

// ===== Me =====
function authMe(p) {
  var sess = verifyToken(p.token);
  if (!sess) return respondError('Unauthorized', 401);
  return respond({
    id:        toInt(sess.user_id),
    username:  sess.username,
    full_name: sess.full_name,
    role:      sess.role
  });
}
