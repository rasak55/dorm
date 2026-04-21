<?php
require_once __DIR__ . '/_common.php';

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';

// GET — ตรวจสอบ session ปัจจุบัน
if ($method === 'GET') {
    if (isset($_SESSION['user_id'])) {
        jsonSuccess([
            'id'        => $_SESSION['user_id'],
            'username'  => $_SESSION['username'],
            'full_name' => $_SESSION['full_name'],
            'role'      => $_SESSION['role'],
        ]);
    }
    jsonError('Not logged in', 401);
}

// POST login
if ($method === 'POST' && $action === 'login') {
    $body     = getBody();
    $username = trim($body['username'] ?? '');
    $password = $body['password'] ?? '';

    if (!$username || !$password) {
        jsonError('กรุณากรอกข้อมูลให้ครบ');
    }

    $db   = getDB();
    $stmt = $db->prepare("SELECT * FROM dorm_users WHERE username = ?");
    $stmt->execute([$username]);
    $user = $stmt->fetch();

    if (!$user || !password_verify($password, $user['password'])) {
        logActivity('login_failed', "ล็อกอินไม่สำเร็จ: $username", 'auth');
        jsonError('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง', 401);
    }

    $_SESSION['user_id']  = $user['id'];
    $_SESSION['username'] = $user['username'];
    $_SESSION['full_name'] = $user['full_name'];
    $_SESSION['role']     = $user['role'];

    logActivity('login', 'ล็อกอินสำเร็จ', 'auth');

    jsonSuccess([
        'id'        => $user['id'],
        'username'  => $user['username'],
        'full_name' => $user['full_name'],
        'role'      => $user['role'],
    ]);
}

// POST logout
if ($method === 'POST' && $action === 'logout') {
    requireAuth();
    logActivity('logout', 'ออกจากระบบ', 'auth');
    session_destroy();
    jsonSuccess(['message' => 'Logged out']);
}

jsonError('Method not allowed', 405);
