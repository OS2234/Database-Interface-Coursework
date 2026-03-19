const wrapper = document.querySelector('.wrapper');
const btnPopup = document.querySelector('.login_btn');
const iconClose = document.querySelector('.icon-close');

btnPopup.addEventListener('click', () => {
    wrapper.classList.add('active-popup');
})

iconClose.addEventListener('click', () => {
    wrapper.classList.remove('active-popup');
})

function setTableHeightToTwoRows() {
    const scrollableTables = document.querySelectorAll('.scrollable-table');

    scrollableTables.forEach(tableContainer => {

        const firstRow = tableContainer.querySelector('tbody tr');
        const header = tableContainer.querySelector('thead');

        if (firstRow && header) {

            const rowHeight = firstRow.offsetHeight;
            const headerHeight = header.offsetHeight;
            const totalHeight = headerHeight + (2 * rowHeight) + 2;

            tableContainer.style.maxHeight = totalHeight + 'px';
        }
    });
}

function observeTableChanges() {
    const studentTable = document.getElementById('studentTable');
    const assessorTable = document.getElementById('assessorTable');

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
    }, 50); // Small delay to ensure DOM is fully rendered
}

// ============================================
// ADMIN DASHBOARD FUNCTIONALITY
// ============================================

let studentList = [];

const demoSessionsStudents = [
    { id: 'S1001', name: 'Emma Watson', programme: 'Computer Science', company: 'Innovate Tech', year: '2023', email: 'emma.w@student.com', contact: '111-222-3333', status: "Inactive", assigned_assessor: "Mr.Johnson" },
    { id: 'S1002', name: 'James Brown', programme: 'Engineering', company: 'BuildCorp', year: '2022', email: 'j.brown@student.com', contact: '444-555-6666', status: "Inactive", assigned_assessor: "Mr.David" },
    { id: 'S1003', name: 'Luis Chen', programme: 'Business', company: 'FinGroup', year: '2024', email: 'l.chen@student.com', contact: '777-888-9999', status: "Inactive", assigned_assessor: "Mrs.Janice" },
    { id: 'S1004', name: 'Alice Johnson', programme: 'Computer Science', company: 'Tech Solutions', year: '2023', email: 'alice.j@student.com', contact: '222-333-4444', status: "Inactive", assigned_assessor: "Mr.Johnson" },
    { id: 'S1005', name: 'Robert Williams', programme: 'Engineering', company: 'AeroSpace Ltd', year: '2022', email: 'r.williams@student.com', contact: '555-666-7777', status: "Inactive", assigned_assessor: "Mr.Thomson" }
];
studentList = JSON.parse(JSON.stringify(demoSessionsStudents));

let assessorList = [];

let demoassessorList = [
    { id: 'A001', name: 'Jane Smith', role: 'Senior Assessor', dept: 'Computer Science', email: 'jane.smith@nottingham.edu', contact: '987-654-3210', assignedStudentIds: ['S1001', 'S1002', 'S1003'] },
    { id: 'A002', name: 'Alan Grant', role: 'Assessor', dept: 'Engineering', email: 'a.grant@nottingham.edu', contact: '456-123-7890', assignedStudentIds: [] },
    { id: 'A003', name: 'Elena Carter', role: 'Internship coordinator', dept: 'Business', email: 'e.carter@nottingham.edu', contact: '321-654-0987', assignedStudentIds: [] }
];
assessorList = JSON.parse(JSON.stringify(demoassessorList));

//DOM Elements
const studentTbody = document.getElementById('studentTableBody');
const assessorTbody = document.getElementById('assessorTableBody');
const addStudentBtn = document.getElementById('addStudentBtn');
const addAssessorBtn = document.getElementById('addAssessorBtn');
const loginForm = document.querySelector('.form-box-login form');

function sortStudentList() {
    studentList.sort((a, b) => a.name.localeCompare(b.name));
}

