/**
 * ConnectSphere - Authentication Logic (Login & Register)
 */

document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');

    // ==========================================
    // LOGIN FORM HANDLER
    // ==========================================
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const usernameInput = document.getElementById('login-username');
            const passwordInput = document.getElementById('login-password');
            const errorAlert = document.getElementById('auth-error');
            const submitBtn = document.getElementById('login-submit-btn');

            const username = usernameInput.value.trim();
            const password = passwordInput.value;

            // Clear previous errors
            if (errorAlert) {
                errorAlert.style.display = 'none';
                errorAlert.textContent = '';
            }

            if (!username || !password) {
                if (errorAlert) {
                    errorAlert.textContent = 'Please provide both username/email and password.';
                    errorAlert.style.display = 'block';
                }
                return;
            }

            try {
                submitBtn.disabled = true;
                submitBtn.textContent = 'Signing in...';

                await apiRequest('/api/login/', {
                    method: 'POST',
                    body: { username, password }
                });

                showToast('Welcome back! Redirecting...', 'success');
                setTimeout(() => {
                    window.location.href = '/';
                }, 400);
            } catch (err) {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Sign In';
                if (errorAlert) {
                    errorAlert.textContent = err.message || 'Login failed. Please check your credentials.';
                    errorAlert.style.display = 'block';
                } else {
                    showToast(err.message, 'error');
                }
            }
        });
    }

    // ==========================================
    // REGISTER FORM HANDLER
    // ==========================================
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const usernameInput = document.getElementById('reg-username');
            const emailInput = document.getElementById('reg-email');
            const passwordInput = document.getElementById('reg-password');
            const confirmInput = document.getElementById('reg-confirm-password');
            const errorAlert = document.getElementById('auth-error');
            const submitBtn = document.getElementById('register-submit-btn');

            const username = usernameInput.value.trim();
            const email = emailInput.value.trim();
            const password = passwordInput.value;
            const confirm_password = confirmInput.value;

            // Clear previous errors
            if (errorAlert) {
                errorAlert.style.display = 'none';
                errorAlert.textContent = '';
            }

            // Client-side validation
            if (username.length < 3) {
                showError('Username must be at least 3 characters long.');
                return;
            }

            if (!email || !email.includes('@')) {
                showError('Please enter a valid email address.');
                return;
            }

            if (password.length < 6) {
                showError('Password must be at least 6 characters long.');
                return;
            }

            if (password !== confirm_password) {
                showError('Passwords do not match.');
                return;
            }

            function showError(msg) {
                if (errorAlert) {
                    errorAlert.textContent = msg;
                    errorAlert.style.display = 'block';
                } else {
                    showToast(msg, 'error');
                }
            }

            try {
                submitBtn.disabled = true;
                submitBtn.textContent = 'Creating Account...';

                await apiRequest('/api/register/', {
                    method: 'POST',
                    body: {
                        username,
                        email,
                        password,
                        confirm_password
                    }
                });

                showToast('Account created successfully! Welcome to ConnectSphere.', 'success');
                setTimeout(() => {
                    window.location.href = '/';
                }, 500);
            } catch (err) {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Create Account';
                showError(err.message || 'Registration failed.');
            }
        });
    }
});
