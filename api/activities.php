<?php
require_once __DIR__ . '/_common.php';
requireAuth();

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';
$db     = getDB();

if ($method === 'GET') {
    $module = $_GET['module'] ?? '';
    $search = $_GET['search'] ?? '';
    $date   = $_GET['date'] ?? '';
    $limit  = min((int)($_GET['limit'] ?? 200), 500);

    $where  = ['1=1'];
    $params = [];

    if ($module) { $where[] = 'a.module = ?'; $params[] = $module; }
    if ($search) { $where[] = '(a.action LIKE ? OR a.description LIKE ?)'; $params[] = "%$search%"; $params[] = "%$search%"; }
    if ($date)   { $where[] = 'DATE(a.created_at) = ?'; $params[] = $date; }

    $sql  = "SELECT a.*, u.full_name FROM dorm_activities a LEFT JOIN dorm_users u ON a.user_id = u.id WHERE " . implode(' AND ', $where) . " ORDER BY a.created_at DESC LIMIT ?";
    $params[] = $limit;

    $stmt = $db->prepare($sql);
    $stmt->execute($params);
    $rows = $stmt->fetchAll();

    foreach ($rows as &$r) {
        $r['id'] = (int)$r['id'];
    }
    jsonSuccess($rows);
}

if ($method === 'POST' && $action === 'clear') {
    $days = (int)($_GET['days'] ?? 30);
    $db->prepare("DELETE FROM dorm_activities WHERE created_at < DATE_SUB(NOW(), INTERVAL ? DAY)")->execute([$days]);
    logActivity('clear_log', "ลบ log เก่ากว่า $days วัน", 'history');
    jsonSuccess(['message' => "ลบ log เก่ากว่า $days วันเรียบร้อย"]);
}

jsonError('Method not allowed', 405);
