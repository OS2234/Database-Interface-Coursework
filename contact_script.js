const DOM = {
    wrapper: null,
    btnPopup: null,
    iconClose: null,
    loginForm: null,
    userInfo: null,
    usernameDisplay: null,
    userRoleDisplay: null,
    tableBody: null,
    loginBtn: null
};

let accountList = [];
let loggedInUser = null;

// ============================================
// Utility Functions
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

function getSavedData() {
    const saved = localStorage.getItem('internshipEvalData');
    if (saved) {
        try {
            return JSON.parse(saved);
        } catch (e) {
            console.error('Error loading data:', e);
        }
    }
    return null;
}

// ============================================
// Account Loading
// ============================================
function loadAccountsForLogin() {
    const data = getSavedData();
    if (data?.accountList?.length) {
        accountList = data.accountList;
        return true;
    }
    accountList = [];
    return false;
}

// ============================================
// Login State Management
// ============================================

function checkLogin() {
    const loggedIn = sessionStorage.getItem('loggedInUser');

    const user = JSON.parse(loggedIn);
    if (!user) return;

    if (DOM.usernameDisplay && DOM.userRoleDisplay) {
        DOM.usernameDisplay.textContent = user.username;
        DOM.userRoleDisplay.textContent = user.userRole;
        DOM.userInfo.style.display = 'flex';
        if (DOM.loginBtn) {
            DOM.loginBtn.textContent = 'LOGOUT';
            DOM.loginBtn.classList.add('logout-state');
        }
    }
}

// ============================================
// Login Handler
// ============================================

function logout() {
    sessionStorage.removeItem('loggedInUser');
    if (DOM.userInfo) DOM.userInfo.style.display = 'none';
    if (DOM.loginBtn) {
        DOM.loginBtn.textContent = 'LOGIN';
        DOM.loginBtn.classList.remove('logout-state');
    }
    if (DOM.wrapper) DOM.wrapper.classList.remove('active-popup');
    alert('Logged out successfully');
}

function setupLoginForm() {
    const form = document.querySelector('.form-box-login form');
    if (!form) return;

    form.addEventListener('submit', (e) => {
        e.preventDefault();

        loadAccountsForLogin();

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

            loadAccountsForLogin();
            checkLogin();

            form.reset();
        } else {
            alert('Invalid email or password');
        }
    });
}

// ============================================
// Admin Contact Table
// ============================================
function getAdminAccounts() {
    const data = getSavedData();
    if (!data?.accountList?.length) return [];

    return data.accountList.filter(acc => {
        const role = acc.userRole?.toLowerCase() || '';
        return role.includes('it') || role === 'administrator';
    });
}

function getAdminContactInfo(admin) {
    const name = admin.username || 'Administrator';
    const email = admin.email;
    const phone = admin.contact;

    return { name, email, phone };
}

function renderAdminContactRow(admin) {
    const { name, email, phone } = getAdminContactInfo(admin);

    return `
            <tr>
                <td>${escapeHtml(name)}</td>
                <td>
                    <a href="mailto:${escapeHtml(email)}" class="email-link">
                        <ion-icon name="mail-outline"></ion-icon> ${escapeHtml(email)}
                    </a>
                </td>
                <td>
                    <a href="tel:${escapeHtml(phone.replace(/\s/g, ''))}" class="phone-link">
                        <ion-icon name="call-outline"></ion-icon> ${escapeHtml(phone)}
                    </a>
                </td>
            </tr>
        `;
}

function loadAdminContactsTable() {
    if (!DOM.tableBody) return;

    const adminAccounts = getAdminAccounts();

    if (adminAccounts.length === 0) {
        DOM.tableBody.innerHTML = `
                <tr>
                    <td colspan="3" style="color:darkblue; background:lightcyan; text-align:center; padding:5px;">
                        No admin accounts available, Try contacting the IT service desk.
                    </td>
                </tr>
            `;
        return;
    }

    DOM.tableBody.innerHTML = adminAccounts.map(renderAdminContactRow).join('');
}

// ============================================
// Event Setup
// ============================================
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
            loadAdminContactsTable();
            renderAdminContactRow();
        }
    });
}
// ============================================
// DOM Element Cache
// ============================================
function cacheDOMElements() {
    DOM.wrapper = document.querySelector('.wrapper');
    DOM.btnPopup = document.getElementById('loginBtn');
    DOM.iconClose = document.querySelector('.icon-close');
    DOM.loginForm = document.getElementById('contactLoginForm');
    DOM.userInfo = document.getElementById('userInfo');
    DOM.usernameDisplay = document.getElementById('usernameDisplay');
    DOM.userRoleDisplay = document.getElementById('userRoleDisplay');
    DOM.tableBody = document.getElementById('adminContactTableBody');
    DOM.loginBtn = document.getElementById('loginBtn');
}

// ============================================
// Initialization
// ============================================
function init() {
    cacheDOMElements();
    setupLoginForm();
    setupEventListeners();
    loadAdminContactsTable();
    checkLogin();
}

init();