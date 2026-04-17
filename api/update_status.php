<?php

require_once __DIR__ . '/config.php';

header('Content-Type: application/json');


function calculateAutoStatus($startDate, $endDate, $isEvaluated) {
    if ($isEvaluated) {
        return 'Evaluated';
    }
    
    $today = new DateTime();
    $today->setTime(0, 0, 0);
    
    if (!empty($endDate)) {
        $end = new DateTime($endDate);
        $end->setTime(0, 0, 0);
        if ($today > $end) {
            return 'Pending';
        }
    }
    
    return 'Ongoing';
}


function updateAllStudentStatuses($pdo) {
    // Get evaluated students
    $evalStmt = $pdo->query("SELECT DISTINCT student_id FROM evaluation");
    $evaluatedStudents = $evalStmt->fetchAll(PDO::FETCH_COLUMN);
    $evaluatedSet = array_flip($evaluatedStudents);
    
    // Get all internships
    $stmt = $pdo->query("
        SELECT i.student_id, i.start_date, i.end_date, s.name
        FROM internship i
        JOIN student s ON i.student_id = s.student_id
    ");
    $internships = $stmt->fetchAll();
    $updatedStudents = [];
    
    foreach ($internships as $internship) {
        $isEvaluated = isset($evaluatedSet[$internship['student_id']]);
        $autoStatus = calculateAutoStatus(
            $internship['start_date'],
            $internship['end_date'],
            $isEvaluated
        );
        
        $updateStmt = $pdo->prepare("UPDATE internship SET status = ? WHERE student_id = ?");
        $updateStmt->execute([$autoStatus, $internship['student_id']]);
        
        $updatedStudents[] = [
            'student_id' => $internship['student_id'],
            'student_name' => $internship['name'],
            'new_status' => $autoStatus
        ];
    }
    
    return $updatedStudents;
}

// ============================================
// REQUEST HANDLER
// ============================================

try {
    $updatedStudents = updateAllStudentStatuses($pdo);
    
    echo json_encode([
        'success' => true,
        'message' => 'Status update completed',
        'updated_count' => count($updatedStudents),
        'updated_students' => $updatedStudents
    ]);
} catch (Exception $e) {
    error_log('Update statuses error: ' . $e->getMessage());
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
?>