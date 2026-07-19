const token = localStorage.getItem('token');
const user = JSON.parse(localStorage.getItem('user') || '{}');

// ===== AUTH CHECK =====
if (!token || user.role !== 'admin') {
    window.location.href = '../index.html';
}

// ===== SET ADMIN INFO =====
function setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
}

setText('admin-name', user.name || 'Admin');
setText('admin-email', user.email || '');
setText('profile-name', user.name || 'Admin');
setText('profile-email', user.email || '');
setText('welcome-name', user.name || 'Admin');

// ===== NAVIGATION =====
function showSection(section, event) {
    document.querySelectorAll('section').forEach(s => s.classList.add('hidden'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

    document.getElementById(`section-${section}`).classList.remove('hidden');
    document.getElementById('page-title').textContent =
        section.charAt(0).toUpperCase() + section.slice(1);

    const navItem = event?.target?.closest('.nav-item');
    if (navItem) navItem.classList.add('active');
    closeSidebar();

    if (section === 'dashboard') loadDashboard();
    if (section === 'investors') loadInvestors();
    if (section === 'portfolio') loadPortfolios();
}

function logout() {
    localStorage.clear();
    window.location.href = '../index.html';
}

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
    return res.json();
}

// ===== FORMAT MONEY =====
function formatMoney(value) {
    return '₹' + Number(value || 0).toLocaleString('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

// ===== DASHBOARD =====
async function loadDashboard() {
    ['total-investors', 'total-portfolios', 'total-invested', 'total-current', 'total-pl'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.innerHTML = '<span class="skeleton skeleton-text"></span>';
    });

    try {
        const stats = await api('GET', '/portfolios/stats');

        document.getElementById('total-investors').textContent = stats.total_investors;
        document.getElementById('total-portfolios').textContent = stats.total_portfolios;
        document.getElementById('total-invested').textContent = formatMoney(stats.total_invested);
        document.getElementById('total-current').textContent = formatMoney(stats.total_current_value);

        const pl = stats.total_profit_loss;
        const plEl = document.getElementById('total-pl');
        plEl.textContent = formatMoney(pl);
        plEl.className = pl >= 0 ? 'positive' : 'negative';

        loadCharts();
    } catch (err) {
        ['total-investors', 'total-portfolios', 'total-invested', 'total-current', 'total-pl'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.textContent = '-';
        });
    }
}

// ===== CHARTS =====
let pieChartInstance = null;
let barChartInstance = null;

async function loadCharts() {
    const portfolios = await api('GET', '/portfolios');

    const investorMap = {};
    const investedMap = {};

    portfolios.forEach(p => {
        if (!investorMap[p.investor_name]) {
            investorMap[p.investor_name] = 0;
            investedMap[p.investor_name] = 0;
        }
        investorMap[p.investor_name] += Number(p.current_value);
        investedMap[p.investor_name] += Number(p.amount_invested);
    });

    const labels = Object.keys(investorMap);
    const currentValues = Object.values(investorMap);
    const investedValues = Object.values(investedMap);

    if (pieChartInstance) pieChartInstance.destroy();
    pieChartInstance = new Chart(document.getElementById('pieChart'), {
        type: 'doughnut',
        data: {
            labels,
            datasets: [{
                data: currentValues,
                backgroundColor: ['#22C55E', '#1A3D5C', '#f59e0b', '#8b5cf6', '#ef4444'],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { padding: 20, font: { size: 12 } }
                }
            }
        }
    });

    if (barChartInstance) barChartInstance.destroy();
    barChartInstance = new Chart(document.getElementById('barChart'), {
        type: 'bar',
        data: {
            labels,
            datasets: [
                {
                    label: 'Invested',
                    data: investedValues,
                    backgroundColor: '#1A3D5C',
                    borderRadius: 6
                },
                {
                    label: 'Current Value',
                    data: currentValues,
                    backgroundColor: '#22C55E',
                    borderRadius: 6
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    position: 'top',
                    labels: { padding: 20, font: { size: 12 } }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: { color: 'rgba(0,0,0,0.05)' },
                    ticks: {
                        callback: function(value) {
                            return '₹' + value.toLocaleString('en-IN');
                        }
                    }
                },
                x: { grid: { display: false } }
            }
        }
    });
}

// ===== INVESTORS =====
var allInvestors = [];

async function loadInvestors() {
    const tbody = document.getElementById('investors-tbody');
    if (tbody) {
        tbody.innerHTML = Array(3).fill(0).map(() => `
            <tr>
                <td><div class="skeleton skeleton-cell" style="width: 120px;"></div></td>
                <td><div class="skeleton skeleton-cell" style="width: 170px;"></div></td>
                <td><div class="skeleton skeleton-cell" style="width: 80px;"></div></td>
                <td><div class="skeleton skeleton-cell" style="width: 100px;"></div></td>
                <td><div class="skeleton skeleton-badge"></div></td>
                <td><div class="skeleton skeleton-cell" style="width: 110px;"></div></td>
            </tr>
        `).join('');
    }
    try {
        allInvestors = await api('GET', '/investors');
        renderInvestors(allInvestors);
    } catch (err) {
        if (tbody) tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:30px;color:#dc2626">${err.message || 'Failed to load investors'}</td></tr>`;
    }
}

function renderInvestors(investors) {
    const tbody = document.getElementById('investors-tbody');
    tbody.innerHTML = '';

    if (investors.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:30px;color:#888">No investors found</td></tr>';
        return;
    }

    investors.forEach(inv => {
        tbody.innerHTML += `
            <tr>
                <td>${inv.name}</td>
                <td>${inv.email}</td>
                <td>${inv.user_id}</td>
                <td>${inv.phone || '-'}</td>
                <td><span class="badge ${inv.status}">${inv.status}</span></td>
                <td>
                    <button class="btn-edit" onclick="editInvestor(${inv.id})">Edit</button>
                    <button class="btn-delete" onclick="deleteInvestor(${inv.id})">Delete</button>
                </td>
            </tr>
        `;
    });
}

function searchInvestors() {
    const q = document.getElementById('search-investor').value.toLowerCase();
    const filtered = allInvestors.filter(i =>
        i.name.toLowerCase().includes(q) ||
        i.email.toLowerCase().includes(q) ||
        i.user_id.toLowerCase().includes(q)
    );
    renderInvestors(filtered);
}

function openInvestorModal() {
    document.getElementById('investor-modal-title').textContent = 'Add Investor';
    document.getElementById('investor-id').value = '';
    document.getElementById('inv-name').value = '';
    document.getElementById('inv-email').value = '';
    document.getElementById('inv-userid').value = '';
    document.getElementById('inv-password').value = '';
    document.getElementById('inv-phone').value = '';
    document.getElementById('inv-status').value = 'active';
    document.getElementById('investor-modal').classList.remove('hidden');
}

async function editInvestor(id) {
    const inv = await api('GET', `/investors/${id}`);
    document.getElementById('investor-modal-title').textContent = 'Edit Investor';
    document.getElementById('investor-id').value = inv.id;
    document.getElementById('inv-name').value = inv.name;
    document.getElementById('inv-email').value = inv.email;
    document.getElementById('inv-userid').value = inv.user_id;
    document.getElementById('inv-password').value = '';
    document.getElementById('inv-phone').value = inv.phone || '';
    document.getElementById('inv-status').value = inv.status;
    document.getElementById('investor-modal').classList.remove('hidden');
}

async function saveInvestor() {
    const id = document.getElementById('investor-id').value;
    const body = {
        name: document.getElementById('inv-name').value,
        email: document.getElementById('inv-email').value,
        user_id: document.getElementById('inv-userid').value,
        password: document.getElementById('inv-password').value,
        phone: document.getElementById('inv-phone').value,
        status: document.getElementById('inv-status').value
    };

    if (id) {
        await api('PUT', `/investors/${id}`, body);
    } else {
        await api('POST', '/investors', body);
    }

    closeModal('investor-modal');
    loadInvestors();
}

async function deleteInvestor(id) {
    if (!confirm('Are you sure you want to delete this investor?')) return;
    await api('DELETE', `/investors/${id}`);
    loadInvestors();
}

// ===== PORTFOLIO =====
var allPortfolios = [];

async function loadPortfolios() {
    const tbody = document.getElementById('portfolio-tbody');
    if (tbody) {
        tbody.innerHTML = Array(3).fill(0).map(() => `
            <tr>
                <td><div class="skeleton skeleton-cell" style="width: 110px;"></div></td>
                <td><div class="skeleton skeleton-cell" style="width: 130px;"></div></td>
                <td><div class="skeleton skeleton-cell" style="width: 50px;"></div></td>
                <td><div class="skeleton skeleton-cell" style="width: 80px;"></div></td>
                <td><div class="skeleton skeleton-cell" style="width: 90px;"></div></td>
                <td><div class="skeleton skeleton-cell" style="width: 90px;"></div></td>
                <td><div class="skeleton skeleton-cell" style="width: 80px;"></div></td>
                <td><div class="skeleton skeleton-cell" style="width: 60px;"></div></td>
                <td><div class="skeleton skeleton-cell" style="width: 110px;"></div></td>
            </tr>
        `).join('');
    }
    try {
        allPortfolios = await api('GET', '/portfolios');
        renderPortfolios(allPortfolios);
    } catch (err) {
        if (tbody) tbody.innerHTML = `<tr><td colspan="9" style="text-align:center;padding:30px;color:#dc2626">${err.message || 'Failed to load portfolios'}</td></tr>`;
    }
}

function renderPortfolios(portfolios) {
    const tbody = document.getElementById('portfolio-tbody');
    tbody.innerHTML = '';

    if (portfolios.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;padding:30px;color:#888">No portfolios found</td></tr>';
        return;
    }

    portfolios.forEach(p => {
        const ret = Number(p.current_value) - Number(p.amount_invested);
        const retPct = p.amount_invested > 0
            ? ((ret / p.amount_invested) * 100).toFixed(2)
            : '0.00';
        const cls = ret >= 0 ? 'positive' : 'negative';

        tbody.innerHTML += `
            <tr>
                <td>${p.investor_name}</td>
                <td>${p.share_name}</td>
                <td>${p.quantity}</td>
                <td>${formatMoney(p.buy_price)}</td>
                <td>${formatMoney(p.amount_invested)}</td>
                <td>${formatMoney(p.current_value)}</td>
                <td class="${cls}">${formatMoney(ret)}</td>
                <td class="${cls}">${retPct}%</td>
                <td>
                    <button class="btn-edit" onclick="editPortfolio(${p.id})">Edit</button>
                    <button class="btn-delete" onclick="deletePortfolio(${p.id})">Delete</button>
                </td>
            </tr>
        `;
    });
}

function searchPortfolios() {
    const q = document.getElementById('search-portfolio').value.toLowerCase();
    const filtered = allPortfolios.filter(p =>
        p.share_name.toLowerCase().includes(q) ||
        p.investor_name.toLowerCase().includes(q)
    );
    renderPortfolios(filtered);
}

async function openPortfolioModal() {
    document.getElementById('portfolio-modal-title').textContent = 'Add Portfolio';
    document.getElementById('portfolio-id').value = '';
    document.getElementById('port-share').value = '';
    document.getElementById('port-qty').value = '';
    document.getElementById('port-buyprice').value = '';
    document.getElementById('port-invested').value = '';
    document.getElementById('port-current').value = '';

    const investors = await api('GET', '/investors');
    const sel = document.getElementById('port-investor');
    sel.innerHTML = investors.map(i => `<option value="${i.id}">${i.name}</option>`).join('');

    document.getElementById('portfolio-modal').classList.remove('hidden');
}

async function editPortfolio(id) {
    const p = allPortfolios.find(x => x.id === id);
    if (!p) return;

    await openPortfolioModal();
    document.getElementById('portfolio-modal-title').textContent = 'Edit Portfolio';
    document.getElementById('portfolio-id').value = p.id;
    document.getElementById('port-investor').value = p.user_id;
    document.getElementById('port-share').value = p.share_name;
    document.getElementById('port-qty').value = p.quantity;
    document.getElementById('port-buyprice').value = p.buy_price;
    document.getElementById('port-invested').value = p.amount_invested;
    document.getElementById('port-current').value = p.current_value;
}

async function savePortfolio() {
    const id = document.getElementById('portfolio-id').value;
    const body = {
        user_id: document.getElementById('port-investor').value,
        share_name: document.getElementById('port-share').value,
        quantity: document.getElementById('port-qty').value,
        buy_price: document.getElementById('port-buyprice').value,
        amount_invested: document.getElementById('port-invested').value,
        current_value: document.getElementById('port-current').value
    };

    if (id) {
        await api('PUT', `/portfolios/${id}`, body);
    } else {
        await api('POST', '/portfolios', body);
    }

    closeModal('portfolio-modal');
    loadPortfolios();
}

async function deletePortfolio(id) {
    if (!confirm('Are you sure you want to delete this share?')) return;
    await api('DELETE', `/portfolios/${id}`);
    loadPortfolios();
}

// ===== MODAL HELPERS =====
function closeModal(id) {
    document.getElementById(id).classList.add('hidden');
}

// ===== INIT =====
loadDashboard();
