/**
 * admin.js - Logika Panel Kontrol Admin Keluarga & Moderasi Relasi
 */

const AdminPanel = {
  init: function() {
    this.setupListeners();
  },

  setupListeners: function() {
    const btnOpenAdmin = document.getElementById('btn-admin-menu');
    if (btnOpenAdmin) {
      btnOpenAdmin.addEventListener('click', () => this.open());
    }

    const btnClose = document.getElementById('btn-close-admin-modal');
    if (btnClose) {
      btnClose.addEventListener('click', () => this.close());
    }

    // Tab switcher di Admin Modal
    document.querySelectorAll('.admin-tab-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const tab = e.currentTarget.getAttribute('data-admin-tab');
        this.switchTab(tab);
      });
    });
  },

  open: async function() {
    if (!Auth.isAdmin()) {
      API.showToast("Menu ini hanya dapat diakses oleh Administrator keluarga.", "warning");
      return;
    }

    const modal = document.getElementById('admin-modal');
    if (modal) modal.classList.remove('hidden');

    this.switchTab('pending');
    await this.loadPendingRelations();
  },

  close: function() {
    const modal = document.getElementById('admin-modal');
    if (modal) modal.classList.add('hidden');
  },

  switchTab: function(tabName) {
    document.querySelectorAll('.admin-tab-btn').forEach(btn => {
      if (btn.getAttribute('data-admin-tab') === tabName) {
        btn.classList.add('border-amber-500', 'text-amber-500', 'font-semibold');
        btn.classList.remove('border-transparent', 'text-slate-400');
      } else {
        btn.classList.remove('border-amber-500', 'text-amber-500', 'font-semibold');
        btn.classList.add('border-transparent', 'text-slate-400');
      }
    });

    document.querySelectorAll('.admin-tab-content').forEach(pane => {
      if (pane.id === `admin-pane-${tabName}`) {
        pane.classList.remove('hidden');
      } else {
        pane.classList.add('hidden');
      }
    });

    if (tabName === 'logs') {
      this.loadAuditLogs();
    }
  },

  loadPendingRelations: async function() {
    const listEl = document.getElementById('admin-pending-list');
    listEl.innerHTML = '<div class="py-6 text-center text-slate-400">Memuat klaim relasi tertunda...</div>';

    try {
      const res = await API.post('adminGetPendingRelations');
      const items = res.data || [];

      if (items.length === 0) {
        listEl.innerHTML = `
          <div class="py-12 text-center">
            <svg class="mx-auto h-12 w-12 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p class="mt-2 text-sm text-slate-500">Tidak ada pengajuan relasi yang tertunda. Semua silsilah terverifikasi!</p>
          </div>
        `;
        return;
      }

      listEl.innerHTML = '';
      items.forEach(item => {
        const row = document.createElement('div');
        row.className = "flex items-center justify-between p-4 bg-slate-50 border border-slate-200 rounded-lg";
        row.innerHTML = `
          <div>
            <span class="inline-block px-2 py-0.5 text-xs font-bold rounded bg-amber-100 text-amber-800 mb-1">
              ${item.relation_type}
            </span>
            <p class="text-sm font-semibold text-slate-800">
              <span class="text-sky-700">${item.from_name}</span>
              ${item.relation_type === 'SPOUSE' ? ' 💍 Pasangan dari ' : ' ➔ Orang Tua dari '}
              <span class="text-sky-700">${item.to_name}</span>
            </p>
            <p class="text-xs text-slate-500 mt-0.5">Diajukan oleh: ${item.created_by}</p>
          </div>
          <div class="flex space-x-2">
            <button onclick="AdminPanel.handleApprove('${item.relation_id}')" class="px-3 py-1.5 text-xs font-medium rounded bg-emerald-600 text-white hover:bg-emerald-700 transition">
              Setujui
            </button>
            <button onclick="AdminPanel.handleReject('${item.relation_id}')" class="px-3 py-1.5 text-xs font-medium rounded bg-rose-600 text-white hover:bg-rose-700 transition">
              Tolak
            </button>
          </div>
        `;
        listEl.appendChild(row);
      });
    } catch (err) {
      listEl.innerHTML = `<div class="py-6 text-center text-rose-500 text-sm">Gagal memuat: ${err.message}</div>`;
    }
  },

  handleApprove: async function(relationId) {
    try {
      const res = await API.post('adminApproveRelation', { relationId: relationId });
      API.showToast(res.message, "success");
      await this.loadPendingRelations();
      if (window.App && typeof App.loadInitialData === 'function') {
        App.loadInitialData();
      }
    } catch (err) {
      API.showToast(err.message, "error");
    }
  },

  handleReject: async function(relationId) {
    const reason = prompt("Masukkan alasan penolakan relasi (opsional):");
    if (reason === null) return;

    try {
      const res = await API.post('adminRejectRelation', { relationId: relationId, reason: reason });
      API.showToast(res.message, "info");
      await this.loadPendingRelations();
    } catch (err) {
      API.showToast(err.message, "error");
    }
  },

  loadAuditLogs: async function() {
    const listEl = document.getElementById('admin-logs-list');
    listEl.innerHTML = '<div class="py-6 text-center text-slate-400">Memuat log aktivitas...</div>';

    try {
      const res = await API.post('adminGetAuditLogs', { limit: 30 });
      const logs = res.data || [];

      if (logs.length === 0) {
        listEl.innerHTML = '<div class="py-8 text-center text-slate-400 text-sm">Belum ada riwayat aktivitas.</div>';
        return;
      }

      listEl.innerHTML = '';
      logs.forEach(log => {
        const item = document.createElement('div');
        item.className = "text-xs p-3 border-b border-slate-100 flex justify-between items-start";
        const dateStr = log.timestamp ? new Date(log.timestamp).toLocaleString('id-ID') : '—';
        item.innerHTML = `
          <div>
            <span class="font-bold text-slate-700">[${log.action}]</span>
            <span class="text-slate-600 ml-1">${log.target_entity} (${log.target_id})</span>
            <p class="text-slate-400 text-[11px] mt-0.5">Oleh: ${log.user_id}</p>
          </div>
          <span class="text-slate-400 text-[10px] whitespace-nowrap ml-4">${dateStr}</span>
        `;
        listEl.appendChild(item);
      });
    } catch (err) {
      listEl.innerHTML = `<div class="py-6 text-center text-rose-500 text-sm">Gagal memuat log: ${err.message}</div>`;
    }
  }
};
