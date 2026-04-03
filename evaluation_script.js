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

// ------------------------------
// 2. Application State
// ------------------------------
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

// ------------------------------
// 3. Evaluation Criteria (Immutable)
// ------------------------------
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

// ------------------------------
// 4. Storage Keys
// ------------------------------
const STORAGE_KEYS = {
    EVAL_DATA: 'internshipEvalData',
    EVALUATIONS: 'assessorEvaluations'
};

// ------------------------------
// 5. Utility Functions
// ------------------------------
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
    return new Date(dateString).toLocaleDateString('en-GB');
}

function generateEvaluationKey(assessorId, studentId) {
    return `${assessorId}_${studentId}`;
}

// ------------------------------
// 6. Data Management
// ------------------------------
function loadDataFromLocalStorage() {
    const savedData = localStorage.getItem(STORAGE_KEYS.EVAL_DATA);
    if (savedData) {
        try {
            const parsed = JSON.parse(savedData);
            State.studentList = parsed.studentList || [];
            State.assessorList = parsed.assessorList || [];
            State.accountList = parsed.accountList || [];
            return true;
        } catch (error) {
            console.error('Error loading data:', error);
        }
    }
    return false;
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

    const student = State.studentList.find(s => s.id === studentId);
    if (student && student.status !== 'Evaluated') {
        student.status = 'Evaluated';
        const savedData = localStorage.getItem(STORAGE_KEYS.EVAL_DATA);
        if (savedData) {
            const parsed = JSON.parse(savedData);
            parsed.studentList = State.studentList;
            localStorage.setItem(STORAGE_KEYS.EVAL_DATA, JSON.stringify(parsed));
        }
    }

    // Refresh admin view if needed
    if (State.userRole === 'administrator' && DOM.assessorDropdown?.value) {
        displayStudentsForAssessor(DOM.assessorDropdown.value);
    }
}

// ------------------------------
// 7. Score Calculation
// ------------------------------
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

    // Auto-generate remarks if empty
    if (!remarks) {
        if (weightedTotal >= 85) {
            remarks = "🏆 Outstanding performance throughout the internship. Excellent work!";
        } else if (weightedTotal >= 70) {
            remarks = "👍 Good performance. Meets expectations with consistent effort. Shows potential for growth.";
        } else if (weightedTotal >= 60) {
            remarks = "📌 Satisfactory performance. Room for improvement in certain areas.";
        } else {
            remarks = "⚠️ Needs improvement. Please focus on the areas highlighted above.";
        }
    }

    return { scores, weightedTotal, remarks, criteria: EVALUATION_CRITERIA };
}

