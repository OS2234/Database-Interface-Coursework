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

// Get global references safely
const globalSmartSearch = (typeof smartSearch !== 'undefined') ? smartSearch : (window.smartSearch || null);
const globalCsvExporter = (typeof csvExporter !== 'undefined') ? csvExporter : (window.csvExporter || null);
const globalCreateExportButton = (typeof createExportButton !== 'undefined') ? createExportButton : (window.createExportButton || null);

// ============================================
// SMART SEARCH INTEGRATION
// ============================================

// Enhanced render with smart search
function renderAdminAccountsWithSmartSearch() {
    const searchTerm = document.getElementById('searchAccounts')?.value || '';
    const searchFields = ['username', 'email', 'userRole', 'contact'];

    // Use globalSmartSearch if available
    const searcher = globalSmartSearch;

    let filtered = accountsList;
    if (searchTerm && searcher) {
        filtered = searcher.search(accountsList, searchTerm, searchFields);
    }

    const tbody = document.getElementById('accountsTableBody');
    if (!tbody) return;

    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color: #888;">No accounts found matching "${escapeHtml(searchTerm)}"</td></tr>`;
        return;
    }

    tbody.innerHTML = filtered.map(acc => `
        <tr data-type="account" data-id="${escapeHtml(acc.email)}">
            <td>${searcher ? searcher.highlightMatch(acc.username, searchTerm) : escapeHtml(acc.username)}</td>
            <td>${searcher ? searcher.highlightMatch(acc.email, searchTerm) : escapeHtml(acc.email)}</td>
            <td>${searcher ? searcher.highlightMatch(acc.userRole, searchTerm) : escapeHtml(acc.userRole)}</td>
            <td>${searcher ? searcher.highlightMatch(acc.contact || '—', searchTerm) : escapeHtml(acc.contact || '—')}</td>
            <td>${escapeHtml(acc.createdAt || '—')}</td>
            <td class="action-cell">
                <button class="edit-row-btn" data-type="account" data-id="${escapeHtml(acc.email)}">Edit</button>
                <button class="delete-row-btn" data-type="account" data-id="${escapeHtml(acc.email)}">Delete</button>
            </td>
        </tr>
    `).join('');

    setTimeout(() => setTableHeight('accountsScrollableTable'), 50);
}

function renderAdminStudentsWithSmartSearch() {
    const searchTerm = document.getElementById('searchStudents')?.value || '';
    const statusFilter = document.getElementById('filterStudentStatus')?.value || '';
    const assessorFilter = document.getElementById('filterStudentAssessor')?.value || '';
    const programmeFilter = document.getElementById('filterStudentProgramme')?.value || '';

    const searchFields = ['name', 'id', 'email', 'company', 'programme'];

    // Use globalSmartSearch if available
    const searcher = globalSmartSearch;

    let filtered = studentsList;

    // Apply smart search
    if (searchTerm && searcher) {
        filtered = searcher.search(filtered, searchTerm, searchFields);
    }

    // Apply filters
    filtered = filtered.filter(s => {
        if (statusFilter && s.status !== statusFilter) return false;
        if (assessorFilter && s.assigned_assessor !== assessorFilter) return false;
        if (programmeFilter && s.programme !== programmeFilter) return false;
        return true;
    });

    const tbody = document.getElementById('studentsTableBody');
    if (!tbody) return;

    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color: #888;">No students found matching "${escapeHtml(searchTerm)}"</td></tr>`;
        return;
    }

    tbody.innerHTML = filtered.map(s => `
        <tr data-type="student" data-id="${escapeHtml(s.id)}">
            <td>${searcher ? searcher.highlightMatch(s.id, searchTerm) : escapeHtml(s.id)}</td>
            <td>${searcher ? searcher.highlightMatch(s.name, searchTerm) : escapeHtml(s.name)}</td>
            <td>${searcher ? searcher.highlightMatch(s.programme || '—', searchTerm) : escapeHtml(s.programme || '—')}</td>
            <td>${searcher ? searcher.highlightMatch(s.company || '—', searchTerm) : escapeHtml(s.company || '—')}</td>
            <td><span class="status-badge status-${s.status?.toLowerCase()}">${escapeHtml(s.status || 'Pending')}</span></td>
            <td class="action-cell">
                <button class="edit-row-btn" data-type="student" data-id="${escapeHtml(s.id)}">Edit</button>
                <button class="delete-row-btn" data-type="student" data-id="${escapeHtml(s.id)}">Delete</button>
            </td>
        </tr>
    `).join('');

    setTimeout(() => setTableHeight('studentsScrollableTable'), 50);
}

