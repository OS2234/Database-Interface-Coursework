-- phpMyAdmin SQL Dump
-- version 5.1.2
-- https://www.phpmyadmin.net/
--
-- Host: localhost:3306
-- Generation Time: Apr 05, 2026 at 11:29 AM
-- Server version: 5.7.24
-- PHP Version: 8.3.1

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `student_records`
--
CREATE DATABASE IF NOT EXISTS `student_records` DEFAULT CHARACTER SET utf8 COLLATE utf8_general_ci;
USE `student_records`;

-- --------------------------------------------------------

--
-- Table structure for table `assessment_criteria`
--

CREATE TABLE `assessment_criteria` (
  `criteria_id` bigint(10) NOT NULL,
  `criteria_name` varchar(30) NOT NULL,
  `weightage` varchar(30) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

--
-- Dumping data for table `assessment_criteria`
--

INSERT INTO `assessment_criteria` (`criteria_id`, `criteria_name`, `weightage`) VALUES
(1, 'Communication', '20'),
(2, 'Technical Skills', '30'),
(3, 'Teamwork', '20'),
(4, 'Problem Solving', '20'),
(5, 'Attendance', '10');

-- --------------------------------------------------------

--
-- Table structure for table `assessment_result`
--

CREATE TABLE `assessment_result` (
  `result_id` bigint(10) NOT NULL,
  `internship_id` bigint(10) NOT NULL,
  `criteria_id` bigint(10) NOT NULL,
  `marks_obtained` mediumint(5) NOT NULL,
  `remark` varchar(30) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

--
-- Dumping data for table `assessment_result`
--

INSERT INTO `assessment_result` (`result_id`, `internship_id`, `criteria_id`, `marks_obtained`, `remark`) VALUES
(401, 301, 1, 18, 'Good'),
(402, 301, 2, 25, 'Very Good'),
(403, 302, 3, 17, 'Good'),
(404, 303, 4, 19, 'Excellent'),
(405, 304, 5, 9, 'Regular');

-- --------------------------------------------------------

--
-- Table structure for table `assessor`
--

CREATE TABLE `assessor` (
  `assessor_id` bigint(20) NOT NULL,
  `user_id` bigint(8) NOT NULL,
  `department` varchar(30) NOT NULL,
  `role` varchar(30) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

--
-- Dumping data for table `assessor`
--

INSERT INTO `assessor` (`assessor_id`, `user_id`, `department`, `role`) VALUES
(201, 2, 'CSE', 'Senior'),
(202, 3, 'IT', 'Senior'),
(203, 4, 'ECE', 'Junior'),
(204, 5, 'MECH', 'Senior'),
(205, 2, 'CIVIL', 'Junior');

-- --------------------------------------------------------

--
-- Table structure for table `final_result`
--

CREATE TABLE `final_result` (
  `final_result_id` bigint(10) NOT NULL,
  `internship_id` bigint(10) NOT NULL,
  `total_score` bigint(10) NOT NULL,
  `grade` varchar(5) DEFAULT NULL,
  `submitted_date` date NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

--
-- Dumping data for table `final_result`
--

INSERT INTO `final_result` (`final_result_id`, `internship_id`, `total_score`, `grade`, `submitted_date`) VALUES
(501, 301, 85, 'A', '2024-08-02'),
(502, 302, 80, 'A', '2024-08-06'),
(503, 303, 78, 'B+', '2024-08-11'),
(504, 304, 82, 'A', '2024-08-16'),
(505, 305, 75, 'B', '2024-08-21');

-- --------------------------------------------------------

--
-- Table structure for table `internship`
--

CREATE TABLE `internship` (
  `internship_id` bigint(10) NOT NULL,
  `student_id` bigint(10) NOT NULL,
  `assessor_id` bigint(10) NOT NULL,
  `company_name` varchar(30) NOT NULL,
  `start_date` date NOT NULL,
  `end_date` date NOT NULL,
  `status` varchar(10) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

--
-- Dumping data for table `internship`
--

INSERT INTO `internship` (`internship_id`, `student_id`, `assessor_id`, `company_name`, `start_date`, `end_date`, `status`) VALUES
(301, 101, 201, 'TCS', '2024-06-01', '2024-08-01', 'Completed'),
(302, 102, 202, 'Infosys', '2024-06-05', '2024-08-05', 'Completed'),
(303, 103, 203, 'Wipro', '2024-06-10', '2024-08-10', 'Completed'),
(304, 104, 204, 'HCL', '2024-06-15', '2024-08-15', 'Completed'),
(305, 105, 205, 'TechM', '2024-06-20', '2024-08-20', 'Completed');

-- --------------------------------------------------------

--
-- Table structure for table `student`
--

CREATE TABLE `student` (
  `student_id` bigint(10) NOT NULL,
  `name` varchar(30) NOT NULL,
  `email` varchar(30) NOT NULL,
  `programme` varchar(30) NOT NULL,
  `enrolment_year` bigint(10) NOT NULL,
  `student_email` varchar(100) NOT NULL DEFAULT 'noemail@mail.com',
  `contact` bigint(10) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

--
-- Dumping data for table `student`
--

INSERT INTO `student` (`student_id`, `name`, `email`, `programme`, `enrolment_year`, `student_email`, `contact`) VALUES
(101, 'Arun', 'arun@mail.com', 'CSE', 2022, 'noemail@mail.com', 9876543210),
(102, 'Bala', 'bala@mail.com', 'IT', 2022, 'noemail@mail.com', 9876543211),
(103, 'Charan', 'charan@mail.com', 'ECE', 2021, 'noemail@mail.com', 9876543212),
(104, 'Deepak', 'deepak@mail.com', 'MECH', 2021, 'noemail@mail.com', 9876543213),
(105, 'Eshan', 'eshan@mail.com', 'CIVIL', 2020, 'noemail@mail.com', 9876543214);

-- --------------------------------------------------------

--
-- Table structure for table `user`
--

CREATE TABLE `user` (
  `user_id` bigint(10) NOT NULL,
  `username` varchar(30) NOT NULL,
  `email` varchar(30) NOT NULL,
  `password` varchar(30) DEFAULT NULL,
  `role` varchar(30) NOT NULL,
  `date_created` date NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

--
-- Dumping data for table `user`
--

INSERT INTO `user` (`user_id`, `username`, `email`, `password`, `role`, `date_created`) VALUES
(1, 'admin1', 'admin1@mail.com', 'pass123', 'admin', '2024-01-01'),
(2, 'assessor1', 'ass1@mail.com', 'pass123', 'assessor', '2024-01-02'),
(3, 'assessor2', 'ass2@mail.com', 'pass123', 'assessor', '2024-01-03'),
(4, 'assessor3', 'ass3@mail.com', 'pass123', 'assessor', '2024-01-04'),
(5, 'assessor4', 'ass4@mail.com', 'pass123', 'assessor', '2024-01-05');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `assessment_criteria`
--
ALTER TABLE `assessment_criteria`
  ADD PRIMARY KEY (`criteria_id`);

--
-- Indexes for table `assessment_result`
--
ALTER TABLE `assessment_result`
  ADD PRIMARY KEY (`result_id`),
  ADD KEY `fk_result_internship` (`internship_id`),
  ADD KEY `fk_result_criteria` (`criteria_id`);

--
-- Indexes for table `assessor`
--
ALTER TABLE `assessor`
  ADD PRIMARY KEY (`assessor_id`),
  ADD KEY `fk_assessor_user` (`user_id`);

--
-- Indexes for table `final_result`
--
ALTER TABLE `final_result`
  ADD PRIMARY KEY (`final_result_id`),
  ADD KEY `fk_final_internship` (`internship_id`);

--
-- Indexes for table `internship`
--
ALTER TABLE `internship`
  ADD PRIMARY KEY (`internship_id`),
  ADD KEY `fk_internship_student` (`student_id`),
  ADD KEY `fk_internship_assessor` (`assessor_id`);

--
-- Indexes for table `student`
--
ALTER TABLE `student`
  ADD PRIMARY KEY (`student_id`);

--
-- Indexes for table `user`
--
ALTER TABLE `user`
  ADD PRIMARY KEY (`user_id`);

--
-- Constraints for dumped tables
--

--
-- Constraints for table `assessment_result`
--
ALTER TABLE `assessment_result`
  ADD CONSTRAINT `fk_result_criteria` FOREIGN KEY (`criteria_id`) REFERENCES `assessment_criteria` (`criteria_id`),
  ADD CONSTRAINT `fk_result_internship` FOREIGN KEY (`internship_id`) REFERENCES `internship` (`internship_id`);

--
-- Constraints for table `assessor`
--
ALTER TABLE `assessor`
  ADD CONSTRAINT `fk_assessor_user` FOREIGN KEY (`user_id`) REFERENCES `user` (`user_id`);

--
-- Constraints for table `final_result`
--
ALTER TABLE `final_result`
  ADD CONSTRAINT `fk_final_internship` FOREIGN KEY (`internship_id`) REFERENCES `internship` (`internship_id`);

--
-- Constraints for table `internship`
--
ALTER TABLE `internship`
  ADD CONSTRAINT `fk_internship_assessor` FOREIGN KEY (`assessor_id`) REFERENCES `assessor` (`assessor_id`),
  ADD CONSTRAINT `fk_internship_student` FOREIGN KEY (`student_id`) REFERENCES `student` (`student_id`);
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
