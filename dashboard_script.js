const DOM = {
    wrapper: document.querySelector('.wrapper'),
    loginBtn: document.querySelector('.login_btn'),
    iconClose: document.querySelector('.icon-close'),
    userInfo: document.getElementById('userInfo'),
    usernameDisplay: document.getElementById('usernameDisplay'),
    userRoleDisplay: document.getElementById('userRoleDisplay'),
    accessDenied: document.getElementById('accessDeniedMessage'),
    adminDashboard: document.getElementById('adminDashboard'),
    assessorDashboard: document.getElementById('assessorDashboard'),
    accountTbody: document.getElementById('accountTableBody'),
    studentTbody: document.getElementById('studentTableBody'),
    assessorTbody: document.getElementById('assessorTableBody'),
    pendingTbody: document.getElementById('pendingTableBody'),
    completedTbody: document.getElementById('completedTableBody')
};

// ============================================
// DATA STRUCTURES
// ============================================
let fullAccountList = [];
let fullStudentList = [];
let fullAssessorList = [];
let assessorEvaluations = {};
let actualPasswords = {};

// ============================================
// VALIDATION FUNCTIONS
// ============================================

function validateContact(contact) {
    const pattern = /^\d{3}-\d{3}-\d{4}$/;
    return pattern.test(contact);
}

function validateEmail(email) {
    const pattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return pattern.test(email);
}

function validateYear(year) {
    const currentYear = new Date().getFullYear();
    return year >= 2000 && year <= currentYear;
}

// ============================================
// GENERAL FUNCTIONS
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

function formatDateForDisplay(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB');
}

function formatDateRangeForDisplay(startDate, endDate) {
    if (!startDate && !endDate) return '—';
    if (startDate && endDate) {
        return `${formatDateForDisplay(startDate)} to ${formatDateForDisplay(endDate)}`;
    }
    if (startDate) return `${formatDateForDisplay(startDate)} onwards`;
    return `Until ${formatDateForDisplay(endDate)}`;
}

// ============================================
// API DATA LOADING
// ============================================

async function loadDataFromAPI() {
    try {
        console.log('Loading data from API...');

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

        // Transform students data
        fullStudentList = studentsArray.map(s => ({
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
            internshipPeriod: formatDateRangeForDisplay(s.start_date, s.end_date),
            student_id: s.student_id,
            start_date: s.start_date,
            end_date: s.end_date,
            assigned_assessor_id: s.assigned_assessor
        }));

        // Transform assessors data
        fullAssessorList = assessorsArray.map(a => ({
            id: a.formatted_id || 'A' + a.assessor_id,
            raw_id: a.assessor_id,
            name: a.username || '',
            role: a.assessor_role || 'Assessor',
            dept: a.department || '',
            email: a.email || '',
            contact: a.contact || '',
            assignedStudentIds: Array.isArray(a.assigned_student_ids) ? a.assigned_student_ids.map(id => id.toString()) : [],
            assessor_id: a.assessor_id,
            user_id: a.user_id
        }));

        // Transform accounts data - FIXED to preserve actual passwords
        fullAccountList = usersArray.map(u => {
            const userId = u.user_id;
            let displayPassword = actualPasswords[userId];

            // Check if we have a stored password for this user
            const storedPassword = localStorage.getItem(`user_password_${userId}`);
            if (storedPassword) {
                displayPassword = storedPassword;
                actualPasswords[userId] = storedPassword;
            } else if (!displayPassword) {
                displayPassword = generateDisplayPassword(u.username, userId);
                actualPasswords[userId] = displayPassword;
            }

            return {
                id: u.formatted_id || 'U' + u.user_id,
                username: u.username || '',
                email: u.email || '',
                password: displayPassword,
                userRole: u.role || '',
                contact: u.contact || '',
                createdAt: u.date_created ? formatDateForDisplay(u.date_created) : '',
                user_id: userId
            };
        });
        saveStoredPasswords();

        // Sort by ID descending (newest first)
        fullAccountList.sort((a, b) => b.user_id - a.user_id);
        fullStudentList.sort((a, b) => b.student_id - a.student_id);
        fullAssessorList.sort((a, b) => b.assessor_id - a.assessor_id);

        console.log('Total accounts:', fullAccountList.length);
        console.log('Total students:', fullStudentList.length);
        console.log('Total assessors:', fullAssessorList.length);

        loadEvaluations();

        return true;
    } catch (error) {
        console.error('Error loading data:', error);
        fullStudentList = [];
        fullAssessorList = [];
        fullAccountList = [];
        return false;
    }
}

function loadStoredPasswords() {
    const stored = localStorage.getItem('accountPasswords');
    if (stored) {
        try {
            actualPasswords = JSON.parse(stored);
        } catch (e) { }
    }
}

function saveStoredPasswords() {
    localStorage.setItem('accountPasswords', JSON.stringify(actualPasswords));
}

function loadEvaluations() {
    const saved = localStorage.getItem('assessorEvaluations');
    if (saved) {
        try {
            assessorEvaluations = JSON.parse(saved);
        } catch (e) {
            console.error('Eval load error:', e);
            assessorEvaluations = {};
        }
    } else {
        assessorEvaluations = {};
    }
}

function saveEvaluationsToStorage() {
    localStorage.setItem('assessorEvaluations', JSON.stringify(assessorEvaluations));
}

// ============================================
// SET DYNAMIC TABLE HEIGHT
// ============================================

let tableResizeTimeout;

function setTableHeight() {
    clearTimeout(tableResizeTimeout);
    tableResizeTimeout = setTimeout(() => {
        document.querySelectorAll('.scrollable-table').forEach(container => {
            const thead = container.querySelector('thead');
            const tbody = container.querySelector('tbody');
            if (!thead) return;

            const headerHeight = thead.offsetHeight;
            const rows = tbody ? Array.from(tbody.querySelectorAll('tr')) : [];
            const rowHeight0 = rows[0]?.offsetHeight || 0;
            const rowHeight1 = rows[1]?.offsetHeight || 0;
            const rowHeight2 = rows[2]?.offsetHeight || 0;
            const totalHeight = headerHeight + rowHeight0 + rowHeight1 + rowHeight2;

            container.style.maxHeight = `${totalHeight}px`;
        });
    }, 100);
}

function observeTableChanges() {
    const scrollableContainers = document.querySelectorAll('.scrollable-table');

    scrollableContainers.forEach(container => {
        const observer = new MutationObserver(() => {
            setTableHeight();
        });

        observer.observe(container, {
            childList: true,
            subtree: true,
            attributes: true,
            characterData: true
        });
    });
}

// ============================================
// LOGIN MANAGEMENT
// ============================================

