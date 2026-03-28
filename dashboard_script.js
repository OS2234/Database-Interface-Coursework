const wrapper = document.querySelector('.wrapper');
const btnPopup = document.querySelector('.login_btn');
const iconClose = document.querySelector('.icon-close');

btnPopup.addEventListener('click', () => {
    wrapper.classList.add('active-popup');
})

iconClose.addEventListener('click', () => {
    wrapper.classList.remove('active-popup');
})

// ============================================
// SET DYNAMIC TABLE HEIGHT
// ============================================

function setTableHeightToTwoRows() {
    const scrollableTables = document.querySelectorAll('.scrollable-table');

    scrollableTables.forEach(tableContainer => {

        const tbody = tableContainer.querySelector('tbody');
        const thead = tableContainer.querySelector('thead');

        if (!thead) return;

        const headerHeight = thead.offsetHeight;

        const rows = tbody ? Array.from(tbody.querySelectorAll('tr')) : [];

        if (rows.length >= 2) {
            const firstRowHeight = rows[0].offsetHeight;
            const secondRowHeight = rows[1].offsetHeight;

            const totalHeight = headerHeight + firstRowHeight + secondRowHeight + 1.5;

            tableContainer.style.maxHeight = totalHeight + 'px';
        } else if (rows.length === 1) {
            const rowHeight = rows[0].offsetHeight;
            const totalHeight = headerHeight + rowHeight;
            tableContainer.style.maxHeight = totalHeight + 'px';
        } else {
            const defaultRowHeight = 45;
            const totalHeight = headerHeight + (2 * defaultRowHeight);
            tableContainer.style.maxHeight = totalHeight + 'px';
        }
    });


}

function observeTableChanges() {
    const accountTable = document.getElementById('accountTable');
    const studentTable = document.getElementById('studentTable');
    const assessorTable = document.getElementById('assessorTable');

    if (accountTable) {
        const observer = new MutationObserver(() => {
            setTimeout(setTableHeightToTwoRows, 100);
        });

        observer.observe(accountTable, {
            childList: true,
            subtree: true,
            attributes: true,
            characterData: true
        });
    }

    if (studentTable) {
        const observer = new MutationObserver(() => {
            setTimeout(setTableHeightToTwoRows, 100);
        });

        observer.observe(studentTable, {
            childList: true,
            subtree: true,
            attributes: true,
            characterData: true
        });
    }

    if (assessorTable) {
        const observer = new MutationObserver(() => {
            setTimeout(setTableHeightToTwoRows, 100);
        });

        observer.observe(assessorTable, {
            childList: true,
            subtree: true,
            attributes: true,
            characterData: true
        });
    }
}

function afterTableRender() {
    setTimeout(() => {
        setTableHeightToTwoRows();
    }, 50);
}

// ============================================
// SAVE AND LOAD DATA FROM LOCAL STORAGE 
// ============================================

function saveDataToLocalStorage() {
    const dataToSave = {
        accountList: accountList,
        studentList: studentList,
        assessorList: assessorList
    };
    localStorage.setItem('internshipEvalData', JSON.stringify(dataToSave));
    console.log('Data saved to localStorage');
}

function loadDataFromLocalStorage() {
    const savedData = localStorage.getItem('internshipEvalData');

    if (savedData) {
        try {
            const parsedData = JSON.parse(savedData);

            // Restore data if it exists
            if (parsedData.accountList && Array.isArray(parsedData.accountList)) {
                accountList = parsedData.accountList;
            } else {
                accountList = JSON.parse(JSON.stringify(demoRegisteredAccounts));
            }

            if (parsedData.studentList && Array.isArray(parsedData.studentList)) {
                studentList = parsedData.studentList;
            } else {
                studentList = JSON.parse(JSON.stringify(demoSessionsStudents));
            }

            if (parsedData.assessorList && Array.isArray(parsedData.assessorList)) {
                assessorList = parsedData.assessorList;
            } else {
                assessorList = JSON.parse(JSON.stringify(demoassessorList));
            }

            console.log('Data loaded from localStorage');
            return true;
        } catch (error) {
            console.error('Error loading data from localStorage:', error);
            return false;
        }
    }
    return false;
}

// ============================================
// LOGIN PERSISTENCE - CROSS-PAGE SESSION
// ============================================

