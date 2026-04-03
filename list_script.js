let accountsList = [], studentsList = [], assessorsList = [];
let currentUser = null, currentRole = null;
let selectedItem = { type: null, id: null, data: null };
let studentProgressNotes = {};

function setTableHeight(tableId) {
    const container = document.getElementById(tableId);
    if (!container) return;

    // Get the actual table element inside
    const table = container.querySelector('table');
    if (!table) return;

    const thead = table.querySelector('thead');
    const tbody = table.querySelector('tbody');
    if (!thead) return;

    // Get header height
    const headerHeight = thead.offsetHeight;

    // Get row height from first row (or use default)
    const rows = tbody ? Array.from(tbody.querySelectorAll('tr')) : [];
    let rowHeight = 45; // default fallback

    if (rows.length > 0 && rows[0].offsetHeight > 0) {
        rowHeight = rows[0].offsetHeight;
    }

    // Calculate height for 5 rows + header
    const targetRows = 5;
    const visibleRows = Math.min(rows.length, targetRows);
    const totalHeight = headerHeight + (rowHeight * visibleRows) + 2; // +2 for border

    container.style.maxHeight = `${totalHeight}px`;
}

function setAllTableHeights() {
    const tables = ['studentsScrollableTable', 'assessorsTableBody', 'accountsTableBody', 'assignedStudentsTableBody'];
    tables.forEach(tableId => {
        // Handle different ID patterns
        if (tableId === 'studentsScrollableTable') {
            setTableHeight(tableId);
        } else {
            const container = document.getElementById(tableId)?.closest('.scrollable-table');
            if (container && container.id) {
                setTableHeight(container.id);
            } else if (container) {
                // Generate an ID if needed
                if (!container.id) container.id = 'temp_' + tableId;
                setTableHeight(container.id);
            }
        }
    });
}

