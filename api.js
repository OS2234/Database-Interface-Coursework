// ============================================
// CONFIGURATION
// ============================================

const API_BASE = '/Database-Interface-Coursework/api/';
const DEFAULT_TIMEOUT = 15000;
const RETRY_DELAY_MS = 500;
const MAX_RETRIES = 2;

// ============================================
// CORE UTILITIES
// ============================================

//Creates a timeout promise for fetch requests
const createTimeoutSignal = (timeoutMs) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    return { signal: controller.signal, timeoutId };
};

//Delays execution for retry logic
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

//Formats API response consistently
const formatResponse = (data, defaultValue = []) => {
    if (Array.isArray(data)) return data;
    if (data && Array.isArray(data.data)) return data.data;
    return defaultValue;
};


//Logs API errors consistently
const logApiError = (endpoint, error, attempt) => {
    console.error(`API Error (${endpoint}) - Attempt ${attempt + 1}:`, error);
};

// ============================================
// API REQUEST FUNCTION
// ============================================

//Makes an API request with retry logic and timeout
async function apiRequest(endpoint, options = {}, retries = MAX_RETRIES) {
    const defaultOptions = {
        headers: { 'Content-Type': 'application/json' },
        ...options
    };

    for (let attempt = 0; attempt <= retries; attempt++) {
        let timeoutId = null;

        try {
            const { signal, timeoutId: tid } = createTimeoutSignal(DEFAULT_TIMEOUT);
            timeoutId = tid;

            const response = await fetch(API_BASE + endpoint, {
                ...defaultOptions,
                signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            clearTimeout(timeoutId);

            if (attempt === retries) {
                logApiError(endpoint, error, attempt);
                return { success: false, error: error.message };
            }

            await delay(RETRY_DELAY_MS * (attempt + 1));
        }
    }
}

// ============================================
// VALIDATION HELPERS
// ============================================

const validateRequired = (fields, data) => {
    for (const field of fields) {
        if (!data[field]) {
            return { valid: false, error: `${field} is required` };
        }
    }
    return { valid: true };
};

// ============================================
// API MODULE
// ============================================

const API = {
    // ========== AUTHENTICATION ==========
    login(email, password) {
        const validation = validateRequired(['email', 'password'], { email, password });
        if (!validation.valid) {
            return Promise.resolve({ success: false, message: validation.error });
        }
        return apiRequest('login.php', {
            method: 'POST',
            body: JSON.stringify({ email, password })
        });
    },

    // ========== STUDENTS CRUD ==========
    async getStudents() {
        const data = await apiRequest('students.php');
        return formatResponse(data);
    },

    addStudent(studentData) {
        const validation = validateRequired(['name', 'programme'], studentData);
        if (!validation.valid) {
            return Promise.resolve({ success: false, error: validation.error });
        }
        return apiRequest('students.php', {
            method: 'POST',
            body: JSON.stringify(studentData)
        });
    },

    updateStudent(studentData) {
        const validation = validateRequired(['student_id'], studentData);
        if (!validation.valid) {
            return Promise.resolve({ success: false, error: validation.error });
        }
        return apiRequest('students.php', {
            method: 'PUT',
            body: JSON.stringify(studentData)
        });
    },

    deleteStudent(studentId) {
        if (!studentId) return Promise.resolve({ success: false, error: 'Student ID required' });
        return apiRequest(`students.php?id=${studentId}`, { method: 'DELETE' });
    },

    // ========== ASSESSORS CRUD ==========
    async getAssessors() {
        const data = await apiRequest('assessors.php');
        return formatResponse(data);
    },

    addAssessor(assessorData) {
        return this.addUser({ ...assessorData, userRole: 'Assessor' });
    },

    updateAssessor(assessorData) {
        if (!assessorData.assessor_id && !assessorData.user_id) {
            return Promise.resolve({ success: false, error: 'Assessor ID required' });
        }
        return apiRequest('assessors.php', {
            method: 'PUT',
            body: JSON.stringify(assessorData)
        });
    },

    deleteAssessor(assessorId) {
        if (!assessorId) return Promise.resolve({ success: false, error: 'Assessor ID required' });
        return apiRequest(`assessors.php?id=${assessorId}`, { method: 'DELETE' });
    },

    // ========== USERS CRUD ==========
    async getUsers() {
        const data = await apiRequest('users.php');
        return formatResponse(data);
    },

    addUser(userData) {
        const validation = validateRequired(['username', 'email', 'userRole'], userData);
        if (!validation.valid) {
            return Promise.resolve({ success: false, error: validation.error });
        }
        return apiRequest('users.php', {
            method: 'POST',
            body: JSON.stringify(userData)
        });
    },

    updateUser(userData) {
        const validation = validateRequired(['user_id'], userData);
        if (!validation.valid) {
            return Promise.resolve({ success: false, error: validation.error });
        }
        return apiRequest('users.php', {
            method: 'PUT',
            body: JSON.stringify(userData)
        });
    },

    deleteUser(userId) {
        if (!userId) return Promise.resolve({ success: false, error: 'User ID required' });
        return apiRequest(`users.php?id=${userId}`, { method: 'DELETE' });
    },

    // ========== EVALUATIONS ==========
    submitEvaluation(evaluationData) {
        const validation = validateRequired(['student_id', 'assessor_id'], evaluationData);
        if (!validation.valid) {
            return Promise.resolve({ success: false, error: validation.error });
        }
        return apiRequest('evaluation.php', {
            method: 'POST',
            body: JSON.stringify(evaluationData)
        });
    },

    getEvaluation(studentId, assessorId) {
        if (!studentId || !assessorId) return Promise.resolve(null);
        return apiRequest(`evaluation.php?student_id=${studentId}&assessor_id=${assessorId}`);
    },

    // ========== INTERNSHIPS ==========
    async getInternships() {
        const data = await apiRequest('internships.php');
        return formatResponse(data);
    },

    addInternship(internshipData) {
        const validation = validateRequired(['student_id'], internshipData);
        if (!validation.valid) {
            return Promise.resolve({ success: false, error: validation.error });
        }
        return apiRequest('internships.php', {
            method: 'POST',
            body: JSON.stringify(internshipData)
        });
    },

    updateInternship(internshipData) {
        const validation = validateRequired(['internship_id'], internshipData);
        if (!validation.valid) {
            return Promise.resolve({ success: false, error: validation.error });
        }
        return apiRequest('internships.php', {
            method: 'PUT',
            body: JSON.stringify(internshipData)
        });
    }
};

console.log('API.js loaded successfully');