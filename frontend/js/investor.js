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
function hideAllSections() {
    ['section-portfolio', 'section-analytics', 'section-history', 'section-profile'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.add('hidden');
    });
}

function setActiveNav(event) {
    document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
    const navItem = event?.target?.closest('.nav-item');
    if (navItem) navItem.classList.add('active');
    closeSidebar();
}

function showPortfolio(event) {
    setActiveNav(event);
    hideAllSections();
    document.getElementById('section-portfolio').classList.remove('hidden');
    document.getElementById('page-title').textContent = 'My Portfolio';
}

function showAnalytics(event) {
    setActiveNav(event);
    hideAllSections();
    document.getElementById('section-analytics').classList.remove('hidden');
    document.getElementById('page-title').textContent = 'Analytics & P/L Chart';
    loadAnalytics();
}

function showHistory(event, filterSymbol = '') {
    setActiveNav(event);
    hideAllSections();
    document.getElementById('section-history').classList.remove('hidden');
    document.getElementById('page-title').textContent = 'Transaction History';
    if (typeof filterSymbol === 'string' && filterSymbol) {
        const searchInput = document.getElementById('filter-symbol');
        if (searchInput) searchInput.value = filterSymbol;
    }
    loadHistory().then(() => {
        if (typeof filterSymbol === 'string' && filterSymbol) {
            filterHistoryTable();
        }
    });
}