// ------------------------------
// 8. Render Functions - Admin View
// ------------------------------
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

        // Determine status badge, icon, and color
        let statusIcon = '⏳';
        let statusText = 'Pending';
        let statusColor = '#ff9800'; // Orange for pending

        if (hasEvaluation) {
            statusIcon = '✅';
            statusText = 'Evaluated';
            statusColor = '#4caf50'; // Green for evaluated
        } else if (student.status === 'Ongoing') {
            statusIcon = '🔄';
            statusText = 'Ongoing';
            statusColor = '#2196f3'; // Blue for ongoing
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

    // Attach click handlers
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
    // Find evaluation
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

    // Update header with student name
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
            <div class="no-evaluation-message" style="text-align: center; padding: 40px; background: rgba(0,0,0,0.5); border-radius: 16px;">
                <ion-icon name="document-text-outline" style="font-size: 48px; color: #ff9800;"></ion-icon>
                <h3 style="color: #ff9800; margin-top: 15px;">No Evaluation Submitted Yet</h3>
                <p style="color: #ccc; margin-top: 10px;">This student hasn't been evaluated by their assigned assessor.</p>
            </div>
        `;
        DOM.remarksSection.innerHTML = '';
        DOM.totalScoreSection.innerHTML = '';
        DOM.marksPanel.style.display = 'block';
        return;
    }

    // Render marks grid
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
            <div class="remarks-title"><ion-icon name="chatbubble-outline"></ion-icon> Assessor's Remarks & Feedback</div>
            <div class="remarks-text">${escapeHtml(marksData.remarks)}</div>
            <div style="margin-top: 12px; font-size: 12px; color: #88aaff;">
                📅 Evaluated on: ${formatDate(marksData.evaluatedAt)}
            </div>
        </div>
    `;

    const totalPercentage = marksData.weightedTotal;
    DOM.totalScoreSection.innerHTML = `
        <div class="total-score">
            <div style="color: cyan; text-align: left; font-weight: bold; font-size: 28px; margin-bottom: 20px;">
                🎯 Overall Performance Score
            </div>
            <div><span class="total-number">${totalPercentage.toFixed(1)}%</span></div>
            <div class="progress-bar-container" style="margin-top: 12px; height: 20px;">
                <div class="progress-fill" style="width: ${totalPercentage}%; background: linear-gradient(90deg, #ffb347, #ff6b6b);"></div>
            </div>
        </div>
    `;

    DOM.marksPanel.style.display = 'block';
    DOM.marksPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ------------------------------
// 9. Render Functions - Assessor View
// ------------------------------
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
            <div class="remarks-title"><ion-icon name="chatbubble-outline"></ion-icon> Assessor's Remarks & Feedback</div>
            <div class="remarks-text">${escapeHtml(evaluation.remarks)}</div>
            <div style="margin-top: 12px; font-size: 12px; color: #88aaff;">
                📅 Evaluated on: ${formatDate(evaluation.evaluatedAt)}
            </div>
        </div>
    `;

    DOM.totalScoreSection.innerHTML = `
        <div class="total-score">
            <div style="color: cyan; text-align: left; font-weight: bold; font-size: 28px; margin-bottom: 20px;">
                🎯 Overall Performance Score
            </div>
            <div><span class="total-number">${evaluation.weightedTotal.toFixed(1)}%</span></div>
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
        displayExistingEvaluation(existingEvaluation, State.currentStudent);
    } else {
        DOM.marksPanel.style.display = 'none';
        DOM.evaluationForm.style.display = 'block';
        renderEvaluationForm(State.currentStudent, State.isEditMode ? existingEvaluation : null);
    }
}

function submitEvaluation() {
    if (!State.currentStudent || !State.currentAssessor) {
        alert('Please select a student first');
        return;
    }

    // Validate all scores
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
        renderEvaluationForm(State.currentStudent, existingEvaluation);
    }
}

// ------------------------------
// 10. UI Setup by Role
// ------------------------------
function setupUIForRole() {
    const isAdmin = State.userRole === 'administrator';
    const isAssessor = State.userRole === 'assessor';

    // Hide all sections first
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
// 11. Login & Session Management
// ------------------------------
function loadAccountsForLogin() {
    const savedData = localStorage.getItem(STORAGE_KEYS.EVAL_DATA);
    if (savedData) {
        try {
            const parsed = JSON.parse(savedData);
            if (parsed.accountList) {
                State.accountList = parsed.accountList;
                return true;
            }
        } catch (error) {
            console.error('Error loading accounts:', error);
        }
    }
    return false;
}

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

function checkExistingLogin() {
    const loggedInUser = sessionStorage.getItem('loggedInUser');
    if (!loggedInUser) {
        showAccessDenied();
        return;
    }

    try {
        const user = JSON.parse(loggedInUser);
        State.currentUser = user;
        State.userRole = user.userRole.toLowerCase();

        // Update UI
        DOM.usernameDisplay.textContent = user.username;
        DOM.userRoleDisplay.textContent = user.userRole;
        DOM.userInfo.style.display = 'flex';
        DOM.loginBtn.textContent = 'LOGOUT';
        DOM.loginBtn.classList.add('logout-state');
        if (DOM.wrapper) DOM.wrapper.classList.remove('active-popup');

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
                handleViewModeRedirect(assessor);
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
                renderEvaluationForm(State.currentStudent, existingEvaluation);
            }, 100);
        }
        sessionStorage.removeItem('evalStudentId');
        sessionStorage.removeItem('evalAssessorId');
    }
}