async function checkLogin() {
    const loggedIn = sessionStorage.getItem('loggedInUser');
    if (!loggedIn) {
        showAccessDenied();
        return;
    }

    try {
        const user = JSON.parse(loggedIn);
        if (DOM.usernameDisplay && DOM.userRoleDisplay) {
            DOM.usernameDisplay.textContent = user.username;
            DOM.userRoleDisplay.textContent = user.userRole;
            DOM.userInfo.style.display = 'flex';
            if (DOM.loginBtn) {
                DOM.loginBtn.textContent = 'LOGOUT';
                DOM.loginBtn.classList.add('logout-state');
            }
        }

        if (user.userRole?.toLowerCase() === 'administrator') {
            showAdminDashboard();
            renderAllTables();
        } else if (user.userRole?.toLowerCase() === 'assessor') {
            const assessor = fullAssessorList.find(a => a.email === user.email);
            if (assessor) {
                showAssessorDashboard(assessor);
                renderAllTables();
            } else {
                showAccessDenied();
            }
        } else {
            showAccessDenied();
        }
    } catch (e) {
        showAccessDenied();
    }
}

function showAdminDashboard() {
    if (DOM.adminDashboard) DOM.adminDashboard.style.display = 'block';
    if (DOM.assessorDashboard) DOM.assessorDashboard.style.display = 'none';
    if (DOM.accessDenied) DOM.accessDenied.style.display = 'none';
}

function showAssessorDashboard(assessor) {
    if (DOM.adminDashboard) DOM.adminDashboard.style.display = 'none';
    if (DOM.accessDenied) DOM.accessDenied.style.display = 'none';
    renderAssessorDashboard(assessor);
}

function showAccessDenied() {
    if (DOM.adminDashboard) DOM.adminDashboard.style.display = 'none';
    if (DOM.assessorDashboard) DOM.assessorDashboard.style.display = 'none';
    if (DOM.accessDenied) DOM.accessDenied.style.display = 'flex';
}

function logout() {
    sessionStorage.removeItem('loggedInUser');
    if (DOM.userInfo) DOM.userInfo.style.display = 'none';
    if (DOM.loginBtn) {
        DOM.loginBtn.textContent = 'LOGIN';
        DOM.loginBtn.classList.remove('logout-state');
    }
    if (DOM.wrapper) DOM.wrapper.classList.remove('active-popup');
    showAccessDenied();
    alert('Logged out successfully');
}

// ===========
// SETUPS
// ===========
function setupLoginForm() {
    const form = document.querySelector('.form-box-login form');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = form.querySelector('input[type="email"]').value.trim();
        const password = form.querySelector('input[type="password"]').value.trim();

        const result = await API.login(email, password);

        if (result.success) {
            if (DOM.wrapper) DOM.wrapper.classList.remove('active-popup');

            sessionStorage.setItem('loggedInUser', JSON.stringify({
                username: result.user.username,
                email: result.user.email,
                userRole: result.user.userRole,
                userId: result.user.user_id
            }));

            alert(`Logged in as ${result.user.username} (${result.user.userRole})`);

            await loadDataFromAPI();
            checkLogin();

            form.reset();
        } else {
            alert(result.message || 'Invalid email or password');
        }
    });
}

function setupEventListeners() {
    if (DOM.loginBtn) {
        DOM.loginBtn.addEventListener('click', () => {
            if (DOM.loginBtn.textContent === 'LOGOUT') {
                logout();
            } else if (DOM.wrapper) {
                DOM.wrapper.classList.add('active-popup');
            }
        });
    }

    if (DOM.iconClose && DOM.wrapper) {
        DOM.iconClose.addEventListener('click', () => {
            DOM.wrapper.classList.remove('active-popup');
        });
    }

    // Use DOM elements directly with more reliable selectors
    const addStudentBtn = document.getElementById('addStudentBtn');
    const addAssessorBtn = document.getElementById('addAssessorBtn');
    const addAccountBtn = document.getElementById('addAccountBtn');

    if (addStudentBtn) {
        addStudentBtn.removeEventListener('click', addNewStudent);
        addStudentBtn.addEventListener('click', addNewStudent);
        console.log('Add student button listener attached');
    }

    if (addAssessorBtn) {
        addAssessorBtn.removeEventListener('click', addNewAssessor);
        addAssessorBtn.addEventListener('click', addNewAssessor);
        console.log('Add assessor button listener attached');
    }

    if (addAccountBtn) {
        addAccountBtn.removeEventListener('click', addNewAccount);
        addAccountBtn.addEventListener('click', addNewAccount);
        console.log('Add account button listener attached');
    }
}

// ======================
// INITIALIZATION
// ======================

function renderAllTables() {
    syncAssignedStudentIds();
    renderAccountTable();
    renderStudentTable();
    renderAssessorTable();

    const loggedInUser = sessionStorage.getItem('loggedInUser');
    if (loggedInUser) {
        const user = JSON.parse(loggedInUser);
        if (user.userRole?.toLowerCase() === 'assessor') {
            const assessor = fullAssessorList.find(a => a.email === user.email);
            if (assessor) {
                renderAssessorDashboard(assessor);
            }
        }
    }

    setupRowDelegation();
}

//=============================
// SELECT ROWS FUNCTION
//=============================

function clearAllSelections() {
    document.querySelectorAll('.scrollable-table tbody tr').forEach(row => {
        row.classList.remove('selected-row');
    });
}

function setupRowDelegation() {
    if (DOM.accountTbody) {
        DOM.accountTbody.removeEventListener('click', handleAccountRowClick);
        DOM.accountTbody.addEventListener('click', handleAccountRowClick);
    }

    if (DOM.studentTbody) {
        DOM.studentTbody.removeEventListener('click', handleStudentRowClick);
        DOM.studentTbody.addEventListener('click', handleStudentRowClick);
    }

    if (DOM.assessorTbody) {
        DOM.assessorTbody.removeEventListener('click', handleAssessorRowClick);
        DOM.assessorTbody.addEventListener('click', handleAssessorRowClick);
    }
}

function handleAccountRowClick(e) {
    const row = e.target.closest('tr');
    if (!row) return;

    if (e.target.closest('.edit-account-btn') || e.target.closest('.delete-account-btn') ||
        e.target.closest('.save-account-btn') || e.target.closest('.cancel-account-btn')) {
        return;
    }

    clearAllSelections();
    row.classList.add('selected-row');
}

function handleStudentRowClick(e) {
    const row = e.target.closest('tr');
    if (!row) return;

    if (e.target.closest('.edit-student-btn') || e.target.closest('.delete-student-btn') ||
        e.target.closest('.save-student-btn') || e.target.closest('.cancel-student-btn')) {
        return;
    }

    clearAllSelections();
    row.classList.add('selected-row');
}

function handleAssessorRowClick(e) {
    const row = e.target.closest('tr');
    if (!row) return;

    if (e.target.closest('.edit-assessor-btn') || e.target.closest('.delete-assessor-btn') ||
        e.target.closest('.save-assessor-btn') || e.target.closest('.cancel-assessor-btn')) {
        return;
    }

    clearAllSelections();
    row.classList.add('selected-row');
}

