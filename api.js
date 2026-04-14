const API_BASE = '/Database-Interface-Coursework/api/';

const API = {
    // Authentication
    async login(email, password) {
        try {
            const response = await fetch(API_BASE + 'login.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });
            return await response.json();
        } catch (error) {
            console.error('Login error:', error);
            return { success: false, message: 'Connection error' };
        }
    },

    // Students
    async getStudents() {
        try {
            const response = await fetch(API_BASE + 'students.php');
            if (!response.ok) throw new Error('HTTP error ' + response.status);
            const data = await response.json();
            return Array.isArray(data) ? data : [];
        } catch (error) {
            console.error('Error fetching students:', error);
            return [];
        }
    },

    async addStudent(studentData) {
        try {
            const response = await fetch(API_BASE + 'students.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(studentData)
            });
            return await response.json();
        } catch (error) {
            console.error('Error adding student:', error);
            return { success: false, error: error.message };
        }
    },

    async updateStudent(studentData) {
        try {
            const response = await fetch(API_BASE + 'students.php', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(studentData)
            });
            return await response.json();
        } catch (error) {
            console.error('Error updating student:', error);
            return { success: false, error: error.message };
        }
    },

    async deleteStudent(studentId) {
        try {
            const response = await fetch(API_BASE + `students.php?id=${studentId}`, {
                method: 'DELETE'
            });
            return await response.json();
        } catch (error) {
            console.error('Error deleting student:', error);
            return { success: false, error: error.message };
        }
    },

    // Assessors
    async getAssessors() {
        try {
            const response = await fetch(API_BASE + 'assessors.php');
            if (!response.ok) throw new Error('HTTP error ' + response.status);
            const data = await response.json();
            return Array.isArray(data) ? data : [];
        } catch (error) {
            console.error('Error fetching assessors:', error);
            return [];
        }
    },

    async addAssessor(assessorData) {
        try {
            const response = await fetch(API_BASE + 'users.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...assessorData,
                    userRole: 'Assessor'
                })
            });
            return await response.json();
        } catch (error) {
            console.error('Error adding assessor:', error);
            return { success: false, error: error.message };
        }
    },

    async updateAssessor(assessorData) {
        try {
            const response = await fetch(API_BASE + 'assessors.php', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(assessorData)
            });
            return await response.json();
        } catch (error) {
            console.error('Error updating assessor:', error);
            return { success: false, error: error.message };
        }
    },

    async deleteAssessor(assessorId) {
        try {
            const response = await fetch(API_BASE + `assessors.php?id=${assessorId}`, {
                method: 'DELETE'
            });
            return await response.json();
        } catch (error) {
            console.error('Error deleting assessor:', error);
            return { success: false, error: error.message };
        }
    },

    // Users (Accounts)
    async getUsers() {
        try {
            const response = await fetch(API_BASE + 'users.php');
            if (!response.ok) throw new Error('HTTP error ' + response.status);
            const data = await response.json();
            return Array.isArray(data) ? data : [];
        } catch (error) {
            console.error('Error fetching users:', error);
            return [];
        }
    },

    async addUser(userData) {
        try {
            const response = await fetch(API_BASE + 'users.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(userData)
            });
            return await response.json();
        } catch (error) {
            console.error('Error adding user:', error);
            return { success: false, error: error.message };
        }
    },

    async updateUser(userData) {
        try {
            const response = await fetch(API_BASE + 'users.php', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(userData)
            });
            return await response.json();
        } catch (error) {
            console.error('Error updating user:', error);
            return { success: false, error: error.message };
        }
    },

    async deleteUser(userId) {
        try {
            const response = await fetch(API_BASE + `users.php?id=${userId}`, {
                method: 'DELETE'
            });
            return await response.json();
        } catch (error) {
            console.error('Error deleting user:', error);
            return { success: false, error: error.message };
        }
    },

    // Evaluations
    async submitEvaluation(evaluationData) {
        try {
            const response = await fetch(API_BASE + 'evaluation.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(evaluationData)
            });
            return await response.json();
        } catch (error) {
            console.error('Error submitting evaluation:', error);
            return { success: false, error: error.message };
        }
    },

    async getEvaluation(studentId, assessorId) {
        try {
            const response = await fetch(API_BASE + `evaluation.php?student_id=${studentId}&assessor_id=${assessorId}`);
            return await response.json();
        } catch (error) {
            console.error('Error fetching evaluation:', error);
            return null;
        }
    },

    // Internships
    async getInternships() {
        try {
            const response = await fetch(API_BASE + 'internships.php');
            const data = await response.json();
            return Array.isArray(data) ? data : [];
        } catch (error) {
            console.error('Error fetching internships:', error);
            return [];
        }
    },

    async addInternship(internshipData) {
        try {
            const response = await fetch(API_BASE + 'internships.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(internshipData)
            });
            return await response.json();
        } catch (error) {
            console.error('Error adding internship:', error);
            return { success: false, error: error.message };
        }
    },

    async updateInternship(internshipData) {
        try {
            const response = await fetch(API_BASE + 'internships.php', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(internshipData)
            });
            return await response.json();
        } catch (error) {
            console.error('Error updating internship:', error);
            return { success: false, error: error.message };
        }
    }
};

console.log('API.js loaded. API object:', API);