const userInfo = document.getElementById('userInfo');
const usernameDisplay = document.getElementById('usernameDisplay');
const userRoleDisplay = document.getElementById('userRoleDisplay');

// Check if user is already logged in from another page
function checkExistingLogin() {
    const loggedInUser = sessionStorage.getItem('loggedInUser');
    if (loggedInUser) {
        try {
            const user = JSON.parse(loggedInUser);
            if (userInfo && usernameDisplay && userRoleDisplay) {
                usernameDisplay.textContent = user.username;
                userRoleDisplay.textContent = user.userRole;
                userInfo.style.display = 'flex';
                const loginBtn = document.querySelector('.login_btn');
                if (loginBtn) {
                    loginBtn.textContent = 'LOGOUT';
                    loginBtn.classList.add('logout-state');
                }
                // Close login popup if it's open
                if (wrapper) {
                    wrapper.classList.remove('active-popup');
                }
            }
        } catch (e) {
            console.error('Error parsing logged in user:', e);
        }
    }
}

function saveLoginState(user) {
    sessionStorage.setItem('loggedInUser', JSON.stringify(user));
}

function clearLoginState() {
    sessionStorage.removeItem('loggedInUser');
}

// ============================================
// ADMIN DASHBOARD FUNCTIONALITY
// ============================================

function initData() {
    const loaded = loadDataFromLocalStorage();

    if (!loaded) {
        // If no saved data, use demo data
        studentList = JSON.parse(JSON.stringify(demoSessionsStudents));
        assessorList = JSON.parse(JSON.stringify(demoassessorList));
        accountList = JSON.parse(JSON.stringify(demoRegisteredAccounts));
        console.log('Using demo data');
    }
}

function renderAllTables() {
    renderAccountTable();
    renderStudentTable();
    renderAssessorTable();

    attachRowSelectionHandler(accountTbody);
    attachRowSelectionHandler(studentTbody);
    attachRowSelectionHandler(assessorTbody);

    saveDataToLocalStorage();
}

//DOM Elements
const accountTbody = document.getElementById('accountTableBody');
const studentTbody = document.getElementById('studentTableBody');
const assessorTbody = document.getElementById('assessorTableBody');
const addAccountBtn = document.getElementById('addAccountBtn');
const addStudentBtn = document.getElementById('addStudentBtn');
const addAssessorBtn = document.getElementById('addAssessorBtn');
const loginForm = document.querySelector('.form-box-login form');


//===============================================================================
//SELECT ROWS FUNCTION
//=====================================================================================

function clearAllTableSelections() {
    const allTableBodies = [accountTbody, studentTbody, assessorTbody];
    allTableBodies.forEach(tableBody => {
        if (tableBody) {
            const rows = tableBody.querySelectorAll('tr');
            rows.forEach(row => {
                row.classList.remove('selected-row');
            });
        }
    });
}


function setupClickOutsideDetection() {
    document.addEventListener('click', function (event) {
        const isOnTableRow = event.target.closest('.scrollable-table tbody tr');
        const isOnAddButton = event.target.closest('.add-btn');
        const isOnTableCellButton = event.target.closest('.table-btn');

        // If click is not on a table row and not on add button, clear selections
        if (!isOnTableRow && !isOnAddButton && !isOnTableCellButton) {
            clearAllTableSelections();
        }
    });
}

function attachRowSelectionHandler(tableBody) {
    if (!tableBody) return;
    const rows = tableBody.querySelectorAll('tr');

    rows.forEach(row => {
        if (row._clickHandler) {
            row.removeEventListener('click', row._clickHandler);
        }

        const handler = (e) => {
            if (e.target.closest('.table-btn') ||
                e.target.closest('button') ||
                e.target.closest('input') ||
                e.target.closest('.add-save-btn') ||
                e.target.closest('.add-cancel-btn')) {
                return;
            }
            clearAllTableSelections();
            row.classList.add('selected-row');
        };
        row._clickHandler = handler;
        row.addEventListener('click', handler);
    });
}


// ============================================
// REGISTERED ACCOUNT TABLE FUNCTIONALITY  
// ============================================

let accountList = [];
let isAccountAddFormVisible = false;

