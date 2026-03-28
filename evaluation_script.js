// DOM Elements
const assessorDropdown = document.getElementById('assessorDropdown');
const studentsSection = document.getElementById('studentsSection');
const studentsListContainer = document.getElementById('studentsListContainer');
const selectedStudentNameSpan = document.getElementById('selectedStudentNameSpan');
const marksPanel = document.getElementById('marksDetailPanel');
const marksBreakdownContainer = document.getElementById('marksBreakdownContainer');
const remarksSection = document.getElementById('remarksSection');
const totalScoreSection = document.getElementById('totalScoreSection');

// Data storage
let studentList = [];
let assessorList = [];
let accountList = [];

let studentMarksDatabase = {};

// ============================================
// LOAD DATA FROM LOCALSTORAGE 
// ============================================

function loadDataFromLocalStorage() {
    const savedData = localStorage.getItem('internshipEvalData');

    if (savedData) {
        try {
            const parsedData = JSON.parse(savedData);
            if (parsedData.studentList && Array.isArray(parsedData.studentList)) {
                studentList = parsedData.studentList;
            }
            if (parsedData.assessorList && Array.isArray(parsedData.assessorList)) {
                assessorList = parsedData.assessorList;
            }
            if (parsedData.accountList && Array.isArray(parsedData.accountList)) {
                accountList = parsedData.accountList;
            }
            console.log('Data loaded from localStorage:', { students: studentList.length, assessors: assessorList.length });
            return true;
        } catch (error) {
            console.error('Error loading data:', error);
            return false;
        }
    }
    return false;
}

// ============================================
// GENERATE RANDOM BUT CONSISTENT MARKS FOR STUDENTS
// ============================================

function generateMarksForStudent(studentId, studentName) {
    // Define evaluation criteria with weights
    const criteria = [
        { name: "Undertaking Tasks/Projects", weight: 10, key: "undertaking" },
        { name: "Health and Safety Requirements at the Workplace", weight: 10, key: "health&safety" },
        { name: "Connectivity and Use of Theoretical Knowledge", weight: 10, key: "connectivity" },
        { name: "Presentation of the Report as a Written Document", weight: 15, key: "presentation" },
        { name: "Clarity of Language and Illustration", weight: 10, key: "clarity" },
        { name: "Lifelong Learning Activities", weight: 15, key: "learning" },
        { name: "Project Management", weight: 15, key: "project" },
        { name: "Time Management", weight: 15, key: "time" }
    ];

    function createSeededRandom(seed) {
        let state = seed;
        return function () {
            state = (state * 1103515245 + 12345) & 0x7fffffff;
            return state / 0x7fffffff;
        };
    }

    let hash = 0;
    for (let i = 0; i < studentId.length; i++) {
        hash = ((hash << 5) - hash) + studentId.charCodeAt(i);
        hash |= 0;
    }
    const seed = Math.abs(hash) % 100;

    const rng = createSeededRandom(seed);

    const marks = {};
    const scores = {};

    criteria.forEach((criterion) => {
        const score = Math.floor(rng() * 101);

        scores[criterion.key] = score;
        marks[criterion.key] = {
            score: scores[criterion.key],
            weight: criterion.weight
        };
    });

    // Calculate weighted total
    let totalWeighted = 0;
    criteria.forEach(c => {
        totalWeighted += (scores[c.key] / 100) * c.weight;
    });

    // Default remarks based on scores 
    const remarksList = [];
    if (totalWeighted >= 85) {
        remarksList.push("🏆 Outstanding performance throughout the internship.");
    } else if (totalWeighted >= 70) {
        remarksList.push("👍 Good performance. Meets expectations with consistent effort. Shows potential for growth.");
    } else {
        remarksList.push("📌 Satisfactory performance.");
    }

    return {
        studentId: studentId,
        studentName: studentName,
        criteria: criteria,
        scores: scores,
        weightedTotal: totalWeighted,
        remarks: remarksList.join(" "),
        lastUpdated: new Date().toLocaleDateString('en-GB')
    };
}

// Initialize marks database for all students
function initializeMarksDatabase() {
    studentList.forEach(student => {
        if (!studentMarksDatabase[student.id]) {
            studentMarksDatabase[student.id] = generateMarksForStudent(student.id, student.name);
        }
    });
}

// ============================================
// RENDER ASSESSOR DROPDOWN
// ============================================

function renderAssessorDropdown() {
    if (!assessorDropdown) return;

    if (!assessorList || assessorList.length === 0) {
        assessorDropdown.innerHTML = `<option value="">-- No assessors available --</option>`;
        return;
    }

    let options = '<option value="">-- Select an assessor --</option>';

    assessorList.forEach(assessor => {
        const studentCount = assessor.assignedStudentIds ? assessor.assignedStudentIds.length : 0;
        options += `<option value="${assessor.id}">${escapeHtml(assessor.name)} (${studentCount} students) - ${escapeHtml(assessor.dept)}</option>`;
    });

    assessorDropdown.innerHTML = options;
}

