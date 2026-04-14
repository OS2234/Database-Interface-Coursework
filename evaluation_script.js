const DOM = {
    // Containers
    wrapper: document.getElementById('loginPopupWrapper'),
    evaluationContainer: document.querySelector('.evaluation-container'),
    accessDeniedMessage: document.getElementById('accessDeniedMessage'),

    // Login elements
    loginBtn: document.getElementById('loginBtn'),
    iconClose: document.getElementById('iconClosePopup'),
    loginForm: document.getElementById('evalLoginForm'),
    loginEmail: document.getElementById('evalLoginEmail'),
    loginPassword: document.getElementById('evalLoginPassword'),
    userInfo: document.getElementById('userInfo'),
    usernameDisplay: document.getElementById('usernameDisplay'),
    userRoleDisplay: document.getElementById('userRoleDisplay'),

    // Selectors
    assessorSelector: document.getElementById('assessorSelectorContainer'),
    assessorDropdown: document.getElementById('assessorDropdown'),
    studentSelector: document.getElementById('studentSelectorContainer'),
    studentDropdown: document.getElementById('studentDropdown'),
    studentsSection: document.getElementById('studentsSection'),
    studentsListContainer: document.getElementById('studentsListContainer'),

    // Panels
    marksPanel: document.getElementById('marksDetailPanel'),
    marksBreakdown: document.getElementById('marksBreakdownContainer'),
    remarksSection: document.getElementById('remarksSection'),
    totalScoreSection: document.getElementById('totalScoreSection'),
    editActionContainer: document.getElementById('editActionContainer'),

    // Form
    evaluationForm: document.getElementById('evaluationForm'),
    criteriaInputs: document.getElementById('criteriaInputs'),
    assessorRemarks: document.getElementById('assessorRemarks'),

    // Buttons
    submitBtn: document.getElementById('submitEvaluationBtn'),
    cancelBtn: document.getElementById('cancelEvaluationBtn'),
    editBtn: document.getElementById('editEvaluationBtn')
};

const State = {
    studentList: [],
    assessorList: [],
    accountList: [],
    currentUser: null,
    currentAssessor: null,
    currentStudent: null,
    userRole: null,
    isEditMode: false,
    assessorEvaluations: {}
};

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

const STORAGE_KEYS = {
    EVALUATIONS: 'assessorEvaluations'
};

