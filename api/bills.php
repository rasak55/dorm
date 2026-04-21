<?php
require_once __DIR__ . '/_common.php';
requireAuth();

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';
$id     = isset($_GET['id']) ? (int)$_GET['id'] : 0;
$db     = getDB();

// GET occupied rooms (for bill creation form)
if ($method === 'GET' && $action === 'occupied_rooms') {
    $rows = $db->query("
        SELECT r.id, r.room_number, r.floor, r.rent_price, t.full_name as tenant_name,
               m.curr_electric as last_electric, m.curr_water as last_water,
               m.bill_month as last_meter_month, m.bill_year as last_meter_year
        FROM dorm_rooms r
        JOIN dorm_tenants t ON t.room_id = r.id AND t.status = 'active'
        LEFT JOIN dorm_meter_readings m ON m.room_id = r.id
            AND m.id = (SELECT id FROM dorm_meter_readings WHERE room_id = r.id ORDER BY bill_year DESC, bill_month DESC LIMIT 1)
        WHERE r.status = 'occupied'
        ORDER BY r.floor, r.room_number
    ")->fetchAll();

    foreach ($rows as &$r) {
        $r['id']               = (int)$r['id'];
        $r['floor']            = (int)$r['floor'];
        $r['rent_price']       = (float)$r['rent_price'];
        $r['last_electric']    = $r['last_electric'] !== null ? (float)$r['last_electric'] : null;
        $r['last_water']       = $r['last_water'] !== null ? (float)$r['last_water'] : null;
        $r['last_meter_month'] = $r['last_meter_month'] ? (int)$r['last_meter_month'] : null;
        $r['last_meter_year']  = $r['last_meter_year'] ? (int)$r['last_meter_year'] : null;
    }
    jsonSuccess($rows);
}

// GET bills list
if ($method === 'GET') {
    $month  = (int)($_GET['month'] ?? date('n'));
    $year   = (int)($_GET['year'] ?? date('Y'));
    $status = $_GET['status'] ?? '';

    $filters = ['month' => $month, 'year' => $year];
    if ($status) $filters['status'] = $status;

    $bills = getBills($filters);
    foreach ($bills as &$b) {
        $b['id']              = (int)$b['id'];
        $b['room_id']         = (int)$b['room_id'];
        $b['tenant_id']       = (int)$b['tenant_id'];
        $b['bill_month']      = (int)$b['bill_month'];
        $b['bill_year']       = (int)$b['bill_year'];
        $b['rent_amount']     = (float)$b['rent_amount'];
        $b['electric_units']  = (float)$b['electric_units'];
        $b['electric_amount'] = (float)$b['electric_amount'];
        $b['water_units']     = (float)$b['water_units'];
        $b['water_amount']    = (float)$b['water_amount'];
        $b['other_amount']    = (float)$b['other_amount'];
        $b['total_amount']    = (float)$b['total_amount'];
        $b['prev_electric']   = $b['prev_electric'] !== null ? (float)$b['prev_electric'] : null;
        $b['curr_electric']   = $b['curr_electric'] !== null ? (float)$b['curr_electric'] : null;
        $b['prev_water']      = $b['prev_water'] !== null ? (float)$b['prev_water'] : null;
        $b['curr_water']      = $b['curr_water'] !== null ? (float)$b['curr_water'] : null;
    }
    jsonSuccess($bills);
}

// POST create all bills for month
if ($method === 'POST' && $action === 'create_all') {
    $b          = getBody();
    $bill_month = (int)($b['month'] ?? date('n'));
    $bill_year  = (int)($b['year'] ?? date('Y'));
    $rate       = getCurrentRate();

    if (!$rate) jsonError('ไม่พบอัตราค่าใช้จ่าย');

    $rooms = $db->query("
        SELECT r.id as room_id, r.rent_price, t.id as tenant_id
        FROM dorm_rooms r
        JOIN dorm_tenants t ON t.room_id = r.id AND t.status = 'active'
        WHERE r.status = 'occupied'
    ")->fetchAll();

    $created = 0;
    $skipped = 0;
    $due = date('Y-m-t', mktime(0,0,0,$bill_month,1,$bill_year));

    foreach ($rooms as $room) {
        $chk = $db->prepare("SELECT id FROM dorm_bills WHERE room_id=? AND bill_month=? AND bill_year=?");
        $chk->execute([$room['room_id'], $bill_month, $bill_year]);
        if ($chk->fetch()) { $skipped++; continue; }

        $db->prepare("INSERT INTO dorm_bills (room_id, tenant_id, bill_month, bill_year, rent_amount, electric_units, electric_amount, water_units, water_amount, other_amount, total_amount, due_date, status) VALUES (?,?,?,?,?,0,0,0,0,0,?,?,?)")
           ->execute([$room['room_id'], $room['tenant_id'], $bill_month, $bill_year, $room['rent_price'], $room['rent_price'], $due, 'pending']);

        $db->prepare("INSERT IGNORE INTO dorm_meter_readings (room_id, bill_month, bill_year, prev_electric, curr_electric, prev_water, curr_water) VALUES (?,?,?,0,0,0,0)")
           ->execute([$room['room_id'], $bill_month, $bill_year]);

        $created++;
    }
    logActivity('create_all_bills', "สร้างบิลอัตโนมัติ $created ห้อง เดือน $bill_month/$bill_year", 'finance');
    jsonSuccess(['created' => $created, 'skipped' => $skipped]);
}

// POST create single bill
if ($method === 'POST') {
    $b          = getBody();
    $room_id    = (int)($b['room_id'] ?? 0);
    $bill_month = (int)($b['bill_month'] ?? date('n'));
    $bill_year  = (int)($b['bill_year'] ?? date('Y'));

    if (!$room_id) jsonError('กรุณาเลือกห้อง');

    // check duplicate
    $chk = $db->prepare("SELECT id FROM dorm_bills WHERE room_id=? AND bill_month=? AND bill_year=?");
    $chk->execute([$room_id, $bill_month, $bill_year]);
    if ($chk->fetch()) jsonError('มีบิลของห้องนี้ในเดือนนี้แล้ว');

    $tenant = $db->prepare("SELECT id FROM dorm_tenants WHERE room_id=? AND status='active'");
    $tenant->execute([$room_id]);
    $tenantRow = $tenant->fetch();
    if (!$tenantRow) jsonError('ไม่พบผู้เช่าในห้องนี้');

    $rate         = getCurrentRate();
    $rent         = (float)($b['rent_amount'] ?? 0);
    $prev_e       = (float)($b['prev_electric'] ?? 0);
    $curr_e       = (float)($b['curr_electric'] ?? 0);
    $prev_w       = (float)($b['prev_water'] ?? 0);
    $curr_w       = (float)($b['curr_water'] ?? 0);
    $other        = (float)($b['other_amount'] ?? 0);
    $elec_units   = max(0, $curr_e - $prev_e);
    $water_units  = max(0, $curr_w - $prev_w);
    $elec_amount  = $elec_units * (float)$rate['electric_rate'];
    $water_amount = $water_units * (float)$rate['water_rate'];
    $total        = $rent + $elec_amount + $water_amount + $other;
    $due          = date('Y-m-t', mktime(0,0,0,$bill_month,1,$bill_year));

    $db->prepare("INSERT INTO dorm_bills (room_id, tenant_id, bill_month, bill_year, rent_amount, electric_units, electric_amount, water_units, water_amount, other_amount, total_amount, due_date, status) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,'pending')")
       ->execute([$room_id, $tenantRow['id'], $bill_month, $bill_year, $rent, $elec_units, $elec_amount, $water_units, $water_amount, $other, $total, $due]);
    $newId = (int)$db->lastInsertId();

    $db->prepare("INSERT INTO dorm_meter_readings (room_id, bill_month, bill_year, prev_electric, curr_electric, prev_water, curr_water) VALUES (?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE prev_electric=VALUES(prev_electric), curr_electric=VALUES(curr_electric), prev_water=VALUES(prev_water), curr_water=VALUES(curr_water)")
       ->execute([$room_id, $bill_month, $bill_year, $prev_e, $curr_e, $prev_w, $curr_w]);

    logActivity('create_bill', "สร้างบิลห้อง {$b['room_number']} เดือน $bill_month/$bill_year", 'finance', $newId);
    jsonSuccess(getBillById($newId), 201);
}

// PUT update bill
if ($method === 'PUT') {
    if (!$id) jsonError('ต้องระบุ id');
    $b    = getBody();
    $bill = getBillById($id);
    if (!$bill) jsonError('ไม่พบบิล', 404);

    $rate         = getCurrentRate();
    $rent         = (float)($b['rent_amount'] ?? $bill['rent_amount']);
    $prev_e       = (float)($b['prev_electric'] ?? 0);
    $curr_e       = (float)($b['curr_electric'] ?? 0);
    $prev_w       = (float)($b['prev_water'] ?? 0);
    $curr_w       = (float)($b['curr_water'] ?? 0);
    $other        = (float)($b['other_amount'] ?? 0);
    $status       = $b['status'] ?? $bill['status'];
    $elec_units   = max(0, $curr_e - $prev_e);
    $water_units  = max(0, $curr_w - $prev_w);
    $elec_amount  = $elec_units * (float)$rate['electric_rate'];
    $water_amount = $water_units * (float)$rate['water_rate'];
    $total        = $rent + $elec_amount + $water_amount + $other;

    $db->prepare("UPDATE dorm_bills SET rent_amount=?, electric_units=?, electric_amount=?, water_units=?, water_amount=?, other_amount=?, total_amount=?, status=?, updated_at=NOW() WHERE id=?")
       ->execute([$rent, $elec_units, $elec_amount, $water_units, $water_amount, $other, $total, $status, $id]);

    $db->prepare("INSERT INTO dorm_meter_readings (room_id, bill_month, bill_year, prev_electric, curr_electric, prev_water, curr_water) VALUES (?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE prev_electric=VALUES(prev_electric), curr_electric=VALUES(curr_electric), prev_water=VALUES(prev_water), curr_water=VALUES(curr_water)")
       ->execute([$bill['room_id'], $bill['bill_month'], $bill['bill_year'], $prev_e, $curr_e, $prev_w, $curr_w]);

    logActivity('update_bill', "แก้ไขบิลห้อง {$bill['room_number']}", 'finance', $id);
    jsonSuccess(getBillById($id));
}

// DELETE
if ($method === 'DELETE') {
    if (!$id) jsonError('ต้องระบุ id');
    $bill = getBillById($id);
    if (!$bill) jsonError('ไม่พบบิล', 404);
    if ($bill['status'] === 'paid') jsonError('ไม่สามารถลบบิลที่ชำระแล้ว');

    $db->prepare("DELETE FROM dorm_bills WHERE id=?")->execute([$id]);
    logActivity('delete_bill', "ลบบิลห้อง {$bill['room_number']}", 'finance', $id);
    jsonSuccess(['message' => 'ลบเรียบร้อย']);
}

jsonError('Method not allowed', 405);
