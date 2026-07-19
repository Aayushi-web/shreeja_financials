
// Show/Hide password
document.getElementById('toggle-password').addEventListener('click', function() {
    const pwd = document.getElementById('password');
    if (pwd.type === 'password') {
        pwd.type = 'text';
        this.textContent = '🙈';
    } else {
        pwd.type = 'password';
        this.textContent = '👁️';
    }
});

// Handle Login
async function handleLogin() {
    const user_id = document.getElementById('user_id').value.trim();
    const password = document.getElementById('password').value.trim();
    const errorMsg = document.getElementById('error-msg');
    const btn = document.getElementById('login-btn');

    // Basic validation
    if (!user_id || !password) {
        errorMsg.textContent = 'Please fill in all fields';
        errorMsg.classList.remove('hidden');
        return;
    }

    btn.textContent = 'Logging in...';
    btn.disabled = true;

    try {
        const response = await fetch(`${API}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id, password })
        });

        const data = await response.json();

        if (response.ok) {
            // Save token and user info
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));

            // Redirect based on role
            if (data.user.role === 'admin') {
                window.location.href = 'pages/admin-dashboard.html';
            } else {
                window.location.href = 'pages/investor-dashboard.html';
            }
        } else {
            errorMsg.textContent = data.message;
            errorMsg.classList.remove('hidden');
        }
    } catch (err) {
        errorMsg.textContent = 'Cannot connect to server. Please try again.';
        errorMsg.classList.remove('hidden');
    }

    btn.textContent = 'Login';
    btn.disabled = false;
}