function renderAdminAssessorsWithSmartSearch() {
    const searchTerm = document.getElementById('searchAssessors')?.value || '';
    const searchFields = ['name', 'id', 'email', 'dept', 'role'];

    // Use globalSmartSearch if available
    const searcher = globalSmartSearch;

    let filtered = assessorsList;
    if (searchTerm && searcher) {
        filtered = searcher.search(assessorsList, searchTerm, searchFields);
    }

    const tbody = document.getElementById('assessorsTableBody');
    if (!tbody) return;

    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color: #888;">No assessors found matching "${escapeHtml(searchTerm)}"</td></tr>`;
        return;
    }

    tbody.innerHTML = filtered.map(a => `
        <tr data-type="assessor" data-id="${escapeHtml(a.id)}">
            <td>${searcher ? searcher.highlightMatch(a.id, searchTerm) : escapeHtml(a.id)}</td>
            <td>${searcher ? searcher.highlightMatch(a.name, searchTerm) : escapeHtml(a.name)}</td>
            <td>${searcher ? searcher.highlightMatch(a.dept || '—', searchTerm) : escapeHtml(a.dept || '—')}</td>
            <td>${searcher ? searcher.highlightMatch(a.email, searchTerm) : escapeHtml(a.email)}</td>
            <td>${(a.assignedStudentIds || []).length} assigned</td>
            <td class="action-cell">
                <button class="edit-row-btn" data-type="assessor" data-id="${escapeHtml(a.id)}">Edit</button>
                <button class="delete-row-btn" data-type="assessor" data-id="${escapeHtml(a.id)}">Delete</button>
            </td>
        </tr>
    `).join('');

    setTimeout(() => setTableHeight('assessorsScrollableTable'), 50);
}

// Add debounced search event listeners
function setupSmartSearchListeners() {
    const searcher = globalSmartSearch;
    if (!searcher) {
        console.warn('SmartSearch not available');
        return;
    }

    const searchAccounts = document.getElementById('searchAccounts');
    const searchStudents = document.getElementById('searchStudents');
    const searchAssessors = document.getElementById('searchAssessors');

    if (searchAccounts) {
        searchAccounts.addEventListener('input', () => {
            searcher.debouncedSearch(() => renderAdminAccounts());
        });
    }

    if (searchStudents) {
        searchStudents.addEventListener('input', () => {
            searcher.debouncedSearch(() => renderAdminStudents());
        });
    }

    if (searchAssessors) {
        searchAssessors.addEventListener('input', () => {
            searcher.debouncedSearch(() => renderAdminAssessors());
        });
    }
}

// ============================================
// CSV EXPORT INTEGRATION
// ============================================

function addExportButtonsToList() {
    // Check if createExportButton is available
    const exportBtnMaker = globalCreateExportButton;
    if (!exportBtnMaker) {
        console.warn('createExportButton not available yet, will retry...');
        setTimeout(addExportButtonsToList, 500);
        return;
    }

    const accountsFilterGroup = document.querySelector('#accountsScrollableTable')?.closest('.table-card')?.querySelector('.filter-group');
    if (accountsFilterGroup && !accountsFilterGroup.querySelector('.export-btn')) {
        const exportBtn = exportBtnMaker(() => exportAccountsToCSV(), '📊 Export CSV');
        exportBtn.style.marginLeft = 'auto';
        accountsFilterGroup.appendChild(exportBtn);
    }

    const studentsFilterGroup = document.querySelector('#studentsScrollableTable')?.closest('.table-card')?.querySelector('.filter-group');
    if (studentsFilterGroup && !studentsFilterGroup.querySelector('.export-btn')) {
        const exportBtn = exportBtnMaker(() => exportStudentsToCSV(), '📊 Export CSV');
        studentsFilterGroup.appendChild(exportBtn);
    }

    const assessorsFilterGroup = document.querySelector('#assessorsScrollableTable')?.closest('.table-card')?.querySelector('.filter-group');
    if (assessorsFilterGroup && !assessorsFilterGroup.querySelector('.export-btn')) {
        const exportBtn = exportBtnMaker(() => exportAssessorsToCSV(), '📊 Export CSV');
        assessorsFilterGroup.appendChild(exportBtn);
    }
}

