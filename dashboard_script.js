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
let accountList = [];
let studentList = [];
let assessorList = [];
let assessorEvaluations = {};

// ============================================
// DEMO DATA
// ============================================
const DEMO_DATA = {
    accounts: [
        { username: 'John', email: 'admin123@gmail.com', password: '123456', userRole: 'Administrator', contact: '011 672 9343', createdAt: '31/12/2025' },
        { username: 'Jane Smith', email: 'jane.smith@nottingham.edu', password: 'jane123', userRole: 'Assessor', contact: '987-654-3210', createdAt: '01/01/2025' },
        { username: 'Alan Grant', email: 'a.grant@nottingham.edu', password: 'alan123', userRole: 'Assessor', contact: '456-123-7890', createdAt: '01/01/2025' }
    ],
    students: [
        { id: 'S1001', name: 'Emma Watson', programme: 'Computer Science', company: 'Innovate Tech', year: '2023', email: 'emma.w@student.com', contact: '111-222-3333', status: 'Pending', assigned_assessor: 'Jane Smith', internshipPeriod: '' },
        { id: 'S1002', name: 'James Brown', programme: 'Engineering', company: 'BuildCorp', year: '2022', email: 'j.brown@student.com', contact: '444-555-6666', status: 'Pending', assigned_assessor: 'Jane Smith', internshipPeriod: '' },
        { id: 'S1003', name: 'Luis Chen', programme: 'Business', company: 'FinGroup', year: '2024', email: 'l.chen@student.com', contact: '777-888-9999', status: 'Pending', assigned_assessor: 'Alan Grant', internshipPeriod: '' }
    ],
    assessors: [
        { id: 'A001', name: 'Jane Smith', role: 'Senior Assessor', dept: 'Computer Science', email: 'jane.smith@nottingham.edu', contact: '987-654-3210', assignedStudentIds: ['S1001', 'S1002'] },
        { id: 'A002', name: 'Alan Grant', role: 'Assessor', dept: 'Engineering', email: 'a.grant@nottingham.edu', contact: '456-123-7890', assignedStudentIds: ['S1003'] }
    ]
};

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
// STORING AND LOADING DATA FROM LOCAL STORAGE
// ============================================
let saveTimeout;

function saveDataToLocalStorage() {
    clearTimeout(saveTimeout);
    saveTimeout = setTimeout(() => {
        localStorage.setItem('internshipEvalData', JSON.stringify({
            accountList, studentList, assessorList
        }));
    }, 300);
}

function loadDataFromLocalStorage() {
    const saved = localStorage.getItem('internshipEvalData');

    if (saved) {
        try {
            const data = JSON.parse(saved);
            accountList = data.accountList || [...DEMO_DATA.accounts];
            studentList = data.studentList || [...DEMO_DATA.students];
            assessorList = data.assessorList || [...DEMO_DATA.assessors];
            return true;
        } catch (e) {
            console.error('Load error:', e);
        }
    }
    accountList = [...DEMO_DATA.accounts];
    studentList = [...DEMO_DATA.students];
    assessorList = [...DEMO_DATA.assessors];
    return false;
}

function loadEvaluations() {
    const saved = localStorage.getItem('assessorEvaluations');
    if (saved) {
        try {
            assessorEvaluations = JSON.parse(saved);
        } catch (e) {
            console.error('Eval load error:', e);
        }
    }
}

