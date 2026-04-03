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

// ============================================
// STORAGE HELPERS
// ============================================
const STORAGE_KEYS = {
    DATA: 'internshipEvalData',
    NOTES: 'studentProgressNotes'
};

function loadGlobalData() {
    const saved = localStorage.getItem(STORAGE_KEYS.DATA);
    if (saved) {
        try {
            const data = JSON.parse(saved);
            accountsList = data.accountList || [];
            studentsList = data.studentList || [];
            assessorsList = data.assessorList || [];
            return true;
        } catch (e) { console.error(e); }
    }
    return false;
}

function saveGlobalData() {
    localStorage.setItem(STORAGE_KEYS.DATA, JSON.stringify({
        accountList: accountsList,
        studentList: studentsList,
        assessorList: assessorsList
    }));
}

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
    const rowHeight = rows.length && rows[0].offsetHeight ? rows[0].offsetHeight : 45;
    const visibleRows = Math.min(rows.length, 5);
    const totalHeight = headerHeight + (rowHeight * visibleRows) + 2;

    container.style.maxHeight = `${totalHeight}px`;
}

function setAllTableHeights() {
    const tableContainers = ['studentsScrollableTable', 'accountsTableBody', 'assessorsTableBody', 'assignedStudentsTableBody']
        .map(id => {
            if (id === 'studentsScrollableTable') return document.getElementById(id);
            const el = document.getElementById(id);
            return el?.closest('.scrollable-table');
        })
        .filter(Boolean);

    tableContainers.forEach(container => {
        if (container.id) setTableHeight(container.id);
        else if (container) {
            if (!container.id) container.id = 'temp_' + Date.now();
            setTableHeight(container.id);
        }
    });
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
    const titleEl = document.getElementById('detailsTitle');
    const contentDiv = document.getElementById('detailsContent');
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
            ${renderContactSection(data)}
            ${renderInternshipSection(data)}
            ${renderAcademicSection(data)}
            ${renderStatusSection(statusIcon, data)}
        </div>
    `;

    if (currentRole === 'assessor' && extraAssessorId) {
        const currentAssessor = assessorsList.find(a => a.email === currentUser.email);
        if (currentAssessor && currentAssessor.id === extraAssessorId) {
            setupProgressNotes(data.id, currentAssessor.id);
        }
    }
}

function renderContactSection(data) {
    return `
        <div class="resume-section">
            <div class="resume-section-title"><ion-icon name="call-outline"></ion-icon> Contact Information</div>
            <div class="resume-grid">
                <div class="resume-field"><div class="resume-field-label">Email Address</div><div class="resume-field-value">${escapeHtml(data.email || '—')}</div></div>
                <div class="resume-field"><div class="resume-field-label">Phone Number</div><div class="resume-field-value">${escapeHtml(data.contact || '—')}</div></div>
            </div>
        </div>
    `;
}

function renderInternshipSection(data) {
    return `
        <div class="resume-section">
            <div class="resume-section-title"><ion-icon name="business-outline"></ion-icon> Internship Details</div>
            <div class="resume-grid">
                <div class="resume-field"><div class="resume-field-label">Host Company</div><div class="resume-field-value">${escapeHtml(data.company || '—')}</div></div>
                <div class="resume-field"><div class="resume-field-label">Internship Period</div><div class="resume-field-value">${escapeHtml(data.internshipPeriod || 'Not specified')}</div></div>
                <div class="resume-field"><div class="resume-field-label">Assigned Assessor</div><div class="resume-field-value">${escapeHtml(data.assigned_assessor || 'Not assigned')}</div></div>
            </div>
        </div>
    `;
}

function renderAcademicSection(data) {
    return `
        <div class="resume-section">
            <div class="resume-section-title"><ion-icon name="school-outline"></ion-icon> Academic Info</div>
            <div class="resume-grid">
                <div class="resume-field"><div class="resume-field-label">Enrolment Year</div><div class="resume-field-value">${escapeHtml(data.year || '—')}</div></div>
                <div class="resume-field"><div class="resume-field-label">Academic Programme</div><div class="resume-field-value">${escapeHtml(data.programme || '—')}</div></div>
            </div>
        </div>
    `;
}

function renderStatusSection(statusIcon, data) {
    return `
        <div class="resume-section">
            <div class="resume-section-title"><ion-icon name="clipboard-outline"></ion-icon> Evaluation Status</div>
            <div class="resume-grid">
                <div class="resume-field"><div class="resume-field-label">Current Status</div><div class="resume-field-value"><span class="resume-badge">${statusIcon} ${escapeHtml(data.status || 'Pending')}</span></div></div>
            </div>
        </div>
    `;
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
function checkLoginState() {
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
    if (!form) return;

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = document.getElementById('loginEmail').value.trim();
        const pwd = document.getElementById('loginPassword').value.trim();
        const matched = accountsList.find(acc => acc.email === email && acc.password === pwd);

        if (matched) {
            document.getElementById('loginPopup').classList.remove('active-popup');
            sessionStorage.setItem('loggedInUser', JSON.stringify({
                username: matched.username, email: matched.email, userRole: matched.userRole
            }));
            alert(`Logged in as ${matched.username}`);
            checkLoginState();
            form.reset();
        } else {
            alert('Invalid email or password');
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
        <div class="edit-field"><label>Password</label><input type="text" id="edit_password" value="${escapeHtml(account.password)}"></div>
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
    if (student.internshipPeriod) {
        const parts = student.internshipPeriod.split(' to ');
        if (parts.length === 2) {
            const [startParts, endParts] = [parts[0].split('/'), parts[1].split('/')];
            if (startParts.length === 3) startDate = `${startParts[2]}-${startParts[1]}-${startParts[0]}`;
            if (endParts.length === 3) endDate = `${endParts[2]}-${endParts[1]}-${endParts[0]}`;
        }
    }

    return `
        <div class="edit-field"><label>Student ID</label><input type="text" id="edit_student_id" value="${escapeHtml(student.id)}" ${student.id ? 'readonly' : ''}></div>
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
        <div class="edit-field"><label>Assigned Student IDs (comma separated)</label><input type="text" id="edit_assigned_students" value="${escapeHtml(studentIdsString)}" placeholder="S1001, S1002, S1003"></div>
    `;
}

function saveEdit() {
    if (currentEditType === 'account') updateAccountFromModal();
    else if (currentEditType === 'student') updateStudentFromModal();
    else if (currentEditType === 'assessor') updateAssessorFromModal();

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

function updateAccountFromModal() {
    const index = accountsList.findIndex(a => a.email === currentEditId);
    if (index === -1) return;

    const newRole = document.getElementById('edit_role').value;
    const oldRole = accountsList[index].userRole;

    accountsList[index] = {
        ...accountsList[index],
        username: document.getElementById('edit_username').value,
        email: document.getElementById('edit_email').value,
        password: document.getElementById('edit_password').value,
        userRole: newRole,
        contact: document.getElementById('edit_contact').value
    };

    // Handle assessor list updates
    if (oldRole === 'Assessor' && newRole !== 'Assessor') {
        const assessorIndex = assessorsList.findIndex(a => a.email === currentEditId);
        if (assessorIndex !== -1) assessorsList.splice(assessorIndex, 1);
    } else if (oldRole !== 'Assessor' && newRole === 'Assessor') {
        if (!assessorsList.find(a => a.email === accountsList[index].email)) {
            assessorsList.push({
                id: `A${String(assessorsList.length + 1).padStart(3, '0')}`,
                name: accountsList[index].username,
                role: 'Assessor',
                dept: '',
                email: accountsList[index].email,
                contact: accountsList[index].contact,
                assignedStudentIds: []
            });
        }
    } else if (oldRole === 'Assessor' && newRole === 'Assessor') {
        const assessorIndex = assessorsList.findIndex(a => a.email === currentEditId);
        if (assessorIndex !== -1) {
            assessorsList[assessorIndex] = {
                ...assessorsList[assessorIndex],
                name: accountsList[index].username,
                email: accountsList[index].email,
                contact: accountsList[index].contact
            };
        }
    }

    saveGlobalData();
}

function updateStudentFromModal() {
    const index = studentsList.findIndex(s => s.id === currentEditId);
    if (index === -1) return;

    const startDate = document.getElementById('edit_start_date').value;
    const endDate = document.getElementById('edit_end_date').value;
    const internshipPeriod = formatDateRange(startDate, endDate);

    const oldAssessorName = studentsList[index].assigned_assessor;
    const newAssessorName = document.getElementById('edit_assigned_assessor').value;

    // Update assessor assignments
    if (oldAssessorName !== newAssessorName) {
        if (oldAssessorName) {
            const oldAssessor = assessorsList.find(a => a.name === oldAssessorName);
            if (oldAssessor?.assignedStudentIds) {
                const idx = oldAssessor.assignedStudentIds.indexOf(studentsList[index].id);
                if (idx !== -1) oldAssessor.assignedStudentIds.splice(idx, 1);
            }
        }
        if (newAssessorName) {
            const newAssessor = assessorsList.find(a => a.name === newAssessorName);
            if (newAssessor) {
                if (!newAssessor.assignedStudentIds) newAssessor.assignedStudentIds = [];
                if (!newAssessor.assignedStudentIds.includes(studentsList[index].id)) {
                    newAssessor.assignedStudentIds.push(studentsList[index].id);
                }
            }
        }
    }

    studentsList[index] = {
        ...studentsList[index],
        id: document.getElementById('edit_student_id').value,
        name: document.getElementById('edit_student_name').value,
        programme: document.getElementById('edit_programme').value,
        company: document.getElementById('edit_company').value,
        year: document.getElementById('edit_year').value,
        email: document.getElementById('edit_student_email').value,
        contact: document.getElementById('edit_student_contact').value,
        internshipPeriod,
        status: document.getElementById('edit_status').value,
        assigned_assessor: newAssessorName
    };

    saveGlobalData();
}

function updateAssessorFromModal() {
    const index = assessorsList.findIndex(a => a.id === currentEditId);
    if (index === -1) return;

    const studentIdsInput = document.getElementById('edit_assigned_students').value;
    const studentIdsArray = studentIdsInput ? studentIdsInput.split(',').map(id => id.trim()) : [];
    const newAssessorName = document.getElementById('edit_assessor_name').value;
    const oldAssessor = assessorsList[index];

    // Update student assignments
    if (oldAssessor.assignedStudentIds) {
        oldAssessor.assignedStudentIds.forEach(oldStudentId => {
            if (!studentIdsArray.includes(oldStudentId)) {
                const student = studentsList.find(s => s.id === oldStudentId);
                if (student && student.assigned_assessor === oldAssessor.name) {
                    student.assigned_assessor = '';
                }
            }
        });
    }

    studentIdsArray.forEach(studentId => {
        const student = studentsList.find(s => s.id === studentId);
        if (student) student.assigned_assessor = newAssessorName;
    });

    assessorsList[index] = {
        ...assessorsList[index],
        name: newAssessorName,
        role: document.getElementById('edit_assessor_role').value,
        dept: document.getElementById('edit_assessor_dept').value,
        email: document.getElementById('edit_assessor_email').value,
        contact: document.getElementById('edit_assessor_contact').value,
        assignedStudentIds: studentIdsArray
    };

    saveGlobalData();
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

// ============================================
// DELETE FUNCTIONS
// ============================================
function deleteAccount(email) {
    if (!confirm('Are you sure you want to delete this account?')) return;

    const index = accountsList.findIndex(a => a.email === email);
    if (index !== -1) {
        if (accountsList[index].userRole === 'Assessor') {
            const assessorIndex = assessorsList.findIndex(a => a.email === email);
            if (assessorIndex !== -1) assessorsList.splice(assessorIndex, 1);
        }
        accountsList.splice(index, 1);
        saveGlobalData();
        refreshAdminTables();
        alert('Account deleted successfully!');
    }
}

function deleteStudent(studentId) {
    if (!confirm('Are you sure you want to delete this student?')) return;

    const index = studentsList.findIndex(s => s.id === studentId);
    if (index !== -1) {
        const deletedStudent = studentsList[index];
        if (deletedStudent.assigned_assessor) {
            const assessor = assessorsList.find(a => a.name === deletedStudent.assigned_assessor);
            if (assessor?.assignedStudentIds) {
                const idx = assessor.assignedStudentIds.indexOf(studentId);
                if (idx !== -1) assessor.assignedStudentIds.splice(idx, 1);
            }
        }
        studentsList.splice(index, 1);
        saveGlobalData();
        refreshAdminTables();
        alert('Student deleted successfully!');
    }
}

function deleteAssessor(assessorId) {
    if (!confirm('Are you sure you want to delete this assessor?')) return;

    const index = assessorsList.findIndex(a => a.id === assessorId);
    if (index !== -1) {
        const deletedAssessor = assessorsList[index];
        studentsList.forEach(student => {
            if (student.assigned_assessor === deletedAssessor.name) {
                student.assigned_assessor = '';
            }
        });
        assessorsList.splice(index, 1);
        saveGlobalData();
        refreshAdminTables();
        alert('Assessor deleted successfully!');
    }
}

function refreshAdminTables() {
    renderAdminStudents();
    renderAdminAssessors();
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
// STORAGE SYNC
// ============================================
window.addEventListener('storage', (e) => {
    if (e.key === STORAGE_KEYS.DATA) {
        loadGlobalData();
        if (currentRole === 'administrator') {
            renderAdminAccounts();
            renderAdminStudents();
            renderAdminAssessors();
        } else if (currentRole === 'assessor') {
            renderAssignedStudents();
        }
    }
    if (e.key === STORAGE_KEYS.NOTES) loadNotes();
});

// ============================================
// INITIALIZATION
// ============================================
function init() {
    loadGlobalData();
    loadNotes();
    setupLogin();
    setupEditModalEvents();
    initUI();
    checkLoginState();
    setTimeout(() => observeTableHeightChanges(), 100);
}

init();