function showProfile(event) {
    setActiveNav(event);
    hideAllSections();
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
                <td><a href="javascript:void(0)" onclick="viewShareHistory('${h.share_name.replace(/'/g, "\\'")}')" style="color: var(--primary); text-decoration: underline; font-weight: 700;">${h.share_name}</a></td>
                <td>${h.quantity}</td>
                <td>${formatMoney(avgPrice)}</td>
                <td>${formatMoney(h.amount_invested)}</td>
                <td>${formatMoney(h.current_value)}</td>
                <td class="${cls}">${formatMoney(ret)}</td>
                <td class="${cls}">${retPct}%</td>
                <td>
                    <button type="button" class="btn-history-per-share" onclick="viewShareHistory('${h.share_name.replace(/'/g, "\\'")}')" title="View transaction history for ${h.share_name}">
                        📜 History
                    </button>
                </td>
            </tr>
        `;
    });
}

// ===== ANALYTICS & TECHNICAL INDICATORS CHARTING =====
let plChartInstance = null;
let rsiChartInstance = null;
let currentChartData = null;
const activeIndicators = { SMA: true, EMA: true, RSI: true };
let allTransactions = [];

async function loadAnalytics() {
    ['analytics-invested', 'analytics-current', 'analytics-unrealized', 'analytics-winrate'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.innerHTML = '<span class="skeleton skeleton-text"></span>';
    });

    try {
        const data = await api('GET', '/portfolios/analytics');
        const summary = data.summary || {};

        document.getElementById('analytics-invested').textContent = formatMoney(summary.totalInvested);
        document.getElementById('analytics-current').textContent = formatMoney(summary.totalCurrentValue);
        
        const unEl = document.getElementById('analytics-unrealized');
        unEl.textContent = formatMoney(summary.totalUnrealizedPL);
        unEl.className = summary.totalUnrealizedPL >= 0 ? 'positive' : 'negative';

        const wrEl = document.getElementById('analytics-winrate');
        wrEl.textContent = (summary.winRate || 0) + '%';
        wrEl.className = summary.winRate >= 50 ? 'positive' : 'negative';

        currentChartData = data.chartData;
        if (currentChartData) {
            renderCharts(currentChartData);
        }
    } catch (err) {
        console.error('Failed to load portfolio analytics:', err);
    }
}

function renderCharts(chartData) {
    if (plChartInstance) plChartInstance.destroy();
    if (rsiChartInstance) rsiChartInstance.destroy();

    const ctxPL = document.getElementById('plChart')?.getContext('2d');
    if (ctxPL) {
        const datasets = [
            {
                label: 'Unrealized Profit/Loss (₹)',
                data: chartData.pl_series,
                borderColor: '#10b981',
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                borderWidth: 3,
                fill: true,
                tension: 0.3,
                pointRadius: 3,
                pointHoverRadius: 6
            }
        ];

        if (activeIndicators.SMA && chartData.indicators.sma) {
            datasets.push({
                label: 'SMA (7 Period)',
                data: chartData.indicators.sma,
                borderColor: '#f59e0b',
                borderWidth: 2,
                borderDash: [5, 5],
                fill: false,
                tension: 0.3,
                pointRadius: 0
            });
        }

        if (activeIndicators.EMA && chartData.indicators.ema) {
            datasets.push({
                label: 'EMA (7 Period)',
                data: chartData.indicators.ema,
                borderColor: '#8b5cf6',
                borderWidth: 2,
                fill: false,
                tension: 0.3,
                pointRadius: 0
            });
        }

        plChartInstance = new Chart(ctxPL, {
            type: 'line',
            data: {
                labels: chartData.timeline,
                datasets
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        grid: { color: 'rgba(255, 255, 255, 0.06)' },
                        ticks: {
                            color: '#94a3b8',
                            callback: (val) => '₹' + Number(val).toLocaleString('en-IN')
                        }
                    },
                    x: {
                        grid: { display: false },
                        ticks: { color: '#94a3b8' }
                    }
                },
                plugins: {
                    legend: { labels: { color: '#cbd5e1', font: { weight: '600' } } },
                    tooltip: {
                        callbacks: {
                            label: (ctx) => `${ctx.dataset.label}: ₹${Number(ctx.raw || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
                        }
                    }
                }
            }
        });
    }

    const rsiBox = document.getElementById('rsiChart')?.closest('.chart-box');
    if (!activeIndicators.RSI) {
        if (rsiBox) rsiBox.style.display = 'none';
    } else {
        if (rsiBox) rsiBox.style.display = 'block';
        const ctxRSI = document.getElementById('rsiChart')?.getContext('2d');
        if (ctxRSI) {
            rsiChartInstance = new Chart(ctxRSI, {
                type: 'line',
                data: {
                    labels: chartData.timeline,
                    datasets: [
                        {
                            label: 'RSI (7 Period Momentum)',
                            data: chartData.indicators.rsi,
                            borderColor: '#06b6d4',
                            backgroundColor: 'rgba(6, 182, 212, 0.05)',
                            borderWidth: 2,
                            fill: true,
                            tension: 0.3,
                            pointRadius: 2
                        },
                        {
                            label: 'Overbought (70)',
                            data: chartData.timeline.map(() => 70),
                            borderColor: 'rgba(239, 68, 68, 0.5)',
                            borderWidth: 1,
                            borderDash: [3, 3],
                            pointRadius: 0,
                            fill: false
                        },
                        {
                            label: 'Oversold (30)',
                            data: chartData.timeline.map(() => 30),
                            borderColor: 'rgba(16, 185, 129, 0.5)',
                            borderWidth: 1,
                            borderDash: [3, 3],
                            pointRadius: 0,
                            fill: false
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: {
                            min: 0,
                            max: 100,
                            grid: { color: 'rgba(255, 255, 255, 0.06)' },
                            ticks: { color: '#94a3b8' }
                        },
                        x: {
                            grid: { display: false },
                            ticks: { color: '#94a3b8' }
                        }
                    },
                    plugins: {
                        legend: { labels: { color: '#cbd5e1' } }
                    }
                }
            });
        }
    }
}

function toggleIndicator(name) {
    activeIndicators[name] = !activeIndicators[name];
    const btn = document.getElementById('toggle-' + name.toLowerCase());
    if (btn) {
        if (activeIndicators[name]) btn.classList.add('active');
        else btn.classList.remove('active');
    }
    if (currentChartData) {
        renderCharts(currentChartData);
    }
}

// ===== TRANSACTION HISTORY =====
async function loadHistory() {
    const tbody = document.getElementById('history-tbody');
    if (tbody) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 24px; color: #64748b;">Loading transaction history...</td></tr>';
    }

    try {
        allTransactions = await api('GET', '/portfolios/history');
        renderHistoryTable(allTransactions);
    } catch (err) {
        console.error('Failed to load transaction history:', err);
        if (tbody) {
            tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:24px;color:#dc2626">${err.message || 'Error loading transactions'}</td></tr>`;
        }
    }
}