// ============================================
// LOGIN MANAGEMENT
// ============================================
function checkLogin() {
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
            const assessor = assessorList.find(a => a.email === user.email);
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

// ============================================
// SETUPS
// ============================================
function setupLoginForm() {
    const form = document.querySelector('.form-box-login form');
    if (!form) return;

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = form.querySelector('input[type="email"]').value.trim();
        const password = form.querySelector('input[type="password"]').value.trim();

        const matched = accountList.find(acc => acc.email === email && acc.password === password);

        if (matched) {
            if (DOM.wrapper) DOM.wrapper.classList.remove('active-popup');

            sessionStorage.setItem('loggedInUser', JSON.stringify({
                username: matched.username,
                email: matched.email,
                userRole: matched.userRole
            }));

            alert(`Logged in as ${matched.username} (${matched.userRole})`);

            loadDataFromLocalStorage();
            loadEvaluations();
            checkLogin();

            form.reset();
        } else {
            alert('Invalid email or password');
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

    window.addEventListener('storage', (e) => {
        if (e.key === 'internshipEvalData') {
            loadAccounts();
            renderAdminContacts();
        }
    });

    const addStudentBtn = document.getElementById('addStudentBtn');
    const addAssessorBtn = document.getElementById('addAssessorBtn');
    const addAccountBtn = document.getElementById('addAccountBtn');

    if (addStudentBtn) {
        addStudentBtn.addEventListener('click', addNewStudent);
    }

    if (addAssessorBtn) {
        addAssessorBtn.addEventListener('click', addNewAssessor);
    }

    if (addAccountBtn) {
        addAccountBtn.addEventListener('click', addNewAccount);
    }
}

// ============================================
// INITIALIZATION
// ============================================

function initData() {
    const loaded = loadDataFromLocalStorage();
    loadEvaluations();

    if (!loaded) {
        studentList = JSON.parse(JSON.stringify(DEMO_DATA.students));
        assessorList = JSON.parse(JSON.stringify(DEMO_DATA.assessors));
        accountList = JSON.parse(JSON.stringify(DEMO_DATA.accounts));
        console.log('Using demo data');
    }
}

function renderAllTables() {
    syncAssignedStudentIds();
    renderAccountTable();
    renderStudentTable();
    renderAssessorTable();

    const loggedInUser = sessionStorage.getItem('loggedInUser');
    if (loggedInUser) {
        const user = JSON.parse(loggedInUser);
        if (user.userRole?.toLowerCase() === 'assessor') {
            const assessor = assessorList.find(a => a.email === user.email);
            if (assessor) {
                renderAssessorDashboard(assessor);
            }
        }
    }

    setupRowDelegation();

    saveDataToLocalStorage();
}


//===============================================================================
//SELECT ROWS FUNCTION
//=====================================================================================

function clearAllSelections() {
    document.querySelectorAll('.scrollable-table tbody tr').forEach(row => {
        row.classList.remove('selected-row');
    });
}

function setupRowDelegation() {
    document.querySelectorAll('.scrollable-table tbody').forEach(tbody => {
        tbody.addEventListener('click', (e) => {
            const row = e.target.closest('tr');
            if (!row) return;

            if (e.target.closest('.table-btn') || e.target.closest('button') || e.target.closest('input')) {
                return;
            }

            clearAllSelections();
            row.classList.add('selected-row');
        });
    });
}


// ============================================
// REGISTERED ACCOUNT TABLE FUNCTIONALITY  
// ============================================
let isAccountAddFormVisible = false;

// INSERT NEW ROW TO ADD NEW ACCOUNT DETAILS
function insertAccountAddForm() {
    const addRow = document.createElement('tr');
    addRow.className = 'add-form-row';
    addRow.id = 'account-add-form-row';

    addRow.innerHTML = `
        <td><input type="text" id="add_account_username" placeholder="Username" style="width:80px"></td>
        <td><input type="email" id="add_account_email" placeholder="Email" style="width:110px"></td>
        <td><input type="text" id="add_account_password" placeholder="Password" style="width:110px"></td>
        <td><input type="text" id="add_account_role" placeholder="User Role" style="width:110px"></td>
        <td><input type="tel" id="add_account_contact" placeholder="Contact" style="width:110px"></td>
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

    document.getElementById('saveAccountAddBtn').addEventListener('click', saveAccountAdd);
    document.getElementById('cancelAccountAddBtn').addEventListener('click', cancelAccountAdd);
}

// SAVE NEW ACCOUNT DETAILS
function saveAccountAdd() {
    const newUsername = document.getElementById('add_account_username').value.trim();

    if (!newUsername) {
        alert('Please enter Username');
        document.getElementById('add_account_username').focus();
        return;
    }

    // Get current date in DD/MM/YYYY format
    const today = new Date();
    const day = String(today.getDate()).padStart(2, '0');
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const year = today.getFullYear();
    const currentDate = `${day}/${month}/${year}`;

    const newAccount = {
        username: newUsername,
        email: document.getElementById('add_account_email').value.trim(),
        password: document.getElementById('add_account_password').value.trim(),
        userRole: document.getElementById('add_account_role').value.trim(),
        contact: document.getElementById('add_account_contact').value.trim(),
        createdAt: currentDate  // Auto-generated date
    };

    accountList.push(newAccount);

    if ((newAccount.userRole && newAccount.userRole.toLowerCase() === 'assessor')) {
        // Generate assessor ID (A + 4 digits)
        const nextIdNum = assessorList.length + 1;
        const assessorId = `A${String(nextIdNum).padStart(3, '0')}`;

        const newAssessor = {
            id: assessorId,
            name: newUsername,
            role: '-',
            dept: '-',
            email: newAccount.email,
            contact: newAccount.contact,
            assignedStudentIds: []
        };

        assessorList.push(newAssessor);
        console.log(`Auto-created assessor: ${newAssessor.name} with ID ${assessorId}`);
    }

    isAccountAddFormVisible = false;
    saveDataToLocalStorage();
    renderAllTables();
}

// CANCEL ADDING NEW ACCOUNTS
function cancelAccountAdd() {
    isAccountAddFormVisible = false;
    renderAllTables();
}

// ONLY ONE ADD FORM IS OPEN AT A TIME
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

// RENDER REGISTERED ACCOUNT TABLE
function renderAccountTable() {
    if (!DOM.accountTbody) return;

    if (accountList.length === 0) {
        DOM.accountTbody.innerHTML = `<tr><td colspan="6" style="text-align:center">No accounts added yet</td></tr>`;
        return;
    }

    accountList.sort((a, b) => a.username.localeCompare(b.username));

    DOM.accountTbody.innerHTML = accountList.map((account, i) => `
        <tr data-account-index="${i}">
            <td>${escapeHtml(account.username)}</td>
            <td>${escapeHtml(account.email)}</td>
            <td>${escapeHtml(account.password)}</td>
            <td>${escapeHtml(account.userRole)}</td>
            <td>${escapeHtml(account.contact)}</td>
            <td>${escapeHtml(account.createdAt)}</td>
            <td class="action-cell">
                <button class="table-btn" id="edit-account-btn" data-index="${i}">Edit</button>
                <button class="table-btn" id="delete-account-btn" data-index="${i}">Delete</button>
            </td>
        </tr>
   `).join('');

    if (isAccountAddFormVisible) {
        insertAccountAddForm();
    }

    document.querySelectorAll('#edit-account-btn, [id^="edit-account-btn"]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const idx = parseInt(btn.dataset.index);
            enableEditAccountRow(idx);
        });
    });

    document.querySelectorAll('#delete-account-btn, [id^="delete-account-btn"]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const idx = parseInt(btn.dataset.index);
            deleteAccount(idx);
        });
    });
}

// EDIT ACCOUNT DETAILS FOR EACH ROW
function enableEditAccountRow(index) {
    const account = accountList[index];
    const row = DOM.accountTbody.querySelector(`tr[data-account-index="${index}"]`);
    if (!row) return;

    row.innerHTML = `
        <td><input type="text" value="${account.username || ''}" id="edit_account_username_${index}" style="width:70px; padding:3px;"></td>
        <td><input type="email" value="${account.email || ''}" id="edit_account_email_${index}" style="width:100px; padding:3px;"></td>
        <td><input type="text" value="${account.password || ''}" id="edit_account_password_${index}" style="width:100px; padding:3px;"></td>
        <td><input type="text" value="${account.userRole || ''}" id="edit_account_role_${index}" style="width:100px; padding:3px;"></td>
        <td><input type="tel" value="${account.contact || ''}" id="edit_account_contact_${index}" style="width:100px; padding:3px;"></td>
        <td><input type="date" value="${account.createdAt || ''}" id="edit_account_date_${index}" style="width:70px; padding:3px;"></td>

        <td class="action-cell">
            <button class="table-btn" id="save-account-btn-${index}" data-index="${index}">Save</button>
            <button class="table-btn" id="cancel-account-btn-${index}" data-index="${index}">Cancel</button>
        </td>
    `;

    document.getElementById(`save-account-btn-${index}`).addEventListener('click', () => saveAccountEdit(index));
    document.getElementById(`cancel-account-btn-${index}`).addEventListener('click', () => renderAllTables());
}

// SAVE ACCOUNT DETAIL CHANGES
function saveAccountEdit(index) {
    const oldAccount = accountList[index];

    const newAccount = {
        username: document.getElementById(`edit_account_username_${index}`).value,
        email: document.getElementById(`edit_account_email_${index}`).value,
        password: document.getElementById(`edit_account_password_${index}`).value,
        userRole: document.getElementById(`edit_account_role_${index}`).value,
        contact: document.getElementById(`edit_account_contact_${index}`).value,
        createdAt: document.getElementById(`edit_account_date_${index}`).value
    };

    accountList[index] = newAccount;

    const wasAssessor = oldAccount.userRole && oldAccount.userRole.toLowerCase() === 'assessor';
    const isNowAssessor = newAccount.userRole && newAccount.userRole.toLowerCase() === 'assessor';

    if (wasAssessor && !isNowAssessor) {
        // Remove from assessorList if exists
        const assessorIndex = assessorList.findIndex(a => a.email === oldAccount.email);
        if (assessorIndex !== -1) {
            assessorList.splice(assessorIndex, 1);
        }
    } else if (!wasAssessor && isNowAssessor) {
        // Add to assessorList
        const existingAssessor = assessorList.find(a => a.email === newAccount.email);
        if (!existingAssessor) {
            const nextIdNum = assessorList.length + 1;
            const assessorId = `A${String(nextIdNum).padStart(3, '0')}`;
            assessorList.push({
                id: assessorId,
                name: newAccount.username,
                role: '-',
                dept: '-',
                email: newAccount.email,
                contact: newAccount.contact,
                assignedStudentIds: []
            });
        }
    } else if (wasAssessor && isNowAssessor) {
        // Update existing assessor info
        const assessorIndex = assessorList.findIndex(a => a.email === oldAccount.email);
        if (assessorIndex !== -1) {
            assessorList[assessorIndex] = {
                ...assessorList[assessorIndex],
                name: newAccount.username,
                email: newAccount.email,
                contact: newAccount.contact
            };
        }
    }

    renderAllTables();
}

// DELETE SPECIFIC ACCOUNT ROWS
function deleteAccount(index) {
    if (confirm('Are you sure you want to delete this account?')) {
        const deletedAccount = accountList[index];

        if (deletedAccount.userRole && deletedAccount.userRole.toLowerCase() === 'assessor') {
            const assessorIndex = assessorList.findIndex(a => a.email === deletedAccount.email);
            if (assessorIndex !== -1) {
                assessorList.splice(assessorIndex, 1);
                console.log(`Removed assessor: ${deletedAccount.username}`);
            }
        }
        accountList.splice(index, 1);
        renderAllTables();
    }
}
// ============================================
// STUDENT TABLE FUNCTIONALITY  
// ============================================

let isStudentAddFormVisible = false;

// INSERT NEW ROW TO ADD NEW STUDENT DETAILS
function insertStudentAddForm() {
    const addRow = document.createElement('tr');
    addRow.className = 'add-form-row';
    addRow.id = 'student-add-form-row';

    const statusOptions = ['Ongoing', 'Pending', 'Evaluated'];
    const statusDropdown = `<select id="add_status" class="add-dropdown" style="width:100px; padding:4px; border-radius:4px;">
        ${statusOptions.map(opt => `<option value="${opt}">${opt}</option>`).join('')}
    </select>`;

    const assessorNames = ['', ...getAssessorNamesList()];
    const assessorDropdown = `<select id="add_assessor" class="add-dropdown" style="width:120px; padding:4px; border-radius:4px;">
        ${assessorNames.map(name => `<option value="${name}">${name || '—'}</option>`).join('')}
    </select>`;

    addRow.innerHTML = `
        <td><input type="text" id="add_student_id" placeholder="S1006" style="width:80px"></td>
        <td><input type="text" id="add_student_name" placeholder="Full name" style="width:110px"></td>
        <td><input type="text" id="add_programme" placeholder="Programme" style="width:110px"></td>
        <td><input type="text" id="add_company" placeholder="Company" style="width:110px"></td>
        <td><input type="text" id="add_year" placeholder="Year" style="width:70px"></td>
        <td><input type="email" id="add_email" placeholder="Email" style="width:130px"></td>
        <td><input type="tel" id="add_contact" placeholder="Contact" style="width:100px"></td>
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
    document.getElementById('add_student_id').focus();
}

// SAVE NEW STUDENT DETAILS
function saveStudentAdd() {
    const newId = document.getElementById('add_student_id').value.trim();
    const newName = document.getElementById('add_student_name').value.trim();

    if (!newId) {
        alert('Please enter Student ID');
        document.getElementById('add_student_id').focus();
        return;
    }
    if (!newName) {
        alert('Please enter Student Name');
        document.getElementById('add_student_name').focus();
        return;
    }

    if (studentList.find(s => s.id === newId)) {
        alert(`Student ID ${newId} already exists!`);
        document.getElementById('add_student_id').focus();
        return;
    }

    // Get start and end dates and combine them
    const startDate = document.getElementById('add_internship_start').value;
    const endDate = document.getElementById('add_internship_end').value;
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

    const newStatus = document.getElementById('add_status').value;
    const newAssessorName = document.getElementById('add_assessor').value;

    const newStudent = {
        id: newId,
        name: newName,
        programme: document.getElementById('add_programme').value.trim(),
        company: document.getElementById('add_company').value.trim(),
        year: document.getElementById('add_year').value.trim(),
        email: document.getElementById('add_email').value.trim(),
        contact: document.getElementById('add_contact').value.trim(),
        status: newStatus,
        assigned_assessor: newAssessorName,
        internshipPeriod: internshipPeriod
    };

    studentList.push(newStudent);

    // Add to assessor's assigned students list if assessor is selected
    if (newAssessorName) {
        const assessor = assessorList.find(a => a.name === newAssessorName);
        if (assessor) {
            if (!assessor.assignedStudentIds) {
                assessor.assignedStudentIds = [];
            }
            if (!assessor.assignedStudentIds.includes(newId)) {
                assessor.assignedStudentIds.push(newId);
            }
        }
    }

    isStudentAddFormVisible = false;
    renderAllTables();
}


// CANCEL ADDING NEW STUDENT
function cancelStudentAdd() {
    isStudentAddFormVisible = false;
    renderAllTables();;
}

// ONLY ONE ADD FORM IS OPENED AT A TIME
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

function getAssessorNamesList() {
    return assessorList.map(assessor => assessor.name);
}

function attachStudentDropdownListeners() {
    // Status dropdown listeners
    document.querySelectorAll('.status-dropdown').forEach(dropdown => {
        dropdown.removeEventListener('change', handleStatusChange);
        dropdown.addEventListener('change', handleStatusChange);
    });

    // Assessor dropdown listeners
    document.querySelectorAll('.assessor-dropdown-table').forEach(dropdown => {
        dropdown.removeEventListener('change', handleAssessorChange);
        dropdown.addEventListener('change', handleAssessorChange);
    });
}

// Handle status change
function handleStatusChange(e) {
    const index = parseInt(e.target.getAttribute('data-student-index'));
    const newStatus = e.target.value;

    if (studentList[index]) {
        studentList[index].status = newStatus;

        // Sync assignedStudentIds on the assessor to match the student's assigned_assessor field
        const student = studentList[index];
        if (student.assigned_assessor) {
            const assessor = assessorList.find(a => a.name === student.assigned_assessor);
            if (assessor) {
                if (!assessor.assignedStudentIds) assessor.assignedStudentIds = [];
                if (!assessor.assignedStudentIds.includes(student.id)) {
                    assessor.assignedStudentIds.push(student.id);
                }
            }
        }

        syncAssignedStudentIds();

        saveDataToLocalStorage();

        // Update assessor table if needed (show which students are assigned)
        renderAssessorTable();

        // If admin view is showing assessor dashboard, update it
        const loggedInUser = sessionStorage.getItem('loggedInUser');
        if (loggedInUser) {
            const user = JSON.parse(loggedInUser);
            if (user.userRole?.toLowerCase() === 'assessor') {
                const assessor = assessorList.find(a => a.email === user.email);
                if (assessor) {
                    renderAssessorDashboard(assessor);
                }
            }
        }
    }
}

// Handle assessor assignment change
function handleAssessorChange(e) {
    const index = parseInt(e.target.getAttribute('data-student-index'));
    const newAssessorName = e.target.value;
    const oldAssessorName = studentList[index].assigned_assessor;

    if (studentList[index]) {
        // Update student's assigned assessor
        studentList[index].assigned_assessor = newAssessorName;

        // Remove student from old assessor's list
        if (oldAssessorName) {
            const oldAssessor = assessorList.find(a => a.name === oldAssessorName);
            if (oldAssessor && oldAssessor.assignedStudentIds) {
                const studentIdIndex = oldAssessor.assignedStudentIds.indexOf(studentList[index].id);
                if (studentIdIndex !== -1) {
                    oldAssessor.assignedStudentIds.splice(studentIdIndex, 1);
                }
            }
        }

        // Add student to new assessor's list
        if (newAssessorName) {
            const newAssessor = assessorList.find(a => a.name === newAssessorName);
            if (newAssessor) {
                if (!newAssessor.assignedStudentIds) {
                    newAssessor.assignedStudentIds = [];
                }
                if (!newAssessor.assignedStudentIds.includes(studentList[index].id)) {
                    newAssessor.assignedStudentIds.push(studentList[index].id);
                }
            }
        }

        // Save changes
        saveDataToLocalStorage();

        // Refresh both tables
        renderAssessorTable();

        // Update assessor dashboard if current user is an assessor
        const loggedInUser = sessionStorage.getItem('loggedInUser');
        if (loggedInUser) {
            const user = JSON.parse(loggedInUser);
            if (user.userRole?.toLowerCase() === 'assessor') {
                const assessor = assessorList.find(a => a.email === user.email);
                if (assessor) {
                    renderAssessorDashboard(assessor);
                }
            }
        }
    }
}

// RENDER STUDENT TABLE
function renderStudentTable() {
    if (!DOM.studentTbody) return;

    if (studentList.length === 0) {
        DOM.studentTbody.innerHTML = `<tr><td colspan="11" style="text-align:center">No students added yet</td></tr>`;
        return;
    }

    studentList.sort((a, b) => (parseInt(a.id.replace(/\D/g, '')) || 0) - (parseInt(b.id.replace(/\D/g, '')) || 0));

    DOM.studentTbody.innerHTML = studentList.map((student, i) => `
        <tr data-student-index="${i}">
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
                <button class="table-btn" id="edit-student-btn" data-index="${i}">Edit</button>
                <button class="table-btn" id="delete-student-btn" data-index="${i}">Delete</button>
            </td>
        </tr>
    `).join('');

    if (isStudentAddFormVisible) {
        insertStudentAddForm();
    }

    document.querySelectorAll('#edit-student-btn, [id^="edit-student-btn"]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const idx = parseInt(btn.dataset.index);
            enableEditStudentRow(idx);
        });
    });

    document.querySelectorAll('#delete-student-btn, [id^="delete-student-btn"]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const idx = parseInt(e.currentTarget.dataset.index);
            deleteStudent(idx);
        });
    });
}