// ============================================
// DISPLAY STUDENTS FOR SELECTED ASSESSOR
// ============================================

function displayStudentsForAssessor(assessorId) {
    const assessor = assessorList.find(a => a.id === assessorId);

    if (!assessor) {
        studentsSection.classList.remove('visible');
        return;
    }

    // Get assigned students 
    let assignedStudents = [];
    if (assessor.assignedStudentIds && assessor.assignedStudentIds.length > 0) {
        assignedStudents = assessor.assignedStudentIds
            .map(studentId => studentList.find(s => s.id === studentId))
            .filter(s => s); // remove undefined
    }

    if (assignedStudents.length === 0) {
        studentsListContainer.innerHTML = `<div class="no-students">📌 No students assigned to this assessor yet. Please assign students from the dashboard.</div>`;
        studentsSection.classList.add('visible');
        marksPanel.style.display = 'none';
        return;
    }

    // Display students as chips
    let studentsHtml = '';
    assignedStudents.forEach(student => {
        studentsHtml += `
            <div class="student-chip" data-student-id="${student.id}" data-student-name="${escapeHtml(student.name)}" data-assessor-id="${assessor.id}">
                ${escapeHtml(student.name)} (${student.id})
            </div>
        `;
    });

    studentsListContainer.innerHTML = studentsHtml;
    studentsSection.classList.add('visible');

    attachStudentClickHandlers();
}
// ============================================
// ATTACH CLICK HANDLERS TO STUDENT CHIPS
// ============================================

function attachStudentClickHandlers() {
    const studentChips = document.querySelectorAll('.student-chip');
    studentChips.forEach(chip => {
        chip.removeEventListener('click', chip._clickHandler);

        const handler = (e) => {
            e.stopPropagation();
            document.querySelectorAll('.student-chip').forEach(c => c.classList.remove('active-student'));
            chip.classList.add('active-student');

            const studentId = chip.getAttribute('data-student-id');
            const studentName = chip.getAttribute('data-student-name');
            displayStudentMarks(studentId, studentName);
        };

        chip._clickHandler = handler;
        chip.addEventListener('click', handler);
    });
}

// ============================================
// DISPLAY STUDENT MARKS WITH PROGRESS BARS
// ============================================

