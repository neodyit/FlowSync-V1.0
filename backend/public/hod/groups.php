<?php

try {
    require_once __DIR__ . '/../bootstrap.php';

    $session = FlowSync\Utils\HODMiddleware::check();
    $db = FlowSync\Config\Database::getInstance()->getConnection();
    $logger = new FlowSync\Utils\AuditLogger();

    $stmt = $db->prepare("SELECT id FROM departments WHERE hod_id = :hod_id LIMIT 1");
    $stmt->execute(['hod_id' => $session['user_id']]);
    $dept = $stmt->fetch();

    if (!$dept) {
        throw new Exception("Unauthorized. No department assigned.");
    }
    $deptId = $dept['id'];

    $method = $_SERVER['REQUEST_METHOD'];

    switch ($method) {
        case 'GET':
            // Fetch all groups
            $stmt = $db->prepare("SELECT * FROM faculty_groups WHERE hod_id = :hod_id AND department_id = :dept_id ORDER BY name ASC");
            $stmt->execute(['hod_id' => $session['user_id'], 'dept_id' => $deptId]);
            $groups = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // Fetch members for each group
            foreach ($groups as &$group) {
                $memStmt = $db->prepare("
                    SELECT u.id, u.name, u.email, u.profile_pic 
                    FROM faculty_group_members fgm
                    JOIN users u ON fgm.faculty_id = u.id
                    WHERE fgm.group_id = :group_id
                    ORDER BY u.name ASC
                ");
                $memStmt->execute(['group_id' => $group['id']]);
                $group['members'] = $memStmt->fetchAll(PDO::FETCH_ASSOC);
            }

            echo json_encode(['status' => 'success', 'data' => $groups]);
            break;

        case 'POST':
            $data = json_decode(file_get_contents('php://input'), true);
            $name = trim($data['name'] ?? '');
            $memberIds = $data['members'] ?? [];

            if (empty($name)) {
                throw new Exception("Group name is required.");
            }

            $db->beginTransaction();

            $stmt = $db->prepare("INSERT INTO faculty_groups (hod_id, department_id, name) VALUES (:hod_id, :dept_id, :name)");
            $stmt->execute([
                'hod_id' => $session['user_id'],
                'dept_id' => $deptId,
                'name' => $name
            ]);
            
            $groupId = $db->lastInsertId();

            if (!empty($memberIds)) {
                $memStmt = $db->prepare("INSERT INTO faculty_group_members (group_id, faculty_id) VALUES (:gid, :fid)");
                foreach ($memberIds as $fid) {
                    $memStmt->execute(['gid' => $groupId, 'fid' => $fid]);
                }
            }

            $db->commit();
            $logger->log($session['user_id'], 'HOD_CREATE_GROUP', 'GROUP', $groupId, ['name' => $name]);

            echo json_encode(['status' => 'success', 'message' => 'Group created successfully.']);
            break;

        case 'PUT':
            $data = json_decode(file_get_contents('php://input'), true);
            $groupId = $data['id'] ?? null;
            $name = trim($data['name'] ?? '');
            $memberIds = $data['members'] ?? [];

            if (!$groupId || empty($name)) {
                throw new Exception("Group ID and name are required.");
            }

            // Verify ownership
            $check = $db->prepare("SELECT id FROM faculty_groups WHERE id = :id AND hod_id = :hod_id");
            $check->execute(['id' => $groupId, 'hod_id' => $session['user_id']]);
            if (!$check->fetch()) {
                throw new Exception("Group not found or access denied.");
            }

            $db->beginTransaction();

            $stmt = $db->prepare("UPDATE faculty_groups SET name = :name WHERE id = :id");
            $stmt->execute(['name' => $name, 'id' => $groupId]);

            // Replace members
            $delStmt = $db->prepare("DELETE FROM faculty_group_members WHERE group_id = :id");
            $delStmt->execute(['id' => $groupId]);

            if (!empty($memberIds)) {
                $memStmt = $db->prepare("INSERT INTO faculty_group_members (group_id, faculty_id) VALUES (:gid, :fid)");
                foreach ($memberIds as $fid) {
                    $memStmt->execute(['gid' => $groupId, 'fid' => $fid]);
                }
            }

            $db->commit();
            $logger->log($session['user_id'], 'HOD_UPDATE_GROUP', 'GROUP', $groupId, ['name' => $name]);

            echo json_encode(['status' => 'success', 'message' => 'Group updated successfully.']);
            break;

        case 'DELETE':
            $groupId = $_GET['id'] ?? null;
            if (!$groupId) {
                throw new Exception("Group ID is required.");
            }

            // Verify ownership
            $check = $db->prepare("SELECT id FROM faculty_groups WHERE id = :id AND hod_id = :hod_id");
            $check->execute(['id' => $groupId, 'hod_id' => $session['user_id']]);
            if (!$check->fetch()) {
                throw new Exception("Group not found or access denied.");
            }

            $stmt = $db->prepare("DELETE FROM faculty_groups WHERE id = :id");
            $stmt->execute(['id' => $groupId]);

            $logger->log($session['user_id'], 'HOD_DELETE_GROUP', 'GROUP', $groupId, []);

            echo json_encode(['status' => 'success', 'message' => 'Group deleted successfully.']);
            break;

        default:
            http_response_code(405);
            echo json_encode(['status' => 'error', 'message' => 'Method not allowed.']);
            break;
    }
} catch (Exception $e) {
    if (isset($db) && $db->inTransaction()) {
        $db->rollBack();
    }
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
}
