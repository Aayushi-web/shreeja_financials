const token = localStorage.getItem('token');
const user = JSON.parse(localStorage.getItem('user') || '{}');

// ===== AUTH CHECK =====
if (!token || user.role !== 'investor') {
    window.location.href = '../index.html';
}

function updateInvestorDisplay(currentUser) {
    const name = currentUser.name || 'Investor';
    const email = currentUser.email || 'Email not available';

    document.getElementById('investor-name').textContent = name;
    document.getElementById('welcome-name').textContent = 
    'Welcome back, ' + (user.name || 'Investor') + '! 👋';
    document.getElementById('investor-email').textContent = email;
    document.getElementById('welcome-name').textContent = 'Welcome back, ' + name + '!';
    document.getElementById('profile-name').textContent = name;
    document.getElementById('profile-email').textContent = email;
}

updateInvestorDisplay(user);

function formatMoney(value) {
    return '₹' + Number(value || 0).toLocaleString('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

// ===== API HELPER =====
async function api(method, endpoint, body = null) {
    const options = {
        method,
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        }
    };

    if (body) options.body = JSON.stringify(body);

    const res = await fetch(`${API}${endpoint}`, options);
    const data = await res.json();

    if (!res.ok) {
        throw new Error(data.message || 'Request failed');
    }

    return data;
}

async function loadCurrentUser() {
    try {
        const data = await api('GET', '/auth/me');
        if (!data.user) return;

        const updatedUser = { ...user, ...data.user };
        localStorage.setItem('user', JSON.stringify(updatedUser));
        updateInvestorDisplay(updatedUser);
    } catch (err) {
        console.error('Could not load current user', err);
    }
}

// ===== NAVIGATION =====
function setActiveNav(event) {
    document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
    const navItem = event?.target?.closest('.nav-item');
    if (navItem) navItem.classList.add('active');
    closeSidebar();
}

function showPortfolio(event) {
    setActiveNav(event);
    document.getElementById('section-portfolio').classList.remove('hidden');
    document.getElementById('section-profile').classList.add('hidden');
    document.getElementById('page-title').textContent = 'My Portfolio';
}

function showProfile(event) {
    setActiveNav(event);
    document.getElementById('section-portfolio').classList.add('hidden');
    document.getElementById('section-profile').classList.remove('hidden');
    document.getElementById('page-title').textContent = 'Profile';
}

// ===== LOAD MY PORTFOLIO =====
async function loadMyPortfolio() {
    try {
        const holdings = await api('GET', '/portfolios/my');
        renderSummary(holdings);
        renderTable(holdings);
    } catch (err) {
        const tbody = document.getElementById('portfolio-tbody');
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:30px;color:#dc2626">${err.message}</td></tr>`;
    }
}

// ===== SUMMARY CARDS =====
function renderSummary(holdings) {
    let totalInvested = 0;
    let totalCurrent = 0;

    holdings.forEach(h => {
        totalInvested += Number(h.amount_invested);
        totalCurrent += Number(h.current_value);
    });

    const totalPL = totalCurrent - totalInvested;
    const totalPct = totalInvested > 0 ? ((totalPL / totalInvested) * 100).toFixed(2) : '0.00';

    document.getElementById('total-invested').textContent = formatMoney(totalInvested);
    document.getElementById('total-current').textContent = formatMoney(totalCurrent);

    const plEl = document.getElementById('total-pl');
    plEl.textContent = formatMoney(totalPL);
    plEl.className = totalPL >= 0 ? 'positive' : 'negative';

    const pctEl = document.getElementById('total-pct');
    pctEl.textContent = totalPct + '%';
    pctEl.className = totalPL >= 0 ? 'positive' : 'negative';
}

// ===== HOLDINGS TABLE =====
function renderTable(holdings) {
    const tbody = document.getElementById('portfolio-tbody');
    tbody.innerHTML = '';

    if (holdings.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:30px;color:#888">No holdings yet</td></tr>';
        return;
    }

    holdings.forEach(h => {
        const ret = Number(h.current_value) - Number(h.amount_invested);
        const retPct = h.amount_invested > 0 ? ((ret / h.amount_invested) * 100).toFixed(2) : '0.00';
        const cls = ret >= 0 ? 'positive' : 'negative';

        tbody.innerHTML += `
            <tr>
                <td>${h.share_name}</td>
                <td>${h.quantity}</td>
                <td>${formatMoney(h.buy_price)}</td>
                <td>${formatMoney(h.amount_invested)}</td>
                <td>${formatMoney(h.current_value)}</td>
                <td class="${cls}">${formatMoney(ret)}</td>
                <td class="${cls}">${retPct}%</td>
            </tr>
        `;
    });
}

// ===== LOGOUT =====
function logout() {
    localStorage.clear();
    window.location.href = '../index.html';
}

// ===== INIT =====
loadCurrentUser();
loadMyPortfolio();
// ===== MOBILE SIDEBAR =====
function toggleSidebar() {
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.getElementById('overlay');
    if (sidebar) sidebar.classList.toggle('open');
    if (overlay) overlay.classList.toggle('show');
}

function closeSidebar() {
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.getElementById('overlay');
    if (sidebar) sidebar.classList.remove('open');
    if (overlay) overlay.classList.remove('show');
}