// ==============================
// Utility Functions
// ==============================
function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, (m) => {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

function formatDate(dateString) {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('en-GB');
}

function generateEvaluationKey(assessorId, studentId) {
    return `${assessorId}_${studentId}`;
}

// ==============================
// API Data Loading
// ==============================
async function loadDataFromAPI() {
    try {
        console.log('Loading data from API for evaluation page...');

        const [students, assessors, users] = await Promise.all([
            API.getStudents(),
            API.getAssessors(),
            API.getUsers()
        ]);

        console.log('Students received:', students);
        console.log('Assessors received:', assessors);
        console.log('Users received:', users);

        // Ensure we have arrays
        const studentsArray = Array.isArray(students) ? students : [];
        const assessorsArray = Array.isArray(assessors) ? assessors : [];
        const usersArray = Array.isArray(users) ? users : [];

        // Transform students data
        State.studentList = studentsArray.map(s => ({
            id: s.student_id?.toString() || '',
            name: s.name || '',
            programme: s.programme || '',
            company: s.company_name || '',
            year: s.enrollment_year?.toString() || '',
            email: s.student_email || '',
            contact: s.student_contact?.toString() || '',
            status: s.status || s.internship_status || 'Pending',
            assigned_assessor: s.assessor_name || '',
            internshipPeriod: formatDateRange(s.start_date, s.end_date),
            student_id: s.student_id,
            start_date: s.start_date,
            end_date: s.end_date,
            assigned_assessor_id: s.assigned_assessor
        }));

        // Transform assessors data
        State.assessorList = assessorsArray.map(a => ({
            id: a.assessor_id?.toString() || '',
            name: a.username || '',
            role: a.role || 'Assessor',
            dept: a.department || '',
            email: a.email || '',
            contact: a.contact || '',
            assignedStudentIds: Array.isArray(a.assigned_student_ids) ? a.assigned_student_ids.map(id => id.toString()) : [],
            assessor_id: a.assessor_id,
            user_id: a.user_id
        }));

        // Transform users/accounts data
        State.accountList = usersArray.map(u => ({
            username: u.username || '',
            email: u.email || '',
            password: '••••••',
            userRole: u.role || '',
            contact: u.contact || '',
            createdAt: u.date_created ? new Date(u.date_created).toLocaleDateString('en-GB') : '',
            user_id: u.user_id
        }));

        console.log('Transformed studentList:', State.studentList.length);
        console.log('Transformed assessorList:', State.assessorList.length);

        return true;
    } catch (error) {
        console.error('Error loading data:', error);
        State.studentList = [];
        State.assessorList = [];
        State.accountList = [];
        return false;
    }
}

function formatDateRange(startDate, endDate) {
    if (!startDate && !endDate) return '—';
    if (startDate && endDate) {
        return `${formatDate(startDate)} to ${formatDate(endDate)}`;
    }
    if (startDate) return `${formatDate(startDate)} onwards`;
    return `Until ${formatDate(endDate)}`;
}

function loadEvaluationsFromStorage() {
    const savedEvals = localStorage.getItem(STORAGE_KEYS.EVALUATIONS);
    if (savedEvals) {
        try {
            State.assessorEvaluations = JSON.parse(savedEvals);
        } catch (e) {
            console.error('Error loading evaluations:', e);
            State.assessorEvaluations = {};
        }
    }
}

function saveEvaluationsToStorage() {
    localStorage.setItem(STORAGE_KEYS.EVALUATIONS, JSON.stringify(State.assessorEvaluations));
}

function getStudentEvaluation(studentId, assessorId) {
    const key = generateEvaluationKey(assessorId, studentId);
    return State.assessorEvaluations[key];
}

function saveStudentEvaluation(studentId, assessorId, evaluationData) {
    const key = generateEvaluationKey(assessorId, studentId);
    State.assessorEvaluations[key] = {
        ...evaluationData,
        evaluatedAt: new Date().toISOString(),
        studentId,
        assessorId
    };
    saveEvaluationsToStorage();

    // Update student status in the local state
    const student = State.studentList.find(s => s.id === studentId);
    if (student && student.status !== 'Evaluated') {
        student.status = 'Evaluated';
    }
}

// ==============================
// Score Calculation
// ==============================
function calculateWeightedTotal() {
    let total = 0;
    for (const criterion of EVALUATION_CRITERIA) {
        const scoreInput = document.getElementById(`score_${criterion.key}`);
        if (scoreInput) {
            const score = parseFloat(scoreInput.value) || 0;
            total += (score / 100) * criterion.weight;
        }
    }
    return total;
}

function collectEvaluationData() {
    const scores = {};
    for (const criterion of EVALUATION_CRITERIA) {
        const scoreInput = document.getElementById(`score_${criterion.key}`);
        scores[criterion.key] = parseFloat(scoreInput?.value) || 0;
    }

    const weightedTotal = calculateWeightedTotal();
    let remarks = DOM.assessorRemarks?.value || '';

    if (!remarks) {
        remarks = "No remarks given";
    }

    return { scores, weightedTotal, remarks, criteria: EVALUATION_CRITERIA };
}

// ==============================
// Render Functions - Admin View
// ==============================
function renderAssessorDropdown() {
    if (!DOM.assessorDropdown) return;

    if (!State.assessorList.length) {
        DOM.assessorDropdown.innerHTML = '<option value="">-- No assessors available --</option>';
        return;
    }

    const options = ['<option value="">-- Select an assessor --</option>'];
    for (const assessor of State.assessorList) {
        const studentCount = assessor.assignedStudentIds?.length || 0;
        options.push(`<option value="${assessor.id}">${escapeHtml(assessor.name)} (${studentCount} students) - ${escapeHtml(assessor.dept)}</option>`);
    }
    DOM.assessorDropdown.innerHTML = options.join('');
}

function displayStudentsForAssessor(assessorId) {
    const assessor = State.assessorList.find(a => a.id === assessorId);
    if (!assessor) {
        DOM.studentsSection.style.display = 'none';
        return;
    }

    const assignedStudents = (assessor.assignedStudentIds || [])
        .map(id => State.studentList.find(s => s.id === id))
        .filter(s => s);

    if (!assignedStudents.length) {
        DOM.studentsListContainer.innerHTML = '<div class="no-students">📌 No students assigned to this assessor yet.</div>';
        DOM.studentsSection.style.display = 'block';
        DOM.marksPanel.style.display = 'none';
        return;
    }

    const studentsHtml = assignedStudents.map(student => {
        const hasEvaluation = Object.values(State.assessorEvaluations).some(e => e.studentId === student.id);
        let statusIcon = '⏳';
        let statusText = 'Pending';
        let statusColor = '#ff9800';

        if (hasEvaluation) {
            statusIcon = '✅';
            statusText = 'Evaluated';
            statusColor = '#4caf50';
        } else if (student.status === 'Ongoing') {
            statusIcon = '🔄';
            statusText = 'Ongoing';
            statusColor = '#2196f3';
        }

        return `
            <div class="student-chip" data-student-id="${student.id}" data-student-name="${escapeHtml(student.name)}" data-assessor-id="${assessor.id}">
                ${statusIcon} ${escapeHtml(student.name)} (${student.id})
                <span style="font-size: 12px; color: ${statusColor};"> ${statusText}</span>
            </div>
        `;
    }).join('');

    DOM.studentsListContainer.innerHTML = studentsHtml;
    DOM.studentsSection.style.display = 'block';

    document.querySelectorAll('.student-chip').forEach(chip => {
        chip.addEventListener('click', () => {
            document.querySelectorAll('.student-chip').forEach(c => c.classList.remove('active-student'));
            chip.classList.add('active-student');
            displayStudentMarks(
                chip.dataset.studentId,
                chip.dataset.studentName,
                chip.dataset.assessorId
            );
        });
    });
}

function displayStudentMarks(studentId, studentName, assessorId = null) {
    let marksData = null;
    let evaluatingAssessorId = null;

    if (assessorId) {
        marksData = getStudentEvaluation(studentId, assessorId);
        if (marksData) evaluatingAssessorId = assessorId;
    }

    if (!marksData) {
        for (const [key, evaluation] of Object.entries(State.assessorEvaluations)) {
            if (evaluation.studentId === studentId) {
                marksData = evaluation;
                evaluatingAssessorId = evaluation.assessorId;
                break;
            }
        }
    }

    let studentBadge = document.getElementById('selectedStudentNameSpan');
    if (!studentBadge) {
        const panelHeader = document.querySelector('.panel-header');
        if (panelHeader) {
            studentBadge = document.createElement('span');
            studentBadge.id = 'selectedStudentNameSpan';
            studentBadge.className = 'student-badge';
            panelHeader.appendChild(studentBadge);
        }
    }
    if (studentBadge) studentBadge.textContent = `${studentName} (${studentId})`;

    DOM.editActionContainer.style.display = 'none';

    if (!marksData) {
        DOM.marksBreakdown.innerHTML = `
            <div class="no-evaluation-message">
                <ion-icon name="document-text-outline" style="font-size: 48px; color: #ff9800;"></ion-icon>
                <h3>No Evaluation Submitted Yet</h3>
                <p>This student hasn't been evaluated by their assigned assessor.</p>
            </div>
        `;
        DOM.remarksSection.innerHTML = '';
        DOM.totalScoreSection.innerHTML = '';
        DOM.marksPanel.style.display = 'block';
        return;
    }

    const marksHtml = `
        <div class="marks-grid">
            ${EVALUATION_CRITERIA.map(criterion => {
        const percentage = marksData.scores[criterion.key] || 0;
        const weightedContribution = (percentage / 100) * criterion.weight;
        return `
                    <div class="criteria-card">
                        <div class="criteria-name">${criterion.name}</div>
                        <div style="display: flex; justify-content: space-between;">
                            <span class="score-value">${weightedContribution.toFixed(1)} / ${criterion.weight}</span>
                            <span class="criterion-percentage">${percentage}%</span>
                        </div>
                        <div class="progress-bar-container">
                            <div class="progress-fill" style="width: ${percentage}%;"></div>
                        </div>
                    </div>
                `;
    }).join('')}
        </div>
    `;
    DOM.marksBreakdown.innerHTML = marksHtml;

    DOM.remarksSection.innerHTML = `
        <div class="remarks-box">
            <div class="remarks-title">Assessor's Remarks & Feedback</div>
            <div class="remarks-text">${escapeHtml(marksData.remarks)}</div>
            <div style="margin-top: 12px; font-size: 12px; color: #88aaff;">
                📅 Evaluated on: ${formatDate(marksData.evaluatedAt)}
            </div>
        </div>
    `;

    const totalPercentage = marksData.weightedTotal;
    DOM.totalScoreSection.innerHTML = `
        <div class="total-score">
            <div class="total-number">${totalPercentage.toFixed(1)}%</div>
            <div class="progress-bar-container" style="margin-top: 12px; height: 20px;">
                <div class="progress-fill" style="width: ${totalPercentage}%; background: linear-gradient(90deg, #ffb347, #ff6b6b);"></div>
            </div>
        </div>
    `;

    DOM.marksPanel.style.display = 'block';
}

// ==================================
// Render Functions - Assessor View
// ==================================
function renderStudentDropdown() {
    if (!DOM.studentDropdown || !State.currentAssessor) return;

    const assignedStudents = (State.currentAssessor.assignedStudentIds || [])
        .map(id => State.studentList.find(s => s.id === id))
        .filter(s => s);

    if (!assignedStudents.length) {
        DOM.studentDropdown.innerHTML = '<option value="">-- No students assigned --</option>';
        return;
    }

    const options = ['<option value="">-- Select a student --</option>'];
    for (const student of assignedStudents) {
        const isEvaluated = !!getStudentEvaluation(student.id, State.currentAssessor.id);
        const status = isEvaluated ? '✅ Evaluated' : '⏳ Pending';
        options.push(`<option value="${student.id}" data-status="${isEvaluated}">${escapeHtml(student.name)} (${student.id}) - ${status}</option>`);
    }
    DOM.studentDropdown.innerHTML = options.join('');
}

function renderEvaluationForm(existingEvaluation = null) {
    const marksHtml = `
        <div class="evaluation-grid">
            ${EVALUATION_CRITERIA.map(criterion => {
        const existingScore = existingEvaluation?.scores?.[criterion.key] ?? 50;
        return `
                    <div class="criteria-input-card">
                        <div class="criteria-header">
                            <span class="criteria-name">${criterion.name}</span>
                        </div>
                        <div class="score-row">
                            <div class="score-input">
                                <label>Score:</label>
                                <input type="number" id="score_${criterion.key}" class="score-input-field"
                                    value="${existingScore}" min="0" max="100" step="1">
                            </div>
                            <span class="criteria-weight">Weight: ${criterion.weight}%</span>
                        </div>
                    </div>
                `;
    }).join('')}
        </div>
    `;
    DOM.criteriaInputs.innerHTML = marksHtml;
    DOM.assessorRemarks.value = existingEvaluation?.remarks || '';
}

function displayExistingEvaluation(evaluation) {
    DOM.editActionContainer.style.display = 'block';

    const marksHtml = `
        <div class="marks-grid">
            ${EVALUATION_CRITERIA.map(criterion => {
        const score = evaluation.scores[criterion.key] || 0;
        const weightedContribution = (score / 100) * criterion.weight;
        return `
                    <div class="criteria-card">
                        <div class="criteria-name">${criterion.name}</div>
                        <div style="display: flex; justify-content: space-between;">
                            <span class="score-value">${weightedContribution.toFixed(1)} / ${criterion.weight}</span>
                            <span class="criterion-percentage">${score}%</span>
                        </div>
                        <div class="progress-bar-container">
                            <div class="progress-fill" style="width: ${score}%;"></div>
                        </div>
                    </div>
                `;
    }).join('')}
        </div>
    `;
    DOM.marksBreakdown.innerHTML = marksHtml;

    DOM.remarksSection.innerHTML = `
        <div class="remarks-box">
            <div class="remarks-title">Assessor's Remarks & Feedback</div>
            <div class="remarks-text">${escapeHtml(evaluation.remarks)}</div>
            <div style="margin-top: 12px; font-size: 12px; color: #88aaff;">
                📅 Evaluated on: ${formatDate(evaluation.evaluatedAt)}
            </div>
        </div>
    `;

    DOM.totalScoreSection.innerHTML = `
        <div class="total-score">
            <div class="total-number">${evaluation.weightedTotal.toFixed(1)}%</div>
            <div class="progress-bar-container" style="margin-top: 12px; height: 20px;">
                <div class="progress-fill" style="width: ${evaluation.weightedTotal}%; background: linear-gradient(90deg, #ffb347, #ff6b6b);"></div>
            </div>
        </div>
    `;

    DOM.marksPanel.style.display = 'block';
}

function handleStudentSelection() {
    const studentId = DOM.studentDropdown?.value;
    if (!studentId) {
        DOM.evaluationForm.style.display = 'none';
        DOM.marksPanel.style.display = 'none';
        return;
    }

    State.currentStudent = State.studentList.find(s => s.id === studentId);
    if (!State.currentStudent) return;

    const existingEvaluation = getStudentEvaluation(studentId, State.currentAssessor.id);

    if (existingEvaluation && !State.isEditMode) {
        DOM.evaluationForm.style.display = 'none';
        displayExistingEvaluation(existingEvaluation);
    } else {
        DOM.marksPanel.style.display = 'none';
        DOM.evaluationForm.style.display = 'block';
        renderEvaluationForm(State.isEditMode ? existingEvaluation : null);
    }
}

function submitEvaluation() {
    if (!State.currentStudent || !State.currentAssessor) {
        alert('Please select a student first');
        return;
    }

    for (const criterion of EVALUATION_CRITERIA) {
        const scoreInput = document.getElementById(`score_${criterion.key}`);
        if (scoreInput) {
            const score = parseFloat(scoreInput.value);
            if (isNaN(score) || score < 0 || score > 100) {
                alert(`Please enter a valid score (0-100) for ${criterion.name}`);
                return;
            }
        }
    }

    const evaluationData = collectEvaluationData();
    saveStudentEvaluation(State.currentStudent.id, State.currentAssessor.id, evaluationData);

    alert(`Evaluation for ${State.currentStudent.name} submitted successfully!\nTotal Score: ${evaluationData.weightedTotal.toFixed(1)}%`);

    State.isEditMode = false;
    renderStudentDropdown();
    if (DOM.studentDropdown) DOM.studentDropdown.value = '';
    DOM.evaluationForm.style.display = 'none';
    DOM.marksPanel.style.display = 'none';
}

function cancelEvaluation() {
    State.isEditMode = false;
    if (DOM.studentDropdown) DOM.studentDropdown.value = '';
    DOM.evaluationForm.style.display = 'none';
    DOM.marksPanel.style.display = 'none';
}

function editEvaluation() {
    State.isEditMode = true;
    const existingEvaluation = getStudentEvaluation(State.currentStudent.id, State.currentAssessor.id);
    if (existingEvaluation) {
        DOM.marksPanel.style.display = 'none';
        DOM.evaluationForm.style.display = 'block';
        renderEvaluationForm(existingEvaluation);
    }
}

// ==============================
// UI Setup by Role
// ==============================
function setupUIForRole() {
    const isAdmin = State.userRole === 'administrator';
    const isAssessor = State.userRole === 'assessor';

    DOM.assessorSelector.style.display = 'none';
    DOM.studentSelector.style.display = 'none';
    DOM.studentsSection.style.display = 'none';
    DOM.marksPanel.style.display = 'none';
    DOM.evaluationForm.style.display = 'none';

    if (isAdmin) {
        DOM.assessorSelector.style.display = 'block';
        renderAssessorDropdown();
        DOM.assessorDropdown?.addEventListener('change', (e) => {
            const selectedId = e.target.value;
            if (!selectedId) {
                DOM.studentsSection.style.display = 'none';
                DOM.marksPanel.style.display = 'none';
                return;
            }
            displayStudentsForAssessor(selectedId);
        });
    } else if (isAssessor && State.currentAssessor) {
        DOM.studentSelector.style.display = 'block';
        renderStudentDropdown();
        DOM.studentDropdown?.addEventListener('change', handleStudentSelection);
        DOM.submitBtn?.addEventListener('click', submitEvaluation);
        DOM.cancelBtn?.addEventListener('click', cancelEvaluation);
        DOM.editBtn?.addEventListener('click', editEvaluation);
    }
}

// ------------------------------
// Login & Session Management
// ------------------------------
function saveLoginState(user) {
    sessionStorage.setItem('loggedInUser', JSON.stringify(user));
}

function clearLoginState() {
    sessionStorage.removeItem('loggedInUser');
}

function showAccessDenied() {
    if (DOM.evaluationContainer) DOM.evaluationContainer.style.display = 'none';
    if (DOM.accessDeniedMessage) DOM.accessDeniedMessage.style.display = 'flex';
}

function showEvaluationPage() {
    if (DOM.evaluationContainer) DOM.evaluationContainer.style.display = 'block';
    if (DOM.accessDeniedMessage) DOM.accessDeniedMessage.style.display = 'none';
}

async function checkExistingLogin() {
    const loggedInUser = sessionStorage.getItem('loggedInUser');
    if (!loggedInUser) {
        showAccessDenied();
        return;
    }

    try {
        const user = JSON.parse(loggedInUser);
        State.currentUser = user;
        State.userRole = user.userRole.toLowerCase();

        DOM.usernameDisplay.textContent = user.username;
        DOM.userRoleDisplay.textContent = user.userRole;
        DOM.userInfo.style.display = 'flex';
        DOM.loginBtn.textContent = 'LOGOUT';
        DOM.loginBtn.classList.add('logout-state');
        if (DOM.wrapper) DOM.wrapper.classList.remove('active-popup');

        await loadDataFromAPI();
        loadEvaluationsFromStorage();

        if (State.userRole === 'administrator') {
            showEvaluationPage();
            setupUIForRole();
        } else if (State.userRole === 'assessor') {
            const assessor = State.assessorList.find(a => a.email === user.email);
            if (assessor) {
                State.currentAssessor = assessor;
                showEvaluationPage();
                setupUIForRole();
                handlePendingEvaluationRedirect(assessor);
                handleViewModeRedirect();
            } else {
                showAccessDenied();
            }
        } else {
            showAccessDenied();
        }
    } catch (e) {
        console.error('Error parsing logged in user:', e);
        showAccessDenied();
    }
}

function handlePendingEvaluationRedirect(assessor) {
    const pendingStudentId = sessionStorage.getItem('evalStudentId');
    const pendingAssessorId = sessionStorage.getItem('evalAssessorId');

    if (pendingStudentId && pendingAssessorId && pendingAssessorId === assessor.id) {
        State.currentStudent = State.studentList.find(s => s.id === pendingStudentId);
        if (State.currentStudent) {
            setTimeout(() => {
                DOM.studentDropdown.value = pendingStudentId;
                const existingEvaluation = getStudentEvaluation(pendingStudentId, assessor.id);
                State.isEditMode = !!existingEvaluation;
                DOM.evaluationForm.style.display = 'block';
                DOM.marksPanel.style.display = 'none';
                renderEvaluationForm(existingEvaluation);
            }, 100);
        }
        sessionStorage.removeItem('evalStudentId');
        sessionStorage.removeItem('evalAssessorId');
    }
}

function handleViewModeRedirect() {
    const viewMode = sessionStorage.getItem('viewMode');
    const viewStudentId = sessionStorage.getItem('viewStudentId');
    const viewAssessorId = sessionStorage.getItem('viewAssessorId');

    if (viewMode === 'true' && viewStudentId && viewAssessorId) {
        const student = State.studentList.find(s => s.id === viewStudentId);
        const evaluation = getStudentEvaluation(viewStudentId, viewAssessorId);

        if (student && evaluation) {
            setTimeout(() => {
                DOM.studentDropdown.value = viewStudentId;
                showEvaluationPage();
                DOM.evaluationForm.style.display = 'none';
                displayExistingEvaluation(evaluation);
                DOM.editActionContainer.style.display = 'none';
            }, 100);
        }

        sessionStorage.removeItem('viewMode');
        sessionStorage.removeItem('viewStudentId');
        sessionStorage.removeItem('viewAssessorId');
        return true;
    }
    return false;
}

// ==============================
// Login Form Handler
// ==============================
function setupLoginForm() {
    if (!DOM.loginForm) return;

    DOM.loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = DOM.loginEmail?.value.trim() || '';
        const password = DOM.loginPassword?.value.trim() || '';

        const result = await API.login(email, password);

        if (result.success) {
            if (DOM.wrapper) DOM.wrapper.classList.remove('active-popup');

            DOM.usernameDisplay.textContent = result.user.username;
            DOM.userRoleDisplay.textContent = result.user.userRole;
            DOM.userInfo.style.display = 'flex';
            DOM.loginBtn.textContent = 'LOGOUT';
            DOM.loginBtn.classList.add('logout-state');

            saveLoginState({
                username: result.user.username,
                email: result.user.email,
                userRole: result.user.userRole,
                userId: result.user.user_id
            });

            alert(`Logged in successfully as ${result.user.username} (${result.user.userRole})`);
            await checkExistingLogin();

            if (DOM.loginEmail) DOM.loginEmail.value = '';
            if (DOM.loginPassword) DOM.loginPassword.value = '';
        } else {
            alert(result.message || 'Invalid email or password. Please try again.');
        }
    });
}