const demoRegisteredAccounts = [
    { username: 'John', email: 'admin123@gmail.com', password: '123456', userRole: 'Administrator', contact: '011 672 9343', createdAt: '31/12/2025' },
    { username: 'John Smith', email: 'admin124@gmail.com', password: '123457', userRole: 'Administrator', contact: '016 832 7170', createdAt: '31/11/2025' },
    { username: 'Alan Walker', email: 'admin125@gmail.com', password: '123458', userRole: 'Administrator', contact: '016 874 1944', createdAt: '31/10/2025' },
    { username: 'Mark Kiplier', email: 'admin126@gmail.com', password: '123459', userRole: 'Administrator', contact: '016 274 3974', createdAt: '30/9/2025' }
]

// SORT BY USERNAME ALPHABETICAL ORDER
function sortAccountList() {
    accountList.sort((a, b) => a.username.localeCompare(b.username));
}

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
        <td><input type="text" id="add_account_contact" placeholder="Contact" style="width:110px"></td>
        <td><input type="text" id="add_account_date" placeholder="Date" style="width:70px"></td>
        <td class="action-cell">
            <div class="action-buttons">
                <button class="add-save-btn" id="saveAccountAddBtn">Save</button>
                <button class="add-cancel-btn" id="cancelAccountAddBtn">Cancel</button>
            </div>
        </td>
    `;

    if (accountTbody.firstChild) {
        accountTbody.insertBefore(addRow, accountTbody.firstChild);
    } else {
        accountTbody.appendChild(addRow);
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

    const newAccount = {
        username: newUsername,
        email: document.getElementById('add_account_email').value.trim(),
        password: document.getElementById('add_account_password').value.trim(),
        userRole: document.getElementById('add_account_role').value.trim(),
        contact: document.getElementById('add_account_contact').value.trim(),
        createdAt: document.getElementById('add_account_date').value.trim()
    };

    accountList.push(newAccount);
    isAccountAddFormVisible = false;
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

    clearAllTableSelections();

    isAccountAddFormVisible = true;
    renderAccountTable();
}

// RENDER REGISTERED ACCOUNT TABLE
function renderAccountTable() {
    if (!accountTbody) return;

    sortAccountList();

    if (accountList.length === 0) {
        accountTbody.innerHTML = `<tr><td colspan="6" style="color:darkblue; background:lightcyan; text-align:center; padding:5px;">No accounts added yet. Click "Add new account" to begin.</td></tr>`;
        afterTableRender();
        return;
    }

    let html = '';
    accountList.forEach((account, index) => {
        html += `<tr data-index="${index}">
            <td>${account.username || '—'}</td>
            <td>${account.email || '—'}</td>
            <td>${account.password || '—'}</td>
            <td>${account.userRole || '—'}</td>
            <td>${account.contact || '—'}</td>
            <td>${account.createdAt || '—'}</td>

            <td class="action-cell">
                <button class="table-btn" id="edit-account-btn" data-index="${index}">Edit</button>
                <button class="table-btn" id="delete-account-btn" data-index="${index}">Delete</button>
            </td>
        </tr>`;
    });

    accountTbody.innerHTML = html;

    if (isAccountAddFormVisible) {
        insertAccountAddForm();
    }

    afterTableRender();

    document.querySelectorAll('#edit-account-btn, [id^="edit-account-btn"]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const idx = e.target.getAttribute('data-index');
            enableEditAccountRow(parseInt(idx));
        });
    });

    document.querySelectorAll('#delete-account-btn, [id^="delete-account-btn"]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const idx = e.target.getAttribute('data-index');
            deleteAccount(parseInt(idx));
        });
    });
}

// EDIT ACCOUNT DETAILS FOR EACH ROW
function enableEditAccountRow(index) {
    const account = accountList[index];
    const row = accountTbody.querySelector(`tr[data-index="${index}"]`);
    if (!row) return;

    row.innerHTML = `
        <td><input type="text" value="${account.username || ''}" id="edit_account_username_${index}" style="width:70px; padding:3px;"></td>
        <td><input type="email" value="${account.email || ''}" id="edit_account_email_${index}" style="width:100px; padding:3px;"></td>
        <td><input type="text" value="${account.password || ''}" id="edit_account_password_${index}" style="width:100px; padding:3px;"></td>
        <td><input type="text" value="${account.userRole || ''}" id="edit_account_role_${index}" style="width:100px; padding:3px;"></td>
        <td><input type="text" value="${account.contact || ''}" id="edit_account_contact_${index}" style="width:100px; padding:3px;"></td>
        <td><input type="text" value="${account.createdAt || ''}" id="edit_account_date_${index}" style="width:70px; padding:3px;"></td>

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
    const newAccount = {
        username: document.getElementById(`edit_account_username_${index}`).value,
        email: document.getElementById(`edit_account_email_${index}`).value,
        password: document.getElementById(`edit_account_password_${index}`).value,
        userRole: document.getElementById(`edit_account_role_${index}`).value,
        contact: document.getElementById(`edit_account_contact_${index}`).value,
        createdAt: document.getElementById(`edit_account_date_${index}`).value
    };

    accountList[index] = newAccount;
    renderAllTables();

}

