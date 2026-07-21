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
    ['total-invested', 'total-current', 'total-pl', 'total-pct'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.innerHTML = '<span class="skeleton skeleton-text"></span>';
    });

    const tbody = document.getElementById('portfolio-tbody');
    if (tbody) {
        tbody.innerHTML = Array(3).fill(0).map(() => `
            <tr>
                <td><div class="skeleton skeleton-cell" style="width: 140px;"></div></td>
                <td><div class="skeleton skeleton-cell" style="width: 60px;"></div></td>
                <td><div class="skeleton skeleton-cell" style="width: 80px;"></div></td>
                <td><div class="skeleton skeleton-cell" style="width: 100px;"></div></td>
                <td><div class="skeleton skeleton-cell" style="width: 100px;"></div></td>
                <td><div class="skeleton skeleton-cell" style="width: 80px;"></div></td>
                <td><div class="skeleton skeleton-cell" style="width: 60px;"></div></td>
                <td><div class="skeleton skeleton-cell" style="width: 80px;"></div></td>
            </tr>
        `).join('');
    }

    try {
        const holdings = await api('GET', '/portfolios/my');
        renderSummary(holdings);
        renderTable(holdings);
    } catch (err) {
        if (tbody) tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:30px;color:#dc2626">${err.message || 'Failed to load portfolio'}</td></tr>`;
        ['total-invested', 'total-current', 'total-pl', 'total-pct'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.textContent = '-';
        });
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
        tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:30px;color:#888">No holdings yet</td></tr>';
        return;
    }

    holdings.forEach(h => {
        const ret = Number(h.current_value) - Number(h.amount_invested);
        const retPct = h.amount_invested > 0 ? ((ret / h.amount_invested) * 100).toFixed(2) : '0.00';
        const cls = ret >= 0 ? 'positive' : 'negative';
        const avgPrice = h.average_buy_price !== undefined ? h.average_buy_price : h.buy_price;

        tbody.innerHTML += `
            <tr>
                <td><strong>${h.share_name}</strong></td>
                <td>${h.quantity}</td>
                <td>${formatMoney(avgPrice)}</td>
                <td>${formatMoney(h.amount_invested)}</td>
                <td>${formatMoney(h.current_value)}</td>
                <td class="${cls}">${formatMoney(ret)}</td>
                <td class="${cls}">${retPct}%</td>
                <td style="text-align:center;">
                    <div class="action-buttons">
                        <button class="btn-action btn-buy" onclick="openTradeModal('BUY', '${h.share_name.replace(/'/g, "\\'")}', ${h.quantity}, ${avgPrice})">Buy</button>
                        <button class="btn-action btn-sell" onclick="openTradeModal('SELL', '${h.share_name.replace(/'/g, "\\'")}', ${h.quantity}, ${avgPrice})">Sell</button>
                    </div>
                </td>
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

// ===== TRADE MODAL & BUY/SELL LOGIC =====
let currentMaxQuantity = 0;

function openTradeModal(type, symbol = '', maxQty = 0, currentPrice = '') {
    const modal = document.getElementById('trade-modal');
    const title = document.getElementById('modal-title');
    const typeInput = document.getElementById('trade-type');
    const symbolInput = document.getElementById('trade-symbol');
    const qtyInput = document.getElementById('trade-quantity');
    const priceInput = document.getElementById('trade-price');
    const noteEl = document.getElementById('trade-note');
    const submitBtn = document.getElementById('trade-submit-btn');

    typeInput.value = type;
    symbolInput.value = symbol;
    priceInput.value = currentPrice ? Number(currentPrice).toFixed(2) : '';
    qtyInput.value = '';
    currentMaxQuantity = Number(maxQty || 0);

    if (type === 'BUY') {
        title.textContent = symbol ? `Buy Shares of ${symbol}` : 'Buy New Stock';
        submitBtn.textContent = 'Confirm Buy';
        submitBtn.className = 'btn-primary btn-buy-submit';
        symbolInput.readOnly = !!symbol;
        qtyInput.max = '';
        noteEl.textContent = symbol ? `You currently hold ${currentMaxQuantity} shares.` : '';
    } else {
        title.textContent = `Sell Shares of ${symbol}`;
        submitBtn.textContent = 'Confirm Sell';
        submitBtn.className = 'btn-primary btn-sell-submit';
        symbolInput.readOnly = true;
        qtyInput.max = currentMaxQuantity;
        noteEl.textContent = `Available to sell: ${currentMaxQuantity} shares.`;
    }

    updateTradeTotal();
    modal.classList.remove('hidden');
}

function closeTradeModal() {
    document.getElementById('trade-modal').classList.add('hidden');
    document.getElementById('trade-form').reset();
}

function updateTradeTotal() {
    const qty = Number(document.getElementById('trade-quantity').value || 0);
    const price = Number(document.getElementById('trade-price').value || 0);
    const total = qty * price;
    document.getElementById('trade-total').textContent = formatMoney(total);
}

async function submitTrade(event) {
    event.preventDefault();
    const type = document.getElementById('trade-type').value;
    const stock_symbol = document.getElementById('trade-symbol').value.trim();
    const quantity = Number(document.getElementById('trade-quantity').value);
    const current_price = Number(document.getElementById('trade-price').value);

    if (!stock_symbol || quantity <= 0 || current_price <= 0) {
        alert('Please enter a valid stock symbol, positive quantity, and price.');
        return;
    }

    if (type === 'SELL' && quantity > currentMaxQuantity) {
        alert(`You cannot sell more shares than you currently own (${currentMaxQuantity} shares).`);
        return;
    }

    const endpoint = type === 'BUY' ? '/portfolio/buy' : '/portfolio/sell';
    const submitBtn = document.getElementById('trade-submit-btn');
    const origText = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = 'Processing...';

    try {
        const response = await api('POST', endpoint, {
            stock_symbol,
            quantity,
            current_price
        });

        alert(response.message || `Successfully processed ${type} order!`);
        closeTradeModal();
        await loadMyPortfolio();
    } catch (err) {
        alert(err.message || `Failed to process ${type} request`);
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = origText;
    }
}
