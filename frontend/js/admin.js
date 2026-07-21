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
    if (section === 'profile') loadProfile();
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
    const pieSkeleton = document.getElementById('pieChart-skeleton');
    const barSkeleton = document.getElementById('barChart-skeleton');
    const pieCanvas = document.getElementById('pieChart');
    const barCanvas = document.getElementById('barChart');

    if (pieSkeleton) {
        pieSkeleton.style.display = 'block';
        pieSkeleton.innerHTML = `
            <div class="skeleton skeleton-chart-circle"></div>
            <div class="skeleton-chart-legend">
                <span class="skeleton skeleton-badge"></span>
                <span class="skeleton skeleton-badge"></span>
                <span class="skeleton skeleton-badge"></span>
            </div>
        `;
    }
    if (barSkeleton) {
        barSkeleton.style.display = 'block';
        barSkeleton.innerHTML = `
            <div class="skeleton-chart-bars">
                <div class="skeleton skeleton-chart-bar" style="height: 65%;"></div>
                <div class="skeleton skeleton-chart-bar" style="height: 85%;"></div>
                <div class="skeleton skeleton-chart-bar" style="height: 45%;"></div>
                <div class="skeleton skeleton-chart-bar" style="height: 75%;"></div>
                <div class="skeleton skeleton-chart-bar" style="height: 90%;"></div>
            </div>
        `;
    }
    if (pieCanvas) pieCanvas.style.display = 'none';
    if (barCanvas) barCanvas.style.display = 'none';

    try {
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

        if (pieSkeleton) pieSkeleton.style.display = 'none';
        if (barSkeleton) barSkeleton.style.display = 'none';
        if (pieCanvas) pieCanvas.style.display = 'block';
        if (barCanvas) barCanvas.style.display = 'block';

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
    } catch (err) {
        if (pieSkeleton) pieSkeleton.innerHTML = `<p style="text-align:center;padding:40px 0;color:#dc2626">${err.message || 'Failed to load chart'}</p>`;
        if (barSkeleton) barSkeleton.innerHTML = `<p style="text-align:center;padding:40px 0;color:#dc2626">${err.message || 'Failed to load chart'}</p>`;
    }
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
        populateAdminInvestorSelects();
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

        const avgPrice = p.average_buy_price !== undefined ? p.average_buy_price : p.buy_price;

        tbody.innerHTML += `
            <tr>
                <td>${p.investor_name}</td>
                <td><a href="javascript:void(0)" onclick="viewAdminShareHistory(${p.user_id}, '${p.investor_name.replace(/'/g, "\\'")}', '${p.share_name.replace(/'/g, "\\'")}')" style="color: var(--primary); text-decoration: underline; font-weight: 700;">${p.share_name}</a></td>
                <td>${p.quantity}</td>
                <td>${formatMoney(avgPrice)}</td>
                <td>${formatMoney(p.amount_invested)}</td>
                <td>${formatMoney(p.current_value)}</td>
                <td class="${cls}">${formatMoney(ret)}</td>
                <td class="${cls}">${retPct}%</td>
                <td style="white-space: nowrap;">
                    <button class="btn-action btn-history" style="background:#f1f5f9;color:#334155;border:1px solid #cbd5e1;padding:5px 10px;border-radius:6px;font-weight:600;cursor:pointer;margin-right:4px;" onclick="viewAdminShareHistory(${p.user_id}, '${p.investor_name.replace(/'/g, "\\'")}', '${p.share_name.replace(/'/g, "\\'")}')">📜 History</button>
                    <button class="btn-action btn-buy" style="background:#dcfce7;color:#16a34a;border:none;padding:5px 10px;border-radius:6px;font-weight:600;cursor:pointer;margin-right:4px;" onclick="openAdminTradeModal('BUY', ${p.user_id}, '${p.investor_name.replace(/'/g, "\\'")}', '${p.share_name.replace(/'/g, "\\'")}', ${p.quantity}, ${avgPrice})">Buy</button>
                    <button class="btn-action btn-sell" style="background:#fee2e2;color:#dc2626;border:none;padding:5px 10px;border-radius:6px;font-weight:600;cursor:pointer;margin-right:4px;" onclick="openAdminTradeModal('SELL', ${p.user_id}, '${p.investor_name.replace(/'/g, "\\'")}', '${p.share_name.replace(/'/g, "\\'")}', ${p.quantity}, ${avgPrice})">Sell</button>
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

// ===== PROFILE MANAGEMENT =====
async function loadProfile() {
    try {
        const data = await api('GET', '/auth/me');
        if (data && data.user) {
            const u = data.user;
            localStorage.setItem('user', JSON.stringify(u));
            setText('admin-name', u.name || 'Admin');
            setText('admin-email', u.email || '');
            setText('profile-name', u.name || 'Admin');
            setText('profile-email', u.email || '');
            setText('welcome-name', u.name || 'Admin');
            setText('profile-username-display', u.user_id || 'admin');
            setText('profile-phone-display', u.phone || '-');

            const avatarEl = document.getElementById('profile-avatar');
            if (avatarEl && u.name) avatarEl.textContent = u.name.charAt(0).toUpperCase();

            const inputName = document.getElementById('setting-name');
            const inputUsername = document.getElementById('setting-username');
            const inputEmail = document.getElementById('setting-email');
            const inputPhone = document.getElementById('setting-phone');

            if (inputName) inputName.value = u.name || '';
            if (inputUsername) inputUsername.value = u.user_id || '';
            if (inputEmail) inputEmail.value = u.email || '';
            if (inputPhone) inputPhone.value = u.phone || '';
        }
    } catch (err) {
        console.error('Error loading profile:', err);
    }
}

async function handleUpdateProfile(event) {
    event.preventDefault();
    const btn = document.getElementById('btn-save-profile');
    if (btn) { btn.disabled = true; btn.textContent = 'Saving...'; }

    try {
        const body = {
            name: document.getElementById('setting-name').value.trim(),
            user_id: document.getElementById('setting-username').value.trim(),
            email: document.getElementById('setting-email').value.trim(),
            phone: document.getElementById('setting-phone').value.trim()
        };

        const res = await api('PUT', '/auth/profile', body);
        if (res.message && !res.user) {
            alert(res.message);
        } else if (res.user) {
            if (res.token) localStorage.setItem('token', res.token);
            localStorage.setItem('user', JSON.stringify(res.user));
            alert('Profile and username updated successfully!');
            loadProfile();
        } else {
            alert(res.message || 'Failed to update profile');
        }
    } catch (err) {
        alert('Error updating profile: ' + err.message);
    } finally {
        if (btn) { btn.disabled = false; btn.textContent = 'Save Profile Changes'; }
    }
}

async function handleChangePassword(event) {
    event.preventDefault();
    const currentPassword = document.getElementById('current-password').value;
    const newPassword = document.getElementById('new-password').value;
    const confirmPassword = document.getElementById('confirm-password').value;

    if (newPassword !== confirmPassword) {
        alert('New password and confirm password do not match!');
        return;
    }

    const btn = document.getElementById('btn-save-password');
    if (btn) { btn.disabled = true; btn.textContent = 'Updating...'; }

    try {
        const res = await api('PUT', '/auth/password', {
            current_password: currentPassword,
            new_password: newPassword
        });

        if (res.message && res.message.toLowerCase().includes('success')) {
            alert(res.message);
            document.getElementById('password-update-form').reset();
        } else {
            alert(res.message || 'Failed to change password');
        }
    } catch (err) {
        alert('Error changing password: ' + err.message);
    } finally {
        if (btn) { btn.disabled = false; btn.textContent = 'Update Password'; }
    }
}

// ===== PASSWORD VISIBILITY TOGGLE =====
function togglePasswordVisibility(inputId, iconEl) {
    const input = document.getElementById(inputId);
    if (!input) return;
    if (input.type === 'password') {
        input.type = 'text';
        if (iconEl) iconEl.textContent = '🙈';
    } else {
        input.type = 'password';
        if (iconEl) iconEl.textContent = '👁️';
    }
}

// ===== ADMIN TRADE MODAL & BUY/SELL LOGIC =====
let adminTradeMaxQuantity = 0;

async function openAdminTradeModal(type, targetUserId = '', investorName = '', symbol = '', maxQty = 0, currentPrice = '') {
    const modal = document.getElementById('admin-trade-modal');
    const title = document.getElementById('admin-trade-modal-title');
    const typeInput = document.getElementById('admin-trade-type');
    const investorSelect = document.getElementById('admin-trade-investor');
    const symbolInput = document.getElementById('admin-trade-symbol');
    const qtyInput = document.getElementById('admin-trade-quantity');
    const priceInput = document.getElementById('admin-trade-price');
    const noteEl = document.getElementById('admin-trade-note');
    const submitBtn = document.getElementById('admin-trade-submit-btn');

    typeInput.value = type;
    symbolInput.value = symbol;
    priceInput.value = currentPrice ? Number(currentPrice).toFixed(2) : '';
    qtyInput.value = '';
    adminTradeMaxQuantity = Number(maxQty || 0);

    const investors = await api('GET', '/investors');
    investorSelect.innerHTML = investors.map(i => `<option value="${i.id}" ${i.id == targetUserId ? 'selected' : ''}>${i.name} (${i.user_id})</option>`).join('');
    investorSelect.disabled = !!targetUserId;

    if (type === 'BUY') {
        title.textContent = symbol ? `Buy Shares of ${symbol} for ${investorName}` : 'Buy New Stock for Investor';
        submitBtn.textContent = 'Confirm Buy Order';
        submitBtn.style.background = 'linear-gradient(135deg, #22C55E, #16a34a)';
        symbolInput.readOnly = !!symbol;
        qtyInput.max = '';
        noteEl.textContent = symbol ? `Investor currently holds ${adminTradeMaxQuantity} shares.` : '';
    } else {
        title.textContent = `Sell Shares of ${symbol} for ${investorName}`;
        submitBtn.textContent = 'Confirm Sell Order';
        submitBtn.style.background = 'linear-gradient(135deg, #ef4444, #dc2626)';
        symbolInput.readOnly = true;
        qtyInput.max = adminTradeMaxQuantity;
        noteEl.textContent = `Available for investor to sell: ${adminTradeMaxQuantity} shares.`;
    }

    updateAdminTradeTotal();
    modal.classList.remove('hidden');
}

function updateAdminTradeTotal() {
    const qty = Number(document.getElementById('admin-trade-quantity').value || 0);
    const price = Number(document.getElementById('admin-trade-price').value || 0);
    const total = qty * price;
    document.getElementById('admin-trade-total').textContent = formatMoney(total);
}

async function submitAdminTrade(event) {
    event.preventDefault();
    const type = document.getElementById('admin-trade-type').value;
    const user_id = Number(document.getElementById('admin-trade-investor').value);
    const stock_symbol = document.getElementById('admin-trade-symbol').value.trim();
    const quantity = Number(document.getElementById('admin-trade-quantity').value);
    const current_price = Number(document.getElementById('admin-trade-price').value);

    if (!user_id || !stock_symbol || quantity <= 0 || current_price <= 0) {
        alert('Please select an investor, enter a valid stock symbol, positive quantity, and price.');
        return;
    }

    if (type === 'SELL' && quantity > adminTradeMaxQuantity) {
        alert(`Cannot sell more shares than the investor currently owns (${adminTradeMaxQuantity} shares).`);
        return;
    }

    const endpoint = type === 'BUY' ? '/portfolio/buy' : '/portfolio/sell';
    const submitBtn = document.getElementById('admin-trade-submit-btn');
    const origText = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = 'Processing...';

    try {
        const response = await api('POST', endpoint, {
            user_id,
            stock_symbol,
            quantity,
            current_price
        });

        alert(response.message || `Successfully processed ${type} order for investor!`);
        closeModal('admin-trade-modal');
        await loadPortfolios();
        await loadDashboard();
    } catch (err) {
        alert(err.message || `Failed to process ${type} request`);
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = origText;
    }
}

// ===== ADMIN PER-SHARE TRANSACTION HISTORY =====
async function viewAdminShareHistory(userId, investorName, shareName) {
    const modal = document.getElementById('admin-share-history-modal');
    if (modal) modal.classList.remove('hidden');

    document.getElementById('admin-modal-share-title').textContent = `${shareName} - Transaction History`;
    document.getElementById('admin-modal-share-subtitle').textContent = `Order log for investor: ${investorName}`;

    const tbody = document.getElementById('admin-modal-history-tbody');
    if (tbody) tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding: 24px; color:#64748b;">Loading transactions...</td></tr>';

    try {
        const transactions = await api('GET', `/portfolios/history?user_id=${userId}&stock_symbol=${encodeURIComponent(shareName)}`);

        let totalBoughtVal = 0;
        let totalSoldVal = 0;
        transactions.forEach(t => {
            if (t.transaction_type === 'BUY') totalBoughtVal += Number(t.total_value || 0);
            else if (t.transaction_type === 'SELL') totalSoldVal += Number(t.total_value || 0);
        });

        document.getElementById('admin-modal-total-bought').textContent = formatMoney(totalBoughtVal);
        document.getElementById('admin-modal-total-sold').textContent = formatMoney(totalSoldVal);
        document.getElementById('admin-modal-total-orders').textContent = transactions.length;

        if (transactions.length === 0) {
            if (tbody) tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding: 24px; color:#888;">No recorded transactions for this share</td></tr>';
            return;
        }

        if (tbody) {
            tbody.innerHTML = transactions.map(t => {
                const badgeCls = t.transaction_type === 'BUY' ? 'badge buy' : 'badge sell';
                const dateStr = new Date(t.timestamp).toLocaleString('en-IN', {
                    day: '2-digit', month: 'short', year: 'numeric',
                    hour: '2-digit', minute: '2-digit'
                });

                return `
                    <tr>
                        <td style="color: #64748b; font-size: 0.88em;">${dateStr}</td>
                        <td><span class="${badgeCls}" style="padding: 3px 8px; border-radius: 6px; font-size: 0.75rem; font-weight: 700; background: ${t.transaction_type === 'BUY' ? '#dcfce7' : '#fee2e2'}; color: ${t.transaction_type === 'BUY' ? '#15803d' : '#b91c1c'};">${t.transaction_type}</span></td>
                        <td>${t.quantity}</td>
                        <td>${formatMoney(t.price_at_transaction)}</td>
                        <td><strong>${formatMoney(t.total_value)}</strong></td>
                    </tr>
                `;
            }).join('');
        }
    } catch (err) {
        console.error('Error fetching admin share history:', err);
        if (tbody) tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding: 24px; color:#dc2626;">Failed to load transactions: ${err.message}</td></tr>`;
    }
}