// DELETE SPECIFIC ACCOUNT ROWS
function deleteAccount(index) {
    if (confirm('Are you sure you want to delete this student?')) {
        accountList.splice(index, 1);
        renderAllTables();
    }
}
// ============================================
// STUDENT TABLE FUNCTIONALITY  
// ============================================

let isStudentAddFormVisible = false;
let studentList = [];

const demoSessionsStudents = [
    { id: 'S1001', name: 'Emma Watson', programme: 'Computer Science', company: 'Innovate Tech', year: '2023', email: 'emma.w@student.com', contact: '111-222-3333', status: "Inactive", assigned_assessor: "Mr.Johnson" },
    { id: 'S1002', name: 'James Brown', programme: 'Engineering', company: 'BuildCorp', year: '2022', email: 'j.brown@student.com', contact: '444-555-6666', status: "Inactive", assigned_assessor: "Mr.David" },
    { id: 'S1003', name: 'Luis Chen', programme: 'Business', company: 'FinGroup', year: '2024', email: 'l.chen@student.com', contact: '777-888-9999', status: "Inactive", assigned_assessor: "Mrs.Janice" },
    { id: 'S1004', name: 'Alice Johnson', programme: 'Computer Science', company: 'Tech Solutions', year: '2023', email: 'alice.j@student.com', contact: '222-333-4444', status: "Inactive", assigned_assessor: "Mr.Johnson" },
    { id: 'S1005', name: 'Robert Williams', programme: 'Engineering', company: 'AeroSpace Ltd', year: '2022', email: 'r.williams@student.com', contact: '555-666-7777', status: "Inactive", assigned_assessor: "Mr.Thomson" }
];

// SORT STUDENT LIST BY STUDENT ID
function sortStudentList() {
    studentList.sort((a, b) => {
        const numA = parseInt(a.id.replace(/\D/g, '')) || 0;
        const numB = parseInt(b.id.replace(/\D/g, '')) || 0;
        return numA - numB;
    });
}

