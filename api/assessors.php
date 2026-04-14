<?php
// assessors.php
require_once 'config.php';

$method = $_SERVER['REQUEST_METHOD'];

switch($method) {
    case 'GET':
        try {
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
                ORDER BY a.assessor_id
            ");
            $assessors = $stmt->fetchAll();
            
            foreach ($assessors as &$assessor) {
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
        // Users should be created via users.php
        echo json_encode(['success' => false, 'error' => 'Use /api/users.php to create assessors']);
        break;
        
    case 'PUT':
        $data = json_decode(file_get_contents('php://input'), true);
        
        try {
            // Update user table
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
            
            // Update assessor table
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
            // Get user_id
            $stmt = $pdo->prepare("SELECT user_id FROM assessor WHERE assessor_id = ?");
            $stmt->execute([$assessorId]);
            $assessor = $stmt->fetch();
            
            if ($assessor) {
                // Delete assessor (user will be deleted by CASCADE)
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