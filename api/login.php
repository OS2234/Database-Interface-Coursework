<?php

require_once __DIR__ . '/config.php';

$data = json_decode(file_get_contents('php://input'), true);

$email = $data['email'] ?? '';
$password = $data['password'] ?? '';

/**
 * Authenticate user
 */
function authenticate($pdo, $email, $password) {
    $stmt = $pdo->prepare("SELECT * FROM user WHERE email = ?");
    $stmt->execute([$email]);
    $user = $stmt->fetch();

    if ($user && password_verify($password, $user['password'])) {
        return [
            'success' => true,
            'user' => [
                'user_id' => $user['user_id'],
                'username' => $user['username'],
                'email' => $user['email'],
                'userRole' => $user['role'],
                'contact' => $user['contact']
            ]
        ];
    }
    
    return ['success' => false, 'message' => 'Invalid email or password'];
}

// ============================================
// REQUEST HANDLER
// ============================================

try {
    $result = authenticate($pdo, $email, $password);
    echo json_encode($result);
} catch (Exception $e) {
    error_log('Login error: ' . $e->getMessage());
    echo json_encode(['success' => false, 'message' => 'Server error occurred']);
}
?>