// EDIT STUDENT DETAILS FOR EACH ROW
function enableEditStudentRow(index) {
    const student = studentList[index];
    const row = DOM.studentTbody.querySelector(`tr[data-student-index="${index}"]`);
    if (!row) return;

    // Parse existing internship period
    let startDateValue = '';
    let endDateValue = '';
    if (student.internshipPeriod) {
        const parts = student.internshipPeriod.split(' to ');
        if (parts.length === 2) {
            const startParts = parts[0].split('/');
            const endParts = parts[1].split('/');
            if (startParts.length === 3) {
                startDateValue = `${startParts[2]}-${startParts[1]}-${startParts[0]}`;
            }
            if (endParts.length === 3) {
                endDateValue = `${endParts[2]}-${endParts[1]}-${endParts[0]}`;
            }
        }
    }

    // Generate dropdowns for edit mode
    const statusOptions = ['Ongoing', 'Pending', 'Evaluated'];
    const statusDropdown = `<select id="edit_status_${index}" style="width:100px; padding:4px; border-radius:4px;">
        ${statusOptions.map(opt => `<option value="${opt}" ${student.status === opt ? 'selected' : ''}>${opt}</option>`).join('')}
    </select>`;

    const assessorNames = ['', ...getAssessorNamesList()];
    const assessorDropdown = `<select id="edit_assigned_assessor_${index}" style="width:120px; padding:4px; border-radius:4px;">
        ${assessorNames.map(name => `<option value="${name}" ${student.assigned_assessor === name ? 'selected' : ''}>${name || '—'}</option>`).join('')}
    </select>`;

    row.innerHTML = `
        <td><input type="text" value="${student.id || ''}" id="edit_id_${index}" style="width:70px; padding:3px;"></td>
        <td><input type="text" value="${student.name || ''}" id="edit_name_${index}" style="width:100px; padding:3px;"></td>
        <td><input type="text" value="${student.programme || ''}" id="edit_prog_${index}" style="width:100px; padding:3px;"></td>
        <td><input type="text" value="${student.company || ''}" id="edit_comp_${index}" style="width:100px; padding:3px;"></td>
        <td><input type="text" value="${student.year || ''}" id="edit_year_${index}" style="width:70px; padding:3px;"></td>
        <td><input type="email" value="${student.email || ''}" id="edit_email_${index}" style="width:120px; padding:3px;"></td>
        <td><input type="tel" value="${student.contact || ''}" id="edit_contact_${index}" style="width:100px; padding:3px;"></td>
        <td style="min-width: 200px;">
            <input type="date" value="${startDateValue}" id="edit_start_${index}" style="width: 120px; margin-right: 5px;"> to 
            <input type="date" value="${endDateValue}" id="edit_end_${index}" style="width: 120px;">
        </td>
        <td class="status-cell">${statusDropdown}</td>
        <td class="assessor-cell">${assessorDropdown}</td>
        <td class="action-cell">
            <button class="table-btn" id="save-student-btn-${index}" data-index="${index}">Save</button>
            <button class="table-btn" id="cancel-student-btn-${index}" data-index="${index}">Cancel</button>
        </td>
    `;

    document.getElementById(`save-student-btn-${index}`).addEventListener('click', () => saveStudentEdit(index));
    document.getElementById(`cancel-student-btn-${index}`).addEventListener('click', () => renderAllTables());
}