function filterHistoryTable() {
    const query = document.getElementById('filter-symbol')?.value?.toLowerCase() || '';
    const typeFilter = document.getElementById('filter-type')?.value || 'ALL';

    const filtered = allTransactions.filter(t => {
        const matchesSymbol = t.stock_symbol?.toLowerCase().includes(query);
        const matchesType = typeFilter === 'ALL' || t.transaction_type === typeFilter;
        return matchesSymbol && matchesType;
    });

    renderHistoryTable(filtered);
}

function renderHistoryTable(transactions) {
    const tbody = document.getElementById('history-tbody');
    if (!tbody) return;

    if (!transactions || transactions.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:24px;color:#888;">No transactions found</td></tr>';
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
                <td style="color: #94a3b8; font-size: 0.9em;">${dateStr}</td>
                <td><strong>${t.stock_symbol}</strong></td>
                <td><span class="${badgeCls}">${t.transaction_type}</span></td>
                <td>${t.quantity}</td>
                <td>${formatMoney(t.price_at_transaction)}</td>
                <td><strong>${formatMoney(t.total_value)}</strong></td>
            </tr>
        `;
    }).join('');
}

// ===== PER-SHARE TRANSACTION HISTORY MODAL =====
async function viewShareHistory(shareName) {
    const modal = document.getElementById('share-history-modal');
    if (modal) modal.classList.remove('hidden');
    
    document.getElementById('modal-share-title').textContent = `${shareName} - Transaction History`;
    
    const tbody = document.getElementById('modal-history-tbody');
    if (tbody) tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding: 24px; color:#64748b;">Loading per-share transactions...</td></tr>';

    const fullHistoryBtn = document.getElementById('btn-modal-full-history');
    if (fullHistoryBtn) {
        fullHistoryBtn.onclick = () => {
            closeShareHistoryModal();
            showHistory(null, shareName);
        };
    }

    try {
        if (!allTransactions || allTransactions.length === 0) {
            allTransactions = await api('GET', '/portfolios/history');
        }
        
        const shareTransactions = allTransactions.filter(t => 
            t.stock_symbol && t.stock_symbol.toLowerCase() === shareName.toLowerCase()
        );

        let totalBoughtVal = 0;
        let totalSoldVal = 0;
        shareTransactions.forEach(t => {
            if (t.transaction_type === 'BUY') totalBoughtVal += Number(t.total_value || 0);
            else if (t.transaction_type === 'SELL') totalSoldVal += Number(t.total_value || 0);
        });

        document.getElementById('modal-total-bought').textContent = formatMoney(totalBoughtVal);
        document.getElementById('modal-total-sold').textContent = formatMoney(totalSoldVal);
        document.getElementById('modal-total-orders').textContent = shareTransactions.length;

        if (shareTransactions.length === 0) {
            if (tbody) tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding: 24px; color:#888;">No recorded transactions for this share</td></tr>';
            return;
        }

        if (tbody) {
            tbody.innerHTML = shareTransactions.map(t => {
                const badgeCls = t.transaction_type === 'BUY' ? 'badge buy' : 'badge sell';
                const dateStr = new Date(t.timestamp).toLocaleString('en-IN', {
                    day: '2-digit', month: 'short', year: 'numeric',
                    hour: '2-digit', minute: '2-digit'
                });

                return `
                    <tr>
                        <td style="color: #64748b; font-size: 0.88em;">${dateStr}</td>
                        <td><span class="${badgeCls}">${t.transaction_type}</span></td>
                        <td>${t.quantity}</td>
                        <td>${formatMoney(t.price_at_transaction)}</td>
                        <td><strong>${formatMoney(t.total_value)}</strong></td>
                    </tr>
                `;
            }).join('');
        }
    } catch (err) {
        console.error('Error loading per-share history:', err);
        if (tbody) tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding: 24px; color:#dc2626;">Failed to load transactions: ${err.message}</td></tr>`;
    }
}

function closeShareHistoryModal() {
    const modal = document.getElementById('share-history-modal');
    if (modal) modal.classList.add('hidden');
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