// ============================================
// REGISTERED ACCOUNT TABLE FUNCTIONALITY  
// ============================================
let isAccountAddFormVisible = false;

function insertAccountAddForm() {
    const addRow = document.createElement('tr');
    addRow.className = 'add-form-row';
    addRow.id = 'account-add-form-row';

    addRow.innerHTML = `
        <td><input type="text" id="add_account_username" placeholder="Username" style="width:80px"></td>
        <td><input type="email" id="add_account_email" placeholder="Email" style="width:110px"></td>
        <td>
            <input type="text" id="add_account_password" placeholder="Will be generated" 
                   style="width:140px; background:#f0f0f0; color:#666;" readonly>
        </td>
        <td>
            <select id="add_account_role" style="width:110px; padding:4px;">
                <option value="Administrator">Administrator</option>
                <option value="Assessor">Assessor</option>
            </select>
        </td>
        <td><input type="tel" id="add_account_contact" placeholder="Contact (012-345-6789)" style="width:140px"></td>
        <td style="color: rgba(255,255,255,0.7); font-size: 14px;">Auto-generated on save</td>
        <td class="action-cell">
            <div class="action-buttons">
                <button class="add-save-btn" id="saveAccountAddBtn">Save</button>
                <button class="add-cancel-btn" id="cancelAccountAddBtn">Cancel</button>
            </div>
        </td>
    `;

    if (DOM.accountTbody.firstChild) {
        DOM.accountTbody.insertBefore(addRow, DOM.accountTbody.firstChild);
    } else {
        DOM.accountTbody.appendChild(addRow);
    }

    const usernameInput = document.getElementById('add_account_username');
    const passwordField = document.getElementById('add_account_password');

    if (usernameInput && passwordField) {
        usernameInput.addEventListener('input', function () {
            const username = this.value.trim();
            if (username) {
                const firstWord = username.split(' ')[0];
                const previewNumbers = 'XXXXXX';
                passwordField.value = firstWord + previewNumbers;
                passwordField.style.color = '#ffaa00';
            } else {
                passwordField.value = 'Enter username to preview';
                passwordField.style.color = '#666';
            }
        });
    }

    document.getElementById('saveAccountAddBtn').addEventListener('click', saveAccountAdd);
    document.getElementById('cancelAccountAddBtn').addEventListener('click', cancelAccountAdd);
}

async function saveAccountAdd() {
    const newUsername = document.getElementById('add_account_username').value.trim();

    if (!newUsername) {
        alert('Please enter Username');
        document.getElementById('add_account_username').focus();
        return;
    }

    const email = document.getElementById('add_account_email').value.trim();
    if (!validateEmail(email)) {
        alert('Invalid email format');
        document.getElementById('add_account_email').focus();
        return;
    }

    const contact = document.getElementById('add_account_contact').value.trim();
    if (contact && !validateContact(contact)) {
        alert('Invalid contact format. Use: 012-345-6789');
        document.getElementById('add_account_contact').focus();
        return;
    }

    const firstWord = newUsername.split(' ')[0];
    const tempPassword = 'temp_' + Date.now();

    const newAccount = {
        username: newUsername,
        email: email,
        password: tempPassword,
        userRole: document.getElementById('add_account_role').value,
        contact: contact,
        department: '',
        assessor_role: 'Assessor'
    };

    const result = await API.addUser(newAccount);

    if (result.success) {
        const actualUserId = result.user_id;
        const correctPassword = firstWord + String(actualUserId).padStart(6, '0');

        const updateResult = await API.updateUser({
            user_id: actualUserId,
            username: newUsername,
            email: email,
            password: correctPassword,
            userRole: newAccount.userRole,
            contact: contact
        });

        if (updateResult.success) {
            actualPasswords[actualUserId] = correctPassword;
            localStorage.setItem(`user_password_${actualUserId}`, correctPassword);
            saveStoredPasswords();

            alert(`Account created successfully!\nUsername: ${newUsername}\nPassword: ${correctPassword}\nAccount ID: ${result.formatted_id || 'U' + actualUserId}`);
            isAccountAddFormVisible = false;
            await loadDataFromAPI();
            renderAllTables();
        } else {
            alert('Error setting account password: ' + (updateResult.error || 'Unknown error'));
        }
    } else {
        alert('Error creating account: ' + (result.error || 'Unknown error'));
    }
}

function cancelAccountAdd() {
    isAccountAddFormVisible = false;
    renderAllTables();
}

function addNewAccount() {
    if (isAccountAddFormVisible) return;

    if (isAssessorAddFormVisible) {
        isAssessorAddFormVisible = false;
        renderAssessorTable();
    }

    if (isStudentAddFormVisible) {
        isStudentAddFormVisible = false;
        renderStudentTable();
    }

    clearAllSelections();

    isAccountAddFormVisible = true;
    renderAccountTable();
}

function renderAccountTable() {
    if (!DOM.accountTbody) return;

    DOM.accountTbody.innerHTML = '';

    // Get last 3 accounts
    const lastThreeAccounts = fullAccountList.slice(0, 3);

    if (lastThreeAccounts.length === 0) {
        const emptyMessageRow = document.createElement('tr');
        emptyMessageRow.innerHTML = `<td colspan="7" style="text-align:center">No accounts found. Click "Add new account" to add.`;
        DOM.accountTbody.appendChild(emptyMessageRow);
    } else {
        lastThreeAccounts.forEach((account, index) => {
            const row = document.createElement('tr');
            row.setAttribute('data-account-index', index);
            row.innerHTML = `
                <td>${escapeHtml(account.username)}</td>
                <td>${escapeHtml(account.email)}</td>
                <td>${escapeHtml(account.password)}</td>
                <td>${escapeHtml(account.userRole)}</td>
                <td>${escapeHtml(account.contact || '—')}</td>
                <td>${escapeHtml(account.createdAt)}</td>
                <td class="action-cell">
                    <button class="edit-account-btn" data-index="${index}">Edit</button>
                    <button class="delete-account-btn" data-index="${index}">Delete</button>
                  </td>
            `;
            DOM.accountTbody.appendChild(row);
        });
    }

    if (isAccountAddFormVisible) {
        insertAccountAddForm();
    }

    document.querySelectorAll('.edit-account-btn').forEach(btn => {
        btn.removeEventListener('click', handleEditAccount);
        btn.addEventListener('click', handleEditAccount);
    });

    document.querySelectorAll('.delete-account-btn').forEach(btn => {
        btn.removeEventListener('click', handleDeleteAccount);
        btn.addEventListener('click', handleDeleteAccount);
    });
}

