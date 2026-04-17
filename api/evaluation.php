<?php

require_once __DIR__ . '/config.php';

$method = $_SERVER['REQUEST_METHOD'];

/**
 * Validates internship end date
 */
function validateInternshipPeriod($pdo, $studentId, $assessorId) {
    $stmt = $pdo->prepare("
        SELECT i.end_date, i.status
        FROM internship i
        WHERE i.student_id = ? AND i.assessor_id = ?
    ");
    $stmt->execute([$studentId, $assessorId]);
    $internship = $stmt->fetch();
    
    if ($internship && $internship['end_date']) {
        $endDate = new DateTime($internship['end_date']);
        $today = new DateTime();
        if ($endDate < $today) {
            return ['valid' => false, 'error' => 'Cannot evaluate: Internship has already ended'];
        }
    }
    
    return ['valid' => true];
}

/**
 * Creates or updates an evaluation
 */
function saveEvaluation($pdo, $data) {
    $pdo->beginTransaction();
    
    try {
        // Check if evaluation already exists
        $checkStmt = $pdo->prepare("
            SELECT evaluation_id FROM evaluation 
            WHERE student_id = ? AND assessor_id = ?
        ");
        $checkStmt->execute([$data['student_id'], $data['assessor_id']]);
        $existing = $checkStmt->fetch();
        
        $scoresJson = json_encode($data['scores']);
        
        if ($existing) {
            // Update existing evaluation
            $stmt = $pdo->prepare("
                UPDATE evaluation 
                SET scores = ?, weighted_total = ?, remarks = ?, evaluated_at = NOW()
                WHERE student_id = ? AND assessor_id = ?
            ");
            $stmt->execute([
                $scoresJson,
                $data['weightedTotal'],
                $data['remarks'],
                $data['student_id'],
                $data['assessor_id']
            ]);
        } else {
            // Insert new evaluation
            $stmt = $pdo->prepare("
                INSERT INTO evaluation (student_id, assessor_id, scores, weighted_total, remarks, evaluated_at)
                VALUES (?, ?, ?, ?, ?, NOW())
            ");
            $stmt->execute([
                $data['student_id'],
                $data['assessor_id'],
                $scoresJson,
                $data['weightedTotal'],
                $data['remarks']
            ]);
        }
        
        // Update internship status to 'Evaluated'
        $updateStmt = $pdo->prepare("
            UPDATE internship 
            SET status = 'Evaluated' 
            WHERE student_id = ? AND assessor_id = ?
        ");
        $updateStmt->execute([$data['student_id'], $data['assessor_id']]);
        
        $pdo->commit();
        return ['success' => true];
    } catch (Exception $e) {
        $pdo->rollBack();
        throw $e;
    }
}

// ============================================
// REQUEST HANDLER
// ============================================

switch($method) {
    case 'GET':
        $studentId = $_GET['student_id'] ?? null;
        $assessorId = $_GET['assessor_id'] ?? null;
        
        if ($studentId && $assessorId) {
            $stmt = $pdo->prepare("
                SELECT e.*, u.username as assessor_name
                FROM evaluation e
                JOIN assessor a ON e.assessor_id = a.assessor_id
                JOIN user u ON a.user_id = u.user_id
                WHERE e.student_id = ? AND e.assessor_id = ?
            ");
            $stmt->execute([$studentId, $assessorId]);
            echo json_encode($stmt->fetch());
        } else {
            echo json_encode(null);
        }
        break;
        
    case 'POST':
        $data = json_decode(file_get_contents('php://input'), true);
        
        // Validate internship period
        $validation = validateInternshipPeriod($pdo, $data['student_id'], $data['assessor_id']);
        if (!$validation['valid']) {
            echo json_encode(['success' => false, 'error' => $validation['error']]);
            break;
        }
        
        try {
            $result = saveEvaluation($pdo, $data);
            echo json_encode($result);
        } catch (Exception $e) {
            error_log('Evaluation POST error: ' . $e->getMessage());
            echo json_encode(['success' => false, 'error' => $e->getMessage()]);
        }
        break;
        
    default:
        echo json_encode(['success' => false, 'error' => 'Method not allowed']);
        break;
}
?>