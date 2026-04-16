<?php
// assessors.php
require_once 'config.php';

$method = $_SERVER['REQUEST_METHOD'];

function getSequentialAssessorIds($pdo) {
    $stmt = $pdo->query("
        SELECT assessor_id 
        FROM assessor 
        ORDER BY assessor_id ASC
    ");
    $allIds = $stmt->fetchAll(PDO::FETCH_COLUMN);
    
    $sequentialMap = [];
    $counter = 1;
    foreach ($allIds as $dbId) {
        $sequentialMap[$dbId] = $counter++;
    }
    
    return $sequentialMap;
}

switch($method) {
    case 'GET':
        try {
            $sequentialMap = getSequentialAssessorIds($pdo);
            
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
            $userUpdates = [];
            $userParams = [];
            
            if (isset($data['username'])) {
                $userUpdates[] = "username = ?";
                $userParams[] = $data['username'];
            }
            if (isset($data['email'])) {
                $userUpdates[] = "email = ?";
                $userParams[] = $data['email'];
            }
            if (isset($data['contact'])) {
                $userUpdates[] = "contact = ?";
                $userParams[] = $data['contact'];
            }
            
            if (!empty($userUpdates)) {
                $userParams[] = $data['user_id'];
                $sql = "UPDATE user SET " . implode(", ", $userUpdates) . " WHERE user_id = ?";
                $stmt = $pdo->prepare($sql);
                $stmt->execute($userParams);
            }
            
            $assessorUpdates = [];
            $assessorParams = [];
            
            if (isset($data['department'])) {
                $assessorUpdates[] = "department = ?";
                $assessorParams[] = $data['department'];
            }
            if (isset($data['assessor_role'])) {
                $assessorUpdates[] = "role = ?";
                $assessorParams[] = $data['assessor_role'];
            }
            
            if (!empty($assessorUpdates)) {
                $assessorParams[] = $data['assessor_id'];
                $sql = "UPDATE assessor SET " . implode(", ", $assessorUpdates) . " WHERE assessor_id = ?";
                $stmt = $pdo->prepare($sql);
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