function handleEditAccount(e) {
    e.stopPropagation();
    const idx = parseInt(e.currentTarget.dataset.index);
    enableEditAccountRow(idx);
}

function handleDeleteAccount(e) {
    e.stopPropagation();
    const idx = parseInt(e.currentTarget.dataset.index);
    deleteAccount(idx);
}

function enableEditAccountRow(index) {
    const account = fullAccountList[index];
    const row = DOM.accountTbody.querySelector(`tr[data-account-index="${index}"]`);
    if (!row) return;

    const currentDisplayPassword = account.password;

    row.innerHTML = `
        <td><input type="text" value="${escapeHtml(account.username || '')}" id="edit_account_username_${index}" style="width:70px; padding:3px;"></td>
        <td><input type="email" value="${escapeHtml(account.email || '')}" id="edit_account_email_${index}" style="width:100px; padding:3px;"></td>
        <td>
            <div style="display: flex; flex-direction: column; gap: 5px;">
                <input type="text" value="" id="edit_account_password_${index}" 
                       placeholder="${escapeHtml(currentDisplayPassword)}" 
                       style="width:140px; padding:3px;">
            </div>
           </td>
        <td>
            <select id="edit_account_role_${index}" style="width:100px; padding:3px;">
                <option value="Administrator" ${account.userRole === 'Administrator' ? 'selected' : ''}>Administrator</option>
                <option value="Assessor" ${account.userRole === 'Assessor' ? 'selected' : ''}>Assessor</option>
            </select>
           </td>
        <td><input type="tel" value="${escapeHtml(account.contact || '')}" id="edit_account_contact_${index}" style="width:100px; padding:3px;"></td>
        <td style="color: rgba(255,255,255,0.7); font-size: 14px;">${escapeHtml(account.createdAt)}</td>
        <td class="action-cell">
            <button class="table-btn save-account-btn" data-index="${index}">Save</button>
            <button class="table-btn cancel-account-btn" data-index="${index}">Cancel</button>
          </td>
    `;

    document.querySelector(`.save-account-btn[data-index="${index}"]`).addEventListener('click', () => saveAccountEdit(index));
    document.querySelector(`.cancel-account-btn[data-index="${index}"]`).addEventListener('click', () => renderAllTables());
}

async function saveAccountEdit(index) {
    const oldAccount = fullAccountList[index];
    const newPasswordInput = document.getElementById(`edit_account_password_${index}`);
    const newPassword = newPasswordInput ? newPasswordInput.value.trim() : '';

    const updatedUsername = document.getElementById(`edit_account_username_${index}`).value;
    const updatedEmail = document.getElementById(`edit_account_email_${index}`).value;
    const updatedRole = document.getElementById(`edit_account_role_${index}`).value;
    const updatedContact = document.getElementById(`edit_account_contact_${index}`).value;

    if (!validateEmail(updatedEmail)) {
        alert('Invalid email format');
        return;
    }

    if (updatedContact && !validateContact(updatedContact)) {
        alert('Invalid contact format. Use: 012-345-6789');
        return;
    }

    const updatedAccount = {
        user_id: oldAccount.user_id,
        username: updatedUsername,
        email: updatedEmail,
        userRole: updatedRole,
        contact: updatedContact
    };

    let passwordChanged = false;
    let newPlainPassword = null;

    if (newPassword && newPassword !== '') {
        updatedAccount.password = newPassword;
        passwordChanged = true;
        newPlainPassword = newPassword;
    }

    const result = await API.updateUser(updatedAccount);

    if (result.success) {
        if (passwordChanged && newPlainPassword) {
            actualPasswords[oldAccount.user_id] = newPlainPassword;
            localStorage.setItem(`user_password_${oldAccount.user_id}`, newPlainPassword);
            saveStoredPasswords();
            alert(`✅ Account updated successfully! New Password: ${newPlainPassword}`);
        } else {
            alert('✅ Account updated successfully!');
        }

        await loadDataFromAPI();
        renderAllTables();
    } else {
        alert('❌ Error updating account: ' + (result.error || 'Unknown error'));
    }
}

