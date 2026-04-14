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

// ============================================
// API Data Loading
// ============================================
async function loadAccountsFromAPI() {
    try {
        const users = await API.getUsers();
        if (Array.isArray(users) && users.length > 0) {
            accountList = users.map(u => ({
                username: u.username || '',
                email: u.email || '',
                password: '••••••',
                userRole: u.role || '',
                contact: u.contact || '',
                createdAt: u.date_created ? new Date(u.date_created).toLocaleDateString('en-GB') : '',
                user_id: u.user_id
            }));
            return true;
        }
    } catch (error) {
        console.error('Error loading accounts:', error);
    }
    accountList = [];
    return false;
}

function loadAccountsForLogin() {
    return accountList.length > 0;
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

            await loadAccountsFromAPI();
            loadAdminContactsTable();
            checkLogin();

            form.reset();
        } else {
            alert(result.message || 'Invalid email or password');
        }
    });
}

// ============================================
// Admin Contact Table
// ============================================
function getAdminAccounts() {
    return accountList.filter(acc => {
        const role = acc.userRole?.toLowerCase() || '';
        return role === 'administrator';
    });
}

function getAdminContactInfo(admin) {
    const name = admin.username || 'Administrator';
    const email = admin.email;
    const phone = admin.contact || 'Not provided';

    return { name, email, phone };
}

function renderAdminContactRow(admin) {
    const { name, email, phone } = getAdminContactInfo(admin);

    return `
        <tr>
            <td>${escapeHtml(name)}</td>
            <td>
                <a href="mailto:${escapeHtml(email)}" class="email-link" style="color: cyan;">
                    <ion-icon name="mail-outline"></ion-icon> ${escapeHtml(email)}
                </a>
            </td>
            <td>
                <a href="tel:${escapeHtml(phone.replace(/\s/g, ''))}" class="phone-link" style="color: cyan;">
                    <ion-icon name="call-outline"></ion-icon> ${escapeHtml(phone)}
                </a>
            </td>
        </tr>
    `;
}

async function loadAdminContactsTable() {
    if (!DOM.tableBody) return;

    await loadAccountsFromAPI();

    const adminAccounts = getAdminAccounts();

    if (adminAccounts.length === 0) {
        DOM.tableBody.innerHTML = `
            <tr>
                <td colspan="3" style="color:darkblue; background:lightcyan; text-align:center; padding:5px;">
                    No admin accounts available. Please contact the IT service desk.
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
async function init() {
    cacheDOMElements();
    await loadAccountsFromAPI();
    setupLoginForm();
    setupEventListeners();
    loadAdminContactsTable();
    checkLogin();
}

init();