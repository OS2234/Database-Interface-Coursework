# Student Internship Evaluation System

A comprehensive web-based system for managing student internships, evaluations, and assessor assignments at the University of Nottingham.

## Overview

This system provides:
- **Administrator Dashboard** - Manage students, assessors, and user accounts
- **Assessor Dashboard** - Evaluate assigned students and track progress
- **Evaluation System** - Score students across 8 weighted criteria
- **Smart Search & Filtering** - Find records quickly
- **Auto-save Drafts** - Never lose evaluation progress
- **CSV Export** - Export data for reporting

## Tech Stack

| Component | Technology |
|-----------|------------|
| Frontend | HTML5, CSS3, JavaScript |
| Backend | PHP 7.4+ |
| Database | MySQL 5.7+ |
| Server | MAMP |

## Installation Guide

### Prerequisites

- **MAMP** as MySQL environment
- Web browser (Chrome/Firefox/Edge)

### Step 2: Set Up Project Files

1. Copy the entire project folder to your web server's document root:

   **For MAMP:**
   C:\MAMP\htdocs

2. Ensure the folder structure is preserved.

### Step 3: Configure Database

1. Open **phpMyAdmin** at: `http://localhost/phpmyadmin`
   
2. Click the **Import** tab

3. Select the `localhost.sql` file from the project folder

4. Click **Go** to import the schema and sample data

### Step 4: Configure Database Connection

Edit `api/config.php` and verify the database credentials:

```php
define('DB_HOST', 'localhost');
define('DB_PORT', 3306);
define('DB_NAME', 'student_records');
define('DB_USER', 'root');      // MAMP default
define('DB_PASS', 'root');          // MAMP default
```

5.  Open your browser and navigate to this link : http://localhost/project-folder-name/dashboard.html

6.  Login using preset login credentials as stated below :

   Administrator account: Email: admin@nottingham.edu, Password: Admin000001

   Assessor account : -Email: jane.smith@nottingham.edu, Password: Jane000002
                      -Email: a.grant@nottingham.edu, Password: Alan000003