// INSERT NEW ROW TO ADD NEW STUDENT DETAILS
function insertStudentAddForm() {
    const addRow = document.createElement('tr');
    addRow.className = 'add-form-row';
    addRow.id = 'student-add-form-row';

    addRow.innerHTML = `
        <td><input type="text" id="add_student_id" placeholder="S1006" style="width:80px"></td>
        <td><input type="text" id="add_student_name" placeholder="Full name" style="width:110px"></td>
        <td><input type="text" id="add_programme" placeholder="Programme" style="width:110px"></td>
        <td><input type="text" id="add_company" placeholder="Company" style="width:110px"></td>
        <td><input type="text" id="add_year" placeholder="Year" style="width:70px"></td>
        <td><input type="email" id="add_email" placeholder="Email" style="width:130px"></td>
        <td><input type="text" id="add_contact" placeholder="Contact" style="width:100px"></td>
        <td><input type="text" id="add_status" placeholder="Status" style="width:100px"></td>
        <td><input type="text" id="add_assessor" placeholder="Assessor" style="width:110px"></td>
        <td class="action-cell">
            <div class="action-buttons">
                <button class="add-save-btn" id="saveStudentAddBtn">Save</button>
                <button class="add-cancel-btn" id="cancelStudentAddBtn">Cancel</button>
            </div>
        </td>
    `;

    if (studentTbody.firstChild) {
        studentTbody.insertBefore(addRow, studentTbody.firstChild);
    } else {
        studentTbody.appendChild(addRow);
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

    const newStudent = {
        id: newId,
        name: newName,
        programme: document.getElementById('add_programme').value.trim(),
        company: document.getElementById('add_company').value.trim(),
        year: document.getElementById('add_year').value.trim(),
        email: document.getElementById('add_email').value.trim(),
        contact: document.getElementById('add_contact').value.trim(),
        status: document.getElementById('add_status').value.trim(),
        assigned_assessor: document.getElementById('add_assessor').value.trim()
    };

    studentList.push(newStudent);
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

    clearAllTableSelections();

    isStudentAddFormVisible = true;
    renderStudentTable();
}

// RENDER STUDENT TABLE
function renderStudentTable() {
    if (!studentTbody) return;

    sortStudentList();

    if (studentList.length === 0) {
        studentTbody.innerHTML = `<tr><td colspan="9" style="color:darkblue; background:lightcyan; text-align:center; padding:5px;">No students added yet. Click "Add new student" to begin.</td></tr>`;
        afterTableRender();
        return;
    }

    let html = '';
    studentList.forEach((student, index) => {
        html += `<tr data-index="${index}">
            <td>${student.id || '—'}</td>
            <td>${student.name || '—'}</td>
            <td>${student.programme || '—'}</td>
            <td>${student.company || '—'}</td>
            <td>${student.year || '—'}</td>
            <td>${student.email || '—'}</td>
            <td>${student.contact || '—'}</td>
            <td>${student.status || '—'}</td>
            <td>${student.assigned_assessor || '—'}</td>
            <td class="action-cell">
                <button class="table-btn" id="edit-student-btn" data-index="${index}">Edit</button>
                <button class="table-btn" id="delete-student-btn" data-index="${index}">Delete</button>
            </td>
        </tr>`;
    });

    studentTbody.innerHTML = html;

    if (isStudentAddFormVisible) {
        insertStudentAddForm();
    }

    afterTableRender();

    document.querySelectorAll('#edit-student-btn, [id^="edit-student-btn"]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const idx = e.target.getAttribute('data-index');
            enableEditStudentRow(parseInt(idx));
        });
    });

    document.querySelectorAll('#delete-student-btn, [id^="delete-student-btn"]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const idx = e.target.getAttribute('data-index');
            deleteStudent(parseInt(idx));
        });
    });

}

// EDIT STUDENT DETAILS FOR EACH ROW
function enableEditStudentRow(index) {
    const student = studentList[index];
    const row = studentTbody.querySelector(`tr[data-index="${index}"]`);
    if (!row) return;

    row.innerHTML = `
        <td><input type="text" value="${student.id || ''}" id="edit_id_${index}" style="width:70px; padding:3px;"></td>
        <td><input type="text" value="${student.name || ''}" id="edit_name_${index}" style="width:100px; padding:3px;"></td>
        <td><input type="text" value="${student.programme || ''}" id="edit_prog_${index}" style="width:100px; padding:3px;"></td>
        <td><input type="text" value="${student.company || ''}" id="edit_comp_${index}" style="width:100px; padding:3px;"></td>
        <td><input type="text" value="${student.year || ''}" id="edit_year_${index}" style="width:70px; padding:3px;"></td>
        <td><input type="email" value="${student.email || ''}" id="edit_email_${index}" style="width:120px; padding:3px;"></td>
        <td><input type="text" value="${student.contact || ''}" id="edit_contact_${index}" style="width:100px; padding:3px;"></td>
        <td><input type="text" value="${student.status || ''}" id="edit_status_${index}" style="width:70px; padding:3px;"></td>
        <td><input type="text" value="${student.assigned_assessor || ''}" id="edit_assigned_assessor_${index}" style="width:100px; padding:3px;"></td>
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
    const newStudent = {
        id: document.getElementById(`edit_id_${index}`).value,
        name: document.getElementById(`edit_name_${index}`).value,
        programme: document.getElementById(`edit_prog_${index}`).value,
        company: document.getElementById(`edit_comp_${index}`).value,
        year: document.getElementById(`edit_year_${index}`).value,
        email: document.getElementById(`edit_email_${index}`).value,
        contact: document.getElementById(`edit_contact_${index}`).value,
        status: document.getElementById(`edit_status_${index}`).value,
        assigned_assessor: document.getElementById(`edit_assigned_assessor_${index}`).value,
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
let assessorList = [];

let demoassessorList = [
    { id: 'A001', name: 'Jane Smith', role: 'Senior Assessor', dept: 'Computer Science', email: 'jane.smith@nottingham.edu', contact: '987-654-3210', assignedStudentIds: ['S1001', 'S1002', 'S1003'] },
    { id: 'A002', name: 'Alan Grant', role: 'Assessor', dept: 'Engineering', email: 'a.grant@nottingham.edu', contact: '456-123-7890', assignedStudentIds: [] },
    { id: 'A003', name: 'Elena Carter', role: 'Internship coordinator', dept: 'Business', email: 'e.carter@nottingham.edu', contact: '321-654-0987', assignedStudentIds: [] }
];

// SORT ASSESSOR TABLE BY ID
function sortAssessorList() {
    assessorList.sort((a, b) => {
        const numA = parseInt(a.id.replace(/\D/g, '')) || 0;
        const numB = parseInt(b.id.replace(/\D/g, '')) || 0;
        return numA - numB;
    });
}

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
        <td><input type="text" id="add_assessor_contact" placeholder="Contact" style="width:100px"></td>
        <td><input type="text" id="add_assessor_students" placeholder="Student IDs (comma)" style="width:140px"></td>
        <td class="action-cell">
            <div class="action-buttons">
                <button class="add-save-btn" id="saveAssessorAddBtn">Save</button>
                <button class="add-cancel-btn" id="cancelAssessorAddBtn">Cancel</button>
            </div>
        </td>
    `;

    if (assessorTbody.firstChild) {
        assessorTbody.insertBefore(addRow, assessorTbody.firstChild);
    } else {
        assessorTbody.appendChild(addRow);
    }

    document.getElementById('saveAssessorAddBtn').addEventListener('click', saveAssessorAdd);
    document.getElementById('cancelAssessorAddBtn').addEventListener('click', cancelAssessorAdd);
    document.getElementById('add_assessor_id').focus();
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

    clearAllTableSelections();

    isAssessorAddFormVisible = true;
    renderAssessorTable();
}