function displayStudentMarks(studentId, studentName) {
    // Get marks from database, generate if not exists
    let marksData = studentMarksDatabase[studentId];
    if (!marksData) {
        marksData = generateMarksForStudent(studentId, studentName);
        studentMarksDatabase[studentId] = marksData;
    }

    // Update selected student name badge
    selectedStudentNameSpan.textContent = `${studentName} (${studentId})`;

    // Build marks breakdown grid
    let marksHtml = '<div class="marks-grid">';

    marksData.criteria.forEach(criterion => {
        const percentage = marksData.scores[criterion.key];
        const weightedContribution = (marksData.scores[criterion.key] / 100) * criterion.weight;

        marksHtml += `
            <div class="criteria-card">
                <div class="criteria-name">
                    ${criterion.name}
                </div>
                <div style="display: flex; justify-content: space-between;">
                    <span class="score-value">${weightedContribution.toFixed(1)} /${criterion.weight}</span>
                    <span class="criterion-percentage">${percentage}%</span>
                </div>
                
                <div class="progress-bar-container">
                    <div class="progress-fill" style="width: ${percentage}%;">
                    </div>
                    </div>
            </div>
        `;
    });

    marksHtml += '</div>';
    marksBreakdownContainer.innerHTML = marksHtml;

    // Remarks section
    remarksSection.innerHTML = `
        <div class="remarks-box">
            <div class="remarks-title">
                <ion-icon name="chatbubble-outline"></ion-icon> Assessor's Remarks & Feedback
            </div>
            <div class="remarks-text">${escapeHtml(marksData.remarks)}</div>
            <div style="margin-top: 12px; font-size: 12px; color: #88aaff;">📅 Last evaluated: ${marksData.lastUpdated}</div>
        </div>
    `;

    // Build total score section with visual bar
    const totalPercentage = marksData.weightedTotal;

    totalScoreSection.innerHTML = `
        <div class="total-score">
            <div style="color: cyan; text-align: left; font-weight: bold; font-size: 28px; margin-bottom: 20px;">🎯 Overall Performance Score</div>
            <div>
                <span class="total-number">${totalPercentage.toFixed(1)}%</span>
            </div>
            <div class="progress-bar-container" style="margin-top: 12px; height: 20px;">
                <div class="progress-fill" style="width: ${totalPercentage}%; background: linear-gradient(90deg, #ffb347, #ff6b6b);">
                </div>
            </div>
        </div>
    `;

    // Show the marks panel with animation
    marksPanel.style.display = 'block';
    marksPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ============================================
// LOGIN FUNCTIONALITY 
// ============================================

const wrapper = document.getElementById('loginPopupWrapper');
const btnPopup = document.getElementById('loginBtn');
const iconClose = document.getElementById('iconClosePopup');
const loginForm = document.getElementById('evalLoginForm');
const userInfo = document.getElementById('userInfo');
const usernameDisplay = document.getElementById('usernameDisplay');
const userRoleDisplay = document.getElementById('userRoleDisplay');

let accountListForLogin = [];

function loadAccountsForLogin() {
    const savedData = localStorage.getItem('internshipEvalData');
    if (savedData) {
        try {
            const parsedData = JSON.parse(savedData);
            if (parsedData.accountList && Array.isArray(parsedData.accountList)) {
                accountListForLogin = parsedData.accountList;
                return true;
            }
        } catch (error) {
            console.error('Error loading accounts:', error);
        }
    }
    return false;
}

function checkExistingLogin() {
    const loggedInUser = sessionStorage.getItem('loggedInUser');
    if (loggedInUser) {
        try {
            const user = JSON.parse(loggedInUser);
            if (userInfo && usernameDisplay && userRoleDisplay) {
                usernameDisplay.textContent = user.username;
                userRoleDisplay.textContent = user.userRole;
                userInfo.style.display = 'flex';
                const loginBtn = document.getElementById('loginBtn');
                if (loginBtn) {
                    loginBtn.textContent = 'LOGOUT';
                    loginBtn.classList.add('logout-state');
                }
            }
        } catch (e) {
            console.error('Error parsing user:', e);
        }
    }
}

function saveLoginState(user) {
    sessionStorage.setItem('loggedInUser', JSON.stringify(user));
}

function clearLoginState() {
    sessionStorage.removeItem('loggedInUser');
}

if (loginForm) {
    loginForm.addEventListener('submit', function (e) {
        e.preventDefault();

        const emailInput = document.getElementById('evalLoginEmail');
        const passwordInput = document.getElementById('evalLoginPassword');
        const enteredEmail = emailInput.value.trim();
        const enteredPassword = passwordInput.value.trim();

        loadAccountsForLogin();

        const matchedAccount = accountListForLogin.find(account =>
            account.email === enteredEmail && account.password === enteredPassword
        );

        if (matchedAccount) {
            if (wrapper) wrapper.classList.remove('active-popup');

            if (userInfo && usernameDisplay && userRoleDisplay) {
                usernameDisplay.textContent = matchedAccount.username;
                userRoleDisplay.textContent = matchedAccount.userRole;
                userInfo.style.display = 'flex';
                const loginBtn = document.getElementById('loginBtn');
                if (loginBtn) {
                    loginBtn.textContent = 'LOGOUT';
                    loginBtn.classList.add('logout-state');
                }
            }

            saveLoginState({
                username: matchedAccount.username,
                email: matchedAccount.email,
                userRole: matchedAccount.userRole
            });

            alert(`Logged in successfully as ${matchedAccount.username} (${matchedAccount.userRole})`);

            emailInput.value = '';
            passwordInput.value = '';
        } else {
            alert('Invalid email or password. Please try again.');
        }
    });
}

if (btnPopup) {
    btnPopup.addEventListener('click', function () {
        if (this.textContent === 'LOGOUT') {
            if (userInfo) userInfo.style.display = 'none';
            this.textContent = 'LOGIN';
            this.classList.remove('logout-state');
            if (wrapper) wrapper.classList.remove('active-popup');
            clearLoginState();
            alert('Logged out successfully');
        } else {
            if (wrapper) wrapper.classList.add('active-popup');
            const emailInput = document.getElementById('evalLoginEmail');
            const passwordInput = document.getElementById('evalLoginPassword');
            if (emailInput) emailInput.value = '';
            if (passwordInput) passwordInput.value = '';
        }
    });
}

if (iconClose) {
    iconClose.addEventListener('click', () => {
        if (wrapper) wrapper.classList.remove('active-popup');
    });
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, function (m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

document.getElementById('listLinkNav')?.addEventListener('click', (e) => {
    e.preventDefault();
    alert('📋 Please return to Dashboard to manage student lists and assignments.');
});

// ============================================
// ASSESSOR DROPDOWN CHANGE HANDLER
// ============================================

if (assessorDropdown) {
    assessorDropdown.addEventListener('change', function () {
        const selectedAssessorId = this.value;

        if (!selectedAssessorId) {
            studentsSection.classList.remove('visible');
            marksPanel.style.display = 'none';
            return;
        }

        displayStudentsForAssessor(selectedAssessorId);
    });
}

// ============================================
// INITIALIZATION
// ============================================

function init() {
    loadDataFromLocalStorage();
    initializeMarksDatabase();
    renderAssessorDropdown();
    checkExistingLogin();

    // If there's at least one student, optionally we could auto-select first student
    // But better to let user click
}

// Listen for storage changes (if data updated in another tab)
window.addEventListener('storage', function (e) {
    if (e.key === 'internshipEvalData') {
        loadDataFromLocalStorage();
        initializeMarksDatabase();
        renderAssessorDropdown();
        marksPanel.style.display = 'none';
    }
});

init();