// SAVE STUDENT DETAILS CHANGES
function saveStudentEdit(index) {
    const startDate = document.getElementById(`edit_start_${index}`).value;
    const endDate = document.getElementById(`edit_end_${index}`).value;
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

    const oldAssessorName = studentList[index].assigned_assessor;
    const newAssessorName = document.getElementById(`edit_assigned_assessor_${index}`).value;
    const newStatus = document.getElementById(`edit_status_${index}`).value;

    // Update assessor assignments
    if (oldAssessorName !== newAssessorName) {
        // Remove from old assessor
        if (oldAssessorName) {
            const oldAssessor = assessorList.find(a => a.name === oldAssessorName);
            if (oldAssessor && oldAssessor.assignedStudentIds) {
                const studentIdIndex = oldAssessor.assignedStudentIds.indexOf(studentList[index].id);
                if (studentIdIndex !== -1) {
                    oldAssessor.assignedStudentIds.splice(studentIdIndex, 1);
                }
            }
        }

        // Add to new assessor
        if (newAssessorName) {
            const newAssessor = assessorList.find(a => a.name === newAssessorName);
            if (newAssessor) {
                if (!newAssessor.assignedStudentIds) {
                    newAssessor.assignedStudentIds = [];
                }
                if (!newAssessor.assignedStudentIds.includes(studentList[index].id)) {
                    newAssessor.assignedStudentIds.push(studentList[index].id);
                }
            }
        }
    }

    const newStudent = {
        id: document.getElementById(`edit_id_${index}`).value,
        name: document.getElementById(`edit_name_${index}`).value,
        programme: document.getElementById(`edit_prog_${index}`).value,
        company: document.getElementById(`edit_comp_${index}`).value,
        year: document.getElementById(`edit_year_${index}`).value,
        email: document.getElementById(`edit_email_${index}`).value,
        contact: document.getElementById(`edit_contact_${index}`).value.trim(),
        status: newStatus,
        assigned_assessor: newAssessorName,
        internshipPeriod: internshipPeriod
    };

    studentList[index] = newStudent;
    renderAllTables();
}