async function deleteAccount(index) {
    if (confirm('Are you sure you want to delete this account?')) {
        const account = fullAccountList[index];
        const result = await API.deleteUser(account.user_id);

        if (result.success) {
            localStorage.removeItem(`user_password_${account.user_id}`);
            await loadDataFromAPI();
            renderAllTables();
            alert('Account deleted successfully');
        } else {
            alert('Error deleting account: ' + (result.error || 'Unknown error'));
        }
    }
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
// STUDENT TABLE FUNCTIONALITY  
// ============================================

let isStudentAddFormVisible = false;

function insertStudentAddForm() {
    const addRow = document.createElement('tr');
    addRow.className = 'add-form-row';
    addRow.id = 'student-add-form-row';

    const statusOptions = ['Ongoing', 'Pending', 'Evaluated'];
    const statusDropdown = `<select id="add_status" class="add-dropdown" style="width:100px; padding:4px; border-radius:4px;">
        ${statusOptions.map(opt => `<option value="${opt}">${opt}</option>`).join('')}
    </select>`;

    const programmeOptions = ['Computer Science', 'Business', 'Engineering'];
    const programmeDropdown = `<select id="add_programme" class="add-dropdown" style="width:120px; padding:4px; border-radius:4px;">
        <option value="">-- Select Programme --</option>
        ${programmeOptions.map(opt => `<option value="${opt}">${opt}</option>`).join('')}
    </select>`;

    const assessorNames = ['', ...fullAssessorList.map(a => a.name)];
    const assessorDropdown = `<select id="add_assessor" class="add-dropdown" style="width:120px; padding:4px; border-radius:4px;">
        ${assessorNames.map(name => `<option value="${name}">${name || '—'}</option>`).join('')}
    </select>`;

    addRow.innerHTML = `
        <td style="color: cyan; font-weight: bold;">Auto-generated</td>
        <td><input type="text" id="add_student_name" placeholder="Full name" style="width:110px"></td>
        <td class="programme-cell">${programmeDropdown}</td>
        <td><input type="text" id="add_company" placeholder="Company" style="width:110px"></td>
        <td><input type="text" id="add_year" placeholder="Year" style="width:70px"></td>
        <td><input type="email" id="add_email" placeholder="Email" style="width:130px"></td>
        <td><input type="tel" id="add_contact" placeholder="Contact (012-345-6789)" style="width:130px"></td>
        <td style="min-width: 200px;">
            <input type="date" id="add_internship_start" style="width: 120px; margin-right: 5px;"> to 
            <input type="date" id="add_internship_end" style="width: 120px;">
          </td>
        <td class="status-cell">${statusDropdown}</td>
        <td class="assessor-cell">${assessorDropdown}</td>
        <td class="action-cell">
            <div class="action-buttons">
                <button class="add-save-btn" id="saveStudentAddBtn">Save</button>
                <button class="add-cancel-btn" id="cancelStudentAddBtn">Cancel</button>
            </div>
          </td>
    `;

    if (DOM.studentTbody.firstChild) {
        DOM.studentTbody.insertBefore(addRow, DOM.studentTbody.firstChild);
    } else {
        DOM.studentTbody.appendChild(addRow);
    }

    document.getElementById('saveStudentAddBtn').addEventListener('click', saveStudentAdd);
    document.getElementById('cancelStudentAddBtn').addEventListener('click', cancelStudentAdd);
    document.getElementById('add_student_name').focus();
}

async function saveStudentAdd() {
    const newName = document.getElementById('add_student_name').value.trim();

    if (!newName) {
        alert('Please enter Student Name');
        document.getElementById('add_student_name').focus();
        return;
    }

    const email = document.getElementById('add_email').value.trim();
    if (email && !validateEmail(email)) {
        alert('Invalid email format');
        document.getElementById('add_email').focus();
        return;
    }

    const contact = document.getElementById('add_contact').value.trim();
    if (contact && !validateContact(contact)) {
        alert('Invalid contact format. Use: 012-345-6789');
        document.getElementById('add_contact').focus();
        return;
    }

    const year = parseInt(document.getElementById('add_year').value.trim());
    if (isNaN(year) || !validateYear(year)) {
        alert('Invalid enrollment year (2000-' + (new Date().getFullYear() + 5) + ')');
        document.getElementById('add_year').focus();
        return;
    }

    const programme = document.getElementById('add_programme').value;
    if (!programme) {
        alert('Please select a programme');
        document.getElementById('add_programme').focus();
        return;
    }

    const startDate = document.getElementById('add_internship_start').value;
    const endDate = document.getElementById('add_internship_end').value;
    const newStatus = document.getElementById('add_status').value;
    const newAssessorName = document.getElementById('add_assessor').value;

    const selectedAssessor = fullAssessorList.find(a => a.name === newAssessorName);
    const assessorId = selectedAssessor ? parseInt(selectedAssessor.raw_id) : null;

    const newStudent = {
        name: newName,
        programme: programme,
        company_name: document.getElementById('add_company').value.trim(),
        enrollment_year: year,
        student_email: email,
        student_contact: contact,
        assigned_assessor: assessorId,
        status: newStatus,
        start_date: startDate || null,
        end_date: endDate || null
    };

    const result = await API.addStudent(newStudent);

    if (result.success) {
        alert(`Student added successfully!\nStudent ID: ${result.formatted_id || 'S' + result.student_id}`);
        isStudentAddFormVisible = false;
        await loadDataFromAPI();
        renderAllTables();
    } else {
        alert('Error adding student: ' + (result.error || 'Unknown error'));
    }
}

function cancelStudentAdd() {
    isStudentAddFormVisible = false;
    renderAllTables();
}

function addNewStudent() {
    if (isStudentAddFormVisible) return;

    if (isAssessorAddFormVisible) {
        isAssessorAddFormVisible = false;
        renderAssessorTable();
    }

    if (isAccountAddFormVisible) {
        isAccountAddFormVisible = false;
        renderAccountTable();
    }

    clearAllSelections();

    isStudentAddFormVisible = true;
    renderStudentTable();
}

function renderStudentTable() {
    if (!DOM.studentTbody) return;

    DOM.studentTbody.innerHTML = '';

    // Get last 3 students
    const lastThreeStudents = fullStudentList.slice(0, 3);

    if (lastThreeStudents.length === 0) {
        const emptyMessageRow = document.createElement('tr');
        emptyMessageRow.innerHTML = `<td colspan="11" style="text-align:center">No students found. Click "Add new student" to add.`;
        DOM.studentTbody.appendChild(emptyMessageRow);
    } else {
        lastThreeStudents.forEach((student, index) => {
            const row = document.createElement('tr');
            row.setAttribute('data-student-index', index);
            row.innerHTML = `
                <td>${escapeHtml(student.id)}</td>
                <td>${escapeHtml(student.name)}</td>
                <td>${escapeHtml(student.programme)}</td>
                <td>${escapeHtml(student.company)}</td>
                <td>${escapeHtml(student.year)}</td>
                <td>${escapeHtml(student.email)}</td>
                <td>${escapeHtml(student.contact)}</td>
                <td>${escapeHtml(student.internshipPeriod || '—')}</td>
                <td class="status-cell">${escapeHtml(student.status || '—')}</td>
                <td class="assessor-cell">${escapeHtml(student.assigned_assessor || '—')}</td>
                <td class="action-cell">
                    <button class="edit-student-btn" data-index="${index}">Edit</button>
                    <button class="delete-student-btn" data-index="${index}">Delete</button>
                  </td>
            `;
            DOM.studentTbody.appendChild(row);
        });
    }

    if (isStudentAddFormVisible) {
        insertStudentAddForm();
    }

    document.querySelectorAll('.edit-student-btn').forEach(btn => {
        btn.removeEventListener('click', handleEditStudent);
        btn.addEventListener('click', handleEditStudent);
    });

    document.querySelectorAll('.delete-student-btn').forEach(btn => {
        btn.removeEventListener('click', handleDeleteStudent);
        btn.addEventListener('click', handleDeleteStudent);
    });
}

function handleEditStudent(e) {
    e.stopPropagation();
    const idx = parseInt(e.currentTarget.dataset.index);
    enableEditStudentRow(idx);
}

function handleDeleteStudent(e) {
    e.stopPropagation();
    const idx = parseInt(e.currentTarget.dataset.index);
    deleteStudent(idx);
}

function enableEditStudentRow(index) {
    const student = fullStudentList[index];
    const row = DOM.studentTbody.querySelector(`tr[data-student-index="${index}"]`);
    if (!row) return;

    const statusOptions = ['Ongoing', 'Pending', 'Evaluated'];
    const statusDropdown = `<select id="edit_status_${index}" style="width:100px; padding:4px; border-radius:4px;">
        ${statusOptions.map(opt => `<option value="${opt}" ${student.status === opt ? 'selected' : ''}>${opt}</option>`).join('')}
    </select>`;

    const programmeOptions = ['Computer Science', 'Business', 'Engineering'];
    const programmeDropdown = `<select id="edit_programme_${index}" style="width:120px; padding:4px; border-radius:4px;">
        ${programmeOptions.map(opt => `<option value="${opt}" ${student.programme === opt ? 'selected' : ''}>${opt}</option>`).join('')}
    </select>`;

    const assessorNames = ['', ...fullAssessorList.map(a => a.name)];
    const assessorDropdown = `<select id="edit_assigned_assessor_${index}" style="width:120px; padding:4px; border-radius:4px;">
        ${assessorNames.map(name => `<option value="${name}" ${student.assigned_assessor === name ? 'selected' : ''}>${name || '—'}</option>`).join('')}
    </select>`;

    row.innerHTML = `
        <td><input type="text" value="${student.id || ''}" id="edit_id_${index}" style="width:70px; padding:3px;" readonly></td>
        <td><input type="text" value="${student.name || ''}" id="edit_name_${index}" style="width:100px; padding:3px;"></td>
        <td class="programme-cell">${programmeDropdown}</td>
        <td><input type="text" value="${student.company || ''}" id="edit_comp_${index}" style="width:100px; padding:3px;"></td>
        <td><input type="text" value="${student.year || ''}" id="edit_year_${index}" style="width:70px; padding:3px;"></td>
        <td><input type="email" value="${student.email || ''}" id="edit_email_${index}" style="width:120px; padding:3px;"></td>
        <td><input type="tel" value="${student.contact || ''}" id="edit_contact_${index}" style="width:100px; padding:3px;"></td>
        <td style="min-width: 200px;">
            <input type="date" value="${student.start_date || ''}" id="edit_start_${index}" style="width: 120px; margin-right: 5px;"> to 
            <input type="date" value="${student.end_date || ''}" id="edit_end_${index}" style="width: 120px;">
          </td>
        <td class="status-cell">${statusDropdown}</td>
        <td class="assessor-cell">${assessorDropdown}</td>
        <td class="action-cell">
            <button class="table-btn save-student-btn" data-index="${index}">Save</button>
            <button class="table-btn cancel-student-btn" data-index="${index}">Cancel</button>
          </td>
    `;

    document.querySelector(`.save-student-btn[data-index="${index}"]`).addEventListener('click', () => saveStudentEdit(index));
    document.querySelector(`.cancel-student-btn[data-index="${index}"]`).addEventListener('click', () => renderAllTables());
}

async function saveStudentEdit(index) {
    const student = fullStudentList[index];

    const email = document.getElementById(`edit_email_${index}`).value;
    if (email && !validateEmail(email)) {
        alert('Invalid email format');
        return;
    }

    const contact = document.getElementById(`edit_contact_${index}`).value;
    if (contact && !validateContact(contact)) {
        alert('Invalid contact format. Use: 012-345-6789');
        return;
    }

    const year = parseInt(document.getElementById(`edit_year_${index}`).value);
    if (isNaN(year) || !validateYear(year)) {
        alert('Invalid enrollment year (2000-' + (new Date().getFullYear() + 5) + ')');
        return;
    }

    const programme = document.getElementById(`edit_programme_${index}`).value;
    if (!programme) {
        alert('Please select a programme');
        return;
    }

    const newAssessorName = document.getElementById(`edit_assigned_assessor_${index}`).value;
    const selectedAssessor = fullAssessorList.find(a => a.name === newAssessorName);
    const assessorId = selectedAssessor ? parseInt(selectedAssessor.raw_id) : null;

    const updatedStudent = {
        student_id: parseInt(student.student_id),
        name: document.getElementById(`edit_name_${index}`).value,
        programme: programme,
        company_name: document.getElementById(`edit_comp_${index}`).value,
        enrollment_year: year,
        student_email: email,
        student_contact: contact,
        assigned_assessor: assessorId,
        status: document.getElementById(`edit_status_${index}`).value,
        start_date: document.getElementById(`edit_start_${index}`).value || null,
        end_date: document.getElementById(`edit_end_${index}`).value || null
    };

    const result = await API.updateStudent(updatedStudent);

    if (result.success) {
        await loadDataFromAPI();
        renderAllTables();
        alert('Student updated successfully');
    } else {
        alert('Error updating student: ' + (result.error || 'Unknown error'));
    }
}

async function deleteStudent(index) {
    if (confirm('Are you sure you want to delete this student?')) {
        const student = fullStudentList[index];
        const result = await API.deleteStudent(parseInt(student.student_id));

        if (result.success) {
            await loadDataFromAPI();
            renderAllTables();
            alert('Student deleted successfully');
        } else {
            alert('Error deleting student: ' + (result.error || 'Unknown error'));
        }
    }
}

// ============================================
// ASSESSOR TABLE FUNCTIONALITY  
// ============================================

let isAssessorAddFormVisible = false;

function insertAssessorAddForm() {
    const addRow = document.createElement('tr');
    addRow.className = 'add-form-row';
    addRow.id = 'assessor-add-form-row';

    addRow.innerHTML = `
        <td class="assessor_id" style="color: rgba(255,255,255,0.5); font-style: italic;">—</td>
        <td><input type="text" id="add_assessor_name" placeholder="Full name" style="width:110px"></td>
        <td><input type="text" id="add_assessor_role" placeholder="Role" style="width:100px"></td>
        <td><input type="text" id="add_assessor_dept" placeholder="Department" style="width:100px"></td>
        <td><input type="email" id="add_assessor_email" placeholder="Email" style="width:130px"></td>
        <td><input type="tel" id="add_assessor_contact" placeholder="Contact (012-345-6789)" style="width:130px"></td>
        <td class="assigned-students-placeholder" style="color: rgba(255,255,255,0.5); font-style: italic;">—</td>
        <td class="action-cell">
            <div class="action-buttons">
                <button class="add-save-btn" id="saveAssessorAddBtn">Save</button>
                <button class="add-cancel-btn" id="cancelAssessorAddBtn">Cancel</button>
            </div>
          </td>
    `;

    if (DOM.assessorTbody.firstChild) {
        DOM.assessorTbody.insertBefore(addRow, DOM.assessorTbody.firstChild);
    } else {
        DOM.assessorTbody.appendChild(addRow);
    }

    document.getElementById('saveAssessorAddBtn').addEventListener('click', saveAssessorAdd);
    document.getElementById('cancelAssessorAddBtn').addEventListener('click', cancelAssessorAdd);
    document.getElementById('add_assessor_name').focus();
}

async function saveAssessorAdd() {
    const newName = document.getElementById('add_assessor_name').value.trim();

    if (!newName) {
        alert('Please enter Assessor Name');
        document.getElementById('add_assessor_name').focus();
        return;
    }

    const email = document.getElementById('add_assessor_email').value.trim();
    if (!validateEmail(email)) {
        alert('Invalid email format');
        document.getElementById('add_assessor_email').focus();
        return;
    }

    const contact = document.getElementById('add_assessor_contact').value.trim();
    if (contact && !validateContact(contact)) {
        alert('Invalid contact format. Use: 012-345-6789');
        document.getElementById('add_assessor_contact').focus();
        return;
    }

    const firstWord = newName.split(' ')[0];

    const newAssessor = {
        username: newName,
        email: email,
        password: 'temp_password',
        contact: contact,
        userRole: 'Assessor',
        department: document.getElementById('add_assessor_dept').value.trim(),
        assessor_role: document.getElementById('add_assessor_role').value.trim()
    };

    const result = await API.addUser(newAssessor);

    if (result.success) {
        const actualUserId = result.user_id;
        const correctPassword = firstWord + String(actualUserId).padStart(6, '0');

        const updateResult = await API.updateUser({
            user_id: actualUserId,
            username: newName,
            email: email,
            password: correctPassword,
            userRole: 'Assessor',
            contact: contact
        });

        if (updateResult.success) {
            actualPasswords[actualUserId] = correctPassword;
            localStorage.setItem(`user_password_${actualUserId}`, correctPassword);
            saveStoredPasswords();

            alert(`Assessor created successfully!\nUsername: ${newName}\nPassword: ${correctPassword}\nAssessor ID: ${result.formatted_id || 'A' + actualUserId}`);
            isAssessorAddFormVisible = false;
            await loadDataFromAPI();
            renderAllTables();
        } else {
            alert('Error setting assessor password: ' + (updateResult.error || 'Unknown error'));
        }
    } else {
        alert('Error creating assessor: ' + (result.error || 'Unknown error'));
    }
}

function cancelAssessorAdd() {
    isAssessorAddFormVisible = false;
    renderAllTables();
}

function addNewAssessor() {
    if (isAssessorAddFormVisible) return;

    if (isStudentAddFormVisible) {
        isStudentAddFormVisible = false;
        renderStudentTable();
    }

    if (isAccountAddFormVisible) {
        isAccountAddFormVisible = false;
        renderAccountTable();
    }

    clearAllSelections();

    isAssessorAddFormVisible = true;
    renderAssessorTable();
}

function renderAssessorTable() {
    if (!DOM.assessorTbody) return;

    DOM.assessorTbody.innerHTML = '';

    // Get last 3 assessors
    const lastThreeAssessors = fullAssessorList.slice(0, 3);

    if (lastThreeAssessors.length === 0) {
        const emptyMessageRow = document.createElement('tr');
        emptyMessageRow.innerHTML = `<td colspan="8" style="text-align:center">No assessors found. Click "Add new assessor" to add.`;
        DOM.assessorTbody.appendChild(emptyMessageRow);
    } else {
        lastThreeAssessors.forEach((assessor, index) => {
            let assignedStudents = '';
            if (assessor.assignedStudentIds && assessor.assignedStudentIds.length > 0) {
                const studentNames = assessor.assignedStudentIds
                    .map(id => fullStudentList.find(s => s.student_id == id)?.name || id).filter(name => name);
                assignedStudents = `<div class="assigned-list">${studentNames.map(name => `<span>${escapeHtml(name)}</span>`).join('')}</div>`;
            } else {
                assignedStudents = '<div class="assigned-list"><span>—</span></div>';
            }

            const row = document.createElement('tr');
            row.setAttribute('data-assessor-index', index);
            row.innerHTML = `
                <td>${escapeHtml(assessor.id)}</td>
                <td>${escapeHtml(assessor.name)}</td>
                <td>${escapeHtml(assessor.role || '—')}</td>
                <td>${escapeHtml(assessor.dept || '—')}</td>
                <td>${escapeHtml(assessor.email)}</td>
                <td>${escapeHtml(assessor.contact)}</td>
                <td>${assignedStudents}</td>
                <td class="action-cell">
                    <button class="edit-assessor-btn" data-index="${index}">Edit</button>
                    <button class="delete-assessor-btn" data-index="${index}">Delete</button>
                  </td>
            `;
            DOM.assessorTbody.appendChild(row);
        });
    }

    if (isAssessorAddFormVisible) {
        insertAssessorAddForm();
    }

    document.querySelectorAll('.edit-assessor-btn').forEach(btn => {
        btn.removeEventListener('click', handleEditAssessor);
        btn.addEventListener('click', handleEditAssessor);
    });

    document.querySelectorAll('.delete-assessor-btn').forEach(btn => {
        btn.removeEventListener('click', handleDeleteAssessor);
        btn.addEventListener('click', handleDeleteAssessor);
    });
}

function handleEditAssessor(e) {
    e.stopPropagation();
    const idx = parseInt(e.currentTarget.dataset.index);
    enableEditAssessorRow(idx);
}

function handleDeleteAssessor(e) {
    e.stopPropagation();
    const idx = parseInt(e.currentTarget.dataset.index);
    deleteAssessor(idx);
}

function syncAssignedStudentIds() {
    fullAssessorList.forEach(assessor => {
        assessor.assignedStudentIds = [];
    });

    fullStudentList.forEach(student => {
        if (student.assigned_assessor && student.assigned_assessor !== '—' && student.assigned_assessor !== '') {
            const assessor = fullAssessorList.find(a => a.name === student.assigned_assessor);
            if (assessor && !assessor.assignedStudentIds.includes(student.student_id.toString())) {
                assessor.assignedStudentIds.push(student.student_id.toString());
            }
        }
    });
}

function enableEditAssessorRow(index) {
    const assessor = fullAssessorList[index];
    const row = DOM.assessorTbody.querySelector(`tr[data-assessor-index="${index}"]`);
    if (!row) return;

    row.innerHTML = `
        <td class="assessor_id" style="color: rgba(255,255,255,0.5); font-style: italic;">—</td>
        <td><input type="text" value="${assessor.name || ''}" id="edit_assessor_name_${index}" style="width:100px; padding:3px;"></td>
        <td><input type="text" value="${assessor.role || ''}" id="edit_assessor_role_${index}" style="width:100px; padding:3px;"></td>
        <td><input type="text" value="${assessor.dept || ''}" id="edit_assessor_dept_${index}" style="width:100px; padding:3px;"></td>
        <td><input type="email" value="${assessor.email || ''}" id="edit_assessor_email_${index}" style="width:120px; padding:3px;"></td>
        <td><input type="tel" value="${assessor.contact || ''}" id="edit_assessor_contact_${index}" style="width:100px; padding:3px;"></td>
        <td class="assigned-students-placeholder" style="color: rgba(255,255,255,0.5); font-style: italic;">—</td>
        <td class="action-cell">
            <button class="table-btn save-assessor-btn" data-index="${index}">Save</button>
            <button class="table-btn cancel-assessor-btn" data-index="${index}">Cancel</button>
          </td>
    `;

    document.querySelector(`.save-assessor-btn[data-index="${index}"]`).addEventListener('click', () => saveAssessorEdit(index));
    document.querySelector(`.cancel-assessor-btn[data-index="${index}"]`).addEventListener('click', () => renderAllTables());
}

async function saveAssessorEdit(index) {
    const assessor = fullAssessorList[index];

    const email = document.getElementById(`edit_assessor_email_${index}`).value;
    if (!validateEmail(email)) {
        alert('Invalid email format');
        return;
    }

    const contact = document.getElementById(`edit_assessor_contact_${index}`).value;
    if (contact && !validateContact(contact)) {
        alert('Invalid contact format. Use: 012-345-6789');
        return;
    }

    const updatedAssessor = {
        user_id: assessor.user_id,
        assessor_id: parseInt(assessor.raw_id),
        username: document.getElementById(`edit_assessor_name_${index}`).value,
        email: email,
        contact: contact,
        department: document.getElementById(`edit_assessor_dept_${index}`).value,
        assessor_role: document.getElementById(`edit_assessor_role_${index}`).value
    };

    const result = await API.updateAssessor(updatedAssessor);

    if (result.success) {
        await loadDataFromAPI();
        renderAllTables();
        alert('Assessor updated successfully');
    } else {
        alert('Error updating assessor: ' + (result.error || 'Unknown error'));
    }
}

async function deleteAssessor(index) {
    if (confirm('Are you sure you want to delete this assessor?')) {
        const assessor = fullAssessorList[index];
        const result = await API.deleteAssessor(parseInt(assessor.raw_id));

        if (result.success) {
            await loadDataFromAPI();
            renderAllTables();
            alert('Assessor deleted successfully');
        } else {
            alert('Error deleting assessor: ' + (result.error || 'Unknown error'));
        }
    }
}

// ============================================
// ASSESSOR DASHBOARD FUNCTIONS
// ============================================

function checkIfStudentEvaluated(studentId, assessorId) {
    return assessorEvaluations[`${assessorId}_${studentId}`] !== undefined;
}

function renderAssessorDashboard(assessor) {
    if (!DOM.assessorDashboard) return;

    DOM.assessorDashboard.style.display = 'block';
    document.getElementById('assessorNameDisplay').textContent = assessor.name;

    const assignedIds = assessor.assignedStudentIds || [];
    const assignedStudents = assignedIds.map(id => fullStudentList.find(s => s.student_id == id)).filter(Boolean);

    const pending = [];
    const completed = [];

    assignedStudents.forEach(student => {
        if (checkIfStudentEvaluated(student.student_id, assessor.raw_id)) {
            const evalData = assessorEvaluations[`${assessor.raw_id}_${student.student_id}`];
            completed.push({ ...student, evaluation: evalData });
        } else {
            pending.push(student);
        }
    });

    // Get only the latest 3 pending students (most recent by student_id)
    const latestPending = [...pending].sort((a, b) => b.student_id - a.student_id).slice(0, 3);
    // Get only the latest 3 completed students (most recent by evaluation date or student_id)
    const latestCompleted = [...completed].sort((a, b) => {
        // Sort by evaluation date if available, otherwise by student_id
        const dateA = a.evaluation?.evaluatedAt ? new Date(a.evaluation.evaluatedAt) : new Date(0);
        const dateB = b.evaluation?.evaluatedAt ? new Date(b.evaluation.evaluatedAt) : new Date(0);
        return dateB - dateA;
    }).slice(0, 3);

    document.getElementById('pendingCount').textContent = pending.length;
    document.getElementById('completedCount').textContent = completed.length;

    renderPendingTable(latestPending, assessor);
    renderCompletedTable(latestCompleted, assessor);
}

function renderPendingTable(pending, assessor) {
    if (!DOM.pendingTbody) return;

    if (pending.length === 0) {
        DOM.pendingTbody.innerHTML = `<tr><td colspan="9" style="text-align:center; color: #101b72;">No pending evaluations</td></tr>`;
        return;
    }

    DOM.pendingTbody.innerHTML = pending.map(student => `
        <tr data-student-id="${student.student_id}">
            <td>${escapeHtml(student.id)}</td>
            <td>${escapeHtml(student.name)}</td>
            <td>${escapeHtml(student.programme)}</td>
            <td>${escapeHtml(student.company)}</td>
            <td>${escapeHtml(student.year)}</td>
            <td>${escapeHtml(student.email)}</td>
            <td>${escapeHtml(student.contact)}</td>
            <td>${escapeHtml(student.status)}</td>
            <td class="action-cell">
                <button class="evaluate-btn" data-student-id="${student.student_id}" data-assessor-id="${assessor.raw_id}">
                    Evaluate
                </button>
              </td>
            </tr>
    `).join('');

    document.querySelectorAll('.evaluate-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            sessionStorage.setItem('evalStudentId', btn.getAttribute('data-student-id'));
            sessionStorage.setItem('evalAssessorId', btn.getAttribute('data-assessor-id'));
            window.location.href = 'evaluation.html';
        });
    });
}


