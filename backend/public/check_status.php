<?php
require_once __DIR__ . '/bootstrap.php';
$db = \FlowSync\Config\Database::getInstance()->getConnection();

echo "=== COLLEGES ===\n";
$stmt = $db->query("SELECT id, name FROM colleges");
$colleges = $stmt->fetchAll(PDO::FETCH_ASSOC);
print_r($colleges);

echo "=== INSTITUTION SUBSCRIPTIONS ===\n";
$stmt = $db->query("SELECT * FROM institution_subscriptions");
print_r($stmt->fetchAll(PDO::FETCH_ASSOC));

echo "=== USER LIST WITH ROLES ===\n";
$stmt = $db->query("SELECT id, name, role_id, college_id FROM users");
print_r($stmt->fetchAll(PDO::FETCH_ASSOC));
