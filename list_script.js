// ============================================
// DATA MANAGEMENT
// ============================================
let accountsList = [];
let studentsList = [];
let assessorsList = [];
let currentUser = null;
let currentRole = null;
let selectedItem = { type: null, id: null, data: null };
let studentProgressNotes = {};
let actualPasswords = {};

// ============================================
// STORAGE HELPERS (for notes only)
// ============================================
const STORAGE_KEYS = {
    NOTES: 'studentProgressNotes'
};

function loadNotes() {
    const saved = localStorage.getItem(STORAGE_KEYS.NOTES);
    if (saved) {
        try { studentProgressNotes = JSON.parse(saved); } catch (e) { }
    }
}

function saveNotes() {
    localStorage.setItem(STORAGE_KEYS.NOTES, JSON.stringify(studentProgressNotes));
}

// ============================================
// API DATA LOADING
// ============================================
async function loadDataFromAPI() {
    try {
        console.log('Loading data from API for list page...');

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
        studentsList = studentsArray.map(s => ({
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
        assessorsList = assessorsArray.map(a => ({
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
        accountsList = usersArray.map(u => {
            let displayPassword = actualPasswords[u.user_id];
            if (!displayPassword) {
                displayPassword = generateDisplayPassword(u.username, u.user_id);
                actualPasswords[u.user_id] = displayPassword;
            }

            return {
                username: u.username || '',
                email: u.email || '',
                password: displayPassword,
                userRole: u.role || '',
                contact: u.contact || '',
                createdAt: u.date_created ? new Date(u.date_created).toLocaleDateString('en-GB') : '',
                user_id: u.user_id
            };
        });
        saveStoredPasswords();

        console.log('Transformed studentsList:', studentsList.length);
        console.log('Transformed assessorsList:', assessorsList.length);
        console.log('Transformed accountsList:', accountsList.length);

        return true;
    } catch (error) {
        console.error('Error loading data:', error);
        studentsList = [];
        assessorsList = [];
        accountsList = [];
        return false;
    }
}

function loadStoredPasswords() {
    const stored = localStorage.getItem('accountPasswords');
    if (stored) {
        try { actualPasswords = JSON.parse(stored); } catch (e) { }
    }
}

function saveStoredPasswords() {
    localStorage.setItem('accountPasswords', JSON.stringify(actualPasswords));
}

// ============================================
// UI HELPERS
// ============================================
function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m]));
}

function formatDateRange(startDate, endDate) {
    if (!startDate && !endDate) return '';
    if (startDate && endDate) {
        return `${new Date(startDate).toLocaleDateString('en-GB')} to ${new Date(endDate).toLocaleDateString('en-GB')}`;
    }
    if (startDate) return `${new Date(startDate).toLocaleDateString('en-GB')} onwards`;
    return `Until ${new Date(endDate).toLocaleDateString('en-GB')}`;
}

function getStatusIcon(status) {
    const icons = { Evaluated: '✅', Ongoing: '🔄', Pending: '⏳' };
    return icons[status] || '⏳';
}

// ============================================
// TABLE HEIGHT MANAGEMENT
// ============================================
function setTableHeight(tableId) {
    const container = document.getElementById(tableId);
    if (!container) return;

    const table = container.querySelector('table');
    if (!table) return;

    const thead = table.querySelector('thead');
    const tbody = table.querySelector('tbody');
    if (!thead) return;

    const headerHeight = thead.offsetHeight;
    const rows = tbody ? Array.from(tbody.querySelectorAll('tr')) : [];

    const maxRowsToShow = 5;
    let rowsHeight = 0;

    for (let i = 0; i < Math.min(rows.length, maxRowsToShow); i++) {
        rowsHeight += rows[i].offsetHeight;
    }

    const totalHeight = headerHeight + rowsHeight + 2;
    container.style.height = `${totalHeight}px`;
    container.style.overflowY = 'auto';
}

// ============================================
// RENDER FUNCTIONS - ADMIN
// ============================================
function renderAdminAccounts() {
    const searchTerm = document.getElementById('searchAccounts')?.value.toLowerCase() || '';
    const filtered = accountsList.filter(acc =>
        acc.username.toLowerCase().includes(searchTerm) ||
        acc.email.toLowerCase().includes(searchTerm)
    );

    const tbody = document.getElementById('accountsTableBody');
    if (!tbody) return;

    tbody.innerHTML = filtered.map(acc => `
        <tr data-type="account" data-id="${escapeHtml(acc.email)}">
            <td>${escapeHtml(acc.username)}</td>
            <td>${escapeHtml(acc.email)}</td>
            <td>${escapeHtml(acc.userRole)}</td>
            <td>${escapeHtml(acc.contact || '—')}</td>
            <td>${escapeHtml(acc.createdAt || '—')}</td>
            <td class="action-cell">
                <button class="edit-row-btn" data-type="account" data-id="${escapeHtml(acc.email)}">Edit</button>
                <button class="delete-row-btn" data-type="account" data-id="${escapeHtml(acc.email)}">Delete</button>
            </td>
        </tr>
    `).join('');

    const container = tbody.closest('.scrollable-table');
    if (container?.id) setTimeout(() => setTableHeight(container.id), 50);
}

function renderAdminStudents() {
    const searchTerm = document.getElementById('searchStudents')?.value.toLowerCase() || '';
    const statusFilter = document.getElementById('filterStudentStatus')?.value || '';
    const assessorFilter = document.getElementById('filterStudentAssessor')?.value || '';
    const programmeFilter = document.getElementById('filterStudentProgramme')?.value || '';

    const filtered = studentsList.filter(s =>
        (s.name.toLowerCase().includes(searchTerm) || s.id.toLowerCase().includes(searchTerm)) &&
        (statusFilter === '' || s.status === statusFilter) &&
        (assessorFilter === '' || s.assigned_assessor === assessorFilter) &&
        (programmeFilter === '' || (s.programme && s.programme.toLowerCase().includes(programmeFilter.toLowerCase())))
    );

    const tbody = document.getElementById('studentsTableBody');
    if (!tbody) return;

    tbody.innerHTML = filtered.map(s => `
        <tr data-type="student" data-id="${escapeHtml(s.id)}">
            <td>${escapeHtml(s.id)}</td>
            <td>${escapeHtml(s.name)}</td>
            <td>${escapeHtml(s.programme || '—')}</td>
            <td>${escapeHtml(s.company || '—')}</td>
            <td><span class="status-badge status-${s.status?.toLowerCase()}">${escapeHtml(s.status || 'Pending')}</span></td>
            <td class="action-cell">
                <button class="edit-row-btn" data-type="student" data-id="${escapeHtml(s.id)}">Edit</button>
                <button class="delete-row-btn" data-type="student" data-id="${escapeHtml(s.id)}">Delete</button>
            </td>
        </tr>
    `).join('');

    setTimeout(() => setTableHeight('studentsScrollableTable'), 50);
}

function renderAdminAssessors() {
    const searchTerm = document.getElementById('searchAssessors')?.value.toLowerCase() || '';
    const filtered = assessorsList.filter(a =>
        a.name.toLowerCase().includes(searchTerm) || a.id.toLowerCase().includes(searchTerm)
    );

    const tbody = document.getElementById('assessorsTableBody');
    if (!tbody) return;

    tbody.innerHTML = filtered.map(a => `
        <tr data-type="assessor" data-id="${escapeHtml(a.id)}">
            <td>${escapeHtml(a.id)}</td>
            <td>${escapeHtml(a.name)}</td>
            <td>${escapeHtml(a.dept || '—')}</td>
            <td>${escapeHtml(a.email)}</td>
            <td>${(a.assignedStudentIds || []).length} assigned</td>
            <td class="action-cell">
                <button class="edit-row-btn" data-type="assessor" data-id="${escapeHtml(a.id)}">Edit</button>
                <button class="delete-row-btn" data-type="assessor" data-id="${escapeHtml(a.id)}">Delete</button>
            </td>
        </tr>
    `).join('');

    const container = tbody.closest('.scrollable-table');
    if (container?.id) setTimeout(() => setTableHeight(container.id), 50);
}

// ============================================
// RENDER FUNCTIONS - ASSESSOR
// ============================================
function renderAssignedStudents() {
    if (!currentUser || currentRole !== 'assessor') return;

    const assessor = assessorsList.find(a => a.email === currentUser.email);
    if (!assessor) return;

    document.getElementById('assessorNameDisplay').innerText = assessor.name;

    const assignedIds = assessor.assignedStudentIds || [];
    let assigned = studentsList.filter(s => assignedIds.includes(s.id));

    const searchTerm = document.getElementById('searchAssignedStudents')?.value.toLowerCase() || '';
    const statusFilter = document.getElementById('filterAssignedStatus')?.value || '';
    const programmeFilter = document.getElementById('filterAssignedProgramme')?.value || '';

    assigned = assigned.filter(s =>
        (s.name.toLowerCase().includes(searchTerm) || s.id.toLowerCase().includes(searchTerm)) &&
        (statusFilter === '' || s.status === statusFilter) &&
        (programmeFilter === '' || (s.programme && s.programme.toLowerCase().includes(programmeFilter.toLowerCase())))
    );

    const tbody = document.getElementById('assignedStudentsTableBody');
    if (!tbody) return;

    tbody.innerHTML = assigned.map(s => `
        <tr data-type="student" data-id="${escapeHtml(s.id)}" data-assessor-id="${escapeHtml(assessor.id)}">
            <td>${escapeHtml(s.id)}</td>
            <td>${escapeHtml(s.name)}</td>
            <td>${escapeHtml(s.programme || '—')}</td>
            <td>${escapeHtml(s.company || '—')}</td>
            <td>${escapeHtml(s.internshipPeriod || '—')}</td>
            <td><span class="status-badge status-${s.status?.toLowerCase()}">${escapeHtml(s.status || 'Pending')}</span></td>
        </tr>
    `).join('');

    const container = tbody.closest('.scrollable-table');
    if (container?.id) setTimeout(() => setTableHeight(container.id), 50);
}

// ============================================
// FILTER DROPDOWNS
// ============================================
function populateFilterDropdowns() {
    const assessorSelect = document.getElementById('filterStudentAssessor');
    if (assessorSelect) {
        const uniqueAssessors = [...new Set(studentsList.map(s => s.assigned_assessor).filter(Boolean))];
        assessorSelect.innerHTML = '<option value="">All Assessors</option>' +
            uniqueAssessors.map(a => `<option value="${escapeHtml(a)}">${escapeHtml(a)}</option>`).join('');
    }

    const programmeSources = ['filterStudentProgramme', 'filterAssignedProgramme'];
    programmeSources.forEach(id => {
        const select = document.getElementById(id);
        if (select) {
            const uniqueProgrammes = [...new Set(studentsList.map(s => s.programme).filter(Boolean))];
            select.innerHTML = '<option value="">All Programmes</option>' +
                uniqueProgrammes.map(p => `<option value="${escapeHtml(p)}">${escapeHtml(p)}</option>`).join('');
        }
    });
}

// ============================================
// DETAILS PANEL
// ============================================
function showDetails(type, id, extraAssessorId = null) {
    let data = null;
    if (type === 'student') data = studentsList.find(s => s.id === id);
    else if (type === 'assessor') data = assessorsList.find(a => a.id === id);
    else if (type === 'account') data = accountsList.find(a => a.email === id);

    if (!data) return;

    selectedItem = { type, id, data, assessorId: extraAssessorId };

    const panel = document.getElementById('detailsPanel');
    const notesSection = document.getElementById('progressNotesSection');

    notesSection.style.display = 'none';

    if (type === 'student') {
        renderStudentDetails(data, extraAssessorId);
    } else if (type === 'assessor') {
        renderAssessorDetails(data);
    } else if (type === 'account') {
        renderAccountDetails(data);
    }

    panel.style.display = 'block';
    panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function renderStudentDetails(data, extraAssessorId) {
    document.getElementById('detailsTitle').innerText = 'Student Profile';
    const statusIcon = getStatusIcon(data.status);

    document.getElementById('detailsContent').innerHTML = `
        <div class="resume-template">
            <div class="resume-header">
                <div class="resume-avatar"><ion-icon name="person-circle-outline" style="font-size: 64px;"></ion-icon></div>
                <h2>${escapeHtml(data.name)}</h2>
                <div class="resume-title">ID: ${escapeHtml(data.id)}</div>
            </div>
            <div class="resume-section">
                <div class="resume-section-title"><ion-icon name="call-outline"></ion-icon> Contact Information</div>
                <div class="resume-grid">
                    <div class="resume-field"><div class="resume-field-label">Email Address</div><div class="resume-field-value">${escapeHtml(data.email || '—')}</div></div>
                    <div class="resume-field"><div class="resume-field-label">Phone Number</div><div class="resume-field-value">${escapeHtml(data.contact || '—')}</div></div>
                </div>
            </div>
            <div class="resume-section">
                <div class="resume-section-title"><ion-icon name="business-outline"></ion-icon> Internship Details</div>
                <div class="resume-grid">
                    <div class="resume-field"><div class="resume-field-label">Host Company</div><div class="resume-field-value">${escapeHtml(data.company || '—')}</div></div>
                    <div class="resume-field"><div class="resume-field-label">Internship Period</div><div class="resume-field-value">${escapeHtml(data.internshipPeriod || 'Not specified')}</div></div>
                    <div class="resume-field"><div class="resume-field-label">Assigned Assessor</div><div class="resume-field-value">${escapeHtml(data.assigned_assessor || 'Not assigned')}</div></div>
                </div>
            </div>
            <div class="resume-section">
                <div class="resume-section-title"><ion-icon name="school-outline"></ion-icon> Academic Info</div>
                <div class="resume-grid">
                    <div class="resume-field"><div class="resume-field-label">Enrolment Year</div><div class="resume-field-value">${escapeHtml(data.year || '—')}</div></div>
                    <div class="resume-field"><div class="resume-field-label">Academic Programme</div><div class="resume-field-value">${escapeHtml(data.programme || '—')}</div></div>
                </div>
            </div>
            <div class="resume-section">
                <div class="resume-section-title"><ion-icon name="clipboard-outline"></ion-icon> Evaluation Status</div>
                <div class="resume-grid">
                    <div class="resume-field"><div class="resume-field-label">Current Status</div><div class="resume-field-value"><span class="resume-badge">${statusIcon} ${escapeHtml(data.status || 'Pending')}</span></div></div>
                </div>
            </div>
        </div>
    `;

    if (currentRole === 'assessor' && extraAssessorId) {
        const currentAssessor = assessorsList.find(a => a.email === currentUser.email);
        if (currentAssessor && currentAssessor.id === extraAssessorId) {
            setupProgressNotes(data.id, currentAssessor.id);
        }
    }
}

function setupProgressNotes(studentId, assessorId) {
    const notesSection = document.getElementById('progressNotesSection');
    const noteTextarea = document.getElementById('studentProgressNote');
    const saveNoteBtn = document.getElementById('saveNoteBtn');

    notesSection.style.display = 'block';
    const noteKey = `${studentId}_${assessorId}`;
    noteTextarea.value = studentProgressNotes[noteKey] || '';
    saveNoteBtn.onclick = () => {
        studentProgressNotes[noteKey] = noteTextarea.value;
        saveNotes();
        alert('Progress notes saved successfully!');
    };
}

function renderAssessorDetails(data) {
    document.getElementById('detailsTitle').innerText = 'Assessor Profile';

    const assignedStudentNames = (data.assignedStudentIds || []).map(sid => {
        const stu = studentsList.find(s => s.id === sid);
        return stu ? `<span class="assigned-student-chip">${escapeHtml(stu.name)} (${stu.id})</span>` : sid;
    }).join('');

    document.getElementById('detailsContent').innerHTML = `
        <div class="resume-template">
            <div class="resume-header">
                <div class="resume-avatar"><ion-icon name="people-circle-outline" style="font-size: 64px;"></ion-icon></div>
                <h2>${escapeHtml(data.name)}</h2>
                <div class="resume-title">ID: ${escapeHtml(data.id || 'Assessor')}</div>
            </div>
            <div class="resume-section">
                <div class="resume-section-title"><ion-icon name="call-outline"></ion-icon> Contact Information</div>
                <div class="resume-grid">
                    <div class="resume-field"><div class="resume-field-label">Email Address</div><div class="resume-field-value">${escapeHtml(data.email)}</div></div>
                    <div class="resume-field"><div class="resume-field-label">Phone Number</div><div class="resume-field-value">${escapeHtml(data.contact || '—')}</div></div>
                </div>
            </div>
            <div class="resume-section">
                <div class="resume-section-title"><ion-icon name="book-outline"></ion-icon> Assessor Info</div>
                <div class="resume-grid">
                    <div class="resume-field"><div class="resume-field-label">Assessor Role</div><div class="resume-field-value">${escapeHtml(data.role)}</div></div>
                    <div class="resume-field"><div class="resume-field-label">Department</div><div class="resume-field-value">${escapeHtml(data.dept || '—')}</div></div>
                </div>
            </div>
            <div class="resume-section">
                <div class="resume-section-title"><ion-icon name="school-outline"></ion-icon> Assigned Students</div>
                <div class="resume-field">
                    <div class="resume-field-label">Students Under Supervision (${(data.assignedStudentIds || []).length})</div>
                    <div class="assigned-students-list">${assignedStudentNames || '<span style="color: #888;">No students assigned yet</span>'}</div>
                </div>
            </div>
        </div>
    `;
}

function renderAccountDetails(data) {
    document.getElementById('detailsTitle').innerText = 'Account Information';
    document.getElementById('detailsContent').innerHTML = `
        <div class="resume-template">
            <div class="resume-header">
                <div class="resume-avatar"><ion-icon name="key-outline" style="font-size: 64px;"></ion-icon></div>
                <h2>${escapeHtml(data.username)}</h2>
                <div class="resume-title">${escapeHtml(data.userRole)} Account</div>
            </div>
            <div class="resume-section">
                <div class="resume-section-title"><ion-icon name="mail-outline"></ion-icon> Account Details</div>
                <div class="resume-grid">
                    <div class="resume-field"><div class="resume-field-label">Email Address</div><div class="resume-field-value">${escapeHtml(data.email)}</div></div>
                    <div class="resume-field"><div class="resume-field-label">Password</div><div class="resume-field-value">${escapeHtml(data.password)}</div></div>
                    <div class="resume-field"><div class="resume-field-label">Contact Number</div><div class="resume-field-value">${escapeHtml(data.contact || '—')}</div></div>
                    <div class="resume-field"><div class="resume-field-label">User Role</div><div class="resume-field-value"><span class="resume-badge">${escapeHtml(data.userRole)}</span></div></div>
                    <div class="resume-field"><div class="resume-field-label">Account Created</div><div class="resume-field-value">${escapeHtml(data.createdAt || '—')}</div></div>
                </div>
            </div>
        </div>
    `;
}

// ============================================
// ROW SELECTION
// ============================================
function clearAllSelections() {
    document.querySelectorAll('.scrollable-table tbody tr').forEach(row => {
        row.classList.remove('selected-row');
    });
}

function setupRowDelegation() {
    const tbodyIds = ['accountsTableBody', 'studentsTableBody', 'assessorsTableBody', 'assignedStudentsTableBody'];
    tbodyIds.forEach(tbodyId => {
        const tbody = document.getElementById(tbodyId);
        if (!tbody) return;
        tbody.addEventListener('click', (e) => {
            const row = e.target.closest('tr');
            if (!row) return;
            clearAllSelections();
            row.classList.add('selected-row');
            const type = row.getAttribute('data-type');
            const id = row.getAttribute('data-id');
            const assessorId = row.getAttribute('data-assessor-id');
            if (type && id) showDetails(type, id, assessorId);
        });
    });
}

// ============================================
// AUTHENTICATION
// ============================================
async function checkLoginState() {
    const logged = sessionStorage.getItem('loggedInUser');
    if (!logged) {
        showAccessDenied();
        return false;
    }

    try {
        const user = JSON.parse(logged);
        currentUser = user;
        currentRole = user.userRole.toLowerCase();

        updateUIForLoggedInUser(user);

        // Make sure data is loaded
        if (studentsList.length === 0 && accountsList.length === 0) {
            console.log('Loading data for logged in user...');
            await loadDataFromAPI();
        }

        if (currentRole === 'administrator') {
            showAdminView();
        } else if (currentRole === 'assessor') {
            showAssessorView();
        } else {
            throw new Error('Invalid role');
        }

        setupRowDelegation();
        return true;
    } catch (e) {
        console.error('Login check error:', e);
        showAccessDenied();
        return false;
    }
}

function showAccessDenied() {
    document.getElementById('adminView').style.display = 'none';
    document.getElementById('assessorView').style.display = 'none';
    document.getElementById('accessDenied').style.display = 'flex';
    document.getElementById('detailsPanel').style.display = 'none';
}

function updateUIForLoggedInUser(user) {
    document.getElementById('usernameDisplay').innerText = user.username;
    document.getElementById('userRoleDisplay').innerText = user.userRole;
    document.getElementById('userInfo').style.display = 'flex';
    const loginBtn = document.getElementById('loginBtn');
    if (loginBtn) {
        loginBtn.innerText = 'LOGOUT';
        loginBtn.classList.add('logout-state');
    }
    document.getElementById('accessDenied').style.display = 'none';
}

function showAdminView() {
    document.getElementById('adminView').style.display = 'block';
    document.getElementById('assessorView').style.display = 'none';
    renderAdminAccounts();
    renderAdminStudents();
    renderAdminAssessors();
    populateFilterDropdowns();
    attachFilterEvents();
    attachEditButtonListeners();
    attachDeleteButtonListeners();
}

function showAssessorView() {
    document.getElementById('adminView').style.display = 'none';
    document.getElementById('assessorView').style.display = 'block';
    renderAssignedStudents();
    populateFilterDropdowns();
    attachAssessorFilterEvents();
}

function logout() {
    sessionStorage.removeItem('loggedInUser');
    document.getElementById('userInfo').style.display = 'none';
    const btn = document.getElementById('loginBtn');
    if (btn) {
        btn.innerText = 'LOGIN';
        btn.classList.remove('logout-state');
    }
    showAccessDenied();
    currentUser = null;
    alert('Logged out successfully');
}

function setupLogin() {
    const form = document.getElementById('listLoginForm');
    if (!form) {
        console.error('Login form not found!');
        return;
    }

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('loginEmail').value.trim();
        const password = document.getElementById('loginPassword').value.trim();

        // Use API.login() instead of localStorage comparison
        const result = await API.login(email, password);

        if (result.success) {
            console.log('Login successful:', result.user);
            document.getElementById('loginPopup').classList.remove('active-popup');

            sessionStorage.setItem('loggedInUser', JSON.stringify({
                username: result.user.username,
                email: result.user.email,
                userRole: result.user.userRole,
                userId: result.user.user_id
            }));

            alert(`Logged in as ${result.user.username}`);

            // Reload data after login
            await loadDataFromAPI();
            checkLoginState();
            form.reset();
        } else {
            console.error('Login failed:', result.message);
            alert(result.message || 'Invalid email or password');
        }
    });
}

// ============================================
// FILTER EVENT HANDLERS
// ============================================
function attachFilterEvents() {
    const elements = {
        searchAccounts: () => renderAdminAccounts(),
        searchStudents: () => renderAdminStudents(),
        filterStudentStatus: () => renderAdminStudents(),
        filterStudentAssessor: () => renderAdminStudents(),
        filterStudentProgramme: () => renderAdminStudents(),
        searchAssessors: () => renderAdminAssessors()
    };

    Object.entries(elements).forEach(([id, handler]) => {
        const el = document.getElementById(id);
        if (el) {
            const eventType = id.startsWith('search') ? 'input' : 'change';
            el.addEventListener(eventType, handler);
        }
    });
}

function attachAssessorFilterEvents() {
    const elements = {
        searchAssignedStudents: () => renderAssignedStudents(),
        filterAssignedStatus: () => renderAssignedStudents(),
        filterAssignedProgramme: () => renderAssignedStudents()
    };

    Object.entries(elements).forEach(([id, handler]) => {
        const el = document.getElementById(id);
        if (el) {
            const eventType = id.startsWith('search') ? 'input' : 'change';
            el.addEventListener(eventType, handler);
        }
    });
}

// ============================================
// EDIT MODAL
// ============================================
let currentEditType = null;
let currentEditId = null;

function openEditModal(type, id) {
    currentEditType = type;
    currentEditId = id;

    const modal = document.getElementById('editModal');
    const modalTitle = document.getElementById('editModalTitle');
    const modalBody = document.getElementById('editModalBody');

    let formHtml = '';
    let title = '';

    if (type === 'account') {
        const account = accountsList.find(a => a.email === id);
        if (account) {
            title = `Edit Account: ${account.username}`;
            formHtml = generateAccountEditForm(account);
        }
    } else if (type === 'student') {
        const student = studentsList.find(s => s.id === id);
        if (student) {
            title = `Edit Student: ${student.name}`;
            formHtml = generateStudentEditForm(student);
        }
    } else if (type === 'assessor') {
        const assessor = assessorsList.find(a => a.id === id);
        if (assessor) {
            title = `Edit Assessor: ${assessor.name}`;
            formHtml = generateAssessorEditForm(assessor);
        }
    }

    modalTitle.textContent = title;
    modalBody.innerHTML = formHtml;
    modal.style.display = 'flex';
}

function generateAccountEditForm(account) {
    return `
        <div class="edit-field"><label>Username</label><input type="text" id="edit_username" value="${escapeHtml(account.username)}"></div>
        <div class="edit-field"><label>Email</label><input type="email" id="edit_email" value="${escapeHtml(account.email)}"></div>
        <div class="edit-field">
            <label>Password</label>
            <input type="text" id="edit_password" value="" placeholder="New password">
            <small style="display:block; color:#aaa; margin-top:5px;">Current password: ${escapeHtml(account.password)}</small>
        </div>
        <div class="edit-field"><label>User Role</label>
            <select id="edit_role">
                <option value="Administrator" ${account.userRole === 'Administrator' ? 'selected' : ''}>Administrator</option>
                <option value="Assessor" ${account.userRole === 'Assessor' ? 'selected' : ''}>Assessor</option>
            </select>
        </div>
        <div class="edit-field"><label>Contact Number</label><input type="text" id="edit_contact" value="${escapeHtml(account.contact || '')}"></div>
    `;
}

function generateStudentEditForm(student) {
    const assessorOptions = ['', ...assessorsList.map(a => a.name)];
    const statusOptions = ['Pending', 'Ongoing', 'Evaluated'];

    let startDate = '', endDate = '';
    if (student.start_date) startDate = student.start_date;
    if (student.end_date) endDate = student.end_date;

    return `
        <div class="edit-field"><label>Student ID</label><input type="text" id="edit_student_id" value="${escapeHtml(student.id)}" readonly></div>
        <div class="edit-field"><label>Student Name</label><input type="text" id="edit_student_name" value="${escapeHtml(student.name)}"></div>
        <div class="edit-field"><label>Programme</label><input type="text" id="edit_programme" value="${escapeHtml(student.programme || '')}"></div>
        <div class="edit-field"><label>Internship Company</label><input type="text" id="edit_company" value="${escapeHtml(student.company || '')}"></div>
        <div class="edit-field"><label>Enrolment Year</label><input type="text" id="edit_year" value="${escapeHtml(student.year || '')}"></div>
        <div class="edit-field"><label>Email</label><input type="email" id="edit_student_email" value="${escapeHtml(student.email || '')}"></div>
        <div class="edit-field"><label>Contact Number</label><input type="text" id="edit_student_contact" value="${escapeHtml(student.contact || '')}"></div>
        <div class="edit-field"><label>Internship Start Date</label><input type="date" id="edit_start_date" value="${startDate}"></div>
        <div class="edit-field"><label>Internship End Date</label><input type="date" id="edit_end_date" value="${endDate}"></div>
        <div class="edit-field"><label>Status</label>
            <select id="edit_status">${statusOptions.map(opt => `<option value="${opt}" ${student.status === opt ? 'selected' : ''}>${opt}</option>`).join('')}</select>
        </div>
        <div class="edit-field"><label>Assigned Assessor</label>
            <select id="edit_assigned_assessor">${assessorOptions.map(name => `<option value="${name}" ${student.assigned_assessor === name ? 'selected' : ''}>${name || '—'}</option>`).join('')}</select>
        </div>
    `;
}

function generateAssessorEditForm(assessor) {
    const studentIdsString = (assessor.assignedStudentIds || []).join(', ');
    return `
        <div class="edit-field"><label>Assessor ID</label><input type="text" id="edit_assessor_id" value="${escapeHtml(assessor.id)}" readonly></div>
        <div class="edit-field"><label>Assessor Name</label><input type="text" id="edit_assessor_name" value="${escapeHtml(assessor.name)}"></div>
        <div class="edit-field"><label>Role</label><input type="text" id="edit_assessor_role" value="${escapeHtml(assessor.role || '')}"></div>
        <div class="edit-field"><label>Department</label><input type="text" id="edit_assessor_dept" value="${escapeHtml(assessor.dept || '')}"></div>
        <div class="edit-field"><label>Email</label><input type="email" id="edit_assessor_email" value="${escapeHtml(assessor.email)}"></div>
        <div class="edit-field"><label>Contact Number</label><input type="text" id="edit_assessor_contact" value="${escapeHtml(assessor.contact || '')}"></div>
        <div class="edit-field"><label>Assigned Student IDs (comma separated)</label><input type="text" id="edit_assigned_students" value="${escapeHtml(studentIdsString)}" placeholder="1001, 1002, 1003"></div>
    `;
}

async function saveEdit() {
    if (currentEditType === 'account') await updateAccountFromModal();
    else if (currentEditType === 'student') await updateStudentFromModal();
    else if (currentEditType === 'assessor') await updateAssessorFromModal();

    document.getElementById('editModal').style.display = 'none';

    if (currentRole === 'administrator') {
        renderAdminAccounts();
        renderAdminStudents();
        renderAdminAssessors();
        populateFilterDropdowns();
    } else if (currentRole === 'assessor') {
        renderAssignedStudents();
    }

    attachEditButtonListeners();
    setupRowDelegation();
    alert('Changes saved successfully!');
}

async function updateAccountFromModal() {
    const account = accountsList.find(a => a.email === currentEditId);
    if (!account) return;

    const newPassword = document.getElementById('edit_password')?.value || '';

    const updatedAccount = {
        user_id: account.user_id,
        username: document.getElementById('edit_username').value,
        email: document.getElementById('edit_email').value,
        userRole: document.getElementById('edit_role').value,
        contact: document.getElementById('edit_contact').value
    };

    let passwordChanged = false;
    let newPlainPassword = null;

    if (newPassword && newPassword.trim() !== '') {
        updatedAccount.password = newPassword;
        passwordChanged = true;
        newPlainPassword = newPassword;
    }

    const result = await API.updateUser(updatedAccount);

    if (result.success) {
        if (passwordChanged && newPlainPassword) {
            actualPasswords[account.user_id] = newPlainPassword;
            saveStoredPasswords();
            alert(`✅ Account updated successfully! New Password: ${newPlainPassword}`);
        } else {
            alert('✅ Account updated successfully!');
        }

        await loadDataFromAPI();

        if (currentRole === 'administrator') {
            renderAdminAccounts();
            renderAdminStudents();
            renderAdminAssessors();
            populateFilterDropdowns();
        } else if (currentRole === 'assessor') {
            renderAssignedStudents();
        }

        document.getElementById('editModal').style.display = 'none';
    } else {
        alert('❌ Error updating account: ' + (result.error || 'Unknown error'));
    }
}
async function updateStudentFromModal() {
    const student = studentsList.find(s => s.id === currentEditId);
    if (!student) return;

    const newAssessorName = document.getElementById('edit_assigned_assessor').value;
    const selectedAssessor = assessorsList.find(a => a.name === newAssessorName);
    const assessorId = selectedAssessor ? parseInt(selectedAssessor.id) : null;

    const updatedStudent = {
        student_id: parseInt(student.id),
        name: document.getElementById('edit_student_name').value,
        programme: document.getElementById('edit_programme').value,
        company_name: document.getElementById('edit_company').value,
        enrollment_year: parseInt(document.getElementById('edit_year').value) || new Date().getFullYear(),
        student_email: document.getElementById('edit_student_email').value,
        student_contact: parseInt(document.getElementById('edit_student_contact').value) || 0,
        assigned_assessor: assessorId,
        status: document.getElementById('edit_status').value,
        start_date: document.getElementById('edit_start_date').value || null,
        end_date: document.getElementById('edit_end_date').value || null
    };

    const result = await API.updateStudent(updatedStudent);

    if (result.success) {
        await loadDataFromAPI();
    } else {
        alert('Error updating student: ' + (result.error || 'Unknown error'));
    }
}

async function updateAssessorFromModal() {
    const assessor = assessorsList.find(a => a.id === currentEditId);
    if (!assessor) return;

    const updatedAssessor = {
        user_id: assessor.user_id,
        assessor_id: parseInt(assessor.id),
        username: document.getElementById('edit_assessor_name').value,
        email: document.getElementById('edit_assessor_email').value,
        contact: document.getElementById('edit_assessor_contact').value,
        department: document.getElementById('edit_assessor_dept').value,
        assessor_role: document.getElementById('edit_assessor_role').value
    };

    const result = await API.updateAssessor(updatedAssessor);

    if (result.success) {
        await loadDataFromAPI();
    } else {
        alert('Error updating assessor: ' + (result.error || 'Unknown error'));
    }
}

function attachEditButtonListeners() {
    document.querySelectorAll('.edit-row-btn').forEach(btn => {
        btn.removeEventListener('click', handleEditClick);
        btn.addEventListener('click', handleEditClick);
    });
}

function handleEditClick(e) {
    e.stopPropagation();
    openEditModal(this.getAttribute('data-type'), this.getAttribute('data-id'));
}

function generateDisplayPassword(username, userId) {
    if (!username) return 'user' + String(userId || '0').padStart(6, '0');
    const firstWord = username.split(' ')[0];
    const numbers = String(userId || Math.floor(Math.random() * 1000000)).padStart(6, '0').slice(-6);
    return firstWord + numbers;
}

// ============================================
// DELETE FUNCTIONS
// ============================================
async function deleteAccount(email) {
    if (!confirm('Are you sure you want to delete this account?')) return;

    const account = accountsList.find(a => a.email === email);
    if (account) {
        const result = await API.deleteUser(account.user_id);
        if (result.success) {
            await loadDataFromAPI();
            refreshAdminTables();
            alert('Account deleted successfully!');
        } else {
            alert('Error deleting account: ' + (result.error || 'Unknown error'));
        }
    }
}

async function deleteStudent(studentId) {
    if (!confirm('Are you sure you want to delete this student?')) return;

    const result = await API.deleteStudent(parseInt(studentId));
    if (result.success) {
        await loadDataFromAPI();
        refreshAdminTables();
        alert('Student deleted successfully!');
    } else {
        alert('Error deleting student: ' + (result.error || 'Unknown error'));
    }
}

async function deleteAssessor(assessorId) {
    if (!confirm('Are you sure you want to delete this assessor?')) return;

    const result = await API.deleteAssessor(parseInt(assessorId));
    if (result.success) {
        await loadDataFromAPI();
        refreshAdminTables();
        alert('Assessor deleted successfully!');
    } else {
        alert('Error deleting assessor: ' + (result.error || 'Unknown error'));
    }
}

function refreshAdminTables() {
    renderAdminStudents();
    renderAdminAssessors();
    renderAdminAccounts();
    attachEditButtonListeners();
    attachDeleteButtonListeners();
}

function attachDeleteButtonListeners() {
    document.querySelectorAll('.delete-row-btn').forEach(btn => {
        btn.removeEventListener('click', handleDeleteClick);
        btn.addEventListener('click', handleDeleteClick);
    });
}

function handleDeleteClick(e) {
    e.stopPropagation();
    const type = this.getAttribute('data-type');
    const id = this.getAttribute('data-id');

    if (type === 'account') deleteAccount(id);
    else if (type === 'student') deleteStudent(id);
    else if (type === 'assessor') deleteAssessor(id);
}

// ============================================
// MODAL SETUP
// ============================================
function setupEditModalEvents() {
    const modal = document.getElementById('editModal');
    const closeModal = () => modal.style.display = 'none';

    document.querySelector('.close-modal-btn')?.addEventListener('click', closeModal);
    document.getElementById('cancelEditBtn')?.addEventListener('click', closeModal);
    document.getElementById('saveEditBtn')?.addEventListener('click', saveEdit);
    window.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
}

// ============================================
// UI INITIALIZATION
// ============================================
function initUI() {
    const loginBtn = document.getElementById('loginBtn');
    const closePopup = document.getElementById('closePopup');
    const wrapper = document.getElementById('loginPopup');
    const closeDetails = document.getElementById('closeDetailsBtn');

    if (loginBtn) {
        loginBtn.addEventListener('click', () => {
            if (loginBtn.innerText === 'LOGOUT') logout();
            else wrapper.classList.add('active-popup');
        });
    }
    if (closePopup) closePopup.addEventListener('click', () => wrapper.classList.remove('active-popup'));
    if (closeDetails) closeDetails.addEventListener('click', () => {
        document.getElementById('detailsPanel').style.display = 'none';
        clearAllSelections();
    });
    window.addEventListener('click', (e) => {
        if (e.target === wrapper) wrapper.classList.remove('active-popup');
    });
}

function observeTableHeightChanges() {
    document.querySelectorAll('.scrollable-table').forEach(table => {
        const observer = new MutationObserver(() => {
            if (table.id) setTableHeight(table.id);
        });
        observer.observe(table, { childList: true, subtree: true, attributes: true });
    });
}

// ============================================
// INITIALIZATION
// ============================================
async function init() {
    console.log('=== LIST PAGE INITIALIZING ===');

    // First load data from API
    await loadDataFromAPI();
    console.log('Data loaded, students:', studentsList.length);

    // Load notes from localStorage
    loadNotes();

    // Setup event listeners
    setupLogin();
    setupEditModalEvents();
    initUI();

    // Check login state (data is already loaded)
    await checkLoginState();

    // Set table heights after render
    setTimeout(() => observeTableHeightChanges(), 100);
}

// Make sure to call init
init();