function renderCompletedTable(completed, assessor) {
    if (!DOM.completedTbody) return;

    if (completed.length === 0) {
        DOM.completedTbody.innerHTML = `<tr><td colspan="10" style="text-align:center; color: #101b72;">No completed evaluations</td></tr>`;
        return;
    }

    DOM.completedTbody.innerHTML = completed.map(student => {
        const score = student.evaluation?.weightedTotal || 0;
        const scoreClass = score >= 80 ? 'score-high' : score >= 60 ? 'score-medium' : 'score-low';
        const evalDate = student.evaluation?.evaluatedAt ? new Date(student.evaluation.evaluatedAt).toLocaleDateString('en-GB') : '—';

        return `
            <tr>
                <td>${escapeHtml(student.id)}</td>
                <td>${escapeHtml(student.name)}</td>
                <td>${escapeHtml(student.programme)}</td>
                <td>${escapeHtml(student.company)}</td>
                <td>${escapeHtml(student.year)}</td>
                <td>${escapeHtml(student.email)}</td>
                <td>${escapeHtml(student.contact)}</td>
                <td class="${scoreClass}">${score.toFixed(1)}%</td>
                <td>${evalDate}</td>
                <td class="action-cell">
                    <button class="view-btn" data-student-id="${student.student_id}" data-assessor-id="${assessor.raw_id}">
                        View
                    </button>
                  </td>
            </tr>
        `;
    }).join('');

    document.querySelectorAll('.view-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            sessionStorage.setItem('viewStudentId', btn.getAttribute('data-student-id'));
            sessionStorage.setItem('viewAssessorId', btn.getAttribute('data-assessor-id'));
            sessionStorage.setItem('viewMode', 'true');
            window.location.href = 'evaluation.html';
        });
    });
}

// ============================================
// ADD UPDATE ASSESSOR API METHOD
// ============================================

if (!API.updateAssessor) {
    API.updateAssessor = async function (assessorData) {
        try {
            const response = await fetch('api/assessors.php', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(assessorData)
            });
            return await response.json();
        } catch (error) {
            console.error('Error updating assessor:', error);
            return { success: false, error: error.message };
        }
    };
}

// ============================================
// BEGIN INITIALIZATION
// =============================================

async function init() {
    await loadDataFromAPI();
    renderAllTables();
    setupLoginForm();
    setupEventListeners();
    observeTableChanges();
    checkLogin();
    setTimeout(setTableHeight, 100);
}

init();