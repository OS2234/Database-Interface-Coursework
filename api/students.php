<?php

require_once 'config.php';

// ============================================
// SERVICE CLASSES
// ============================================

class StudentValidator {
    public static function validateContact($contact) {
        return empty($contact) || preg_match('/^\d{3}-\d{3}-\d{4}$/', $contact);
    }
    
    public static function validateEmail($email) {
        return empty($email) || filter_var($email, FILTER_VALIDATE_EMAIL);
    }
    
    public static function validateYear($year) {
        $currentYear = date('Y');
        return is_numeric($year) && $year >= 2000 && $year <= $currentYear + 5;
    }
    
    public static function validateDateRange($startDate, $endDate) {
        if (empty($startDate) || empty($endDate)) return true;
        return new DateTime($endDate) > new DateTime($startDate);
    }
    
    public static function validateStudentData($data) {
        $errors = [];
        
        if (empty($data['name'])) $errors[] = 'Student name is required';
        if (empty($data['programme'])) $errors[] = 'Programme is required';
        
        if (!empty($data['student_contact']) && !self::validateContact($data['student_contact'])) {
            $errors[] = 'Invalid contact format. Use: 012-345-6789';
        }
        if (!empty($data['student_email']) && !self::validateEmail($data['student_email'])) {
            $errors[] = 'Invalid email format';
        }
        if (!empty($data['enrollment_year']) && !self::validateYear($data['enrollment_year'])) {
            $errors[] = 'Invalid enrollment year';
        }
        if (!self::validateDateRange($data['start_date'] ?? null, $data['end_date'] ?? null)) {
            $errors[] = 'End date must be after start date';
        }
        
        return $errors;
    }
}

class StatusCalculator {
    public static function calculate($startDate, $endDate, $isEvaluated) {
        if ($isEvaluated) return 'Evaluated';
        
        if (!empty($endDate)) {
            $today = new DateTime();
            $today->setTime(0, 0, 0);
            $end = new DateTime($endDate);
            $end->setTime(0, 0, 0);
            if ($today > $end) return 'Pending';
        }
        
        return 'Ongoing';
    }
    
    public static function updateAllStatuses($pdo) {
        $evalStmt = $pdo->query("SELECT DISTINCT student_id FROM evaluation");
        $evaluatedSet = array_flip($evalStmt->fetchAll(PDO::FETCH_COLUMN));
        
        $stmt = $pdo->query("SELECT student_id, start_date, end_date FROM internship");
        $updatedCount = 0;
        
        foreach ($stmt->fetchAll() as $internship) {
            $status = self::calculate(
                $internship['start_date'],
                $internship['end_date'],
                isset($evaluatedSet[$internship['student_id']])
            );
            
            $updateStmt = $pdo->prepare("UPDATE internship SET status = ? WHERE student_id = ?");
            $updateStmt->execute([$status, $internship['student_id']]);
            $updatedCount++;
        }
        
        return $updatedCount;
    }
}

class SequentialIdGenerator {
    private $pdo;
    private $cache = [];
    
    public function __construct($pdo) {
        $this->pdo = $pdo;
    }
    
    public function getStudentIds() {
        if (empty($this->cache)) {
            $stmt = $this->pdo->query("SELECT student_id FROM student ORDER BY student_id ASC");
            $allIds = $stmt->fetchAll(PDO::FETCH_COLUMN);
            $counter = 1;
            foreach ($allIds as $dbId) {
                $this->cache[$dbId] = $counter++;
            }
        }
        return $this->cache;
    }
    
    public function getNextNumber() {
        return $this->pdo->query("SELECT COUNT(*) FROM student")->fetchColumn() + 1;
    }
}

class StudentRepository {
    private $pdo;
    private $idGenerator;
    
    public function __construct($pdo, $idGenerator) {
        $this->pdo = $pdo;
        $this->idGenerator = $idGenerator;
    }
    