// DELETE STUDENT DETAILS
function deleteStudent(index) {
    if (confirm('Are you sure you want to delete this student?')) {
        studentList.splice(index, 1);
        renderAllTables();
    }
}

// ============================================
// ASSESSOR TABLE FUNCTIONALITY  
// ============================================

let isAssessorAddFormVisible = false;

// INSERT NEW ROW FOR ADDING NEW ASSESSOR DETAILS
function insertAssessorAddForm() {
    const addRow = document.createElement('tr');
    addRow.className = 'add-form-row';
    addRow.id = 'assessor-add-form-row';

    addRow.innerHTML = `
        <td><input type="text" id="add_assessor_id" placeholder="A004" style="width:80px"></td>
        <td><input type="text" id="add_assessor_name" placeholder="Full name" style="width:110px"></td>
        <td><input type="text" id="add_assessor_role" placeholder="Role" style="width:100px"></td>
        <td><input type="text" id="add_assessor_dept" placeholder="Department" style="width:100px"></td>
        <td><input type="email" id="add_assessor_email" placeholder="Email" style="width:130px"></td>
        <td><input type="tel" id="add_assessor_contact" placeholder="Contact" style="width:100px"></td>
        <td><input type="text" id="add_assessor_students" placeholder="Student IDs (comma)" style="width:140px"></td>
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
    document.getElementById('add_assessor_id').focus();
}

function isStudentAlreadyAssigned(studentId, excludeAssessorId = null) {
    // Check all assessors except the one being edited
    for (let i = 0; i < assessorList.length; i++) {
        const assessor = assessorList[i];
        if (excludeAssessorId !== null && assessor.id === excludeAssessorId) continue;

        if (assessor.assignedStudentIds && assessor.assignedStudentIds.includes(studentId)) {
            return assessor.name;
        }
    }
    return null;
}

// SAVE NEW ASSESSOR DETAILS
function saveAssessorAdd() {
    const newId = document.getElementById('add_assessor_id').value.trim();
    const newName = document.getElementById('add_assessor_name').value.trim();

    // Validation
    if (!newId) {
        alert('Please enter Assessor ID');
        document.getElementById('add_assessor_id').focus();
        return;
    }
    if (!newName) {
        alert('Please enter Assessor Name');
        document.getElementById('add_assessor_name').focus();
        return;
    }

    if (assessorList.find(a => a.id === newId)) {
        alert(`Assessor ID ${newId} already exists!`);
        document.getElementById('add_assessor_id').focus();
        return;
    }

    const studentIdsInput = document.getElementById('add_assessor_students').value.trim();
    const studentIdsArray = studentIdsInput ? studentIdsInput.split(',').map(id => id.trim()) : [];

    for (const studentId of studentIdsArray) {
        const existingAssessorName = isStudentAlreadyAssignedToAssessor(studentId);
        if (existingAssessorName) {
            const student = studentList.find(s => s.id === studentId);
            alert(`Student ${studentId} (${student ? student.name : 'Unknown'}) is already assigned to assessor "${existingAssessorName}".`);
            return;
        }
    }

    const newAssessor = {
        id: newId,
        name: newName,
        role: document.getElementById('add_assessor_role').value.trim(),
        dept: document.getElementById('add_assessor_dept').value.trim(),
        email: document.getElementById('add_assessor_email').value.trim(),
        contact: document.getElementById('add_assessor_contact').value.trim(),
        assignedStudentIds: studentIdsArray
    };

    assessorList.push(newAssessor);

    // Update student records with the new assessor assignment
    for (const studentId of studentIdsArray) {
        const student = studentList.find(s => s.id === studentId);
        if (student) {
            student.assigned_assessor = newName;
        }
    }

    isAssessorAddFormVisible = false;
    renderAllTables();
}

// CANCEL ADDING NEW ASSESSOR
function cancelAssessorAdd() {
    isAssessorAddFormVisible = false;
    renderAllTables();
}

// ONLY ONE ADD FORM IS OPENED AT A TIME
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

// RENDER ASSESSOR TABLE
function renderAssessorTable() {
    if (!DOM.assessorTbody) return;

    if (assessorList.length === 0) {
        DOM.assessorTbody.innerHTML = `<tr><td colspan="7" style="text-align:center">No assessors added yet</td></tr>`;
        return;
    }

    assessorList.sort((a, b) => (parseInt(a.id.replace(/\D/g, '')) || 0) - (parseInt(b.id.replace(/\D/g, '')) || 0));

    DOM.assessorTbody.innerHTML = assessorList.map((assessor, i) => {
        let assignedStudents = '';
        if (assessor.assignedStudentIds && assessor.assignedStudentIds.length > 0) {
            const studentNames = (assessor.assignedStudentIds || [])
                .map(id => studentList.find(s => s.id === id)?.name || id).filter(name => name);

            assignedStudents = `<div class="assigned-list">${studentNames.map(name => `<span>${escapeHtml(name)}</span>`).join('')}</div>`;
        } else {
            assignedStudents = '<div class="assigned-list"><span>—</span></div>';
        }

        return `
            <tr data-assessor-index="${i}">
                <td>${escapeHtml(assessor.id)}</td>
                <td>${escapeHtml(assessor.name)}</td>
                <td>${escapeHtml(assessor.role || '—')}</td>
                <td>${escapeHtml(assessor.dept || '—')}</td>
                <td>${escapeHtml(assessor.email)}</td>
                <td>${escapeHtml(assessor.contact)}</td>
                <td>${assignedStudents}</td>
                <td class="action-cell">
                    <button class="table-btn" id="edit-assessor-btn" data-index="${i}">Edit</button>
                    <button class="table-btn" id="delete-assessor-btn" data-index="${i}">Delete</button>
                </td>
            </tr>`;
    }).join('');

    if (isAssessorAddFormVisible) {
        insertAssessorAddForm();
    }

    document.querySelectorAll('#edit-assessor-btn, [id^="edit-assessor-btn"]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const idx = parseInt(btn.dataset.index);
            enableEditAssessorRow(idx);
        });
    });

    document.querySelectorAll('#delete-assessor-btn, [id^="delete-assessor-btn"]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const idx = parseInt(btn.dataset.index);
            deleteAssessor(idx);
        });
    });
}

function syncAssignedStudentIds() {
    // Clear all assessor's assignedStudentIds
    assessorList.forEach(assessor => {
        assessor.assignedStudentIds = [];
    });

    // Rebuild from studentList
    studentList.forEach(student => {
        if (student.assigned_assessor && student.assigned_assessor !== '—' && student.assigned_assessor !== '') {
            const assessor = assessorList.find(a => a.name === student.assigned_assessor);
            if (assessor && !assessor.assignedStudentIds.includes(student.id)) {
                assessor.assignedStudentIds.push(student.id);
            }
        }
    });

    saveDataToLocalStorage();
}

// EDIT ASSESSOR DETAILS FOR EACH ROW
function enableEditAssessorRow(index) {
    const assessor = assessorList[index];
    const row = DOM.assessorTbody.querySelector(`tr[data-assessor-index="${index}"]`);
    if (!row) return;

    row.innerHTML = `
        <td><input type="text" value="${assessor.id || ''}" id="edit_assessor_id_${index}" style="width:70px; padding:3px;"></td>
        <td><input type="text" value="${assessor.name || ''}" id="edit_assessor_name_${index}" style="width:100px; padding:3px;"></td>
        <td><input type="text" value="${assessor.role || ''}" id="edit_assessor_role_${index}" style="width:100px; padding:3px;"></td>
        <td><input type="text" value="${assessor.dept || ''}" id="edit_assessor_dept_${index}" style="width:100px; padding:3px;"></td>
        <td><input type="email" value="${assessor.email || ''}" id="edit_assessor_email_${index}" style="width:120px; padding:3px;"></td>
        <td><input type="tel" value="${assessor.contact || ''}" id="edit_assessor_contact_${index}" style="width:100px; padding:3px;"></td>
        <td><input type="text" value="${assessor.assignedStudentIds ? assessor.assignedStudentIds.join(', ') : ''}" id="edit_assessor_students_${index}" style="width:100px; padding:3px;" placeholder="S1001, S1002"></td>
        <td class="action-cell">
            <button class="table-btn" id="save-assessor-btn-${index}" data-index="${index}">Save</button>
            <button class="table-btn" id="cancel-assessor-btn-${index}" data-index="${index}">Cancel</button>
        </td>
    `;

    document.getElementById(`save-assessor-btn-${index}`).addEventListener('click', () => saveAssessorEdit(index));
    document.getElementById(`cancel-assessor-btn-${index}`).addEventListener('click', () => renderAllTables());
}

// SAVE ASSESSOR DETAILS CHANGES
function saveAssessorEdit(index) {
    const studentIdsInput = document.getElementById(`edit_assessor_students_${index}`).value;
    const studentIdsArray = studentIdsInput ? studentIdsInput.split(',').map(id => id.trim()) : [];
    const newAssessorName = document.getElementById(`edit_assessor_name_${index}`).value;
    const oldAssessor = assessorList[index];

    // Check if any of these students are already assigned to other assessors (excluding current assessor)
    for (const studentId of studentIdsArray) {
        const existingAssessorName = isStudentAlreadyAssigned(studentId, oldAssessor.id);
        if (existingAssessorName) {
            const student = studentList.find(s => s.id === studentId);
            alert(`Student ${studentId} (${student ? student.name : 'Unknown'}) is already assigned to assessor "${existingAssessorName}"`);
            return;
        }
    }

    const newAssessor = {
        id: document.getElementById(`edit_assessor_id_${index}`).value,
        name: newAssessorName,
        role: document.getElementById(`edit_assessor_role_${index}`).value,
        dept: document.getElementById(`edit_assessor_dept_${index}`).value,
        email: document.getElementById(`edit_assessor_email_${index}`).value,
        contact: document.getElementById(`edit_assessor_contact_${index}`).value,
        assignedStudentIds: studentIdsArray
    };

    if (oldAssessor.assignedStudentIds) {
        for (const oldStudentId of oldAssessor.assignedStudentIds) {
            if (!studentIdsArray.includes(oldStudentId)) {
                const student = studentList.find(s => s.id === oldStudentId);
                if (student && student.assigned_assessor === oldAssessor.name) {
                    student.assigned_assessor = '';
                }
            }
        }
    }

    for (const studentId of studentIdsArray) {
        const student = studentList.find(s => s.id === studentId);
        if (student) {
            student.assigned_assessor = newAssessorName;
        }
    }

    assessorList[index] = newAssessor;
    renderAllTables();
}

// DELETE ASSESSOR DETAILS
function deleteAssessor(index) {
    if (confirm('Are you sure you want to delete this assessor?')) {
        assessorList.splice(index, 1);
        renderAllTables();
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
    const assignedStudents = assignedIds.map(id => studentList.find(s => s.id === id)).filter(Boolean);

    const pending = [];
    const completed = [];

    assignedStudents.forEach(student => {
        if (checkIfStudentEvaluated(student.id, assessor.id)) {
            const evalData = assessorEvaluations[`${assessor.id}_${student.id}`];
            completed.push({ ...student, evaluation: evalData });
        } else if (student.status !== 'Evaluated' && student.status !== 'Ongoing') {
            pending.push(student);
        }
    });

    document.getElementById('pendingCount').textContent = pending.length;
    document.getElementById('completedCount').textContent = completed.length;

    renderPendingTable(pending, assessor);

    renderCompletedTable(completed, assessor);
}

function renderPendingTable(pending, assessor) {
    if (!DOM.pendingTbody) return;

    if (pending.length === 0) {
        DOM.pendingTbody.innerHTML = `<tr><td colspan="8" style="text-align:center; color: #101b72;">No pending evaluations</td></tr>`;
        return;
    }

    DOM.pendingTbody.innerHTML = pending.map(student => `
            <tr>
                <td>${escapeHtml(student.id)}</td>
                <td>${escapeHtml(student.name)}</td>
                <td>${escapeHtml(student.programme)}</td>
                <td>${escapeHtml(student.company)}</td>
                <td>${escapeHtml(student.year)}</td>
                <td>${escapeHtml(student.email)}</td>
                <td>${escapeHtml(student.contact)}</td>
                <td>${escapeHtml(student.status)}</td>
                <td class ="action-cell">
                    <button class="table-btn" id="evaluate-btn" data-student-id="${student.id}" data-assessor-id="${assessor.id}">
                        Evaluate
                    </button>
                </td>
            </tr>
            `).join('');

    document.querySelectorAll('#evaluate-btn, [id^="evaluate-btn"]').forEach(btn => {
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
        DOM.completedTbody.innerHTML = `<tr><td colspan="9" style="text-align:center; color: #101b72;">No completed evaluations</td></tr>`;
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
                    <button class="table-btn" id="view-btn" data-student-id="${student.id}" data-assessor-id="${assessor.id}">
                        View
                    </button>
                </td>
            </tr>
        `;
    }).join('');

    document.querySelectorAll('#view-btn, [id^="view-btn"]').forEach(btn => {
        btn.addEventListener('click', () => {
            sessionStorage.setItem('viewStudentId', btn.getAttribute('data-student-id'));
            sessionStorage.setItem('viewAssessorId', btn.getAttribute('data-assessor-id'));
            sessionStorage.setItem('viewMode', 'true');
            window.location.href = 'evaluation.html';
        });
    });
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
// ============================================
/* BEGIN INITIALIZATION */
// =============================================

function init() {
    loadDataFromLocalStorage();
    loadEvaluations();
    renderAllTables();
    setupRowDelegation();
    setupLoginForm();
    setupEventListeners();
    observeTableChanges();
    checkLogin();
    setTimeout(setTableHeight, 100);
}

init();