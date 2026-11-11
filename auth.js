/**
 * auth.js - Pengelolaan Autentikasi Pengguna & Sesi LocalStorage
 */

const Auth = {
  TOKEN_KEY: 'titahkoe_session_token',
  USER_KEY: 'titahkoe_user_data',

  getToken: function() {
    return localStorage.getItem(this.TOKEN_KEY);
  },

  getUser: function() {
    const raw = localStorage.getItem(this.USER_KEY);
    try {
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  },

  isLoggedIn: function() {
    return !!this.getToken();
  },

  isAdmin: function() {
    const u = this.getUser();
    return u && u.role === 'ADMIN';
  },

  init: function() {
    this.updateUIState();
    this.setupListeners();
  },

  updateUIState: function() {
    const user = this.getUser();
    const guestSection = document.getElementById('auth-guest-section');
    const userSection = document.getElementById('auth-user-section');
    const userNameEl = document.getElementById('user-display-name');
    const userRoleEl = document.getElementById('user-role-badge');
    const adminMenuBtn = document.getElementById('btn-admin-menu');

    if (user && this.isLoggedIn()) {
      if (guestSection) guestSection.classList.add('hidden');
      if (userSection) userSection.classList.remove('hidden');
      if (userNameEl) userNameEl.textContent = user.fullName || user.email;
      if (userRoleEl) {
        userRoleEl.textContent = user.role || 'MEMBER';
        userRoleEl.className = user.role === 'ADMIN' ? 
          'px-2 py-0.5 rounded text-xs font-semibold bg-amber-500 text-slate-900' : 
          'px-2 py-0.5 rounded text-xs font-semibold bg-slate-700 text-slate-200';
      }
      if (adminMenuBtn) {
        if (user.role === 'ADMIN') {
          adminMenuBtn.classList.remove('hidden');
        } else {
          adminMenuBtn.classList.add('hidden');
        }
      }
    } else {
      if (guestSection) guestSection.classList.remove('hidden');
      if (userSection) userSection.classList.add('hidden');
      if (adminMenuBtn) adminMenuBtn.classList.add('hidden');
    }
  },

  setupListeners: function() {
    // Tombol Buka Modal Login
    const btnOpenLogin = document.getElementById('btn-open-login');
    if (btnOpenLogin) {
      btnOpenLogin.addEventListener('click', () => this.openLoginModal());
    }

    // Tombol Logout
    const btnLogout = document.getElementById('btn-logout');
    if (btnLogout) {
      btnLogout.addEventListener('click', () => this.logout());
    }

    // Form Kirim OTP
    const formOtp = document.getElementById('form-request-otp');
    if (formOtp) {
      formOtp.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('input-login-email').value;
        await this.handleRequestOtp(email);
      });
    }

    // Form Verifikasi OTP
    const formVerify = document.getElementById('form-verify-otp');
    if (formVerify) {
      formVerify.addEventListener('submit', async (e) => {
        e.preventDefault();
        const code = document.getElementById('input-otp-code').value;
        await this.handleVerifyOtp(code);
      });
    }

    // Modal close
    const btnClose = document.getElementById('btn-close-login-modal');
    if (btnClose) {
      btnClose.addEventListener('click', () => this.closeLoginModal());
    }
  },

  _pendingEmail: '',

  openLoginModal: function() {
    const modal = document.getElementById('login-modal');
    const stepEmail = document.getElementById('login-step-email');
    const stepOtp = document.getElementById('login-step-otp');
    if (modal) {
      modal.classList.remove('hidden');
      if (stepEmail) stepEmail.classList.remove('hidden');
      if (stepOtp) stepOtp.classList.add('hidden');
    }
  },

  closeLoginModal: function() {
    const modal = document.getElementById('login-modal');
    if (modal) modal.classList.add('hidden');
  },

  handleRequestOtp: async function(email) {
    if (!email) return;
    try {
      this._pendingEmail = email.trim();
      const res = await API.post('requestOtp', { email: this._pendingEmail });
      API.showToast(res.message || "Kode OTP telah dikirimkan ke email Anda.", "success");

      // Pindah ke step verifikasi OTP
      document.getElementById('login-step-email').classList.add('hidden');
      document.getElementById('login-step-otp').classList.remove('hidden');
      document.getElementById('otp-sent-to').textContent = this._pendingEmail;
    } catch (err) {
      API.showToast(err.message, "error");
    }
  },

  handleVerifyOtp: async function(otpCode) {
    if (!otpCode) return;
    try {
      const res = await API.post('verifyOtp', {
        email: this._pendingEmail,
        otpCode: otpCode.trim()
      });

      localStorage.setItem(this.TOKEN_KEY, res.token);
      localStorage.setItem(this.USER_KEY, JSON.stringify(res.user));

      API.showToast(`Selamat datang, ${res.user.fullName || 'Kerabat'}!`, "success");
      this.closeLoginModal();
      this.updateUIState();

      // Refresh data aplikasi
      if (window.App && typeof App.loadInitialData === 'function') {
        App.loadInitialData();
      }
    } catch (err) {
      API.showToast(err.message, "error");
    }
  },

  logout: function() {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
    this.updateUIState();
    API.showToast("Anda telah keluar dari sesi.", "info");
    if (window.App && typeof App.loadInitialData === 'function') {
      App.loadInitialData();
    }
  }
};