// ===== ADMIN PORTFOLIO SUB-TABS & SELECT POPULATION =====
function switchAdminPortfolioTab(tab) {
    document.querySelectorAll('.portfolio-tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.port-subview').forEach(sub => sub.classList.add('hidden'));

    const activeBtn = document.getElementById(`port-tab-${tab}`);
    const activeSub = document.getElementById(`port-subview-${tab}`);
    if (activeBtn) activeBtn.classList.add('active');
    if (activeSub) activeSub.classList.remove('hidden');

    if (tab === 'analytics') {
        loadAdminAnalytics();
    } else if (tab === 'transactions') {
        loadAdminTransactions();
    } else if (tab === 'holdings') {
        loadPortfolios();
    }
}

async function populateAdminInvestorSelects() {
    if (typeof allInvestors === 'undefined' || !allInvestors || allInvestors.length === 0) {
        try {
            allInvestors = await api('GET', '/investors');
        } catch (err) {
            console.error('Failed to load investors for selects:', err);
        }
    }
    const investorsList = allInvestors || [];
    const select1 = document.getElementById('admin-analytics-user-select');
    const select2 = document.getElementById('admin-filter-history-user');

    const optionsHtml = '<option value="ALL">🌐 All Investors (System Aggregate)</option>' +
        investorsList.map(inv => `<option value="${inv.id}">${inv.name} (#${inv.id})</option>`).join('');

    if (select1 && select1.innerHTML !== optionsHtml) {
        const currentVal = select1.value || 'ALL';
        select1.innerHTML = optionsHtml;
        select1.value = currentVal;
    }
    if (select2 && select2.innerHTML !== optionsHtml) {
        const currentVal = select2.value || 'ALL';
        select2.innerHTML = optionsHtml;
        select2.value = currentVal;
    }
}

