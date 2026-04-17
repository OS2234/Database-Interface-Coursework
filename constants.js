// ============================================
// STORAGE KEYS
// ============================================

const STORAGE_KEYS = {
    EVALUATIONS: 'assessorEvaluations',
    NOTES: 'studentProgressNotes',
    PASSWORDS: 'accountPasswords',
    LOGGED_IN_USER: 'loggedInUser'
};

// ============================================
// EVALUATION CONFIGURATION
// ============================================

const EVALUATION_CRITERIA = [
    { name: "Undertaking Tasks/Projects", weight: 10, key: "undertaking" },
    { name: "Health and Safety Requirements at the Workplace", weight: 10, key: "health_safety" },
    { name: "Connectivity and Use of Theoretical Knowledge", weight: 10, key: "connectivity" },
    { name: "Presentation of the Report as a Written Document", weight: 15, key: "presentation" },
    { name: "Clarity of Language and Illustration", weight: 10, key: "clarity" },
    { name: "Lifelong Learning Activities", weight: 15, key: "learning" },
    { name: "Project Management", weight: 15, key: "project" },
    { name: "Time Management", weight: 15, key: "time" }
];

// ============================================
// VALIDATION PATTERNS
// ============================================

const VALIDATION_PATTERNS = {
    EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    CONTACT: /^\d{3}-\d{3}-\d{4}$/,
    YEAR: /^(200[0-9]|20[0-2][0-9]|2030)$/
};

// ============================================
// STATUS CONFIGURATION
// ============================================

const STATUS = {
    EVALUATED: 'Evaluated',
    ONGOING: 'Ongoing',
    PENDING: 'Pending'
};

const STATUS_ICONS = {
    [STATUS.EVALUATED]: '✅',
    [STATUS.ONGOING]: '🔄',
    [STATUS.PENDING]: '⏳'
};

// ============================================
// UTILITY FUNCTIONS
// ============================================


function escapeHtml(str) {
    if (!str) return '';
    const replacements = { '&': '&amp;', '<': '&lt;', '>': '&gt;' };
    return str.replace(/[&<>]/g, m => replacements[m]);
}


function formatDate(dateString, format = 'short') {
    if (!dateString) return '';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;

    if (format === 'short') {
        return date.toLocaleDateString('en-GB');
    }
    return date.toISOString().split('T')[0];
}


function formatDateRange(startDate, endDate) {
    if (!startDate && !endDate) return '—';
    if (startDate && endDate) {
        return `${formatDate(startDate)} to ${formatDate(endDate)}`;
    }
    if (startDate) return `${formatDate(startDate)} onwards`;
    return `Until ${formatDate(endDate)}`;
}

function getStatusIcon(status) {
    return STATUS_ICONS[status] || '⏳';
}


function validateEmail(email) {
    return VALIDATION_PATTERNS.EMAIL.test(email);
}


function validateContact(contact) {
    return !contact || VALIDATION_PATTERNS.CONTACT.test(contact);
}


function validateYear(year) {
    const currentYear = new Date().getFullYear();
    return year >= 2000 && year <= currentYear + 5;
}


function generateDisplayPassword(username, userId) {
    const stored = localStorage.getItem(`user_password_${userId}`);
    if (stored) return stored;

    if (!username) return `user${String(userId || 0).padStart(6, '0')}`;
    const firstWord = username.split(' ')[0];
    const numbers = String(userId || Math.floor(Math.random() * 1000000)).padStart(6, '0').slice(-6);
    return firstWord + numbers;
}

// ============================================
// SESSION MANAGEMENT
// ============================================


function getLoggedInUser() {
    const stored = sessionStorage.getItem(STORAGE_KEYS.LOGGED_IN_USER);
    try {
        return stored ? JSON.parse(stored) : null;
    } catch {
        return null;
    }
}


function setLoggedInUser(user) {
    sessionStorage.setItem(STORAGE_KEYS.LOGGED_IN_USER, JSON.stringify(user));
}


function clearLoggedInUser() {
    sessionStorage.removeItem(STORAGE_KEYS.LOGGED_IN_USER);
}


function isLoggedIn() {
    return getLoggedInUser() !== null;
}


function getUserRole() {
    const user = getLoggedInUser();
    return user ? user.userRole?.toLowerCase() : null;
}
