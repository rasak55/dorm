<?php
require_once __DIR__ . '/_common.php';
requireAuth();

$db    = getDB();
$stats = getDashboardStats();

// pending + overdue count
$stmt = $db->query("SELECT COUNT(*) as cnt FROM dorm_bills WHERE status = 'pending'");
$stats['pending_bills'] = (int)$stmt->fetch()['cnt'];

$stmt = $db->query("SELECT COUNT(*) as cnt FROM dorm_bills WHERE status = 'overdue'");
$stats['overdue_bills'] = (int)$stmt->fetch()['cnt'];

$stmt = $db->query("SELECT COUNT(*) as cnt FROM dorm_rooms WHERE status = 'occupied'");
$stats['occupied_rooms'] = (int)$stmt->fetch()['cnt'];

$stmt = $db->query("SELECT COUNT(*) as cnt FROM dorm_rooms WHERE status = 'maintenance'");
$stats['maintenance_rooms'] = (int)$stmt->fetch()['cnt'];

// cast numeric fields
$stats['total_rooms']    = (int)$stats['total_rooms'];
$stats['vacant_rooms']   = (int)$stats['vacant_rooms'];
$stats['active_tenants'] = (int)$stats['active_tenants'];
$stats['monthly_income'] = (float)$stats['monthly_income'];

$chart6months = getMonthlyIncome6Months();
$recent       = getRecentActivities(10);

jsonSuccess([
    'stats'       => $stats,
    'chart6months' => $chart6months,
    'recent'      => $recent,
]);
