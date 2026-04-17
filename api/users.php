<?php

require_once __DIR__ . '/config.php';

// ============================================
// SERVICE CLASSES
// ============================================

class UserValidator {
    public static function validateContact($contact) {
        return empty($contact) || preg_match('/^\d{3}-\d{3}-\d{4}$/', $contact);
    }
    
    public static function validateEmail($email) {
        return filter_var($email, FILTER_VALIDATE_EMAIL);
    }
    
    public static function validateUserData($data, $isUpdate = false) {
        $errors = [];
        
        if (!$isUpdate) {
            if (empty($data['username'])) $errors[] = 'Username is required';
            if (empty($data['userRole'])) $errors[] = 'User role is required';
        }
        
        if (isset($data['email']) && !self::validateEmail($data['email'])) {
            $errors[] = 'Invalid email format';
        }
        
        if (!empty($data['contact']) && !self::validateContact($data['contact'])) {
            $errors[] = 'Invalid contact format. Use: 012-345-6789';
        }
        
        return $errors;
    }
}

class UserIdGenerator {
    private $pdo;
    private $cache = [];
    
    public function __construct($pdo) {
        $this->pdo = $pdo;
    }
    
    public function getUserIds() {
        if (empty($this->cache)) {
            $stmt = $this->pdo->query("SELECT user_id FROM user ORDER BY user_id ASC");
            $counter = 1;
            foreach ($stmt->fetchAll(PDO::FETCH_COLUMN) as $dbId) {
                $this->cache[$dbId] = $counter++;
            }
        }
        return $this->cache;
    }
    
    public function getNextNumber() {
        return $this->pdo->query("SELECT COUNT(*) FROM user")->fetchColumn() + 1;
    }
    
    public function formatId($seqNum) {
        return 'U' . $seqNum;
    }
}

class UserRepository {
    private $pdo;
    private $idGenerator;
    
    public function __construct($pdo, $idGenerator) {
        $this->pdo = $pdo;
        $this->idGenerator = $idGenerator;
    }
    
    public function findAll() {
        $sequentialMap = $this->idGenerator->getUserIds();
        
        $stmt = $this->pdo->query("
            SELECT user_id, username, email, role, date_created, contact 
            FROM user ORDER BY user_id DESC
        ");
        
        $users = [];
        foreach ($stmt->fetchAll() as $user) {
            $seqNum = $sequentialMap[$user['user_id']];
            $users[] = array_merge($user, [
                'formatted_id' => $this->idGenerator->formatId($seqNum),
                'display_seq' => $seqNum
            ]);
        }
        
        return $users;
    }
    
    public function create($data) {
        $this->pdo->beginTransaction();
        
        try {
            $this->checkEmailExists($data['email']);
            
            $hashedPassword = password_hash($data['password'], PASSWORD_DEFAULT);
            
            $stmt = $this->pdo->prepare("
                INSERT INTO user (username, email, password, role, contact, date_created)
                VALUES (?, ?, ?, ?, ?, CURDATE())
            ");
            $stmt->execute([
                $data['username'], $data['email'], $hashedPassword,
                $data['userRole'], $data['contact'] ?? null
            ]);
            $userId = $this->pdo->lastInsertId();
            
            if ($data['userRole'] === 'Assessor') {
                $this->createAssessor($userId, $data);
            }
            
            $this->pdo->commit();
            
            return [
                'success' => true,
                'user_id' => $userId,
                'password' => $data['password'],
                'formatted_id' => $this->idGenerator->formatId($this->idGenerator->getNextNumber())
            ];
        } catch (Exception $e) {
            $this->pdo->rollBack();
            throw $e;
        }
    }
    
    public function update($data) {
        $updates = [];
        $params = [];
        $newPlainPassword = null;
        
        $fieldMap = [
            'username' => 'username',
            'email' => 'email',
            'userRole' => 'role',
            'contact' => 'contact'
        ];
        
        foreach ($fieldMap as $inputField => $dbField) {
            if (isset($data[$inputField])) {
                $updates[] = "$dbField = ?";
                $params[] = $data[$inputField];
            }
        }
        
        if (!empty($data['password'])) {
            $newPlainPassword = $data['password'];
            $updates[] = "password = ?";
            $params[] = password_hash($data['password'], PASSWORD_DEFAULT);
        }
        
        if (!empty($updates)) {
            $params[] = $data['user_id'];
            $stmt = $this->pdo->prepare("UPDATE user SET " . implode(", ", $updates) . " WHERE user_id = ?");
            $stmt->execute($params);
        }
        
        return [
            'success' => true,
            'password_updated' => ($newPlainPassword !== null),
            'new_password' => $newPlainPassword
        ];
    }
    
    public function delete($userId) {
        $stmt = $this->pdo->prepare("DELETE FROM user WHERE user_id = ?");
        $stmt->execute([$userId]);
        return ['success' => true];
    }
    
    private function checkEmailExists($email, $excludeUserId = null) {
        $sql = "SELECT user_id FROM user WHERE email = ?";
        $params = [$email];
        
        if ($excludeUserId) {
            $sql .= " AND user_id != ?";
            $params[] = $excludeUserId;
        }
        
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($params);
        
        if ($stmt->fetch()) {
            throw new Exception('Email already exists');
        }
    }
    
    private function createAssessor($userId, $data) {
        $stmt = $this->pdo->prepare("
            INSERT INTO assessor (user_id, department, role)
            VALUES (?, ?, ?)
        ");
        $stmt->execute([
            $userId,
            $data['department'] ?? '',
            $data['assessor_role'] ?? 'Assessor'
        ]);
    }
}

// ============================================
// REQUEST HANDLER
// ============================================

function sendResponse($data, $statusCode = 200) {
    http_response_code($statusCode);
    echo json_encode($data);
    exit;
}

function sendError($message, $statusCode = 400) {
    sendResponse(['success' => false, 'error' => $message], $statusCode);
}

try {
    $idGenerator = new UserIdGenerator($pdo);
    $repository = new UserRepository($pdo, $idGenerator);
    $method = $_SERVER['REQUEST_METHOD'];
    
    switch ($method) {
        case 'GET':
            sendResponse($repository->findAll());
            break;
            
        case 'POST':
            $data = json_decode(file_get_contents('php://input'), true);
            $errors = UserValidator::validateUserData($data);
            if (!empty($errors)) sendError(implode(', ', $errors));
            if (empty($data['password'])) sendError('Password is required');
            sendResponse($repository->create($data), 201);
            break;
            
        case 'PUT':
            $data = json_decode(file_get_contents('php://input'), true);
            if (empty($data['user_id'])) sendError('User ID required');
            $errors = UserValidator::validateUserData($data, true);
            if (!empty($errors)) sendError(implode(', ', $errors));
            sendResponse($repository->update($data));
            break;
            
        case 'DELETE':
            $userId = $_GET['id'] ?? null;
            if (!$userId) sendError('User ID required');
            sendResponse($repository->delete($userId));
            break;
            
        default:
            sendError('Method not allowed', 405);
    }
} catch (Exception $e) {
    error_log('Users API error: ' . $e->getMessage());
    sendError($e->getMessage(), 500);
}
?>