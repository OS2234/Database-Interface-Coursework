<?php
// users.php
require_once __DIR__ . '/config.php';

function getSequentialUserIds($pdo) {
    $stmt = $pdo->query("
        SELECT user_id 
        FROM user 
        ORDER BY user_id ASC
    ");
    $allIds = $stmt->fetchAll(PDO::FETCH_COLUMN);
    
    $sequentialMap = [];
    $counter = 1;
    foreach ($allIds as $dbId) {
        $sequentialMap[$dbId] = $counter++;
    }
    
    return $sequentialMap;
}

function validateContact($contact) {
    return preg_match('/^\d{3}-\d{3}-\d{4}$/', $contact);
}

function validateEmail($email) {
    return filter_var($email, FILTER_VALIDATE_EMAIL);
}

$method = $_SERVER['REQUEST_METHOD'];

switch($method) {
    case 'GET':
        try {
            $sequentialMap = getSequentialUserIds($pdo);
            
            $stmt = $pdo->query("
                SELECT user_id, username, email, role, date_created, contact 
                FROM user 
                ORDER BY user_id DESC
            ");
            $users = $stmt->fetchAll();
            
            foreach ($users as &$user) {
                $seqNum = $sequentialMap[$user['user_id']];
                $user['formatted_id'] = 'U' . $seqNum;
                $user['display_seq'] = $seqNum;
            }
            
            echo json_encode($users ?: []);
        } catch (Exception $e) {
            error_log('Users GET error: ' . $e->getMessage());
            echo json_encode([]);
        }
        break;
        
    case 'POST':
        $data = json_decode(file_get_contents('php://input'), true);
        
        // Validate contact
        if (!empty($data['contact']) && !validateContact($data['contact'])) {
            echo json_encode(['success' => false, 'error' => 'Invalid contact format. Use: 012-345-6789']);
            break;
        }
        
        // Validate email
        if (!validateEmail($data['email'])) {
            echo json_encode(['success' => false, 'error' => 'Invalid email format']);
            break;
        }
        
        try {
            $pdo->beginTransaction();
            
            $checkStmt = $pdo->prepare("SELECT user_id FROM user WHERE email = ?");
            $checkStmt->execute([$data['email']]);
            if ($checkStmt->fetch()) {
                echo json_encode(['success' => false, 'error' => 'Email already exists']);
                $pdo->rollBack();
                break;
            }
            
            $hashedPassword = password_hash($data['password'], PASSWORD_DEFAULT);
            $plainPassword = $data['password'];
            
            $stmt = $pdo->prepare("
                INSERT INTO user (username, email, password, role, contact, date_created)
                VALUES (?, ?, ?, ?, ?, CURDATE())
            ");
            $stmt->execute([
                $data['username'],
                $data['email'],
                $hashedPassword,
                $data['userRole'],
                $data['contact'] ?? null
            ]);
            $userId = $pdo->lastInsertId();
            
            $seqCount = $pdo->query("SELECT COUNT(*) FROM user")->fetchColumn();
            
            if ($data['userRole'] === 'Assessor') {
                $stmt2 = $pdo->prepare("
                    INSERT INTO assessor (user_id, department, role)
                    VALUES (?, ?, ?)
                ");
                $stmt2->execute([
                    $userId,
                    $data['department'] ?? '',
                    $data['assessor_role'] ?? 'Assessor'
                ]);
            }
            
            $pdo->commit();
            
            echo json_encode([
                'success' => true, 
                'user_id' => $userId,
                'password' => $plainPassword,
                'formatted_id' => 'U' . $seqCount
            ]);
        } catch (Exception $e) {
            $pdo->rollBack();
            error_log('Users POST error: ' . $e->getMessage());
            echo json_encode(['success' => false, 'error' => $e->getMessage()]);
        }
        break;
        
    case 'PUT':
        $data = json_decode(file_get_contents('php://input'), true);
        
        // Validate contact if provided
        if (isset($data['contact']) && !empty($data['contact']) && !validateContact($data['contact'])) {
            echo json_encode(['success' => false, 'error' => 'Invalid contact format. Use: 012-345-6789']);
            break;
        }
        
        // Validate email if provided
        if (isset($data['email']) && !empty($data['email']) && !validateEmail($data['email'])) {
            echo json_encode(['success' => false, 'error' => 'Invalid email format']);
            break;
        }
        
        try {
            $updates = [];
            $params = [];
            $newPlainPassword = null;
            
            if (isset($data['username'])) {
                $updates[] = "username = ?";
                $params[] = $data['username'];
            }
            if (isset($data['email'])) {
                if (isset($data['user_id'])) {
                    $checkStmt = $pdo->prepare("SELECT user_id FROM user WHERE email = ? AND user_id != ?");
                    $checkStmt->execute([$data['email'], $data['user_id']]);
                    if ($checkStmt->fetch()) {
                        echo json_encode(['success' => false, 'error' => 'Email already exists']);
                        break;
                    }
                }
                $updates[] = "email = ?";
                $params[] = $data['email'];
            }
            
            if (isset($data['password']) && !empty($data['password'])) {
                $newPlainPassword = $data['password'];
                $updates[] = "password = ?";
                $params[] = password_hash($data['password'], PASSWORD_DEFAULT);
            }
            
            if (isset($data['userRole'])) {
                $updates[] = "role = ?";
                $params[] = $data['userRole'];
            }
            if (isset($data['contact'])) {
                $updates[] = "contact = ?";
                $params[] = $data['contact'];
            }
            
            if (!empty($updates) && isset($data['user_id'])) {
                $params[] = $data['user_id'];
                $sql = "UPDATE user SET " . implode(", ", $updates) . " WHERE user_id = ?";
                $stmt = $pdo->prepare($sql);
                $stmt->execute($params);
            }
            
            echo json_encode([
                'success' => true, 
                'password_updated' => ($newPlainPassword !== null),
                'new_password' => $newPlainPassword
            ]);
        } catch (Exception $e) {
            error_log('Users PUT error: ' . $e->getMessage());
            echo json_encode(['success' => false, 'error' => $e->getMessage()]);
        }
        break;
        
    case 'DELETE':
        $userId = $_GET['id'] ?? null;
        
        if (!$userId) {
            echo json_encode(['success' => false, 'error' => 'User ID required']);
            break;
        }
        
        try {
            $stmt = $pdo->prepare("DELETE FROM user WHERE user_id = ?");
            $stmt->execute([$userId]);
            echo json_encode(['success' => true]);
        } catch (Exception $e) {
            error_log('Users DELETE error: ' . $e->getMessage());
            echo json_encode(['success' => false, 'error' => $e->getMessage()]);
        }
        break;
        
    default:
        echo json_encode(['success' => false, 'error' => 'Method not allowed']);
        break;
}
?>