/**
 * tree.js - Engine Visualisasi Pohon Silsilah Keluarga (D3.js SVG Layout)
 * 100% Gratis, Open-Source & Tanpa Lisensi Berbayar
 */

const TreeEngine = {
  svg: null,
  container: null,
  zoomBehavior: null,
  profiles: [],
  relations: [],
  nodes: [],
  links: [],

  init: function(selector) {
    const el = document.querySelector(selector);
    if (!el) return;

    el.innerHTML = ''; // Reset canvas

    const width = el.clientWidth || window.innerWidth;
    const height = el.clientHeight || (window.innerHeight - 80);

    // Buat elemen SVG
    this.svg = d3.select(selector)
      .append('svg')
      .attr('width', '100%')
      .attr('height', '100%')
      .attr('viewBox', `0 0 ${width} ${height}`)
      .attr('class', 'select-none cursor-grab active:cursor-grabbing');

    // Definisikan filter shadow dan gradien
    const defs = this.svg.append('defs');
    
    // Drop shadow filter
    const filter = defs.append('filter')
      .attr('id', 'card-shadow')
      .attr('x', '-10%')
      .attr('y', '-10%')
      .attr('width', '130%')
      .attr('height', '130%');
    filter.append('feDropShadow')
      .attr('dx', '0')
      .attr('dy', '4')
      .attr('stdDeviation', '6')
      .attr('flood-opacity', '0.08');

    // Container utama untuk zoom/pan
    this.container = this.svg.append('g').attr('id', 'tree-viewport');

    // Setup D3 Zoom
    this.zoomBehavior = d3.zoom()
      .scaleExtent([0.2, 2.5])
      .on('zoom', (event) => {
        this.container.attr('transform', event.transform);
      });

    this.svg.call(this.zoomBehavior);

    // Setup tombol kontrol zoom
    this.bindZoomControls();
  },

  bindZoomControls: function() {
    const btnZoomIn = document.getElementById('btn-zoom-in');
    const btnZoomOut = document.getElementById('btn-zoom-out');
    const btnZoomReset = document.getElementById('btn-zoom-reset');

    if (btnZoomIn) {
      btnZoomIn.onclick = () => this.svg.transition().duration(300).call(this.zoomBehavior.scaleBy, 1.25);
    }
    if (btnZoomOut) {
      btnZoomOut.onclick = () => this.svg.transition().duration(300).call(this.zoomBehavior.scaleBy, 0.8);
    }
    if (btnZoomReset) {
      btnZoomReset.onclick = () => this.resetView();
    }
  },

  resetView: function() {
    if (!this.svg || !this.zoomBehavior) return;
    const el = this.svg.node();
    const width = el.clientWidth || window.innerWidth;
    const height = el.clientHeight || 600;

    this.svg.transition().duration(600).call(
      this.zoomBehavior.transform,
      d3.zoomIdentity.translate(width / 2 - 200, 80).scale(0.85)
    );
  },

  /**
   * Menghitung posisi koordinat hierarkis untuk node dan relasi silsilah.
   */
  render: function(profiles, relations) {
    this.profiles = profiles || [];
    this.relations = relations || [];

    if (!this.container) return;
    this.container.selectAll('*').remove();

    if (this.profiles.length === 0) {
      this.container.append('text')
        .attr('x', 200)
        .attr('y', 200)
        .attr('fill', '#94a3b8')
        .attr('font-size', '16px')
        .text('Belum ada data silsilah untuk ditampilkan.');
      return;
    }

    // 1. Tentukan generasi (level kedalaman) tiap individu
    const genMap = this.calculateGenerations(this.profiles, this.relations);

    // 2. Petakan posisi koordinat X dan Y untuk setiap profil
    const layout = this.calculateLayout(this.profiles, this.relations, genMap);

    // 3. Gambar Garis Hubungan (Links)
    this.renderLinks(layout.links, layout.nodes);

    // 4. Gambar Kartu Individu (Nodes)
    this.renderNodes(layout.nodes);

    // Posisikan kamera di tengah leluhur utama
    setTimeout(() => this.resetView(), 100);
  },

  /**
   * Menghitung tingkatan generasi (Gen 0 = Leluhur, Gen 1 = Anak, dst).
   */
  calculateGenerations: function(profiles, relations) {
    const genMap = {};
    const parentRelations = relations.filter(r => r.relation_type === 'PARENT');
    
    // Temukan root profiles (yang tidak punya orang tua terdaftar)
    const childrenSet = new Set(parentRelations.map(r => r.to_profile_id));
    
    profiles.forEach(p => {
      if (!childrenSet.has(p.profile_id)) {
        genMap[p.profile_id] = 0;
      }
    });

    // Propagasi level ke bawah
    let changed = true;
    let iteration = 0;
    while (changed && iteration < 20) {
      changed = false;
      iteration++;
      parentRelations.forEach(r => {
        const parentGen = genMap[r.from_profile_id];
        if (parentGen !== undefined) {
          const currentChildGen = genMap[r.to_profile_id];
          const expectedGen = parentGen + 1;
          if (currentChildGen === undefined || currentChildGen < expectedGen) {
            genMap[r.to_profile_id] = expectedGen;
            changed = true;
          }
        }
      });

      // Sinkronisasi generasi untuk pasangan (Spouse harus di generasi yang sama)
      const spouseRelations = relations.filter(r => r.relation_type === 'SPOUSE');
      spouseRelations.forEach(r => {
        const g1 = genMap[r.from_profile_id];
        const g2 = genMap[r.to_profile_id];
        if (g1 !== undefined && g2 === undefined) {
          genMap[r.to_profile_id] = g1;
          changed = true;
        } else if (g2 !== undefined && g1 === undefined) {
          genMap[r.from_profile_id] = g2;
          changed = true;
        }
      });
    }

    // Default 0 untuk sisa profil yang tidak terhubung
    profiles.forEach(p => {
      if (genMap[p.profile_id] === undefined) genMap[p.profile_id] = 0;
    });

    return genMap;
  },

  /**
   * Menghitung koordinat X dan Y setiap kartu dalam canvas.
   */
  calculateLayout: function(profiles, relations, genMap) {
    const cardWidth = 220;
    const cardHeight = 110;
    const gapX = 60;
    const gapY = 160;

    // Kelompokkan profil berdasarkan generasi
    const genGroups = {};
    profiles.forEach(p => {
      const g = genMap[p.profile_id] || 0;
      if (!genGroups[g]) genGroups[g] = [];
      genGroups[g].push(p);
    });

    const nodes = [];
    const nodeMap = {};

    Object.keys(genGroups).sort((a,b) => a - b).forEach(gStr => {
      const g = parseInt(gStr);
      const groupProfiles = genGroups[g];
      const y = g * (cardHeight + gapY) + 50;

      // Susun horizontal
      const totalWidth = groupProfiles.length * cardWidth + (groupProfiles.length - 1) * gapX;
      let startX = -(totalWidth / 2) + 200;

      groupProfiles.forEach((p, idx) => {
        const x = startX + idx * (cardWidth + gapX);
        const node = {
          profile: p,
          x: x,
          y: y,
          width: cardWidth,
          height: cardHeight,
          gen: g
        };
        nodes.push(node);
        nodeMap[p.profile_id] = node;
      });
    });

    // Bangun daftar link
    const links = [];
    relations.forEach(r => {
      const source = nodeMap[r.from_profile_id];
      const target = nodeMap[r.to_profile_id];
      if (source && target) {
        links.push({
          relation: r,
          source: source,
          target: target,
          type: r.relation_type
        });
      }
    });

    return { nodes, links, nodeMap };
  },

  /**
   * Render garis hubungan keluarga (SVG Path & Curve).
   */
  renderLinks: function(links) {
    const linkGroup = this.container.append('g').attr('class', 'links-layer');

    links.forEach(l => {
      const { source, target, type } = l;

      if (type === 'SPOUSE') {
        // Garis horizontal antar pasangan
        const x1 = source.x < target.x ? source.x + source.width : source.x;
        const x2 = source.x < target.x ? target.x : target.x + target.width;
        const y = source.y + source.height / 2;

        linkGroup.append('line')
          .attr('x1', x1)
          .attr('y1', y)
          .attr('x2', x2)
          .attr('y2', y)
          .attr('stroke', '#e11d48')
          .attr('stroke-width', 2.5)
          .attr('stroke-dasharray', '4,3');

        // Ikon cincin / cinta di tengah garis pasangan
        linkGroup.append('circle')
          .attr('cx', (x1 + x2) / 2)
          .attr('cy', y)
          .attr('r', 5)
          .attr('fill', '#e11d48');

      } else if (type === 'PARENT') {
        // Garis kurva vertikal dari orang tua ke anak
        const startX = source.x + source.width / 2;
        const startY = source.y + source.height;
        const endX = target.x + target.width / 2;
        const endY = target.y;

        const deltaY = (endY - startY) / 2;

        const pathData = `M ${startX} ${startY} C ${startX} ${startY + deltaY}, ${endX} ${endY - deltaY}, ${endX} ${endY}`;

        linkGroup.append('path')
          .attr('d', pathData)
          .attr('fill', 'none')
          .attr('stroke', '#0284c7')
          .attr('stroke-width', 2)
          .attr('stroke-opacity', 0.7);

        // Panah kecil menuju anak
        linkGroup.append('circle')
          .attr('cx', endX)
          .attr('cy', endY)
          .attr('r', 3.5)
          .attr('fill', '#0284c7');
      }
    });
  },

  /**
   * Render kartu profil individu.
   */
  renderNodes: function(nodes) {
    const nodeGroup = this.container.append('g').attr('class', 'nodes-layer');

    const nodeSelection = nodeGroup.selectAll('.tree-node')
      .data(nodes)
      .enter()
      .append('g')
      .attr('class', 'tree-node cursor-pointer transition-transform duration-150')
      .attr('transform', d => `translate(${d.x}, ${d.y})`)
      .on('click', (event, d) => {
        if (window.ProfileModal && typeof ProfileModal.open === 'function') {
          ProfileModal.open(d.profile.profile_id);
        }
      });

    // 1. Kotak Kartu
    nodeSelection.append('rect')
      .attr('width', d => d.width)
      .attr('height', d => d.height)
      .attr('rx', 12)
      .attr('fill', '#ffffff')
      .attr('stroke', d => d.profile.gender === 'F' ? '#f43f5e' : '#0284c7')
      .attr('stroke-width', 2)
      .attr('filter', 'url(#card-shadow)');

    // 2. Bar header kartu berwarna lembut
    nodeSelection.append('rect')
      .attr('width', d => d.width)
      .attr('height', 8)
      .attr('rx', 4)
      .attr('fill', d => d.profile.gender === 'F' ? '#ffe4e6' : '#e0f2fe');

    // 3. Foto Profil / Avatar melingkar
    const avatarGroup = nodeSelection.append('g')
      .attr('transform', 'translate(14, 20)');

    // Lingkaran Klip Foto
    nodeSelection.each(function(d, i) {
      const clipId = `avatar-clip-${d.profile.profile_id}`;
      d3.select(this).append('clipPath')
        .attr('id', clipId)
        .append('circle')
        .attr('cx', 38)
        .attr('cy', 48)
        .attr('r', 24);

      if (d.profile.photo_url) {
        d3.select(this).append('image')
          .attr('href', d.profile.photo_url)
          .attr('x', 14)
          .attr('y', 24)
          .attr('width', 48)
          .attr('height', 48)
          .attr('preserveAspectRatio', 'xMidYMid slice')
          .attr('clip-path', `url(#${clipId})`);
      } else {
        // Fallback inisial jika foto tidak ada
        d3.select(this).append('circle')
          .attr('cx', 38)
          .attr('cy', 48)
          .attr('r', 24)
          .attr('fill', d.profile.gender === 'F' ? '#fecdd3' : '#bae6fd');

        d3.select(this).append('text')
          .attr('x', 38)
          .attr('y', 54)
          .attr('text-anchor', 'middle')
          .attr('font-size', '16px')
          .attr('font-weight', 'bold')
          .attr('fill', d.profile.gender === 'F' ? '#9f1239' : '#0369a1')
          .text(d.profile.full_name ? d.profile.full_name.charAt(0).toUpperCase() : '?');
      }
    });

    // Lingkaran border luar avatar
    nodeSelection.append('circle')
      .attr('cx', 38)
      .attr('cy', 48)
      .attr('r', 25)
      .attr('fill', 'none')
      .attr('stroke', d => d.profile.gender === 'F' ? '#f43f5e' : '#0284c7')
      .attr('stroke-width', 1.5);

    // 4. Teks Nama Lengkap
    nodeSelection.append('text')
      .attr('x', 72)
      .attr('y', 38)
      .attr('font-size', '13px')
      .attr('font-weight', '700')
      .attr('fill', '#0f172a')
      .text(d => {
        const name = d.profile.full_name || 'Tanpa Nama';
        return name.length > 17 ? name.substring(0, 16) + '…' : name;
      });

    // 5. Nama Panggilan / Gelar
    nodeSelection.append('text')
      .attr('x', 72)
      .attr('y', 55)
      .attr('font-size', '11px')
      .attr('font-style', 'italic')
      .attr('fill', '#64748b')
      .text(d => d.profile.nickname ? `(${d.profile.nickname})` : (d.profile.gender === 'F' ? 'Perempuan' : 'Laki-laki'));

    // 6. Tahun Lahir - Wafat
    nodeSelection.append('text')
      .attr('x', 72)
      .attr('y', 74)
      .attr('font-size', '11px')
      .attr('font-weight', '600')
      .attr('fill', '#475569')
      .text(d => {
        const bYear = d.profile.birth_date ? new Date(d.profile.birth_date).getFullYear() : '—';
        const dYear = d.profile.is_alive === 'NO' ? 
          (d.profile.death_date ? new Date(d.profile.death_date).getFullYear() : 'Wafat') : 
          'Sekarang';
        return `${bYear} – ${dYear}`;
      });

    // 7. Badge Status / Generasi
    nodeSelection.append('rect')
      .attr('x', 72)
      .attr('y', 84)
      .attr('width', 58)
      .attr('height', 16)
      .attr('rx', 4)
      .attr('fill', '#f1f5f9');

    nodeSelection.append('text')
      .attr('x', 101)
      .attr('y', 96)
      .attr('text-anchor', 'middle')
      .attr('font-size', '9px')
      .attr('font-weight', '700')
      .attr('fill', '#475569')
      .text(d => `Gen ${d.gen + 1}`);
  },

  /**
   * Menggeser kamera fokus ke profil tertentu (Pencarian).
   */
  focusOnProfile: function(profileId) {
    if (!this.svg || !this.zoomBehavior) return;

    const nodeG = this.container.selectAll('.tree-node')
      .filter(d => d.profile.profile_id === profileId);

    if (nodeG.empty()) {
      API.showToast("Profil tidak ditemukan dalam pohon silsilah aktif.", "warning");
      return;
    }

    const d = nodeG.datum();
    const el = this.svg.node();
    const width = el.clientWidth || window.innerWidth;
    const height = el.clientHeight || 600;

    const targetX = width / 2 - d.x - d.width / 2;
    const targetY = height / 2 - d.y - d.height / 2;

    this.svg.transition().duration(800).call(
      this.zoomBehavior.transform,
      d3.zoomIdentity.translate(targetX, targetY).scale(1.1)
    );

    // Efek highlight berkedip
    nodeG.select('rect')
      .transition().duration(200).attr('stroke', '#eab308').attr('stroke-width', 4)
      .transition().duration(400).attr('stroke', d.profile.gender === 'F' ? '#f43f5e' : '#0284c7').attr('stroke-width', 2);
  }
};
