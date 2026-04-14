<?php
require_once __DIR__ . '/config.php';

$method = $_SERVER['REQUEST_METHOD'];

switch($method) {
    case 'GET':
        $internshipId = $_GET['internship_id'] ?? null;
        
        if ($internshipId) {
            $stmt = $pdo->prepare("
                SELECT ar.*, ac.criteria_name, ac.weightage,
                       fr.total_marks, fr.evaluated_date, fr.remarks as final_remarks
                FROM assessment_result ar
                JOIN assessment_criteria ac ON ar.criteria_id = ac.criteria_id
                LEFT JOIN final_result fr ON ar.result_id = fr.result_id
                WHERE ar.internship_id = ?
            ");
            $stmt->execute([$internshipId]);
            echo json_encode($stmt->fetchAll());
        }
        break;
        
    case 'POST':
        $data = json_decode(file_get_contents('php://input'), true);
        
        $stmt = $pdo->prepare("
            SELECT internship_id FROM internship 
            WHERE student_id = ? AND assessor_id = ?
        ");
        $stmt->execute([$data['student_id'], $data['assessor_id']]);
        $internship = $stmt->fetch();
        
        if (!$internship) {
            $stmt = $pdo->prepare("
                INSERT INTO internship (student_id, assessor_id, company_name, start_date, end_date, status)
                VALUES (?, ?, ?, CURDATE(), DATE_ADD(CURDATE(), INTERVAL 2 MONTH), 'Ongoing')
            ");
            $stmt->execute([$data['student_id'], $data['assessor_id'], $data['company_name'] ?? 'TBD']);
            $internshipId = $pdo->lastInsertId();
        } else {
            $internshipId = $internship['internship_id'];
        }
        
        $resultIds = [];
        foreach ($data['scores'] as $criteriaKey => $score) {
            $stmt = $pdo->prepare("
                SELECT criteria_id FROM assessment_criteria WHERE criteria_name LIKE ?
            ");
            $stmt->execute(["%$criteriaKey%"]);
            $criteria = $stmt->fetch();
            
            if ($criteria) {
                $stmt2 = $pdo->prepare("
                    INSERT INTO assessment_result (internship_id, criteria_id, marks_obtained, remark)
                    VALUES (?, ?, ?, ?)
                ");
                $stmt2->execute([$internshipId, $criteria['criteria_id'], $score, $data['remarks']]);
                $resultIds[] = $pdo->lastInsertId();
            }
        }
        
        if (!empty($resultIds)) {
            $stmt = $pdo->prepare("
                INSERT INTO final_result (internship_id, result_id, total_marks, evaluated_date, remarks)
                VALUES (?, ?, ?, CURDATE(), ?)
            ");
            $stmt->execute([$internshipId, $resultIds[0], $data['weightedTotal'], $data['remarks']]);
        }
        
        $stmt = $pdo->prepare("UPDATE internship SET status = 'Evaluated' WHERE internship_id = ?");
        $stmt->execute([$internshipId]);
        
        echo json_encode(['success' => true]);
        break;
}
?>