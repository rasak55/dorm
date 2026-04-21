<?php
require_once __DIR__ . '/_common.php';
requireAuth();

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';
$id     = isset($_GET['id']) ? (int)$_GET['id'] : 0;
$db     = getDB();

if ($method === 'GET') {
    $stmt  = $db->query("SELECT * FROM dorm_utility_rates ORDER BY effective_date DESC, id DESC");
    $rates = $stmt->fetchAll();
    $current = getCurrentRate();

    foreach ($rates as &$r) {
        $r['id']           = (int)$r['id'];
        $r['electric_rate'] = (float)$r['electric_rate'];
        $r['water_rate']   = (float)$r['water_rate'];
        $r['other_fee']    = (float)$r['other_fee'];
        $r['is_current']   = ($current && $r['id'] === $current['id']);
    }
    jsonSuccess($rates);
}

if ($method === 'POST' && $action === 'set_current') {
    if (!$id) jsonError('ต้องระบุ id');
    $db->prepare("UPDATE dorm_utility_rates SET effective_date=CURDATE() WHERE id=?")->execute([$id]);
    logActivity('set_current_rate', "ตั้งเรทปัจจุบัน id=$id", 'rates', $id);
    jsonSuccess(['message' => 'ตั้งเรทปัจจุบันเรียบร้อย']);
}

if ($method === 'POST') {
    $b              = getBody();
    $name           = trim($b['name'] ?? '');
    $electric_rate  = (float)($b['electric_rate'] ?? 0);
    $water_rate     = (float)($b['water_rate'] ?? 0);
    $other_fee      = (float)($b['other_fee'] ?? 0);
    $effective_date = $b['effective_date'] ?? date('Y-m-d');
    $notes          = trim($b['notes'] ?? '');

    if (!$name) jsonError('กรุณาระบุชื่อเรท');

    $db->prepare("INSERT INTO dorm_utility_rates (name, electric_rate, water_rate, other_fee, effective_date, notes) VALUES (?,?,?,?,?,?)")
       ->execute([$name, $electric_rate, $water_rate, $other_fee, $effective_date, $notes]);
    $newId = (int)$db->lastInsertId();
    logActivity('add_rate', "เพิ่มเรทค่าใช้จ่าย $name", 'rates', $newId);

    $stmt = $db->prepare("SELECT * FROM dorm_utility_rates WHERE id=?");
    $stmt->execute([$newId]);
    $rate = $stmt->fetch();
    $rate['id']           = (int)$rate['id'];
    $rate['electric_rate'] = (float)$rate['electric_rate'];
    $rate['water_rate']   = (float)$rate['water_rate'];
    $rate['other_fee']    = (float)$rate['other_fee'];
    $rate['is_current']   = true;
    jsonSuccess($rate, 201);
}

if ($method === 'PUT') {
    if (!$id) jsonError('ต้องระบุ id');
    $b              = getBody();
    $name           = trim($b['name'] ?? '');
    $electric_rate  = (float)($b['electric_rate'] ?? 0);
    $water_rate     = (float)($b['water_rate'] ?? 0);
    $other_fee      = (float)($b['other_fee'] ?? 0);
    $effective_date = $b['effective_date'] ?? date('Y-m-d');
    $notes          = trim($b['notes'] ?? '');

    if (!$name) jsonError('กรุณาระบุชื่อเรท');

    $db->prepare("UPDATE dorm_utility_rates SET name=?, electric_rate=?, water_rate=?, other_fee=?, effective_date=?, notes=? WHERE id=?")
       ->execute([$name, $electric_rate, $water_rate, $other_fee, $effective_date, $notes, $id]);
    logActivity('edit_rate', "แก้ไขเรทค่าใช้จ่าย $name", 'rates', $id);

    $stmt = $db->prepare("SELECT * FROM dorm_utility_rates WHERE id=?");
    $stmt->execute([$id]);
    $rate = $stmt->fetch();
    $rate['id']           = (int)$rate['id'];
    $rate['electric_rate'] = (float)$rate['electric_rate'];
    $rate['water_rate']   = (float)$rate['water_rate'];
    $rate['other_fee']    = (float)$rate['other_fee'];
    $current = getCurrentRate();
    $rate['is_current'] = ($current && $rate['id'] === $current['id']);
    jsonSuccess($rate);
}

if ($method === 'DELETE') {
    if (!$id) jsonError('ต้องระบุ id');
    $stmt = $db->prepare("SELECT COUNT(*) as cnt FROM dorm_utility_rates");
    $stmt->execute();
    if ((int)$stmt->fetch()['cnt'] <= 1) jsonError('ต้องมีอย่างน้อย 1 เรท');

    $db->prepare("DELETE FROM dorm_utility_rates WHERE id=?")->execute([$id]);
    logActivity('delete_rate', "ลบเรทค่าใช้จ่าย id=$id", 'rates', $id);
    jsonSuccess(['message' => 'ลบเรียบร้อย']);
}

jsonError('Method not allowed', 405);