function exportAccountsToCSV() {
    const exporter = globalCsvExporter;
    if (!exporter) {
        alert('Export function not available');
        return;
    }

    const columns = [
        { key: 'username', label: 'Username' },
        { key: 'email', label: 'Email' },
        { key: 'userRole', label: 'Role' },
        { key: 'contact', label: 'Contact' },
        { key: 'createdAt', label: 'Created At', isDate: true }
    ];

    exporter.exportToCSV(accountsList, 'accounts_export', columns);
}

function exportStudentsToCSV() {
    const exporter = globalCsvExporter;
    if (!exporter) {
        alert('Export function not available');
        return;
    }

    // Get current filtered students
    const searchTerm = document.getElementById('searchStudents')?.value || '';
    const statusFilter = document.getElementById('filterStudentStatus')?.value || '';
    const assessorFilter = document.getElementById('filterStudentAssessor')?.value || '';
    const programmeFilter = document.getElementById('filterStudentProgramme')?.value || '';

    let filtered = [...studentsList];

    const searcher = globalSmartSearch;
    if (searchTerm && searcher) {
        filtered = searcher.search(filtered, searchTerm, ['name', 'id', 'email', 'company', 'programme']);
    }
    if (statusFilter) filtered = filtered.filter(s => s.status === statusFilter);
    if (assessorFilter) filtered = filtered.filter(s => s.assigned_assessor === assessorFilter);
    if (programmeFilter) filtered = filtered.filter(s => s.programme === programmeFilter);

    const columns = [
        { key: 'id', label: 'Student ID' },
        { key: 'name', label: 'Name' },
        { key: 'programme', label: 'Programme' },
        { key: 'company', label: 'Company' },
        { key: 'year', label: 'Enrollment Year' },
        { key: 'email', label: 'Email' },
        { key: 'contact', label: 'Contact' },
        { key: 'status', label: 'Status' },
        { key: 'assigned_assessor', label: 'Assigned Assessor' }
    ];

    exporter.exportToCSV(filtered, 'students_export', columns);
}