// RENDER ASSESSOR TABLE
function renderAssessorTable() {
    if (!assessorTbody) return;

    sortAssessorList();

    if (assessorList.length === 0) {
        assessorTbody.innerHTML = `<tr><td colspan="7" style="color:darkblue; background:lightcyan; text-align:center; padding:5px;">No students added yet. Click "Add new student" to begin.</td></tr>`;
        afterTableRender();
        return;
    }

    let html = '';
    assessorList.forEach((assessor, index) => {

        let assignedStudents = '';
        if (assessor.assignedStudentIds && assessor.assignedStudentIds.length > 0) {
            const studentNames = assessor.assignedStudentIds
                .map(id => {
                    const student = studentList.find(s => s.id === id);
                    return student ? student.name : id;
                })
                .filter(name => name)

            assignedStudents = `<div class="assigned-list">${studentNames.map(name => `<span>${name}</span>`).join('')}</div>`;
        } else {
            assignedStudents = '<div class="assigned-list"><span>—</span></div>';
        }

        html += `<tr data-index="${index}">
            <td>${assessor.id || '—'}</td>
            <td>${assessor.name || '—'}</td>
            <td>${assessor.role || '—'}</td>
            <td>${assessor.dept || '—'}</td>
            <td>${assessor.email || '—'}</td>
            <td>${assessor.contact || '—'}</td>
            <td>${assignedStudents}</td>
            <td class="action-cell">
                <button class="table-btn" id="edit-assessor-btn" data-index="${index}">Edit</button>
                <button class="table-btn" id="delete-assessor-btn" data-index="${index}">Delete</button>
            </td>
        </tr>`;
    });

    assessorTbody.innerHTML = html;

    if (isAssessorAddFormVisible) {
        insertAssessorAddForm();
    }

    afterTableRender();


    document.querySelectorAll('#edit-assessor-btn, [id^="edit-assessor-btn"]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const idx = e.target.getAttribute('data-index');
            enableEditAssessorRow(parseInt(idx));
        });
    });

    document.querySelectorAll('#delete-assessor-btn, [id^="delete-assessor-btn"]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const idx = e.target.getAttribute('data-index');
            deleteAssessor(parseInt(idx));
        });
    });

}