// ===== ADMIN ADVANCED ANALYTICS & TECHNICAL CHARTS =====
let adminAnalyticsData = null;
let adminPlChartInstance = null;
let adminRsiChartInstance = null;
window.activeAdminIndicator = 'SMA';

async function loadAdminAnalytics() {
    await populateAdminInvestorSelects();
    const userSelect = document.getElementById('admin-analytics-user-select');
    const selectedUser = userSelect ? userSelect.value : 'ALL';

    const investedEl = document.getElementById('admin-analytics-invested');
    const currentEl = document.getElementById('admin-analytics-current');
    const unrealizedEl = document.getElementById('admin-analytics-unrealized');
    const winRateEl = document.getElementById('admin-analytics-winrate');

    if (investedEl) investedEl.innerHTML = '<span class="skeleton skeleton-text"></span>';
    if (currentEl) currentEl.innerHTML = '<span class="skeleton skeleton-text"></span>';
    if (unrealizedEl) unrealizedEl.innerHTML = '<span class="skeleton skeleton-text"></span>';
    if (winRateEl) winRateEl.innerHTML = '<span class="skeleton skeleton-text"></span>';

    try {
        const url = selectedUser && selectedUser !== 'ALL'
            ? `/portfolios/analytics?user_id=${selectedUser}`
            : '/portfolios/analytics';
        const data = await api('GET', url);

        if (investedEl) investedEl.textContent = formatMoney(data.summary.totalInvested);
        if (currentEl) currentEl.textContent = formatMoney(data.summary.currentValue);

        if (unrealizedEl) {
            const pl = data.summary.unrealizedPL;
            unrealizedEl.textContent = formatMoney(pl);
            unrealizedEl.style.color = pl >= 0 ? '#22c55e' : '#ef4444';
        }
        if (winRateEl) winRateEl.textContent = `${data.summary.winRate}%`;

        adminAnalyticsData = data.chartData;
        renderAdminCharts();
    } catch (err) {
        console.error('Failed to load admin analytics:', err);
        if (investedEl) investedEl.textContent = '₹0.00';
        if (currentEl) currentEl.textContent = '₹0.00';
        if (unrealizedEl) unrealizedEl.textContent = '₹0.00';
        if (winRateEl) winRateEl.textContent = '0%';
    }
}

