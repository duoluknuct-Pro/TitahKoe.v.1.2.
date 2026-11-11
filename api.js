/**
 * api.js - HTTP Client Adapter ke Google Apps Script Web App
 * Dilengkapi fallback data simulasi lokal saat backend belum di-deploy.
 */

const API = {
  /**
   * Mengirim request POST ke backend GAS.
   */
  post: async function(action, payload = {}) {
    const token = (window.Auth && typeof Auth.getToken === 'function') ? Auth.getToken() : null;
    const bodyData = {
      action: action,
      token: token,
      ...payload
    };

    // Jika GAS_API_URL belum diatur, gunakan handler simulasi lokal agar frontend bisa langsung dites
    if (!CONFIG.GAS_API_URL || CONFIG.GAS_API_URL.trim() === '') {
      if (CONFIG.DEMO_MODE_IF_NO_URL) {
        console.warn(`[TitahKOE DEMO] Memproses aksi "${action}" via local mock data.`);
        return this.mockHandler(action, bodyData);
      } else {
        throw new Error("URL Google Apps Script belum dikonfigurasi di js/config.js");
      }
    }

    try {
      this.showLoading(true);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), CONFIG.REQUEST_TIMEOUT);

      // Catatan Teknis: Gunakan Content-Type: text/plain untuk mencegah CORS Preflight OPTIONS di GAS
      const response = await fetch(CONFIG.GAS_API_URL, {
        method: "POST",
        mode: "cors",
        redirect: "follow",
        headers: {
          "Content-Type": "text/plain;charset=utf-8"
        },
        body: JSON.stringify(bodyData),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Koneksi HTTP Gagal (Status ${response.status})`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || "Terjadi kesalahan pada pemrosesan server.");
      }

      return result;
    } catch (err) {
      if (err.name === 'AbortError') {
        throw new Error("Waktu tunggu server habis (timeout). Silakan periksa koneksi internet.");
      }
      console.error("API Error:", err);
      throw err;
    } finally {
      this.showLoading(false);
    }
  },

  /**
   * Indikator loading global.
   */
  showLoading: function(show) {
    const loader = document.getElementById('global-loader');
    if (loader) {
      if (show) {
        loader.classList.remove('hidden');
      } else {
        loader.classList.add('hidden');
      }
    }
  },

  /**
   * Menampilkan pesan Toast notifikasi.
   */
  showToast: function(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    const colors = {
      success: 'bg-emerald-600 text-white',
      error: 'bg-rose-600 text-white',
      warning: 'bg-amber-600 text-white',
      info: 'bg-slate-800 text-white'
    };

    toast.className = `px-4 py-3 rounded-lg shadow-lg text-sm font-medium transition-all duration-300 transform translate-y-2 opacity-0 flex items-center space-x-2 ${colors[type] || colors.info}`;
    toast.innerHTML = `<span>${message}</span>`;

    container.appendChild(toast);

    setTimeout(() => {
      toast.classList.remove('translate-y-2', 'opacity-0');
    }, 10);

    setTimeout(() => {
      toast.classList.add('opacity-0', 'translate-y-2');
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  },

  /**
   * Mock Handler lokal untuk pratinjau instan sebelum deploy backend.
   */
  mockHandler: async function(action, payload) {
    await new Promise(r => setTimeout(r, 400)); // Simulasi latensi jaringan

    if (action === 'getInitialData') {
      return {
        success: true,
        data: {
          profiles: [
            {
              profile_id: 'P-001',
              full_name: 'Raden Sastrowardoyo',
              nickname: 'Eyang Sastro',
              gender: 'M',
              birth_date: '1935-05-12',
              birth_place: 'Yogyakarta',
              death_date: '2010-08-20',
              is_alive: 'NO',
              biography: 'Leluhur pendiri keluarga besar, budayawan dan tokoh pendidik.',
              photo_url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=300',
              branch_id: 'BR-001'
            },
            {
              profile_id: 'P-002',
              full_name: 'Siti Aminah',
              nickname: 'Eyang Aminah',
              gender: 'F',
              birth_date: '1940-02-18',
              birth_place: 'Solo',
              death_date: '2018-11-04',
              is_alive: 'NO',
              biography: 'Istri dari Raden Sastrowardoyo, pelestari seni batik klasik.',
              photo_url: 'https://images.unsplash.com/photo-1548142813-c348350df52b?w=300',
              branch_id: 'BR-001'
            },
            {
              profile_id: 'P-003',
              full_name: 'Bambang Sastrowardoyo',
              nickname: 'Pak Bambang',
              gender: 'M',
              birth_date: '1965-07-22',
              birth_place: 'Semarang',
              death_date: '',
              is_alive: 'YES',
              biography: 'Putra pertama, aktif mengurus paguyuban keluarga.',
              photo_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300',
              branch_id: 'BR-001'
            },
            {
              profile_id: 'P-004',
              full_name: 'Dewi Lestari',
              nickname: 'Ibu Dewi',
              gender: 'F',
              birth_date: '1968-09-14',
              birth_place: 'Surabaya',
              death_date: '',
              is_alive: 'YES',
              biography: 'Istri dari Bambang Sastrowardoyo.',
              photo_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300',
              branch_id: 'BR-001'
            },
            {
              profile_id: 'P-005',
              full_name: 'Dimas Prasetyo Sastrowardoyo',
              nickname: 'Dimas',
              gender: 'M',
              birth_date: '1995-03-10',
              birth_place: 'Jakarta',
              death_date: '',
              is_alive: 'YES',
              biography: 'Generasi ketiga, software engineer & inisiator silsilah digital.',
              photo_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=300',
              branch_id: 'BR-001'
            }
          ],
          relations: [
            { relation_id: 'REL-001', from_profile_id: 'P-001', to_profile_id: 'P-002', relation_type: 'SPOUSE', status: 'VERIFIED' },
            { relation_id: 'REL-002', from_profile_id: 'P-001', to_profile_id: 'P-003', relation_type: 'PARENT', status: 'VERIFIED' },
            { relation_id: 'REL-003', from_profile_id: 'P-002', to_profile_id: 'P-003', relation_type: 'PARENT', status: 'VERIFIED' },
            { relation_id: 'REL-004', from_profile_id: 'P-003', to_profile_id: 'P-004', relation_type: 'SPOUSE', status: 'VERIFIED' },
            { relation_id: 'REL-005', from_profile_id: 'P-003', to_profile_id: 'P-005', relation_type: 'PARENT', status: 'VERIFIED' },
            { relation_id: 'REL-006', from_profile_id: 'P-004', to_profile_id: 'P-005', relation_type: 'PARENT', status: 'VERIFIED' }
          ],
          branches: [
            { branch_id: 'BR-001', branch_name: 'Bani Sastro (Yogyakarta)', root_ancestor_profile_id: 'P-001' }
          ],
          currentUser: window.Auth ? window.Auth.getUser() : null
        }
      };
    }

    if (action === 'requestOtp') {
      return { success: true, message: `[DEMO] Kode OTP dikirim ke ${payload.email}. (Gunakan kode: 123456)` };
    }

    if (action === 'verifyOtp') {
      if (payload.otpCode === '123456' || payload.otpCode.length === 6) {
        return {
          success: true,
          token: 'demo-token-12345',
          user: {
            userId: 'U-DEMO',
            email: payload.email,
            role: payload.email.includes('admin') ? 'ADMIN' : 'MEMBER',
            branchId: 'BR-001',
            fullName: payload.email.split('@')[0]
          }
        };
      }
      throw new Error("Kode OTP salah! (Di mode demo gunakan: 123456)");
    }

    if (action === 'getProfile') {
      const initial = await this.mockHandler('getInitialData', {});
      const p = initial.data.profiles.find(x => x.profile_id === payload.profileId);
      return {
        success: true,
        data: {
          profile: p || {},
          family: { parents: [], spouses: [], children: [], siblings: [] },
          gallery: []
        }
      };
    }

    return { success: true, message: "Aksi demo berhasil dieksekusi." };
  }
};
