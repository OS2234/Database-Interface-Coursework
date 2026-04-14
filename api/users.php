<?php
// users.php
require_once __DIR__ . '/config.php';

$method = $_SERVER['REQUEST_METHOD'];

switch($method) {
    case 'GET':
        try {
            $stmt = $pdo->query("
                SELECT user_id, username, email, role, date_created, contact 
                FROM user 
                ORDER BY user_id
            ");
            $users = $stmt->fetchAll();
            echo json_encode($users ?: []);
        } catch (Exception $e) {
            error_log('Users GET error: ' . $e->getMessage());
            echo json_encode([]);
        }
        break;
        
    case 'POST':
    $data = json_decode(file_get_contents('php://input'), true);
    
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
        $plainPassword = $data['password']; // Store the plain password to return
        
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
            'password' => $plainPassword  // Return the actual password
        ]);
    } catch (Exception $e) {
        $pdo->rollBack();
        error_log('Users POST error: ' . $e->getMessage());
        echo json_encode(['success' => false, 'error' => $e->getMessage()]);
    }
    break;
        
    case 'PUT':
    $data = json_decode(file_get_contents('php://input'), true);
    
    try {
        $updates = [];
        $params = [];
        $newPlainPassword = null; // ADD THIS - to store the new password
        
        if (isset($data['username'])) {
            $updates[] = "username = ?";
            $params[] = $data['username'];
        }
        if (isset($data['email'])) {
            // Check if new email already exists for another user
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
        
        // CHANGE THIS PART - handle password properly
        if (isset($data['password']) && !empty($data['password'])) {
            $newPlainPassword = $data['password']; // Store plain password before hashing
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
        
        // CHANGE THE RETURN - include the new password
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
            // Delete user (cascade will handle assessor)
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