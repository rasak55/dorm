<?php
require_once __DIR__ . '/_common.php';
requireAuth();

$db   = getDB();
$year = (int)($_GET['year'] ?? date('Y'));

// รายรับแต่ละเดือนในปีนี้
$monthly = [];
for ($m = 1; $m <= 12; $m++) {
    $stmt = $db->prepare("SELECT COALESCE(SUM(total_amount),0) as income, COUNT(*) as cnt FROM dorm_bills WHERE bill_month=? AND bill_year=? AND status='paid'");
    $stmt->execute([$m, $year]);
    $row = $stmt->fetch();
    $stmt2 = $db->prepare("SELECT COUNT(*) as pending FROM dorm_bills WHERE bill_month=? AND bill_year=? AND status='pending'");
    $stmt2->execute([$m, $year]);
    $pending = $stmt2->fetch()['pending'];
    $monthly[] = [
        'month'       => $m,
        'income'      => (float)$row['income'],
        'paid_count'  => (int)$row['cnt'],
        'pending_count' => (int)$pending,
    ];
}

// ยอดรวมปี
$stmtYear = $db->prepare("SELECT COALESCE(SUM(total_amount),0) as total FROM dorm_bills WHERE bill_year=? AND status='paid'");
$stmtYear->execute([$year]);
$yearTotal = (float)$stmtYear->fetch()['total'];

// breakdown by type
$breakdown = $db->prepare("SELECT COALESCE(SUM(rent_amount),0) as rent, COALESCE(SUM(electric_amount),0) as electric, COALESCE(SUM(water_amount),0) as water, COALESCE(SUM(other_amount),0) as other FROM dorm_bills WHERE bill_year=? AND status='paid'");
$breakdown->execute([$year]);
$bd = $breakdown->fetch();

// ห้องว่าง/มีผู้เช่า
$totalRooms    = (int)$db->query("SELECT COUNT(*) as c FROM dorm_rooms")->fetch()['c'];
$occupiedRooms = (int)$db->query("SELECT COUNT(*) as c FROM dorm_rooms WHERE status='occupied'")->fetch()['c'];
$occupancyRate = $totalRooms > 0 ? round($occupiedRooms / $totalRooms * 100, 1) : 0;

jsonSuccess([
    'year'          => $year,
    'monthly'       => $monthly,
    'year_total'    => $yearTotal,
    'breakdown'     => [
        'rent'     => (float)$bd['rent'],
        'electric' => (float)$bd['electric'],
        'water'    => (float)$bd['water'],
        'other'    => (float)$bd['other'],
    ],
    'occupancy_rate' => $occupancyRate,
    'total_rooms'    => $totalRooms,
    'occupied_rooms' => $occupiedRooms,
]);