function toggleAdminIndicator(type) {
    window.activeAdminIndicator = type;
    document.querySelectorAll('.indicator-toggle').forEach(btn => btn.classList.remove('active'));
    const btn = document.getElementById(`toggle-admin-${type.toLowerCase()}`);
    if (btn) btn.classList.add('active');
    renderAdminCharts();
}

function renderAdminCharts() {
    if (!adminAnalyticsData || !window.Chart) return;

    const labels = adminAnalyticsData.map(d => new Date(d.timestamp).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }));
    const investedValues = adminAnalyticsData.map(d => d.totalInvested);
    const currentValues = adminAnalyticsData.map(d => d.totalValue);

    // Get Technical Indicator Overlay
    let indicatorLabel = 'SMA (7) - Trend';
    let indicatorData = adminAnalyticsData.map(d => d.sma !== null ? d.sma : d.totalValue);
    let indicatorColor = '#F59E0B';

    if (window.activeAdminIndicator === 'EMA') {
        indicatorLabel = 'EMA (7) - Exponential Trend';
        indicatorData = adminAnalyticsData.map(d => d.ema !== null ? d.ema : d.totalValue);
        indicatorColor = '#3B82F6';
    } else if (window.activeAdminIndicator === 'RSI') {
        indicatorLabel = 'RSI P/L Progression Projection';
        indicatorData = adminAnalyticsData.map(d => {
            const rsiVal = d.rsi !== null ? d.rsi : 50;
            return d.totalInvested + ((rsiVal - 50) / 50) * (d.totalValue * 0.15);
        });
        indicatorColor = '#8B5CF6';
    }

    // Render Valuation & P/L Chart
    const plCtx = document.getElementById('adminPlChart');
    if (plCtx) {
        if (adminPlChartInstance) adminPlChartInstance.destroy();
        adminPlChartInstance = new Chart(plCtx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Invested Baseline (₹)',
                        data: investedValues,
                        borderColor: '#94a3b8',
                        borderDash: [5, 5],
                        borderWidth: 2,
                        pointRadius: 0,
                        fill: false,
                        tension: 0.2
                    },
                    {
                        label: 'Current Valuation (₹)',
                        data: currentValues,
                        borderColor: '#10b981',
                        backgroundColor: 'rgba(16, 185, 129, 0.1)',
                        borderWidth: 3,
                        pointBackgroundColor: '#10b981',
                        pointRadius: 4,
                        fill: true,
                        tension: 0.3
                    },
                    {
                        label: indicatorLabel,
                        data: indicatorData,
                        borderColor: indicatorColor,
                        borderWidth: 2,
                        pointRadius: 2,
                        fill: false,
                        tension: 0.4
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'top', labels: { font: { family: 'Outfit', size: 12 } } },
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                        callbacks: {
                            label: function(context) {
                                return context.dataset.label + ': ₹' + Number(context.raw).toLocaleString('en-IN');
                            }
                        }
                    }
                },
                scales: {
                    x: { grid: { display: false } },
                    y: {
                        ticks: {
                            callback: value => '₹' + (value >= 1000 ? (value/1000).toFixed(0) + 'k' : value)
                        }
                    }
                }
            }
        });
    }

    // Render RSI Oscillator Chart
    const rsiCtx = document.getElementById('adminRsiChart');
    if (rsiCtx) {
        if (adminRsiChartInstance) adminRsiChartInstance.destroy();
        const rsiValues = adminAnalyticsData.map(d => d.rsi !== null ? d.rsi : 50);
        adminRsiChartInstance = new Chart(rsiCtx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'RSI (Momentum)',
                        data: rsiValues,
                        borderColor: '#8B5CF6',
                        backgroundColor: 'rgba(139, 92, 246, 0.08)',
                        borderWidth: 2,
                        pointBackgroundColor: '#8B5CF6',
                        pointRadius: 3,
                        fill: true,
                        tension: 0.3
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: context => `RSI: ${context.raw.toFixed(1)} (${context.raw > 70 ? 'Overbought' : context.raw < 30 ? 'Oversold' : 'Neutral'})`
                        }
                    }
                },
                scales: {
                    x: { grid: { display: false } },
                    y: {
                        min: 0,
                        max: 100,
                        ticks: { stepSize: 25 },
                        grid: { color: context => context.tick.value === 70 || context.tick.value === 30 ? 'rgba(239, 68, 68, 0.3)' : 'rgba(0,0,0,0.05)' }
                    }
                }
            }
        });
    }
}

