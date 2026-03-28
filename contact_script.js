const wrapper = document.querySelector('.contact-page-wrapper .wrapper');
const btnPopup = document.getElementById('loginBtn');
const iconClose = document.querySelector('.contact-page-wrapper .icon-close');
const loginForm = document.getElementById('contactLoginForm');
const userInfo = document.getElementById('userInfo');
const usernameDisplay = document.getElementById('usernameDisplay');
const userRoleDisplay = document.getElementById('userRoleDisplay');


let accountListForLogin = [];

function loadAccountsForLogin() {
    const savedData = localStorage.getItem('internshipEvalData');
    if (savedData) {
        try {
            const parsedData = JSON.parse(savedData);
            if (parsedData.accountList && Array.isArray(parsedData.accountList)) {
                accountListForLogin = parsedData.accountList;
                console.log('Accounts loaded for login:', accountListForLogin.length);
                return true;
            }
        } catch (error) {
            console.error('Error loading accounts for login:', error);
        }
    }
    return false;
}

function checkExistingLogin() {
    const loggedInUser = sessionStorage.getItem('loggedInUser');
    if (loggedInUser) {
        try {
            const user = JSON.parse(loggedInUser);
            if (userInfo && usernameDisplay && userRoleDisplay) {
                usernameDisplay.textContent = user.username;
                userRoleDisplay.textContent = user.userRole;
                userInfo.style.display = 'flex';
                const loginBtn = document.getElementById('loginBtn');
                if (loginBtn) {
                    loginBtn.textContent = 'LOGOUT';
                    loginBtn.classList.add('logout-state');
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

if (loginForm) {
    loginForm.addEventListener('submit', function (e) {
        e.preventDefault();

        const emailInput = document.getElementById('contactLoginEmail');
        const passwordInput = document.getElementById('contactLoginPassword');
        const enteredEmail = emailInput.value.trim();
        const enteredPassword = passwordInput.value.trim();

        loadAccountsForLogin();

        const matchedAccount = accountListForLogin.find(account =>
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
                const loginBtn = document.getElementById('loginBtn');
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

if (btnPopup) {
    btnPopup.addEventListener('click', function () {

        if (this.textContent === 'LOGOUT') {
            // Logout action
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

            const emailInput = document.getElementById('contactLoginEmail');
            const passwordInput = document.getElementById('contactLoginPassword');
            if (emailInput) emailInput.value = '';
            if (passwordInput) passwordInput.value = '';
        }
    });
}

if (iconClose) {
    iconClose.addEventListener('click', () => {
        if (wrapper) {
            wrapper.classList.remove('active-popup');
        }
    });
}

// ============================================
// ADMIN CONTACT TABLE LOADING
// ============================================
function loadAdminContactsTable() {
    const tableBody = document.getElementById('adminContactTableBody');
    if (!tableBody) return;

    let adminAccounts = [];

    const savedData = localStorage.getItem('internshipEvalData');
    if (savedData) {
        try {
            const parsedData = JSON.parse(savedData);
            if (parsedData.accountList && Array.isArray(parsedData.accountList)) {
                adminAccounts = parsedData.accountList.filter(acc =>
                    acc.userRole && (acc.userRole.toLowerCase().includes('it') ||
                        acc.userRole.toLowerCase() === 'administrator')
                );
            }
        } catch (error) {
            console.error('Error loading from localStorage:', error);
        }
    }

    if (adminAccounts.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="3" style="color:darkblue; background:lightcyan; text-align:center; padding:5px;">No admin accounts available, Try contacting the IT service desk.</td></tr>`;
        return;
    }

    let html = '';
    adminAccounts.forEach(admin => {
        const adminName = admin.username || 'Administrator';
        const adminEmail = admin.email || `${adminName.toLowerCase().replace(/\s/g, '.')}@nottingham.edu`;
        const adminPhone = admin.contact || (admin.userRole?.includes('IT') ? '+44 115 951 6677' : '+44 115 951 5000');

        html += `
                    <tr>
                        <td>${escapeHtml(adminName)}</td>
                        <td>
                            <a href="mailto:${escapeHtml(adminEmail)}" class="email-link">
                                <ion-icon name="mail-outline"></ion-icon> ${escapeHtml(adminEmail)}
                            </a>
                        </td>
                        <td>
                            <a href="tel:${escapeHtml(adminPhone.replace(/\s/g, ''))}" class="phone-link">
                                <ion-icon name="call-outline"></ion-icon> ${escapeHtml(adminPhone)}
                            </a>
                        </td>
                    </tr>
                `;
    });

    tableBody.innerHTML = html;
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, function (m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

document.getElementById('listLink')?.addEventListener('click', (e) => {
    e.preventDefault();
    alert('📋 Please return to Dashboard to manage student lists.');
});

loadAdminContactsTable();

checkExistingLogin();

window.addEventListener('storage', function (e) {
    if (e.key === 'internshipEvalData') {
        loadAdminContactsTable();
    }
});