function observeTableHeightChanges() {
    const tables = document.querySelectorAll('.scrollable-table');
    tables.forEach(table => {
        const observer = new MutationObserver(() => {
            if (table.id) setTableHeight(table.id);
        });
        observer.observe(table, { childList: true, subtree: true, attributes: true });
    });
}
// Helper: load data from localStorage
function loadGlobalData() {
    const saved = localStorage.getItem('internshipEvalData');
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

function loadNotes() {
    const saved = localStorage.getItem('studentProgressNotes');
    if (saved) {
        try { studentProgressNotes = JSON.parse(saved); } catch (e) { }
    }
}

function saveNotes() {
    localStorage.setItem('studentProgressNotes', JSON.stringify(studentProgressNotes));
}

// Escape HTML
function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, function (m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

// Render Admin Tables with Search & Filter
function renderAdminAccounts() {
    const searchTerm = document.getElementById('searchAccounts')?.value.toLowerCase() || '';
    let filtered = accountsList.filter(acc =>
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

    // Update table height
    const container = document.getElementById('accountsTableBody')?.closest('.scrollable-table');
    if (container && container.id) setTimeout(() => setTableHeight(container.id), 50);
}

function renderAdminStudents() {
    const searchTerm = document.getElementById('searchStudents')?.value.toLowerCase() || '';
    const statusFilter = document.getElementById('filterStudentStatus')?.value || '';
    const assessorFilter = document.getElementById('filterStudentAssessor')?.value || '';
    const programmeFilter = document.getElementById('filterStudentProgramme')?.value || '';

    let filtered = studentsList.filter(s => {
        const matchesSearch = s.name.toLowerCase().includes(searchTerm) || s.id.toLowerCase().includes(searchTerm);
        const matchesStatus = statusFilter === '' || s.status === statusFilter;
        const matchesAssessor = assessorFilter === '' || s.assigned_assessor === assessorFilter;
        const matchesProgramme = programmeFilter === '' || (s.programme && s.programme.toLowerCase().includes(programmeFilter.toLowerCase()));
        return matchesSearch && matchesStatus && matchesAssessor && matchesProgramme;
    });

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
    let filtered = assessorsList.filter(a =>
        a.name.toLowerCase().includes(searchTerm) || a.id.toLowerCase().includes(searchTerm)
    );
    const tbody = document.getElementById('assessorsTableBody');
    if (!tbody) return;
    tbody.innerHTML = filtered.map(a => {
        const studentCount = (a.assignedStudentIds || []).length;
        return `
        <tr data-type="assessor" data-id="${escapeHtml(a.id)}">
            <td>${escapeHtml(a.id)}</td>
            <td>${escapeHtml(a.name)}</td>
            <td>${escapeHtml(a.dept || '—')}</td>
            <td>${escapeHtml(a.email)}</td>
            <td>${studentCount} assigned</td>
            <td class="action-cell">
                <button class="edit-row-btn" data-type="assessor" data-id="${escapeHtml(a.id)}">Edit</button>
                <button class="delete-row-btn" data-type="assessor" data-id="${escapeHtml(a.id)}">Delete</button>
            </td>
        </tr>
    `}).join('');

    // Update table height
    const container = document.getElementById('assessorsTableBody')?.closest('.scrollable-table');
    if (container && container.id) setTimeout(() => setTableHeight(container.id), 50);
}

// Render Assessor View (assigned students only)
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

    // Update table height
    const container = document.getElementById('assignedStudentsTableBody')?.closest('.scrollable-table');
    if (container && container.id) setTimeout(() => setTableHeight(container.id), 50);
}

function populateFilterDropdowns() {
    // Populate assessor filter
    const assessorSelect = document.getElementById('filterStudentAssessor');
    if (assessorSelect) {
        const uniqueAssessors = [...new Set(studentsList.map(s => s.assigned_assessor).filter(a => a && a !== '—'))];
        assessorSelect.innerHTML = '<option value="">All Assessors</option>' +
            uniqueAssessors.map(a => `<option value="${escapeHtml(a)}">${escapeHtml(a)}</option>`).join('');
    }

    // Populate programme filter
    const programmeSelect = document.getElementById('filterStudentProgramme');
    if (programmeSelect) {
        const uniqueProgrammes = [...new Set(studentsList.map(s => s.programme).filter(p => p && p !== '—'))];
        programmeSelect.innerHTML = '<option value="">All Programmes</option>' +
            uniqueProgrammes.map(p => `<option value="${escapeHtml(p)}">${escapeHtml(p)}</option>`).join('');
    }

    const assignedProgrammeSelect = document.getElementById('filterAssignedProgramme');
    if (assignedProgrammeSelect) {
        const uniqueProgrammes = [...new Set(studentsList.map(s => s.programme).filter(p => p && p !== '—'))];
        assignedProgrammeSelect.innerHTML = '<option value="">All Programmes</option>' +
            uniqueProgrammes.map(p => `<option value="${escapeHtml(p)}">${escapeHtml(p)}</option>`).join('');
    }
}

// Show details panel based on selected row
function showDetails(type, id, extraAssessorId = null) {
    let data = null;
    if (type === 'student') {
        data = studentsList.find(s => s.id === id);
    } else if (type === 'assessor') {
        data = assessorsList.find(a => a.id === id);
    } else if (type === 'account') {
        data = accountsList.find(a => a.email === id);
    }
    if (!data) return;
    selectedItem = { type, id, data, assessorId: extraAssessorId };

    const panel = document.getElementById('detailsPanel');
    const titleEl = document.getElementById('detailsTitle');
    const contentDiv = document.getElementById('detailsContent');
    const notesSection = document.getElementById('progressNotesSection');
    const noteTextarea = document.getElementById('studentProgressNote');
    const saveNoteBtn = document.getElementById('saveNoteBtn');

    notesSection.style.display = 'none';

    if (type === 'student') {
        titleEl.innerText = `Student Profile`;

        const statusIcon = data.status === 'Evaluated' ? '✅' : (data.status === 'Ongoing' ? '🔄' : '⏳');

        contentDiv.innerHTML = `
            <div class="resume-template">
                <div class="resume-header">
                    <div class="resume-avatar">
                        <ion-icon name="person-circle-outline" style="font-size: 64px;"></ion-icon>
                    </div>
                    <h2>${escapeHtml(data.name)}</h2>
                    <div class="resume-title">ID: ${escapeHtml(data.id)}</div>
                </div>
                
                <div class="resume-section">
                    <div class="resume-section-title">
                        <ion-icon name="call-outline"></ion-icon> Contact Information
                    </div>
                    <div class="resume-grid">
                        <div class="resume-field">
                            <div class="resume-field-label">Email Address</div>
                            <div class="resume-field-value">${escapeHtml(data.email || '—')}</div>
                        </div>
                        <div class="resume-field">
                            <div class="resume-field-label">Phone Number</div>
                            <div class="resume-field-value">${escapeHtml(data.contact || '—')}</div>
                        </div>
                    </div>
                </div>
                
                <div class="resume-section">
                    <div class="resume-section-title">
                        <ion-icon name="business-outline"></ion-icon> Internship Details
                    </div>
                    <div class="resume-grid">
                        <div class="resume-field">
                            <div class="resume-field-label">Host Company</div>
                            <div class="resume-field-value">${escapeHtml(data.company || '—')}</div>
                        </div>
                        <div class="resume-field">
                            <div class="resume-field-label">Internship Period</div>
                            <div class="resume-field-value">${escapeHtml(data.internshipPeriod || 'Not specified')}</div>
                        </div>
                        <div class="resume-field">
                            <div class="resume-field-label">Assigned Assessor</div>
                            <div class="resume-field-value">${escapeHtml(data.assigned_assessor || 'Not assigned')}</div>
                        </div>
                    </div>
                </div>

                <div class="resume-section">
                    <div class="resume-section-title">
                        <ion-icon name="school-outline"></ion-icon> Academic Info
                    </div>
                    <div class="resume-grid">
                         <div class="resume-field">
                            <div class="resume-field-label">Enrolment Year</div>
                            <div class="resume-field-value">${escapeHtml(data.year || '—')}</div>
                        </div>
                        <div class="resume-field">
                            <div class="resume-field-label">Academic Programme</div>
                            <div class="resume-field-value">${escapeHtml(data.programme || '—')}</div>
                        </div>
                    </div>
                </div>
                
                <div class="resume-section">
                    <div class="resume-section-title">
                        <ion-icon name="clipboard-outline"></ion-icon> Evaluation Status
                    </div>
                    <div class="resume-grid">
                        <div class="resume-field">
                            <div class="resume-field-label">Current Status</div>
                            <div class="resume-field-value">
                                <span class="resume-badge">${statusIcon} ${escapeHtml(data.status || 'Pending')}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        if (currentRole === 'assessor' && extraAssessorId) {
            const currentAssessor = assessorsList.find(a => a.email === currentUser.email);
            if (currentAssessor && currentAssessor.id === extraAssessorId) {
                notesSection.style.display = 'block';
                const noteKey = `${data.id}_${currentAssessor.id}`;
                noteTextarea.value = studentProgressNotes[noteKey] || '';
                saveNoteBtn.onclick = () => {
                    studentProgressNotes[noteKey] = noteTextarea.value;
                    saveNotes();
                    alert('Progress notes saved successfully!');
                };
            }
        }
    }
    else if (type === 'assessor') {
        titleEl.innerText = `Assessor Profile`;

        const assignedStudentNames = (data.assignedStudentIds || []).map(sid => {
            const stu = studentsList.find(s => s.id === sid);
            return stu ? `<span class="assigned-student-chip">${escapeHtml(stu.name)} (${stu.id})</span>` : sid;
        }).join('');

        contentDiv.innerHTML = `
            <div class="resume-template">
                <div class="resume-header">
                    <div class="resume-avatar">
                        <ion-icon name="people-circle-outline" style="font-size: 64px;"></ion-icon>
                    </div>
                    <h2>${escapeHtml(data.name)}</h2>
                    <div class="resume-title">ID: ${escapeHtml(data.id || 'Assessor')}</div>
                </div>
                
                <div class="resume-section">
                    <div class="resume-section-title">
                        <ion-icon name="call-outline"></ion-icon> Contact Information
                    </div>
                    <div class="resume-grid">
                        <div class="resume-field">
                            <div class="resume-field-label">Email Address</div>
                            <div class="resume-field-value">${escapeHtml(data.email)}</div>
                        </div>
                        <div class="resume-field">
                            <div class="resume-field-label">Phone Number</div>
                            <div class="resume-field-value">${escapeHtml(data.contact || '—')}</div>
                        </div>
                    </div>
                </div>

                <div class="resume-section">
                    <div class="resume-section-title">
                        <ion-icon name="book-outline"></ion-icon> Assessor Info
                    </div>  
                    <div class="resume-grid">
                        <div class="resume-field">
                            <div class="resume-field-label">Assessor Role</div>
                            <div class="resume-field-value">${escapeHtml(data.role)}</div>
                        </div>
                        <div class="resume-field">
                            <div class="resume-field-label">Department</div>
                            <div class="resume-field-value">${escapeHtml(data.dept || '—')}</div>
                        </div>
                    </div>
                </div>
                
                <div class="resume-section">
                    <div class="resume-section-title">
                        <ion-icon name="school-outline"></ion-icon> Assigned Students
                    </div>
                    <div class="resume-field">
                        <div class="resume-field-label">Students Under Supervision (${(data.assignedStudentIds || []).length})</div>
                        <div class="assigned-students-list">
                            ${assignedStudentNames || '<span style="color: #888;">No students assigned yet</span>'}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
    else if (type === 'account') {
        titleEl.innerText = `Account Information`;
        contentDiv.innerHTML = `
            <div class="resume-template">
                <div class="resume-header">
                    <div class="resume-avatar">
                        <ion-icon name="key-outline" style="font-size: 64px;"></ion-icon>
                    </div>
                    <h2>${escapeHtml(data.username)}</h2>
                    <div class="resume-title">${escapeHtml(data.userRole)} Account</div>
                </div>
                
                <div class="resume-section">
                    <div class="resume-section-title">
                        <ion-icon name="mail-outline"></ion-icon> Account Details
                    </div>
                    <div class="resume-grid">
                        <div class="resume-field">
                            <div class="resume-field-label">Email Address</div>
                            <div class="resume-field-value">${escapeHtml(data.email)}</div>
                        </div>
                        <div class="resume-field">
                            <div class="resume-field-label">Password</div>
                            <div class="resume-field-value">${escapeHtml(data.password)}</div>
                        </div>
                        <div class="resume-field">
                            <div class="resume-field-label">Contact Number</div>
                            <div class="resume-field-value">${escapeHtml(data.contact || '—')}</div>
                        </div>
                        <div class="resume-field">
                            <div class="resume-field-label">User Role</div>
                            <div class="resume-field-value"><span class="resume-badge">${escapeHtml(data.userRole)}</span></div>
                        </div>
                        <div class="resume-field">
                            <div class="resume-field-label">Account Created</div>
                            <div class="resume-field-value">${escapeHtml(data.createdAt || '—')}</div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    panel.style.display = 'block';
    panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// Clear row selections
function clearAllSelections() {
    document.querySelectorAll('.scrollable-table tbody tr').forEach(row => {
        row.classList.remove('selected-row');
    });
}

// Setup row click delegation
function setupRowDelegation() {
    // Admin tables
    const tables = ['accountsTableBody', 'studentsTableBody', 'assessorsTableBody', 'assignedStudentsTableBody'];
    tables.forEach(tbodyId => {
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

// Login & Role management
function checkLoginState() {
    const logged = sessionStorage.getItem('loggedInUser');
    if (!logged) {
        document.getElementById('adminView').style.display = 'none';
        document.getElementById('assessorView').style.display = 'none';
        document.getElementById('accessDenied').style.display = 'flex';
        document.getElementById('detailsPanel').style.display = 'none';
        return false;
    }
    try {
        const user = JSON.parse(logged);
        currentUser = user;
        currentRole = user.userRole.toLowerCase();
        document.getElementById('usernameDisplay').innerText = user.username;
        document.getElementById('userRoleDisplay').innerText = user.userRole;
        document.getElementById('userInfo').style.display = 'flex';
        const loginBtn = document.getElementById('loginBtn');
        if (loginBtn) {
            loginBtn.innerText = 'LOGOUT';
            loginBtn.classList.add('logout-state');
        }
        document.getElementById('accessDenied').style.display = 'none';

        if (currentRole === 'administrator') {
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
        else if (currentRole === 'assessor') {
            document.getElementById('adminView').style.display = 'none';
            document.getElementById('assessorView').style.display = 'block';
            renderAssignedStudents();
            populateFilterDropdowns();
            attachAssessorFilterEvents();
        }
        else {
            throw new Error('Invalid role');
        }
        setupRowDelegation();
        return true;
    } catch (e) {
        document.getElementById('adminView').style.display = 'none';
        document.getElementById('assessorView').style.display = 'none';
        document.getElementById('accessDenied').style.display = 'flex';
        return false;
    }
}

function attachFilterEvents() {
    const searchAcc = document.getElementById('searchAccounts');
    const searchStu = document.getElementById('searchStudents');
    const filterStatus = document.getElementById('filterStudentStatus');
    const filterAssessor = document.getElementById('filterStudentAssessor');
    const filterProgramme = document.getElementById('filterStudentProgramme');
    const searchAss = document.getElementById('searchAssessors');

    if (searchAcc) searchAcc.addEventListener('input', () => renderAdminAccounts());
    if (searchStu) searchStu.addEventListener('input', () => renderAdminStudents());
    if (filterStatus) filterStatus.addEventListener('change', () => renderAdminStudents());
    if (filterAssessor) filterAssessor.addEventListener('change', () => renderAdminStudents());
    if (filterProgramme) filterProgramme.addEventListener('change', () => renderAdminStudents());
    if (searchAss) searchAss.addEventListener('input', () => renderAdminAssessors());
}

function attachAssessorFilterEvents() {
    const search = document.getElementById('searchAssignedStudents');
    const filter = document.getElementById('filterAssignedStatus');
    const filterProgramme = document.getElementById('filterAssignedProgramme');
    if (search) search.addEventListener('input', () => renderAssignedStudents());
    if (filter) filter.addEventListener('change', () => renderAssignedStudents());
    if (filterProgramme) filterProgramme.addEventListener('change', () => renderAssignedStudents());
}

// Logout
function logout() {
    sessionStorage.removeItem('loggedInUser');
    document.getElementById('userInfo').style.display = 'none';
    const btn = document.getElementById('loginBtn');
    if (btn) {
        btn.innerText = 'LOGIN';
        btn.classList.remove('logout-state');
    }
    document.getElementById('adminView').style.display = 'none';
    document.getElementById('assessorView').style.display = 'none';
    document.getElementById('accessDenied').style.display = 'flex';
    document.getElementById('detailsPanel').style.display = 'none';
    currentUser = null;
    alert('Logged out successfully');
}

// Login Form
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
// EDIT MODAL FUNCTIONS
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

    if (type === 'account') {
        const account = accountsList.find(a => a.email === id);
        if (account) {
            modalTitle.textContent = `Edit Account: ${account.username}`;
            formHtml = generateAccountEditForm(account);
        }
    } else if (type === 'student') {
        const student = studentsList.find(s => s.id === id);
        if (student) {
            modalTitle.textContent = `Edit Student: ${student.name}`;
            formHtml = generateStudentEditForm(student);
        }
    } else if (type === 'assessor') {
        const assessor = assessorsList.find(a => a.id === id);
        if (assessor) {
            modalTitle.textContent = `Edit Assessor: ${assessor.name}`;
            formHtml = generateAssessorEditForm(assessor);
        }
    }

    modalBody.innerHTML = formHtml;
    modal.style.display = 'flex';
}

function generateAccountEditForm(account) {
    return `
        <div class="edit-field">
            <label>Username</label>
            <input type="text" id="edit_username" value="${escapeHtml(account.username)}">
        </div>
        <div class="edit-field">
            <label>Email</label>
            <input type="email" id="edit_email" value="${escapeHtml(account.email)}">
        </div>
        <div class="edit-field">
            <label>Password</label>
            <input type="text" id="edit_password" value="${escapeHtml(account.password)}">
        </div>
        <div class="edit-field">
            <label>User Role</label>
            <select id="edit_role">
                <option value="Administrator" ${account.userRole === 'Administrator' ? 'selected' : ''}>Administrator</option>
                <option value="Assessor" ${account.userRole === 'Assessor' ? 'selected' : ''}>Assessor</option>
            </select>
        </div>
        <div class="edit-field">
            <label>Contact Number</label>
            <input type="text" id="edit_contact" value="${escapeHtml(account.contact || '')}">
        </div>
    `;
}

function generateStudentEditForm(student) {
    // Get assessor options for dropdown
    const assessorOptions = ['', ...assessorsList.map(a => a.name)];
    const statusOptions = ['Pending', 'Ongoing', 'Evaluated'];

    // Parse internship period for date inputs
    let startDate = '';
    let endDate = '';
    if (student.internshipPeriod) {
        const parts = student.internshipPeriod.split(' to ');
        if (parts.length === 2) {
            const startParts = parts[0].split('/');
            const endParts = parts[1].split('/');
            if (startParts.length === 3) {
                startDate = `${startParts[2]}-${startParts[1]}-${startParts[0]}`;
            }
            if (endParts.length === 3) {
                endDate = `${endParts[2]}-${endParts[1]}-${endParts[0]}`;
            }
        }
    }

    return `
        <div class="edit-field">
            <label>Student ID</label>
            <input type="text" id="edit_student_id" value="${escapeHtml(student.id)}" ${student.id ? 'readonly' : ''}>
        </div>
        <div class="edit-field">
            <label>Student Name</label>
            <input type="text" id="edit_student_name" value="${escapeHtml(student.name)}">
        </div>
        <div class="edit-field">
            <label>Programme</label>
            <input type="text" id="edit_programme" value="${escapeHtml(student.programme || '')}">
        </div>
        <div class="edit-field">
            <label>Internship Company</label>
            <input type="text" id="edit_company" value="${escapeHtml(student.company || '')}">
        </div>
        <div class="edit-field">
            <label>Enrolment Year</label>
            <input type="text" id="edit_year" value="${escapeHtml(student.year || '')}">
        </div>
        <div class="edit-field">
            <label>Email</label>
            <input type="email" id="edit_student_email" value="${escapeHtml(student.email || '')}">
        </div>
        <div class="edit-field">
            <label>Contact Number</label>
            <input type="text" id="edit_student_contact" value="${escapeHtml(student.contact || '')}">
        </div>
        <div class="edit-field">
            <label>Internship Start Date</label>
            <input type="date" id="edit_start_date" value="${startDate}">
        </div>
        <div class="edit-field">
            <label>Internship End Date</label>
            <input type="date" id="edit_end_date" value="${endDate}">
        </div>
        <div class="edit-field">
            <label>Status</label>
            <select id="edit_status">
                ${statusOptions.map(opt => `<option value="${opt}" ${student.status === opt ? 'selected' : ''}>${opt}</option>`).join('')}
            </select>
        </div>
        <div class="edit-field">
            <label>Assigned Assessor</label>
            <select id="edit_assigned_assessor">
                ${assessorOptions.map(name => `<option value="${name}" ${student.assigned_assessor === name ? 'selected' : ''}>${name || '—'}</option>`).join('')}
            </select>
        </div>
    `;
}

function generateAssessorEditForm(assessor) {
    const assignedStudentIds = assessor.assignedStudentIds || [];
    const studentIdsString = assignedStudentIds.join(', ');

    return `
        <div class="edit-field">
            <label>Assessor ID</label>
            <input type="text" id="edit_assessor_id" value="${escapeHtml(assessor.id)}" readonly>
        </div>
        <div class="edit-field">
            <label>Assessor Name</label>
            <input type="text" id="edit_assessor_name" value="${escapeHtml(assessor.name)}">
        </div>
        <div class="edit-field">
            <label>Role</label>
            <input type="text" id="edit_assessor_role" value="${escapeHtml(assessor.role || '')}">
        </div>
        <div class="edit-field">
            <label>Department</label>
            <input type="text" id="edit_assessor_dept" value="${escapeHtml(assessor.dept || '')}">
        </div>
        <div class="edit-field">
            <label>Email</label>
            <input type="email" id="edit_assessor_email" value="${escapeHtml(assessor.email)}">
        </div>
        <div class="edit-field">
            <label>Contact Number</label>
            <input type="text" id="edit_assessor_contact" value="${escapeHtml(assessor.contact || '')}">
        </div>
        <div class="edit-field">
            <label>Assigned Student IDs (comma separated)</label>
            <input type="text" id="edit_assigned_students" value="${escapeHtml(studentIdsString)}" placeholder="S1001, S1002, S1003">
        </div>
    `;
}

function saveEdit() {
    if (currentEditType === 'account') {
        updateAccountFromModal();
    } else if (currentEditType === 'student') {
        updateStudentFromModal();
    } else if (currentEditType === 'assessor') {
        updateAssessorFromModal();
    }

    // Close modal
    document.getElementById('editModal').style.display = 'none';

    // Refresh all views
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

    // Update assessor list if role changed
    if (oldRole === 'Assessor' && newRole !== 'Assessor') {
        // Remove from assessorsList
        const assessorIndex = assessorsList.findIndex(a => a.email === currentEditId);
        if (assessorIndex !== -1) {
            assessorsList.splice(assessorIndex, 1);
        }
    } else if (oldRole !== 'Assessor' && newRole === 'Assessor') {
        // Add to assessorsList
        const existingAssessor = assessorsList.find(a => a.email === accountsList[index].email);
        if (!existingAssessor) {
            const nextIdNum = assessorsList.length + 1;
            const assessorId = `A${String(nextIdNum).padStart(3, '0')}`;
            assessorsList.push({
                id: assessorId,
                name: accountsList[index].username,
                role: 'Assessor',
                dept: '',
                email: accountsList[index].email,
                contact: accountsList[index].contact,
                assignedStudentIds: []
            });
        }
    } else if (oldRole === 'Assessor' && newRole === 'Assessor') {
        // Update existing assessor info
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
    let internshipPeriod = '';

    if (startDate && endDate) {
        const formattedStart = new Date(startDate).toLocaleDateString('en-GB');
        const formattedEnd = new Date(endDate).toLocaleDateString('en-GB');
        internshipPeriod = `${formattedStart} to ${formattedEnd}`;
    } else if (startDate) {
        const formattedStart = new Date(startDate).toLocaleDateString('en-GB');
        internshipPeriod = `${formattedStart} onwards`;
    } else if (endDate) {
        const formattedEnd = new Date(endDate).toLocaleDateString('en-GB');
        internshipPeriod = `Until ${formattedEnd}`;
    }

    const oldAssessorName = studentsList[index].assigned_assessor;
    const newAssessorName = document.getElementById('edit_assigned_assessor').value;

    // Update assessor assignments
    if (oldAssessorName !== newAssessorName) {
        // Remove from old assessor
        if (oldAssessorName) {
            const oldAssessor = assessorsList.find(a => a.name === oldAssessorName);
            if (oldAssessor && oldAssessor.assignedStudentIds) {
                const studentIdIndex = oldAssessor.assignedStudentIds.indexOf(studentsList[index].id);
                if (studentIdIndex !== -1) {
                    oldAssessor.assignedStudentIds.splice(studentIdIndex, 1);
                }
            }
        }

        // Add to new assessor
        if (newAssessorName) {
            const newAssessor = assessorsList.find(a => a.name === newAssessorName);
            if (newAssessor) {
                if (!newAssessor.assignedStudentIds) {
                    newAssessor.assignedStudentIds = [];
                }
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
        internshipPeriod: internshipPeriod,
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
        for (const oldStudentId of oldAssessor.assignedStudentIds) {
            if (!studentIdsArray.includes(oldStudentId)) {
                const student = studentsList.find(s => s.id === oldStudentId);
                if (student && student.assigned_assessor === oldAssessor.name) {
                    student.assigned_assessor = '';
                }
            }
        }
    }

    for (const studentId of studentIdsArray) {
        const student = studentsList.find(s => s.id === studentId);
        if (student) {
            student.assigned_assessor = newAssessorName;
        }
    }

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
    const type = this.getAttribute('data-type');
    const id = this.getAttribute('data-id');
    openEditModal(type, id);
}

function setupEditModalEvents() {
    const modal = document.getElementById('editModal');
    const closeBtn = document.querySelector('.close-modal-btn');
    const cancelBtn = document.getElementById('cancelEditBtn');
    const saveBtn = document.getElementById('saveEditBtn');

    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            modal.style.display = 'none';
        });
    }

    if (cancelBtn) {
        cancelBtn.addEventListener('click', () => {
            modal.style.display = 'none';
        });
    }

    if (saveBtn) {
        saveBtn.addEventListener('click', saveEdit);
    }

    // Close modal when clicking outside
    window.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.style.display = 'none';
        }
    });
}

function saveGlobalData() {
    localStorage.setItem('internshipEvalData', JSON.stringify({
        accountList: accountsList,
        studentList: studentsList,
        assessorList: assessorsList
    }));
}

function deleteAccount(email) {
    if (confirm('Are you sure you want to delete this account?')) {
        const index = accountsList.findIndex(a => a.email === email);
        if (index !== -1) {
            const deletedAccount = accountsList[index];

            // If account is an assessor, remove from assessorsList
            if (deletedAccount.userRole === 'Assessor') {
                const assessorIndex = assessorsList.findIndex(a => a.email === email);
                if (assessorIndex !== -1) {
                    assessorsList.splice(assessorIndex, 1);
                }
            }

            accountsList.splice(index, 1);
            saveGlobalData();

            // Refresh tables
            renderAdminAccounts();
            renderAdminStudents();
            renderAdminAssessors();
            attachEditButtonListeners();
            attachDeleteButtonListeners();

            alert('Account deleted successfully!');
        }
    }
}

function deleteStudent(studentId) {
    if (confirm('Are you sure you want to delete this student?')) {
        const index = studentsList.findIndex(s => s.id === studentId);
        if (index !== -1) {
            const deletedStudent = studentsList[index];

            // Remove student from assessor's assigned list
            if (deletedStudent.assigned_assessor) {
                const assessor = assessorsList.find(a => a.name === deletedStudent.assigned_assessor);
                if (assessor && assessor.assignedStudentIds) {
                    const studentIndex = assessor.assignedStudentIds.indexOf(studentId);
                    if (studentIndex !== -1) {
                        assessor.assignedStudentIds.splice(studentIndex, 1);
                    }
                }
            }

            studentsList.splice(index, 1);
            saveGlobalData();

            // Refresh tables
            renderAdminStudents();
            renderAdminAssessors();
            attachEditButtonListeners();
            attachDeleteButtonListeners();

            alert('Student deleted successfully!');
        }
    }
}

function deleteAssessor(assessorId) {
    if (confirm('Are you sure you want to delete this assessor?')) {
        const index = assessorsList.findIndex(a => a.id === assessorId);
        if (index !== -1) {
            const deletedAssessor = assessorsList[index];

            // Remove assessor from all students
            studentsList.forEach(student => {
                if (student.assigned_assessor === deletedAssessor.name) {
                    student.assigned_assessor = '';
                }
            });

            assessorsList.splice(index, 1);
            saveGlobalData();

            // Refresh tables
            renderAdminStudents();
            renderAdminAssessors();
            attachEditButtonListeners();
            attachDeleteButtonListeners();

            alert('Assessor deleted successfully!');
        }
    }
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

    if (type === 'account') {
        deleteAccount(id);
    } else if (type === 'student') {
        deleteStudent(id);
    } else if (type === 'assessor') {
        deleteAssessor(id);
    }
}

// UI event handlers
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
    // Close on outside click? simple
    window.addEventListener('click', (e) => {
        if (e.target === wrapper) wrapper.classList.remove('active-popup');
    });
}

// Storage sync
window.addEventListener('storage', (e) => {
    if (e.key === 'internshipEvalData') {
        loadGlobalData();
        if (currentRole === 'administrator') {
            renderAdminAccounts(); renderAdminStudents(); renderAdminAssessors();
        } else if (currentRole === 'assessor') renderAssignedStudents();
    }
    if (e.key === 'studentProgressNotes') loadNotes();
});

// Initialize
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