// ===== ADMIN TRANSACTIONS LOG SUB-TAB =====
let adminAllTransactions = [];

async function loadAdminTransactions() {
    await populateAdminInvestorSelects();
    const userSelect = document.getElementById('admin-filter-history-user');
    const selectedUser = userSelect ? userSelect.value : 'ALL';
    const tbody = document.getElementById('admin-history-tbody');

    if (tbody) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding: 30px; color:#64748b;">Loading audit records...</td></tr>';
    }

    try {
        const url = selectedUser && selectedUser !== 'ALL'
            ? `/portfolios/history?user_id=${selectedUser}`
            : '/portfolios/history';
        adminAllTransactions = await api('GET', url);
        filterAdminHistoryTable();
    } catch (err) {
        console.error('Failed to load admin transactions:', err);
        if (tbody) tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding: 30px; color:#dc2626;">Failed to load audit logs: ${err.message}</td></tr>`;
    }
}

function filterAdminHistoryTable() {
    const queryEl = document.getElementById('admin-filter-history-query');
    const typeEl = document.getElementById('admin-filter-history-type');
    const q = queryEl ? queryEl.value.toLowerCase().trim() : '';
    const filterType = typeEl ? typeEl.value : 'ALL';

    const filtered = adminAllTransactions.filter(t => {
        const matchQuery = !q || 
            (t.stock_symbol && t.stock_symbol.toLowerCase().includes(q)) ||
            (t.investor_name && t.investor_name.toLowerCase().includes(q));
        const matchType = filterType === 'ALL' || t.transaction_type === filterType;
        return matchQuery && matchType;
    });

    renderAdminHistoryTable(filtered);
}

