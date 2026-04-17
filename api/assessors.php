<?php
require_once 'config.php';

// ============================================
// SERVICE CLASSES
// ============================================

class AssessorIdGenerator {
    private $pdo;
    private $cache = [];
    
    public function __construct($pdo) {
        $this->pdo = $pdo;
    }
    
    public function getAssessorIds() {
        if (empty($this->cache)) {
            $stmt = $this->pdo->query("SELECT assessor_id FROM assessor ORDER BY assessor_id ASC");
            $allIds = $stmt->fetchAll(PDO::FETCH_COLUMN);
            $counter = 1;
            foreach ($allIds as $dbId) {
                $this->cache[$dbId] = $counter++;
            }
        }
        return $this->cache;
    }
}

// ============================================
// MAIN REQUEST HANDLER
// ============================================

$method = $_SERVER['REQUEST_METHOD'];

switch($method) {
    case 'GET':
        try {
            $idGenerator = new AssessorIdGenerator($pdo);
            $sequentialMap = $idGenerator->getAssessorIds();
            
            $stmt = $pdo->query("
                SELECT 
                    a.assessor_id,
                    a.department,
                    a.role as assessor_role,
                    u.user_id,
                    u.username,
                    u.email,
                    u.contact,
                    u.date_created
                FROM assessor a
                JOIN user u ON a.user_id = u.user_id
                ORDER BY a.assessor_id DESC
            ");
            $assessors = $stmt->fetchAll();
            
            foreach ($assessors as &$assessor) {
                $seqNum = $sequentialMap[$assessor['assessor_id']];
                $assessor['formatted_id'] = 'A' . $seqNum;
                $assessor['display_seq'] = $seqNum;
                
                $stmt2 = $pdo->prepare("
                    SELECT s.student_id, s.name
                    FROM student s 
                    WHERE s.assigned_assessor = ?
                ");
                $stmt2->execute([$assessor['assessor_id']]);
                $assignedStudents = $stmt2->fetchAll();
                $assessor['assigned_student_ids'] = $assignedStudents ? array_column($assignedStudents, 'student_id') : [];
                $assessor['assigned_students_list'] = $assignedStudents ?: [];
            }
            
            echo json_encode($assessors ?: []);
        } catch (Exception $e) {
            error_log('Assessors GET error: ' . $e->getMessage());
            echo json_encode([]);
        }
        break;
        
    case 'POST':
        echo json_encode(['success' => false, 'error' => 'Use /api/users.php to create assessors']);
        break;
        
    case 'PUT':
        $data = json_decode(file_get_contents('php://input'), true);
        
        try {
            // Update user table
            $userUpdates = [];
            $userParams = [];
            
            $userFieldMap = ['username', 'email', 'contact'];
            foreach ($userFieldMap as $field) {
                if (isset($data[$field])) {
                    $userUpdates[] = "$field = ?";
                    $userParams[] = $data[$field];
                }
            }
            
            if (!empty($userUpdates)) {
                $userParams[] = $data['user_id'];
                $stmt = $pdo->prepare("UPDATE user SET " . implode(", ", $userUpdates) . " WHERE user_id = ?");
                $stmt->execute($userParams);
            }
            
            // Update assessor table
            $assessorUpdates = [];
            $assessorParams = [];
            
            $assessorFieldMap = ['department' => 'department', 'assessor_role' => 'role'];
            foreach ($assessorFieldMap as $inputField => $dbField) {
                if (isset($data[$inputField])) {
                    $assessorUpdates[] = "$dbField = ?";
                    $assessorParams[] = $data[$inputField];
                }
            }
            
            if (!empty($assessorUpdates)) {
                $assessorParams[] = $data['assessor_id'];
                $stmt = $pdo->prepare("UPDATE assessor SET " . implode(", ", $assessorUpdates) . " WHERE assessor_id = ?");
                $stmt->execute($assessorParams);
            }
            
            echo json_encode(['success' => true]);
        } catch (Exception $e) {
            error_log('Assessors PUT error: ' . $e->getMessage());
            echo json_encode(['success' => false, 'error' => $e->getMessage()]);
        }
        break;
        
    case 'DELETE':
        $assessorId = $_GET['id'] ?? null;
        
        if (!$assessorId) {
            echo json_encode(['success' => false, 'error' => 'Assessor ID required']);
            break;
        }
        
        try {
            $stmt = $pdo->prepare("SELECT user_id FROM assessor WHERE assessor_id = ?");
            $stmt->execute([$assessorId]);
            $assessor = $stmt->fetch();
            
            if ($assessor) {
                $stmt2 = $pdo->prepare("DELETE FROM assessor WHERE assessor_id = ?");
                $stmt2->execute([$assessorId]);
                
                $stmt3 = $pdo->prepare("DELETE FROM user WHERE user_id = ?");
                $stmt3->execute([$assessor['user_id']]);
            }
            
            echo json_encode(['success' => true]);
        } catch (Exception $e) {
            error_log('Assessors DELETE error: ' . $e->getMessage());
            echo json_encode(['success' => false, 'error' => $e->getMessage()]);
        }
        break;
        
    default:
        echo json_encode(['success' => false, 'error' => 'Method not allowed']);
        break;
}
?>