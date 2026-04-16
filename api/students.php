<?php
// students.php
require_once 'config.php';

$method = $_SERVER['REQUEST_METHOD'];

function getSequentialStudentIds($pdo) {
    $stmt = $pdo->query("
        SELECT student_id 
        FROM student 
        ORDER BY student_id ASC
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
    // Format: 3 digits-3 digits-4 digits (e.g., 012-345-6789)
    return preg_match('/^\d{3}-\d{3}-\d{4}$/', $contact);
}

function validateEmail($email) {
    return filter_var($email, FILTER_VALIDATE_EMAIL);
}

function validateYear($year) {
    $currentYear = date('Y');
    return is_numeric($year) && $year >= 2000 && $year <= $currentYear + 5;
}

switch($method) {
    case 'GET':
        try {
            $sequentialMap = getSequentialStudentIds($pdo);
            
            $stmt = $pdo->query("
                SELECT 
                    s.student_id,
                    s.name,
                    s.programme,
                    s.student_email,
                    s.student_contact,
                    s.enrollment_year,
                    s.assigned_assessor,
                    u.username as assessor_name,
                    i.company_name,
                    i.start_date,
                    i.end_date,
                    i.status
                FROM student s
                LEFT JOIN assessor a ON s.assigned_assessor = a.assessor_id
                LEFT JOIN user u ON a.user_id = u.user_id
                LEFT JOIN internship i ON s.student_id = i.student_id
                ORDER BY s.student_id DESC
            ");
            $students = $stmt->fetchAll();
            
            foreach ($students as &$student) {
                if (!$student['status']) {
                    $student['status'] = 'Pending';
                }
                $seqNum = $sequentialMap[$student['student_id']];
                $student['formatted_id'] = 'S' . $seqNum;
                $student['display_seq'] = $seqNum;
            }
            
            echo json_encode($students ?: []);
        } catch (Exception $e) {
            error_log('Students GET error: ' . $e->getMessage());
            echo json_encode([]);
        }
        break;
        
    case 'POST':
        $data = json_decode(file_get_contents('php://input'), true);
        
        // Validate contact
        if (!empty($data['student_contact']) && !validateContact($data['student_contact'])) {
            echo json_encode(['success' => false, 'error' => 'Invalid contact format. Use: 012-345-6789']);
            break;
        }
        
        // Validate email
        if (!empty($data['student_email']) && !validateEmail($data['student_email'])) {
            echo json_encode(['success' => false, 'error' => 'Invalid email format']);
            break;
        }
        
        // Validate enrollment year
        if (!validateYear($data['enrollment_year'])) {
            echo json_encode(['success' => false, 'error' => 'Invalid enrollment year']);
            break;
        }
        
        try {
            $pdo->beginTransaction();
            
            $stmt = $pdo->prepare("
                INSERT INTO student (name, student_email, student_contact, enrollment_year, programme, assigned_assessor)
                VALUES (?, ?, ?, ?, ?, ?)
            ");
            $stmt->execute([
                $data['name'],
                $data['student_email'],
                $data['student_contact'],
                $data['enrollment_year'],
                $data['programme'],
                $data['assigned_assessor'] ?? null
            ]);
            $studentId = $pdo->lastInsertId();
            
            $seqCount = $pdo->query("SELECT COUNT(*) FROM student")->fetchColumn();
            
            $stmt2 = $pdo->prepare("
                INSERT INTO internship (student_id, assessor_id, company_name, start_date, end_date, status)
                VALUES (?, ?, ?, ?, ?, ?)
            ");
            $stmt2->execute([
                $studentId,
                $data['assigned_assessor'] ?? null,
                $data['company_name'] ?? '',
                $data['start_date'] ?? null,
                $data['end_date'] ?? null,
                $data['status'] ?? 'Pending'
            ]);
            
            $pdo->commit();
            
            echo json_encode([
                'success' => true, 
                'student_id' => $studentId,
                'formatted_id' => 'S' . $seqCount
            ]);
        } catch (Exception $e) {
            $pdo->rollBack();
            error_log('Students POST error: ' . $e->getMessage());
            echo json_encode(['success' => false, 'error' => $e->getMessage()]);
        }
        break;
        
    case 'PUT':
        $data = json_decode(file_get_contents('php://input'), true);
        
        // Validate contact
        if (!empty($data['student_contact']) && !validateContact($data['student_contact'])) {
            echo json_encode(['success' => false, 'error' => 'Invalid contact format. Use: 012-345-6789']);
            break;
        }
        
        // Validate email
        if (!empty($data['student_email']) && !validateEmail($data['student_email'])) {
            echo json_encode(['success' => false, 'error' => 'Invalid email format']);
            break;
        }
        
        // Validate enrollment year
        if (!validateYear($data['enrollment_year'])) {
            echo json_encode(['success' => false, 'error' => 'Invalid enrollment year']);
            break;
        }
        
        try {
            $pdo->beginTransaction();
            
            $stmt = $pdo->prepare("
                UPDATE student 
                SET name = ?, student_email = ?, student_contact = ?, enrollment_year = ?, programme = ?, assigned_assessor = ?
                WHERE student_id = ?
            ");
            $stmt->execute([
                $data['name'],
                $data['student_email'],
                $data['student_contact'],
                $data['enrollment_year'],
                $data['programme'],
                $data['assigned_assessor'] ?? null,
                $data['student_id']
            ]);
            
            $checkStmt = $pdo->prepare("SELECT internship_id FROM internship WHERE student_id = ?");
            $checkStmt->execute([$data['student_id']]);
            $existing = $checkStmt->fetch();
            
            if ($existing) {
                $stmt2 = $pdo->prepare("
                    UPDATE internship 
                    SET assessor_id = ?, company_name = ?, start_date = ?, end_date = ?, status = ?
                    WHERE student_id = ?
                ");
                $stmt2->execute([
                    $data['assigned_assessor'] ?? null,
                    $data['company_name'] ?? '',
                    $data['start_date'] ?? null,
                    $data['end_date'] ?? null,
                    $data['status'] ?? 'Pending',
                    $data['student_id']
                ]);
            } else {
                $stmt2 = $pdo->prepare("
                    INSERT INTO internship (student_id, assessor_id, company_name, start_date, end_date, status)
                    VALUES (?, ?, ?, ?, ?, ?)
                ");
                $stmt2->execute([
                    $data['student_id'],
                    $data['assigned_assessor'] ?? null,
                    $data['company_name'] ?? '',
                    $data['start_date'] ?? null,
                    $data['end_date'] ?? null,
                    $data['status'] ?? 'Pending'
                ]);
            }
            
            $pdo->commit();
            echo json_encode(['success' => true]);
        } catch (Exception $e) {
            $pdo->rollBack();
            error_log('Students PUT error: ' . $e->getMessage());
            echo json_encode(['success' => false, 'error' => $e->getMessage()]);
        }
        break;
        
    case 'DELETE':
        $studentId = $_GET['id'] ?? null;
        
        if (!$studentId) {
            echo json_encode(['success' => false, 'error' => 'Student ID required']);
            break;
        }
        
        try {
            $stmt = $pdo->prepare("DELETE FROM student WHERE student_id = ?");
            $stmt->execute([$studentId]);
            echo json_encode(['success' => true]);
        } catch (Exception $e) {
            error_log('Students DELETE error: ' . $e->getMessage());
            echo json_encode(['success' => false, 'error' => $e->getMessage()]);
        }
        break;
        
    default:
        echo json_encode(['success' => false, 'error' => 'Method not allowed']);
        break;
}
?>