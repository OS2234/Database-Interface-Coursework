<?php

require_once __DIR__ . '/config.php';

$method = $_SERVER['REQUEST_METHOD'];

switch($method) {
    case 'GET':
        $stmt = $pdo->query("
            SELECT i.*, s.name as student_name, u.username as assessor_name
            FROM internship i
            JOIN student s ON i.student_id = s.student_id
            JOIN assessor a ON i.assessor_id = a.assessor_id
            JOIN user u ON a.user_id = u.user_id
        ");
        echo json_encode($stmt->fetchAll());
        break;
        
    case 'POST':
        $data = json_decode(file_get_contents('php://input'), true);
        
        $stmt = $pdo->prepare("
            INSERT INTO internship (student_id, assessor_id, company_name, start_date, end_date, status, internship_notes)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ");
        $stmt->execute([
            $data['student_id'],
            $data['assessor_id'],
            $data['company_name'],
            $data['start_date'],
            $data['end_date'],
            $data['status'],
            $data['internship_notes'] ?? null
        ]);
        
        echo json_encode(['success' => true, 'internship_id' => $pdo->lastInsertId()]);
        break;
        
    default:
        echo json_encode(['success' => false, 'error' => 'Method not allowed']);
        break;
}
?>