function sortAssessorList() {
    assessorList.sort((a, b) => a.name.localeCompare(b.name));
}

function renderStudentTable() {
    if (!studentTbody) return;

    sortStudentList();

    if (studentList.length === 0) {
        studentTbody.innerHTML = `<tr><td colspan="10" style="color:darkblue; background:lightcyan; text-align:center; padding:5px;">No students added yet. Click "Add new student" to begin.</td></tr>`;
        afterTableRender();
        return;
    }

    let html = '';
    studentList.forEach((student, index) => {
        html += `<tr data-index="${index}">
            <td style="white-space: nowrap;">${student.id || '—'}</td>
            <td style="white-space: nowrap;">${student.name || '—'}</td>
            <td style="white-space: nowrap;">${student.programme || '—'}</td>
            <td style="white-space: nowrap;">${student.company || '—'}</td>
            <td style="white-space: nowrap;">${student.year || '—'}</td>
            <td style="white-space: nowrap;">${student.email || '—'}</td>
            <td style="white-space: nowrap;">${student.contact || '—'}</td>
            <td style="white-space: nowrap;">${student.status || '—'}</td>
            <td style="white-space: nowrap;">${student.assigned_assessor || '—'}</td>
            <td class="action-cell">
                <button class="edit-student-btn" data-index="${index}">Edit</button>
                <button class="delete-student-btn" data-index="${index}">Delete</button>
            </td>
        </tr>`;
    });

    studentTbody.innerHTML = html;

    afterTableRender();

    document.querySelectorAll('.edit-student-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const idx = e.target.getAttribute('data-index');
            enableEditStudentRow(parseInt(idx));
        });
    });

    document.querySelectorAll('.delete-student-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const idx = e.target.getAttribute('data-index');
            deleteStudent(parseInt(idx));
        });
    });

}

function renderAssessorTable() {
    if (!assessorTbody) return;

    sortAssessorList();

    if (assessorList.length === 0) {
        assessorTbody.innerHTML = `<tr><td colspan="8" style="color:darkblue; background:lightcyan; text-align:center; padding:5px;">No students added yet. Click "Add new student" to begin.</td></tr>`;
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
                .join(', ');

            assignedStudents = studentNames || assessor.assignedStudentIds.join(', ');
        } else {
            assignedStudents = '—';
        }

        html += `<tr data-index="${index}">
            <td style="white-space: nowrap;">${assessor.id || '—'}</td>
            <td style="white-space: nowrap;">${assessor.name || '—'}</td>
            <td style="white-space: nowrap;">${assessor.role || '—'}</td>
            <td style="white-space: nowrap;">${assessor.dept || '—'}</td>
            <td style="white-space: nowrap;">${assessor.email || '—'}</td>
            <td style="white-space: nowrap;">${assessor.contact || '—'}</td>
            <td style="white-space: nowrap;">${assignedStudents}</td>
            <td class="action-cell">
                <button class="edit-assessor-btn" data-index="${index}">Edit</button>
                <button class="delete-assessor-btn" data-index="${index}">Delete</button>
            </td>
        </tr>`;
    });

    afterTableRender();

    assessorTbody.innerHTML = html;

    document.querySelectorAll('.edit-assessor-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const idx = e.target.getAttribute('data-index');
            enableEditAssessorRow(parseInt(idx));
        });
    });

    document.querySelectorAll('.delete-assessor-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const idx = e.target.getAttribute('data-index');
            deleteAssessor(parseInt(idx));
        });
    });

}

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
            <button class="save-student-btn" data-index="${index}">Save</button>
            <button class="cancel-student-btn" data-index="${index}">Cancel</button>
        </td>
    `;

    row.querySelector('.save-student-btn').addEventListener('click', () => saveStudentEdit(index));
    row.querySelector('.cancel-student-btn').addEventListener('click', () => renderStudentTable());
}

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
            <button class="save-assessor-btn" data-index="${index}">Save</button>
            <button class="cancel-assessor-btn" data-index="${index}">Cancel</button>
        </td>
    `;

    row.querySelector('.save-assessor-btn').addEventListener('click', () => saveAssessorEdit(index));
    row.querySelector('.cancel-assessor-btn').addEventListener('click', () => renderAssessorTable());
}

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
    renderStudentTable();
}

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
    renderAssessorTable();
}