function renderAdminHistoryTable(transactions) {
    const tbody = document.getElementById('admin-history-tbody');
    if (!tbody) return;

    if (transactions.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding: 30px; color:#888;">No transactions match your search filter</td></tr>';
        return;
    }

    tbody.innerHTML = transactions.map(t => {
        const badgeCls = t.transaction_type === 'BUY' ? 'badge buy' : 'badge sell';
        const dateStr = new Date(t.timestamp).toLocaleString('en-IN', {
            day: '2-digit', month: 'short', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });

        return `
            <tr>
                <td style="color: #64748b; font-size: 0.88em;">${dateStr}</td>
                <td><strong style="color:#1e293b;">${t.investor_name || 'Investor #' + t.user_id}</strong></td>
                <td><span style="font-weight: 700; color: #0A1E2E;">${t.stock_symbol}</span></td>
                <td><span class="${badgeCls}" style="padding: 3px 8px; border-radius: 6px; font-size: 0.75rem; font-weight: 700; background: ${t.transaction_type === 'BUY' ? '#dcfce7' : '#fee2e2'}; color: ${t.transaction_type === 'BUY' ? '#15803d' : '#b91c1c'};">${t.transaction_type}</span></td>
                <td>${t.quantity}</td>
                <td>${formatMoney(t.price_at_transaction)}</td>
                <td><strong>${formatMoney(t.total_value)}</strong></td>
            </tr>
        `;
    }).join('');
}

// ===== INIT =====
loadDashboard();
loadProfile();
