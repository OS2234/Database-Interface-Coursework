-- phpMyAdmin SQL Dump
-- Database: `student_records`

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";

-- Create Database
CREATE DATABASE IF NOT EXISTS `student_records` DEFAULT CHARACTER SET utf8 COLLATE utf8_general_ci;
USE `student_records`;

-- --------------------------------------------------------
-- Table: user
-- --------------------------------------------------------
CREATE TABLE `user` (
  `user_id` int(11) NOT NULL AUTO_INCREMENT,
  `username` varchar(100) NOT NULL,
  `email` varchar(100) NOT NULL,
  `password` varchar(255) NOT NULL,
  `role` varchar(50) NOT NULL,
  `contact` varchar(20) DEFAULT NULL,
  `date_created` date NOT NULL,
  PRIMARY KEY (`user_id`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- --------------------------------------------------------
-- Table: assessor
-- --------------------------------------------------------
CREATE TABLE `assessor` (
  `assessor_id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `department` varchar(100) DEFAULT NULL,
  `role` varchar(50) DEFAULT 'Assessor',
  PRIMARY KEY (`assessor_id`),
  KEY `fk_assessor_user` (`user_id`),
  CONSTRAINT `fk_assessor_user` FOREIGN KEY (`user_id`) REFERENCES `user` (`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- --------------------------------------------------------
-- Table: student
-- --------------------------------------------------------
CREATE TABLE `student` (
  `student_id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `student_email` varchar(100) NOT NULL,
  `student_contact` varchar(20) DEFAULT NULL,
  `enrollment_year` int(11) DEFAULT NULL,
  `programme` varchar(100) DEFAULT NULL,
  `assigned_assessor` int(11) DEFAULT NULL,
  PRIMARY KEY (`student_id`),
  KEY `fk_student_assessor` (`assigned_assessor`),
  CONSTRAINT `fk_student_assessor` FOREIGN KEY (`assigned_assessor`) REFERENCES `assessor` (`assessor_id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- --------------------------------------------------------
-- Table: internship
-- --------------------------------------------------------
CREATE TABLE `internship` (
  `internship_id` int(11) NOT NULL AUTO_INCREMENT,
  `student_id` int(11) NOT NULL,
  `assessor_id` int(11) DEFAULT NULL,
  `company_name` varchar(200) DEFAULT NULL,
  `start_date` date DEFAULT NULL,
  `end_date` date DEFAULT NULL,
  `status` varchar(50) DEFAULT 'Pending',
  `internship_notes` text,
  PRIMARY KEY (`internship_id`),
  KEY `fk_internship_student` (`student_id`),
  KEY `fk_internship_assessor` (`assessor_id`),
  CONSTRAINT `fk_internship_assessor` FOREIGN KEY (`assessor_id`) REFERENCES `assessor` (`assessor_id`) ON DELETE SET NULL,
  CONSTRAINT `fk_internship_student` FOREIGN KEY (`student_id`) REFERENCES `student` (`student_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- --------------------------------------------------------
-- Table: assessment_criteria
-- --------------------------------------------------------
CREATE TABLE `assessment_criteria` (
  `criteria_id` int(11) NOT NULL AUTO_INCREMENT,
  `criteria_name` varchar(100) NOT NULL,
  `criteria_key` varchar(50) NOT NULL,
  `weightage` int(11) NOT NULL,
  PRIMARY KEY (`criteria_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Insert assessment criteria
INSERT INTO `assessment_criteria` (`criteria_id`, `criteria_name`, `criteria_key`, `weightage`) VALUES
(1, 'Undertaking Tasks/Projects', 'undertaking', 10),
(2, 'Health and Safety Requirements at the Workplace', 'health_safety', 10),
(3, 'Connectivity and Use of Theoretical Knowledge', 'connectivity', 10),
(4, 'Presentation of the Report as a Written Document', 'presentation', 15),
(5, 'Clarity of Language and Illustration', 'clarity', 10),
(6, 'Lifelong Learning Activities', 'learning', 15),
(7, 'Project Management', 'project', 15),
(8, 'Time Management', 'time', 15);

-- --------------------------------------------------------
-- Table: evaluation
-- --------------------------------------------------------
CREATE TABLE `evaluation` (
  `evaluation_id` int(11) NOT NULL AUTO_INCREMENT,
  `student_id` int(11) NOT NULL,
  `assessor_id` int(11) NOT NULL,
  `scores` text,
  `weighted_total` decimal(5,2) DEFAULT NULL,
  `remarks` text,
  `evaluated_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`evaluation_id`),
  KEY `fk_evaluation_student` (`student_id`),
  KEY `fk_evaluation_assessor` (`assessor_id`),
  CONSTRAINT `fk_evaluation_assessor` FOREIGN KEY (`assessor_id`) REFERENCES `assessor` (`assessor_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_evaluation_student` FOREIGN KEY (`student_id`) REFERENCES `student` (`student_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- --------------------------------------------------------
-- Insert Sample Data (with hashed passwords - all use 'password123')
-- --------------------------------------------------------

-- Password: 'password123' hashed
-- Admin user
INSERT INTO `user` (`user_id`, `username`, `email`, `password`, `role`, `contact`, `date_created`) VALUES
(1, 'Admin User', 'admin@nottingham.edu', '$2y$10$w3PyWbcpINBj1HsNQrvu3O5IHyQJjshJnlkM1TROVvk3g4RWD2iCm', 'Administrator', '012-3456789', CURDATE()),
(2, 'Jane Smith', 'jane.smith@nottingham.edu', '$2y$10$5.xrRg2UNdWZ0kK5OkZNMewDT/bRsu42vOcPNQngUxL54rMPq2yGi', 'Assessor', '012-3456790', CURDATE()),
(3, 'Alan Grant', 'a.grant@nottingham.edu', '$2y$10$onuAxMZdzP1dise985R0yOd8suJdNfAWcvweCeUO6nmiwomOgJKye', 'Assessor', '012-3456791', CURDATE());

-- Insert assessors
INSERT INTO `assessor` (`assessor_id`, `user_id`, `department`, `role`) VALUES
(1, 2, 'Computer Science', 'Senior Assessor'),
(2, 3, 'Engineering', 'Assessor');

-- Insert students
INSERT INTO `student` (`student_id`, `name`, `student_email`, `student_contact`, `enrollment_year`, `programme`, `assigned_assessor`) VALUES
(1, 'Emma Watson', 'emma.watson@student.edu', '0111222333', 2023, 'Computer Science', 1),
(2, 'James Brown', 'james.brown@student.edu', '0444555666', 2022, 'Engineering', 1),
(3, 'Luis Chen', 'luis.chen@student.edu', '0777888999', 2024, 'Business', 2);

-- Insert internships
INSERT INTO `internship` (`internship_id`, `student_id`, `assessor_id`, `company_name`, `start_date`, `end_date`, `status`, `internship_notes`) VALUES
(1, 1, 1, 'Innovate Tech', '2025-06-01', '2025-08-01', 'Evaluated', 'Excellent performance'),
(2, 2, 1, 'BuildCorp', '2025-06-05', '2025-08-05', 'Ongoing', NULL),
(3, 3, 2, 'FinGroup', '2025-06-10', '2025-08-10', 'Pending', NULL);

COMMIT;