function deleteStudent(index) {
    if (confirm('Are you sure you want to delete this student?')) {
        studentList.splice(index, 1);
        renderStudentTable();
    }
}

function deleteAssessor(index) {
    if (confirm('Are you sure you want to delete this assessor?')) {
        assessorList.splice(index, 1);
        renderAssessorTable();
    }
}

function addNewStudent() {
    const newId = prompt('Enter Student ID:', 'S' + Math.floor(1000 + Math.random() * 9000));
    if (!newId) return;

    const newName = prompt('Enter full name:');
    if (!newName) return;

    const prog = prompt('Programme:', 'Computer Science') || '';
    const comp = prompt('Internship company:', '') || '';
    const year = prompt('Enrollment year:', '2025') || '';
    const email = prompt('Email:', 'student@example.com') || '';
    const contact = prompt('Contact:', '000-000-0000') || '';
    const status = prompt('Status:', 'Ongoing Internship') || '';
    const assigned_assessor = prompt('Assigned Assessor', 'Mr.David') || '';

    studentList.push({
        id: newId,
        name: newName,
        programme: prog,
        company: comp,
        year: year,
        email: email,
        contact: contact,
        status: status,
        assigned_assessor: assigned_assessor
    });

    renderStudentTable();
}

function addNewAssessor() {
    const newId = prompt('Enter Assessor ID:', 'A' + Math.floor(1000 + Math.random() * 9000));
    if (!newId) return;

    const newName = prompt('Enter full name:');
    if (!newName) return;

    const role = prompt('Role:', 'Assessor') || '';
    const dept = prompt('Department:', 'Computer Science') || '';
    const email = prompt('Email:', 'assessor@nottingham.edu') || '';
    const contact = prompt('Contact:', '000-000-0000') || '';
    const assignedStudents = prompt('Assigned Student IDs (comma separated):', '') || '';

    const assignedStudentIds = assignedStudents ? assignedStudents.split(',').map(id => id.trim()) : [];

    assessorList.push({
        id: newId,
        name: newName,
        role: role,
        dept: dept,
        email: email,
        contact: contact,
        assignedStudentIds: assignedStudentIds // Fixed property name
    });

    renderAssessorTable();
}

window.addEventListener('resize', () => {
    setTableHeightToTwoRows();
});

// ============================================
// LOGIN SIMULATION
// ============================================

document.addEventListener('DOMContentLoaded', function () {

    renderStudentTable();
    renderAssessorTable();

    if (loginForm) {
        loginForm.addEventListener('submit', function (e) {
            e.preventDefault();

            wrapper.classList.remove('active-popup');

            const loginBtn = document.querySelector('.login_btn');
            if (loginBtn) {
                loginBtn.textContent = 'LOGOUT';
                loginBtn.style.background = 'darkred';
            }

            alert('Logged in successfully as Administrator');
        });
    }

    if (addStudentBtn) {
        addStudentBtn.addEventListener('click', addNewStudent);
    }

    if (addAssessorBtn) {
        addAssessorBtn.addEventListener('click', addNewAssessor);
    }

    const loginBtn = document.querySelector('.login_btn');
    if (loginBtn) {
        loginBtn.addEventListener('click', function () {
            if (this.textContent === 'LOGOUT') {

                this.textContent = 'LOGIN';
                this.style.background = 'transparent';
                alert('Logged out successfully');

            }
        });

        setTimeout(() => {
            setTableHeightToTwoRows();
            observeTableChanges();
        }, 100);
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