function exportAssessorsToCSV() {
    const exporter = globalCsvExporter;
    if (!exporter) {
        alert('Export function not available');
        return;
    }

    const columns = [
        { key: 'id', label: 'Assessor ID' },
        { key: 'name', label: 'Name' },
        { key: 'role', label: 'Role' },
        { key: 'dept', label: 'Department' },
        { key: 'email', label: 'Email' },
        { key: 'contact', label: 'Contact' },
        { key: 'assignedStudentIds', label: 'Assigned Students Count' }
    ];

    exporter.exportToCSV(assessorsList, 'assessors_export', columns);
}

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

        const studentsArray = Array.isArray(students) ? students : [];
        const assessorsArray = Array.isArray(assessors) ? assessors : [];
        const usersArray = Array.isArray(users) ? users : [];

        // Transform students data - USE formatted_id from API
        studentsList = studentsArray.map(s => ({
            id: s.formatted_id || 'S' + s.student_id,
            raw_id: s.student_id,
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

        // Transform assessors data - USE formatted_id from API
        assessorsList = assessorsArray.map(a => ({
            id: a.formatted_id || 'A' + a.assessor_id,
            raw_id: a.assessor_id,
            name: a.username || '',
            role: a.role || 'Assessor',
            dept: a.department || '',
            email: a.email || '',
            contact: a.contact || '',
            assignedStudentIds: Array.isArray(a.assigned_student_ids) ? a.assigned_student_ids.map(id => id.toString()) : [],
            assessor_id: a.assessor_id,
            user_id: a.user_id
        }));

        // Transform users/accounts data - USE formatted_id from API
        accountsList = usersArray.map(u => {
            let displayPassword = actualPasswords[u.user_id];
            if (!displayPassword) {
                displayPassword = generateDisplayPassword(u.username, u.user_id);
                actualPasswords[u.user_id] = displayPassword;
            }

            return {
                id: u.formatted_id || 'U' + u.user_id,
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
// VALIDATION FUNCTIONS
// ============================================

function validateEmail(email) {
    const pattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return pattern.test(email);
}

function validateContact(contact) {
    const pattern = /^\d{3}-\d{3}-\d{4}$/;
    return pattern.test(contact);
}

function validateYear(year) {
    const currentYear = new Date().getFullYear();
    return year >= 2000 && year <= currentYear;
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
    renderAdminAccountsWithSmartSearch();
}

function renderAdminStudents() {
    renderAdminStudentsWithSmartSearch();
}

function renderAdminAssessors() {
    renderAdminAssessorsWithSmartSearch();
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
    let assigned = studentsList.filter(s => assignedIds.includes(s.raw_id?.toString()));

    // Get search term and filters
    const searchTerm = document.getElementById('searchAssignedStudents')?.value || '';
    const statusFilter = document.getElementById('filterAssignedStatus')?.value || '';
    const programmeFilter = document.getElementById('filterAssignedProgramme')?.value || '';

    // Use smart search if available
    const searcher = window.smartSearch;

    // Apply smart search
    if (searchTerm && searcher) {
        const searchFields = ['name', 'id', 'email', 'company', 'programme'];
        assigned = searcher.search(assigned, searchTerm, searchFields);
    }

    // Apply filters
    assigned = assigned.filter(s => {
        if (statusFilter && s.status !== statusFilter) return false;
        if (programmeFilter && (s.programme || '') !== programmeFilter) return false;
        return true;
    });

    const tbody = document.getElementById('assignedStudentsTableBody');
    if (!tbody) return;

    if (assigned.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color: #888;">No assigned students found matching "${escapeHtml(searchTerm)}"</td></tr>`;
        if (document.getElementById('assignedStudentsScrollableTable')) {
            setTimeout(() => setTableHeight('assignedStudentsScrollableTable'), 50);
        }
        return;
    }

    // Render rows with smart search highlighting
    tbody.innerHTML = assigned.map(s => {
        let nameHtml = escapeHtml(s.name);
        let idHtml = escapeHtml(s.id);
        let programmeHtml = escapeHtml(s.programme || '—');
        let companyHtml = escapeHtml(s.company || '—');

        // Apply highlighting if smart search is available
        if (searcher && searchTerm) {
            nameHtml = searcher.highlightMatch(s.name, searchTerm);
            idHtml = searcher.highlightMatch(s.id, searchTerm);
            programmeHtml = searcher.highlightMatch(s.programme || '—', searchTerm);
            companyHtml = searcher.highlightMatch(s.company || '—', searchTerm);
        }

        return `
            <tr data-type="student" data-id="${escapeHtml(s.id)}" data-assessor-id="${escapeHtml(assessor.id)}">
                <td>${idHtml}</td>
                <td>${nameHtml}</td>
                <td>${programmeHtml}</td>
                <td>${companyHtml}</td>
                <td>${escapeHtml(s.internshipPeriod || '—')}</td>
                <td><span class="status-badge status-${s.status?.toLowerCase()}">${escapeHtml(s.status || 'Pending')}</span></td>
            </tr>
        `;
    }).join('');

    const container = document.getElementById('assignedStudentsScrollableTable');
    if (container) setTimeout(() => setTableHeight('assignedStudentsScrollableTable'), 50);
}

// ============================================
// FILTER DROPDOWNS
// ============================================
function populateFilterDropdowns() {
    // For admin view - assessor filter
    const assessorSelect = document.getElementById('filterStudentAssessor');
    if (assessorSelect) {
        const uniqueAssessors = [...new Set(studentsList.map(s => s.assigned_assessor).filter(Boolean))];
        assessorSelect.innerHTML = '<option value="">All Assessors</option>' +
            uniqueAssessors.map(a => `<option value="${escapeHtml(a)}">${escapeHtml(a)}</option>`).join('');
    }

    // For both admin and assessor - programme filters
    const programmeSources = ['filterStudentProgramme', 'filterAssignedProgramme'];
    const uniqueProgrammes = [...new Set(studentsList.map(s => s.programme).filter(Boolean))];

    programmeSources.forEach(id => {
        const select = document.getElementById(id);
        if (select) {
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
            setupProgressNotes(data.raw_id, currentAssessor.id);
        }
    }
}

function setupProgressNotes(studentId, assessorId) {
    const notesSection = document.getElementById('progressNotesSection');
    const noteTextarea = document.getElementById('studentProgressNote');
    const saveNoteBtn = document.getElementById('saveNoteBtn');

    notesSection.style.display = 'block';
    const assessor = assessorsList.find(a => a.id === assessorId);
    const rawAssessorId = assessor ? assessor.raw_id : assessorId;
    const noteKey = `${studentId}_${rawAssessorId}`;
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
        const stu = studentsList.find(s => s.raw_id?.toString() === sid.toString());
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
    const searcher = window.smartSearch;

    const searchInput = document.getElementById('searchAssignedStudents');
    const statusFilter = document.getElementById('filterAssignedStatus');
    const programmeFilter = document.getElementById('filterAssignedProgramme');

    const doSearch = () => renderAssignedStudents();

    if (searchInput) {
        if (searcher) {
            searchInput.addEventListener('input', () => {
                searcher.debouncedSearch(doSearch);
            });
        } else {
            searchInput.addEventListener('input', doSearch);
        }
    }

    if (statusFilter) statusFilter.addEventListener('change', doSearch);
    if (programmeFilter) programmeFilter.addEventListener('change', doSearch);
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
    const programmeOptions = ['Computer Science', 'Business', 'Engineering'];

    let startDate = '', endDate = '';
    if (student.start_date) startDate = student.start_date;
    if (student.end_date) endDate = student.end_date;

    return `
        <div class="edit-field"><label>Student ID</label><input type="text" id="edit_student_id" value="${escapeHtml(student.id)}" readonly></div>
        <div class="edit-field"><label>Student Name</label><input type="text" id="edit_student_name" value="${escapeHtml(student.name)}"></div>
        <div class="edit-field">
            <label>Programme</label>
            <select id="edit_programme">
                <option value="">-- Select Programme --</option>
                ${programmeOptions.map(opt => `<option value="${opt}" ${student.programme === opt ? 'selected' : ''}>${opt}</option>`).join('')}
            </select>
        </div>
        <div class="edit-field"><label>Internship Company</label><input type="text" id="edit_company" value="${escapeHtml(student.company || '')}"></div>
        <div class="edit-field"><label>Enrolment Year</label><input type="text" id="edit_year" value="${escapeHtml(student.year || '')}"></div>
        <div class="edit-field"><label>Email</label><input type="email" id="edit_student_email" value="${escapeHtml(student.email || '')}"></div>
        <div class="edit-field"><label>Contact Number</label><input type="text" id="edit_student_contact" value="${escapeHtml(student.contact || '')}"></div>
        <div class="edit-field"><label>Internship Start Date</label><input type="date" id="edit_start_date" value="${startDate}"></div>
        <div class="edit-field"><label>Internship End Date</label><input type="date" id="edit_end_date" value="${endDate}"></div>
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
    let success = false;

    try {
        if (currentEditType === 'account') {
            success = await updateAccountFromModal();
        } else if (currentEditType === 'student') {
            success = await updateStudentFromModal();
        } else if (currentEditType === 'assessor') {
            success = await updateAssessorFromModal();
        }
    } catch (error) {
        console.error('Save error:', error);
        alert('An error occurred while saving: ' + error.message);
        return;
    }

    if (success === true) {
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
        attachDeleteButtonListeners();
        setupRowDelegation();
    }
}

async function updateStudentFromModal() {
    const student = studentsList.find(s => s.id === currentEditId);
    if (!student) {
        alert('Student not found');
        return false;
    }

    const name = document.getElementById('edit_student_name').value;
    const programme = document.getElementById('edit_programme').value;
    const company = document.getElementById('edit_company').value;
    const yearValue = document.getElementById('edit_year').value;
    const email = document.getElementById('edit_student_email').value;
    const contact = document.getElementById('edit_student_contact').value;
    const status = document.getElementById('edit_status').value;
    const newAssessorName = document.getElementById('edit_assigned_assessor').value;

    if (email && !validateEmail(email)) {
        alert('Invalid email format. Please enter a valid email address.');
        return false;
    }

    if (contact && !validateContact(contact)) {
        alert('Invalid contact format. Use: 012-345-6789');
        return false;
    }

    const year = parseInt(yearValue);
    if (isNaN(year) || !validateYear(year)) {
        const currentYear = new Date().getFullYear();
        alert(`Invalid enrollment year. Please enter a year between 2000 and ${currentYear + 5}`);
        return false;
    }

    if (!programme) {
        alert('Please select a programme');
        return false;
    }

    const selectedAssessor = assessorsList.find(a => a.name === newAssessorName);
    const assessorId = selectedAssessor ? parseInt(selectedAssessor.raw_id) : null;

    const updatedStudent = {
        student_id: parseInt(student.raw_id),
        name: name,
        programme: programme,
        company_name: company,
        enrollment_year: year,
        student_email: email,
        student_contact: contact,
        assigned_assessor: assessorId,
        status: status,
        start_date: document.getElementById('edit_start_date').value || null,
        end_date: document.getElementById('edit_end_date').value || null
    };

    const result = await API.updateStudent(updatedStudent);

    if (result.success) {
        await loadDataFromAPI();
        alert('Student updated successfully!');
        return true;
    } else {
        alert('Error updating student: ' + (result.error || 'Unknown error'));
        return false;
    }
}

async function updateAccountFromModal() {
    const account = accountsList.find(a => a.email === currentEditId);
    if (!account) {
        alert('Account not found');
        return false;
    }

    const username = document.getElementById('edit_username').value;
    const email = document.getElementById('edit_email').value;
    const role = document.getElementById('edit_role').value;
    const contact = document.getElementById('edit_contact').value;
    const newPassword = document.getElementById('edit_password')?.value || '';

    if (!validateEmail(email)) {
        alert('Invalid email format. Please enter a valid email address.');
        return false;
    }

    if (contact && !validateContact(contact)) {
        alert('Invalid contact format. Use: 012-345-6789');
        return false;
    }

    const updatedAccount = {
        user_id: account.user_id,
        username: username,
        email: email,
        userRole: role,
        contact: contact
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
            localStorage.setItem(`user_password_${account.user_id}`, newPlainPassword);
            saveStoredPasswords();
            alert(`✅ Account updated successfully! New Password: ${newPlainPassword}`);
        } else {
            alert('✅ Account updated successfully!');
        }
        await loadDataFromAPI();
        return true;
    } else {
        alert('❌ Error updating account: ' + (result.error || 'Unknown error'));
        return false;
    }
}

async function updateAssessorFromModal() {
    const assessor = assessorsList.find(a => a.id === currentEditId);
    if (!assessor) {
        alert('Assessor not found');
        return false;
    }

    const name = document.getElementById('edit_assessor_name').value;
    const email = document.getElementById('edit_assessor_email').value;
    const contact = document.getElementById('edit_assessor_contact').value;
    const department = document.getElementById('edit_assessor_dept').value;
    const role = document.getElementById('edit_assessor_role').value;

    if (!validateEmail(email)) {
        alert('Invalid email format. Please enter a valid email address.');
        return false;
    }

    if (contact && !validateContact(contact)) {
        alert('Invalid contact format. Use: 012-345-6789');
        return false;
    }

    const updatedAssessor = {
        user_id: assessor.user_id,
        assessor_id: parseInt(assessor.raw_id),
        username: name,
        email: email,
        contact: contact,
        department: department,
        assessor_role: role
    };

    const result = await API.updateAssessor(updatedAssessor);

    if (result.success) {
        await loadDataFromAPI();
        alert('Assessor updated successfully!');
        return true;
    } else {
        alert('Error updating assessor: ' + (result.error || 'Unknown error'));
        return false;
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
    // First check if we have a stored password for this user
    const storedPassword = localStorage.getItem(`user_password_${userId}`);
    if (storedPassword) {
        return storedPassword;
    }

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

    // Only setup enhanced features if dependencies are available
    if (typeof window.smartSearch !== 'undefined' || globalSmartSearch) {
        setupSmartSearchListeners();
        addExportButtonsToList();
    } else {
        console.warn('Enhanced features not available, using basic mode');
    }

    // Set table heights after render
    setTimeout(() => observeTableHeightChanges(), 100);
}

// Make sure to call init
init();