    public function findAll() {
        StatusCalculator::updateAllStatuses($this->pdo);
        $sequentialMap = $this->idGenerator->getStudentIds();
        
        $stmt = $this->pdo->query("
            SELECT 
                s.student_id, s.name, s.programme, s.student_email, s.student_contact,
                s.enrollment_year, s.assigned_assessor, u.username as assessor_name,
                i.company_name, i.start_date, i.end_date, i.status as internship_status,
                (SELECT COUNT(*) FROM evaluation e WHERE e.student_id = s.student_id) as has_evaluation
            FROM student s
            LEFT JOIN assessor a ON s.assigned_assessor = a.assessor_id
            LEFT JOIN user u ON a.user_id = u.user_id
            LEFT JOIN internship i ON s.student_id = i.student_id
            ORDER BY s.student_id DESC
        ");
        
        $students = [];
        foreach ($stmt->fetchAll() as $student) {
            $seqNum = $sequentialMap[$student['student_id']] ?? $this->idGenerator->getNextNumber();
            $students[] = [
                'student_id' => $student['student_id'],
                'formatted_id' => 'S' . $seqNum,
                'name' => $student['name'],
                'programme' => $student['programme'],
                'student_email' => $student['student_email'],
                'student_contact' => $student['student_contact'],
                'enrollment_year' => $student['enrollment_year'],
                'assigned_assessor' => $student['assigned_assessor'],
                'assessor_name' => $student['assessor_name'],
                'company_name' => $student['company_name'],
                'start_date' => $student['start_date'],
                'end_date' => $student['end_date'],
                'status' => $student['internship_status'] ?? 'Ongoing',
                'has_evaluation' => $student['has_evaluation'] > 0
            ];
        }
        
        return $students;
    }
    
    public function create($data) {
        $this->pdo->beginTransaction();
        
        try {
            $stmt = $this->pdo->prepare("
                INSERT INTO student (name, student_email, student_contact, enrollment_year, programme, assigned_assessor)
                VALUES (?, ?, ?, ?, ?, ?)
            ");
            $stmt->execute([
                $data['name'], $data['student_email'] ?? null, $data['student_contact'] ?? null,
                $data['enrollment_year'] ?? null, $data['programme'], $data['assigned_assessor'] ?? null
            ]);
            $studentId = $this->pdo->lastInsertId();
            
            $status = StatusCalculator::calculate(
                $data['start_date'] ?? null, $data['end_date'] ?? null, false
            );
            
            $stmt2 = $this->pdo->prepare("
                INSERT INTO internship (student_id, assessor_id, company_name, start_date, end_date, status)
                VALUES (?, ?, ?, ?, ?, ?)
            ");
            $stmt2->execute([
                $studentId, $data['assigned_assessor'] ?? null, $data['company_name'] ?? '',
                $data['start_date'] ?? null, $data['end_date'] ?? null, $status
            ]);
            
            $this->pdo->commit();
            return ['success' => true, 'student_id' => $studentId, 'formatted_id' => 'S' . $this->idGenerator->getNextNumber()];
        } catch (Exception $e) {
            $this->pdo->rollBack();
            throw $e;
        }
    }
    
    public function update($data) {
        $this->pdo->beginTransaction();
        
        try {
            $evalCheck = $this->pdo->prepare("SELECT COUNT(*) FROM evaluation WHERE student_id = ?");
            $evalCheck->execute([$data['student_id']]);
            $isEvaluated = $evalCheck->fetchColumn() > 0;
            
            $stmt = $this->pdo->prepare("
                UPDATE student 
                SET name = ?, student_email = ?, student_contact = ?, enrollment_year = ?, programme = ?, assigned_assessor = ?
                WHERE student_id = ?
            ");
            $stmt->execute([
                $data['name'], $data['student_email'] ?? null, $data['student_contact'] ?? null,
                $data['enrollment_year'] ?? null, $data['programme'], $data['assigned_assessor'] ?? null,
                $data['student_id']
            ]);
            
            $this->updateInternship($data, $isEvaluated);
            
            $this->pdo->commit();
            return ['success' => true];
        } catch (Exception $e) {
            $this->pdo->rollBack();
            throw $e;
        }
    }
    
    private function updateInternship($data, $isEvaluated) {
        $checkStmt = $this->pdo->prepare("SELECT internship_id FROM internship WHERE student_id = ?");
        $checkStmt->execute([$data['student_id']]);
        $exists = $checkStmt->fetch();
        
        if ($isEvaluated) {
            if ($exists) {
                $stmt = $this->pdo->prepare("
                    UPDATE internship SET assessor_id = ?, company_name = ?, start_date = ?, end_date = ?
                    WHERE student_id = ?
                ");
                $stmt->execute([
                    $data['assigned_assessor'] ?? null, $data['company_name'] ?? '',
                    $data['start_date'] ?? null, $data['end_date'] ?? null, $data['student_id']
                ]);
            }
        } else {
            $status = StatusCalculator::calculate(
                $data['start_date'] ?? null, $data['end_date'] ?? null, false
            );
            
            if ($exists) {
                $stmt = $this->pdo->prepare("
                    UPDATE internship SET assessor_id = ?, company_name = ?, start_date = ?, end_date = ?, status = ?
                    WHERE student_id = ?
                ");
                $stmt->execute([
                    $data['assigned_assessor'] ?? null, $data['company_name'] ?? '',
                    $data['start_date'] ?? null, $data['end_date'] ?? null, $status, $data['student_id']
                ]);
            } else {
                $stmt = $this->pdo->prepare("
                    INSERT INTO internship (student_id, assessor_id, company_name, start_date, end_date, status)
                    VALUES (?, ?, ?, ?, ?, ?)
                ");
                $stmt->execute([
                    $data['student_id'], $data['assigned_assessor'] ?? null, $data['company_name'] ?? '',
                    $data['start_date'] ?? null, $data['end_date'] ?? null, $status
                ]);
            }
        }
    }
    
    public function delete($studentId) {
        $stmt = $this->pdo->prepare("DELETE FROM student WHERE student_id = ?");
        $stmt->execute([$studentId]);
        return ['success' => true];
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
    $idGenerator = new SequentialIdGenerator($pdo);
    $repository = new StudentRepository($pdo, $idGenerator);
    $method = $_SERVER['REQUEST_METHOD'];
    
    switch ($method) {
        case 'GET':
            sendResponse($repository->findAll());
            break;
            
        case 'POST':
            $data = json_decode(file_get_contents('php://input'), true);
            $errors = StudentValidator::validateStudentData($data);
            if (!empty($errors)) sendError(implode(', ', $errors));
            sendResponse($repository->create($data), 201);
            break;
            
        case 'PUT':
            $data = json_decode(file_get_contents('php://input'), true);
            if (empty($data['student_id'])) sendError('Student ID required');
            $errors = StudentValidator::validateStudentData($data);
            if (!empty($errors)) sendError(implode(', ', $errors));
            sendResponse($repository->update($data));
            break;
            
        case 'DELETE':
            $studentId = $_GET['id'] ?? null;
            if (!$studentId) sendError('Student ID required');
            sendResponse($repository->delete($studentId));
            break;
            
        default:
            sendError('Method not allowed', 405);
    }
} catch (Exception $e) {
    error_log('Students API error: ' . $e->getMessage());
    sendError('Server error: ' . $e->getMessage(), 500);
}
?>