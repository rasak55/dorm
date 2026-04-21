<?php
require_once __DIR__ . '/_common.php';
requireAuth();

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';
$id     = isset($_GET['id']) ? (int)$_GET['id'] : 0;
$db     = getDB();

if ($method === 'GET') {
    $status  = $_GET['status'] ?? '';
    $tenants = getAllTenants($status ?: null);
    foreach ($tenants as &$t) {
        $t['id']      = (int)$t['id'];
        $t['room_id'] = (int)$t['room_id'];
        $t['deposit'] = (float)$t['deposit'];
    }
    jsonSuccess($tenants);
}

if ($method === 'POST' && $action === 'checkout') {
    if (!$id) jsonError('ต้องระบุ id');
    $t = getTenantById($id);
    if (!$t) jsonError('ไม่พบผู้เช่า', 404);

    $db->prepare("UPDATE dorm_tenants SET status='inactive', end_date=CURDATE(), updated_at=NOW() WHERE id=?")
       ->execute([$id]);
    $db->prepare("UPDATE dorm_rooms SET status='vacant', updated_at=NOW() WHERE id=?")
       ->execute([$t['room_id']]);
    logActivity('checkout', "ย้ายออก: {$t['full_name']} ห้อง {$t['room_number']}", 'tenants', $id);
    jsonSuccess(['message' => 'ย้ายออกเรียบร้อย']);
}

if ($method === 'POST') {
    $b = getBody();
    $room_id           = (int)($b['room_id'] ?? 0);
    $full_name         = trim($b['full_name'] ?? '');
    $id_card           = trim($b['id_card'] ?? '');
    $phone             = trim($b['phone'] ?? '');
    $email             = trim($b['email'] ?? '');
    $address           = trim($b['address'] ?? '');
    $emergency_contact = trim($b['emergency_contact'] ?? '');
    $emergency_phone   = trim($b['emergency_phone'] ?? '');
    $start_date        = $b['start_date'] ?? date('Y-m-d');
    $end_date          = $b['end_date'] ?? null;
    $deposit           = (float)($b['deposit'] ?? 0);
    $notes             = trim($b['notes'] ?? '');

    if (!$room_id || !$full_name) jsonError('กรุณากรอกข้อมูลให้ครบ');

    // check room vacant
    $room = getRoomById($room_id);
    if (!$room) jsonError('ไม่พบห้องนี้', 404);
    if ($room['status'] !== 'vacant') jsonError('ห้องนี้ไม่ว่าง');

    $stmt = $db->prepare("INSERT INTO dorm_tenants (room_id, full_name, id_card, phone, email, address, emergency_contact, emergency_phone, start_date, end_date, deposit, status, notes) VALUES (?,?,?,?,?,?,?,?,?,?,?,'active',?)");
    $stmt->execute([$room_id, $full_name, $id_card, $phone, $email, $address, $emergency_contact, $emergency_phone, $start_date, $end_date ?: null, $deposit, $notes]);
    $newId = (int)$db->lastInsertId();

    $db->prepare("UPDATE dorm_rooms SET status='occupied', updated_at=NOW() WHERE id=?")->execute([$room_id]);
    logActivity('add_tenant', "เพิ่มผู้เช่า $full_name ห้อง {$room['room_number']}", 'tenants', $newId);
    jsonSuccess(getTenantById($newId), 201);
}

if ($method === 'PUT') {
    if (!$id) jsonError('ต้องระบุ id');
    $b = getBody();
    $full_name         = trim($b['full_name'] ?? '');
    $id_card           = trim($b['id_card'] ?? '');
    $phone             = trim($b['phone'] ?? '');
    $email             = trim($b['email'] ?? '');
    $address           = trim($b['address'] ?? '');
    $emergency_contact = trim($b['emergency_contact'] ?? '');
    $emergency_phone   = trim($b['emergency_phone'] ?? '');
    $start_date        = $b['start_date'] ?? date('Y-m-d');
    $end_date          = $b['end_date'] ?? null;
    $deposit           = (float)($b['deposit'] ?? 0);
    $notes             = trim($b['notes'] ?? '');

    if (!$full_name) jsonError('กรุณาระบุชื่อผู้เช่า');

    $stmt = $db->prepare("UPDATE dorm_tenants SET full_name=?, id_card=?, phone=?, email=?, address=?, emergency_contact=?, emergency_phone=?, start_date=?, end_date=?, deposit=?, notes=?, updated_at=NOW() WHERE id=?");
    $stmt->execute([$full_name, $id_card, $phone, $email, $address, $emergency_contact, $emergency_phone, $start_date, $end_date ?: null, $deposit, $notes, $id]);
    logActivity('edit_tenant', "แก้ไขผู้เช่า $full_name", 'tenants', $id);
    jsonSuccess(getTenantById($id));
}

if ($method === 'DELETE') {
    if (!$id) jsonError('ต้องระบุ id');
    $t = getTenantById($id);
    if (!$t) jsonError('ไม่พบผู้เช่า', 404);
    if ($t['status'] === 'active') jsonError('ไม่สามารถลบผู้เช่าที่ยังอยู่อาศัย');

    $db->prepare("DELETE FROM dorm_tenants WHERE id=?")->execute([$id]);
    logActivity('delete_tenant', "ลบผู้เช่า {$t['full_name']}", 'tenants', $id);
    jsonSuccess(['message' => 'ลบเรียบร้อย']);
}

jsonError('Method not allowed', 405);