function handleViewModeRedirect(assessor) {
    const viewMode = sessionStorage.getItem('viewMode');
    const viewStudentId = sessionStorage.getItem('viewStudentId');
    const viewAssessorId = sessionStorage.getItem('viewAssessorId');

    if (viewMode === 'true' && viewStudentId && viewAssessorId) {
        loadDataFromLocalStorage();
        loadEvaluationsFromStorage();

        const student = State.studentList.find(s => s.id === viewStudentId);
        const evaluation = getStudentEvaluation(viewStudentId, viewAssessorId);

        if (student && evaluation) {
            DOM.studentDropdown.value = viewStudentId;
            showEvaluationPage();
            DOM.evaluationForm.style.display = 'none';
            displayExistingEvaluation(evaluation, student);
            DOM.editActionContainer.style.display = 'none';
        } else {
            showAccessDenied();
        }

        sessionStorage.removeItem('viewMode');
        sessionStorage.removeItem('viewStudentId');
        sessionStorage.removeItem('viewAssessorId');
        return true;
    }
    return false;
}

// ------------------------------
// 12. Login Form Handler
// ------------------------------
function setupLoginForm() {
    if (!DOM.loginForm) return;

    DOM.loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = DOM.loginEmail?.value.trim() || '';
        const password = DOM.loginPassword?.value.trim() || '';

        loadAccountsForLogin();
        const matchedAccount = State.accountList.find(acc => acc.email === email && acc.password === password);

        if (matchedAccount) {
            if (DOM.wrapper) DOM.wrapper.classList.remove('active-popup');

            DOM.usernameDisplay.textContent = matchedAccount.username;
            DOM.userRoleDisplay.textContent = matchedAccount.userRole;
            DOM.userInfo.style.display = 'flex';
            DOM.loginBtn.textContent = 'LOGOUT';
            DOM.loginBtn.classList.add('logout-state');

            saveLoginState({
                username: matchedAccount.username,
                email: matchedAccount.email,
                userRole: matchedAccount.userRole
            });

            alert(`Logged in successfully as ${matchedAccount.username} (${matchedAccount.userRole})`);
            checkExistingLogin();

            if (DOM.loginEmail) DOM.loginEmail.value = '';
            if (DOM.loginPassword) DOM.loginPassword.value = '';
        } else {
            alert('Invalid email or password. Please try again.');
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
            checkExistingLogin();
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

// ------------------------------
// 13. Storage Event Listener
// ------------------------------
function setupStorageListener() {
    window.addEventListener('storage', (e) => {
        if (e.key === STORAGE_KEYS.EVAL_DATA) {
            loadDataFromLocalStorage();
            if (State.userRole === 'administrator') {
                renderAssessorDropdown();
            } else if (State.userRole === 'assessor' && State.currentAssessor) {
                renderStudentDropdown();
            }
        }
        if (e.key === STORAGE_KEYS.EVALUATIONS) {
            loadEvaluationsFromStorage();
            if (State.userRole === 'assessor' && State.currentStudent) {
                const existingEvaluation = getStudentEvaluation(State.currentStudent.id, State.currentAssessor.id);
                if (existingEvaluation && !State.isEditMode) {
                    DOM.evaluationForm.style.display = 'none';
                    displayExistingEvaluation(existingEvaluation, State.currentStudent);
                }
            }
        }
    });
}

// ------------------------------
// 14. Initialization
// ------------------------------
function init() {
    loadDataFromLocalStorage();
    loadEvaluationsFromStorage();
    setupLoginForm();
    setupLoginButton();
    setupClosePopup();
    setupStorageListener();
    checkExistingLogin();
}

// Start the application
init();