function setupLoginButton() {
    if (!DOM.loginBtn) return;

    DOM.loginBtn.addEventListener('click', () => {
        if (DOM.loginBtn.textContent === 'LOGOUT') {
            DOM.userInfo.style.display = 'none';
            DOM.loginBtn.textContent = 'LOGIN';
            DOM.loginBtn.classList.remove('logout-state');
            if (DOM.wrapper) DOM.wrapper.classList.remove('active-popup');
            clearLoginState();
            showAccessDenied();
            alert('Logged out successfully');
        } else {
            if (DOM.wrapper) DOM.wrapper.classList.add('active-popup');
            if (DOM.loginEmail) DOM.loginEmail.value = '';
            if (DOM.loginPassword) DOM.loginPassword.value = '';
        }
    });
}

function setupClosePopup() {
    if (DOM.iconClose && DOM.wrapper) {
        DOM.iconClose.addEventListener('click', () => {
            DOM.wrapper.classList.remove('active-popup');
        });
    }
}

// ==============================
// Storage Event Listener
// ==============================
function setupStorageListener() {
    window.addEventListener('storage', (e) => {
        if (e.key === STORAGE_KEYS.EVALUATIONS) {
            loadEvaluationsFromStorage();
            if (State.userRole === 'assessor' && State.currentStudent) {
                const existingEvaluation = getStudentEvaluation(State.currentStudent.id, State.currentAssessor.id);
                if (existingEvaluation && !State.isEditMode) {
                    DOM.evaluationForm.style.display = 'none';
                    displayExistingEvaluation(existingEvaluation);
                }
            }
        }
    });
}

// ==============================
// Initialization
// ==============================
async function init() {
    setupLoginForm();
    setupLoginButton();
    setupClosePopup();
    setupStorageListener();
    await checkExistingLogin();
}

init();