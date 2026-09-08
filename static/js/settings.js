/**
 * ConnectSphere - Account & Security Settings Logic
 */

let currentUserData = null;
let selectedAvatarFile = null;

document.addEventListener('DOMContentLoaded', async () => {
    await loadInitialSettings();
});

// Switch visible settings tab
function switchSettingsSection(sectionId) {
    const sections = ['password', 'account', 'profile', 'privacy', 'danger'];
    sections.forEach(sec => {
        const el = document.getElementById(`section-${sec}`);
        const btn = document.getElementById(`snav-${sec}`);
        if (el) el.style.display = sec === sectionId ? 'block' : 'none';
        if (btn) {
            if (sec === sectionId) btn.classList.add('active');
            else btn.classList.remove('active');
        }
    });
}

// Toggle show/hide password text
function togglePassVisibility(inputId) {
    const input = document.getElementById(inputId);
    if (input) {
        input.type = input.type === 'password' ? 'text' : 'password';
    }
}

// Load current user information
async function loadInitialSettings() {
    try {
        currentUserData = await apiRequest('/api/me/');
        if (!currentUserData) return;

        // Populate Account fields
        const usernameInput = document.getElementById('account-username');
        const emailInput = document.getElementById('account-email');
        if (usernameInput) usernameInput.value = currentUserData.username || '';
        if (emailInput) emailInput.value = currentUserData.email || '';

        // Update password notification banner email
        const notifyEmailSpan = document.getElementById('pwd-notify-email');
        if (notifyEmailSpan) {
            notifyEmailSpan.textContent = currentUserData.email || 'no email linked';
        }

        // Populate Profile fields
        const bioInput = document.getElementById('settings-bio');
        const avatarPreview = document.getElementById('settings-avatar-preview');
        const avatarFallback = document.getElementById('settings-avatar-fallback');

        if (bioInput) bioInput.value = currentUserData.bio || '';
        if (currentUserData.profile_picture && avatarPreview) {
            avatarPreview.src = currentUserData.profile_picture;
            avatarPreview.style.display = 'block';
            if (avatarFallback) avatarFallback.style.display = 'none';
        }
    } catch (err) {
        console.error('Could not load user settings:', err);
    }
}

// ==========================================
// 1. CHANGE PASSWORD HANDLER
// ==========================================
async function handleChangePassword(e) {
    e.preventDefault();

    const currentPasswordInput = document.getElementById('current-password');
    const newPasswordInput = document.getElementById('new-password');
    const confirmPasswordInput = document.getElementById('confirm-new-password');
    const saveBtn = document.getElementById('btn-save-password');

    const current_password = currentPasswordInput.value;
    const new_password = newPasswordInput.value;
    const confirm_password = confirmPasswordInput.value;

    if (!current_password || !new_password || !confirm_password) {
        showToast('Please fill in all password fields.', 'error');
        return;
    }

    if (new_password.length < 6) {
        showToast('New password must be at least 6 characters long.', 'error');
        return;
    }

    if (new_password !== confirm_password) {
        showToast('New passwords do not match.', 'error');
        return;
    }

    try {
        saveBtn.disabled = true;
        saveBtn.textContent = 'Updating...';

        const res = await apiRequest('/api/settings/change-password/', {
            method: 'POST',
            body: {
                current_password,
                new_password,
                confirm_password
            }
        });

        showToast(res.message || 'Password changed successfully!', 'success');
        currentPasswordInput.value = '';
        newPasswordInput.value = '';
        confirmPasswordInput.value = '';
    } catch (err) {
        showToast(err.message || 'Failed to update password.', 'error');
    } finally {
        saveBtn.disabled = false;
        saveBtn.textContent = 'Update Password';
    }
}

// ==========================================
// 2. UPDATE ACCOUNT (USERNAME / EMAIL)
// ==========================================
async function handleUpdateAccount(e) {
    e.preventDefault();

    const usernameInput = document.getElementById('account-username');
    const emailInput = document.getElementById('account-email');
    const saveBtn = document.getElementById('btn-save-account');

    const username = usernameInput.value.trim();
    const email = emailInput.value.trim();

    if (!username) {
        showToast('Username cannot be empty.', 'error');
        return;
    }

    try {
        saveBtn.disabled = true;
        saveBtn.textContent = 'Saving...';

        const res = await apiRequest('/api/settings/account/', {
            method: 'PUT',
            body: { username, email }
        });

        showToast(res.message || 'Account updated successfully!', 'success');
        const notifyEmailSpan = document.getElementById('pwd-notify-email');
        if (notifyEmailSpan && email) {
            notifyEmailSpan.textContent = email;
        }
        // If username changed, update current URL state
        if (res.user && res.user.username !== currentUserData?.username) {
            setTimeout(() => {
                window.location.reload();
            }, 1000);
        }
    } catch (err) {
        showToast(err.message || 'Failed to update account.', 'error');
    } finally {
        saveBtn.disabled = false;
        saveBtn.textContent = 'Save Changes';
    }
}

// ==========================================
// 3. UPDATE PROFILE & AVATAR
// ==========================================
function previewNewAvatar(e) {
    const file = e.target.files[0];
    if (!file) return;

    selectedAvatarFile = file;
    const reader = new FileReader();
    reader.onload = (event) => {
        const preview = document.getElementById('settings-avatar-preview');
        const fallback = document.getElementById('settings-avatar-fallback');
        if (preview) {
            preview.src = event.target.result;
            preview.style.display = 'block';
        }
        if (fallback) fallback.style.display = 'none';
    };
    reader.readAsDataURL(file);
}

async function handleUpdateProfile(e) {
    e.preventDefault();

    const bioInput = document.getElementById('settings-bio');
    const saveBtn = document.getElementById('btn-save-profile');
    const bio = bioInput.value.trim();

    const formData = new FormData();
    formData.append('bio', bio);
    if (selectedAvatarFile) {
        formData.append('profile_picture', selectedAvatarFile);
    }

    try {
        saveBtn.disabled = true;
        saveBtn.textContent = 'Saving...';

        const res = await apiRequest('/api/profile/', {
            method: 'PUT',
            body: formData
        });

        showToast(res.message || 'Profile saved successfully!', 'success');
        selectedAvatarFile = null;
    } catch (err) {
        showToast(err.message || 'Failed to update profile.', 'error');
    } finally {
        saveBtn.disabled = false;
        saveBtn.textContent = 'Save Profile';
    }
}

// ==========================================
// 4. DANGER ZONE: DELETE ACCOUNT
// ==========================================
function openDeleteAccountModal() {
    const modal = document.getElementById('modal-delete-account');
    if (modal) modal.style.display = 'flex';
}

function closeDeleteAccountModal() {
    const modal = document.getElementById('modal-delete-account');
    const input = document.getElementById('delete-password-input');
    if (modal) modal.style.display = 'none';
    if (input) input.value = '';
}

async function handleConfirmDeleteAccount(e) {
    e.preventDefault();

    const input = document.getElementById('delete-password-input');
    const btn = document.getElementById('btn-confirm-delete');
    const password = input.value;

    if (!password) {
        showToast('Please enter your password.', 'error');
        return;
    }

    try {
        btn.disabled = true;
        btn.textContent = 'Deleting...';

        const res = await apiRequest('/api/settings/delete-account/', {
            method: 'POST',
            body: { password }
        });

        showToast(res.message || 'Account deleted.', 'info');
        setTimeout(() => {
            window.location.href = '/login/';
        }, 1200);
    } catch (err) {
        showToast(err.message || 'Incorrect password.', 'error');
        btn.disabled = false;
        btn.textContent = 'Permanently Delete';
    }
}
