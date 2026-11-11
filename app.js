/**
 * app.js - Orkestrasi Aplikasi Utama TitahKOE
 */

const App = {
  allProfiles: [],
  allRelations: [],
  allBranches: [],
  activeBranchId: 'ALL',

  init: async function() {
    console.log("Inisialisasi TitahKOE Frontend...");

    // Setup Engine & Komponen
    TreeEngine.init('#tree-canvas-container');
    Auth.init();
    ProfileModal.init();
    AdminPanel.init();

    this.setupSearch();
    this.setupBranchFilter();
    this.setupAddProfileModal();

    // Muat data awal
    await this.loadInitialData();

    // Responsif jika window di-resize
    window.addEventListener('resize', () => {
      TreeEngine.init('#tree-canvas-container');
      this.applyFilterAndRender();
    });
  },

  loadInitialData: async function() {
    try {
      const res = await API.post('getInitialData');
      const data = res.data;

      this.allProfiles = data.profiles || [];
      this.allRelations = data.relations || [];
      this.allBranches = data.branches || [];

      // Update dropdown cabang keluarga
      this.populateBranchDropdown();

      // Render pohon silsilah
      this.applyFilterAndRender();

      // Update status counter di UI
      document.getElementById('stat-total-profiles').textContent = this.allProfiles.length;
      document.getElementById('stat-total-relations').textContent = this.allRelations.length;
    } catch (err) {
      API.showToast("Gagal memuat data silsilah: " + err.message, "error");
    }
  },

  setupBranchFilter: function() {
    const select = document.getElementById('select-branch-filter');
    if (select) {
      select.addEventListener('change', (e) => {
        this.activeBranchId = e.target.value;
        this.applyFilterAndRender();
      });
    }
  },

  populateBranchDropdown: function() {
    const select = document.getElementById('select-branch-filter');
    if (!select) return;

    select.innerHTML = '<option value="ALL">Semua Cabang Keluarga</option>';
    this.allBranches.forEach(b => {
      const opt = document.createElement('option');
      opt.value = b.branch_id;
      opt.textContent = b.branch_name;
      select.appendChild(opt);
    });
  },

  applyFilterAndRender: function() {
    let filteredProfiles = this.allProfiles;

    if (this.activeBranchId !== 'ALL') {
      filteredProfiles = this.allProfiles.filter(p => p.branch_id === this.activeBranchId);
    }

    const profileIdSet = new Set(filteredProfiles.map(p => p.profile_id));
    const filteredRelations = this.allRelations.filter(r => 
      profileIdSet.has(r.from_profile_id) && profileIdSet.has(r.to_profile_id)
    );

    TreeEngine.render(filteredProfiles, filteredRelations);
  },

  setupSearch: function() {
    const searchInput = document.getElementById('input-search-member');
    const resultsContainer = document.getElementById('search-results-dropdown');

    if (!searchInput || !resultsContainer) return;

    searchInput.addEventListener('input', (e) => {
      const q = e.target.value.toLowerCase().trim();
      if (!q) {
        resultsContainer.classList.add('hidden');
        resultsContainer.innerHTML = '';
        return;
      }

      const matches = this.allProfiles.filter(p => 
        (p.full_name && p.full_name.toLowerCase().includes(q)) ||
        (p.nickname && p.nickname.toLowerCase().includes(q)) ||
        (p.birth_place && p.birth_place.toLowerCase().includes(q))
      ).slice(0, 8);

      if (matches.length === 0) {
        resultsContainer.innerHTML = '<div class="p-3 text-xs text-slate-400">Tidak ada nama yang cocok</div>';
      } else {
        resultsContainer.innerHTML = '';
        matches.forEach(m => {
          const item = document.createElement('div');
          item.className = "flex items-center space-x-2 p-2 hover:bg-slate-100 cursor-pointer text-xs border-b border-slate-100 last:border-none";
          item.onclick = () => {
            searchInput.value = m.full_name;
            resultsContainer.classList.add('hidden');
            TreeEngine.focusOnProfile(m.profile_id);
          };

          const avatar = m.photo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(m.full_name)}&background=0284c7&color=fff&size=48`;
          item.innerHTML = `
            <img src="${avatar}" class="w-6 h-6 rounded-full object-cover" />
            <div class="overflow-hidden">
              <span class="font-bold text-slate-800">${m.full_name}</span>
              <span class="text-slate-400 ml-1">(${m.nickname || 'Kerabat'})</span>
            </div>
          `;
          resultsContainer.appendChild(item);
        });
      }

      resultsContainer.classList.remove('hidden');
    });

    // Sembunyikan hasil cari jika klik di luar
    document.addEventListener('click', (e) => {
      if (!searchInput.contains(e.target) && !resultsContainer.contains(e.target)) {
        resultsContainer.classList.add('hidden');
      }
    });
  },

  setupAddProfileModal: function() {
    const btnOpen = document.getElementById('btn-open-add-profile');
    const modal = document.getElementById('add-profile-modal');
    const btnClose = document.getElementById('btn-close-add-profile');
    const form = document.getElementById('form-create-new-profile');

    if (btnOpen && modal) {
      btnOpen.addEventListener('click', () => {
        if (!Auth.isLoggedIn()) {
          API.showToast("Silakan masuk terlebih dahulu untuk menambah anggota silsilah.", "warning");
          Auth.openLoginModal();
          return;
        }
        modal.classList.remove('hidden');
      });
    }

    if (btnClose && modal) {
      btnClose.addEventListener('click', () => modal.classList.add('hidden'));
    }

    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const payload = {
          full_name: document.getElementById('new-profile-name').value.trim(),
          nickname: document.getElementById('new-profile-nickname').value.trim(),
          gender: document.getElementById('new-profile-gender').value,
          birth_date: document.getElementById('new-profile-birth-date').value,
          birth_place: document.getElementById('new-profile-birth-place').value.trim(),
          is_alive: document.getElementById('new-profile-is-alive').value,
          biography: document.getElementById('new-profile-bio').value.trim(),
          branch_id: document.getElementById('new-profile-branch').value || 'BR-001'
        };

        try {
          const res = await API.post('saveProfile', { profileData: payload });
          API.showToast(res.message || "Anggota baru berhasil ditambahkan!", "success");
          modal.classList.add('hidden');
          form.reset();
          await this.loadInitialData();
        } catch (err) {
          API.showToast(err.message, "error");
        }
      });
    }
  }
};

// Jalankan aplikasi saat DOM siap
document.addEventListener('DOMContentLoaded', () => {
  App.init();
});