// EDIT ASSESSOR DETAILS FOR EACH ROW
function enableEditAssessorRow(index) {
    const assessor = assessorList[index];
    const row = assessorTbody.querySelector(`tr[data-index="${index}"]`);
    if (!row) return;

    row.innerHTML = `
        <td><input type="text" value="${assessor.id || ''}" id="edit_assessor_id_${index}" style="width:70px; padding:3px;"></td>
        <td><input type="text" value="${assessor.name || ''}" id="edit_assessor_name_${index}" style="width:100px; padding:3px;"></td>
        <td><input type="text" value="${assessor.role || ''}" id="edit_assessor_role_${index}" style="width:100px; padding:3px;"></td>
        <td><input type="text" value="${assessor.dept || ''}" id="edit_assessor_dept_${index}" style="width:100px; padding:3px;"></td>
        <td><input type="email" value="${assessor.email || ''}" id="edit_assessor_email_${index}" style="width:120px; padding:3px;"></td>
        <td><input type="text" value="${assessor.contact || ''}" id="edit_assessor_contact_${index}" style="width:100px; padding:3px;"></td>
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
    const studentIdsArray = studentIdsInput ? studentIdsInput.split(',').map(id => id.trim()) : []

    const newAssessor = {
        id: document.getElementById(`edit_assessor_id_${index}`).value,
        name: document.getElementById(`edit_assessor_name_${index}`).value,
        role: document.getElementById(`edit_assessor_role_${index}`).value,
        dept: document.getElementById(`edit_assessor_dept_${index}`).value,
        email: document.getElementById(`edit_assessor_email_${index}`).value,
        contact: document.getElementById(`edit_assessor_contact_${index}`).value,
        assignedStudentIds: studentIdsArray
    };

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
// =============================================

initData();

window.addEventListener('resize', () => {
    setTableHeightToTwoRows();
});

// ============================================
// LOGIN SIMULATION
// ============================================

document.addEventListener('DOMContentLoaded', function () {
    initData();

    renderAllTables();

    setupClickOutsideDetection();

    if (loginForm) {
        loginForm.addEventListener('submit', function (e) {
            e.preventDefault();

            const emailInput = this.querySelector('input[type="email"]');
            const passwordInput = this.querySelector('input[type="password"]');
            const enteredEmail = emailInput.value.trim();
            const enteredPassword = passwordInput.value.trim();

            // Make sure accountList is loaded
            if (accountList.length === 0) {
                loadDataFromLocalStorage();
            }

            const matchedAccount = accountList.find(account =>
                account.email === enteredEmail &&
                account.password === enteredPassword
            );

            if (matchedAccount) {
                if (wrapper) {
                    wrapper.classList.remove('active-popup');
                }

                if (userInfo && usernameDisplay && userRoleDisplay) {
                    usernameDisplay.textContent = matchedAccount.username;
                    userRoleDisplay.textContent = matchedAccount.userRole;
                    userInfo.style.display = 'flex';
                    const loginBtn = document.querySelector('.login_btn');
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

    const loginBtn = document.querySelector('.login_btn');
    if (loginBtn) {
        loginBtn.addEventListener('click', function () {
            if (this.textContent === 'LOGOUT') {
                if (userInfo) {
                    userInfo.style.display = 'none';
                }
                this.textContent = 'LOGIN';
                this.classList.remove('logout-state');
                if (wrapper) {
                    wrapper.classList.remove('active-popup');
                }
                clearLoginState();
                alert('Logged out successfully');
            } else {
                if (wrapper) {
                    wrapper.classList.add('active-popup');
                }
                const emailInput = document.querySelector('.wrapper input[type="email"]');
                const passwordInput = document.querySelector('.wrapper input[type="password"]');
                if (emailInput) emailInput.value = '';
                if (passwordInput) passwordInput.value = '';
            }
        });
    }

    checkExistingLogin();

    setTimeout(() => {
        setTableHeightToTwoRows();
        observeTableChanges();
    }, 100);

    if (addStudentBtn) {
        addStudentBtn.addEventListener('click', addNewStudent);
    }

    if (addAssessorBtn) {
        addAssessorBtn.addEventListener('click', addNewAssessor);
    }

    if (addAccountBtn) {
        addAccountBtn.addEventListener('click', addNewAccount);
    }

});

// ============================================
// UTILITY FUNCTIONS
// ============================================

function isValidEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

function formatDate(date) {
    const d = new Date(date);
    return d.toLocaleDateString('en-GB');
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        sortStudentList,
        renderStudentTable,
        addNewStudent,
        isValidEmail,
        formatDate
    };
}