<?php
require_once __DIR__ . '/_common.php';
requireAuth();

$method = $_SERVER['REQUEST_METHOD'];
$id     = isset($_GET['id']) ? (int)$_GET['id'] : 0;
$db     = getDB();

if ($method === 'GET') {
    $rooms = getAllRooms();
    // cast numeric
    foreach ($rooms as &$r) {
        $r['id']         = (int)$r['id'];
        $r['floor']      = (int)$r['floor'];
        $r['rent_price'] = (float)$r['rent_price'];
    }
    jsonSuccess($rooms);
}

if ($method === 'POST') {
    $b = getBody();
    $room_number = trim($b['room_number'] ?? '');
    $floor       = (int)($b['floor'] ?? 1);
    $room_type   = $b['room_type'] ?? 'standard';
    $rent_price  = (float)($b['rent_price'] ?? 0);
    $status      = $b['status'] ?? 'vacant';
    $description = trim($b['description'] ?? '');

    if (!$room_number) jsonError('กรุณาระบุเลขห้อง');

    // check duplicate
    $chk = $db->prepare("SELECT id FROM dorm_rooms WHERE room_number = ?");
    $chk->execute([$room_number]);
    if ($chk->fetch()) jsonError('เลขห้องนี้มีอยู่แล้ว');

    $stmt = $db->prepare("INSERT INTO dorm_rooms (room_number, floor, room_type, rent_price, status, description) VALUES (?,?,?,?,?,?)");
    $stmt->execute([$room_number, $floor, $room_type, $rent_price, $status, $description]);
    $newId = (int)$db->lastInsertId();
    logActivity('add_room', "เพิ่มห้อง $room_number", 'rooms', $newId);
    jsonSuccess(getRoomById($newId), 201);
}

if ($method === 'PUT') {
    if (!$id) jsonError('ต้องระบุ id');
    $b = getBody();
    $room_number = trim($b['room_number'] ?? '');
    $floor       = (int)($b['floor'] ?? 1);
    $room_type   = $b['room_type'] ?? 'standard';
    $rent_price  = (float)($b['rent_price'] ?? 0);
    $status      = $b['status'] ?? 'vacant';
    $description = trim($b['description'] ?? '');

    if (!$room_number) jsonError('กรุณาระบุเลขห้อง');

    // check duplicate (exclude self)
    $chk = $db->prepare("SELECT id FROM dorm_rooms WHERE room_number = ? AND id != ?");
    $chk->execute([$room_number, $id]);
    if ($chk->fetch()) jsonError('เลขห้องนี้มีอยู่แล้ว');

    $stmt = $db->prepare("UPDATE dorm_rooms SET room_number=?, floor=?, room_type=?, rent_price=?, status=?, description=?, updated_at=NOW() WHERE id=?");
    $stmt->execute([$room_number, $floor, $room_type, $rent_price, $status, $description, $id]);
    logActivity('edit_room', "แก้ไขห้อง $room_number", 'rooms', $id);
    jsonSuccess(getRoomById($id));
}

if ($method === 'DELETE') {
    if (!$id) jsonError('ต้องระบุ id');
    $room = getRoomById($id);
    if (!$room) jsonError('ไม่พบห้องนี้', 404);
    if ($room['status'] === 'occupied') jsonError('ไม่สามารถลบห้องที่มีผู้เช่าอยู่');

    $db->prepare("DELETE FROM dorm_rooms WHERE id=?")->execute([$id]);
    logActivity('delete_room', "ลบห้อง {$room['room_number']}", 'rooms', $id);
    jsonSuccess(['message' => 'ลบเรียบร้อย']);
}

jsonError('Method not allowed', 405);
