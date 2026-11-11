/**
 * profile-modal.js - Tampilan Detail Profil Individu, Galeri, Form Sunting & Relasi
 */

const ProfileModal = {
  activeProfileId: null,
  activeData: null,

  init: function() {
    this.setupListeners();
  },

  setupListeners: function() {
    // Tombol tutup modal utama
    const btnClose = document.getElementById('btn-close-profile-modal');
    if (btnClose) {
      btnClose.addEventListener('click', () => this.close());
    }

    // Tab switcher di dalam modal (Informasi, Keluarga, Galeri, Sunting)
    document.querySelectorAll('.profile-tab-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const targetTab = e.currentTarget.getAttribute('data-tab');
        this.switchTab(targetTab);
      });
    });

    // Form Edit Profil
    const formEdit = document.getElementById('form-edit-profile');
    if (formEdit) {
      formEdit.addEventListener('submit', async (e) => {
        e.preventDefault();
        await this.handleSaveProfile();
      });
    }

    // Form Tambah Relasi
    const formRelation = document.getElementById('form-add-relation');
    if (formRelation) {
      formRelation.addEventListener('submit', async (e) => {
        e.preventDefault();
        await this.handleSubmitRelation();
      });
    }

    // Input Upload Foto
    const photoInput = document.getElementById('input-upload-photo');
    if (photoInput) {
      photoInput.addEventListener('change', async (e) => {
        if (e.target.files && e.target.files[0]) {
          await this.handlePhotoUpload(e.target.files[0]);
        }
      });
    }
  },

  open: async function(profileId) {
    this.activeProfileId = profileId;
    const modal = document.getElementById('profile-modal');
    if (modal) modal.classList.remove('hidden');

    this.switchTab('info');
    document.getElementById('profile-modal-loading').classList.remove('hidden');
    document.getElementById('profile-modal-body').classList.add('hidden');

    try {
      const res = await API.post('getProfile', { profileId: profileId });
      this.activeData = res.data;
      this.renderData(res.data);
    } catch (err) {
      API.showToast(err.message, "error");
      this.close();
    } finally {
      document.getElementById('profile-modal-loading').classList.add('hidden');
      document.getElementById('profile-modal-body').classList.remove('hidden');
    }
  },

  close: function() {
    const modal = document.getElementById('profile-modal');
    if (modal) modal.classList.add('hidden');
    this.activeProfileId = null;
    this.activeData = null;
  },

  switchTab: function(tabName) {
    document.querySelectorAll('.profile-tab-btn').forEach(btn => {
      if (btn.getAttribute('data-tab') === tabName) {
        btn.classList.add('border-sky-600', 'text-sky-600', 'font-semibold');
        btn.classList.remove('border-transparent', 'text-slate-500');
      } else {
        btn.classList.remove('border-sky-600', 'text-sky-600', 'font-semibold');
        btn.classList.add('border-transparent', 'text-slate-500');
      }
    });

    document.querySelectorAll('.profile-tab-content').forEach(pane => {
      if (pane.id === `tab-pane-${tabName}`) {
        pane.classList.remove('hidden');
      } else {
        pane.classList.add('hidden');
      }
    });

    // Populate data jika membuka tab edit
    if (tabName === 'edit' && this.activeData && this.activeData.profile) {
      this.populateEditForm(this.activeData.profile);
    }
  },

  renderData: function(data) {
    const p = data.profile;
    const fam = data.family || { parents: [], spouses: [], children: [] };
    const gal = data.gallery || [];

    // Header Modal
    document.getElementById('modal-profile-name').textContent = p.full_name || 'Tanpa Nama';
    document.getElementById('modal-profile-nickname').textContent = p.nickname ? `(${p.nickname})` : '';

    const avatarImg = document.getElementById('modal-profile-avatar');
    if (p.photo_url) {
      avatarImg.src = p.photo_url;
    } else {
      avatarImg.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(p.full_name || 'U')}&background=0284c7&color=fff&size=128`;
    }

    // Info Tab
    document.getElementById('info-birth-date').textContent = p.birth_date ? `${p.birth_place || ''}, ${p.birth_date}` : 'Tidak diketahui';
    document.getElementById('info-death-date').textContent = p.is_alive === 'NO' ? (p.death_date || 'Wafat') : 'Masih Hidup';
    document.getElementById('info-gender').textContent = p.gender === 'F' ? 'Perempuan' : 'Laki-laki';
    document.getElementById('info-bio').textContent = p.biography || 'Belum ada catatan riwayat hidup untuk profil ini.';

    const branchEl = document.getElementById('info-branch');
    if (branchEl && window.App && App.allBranches) {
      const br = App.allBranches.find(b => b.branch_id === p.branch_id);
      branchEl.textContent = br ? br.branch_name : (p.branch_id || 'Utama');
    }

    // Family Tab
    this.renderFamilyList('list-parents', fam.parents, 'Orang Tua');
    this.renderFamilyList('list-spouses', fam.spouses, 'Pasangan');
    this.renderFamilyList('list-children', fam.children, 'Anak');

    // Gallery Tab
    const galleryContainer = document.getElementById('gallery-container');
    galleryContainer.innerHTML = '';
    if (gal.length === 0) {
      galleryContainer.innerHTML = `<div class="col-span-full py-8 text-center text-slate-400 text-sm">Belum ada foto kenangan. Klik tombol di atas untuk mengunggah.</div>`;
    } else {
      gal.forEach(item => {
        const card = document.createElement('div');
        card.className = "group relative rounded-lg overflow-hidden border border-slate-200 shadow-sm aspect-square bg-slate-100";
        card.innerHTML = `
          <img src="${item.image_url}" alt="${item.caption || 'Foto'}" class="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105" />
          <div class="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-2 flex items-end">
            <span class="text-xs text-white truncate">${item.caption || 'Foto Dokumentasi'}</span>
          </div>
        `;
        galleryContainer.appendChild(card);
      });
    }

    // Populate dropdown pilihan profil tujuan untuk form tambah relasi
    this.populateRelationOptions();
  },

  renderFamilyList: function(containerId, list, title) {
    const el = document.getElementById(containerId);
    if (!el) return;
    el.innerHTML = '';

    if (!list || list.length === 0) {
      el.innerHTML = `<span class="text-xs text-slate-400 italic">Belum ada data ${title.toLowerCase()}</span>`;
      return;
    }

    list.forEach(item => {
      const p = item.profile;
      const tag = document.createElement('div');
      tag.className = "flex items-center space-x-2 p-2 rounded-lg bg-slate-50 border border-slate-200 hover:bg-slate-100 cursor-pointer transition-colors";
      tag.onclick = () => this.open(p.profile_id);

      const avatar = p.photo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(p.full_name)}&background=0284c7&color=fff&size=64`;
      tag.innerHTML = `
        <img src="${avatar}" class="w-8 h-8 rounded-full object-cover" />
        <div class="overflow-hidden">
          <p class="text-xs font-semibold text-slate-800 truncate">${p.full_name}</p>
          <p class="text-[10px] text-slate-500">${p.gender === 'F' ? 'Perempuan' : 'Laki-laki'}</p>
        </div>
      `;
      el.appendChild(tag);
    });
  },

  populateEditForm: function(p) {
    document.getElementById('edit-full-name').value = p.full_name || '';
    document.getElementById('edit-nickname').value = p.nickname || '';
    document.getElementById('edit-gender').value = p.gender || 'M';
    document.getElementById('edit-birth-date').value = p.birth_date || '';
    document.getElementById('edit-birth-place').value = p.birth_place || '';
    document.getElementById('edit-death-date').value = p.death_date || '';
    document.getElementById('edit-is-alive').value = p.is_alive || 'YES';
    document.getElementById('edit-bio').value = p.biography || '';
    document.getElementById('edit-phone').value = p.phone_contact || '';
  },

  populateRelationOptions: function() {
    const select = document.getElementById('rel-target-profile');
    if (!select || !window.App || !App.allProfiles) return;

    select.innerHTML = '<option value="">-- Pilih Anggota Keluarga --</option>';
    App.allProfiles.forEach(p => {
      if (p.profile_id !== this.activeProfileId) {
        const opt = document.createElement('option');
        opt.value = p.profile_id;
        opt.textContent = `${p.full_name} (${p.nickname || p.birth_place || 'Profil'})`;
        select.appendChild(opt);
      }
    });
  },

  handleSaveProfile: async function() {
    if (!this.activeProfileId) return;

    const payload = {
      profile_id: this.activeProfileId,
      full_name: document.getElementById('edit-full-name').value.trim(),
      nickname: document.getElementById('edit-nickname').value.trim(),
      gender: document.getElementById('edit-gender').value,
      birth_date: document.getElementById('edit-birth-date').value,
      birth_place: document.getElementById('edit-birth-place').value.trim(),
      death_date: document.getElementById('edit-death-date').value,
      is_alive: document.getElementById('edit-is-alive').value,
      biography: document.getElementById('edit-bio').value.trim(),
      phone_contact: document.getElementById('edit-phone').value.trim()
    };

    try {
      const res = await API.post('saveProfile', { profileData: payload });
      API.showToast(res.message || "Profil berhasil diperbarui!", "success");
      await this.open(this.activeProfileId); // Refresh tampilan modal
      if (window.App && typeof App.loadInitialData === 'function') {
        App.loadInitialData(); // Refresh pohon
      }
    } catch (err) {
      API.showToast(err.message, "error");
    }
  },

  handleSubmitRelation: async function() {
    const relType = document.getElementById('rel-type-select').value;
    const targetId = document.getElementById('rel-target-profile').value;

    if (!targetId || !relType) {
      API.showToast("Harap pilih jenis relasi dan profil tujuan.", "warning");
      return;
    }

    let fromId = this.activeProfileId;
    let toId = targetId;

    // Jika relasi adalah "ANAK", artinya profil aktif adalah orang tua dari targetId
    if (relType === 'PARENT_OF') {
      fromId = this.activeProfileId;
      toId = targetId;
    } else if (relType === 'CHILD_OF') {
      fromId = targetId;
      toId = this.activeProfileId;
    }

    const cleanType = relType === 'SPOUSE' ? 'SPOUSE' : 'PARENT';

    try {
      const res = await API.post('submitRelation', {
        relationData: {
          from_profile_id: fromId,
          to_profile_id: toId,
          relation_type: cleanType
        }
      });

      API.showToast(res.message, "success");
      await this.open(this.activeProfileId);
      if (window.App && typeof App.loadInitialData === 'function') {
        App.loadInitialData();
      }
    } catch (err) {
      API.showToast(err.message, "error");
    }
  },

  handlePhotoUpload: async function(file) {
    if (!file) return;

    // Validasi tipe file
    if (!file.type.startsWith('image/')) {
      API.showToast("Hanya file gambar (JPG/PNG) yang diperbolehkan.", "warning");
      return;
    }

    API.showToast("Mengompresi dan mengunggah gambar...", "info");

    try {
      // Kompresi Canvas di sisi klien
      const base64 = await this.resizeImageToBase64(file, 1200);

      const res = await API.post('uploadPhoto', {
        base64Data: base64,
        filename: file.name,
        profileId: this.activeProfileId,
        caption: `Foto diunggah pada ${new Date().toLocaleDateString('id-ID')}`
      });

      API.showToast("Foto berhasil diunggah ke Google Drive!", "success");
      await this.open(this.activeProfileId);
      if (window.App && typeof App.loadInitialData === 'function') {
        App.loadInitialData();
      }
    } catch (err) {
      API.showToast("Gagal mengunggah foto: " + err.message, "error");
    }
  },

  /**
   * Helper kompresi gambar HTML5 Canvas untuk hemat bandwidth & kuota
   */
  resizeImageToBase64: function(file, maxWidth = 1200) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target.result;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);

          // Ekspor JPEG kualitas 0.8
          resolve(canvas.toDataURL('image/jpeg', 0.8));
        };
        img.onerror = (err) => reject(err);
      };
      reader.onerror = (err) => reject(err);
    });
  }
};
