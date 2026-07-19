document.addEventListener("DOMContentLoaded", () => {
    // Pagination State
    window.currentPage = 1;
    window.rowsPerPage = 15;
    window.currentFilteredData = [];

    // Log Pagination State
    window.currentLogPage = 1;
    window.rowsPerLogPage = 10;
    window.allActivityLogs = [];

    // Panggil fungsi GAS backend terintegrasi (Satu panggilan, Super Cepat!)
    google.script.run
        .withSuccessHandler((initData) => {
            if (!initData) return;

            // 1. KPI Perangkat
            const kpi = initData.kpiData;
            if (kpi) {
                document.getElementById('kpi-total-assets').textContent = kpi.totalAssets || 0;
                const activeEl = document.getElementById('kpi-active-assets');
                if (activeEl) activeEl.textContent = kpi.activeAssets || 0;
                const instokEl = document.getElementById('kpi-instok-assets');
                if (instokEl) instokEl.textContent = kpi.instokAssets || 0;
                const breakdownEl = document.getElementById('kpi-breakdown-assets');
                if (breakdownEl) breakdownEl.textContent = kpi.breakdownAssets || 0;
                document.getElementById('kpi-expiring-assets').textContent = kpi.expiringAssets || 0;
            }

            // 2. Daftar Inventory
            if (initData.inventoryList) {
                window.inventoryDataList = initData.inventoryList;
                window.currentFilteredData = initData.inventoryList;
                window.currentPage = 1;
                renderInventoryTable(window.currentFilteredData);
            }

            // 3. PA Performance
            const pa = initData.paData;
            if (pa) {
                // Dashboard Widget KPI
                const kpiAvgPa = document.getElementById('kpi-avg-pa');
                if (kpiAvgPa) kpiAvgPa.textContent = (pa.avgWeeklyPA || 0) + '%';

                // Populasikan Kartu W1 - W4 di Halaman PA Performance
                const weeks = ['W1', 'W2', 'W3', 'W4'];
                weeks.forEach(w => {
                    const index = (pa.trendLabels || []).indexOf(w);
                    let val = 100.00;
                    if (index !== -1) {
                        val = parseFloat(pa.trendData[index]);
                    }

                    const paPercentEl = document.getElementById('pa-' + w.toLowerCase() + '-percent');
                    const paStatusEl = document.getElementById('pa-' + w.toLowerCase() + '-status');

                    if (paPercentEl) {
                        paPercentEl.textContent = val.toFixed(2) + '%';
                    }

                    if (paStatusEl) {
                        if (val >= 98) {
                            paStatusEl.textContent = 'Excellent';
                            paStatusEl.className = 'font-bold text-emerald-500';
                        } else if (val >= 95) {
                            paStatusEl.textContent = 'Good';
                            paStatusEl.className = 'font-bold text-blue-500';
                        } else {
                            paStatusEl.textContent = 'Action Required';
                            paStatusEl.className = 'font-bold text-rose-500';
                        }
                    }
                });

                // Populasikan Card MTD (Month-to-Date) Terpadu
                const mtdPercentEl = document.getElementById('pa-mtd-percent');
                if (mtdPercentEl) {
                    mtdPercentEl.textContent = (pa.avgWeeklyPA || 0) + '%';
                }

                const inuseCountEl = document.getElementById('pa-inuse-count');
                if (inuseCountEl && initData.kpiData) {
                    inuseCountEl.textContent = initData.kpiData.activeAssets || 0;
                }

                const totalActEl = document.getElementById('pa-total-activities');
                if (totalActEl) {
                    totalActEl.textContent = pa.totalActivities || 0;
                }

                const totalHoursEl = document.getElementById('pa-total-hours');
                if (totalHoursEl) {
                    totalHoursEl.textContent = pa.totalActivityHours || '0.0';
                }

                const totalMinsEl = document.getElementById('pa-total-minutes');
                if (totalMinsEl) {
                    totalMinsEl.textContent = Math.round(parseFloat(pa.totalActivityMinutes) || 0);
                }

                // === POPULASIKAN TIGA TABEL PERBANDINGAN EXCEL (TROUBLESHOOTING, MAINTENANCE, ALL) ===
                if (pa.monthName) {
                    const thTrouble = document.getElementById('th-trouble-month');
                    const thMaint = document.getElementById('th-maint-month');
                    const thAll = document.getElementById('th-all-month');
                    if (thTrouble) thTrouble.textContent = pa.monthName;
                    if (thMaint) thMaint.textContent = pa.monthName;
                    if (thAll) thAll.textContent = pa.monthName;
                }

                if (pa.trouble) {
                    const weeks = ['W1', 'W2', 'W3', 'W4', 'MTD'];
                    weeks.forEach(w => {
                        const rowData = pa.trouble[w];
                        if (rowData) {
                            const key = w.toLowerCase();
                            const mohhEl = document.getElementById('trouble-' + key + '-mohh');
                            const downEl = document.getElementById('trouble-' + key + '-down');
                            const paEl = document.getElementById('trouble-' + key + '-pa');
                            if (mohhEl) mohhEl.textContent = Math.round(parseFloat(rowData.mohh) || 0);
                            if (downEl) downEl.textContent = Math.round(parseFloat(rowData.downtime) || 0);
                            if (paEl) paEl.textContent = rowData.pa + '%';
                        }
                    });
                }

                if (pa.maint) {
                    const weeks = ['W1', 'W2', 'W3', 'W4', 'MTD'];
                    weeks.forEach(w => {
                        const rowData = pa.maint[w];
                        if (rowData) {
                            const key = w.toLowerCase();
                            const mohhEl = document.getElementById('maint-' + key + '-mohh');
                            const downEl = document.getElementById('maint-' + key + '-down');
                            const paEl = document.getElementById('maint-' + key + '-pa');
                            if (mohhEl) mohhEl.textContent = Math.round(parseFloat(rowData.mohh) || 0);
                            if (downEl) downEl.textContent = Math.round(parseFloat(rowData.downtime) || 0);
                            if (paEl) paEl.textContent = rowData.pa + '%';
                        }
                    });
                }

                if (pa.all) {
                    const weeks = ['W1', 'W2', 'W3', 'W4', 'MTD'];
                    weeks.forEach(w => {
                        const rowData = pa.all[w];
                        if (rowData) {
                            const key = w.toLowerCase();
                            const paEl = document.getElementById('all-' + key + '-pa');
                            if (paEl) paEl.textContent = rowData + '%';
                        }
                    });
                }

                initChart(pa.trendLabels || [], pa.trendData || []);
            }

            // 4. Jadwal Maintenance
            if (initData.maintenanceData) {
                window.maintenanceData = initData.maintenanceData;
                populateMonthFilter(initData.maintenanceData.months);
                renderMaintenanceTable();
            }

            // 5. Daftar Rincian Pemeliharaan Mendatang (Dashboard Widget)
            if (initData.upcomingMaintenance) {
                renderMaintenanceList(initData.upcomingMaintenance);
            }

            // Sembunyikan loader utama secara instan
            const loader = document.getElementById('loading-state');
            if (loader) loader.classList.add('hidden');

            const activeMenu = document.getElementById('menu-overview');
            if (activeMenu && activeMenu.classList.contains('sidebar-menu-active')) {
                document.getElementById('dashboard-content').classList.remove('hidden');
            }
        })
        .withFailureHandler(onDataError)
        .getDashboardInitData();

    loadAllAssetDropdowns();

    // Setup Search Listener
    const searchInput = document.getElementById('inventory-search');
    if (searchInput) {
        searchInput.addEventListener('input', function (e) {
            const searchTerm = e.target.value.toLowerCase();
            if (window.inventoryDataList) {
                window.currentFilteredData = window.inventoryDataList.filter(item => {
                    return (item.hostname && item.hostname.toString().toLowerCase().includes(searchTerm)) ||
                        (item.serial && item.serial.toString().toLowerCase().includes(searchTerm)) ||
                        (item.assigned && item.assigned.toString().toLowerCase().includes(searchTerm)) ||
                        (item.dept && item.dept.toString().toLowerCase().includes(searchTerm)) ||
                        (item.model && item.model.toString().toLowerCase().includes(searchTerm));
                });
                window.currentPage = 1;
                renderInventoryTable(window.currentFilteredData);
            }
        });
    }

    // Setup Live Search Listener for Maintenance tab
    const maintSearchInput = document.getElementById('maintenance-search');
    if (maintSearchInput) {
        maintSearchInput.addEventListener('input', function () {
            renderMaintenanceTable();
        });
    }

    // Setup Live Search & Filter for Evidence tab
    const evidenceSearch = document.getElementById('evidence-search-input');
    if (evidenceSearch) {
        evidenceSearch.addEventListener('input', function () {
            renderEvidenceGrid();
        });
    }

    const evidenceCatFilter = document.getElementById('evidence-category-filter');
    if (evidenceCatFilter) {
        evidenceCatFilter.addEventListener('change', function () {
            renderEvidenceGrid();
        });
    }

    // Setup Live Search & Filter for Accessories tab
    const accSearch = document.getElementById('acc-search-input');
    if (accSearch) {
        accSearch.addEventListener('input', function () {
            renderAccessoriesTable();
        });
    }

    const accCatFilter = document.getElementById('acc-category-filter');
    if (accCatFilter) {
        accCatFilter.addEventListener('change', function () {
            renderAccessoriesTable();
        });
    }

    // Setup Live Search & Filter for Loans tab
    const loanSearch = document.getElementById('loan-search-input');
    if (loanSearch) {
        loanSearch.addEventListener('input', function () {
            renderLoansTable();
        });
    }

    const loanStatusFilter = document.getElementById('loan-status-filter');
    if (loanStatusFilter) {
        loanStatusFilter.addEventListener('change', function () {
            renderLoansTable();
        });
    }

    // Setup Sidebar Search Filter
    const sidebarSearch = document.getElementById('sidebar-search');
    if (sidebarSearch) {
        sidebarSearch.addEventListener('input', function (e) {
            const term = e.target.value.toLowerCase();
            const menuItems = document.querySelectorAll('.sidebar-menu');
            menuItems.forEach(item => {
                const textEl = item.querySelector('.sidebar-menu-text');
                const text = textEl ? textEl.textContent.toLowerCase() : '';
                item.style.display = text.includes(term) || term === '' ? '' : 'none';
            });
        });
    }
});

function switchPage(pageId) {
    // 1. Sembunyikan SEMUA section terlebih dahulu (PENTING untuk mencegah overlap)
    const allSections = [
        'dashboard-content',
        'inventory-content',
        'logs-section',
        'pa-section',
        'maintenance-schedule',
        'evidence-section',
        'part-accessories-section',
        'loan-section',
        'settings-content'
    ];

    allSections.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.add('hidden');
    });

    // 2. Tentukan ID target berdasarkan input pageId
    let targetId = pageId;
    if (pageId === 'overview') targetId = 'dashboard-content';
    if (pageId === 'inventory') targetId = 'inventory-content';
    if (pageId === 'settings') targetId = 'settings-content';

    const targetEl = document.getElementById(targetId);

    // Sembunyikan loading state jika pindah dari overview
    const loader = document.getElementById('loading-state');
    if (pageId !== 'overview' && loader) {
        loader.classList.add('hidden');
    }

    // Tampilkan elemen target jika ditemukan
    if (targetEl) {
        targetEl.classList.remove('hidden');
    }

    // 3. Update styling menu sidebar (New CSS class system)
    const menus = document.querySelectorAll('.sidebar-menu');
    menus.forEach(menu => {
        // Reset semua ke default state
        menu.classList.remove('sidebar-menu-active');
        menu.classList.add('sidebar-menu-default');
    });

    // Cari menu yang diklik berdasarkan pageId di attribute onclick-nya
    const activeMenu = document.querySelector(`.sidebar-menu[onclick*="${pageId}"]`);
    if (activeMenu) {
        // Set menu aktif ke style accent (amber gold border-left)
        activeMenu.classList.remove('sidebar-menu-default');
        activeMenu.classList.add('sidebar-menu-active');
    }

    // Auto-tutup dropdown 'inventory-dropdown' jika berpindah ke halaman non-inventory
    if (pageId !== 'inventory') {
        var dropdown = document.getElementById('inventory-dropdown');
        var chevron = document.getElementById('chevron-inventory-dropdown');
        if (dropdown && dropdown.classList.contains('dropdown-open')) {
            dropdown.style.maxHeight = '0px';
            dropdown.style.opacity = '0';
            dropdown.classList.remove('dropdown-open');
            if (chevron) chevron.style.transform = 'rotate(0deg)';
        }
    }

    // 4. Inisialisasi Data khusus halaman
    if (pageId === 'logs-section') {
        populateAssetDropdown();
        fetchActivityLogs();
    }

    if (pageId === 'maintenance-schedule') {
        fetchMaintenanceSchedule();
    }

    if (pageId === 'evidence-section') {
        fetchEvidenceData();
    }

    if (pageId === 'part-accessories-section') {
        fetchAccessoriesData();
    }

    if (pageId === 'loan-section') {
        fetchLoansData();
    }
}

// --- SIDEBAR COLLAPSE/EXPAND ---
function toggleSidebar() {
    const sidebar = document.getElementById('app-sidebar');
    if (!sidebar) return;

    if (sidebar.classList.contains('sidebar-expanded')) {
        sidebar.classList.remove('sidebar-expanded');
        sidebar.classList.add('sidebar-collapsed');
    } else {
        sidebar.classList.remove('sidebar-collapsed');
        sidebar.classList.add('sidebar-expanded');
    }
}

function onDataError(error) {
    console.error("Gagal mengambil data: ", error);
    const loader = document.getElementById('loading-state');
    if (loader) {
        loader.innerHTML = `<p class="text-brand-danger font-medium"><i class="fa-solid fa-circle-exclamation mr-2"></i> Error loading data. Please refresh.</p>`;
        loader.classList.remove('hidden');
    }
}

function initChart(labels, data) {
    const ctx = document.getElementById('paTrendChart').getContext('2d');

    // Gradient Fill untuk Line Chart
    let gradient = ctx.createLinearGradient(0, 0, 0, 400);
    gradient.addColorStop(0, 'rgba(0, 70, 132, 0.2)'); // brand-primary with opacity
    gradient.addColorStop(1, 'rgba(0, 70, 132, 0.0)');

    new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Average PA (%)',
                data: data,
                borderColor: '#004684', // brand-primary
                backgroundColor: gradient,
                borderWidth: 3,
                pointBackgroundColor: '#FFFFFF',
                pointBorderColor: '#004684',
                pointBorderWidth: 2,
                pointRadius: 4,
                pointHoverRadius: 6,
                fill: true,
                tension: 0.4 // Smooth curves
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: '#004684',
                    titleColor: '#FFFFFF',
                    bodyColor: '#F9FAFB',
                    borderColor: '#E5E7EB',
                    borderWidth: 1,
                    padding: 12,
                    displayColors: false,
                    callbacks: {
                        label: function (context) { return context.parsed.y + '%'; }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: false,
                    min: 0,
                    max: 100,
                    grid: {
                        color: '#F3F4F6', // gray-100
                        drawBorder: false
                    },
                    ticks: {
                        color: '#6B7280', // gray-500
                        callback: function (value) { return value + '%'; }
                    }
                },
                x: {
                    grid: { display: false, drawBorder: false },
                    ticks: { color: '#6B7280' }
                }
            },
            interaction: {
                intersect: false,
                mode: 'index',
            },
        }
    });
}

function renderMaintenanceList(schedules) {
    const listContainer = document.getElementById('maintenance-list');
    listContainer.innerHTML = '';

    if (!schedules || schedules.length === 0) {
        listContainer.innerHTML = `
        <div class="flex flex-col items-center justify-center h-full text-brand-muted py-8">
          <i class="fa-regular fa-calendar-check text-4xl mb-3 opacity-50 text-brand-primary"></i>
          <p class="text-sm font-medium">No upcoming maintenance.</p>
        </div>
      `;
        return;
    }

    schedules.forEach(item => {
        const row = document.createElement('div');
        row.className = "flex items-start gap-4 p-3 hover:bg-gray-50 rounded-xl transition-colors border border-transparent hover:border-gray-200 mb-2";

        row.innerHTML = `
        <div class="bg-blue-50 p-2.5 rounded-lg text-brand-primary border border-blue-100">
          <i class="fa-solid fa-wrench"></i>
        </div>
        <div class="flex-1 min-w-0">
          <p class="text-sm font-semibold text-brand-text truncate">${item.activity}</p>
          <p class="text-xs text-brand-muted truncate mt-0.5"><i class="fa-regular fa-user mr-1"></i> ${item.pic}</p>
        </div>
        <div class="text-right whitespace-nowrap">
          <p class="text-xs font-bold text-brand-primary bg-blue-50 px-2 py-1 rounded border border-blue-100">${item.date}</p>
        </div>
      `;
        listContainer.appendChild(row);
    });
}

function renderInventoryTable(dataList) {
    const tbody = document.getElementById('inventory-table-body');
    if (!tbody) return;

    tbody.innerHTML = '';

    const paginationInfo = document.getElementById('pagination-info');
    const prevBtn = document.getElementById('prev-page-btn');
    const nextBtn = document.getElementById('next-page-btn');

    if (!dataList || dataList.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="px-6 py-8 text-center text-gray-500">No inventory data found.</td></tr>';
        if (paginationInfo) paginationInfo.textContent = "Showing 0 to 0 of 0 entries";
        if (prevBtn) prevBtn.disabled = true;
        if (nextBtn) nextBtn.disabled = true;
        return;
    }

    const totalItems = dataList.length;
    const totalPages = Math.ceil(totalItems / window.rowsPerPage);

    if (window.currentPage > totalPages) window.currentPage = totalPages;
    if (window.currentPage < 1) window.currentPage = 1;

    const startIndex = (window.currentPage - 1) * window.rowsPerPage;
    const endIndex = Math.min(startIndex + window.rowsPerPage, totalItems);

    const paginatedData = dataList.slice(startIndex, endIndex);

    paginatedData.forEach((item, index) => {
        const tr = document.createElement('tr');
        tr.className = "hover:bg-blue-50 transition-colors group";

        let statusHtml = '';
        const statusLower = (item.status || '').toLowerCase().trim();
        if (statusLower === 'in use') {
            statusHtml = '<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">Aktif</span>';
        } else if (statusLower === 'in stok' || statusLower === 'in stock') {
            statusHtml = '<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">Available</span>';
        } else if (statusLower === 'breakdown') {
            statusHtml = '<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">Breakdown</span>';
        } else {
            statusHtml = `<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-gray-50 text-gray-700 border border-gray-200">${item.status || '-'}</span>`;
        }

        // Kolom: NO | Host Name | Serial Number | Assigned To | Department | Model | Status
        tr.innerHTML = `
        <td class="px-4 py-4 text-center font-bold text-gray-400 text-xs">${startIndex + index + 1}</td>
        <td class="px-6 py-4 font-semibold text-brand-primary group-hover:text-blue-700 text-sm">${item.hostname || '-'}</td>
        <td class="px-6 py-4 text-xs font-mono text-gray-500">${item.serial || '-'}</td>
        <td class="px-6 py-4 text-sm text-gray-700">${item.assigned || '-'}</td>
        <td class="px-6 py-4 text-xs text-gray-500">${item.dept || '-'}</td>
        <td class="px-6 py-4 text-xs text-gray-500 italic">${item.model || '-'}</td>
        <td class="px-6 py-4 text-xs">${statusHtml}</td>
      `;
        tbody.appendChild(tr);
    });

    if (paginationInfo) paginationInfo.textContent = `Showing ${startIndex + 1} to ${endIndex} of ${totalItems} entries`;
    if (prevBtn) prevBtn.disabled = window.currentPage === 1;
    if (nextBtn) nextBtn.disabled = window.currentPage === totalPages;

    renderPaginationButtons(totalPages, window.currentPage);
}

function renderPaginationButtons(totalPages, currentPage) {
    const container = document.getElementById('pagination-numbers');
    if (!container) return;

    container.innerHTML = '';

    if (totalPages <= 1) return;

    let pages = [];
    if (totalPages <= 5) {
        for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
        if (currentPage <= 3) {
            pages = [1, 2, 3, 4, '...', totalPages];
        } else if (currentPage >= totalPages - 2) {
            pages = [1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
        } else {
            pages = [1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages];
        }
    }

    pages.forEach(p => {
        if (p === '...') {
            const span = document.createElement('span');
            span.className = "px-2 py-2 text-sm font-bold text-gray-400";
            span.textContent = '...';
            container.appendChild(span);
        } else {
            const btn = document.createElement('button');
            btn.onclick = () => updateTablePage(p);
            btn.textContent = p;

            if (p === currentPage) {
                btn.className = "px-3 py-1 text-sm font-bold rounded bg-brand-primary text-white transition-colors border-2 border-brand-primary";
            } else {
                btn.className = "px-3 py-1 text-sm font-bold rounded border-2 border-brand-primary text-brand-primary hover:bg-brand-accent hover:border-brand-accent hover:text-brand-primary transition-colors bg-white";
            }

            container.appendChild(btn);
        }
    });
}

function updateTablePage(pageNumber) {
    window.currentPage = pageNumber;
    renderInventoryTable(window.currentFilteredData);
}

function prevPage() {
    if (window.currentPage > 1) {
        window.currentPage--;
        renderInventoryTable(window.currentFilteredData);
    }
}

function nextPage() {
    const totalPages = Math.ceil(window.currentFilteredData.length / window.rowsPerPage);
    if (window.currentPage < totalPages) {
        window.currentPage++;
        renderInventoryTable(window.currentFilteredData);
    }
}

// --- LOGS & ACTIVITY FUNCTIONS ---

function populateAssetDropdown() {
    loadAllAssetDropdowns();
}

function autoFillAsset(hostname) {
    const usernameInput = document.getElementById('log-username');
    const divisiInput = document.getElementById('log-divisi');
    const lokasiInput = document.getElementById('log-lokasi');

    if (hostname === "LAINNYA") {
        // Make editable
        [usernameInput, divisiInput].forEach(el => {
            el.value = "";
            el.readOnly = false;
            el.classList.remove('bg-transparent', 'border-b', 'border-blue-200');
            el.classList.add('bg-white', 'border', 'border-gray-200', 'rounded-lg', 'px-3');
        });
        lokasiInput.value = "";
    } else if (hostname) {
        const asset = window.inventoryDataList.find(a => a.hostname === hostname || a.serial === hostname);
        if (asset) {
            usernameInput.value = asset.assigned;
            divisiInput.value = asset.dept;
            lokasiInput.value = asset.lokasi;

            // Lock and style as read-only (except Location)
            [usernameInput, divisiInput].forEach(el => {
                el.readOnly = true;
                el.classList.add('bg-transparent', 'border-b', 'border-blue-200');
                el.classList.remove('bg-white', 'border', 'border-gray-200', 'rounded-lg', 'px-3');
            });
        }
    } else {
        // Reset to locked
        [usernameInput, divisiInput].forEach(el => {
            el.value = "";
            el.readOnly = true;
            el.classList.add('bg-transparent', 'border-b', 'border-blue-200');
            el.classList.remove('bg-white', 'border', 'border-gray-200', 'rounded-lg', 'px-3');
        });
        lokasiInput.value = "";
    }
}

function calculateDuration() {
    const start = document.getElementById('log-start').value;
    const end = document.getElementById('log-end').value;

    if (start && end) {
        const [startH, startM] = start.split(':').map(Number);
        const [endH, endM] = end.split(':').map(Number);

        let diff = (endH * 60 + endM) - (startH * 60 + startM);
        if (diff < 0) diff += 1440; // Over midnight

        document.getElementById('log-actual').value = diff;
    }
}

function submitLog(event) {
    event.preventDefault();
    const btn = event.target.querySelector('button[type="submit"]');
    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner animate-spin"></i> Submitting...';

    const assetSelect = document.getElementById('log-device') || document.getElementById('log-asset');
    const assetSerial = assetSelect ? assetSelect.value : "";
    const finalSerial = (assetSerial === "LAINNYA") ? "-" : assetSerial;

    const formData = {
        date: document.getElementById('log-date').value,
        serial: finalSerial,
        engineer: document.getElementById('log-engineer').value,
        category: document.getElementById('log-category').value,
        problem: document.getElementById('log-problem').value,
        activity: document.getElementById('log-activity').value,
        corrective: document.getElementById('log-corrective').value,
        start: document.getElementById('log-start').value,
        end: document.getElementById('log-end').value,
        actual: document.getElementById('log-actual').value,
        username: document.getElementById('log-username').value,
        divisi: document.getElementById('log-divisi').value,
        lokasi: document.getElementById('log-lokasi').value,
        evidenceBase64: '',
        evidenceFileName: ''
    };

    // === BACA FILE EVIDENCE SEBAGAI BASE64 (Jika ada) ===
    const evidenceInput = document.getElementById('log-evidence');
    const evidenceFile = evidenceInput && evidenceInput.files[0];

    if (evidenceFile) {
        // Validasi ukuran file (max 5MB)
        if (evidenceFile.size > 5 * 1024 * 1024) {
            Swal.fire({
                title: 'File Terlalu Besar!',
                text: 'Ukuran foto maksimal 5MB. Silakan kompres terlebih dahulu.',
                icon: 'warning',
                background: '#0f172a',
                color: '#f8fafc',
                confirmButtonColor: '#FDB813',
                confirmButtonText: 'OKE',
                position: 'center'
            });
            btn.disabled = false;
            btn.innerHTML = originalText;
            return;
        }

        const reader = new FileReader();
        reader.onload = function (e) {
            formData.evidenceBase64 = e.target.result; // "data:image/...;base64,..."
            formData.evidenceFileName = evidenceFile.name;
            sendFormToBackend(formData, btn, originalText);
        };
        reader.onerror = function () {
            // Kirim tanpa foto jika gagal baca
            sendFormToBackend(formData, btn, originalText);
        };
        reader.readAsDataURL(evidenceFile);
    } else {
        // Tidak ada foto, kirim langsung
        sendFormToBackend(formData, btn, originalText);
    }
}

// Fungsi pengiriman data ke backend (dipisah untuk async FileReader)
function sendFormToBackend(formData, btn, originalText) {
    google.script.run
        .withSuccessHandler(() => {
            Swal.fire({
                title: 'Berhasil!',
                text: 'Activity log telah berhasil disimpan ke database.',
                icon: 'success',
                background: '#0f172a',
                color: '#f8fafc',
                confirmButtonColor: '#22c55e',
                confirmButtonText: 'OKE',
                iconColor: '#22c55e',
                position: 'center',
                showClass: { popup: 'animate__animated animate__zoomIn' },
                hideClass: { popup: 'animate__animated animate__zoomOut' }
            });

            closeLogModal();
            fetchActivityLogs();
            btn.disabled = false;
            btn.innerHTML = originalText;
            document.getElementById('log-form').reset();
            clearEvidence(); // Reset preview foto
        })
        .withFailureHandler((err) => {
            Swal.fire({
                title: 'Gagal Menyimpan!',
                text: 'Penyebab: ' + (err.message || err),
                icon: 'error',
                background: '#0f172a',
                color: '#f8fafc',
                confirmButtonColor: '#ef4444',
                confirmButtonText: 'TUTUP',
                position: 'center'
            });
            btn.disabled = false;
            btn.innerHTML = originalText;
        })
        .saveActivityLog(formData);
}

// --- MODAL CONTROLS ---

function openLogModal() {
    const modal = document.getElementById('log-modal');
    const container = modal.querySelector('.modal-container');
    modal.classList.remove('hidden');
    setTimeout(() => {
        container.classList.remove('scale-95', 'opacity-0');
        container.classList.add('scale-100', 'opacity-100');
    }, 10);
}

function closeModal() {
    const modal = document.getElementById('log-modal');
    const container = modal.querySelector('.modal-container');
    container.classList.remove('scale-100', 'opacity-100');
    container.classList.add('scale-95', 'opacity-0');
    setTimeout(() => {
        modal.classList.add('hidden');
    }, 300);
}

function closeLogModal() {
    closeModal();
}

// --- EVIDENCE PHOTO PREVIEW & CLEAR ---

function previewEvidence(input) {
    const wrap = document.getElementById('evidence-preview-wrap');
    const img = document.getElementById('evidence-preview');
    const fname = document.getElementById('evidence-filename');

    if (input.files && input.files[0]) {
        const file = input.files[0];
        const reader = new FileReader();
        reader.onload = function (e) {
            img.src = e.target.result;
            fname.textContent = file.name;
            wrap.classList.remove('hidden');
        };
        reader.readAsDataURL(file);
    }
}

function clearEvidence() {
    const input = document.getElementById('log-evidence');
    const wrap = document.getElementById('evidence-preview-wrap');
    const img = document.getElementById('evidence-preview');
    if (input) input.value = '';
    if (img) img.src = '';
    if (wrap) wrap.classList.add('hidden');
}

// --- LOG FETCHING & RENDERING ---

function fetchActivityLogs() {
    google.script.run
        .withSuccessHandler((logs) => {
            // Sorting Chronological: by Date ASC, then by Start Time ASC (paling pagi di atas)
            logs.sort((a, b) => {
                // Primary sort: Date (Column B / Index 1)
                const dateA = parseDateForSort(a[1]);
                const dateB = parseDateForSort(b[1]);
                if (dateA - dateB !== 0) return dateA - dateB;

                // Secondary sort: Start Time (Column M / Index 12) — format "HH:MM"
                const timeA = a[12] || '00:00';
                const timeB = b[12] || '00:00';
                return timeA.localeCompare(timeB);
            });

            window.allActivityLogs = logs;
            window.currentLogPage = 1;
            renderActivityTable(window.allActivityLogs);
        })
        .withFailureHandler((err) => {
            console.error("Gagal mengambil activity logs:", err);
            const tbody = document.getElementById('activity-logs-body');
            if (tbody) {
                tbody.innerHTML = `<tr><td colspan="9" class="px-6 py-12 text-center text-brand-danger font-medium"><i class="fa-solid fa-circle-exclamation mr-2"></i> Error fetching logs: ${err}</td></tr>`;
            }
        })
        .getActivityLogs();
}

function parseDateForSort(dateStr) {
    if (!dateStr) return new Date(0);
    // Support formats like DD/MM/YYYY or YYYY-MM-DD
    if (dateStr.includes('/')) {
        const parts = dateStr.split('/');
        return new Date(parts[2], parts[1] - 1, parts[0]);
    }
    return new Date(dateStr);
}

function renderActivityTable(logs) {
    // ═══ HELPER: Konversi jam ke total menit dari tengah malam (FOOLPROOF) ═══
    function parseTimeToMinutes(timeVal) {
        if (!timeVal) return 0;
        var str = timeVal.toString().trim();
        // Format ISO String dari Google Sheets: "1899-12-30T07:30:00.000Z"
        if (str.indexOf('T') !== -1) {
            try {
                var d = new Date(str);
                if (!isNaN(d.getTime())) {
                    return d.getHours() * 60 + d.getMinutes();
                }
            } catch (e) { /* fallback ke parsing manual */ }
        }
        // Format Teks Biasa: "07:30" atau "14:00"
        if (str.indexOf(':') !== -1) {
            var parts = str.split(':');
            var h = parseInt(parts[0], 10) || 0;
            var m = parseInt(parts[1], 10) || 0;
            return h * 60 + m;
        }
        return 0;
    }

    // ═══ HELPER: Format tampilan jam ke string bersih "HH:MM" ═══
    function formatTimeDisplay(timeVal) {
        if (!timeVal) return '-';
        var str = timeVal.toString().trim();
        // Format ISO String → konversi ke HH:MM
        if (str.indexOf('T') !== -1) {
            try {
                var d = new Date(str);
                if (!isNaN(d.getTime())) {
                    var hh = ('0' + d.getHours()).slice(-2);
                    var mm = ('0' + d.getMinutes()).slice(-2);
                    return hh + ':' + mm;
                }
            } catch (e) { /* fallback */ }
        }
        // Format "07:30" → kembalikan apa adanya
        if (str.indexOf(':') !== -1) {
            return str;
        }
        return str || '-';
    }

    // ═══ SORTING KRONOLOGIS: Date ASC → Start Time ASC (jam paling pagi di atas) ═══
    if (logs && logs.length > 0) {
        logs.sort(function (a, b) {
            // Primary: Tanggal (Indeks 1) — Ascending
            var dateA = parseDateForSort(a[1]);
            var dateB = parseDateForSort(b[1]);
            var dateDiff = dateA - dateB;
            if (dateDiff !== 0) return dateDiff;

            // Secondary: Start Time (Indeks 12) — total menit dari tengah malam, Ascending
            var minutesA = parseTimeToMinutes(a[12]);
            var minutesB = parseTimeToMinutes(b[12]);
            return minutesA - minutesB;
        });
    }

    const tbody = document.getElementById('activity-logs-body');
    if (!tbody) return;

    const paginationInfo = document.getElementById('log-pagination-info');
    const prevBtn = document.getElementById('log-prev-btn');
    const nextBtn = document.getElementById('log-next-btn');

    if (!logs || logs.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" class="px-6 py-12 text-center text-gray-400">No activity logs found.</td></tr>';
        if (paginationInfo) paginationInfo.textContent = "Showing 0 to 0 of 0 entries";
        if (prevBtn) prevBtn.disabled = true;
        if (nextBtn) nextBtn.disabled = true;
        return;
    }

    const totalItems = logs.length;
    const totalPages = Math.ceil(totalItems / window.rowsPerLogPage);

    if (window.currentLogPage > totalPages) window.currentLogPage = totalPages;
    if (window.currentLogPage < 1) window.currentLogPage = 1;

    const startIndex = (window.currentLogPage - 1) * window.rowsPerLogPage;
    const endIndex = Math.min(startIndex + window.rowsPerLogPage, totalItems);

    const paginatedData = logs.slice(startIndex, endIndex);

    tbody.innerHTML = '';
    paginatedData.forEach((row, index) => {
        const tr = document.createElement('tr');
        tr.className = "hover:bg-blue-50/30 transition-colors border-b border-gray-50 last:border-0";

        const rowNumber = (window.currentLogPage - 1) * window.rowsPerLogPage + (index + 1);

        // Evidence Photo column (Index 17 = Column R)
        const evidenceUrl = row[17] || '';
        let evidenceHtml = '<span class="text-gray-300 text-xs">—</span>';
        if (evidenceUrl && evidenceUrl !== '' && evidenceUrl !== 'UPLOAD_ERROR') {
            evidenceHtml = `<a href="${evidenceUrl}" target="_blank" title="Lihat Bukti Foto"
          class="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-blue-50 border border-blue-100 text-brand-primary hover:bg-brand-accent hover:text-brand-primary hover:border-brand-accent transition-all duration-200 text-xs font-bold">
          <i class="fa-solid fa-image"></i>
          <span class="hidden md:inline">Lihat</span>
        </a>`;
        }

        // Format tampilan jam Start & End Time agar selalu bersih HH:MM
        var displayStartTime = formatTimeDisplay(row[12]);
        var displayEndTime = formatTimeDisplay(row[13]);

        tr.innerHTML = `
        <td class="px-6 py-4 text-center font-bold text-gray-400 text-xs">${rowNumber}</td>
        <td class="px-6 py-4 whitespace-nowrap text-xs font-bold text-gray-700">${row[1]}</td>
        <td class="px-6 py-4 whitespace-nowrap text-xs font-medium text-brand-primary">
          <span class="bg-blue-50 px-2 py-1 rounded-lg border border-blue-100">${row[2]}</span>
        </td>
        <td class="px-6 py-4 text-xs text-gray-600">${row[3]}</td>
        <td class="px-6 py-4 text-xs text-gray-500 font-medium">${row[4]}</td>
        <td class="px-6 py-4">
          <span class="px-2 py-1 rounded-md bg-gray-100 text-gray-600 text-[10px] font-bold uppercase tracking-wider">${row[7]}</span>
        </td>
        <td class="px-6 py-4 text-center text-xs font-mono text-gray-400">
          ${displayStartTime} - ${displayEndTime}
        </td>
        <td class="px-6 py-4 text-center">
          <span class="text-xs font-black text-brand-primary">${row[15]}</span>
        </td>
        <td class="px-6 py-4 text-xs text-gray-500 italic">${row[11]}</td>
      `;
        tbody.appendChild(tr);
    });

    if (paginationInfo) paginationInfo.textContent = `Showing ${startIndex + 1} to ${endIndex} of ${totalItems} entries`;
    if (prevBtn) prevBtn.disabled = window.currentLogPage === 1;
    if (nextBtn) nextBtn.disabled = window.currentLogPage === totalPages;

    renderLogPagination(totalPages, window.currentLogPage);
}

function renderLogPagination(totalPages, currentPage) {
    const container = document.getElementById('log-pagination-numbers');
    if (!container) return;

    container.innerHTML = '';
    if (totalPages <= 1) return;

    let pages = [];
    if (totalPages <= 5) {
        for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
        if (currentPage <= 3) {
            pages = [1, 2, 3, 4, '...', totalPages];
        } else if (currentPage >= totalPages - 2) {
            pages = [1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
        } else {
            pages = [1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages];
        }
    }

    pages.forEach(p => {
        if (p === '...') {
            const span = document.createElement('span');
            span.className = "px-2 py-2 text-sm font-bold text-gray-400";
            span.textContent = '...';
            container.appendChild(span);
        } else {
            const btn = document.createElement('button');
            btn.onclick = () => updateLogPage(p);
            btn.textContent = p;

            if (p === currentPage) {
                btn.className = "px-3 py-1 text-sm font-bold rounded bg-brand-primary text-white transition-colors border-2 border-brand-primary";
            } else {
                btn.className = "px-3 py-1 text-sm font-bold rounded border-2 border-brand-primary text-brand-primary hover:bg-brand-accent hover:border-brand-accent hover:text-brand-primary transition-colors bg-white";
            }
            container.appendChild(btn);
        }
    });
}

function updateLogPage(pageNumber) {
    window.currentLogPage = pageNumber;
    renderActivityTable(window.allActivityLogs);
}

function prevLogPage() {
    if (window.currentLogPage > 1) {
        window.currentLogPage--;
        renderActivityTable(window.allActivityLogs);
    }
}

function nextLogPage() {
    const totalPages = Math.ceil(window.allActivityLogs.length / window.rowsPerLogPage);
    if (window.currentLogPage < totalPages) {
        window.currentLogPage++;
        renderActivityTable(window.allActivityLogs);
    }
}

// ═══════════════════════════════════════════════
//  JADWAL MAINTENANCE — FETCH & RENDER
// ═══════════════════════════════════════════════

window.maintenanceData = null;

function fetchMaintenanceSchedule() {
    var tbody = document.getElementById('maintenance-table-body');
    if (tbody) {
        tbody.innerHTML = '<tr><td colspan="11" class="px-6 py-12 text-center text-gray-400"><i class="fa-solid fa-spinner animate-spin text-3xl mb-4"></i><p>Memuat jadwal maintenance...</p></td></tr>';
    }

    loadAllAssetDropdowns();

    google.script.run
        .withSuccessHandler(function (data) {
            window.maintenanceData = data;
            populateMonthFilter(data.months);
            renderMaintenanceTable();
        })
        .withFailureHandler(function (err) {
            console.error('Gagal memuat jadwal maintenance:', err);
            var tbody2 = document.getElementById('maintenance-table-body');
            if (tbody2) {
                tbody2.innerHTML = '<tr><td colspan="11" class="px-6 py-12 text-center text-red-400 font-medium"><i class="fa-solid fa-circle-exclamation mr-2"></i> Error: ' + err + '</td></tr>';
            }
        })
        .getMaintenanceData();
}

// Fungsi Utama: Sinkronisasi pemuatan data ke kedua dropdown (Daily & Maintenance)
function loadAllAssetDropdowns() {
    google.script.run
        .withSuccessHandler(function (data) {
            if (!data) return;

            const dailySelect = document.getElementById('log-device') || document.getElementById('log-asset');
            const maintSelect = document.getElementById('maint-asset-select');

            // 1. Populasikan Dropdown Harian (Daily Logs) menggunakan list inventori utuh
            if (dailySelect && data.inventory) {
                dailySelect.innerHTML = '<option value="">-- Pilih Perangkat --</option>';
                // Sediakan opsi "LAINNYA" di paling atas untuk pelaporan harian non-asset
                const otherOption = document.createElement('option');
                otherOption.value = "LAINNYA";
                otherOption.textContent = "LAINNYA / NON-ASSET";
                dailySelect.appendChild(otherOption);

                data.inventory.forEach(asset => {
                    if (!asset || !asset.hostname) return;
                    const opt = document.createElement('option');
                    opt.value = asset.hostname; // Gunakan Host Name sebagai value untuk daily log (autoFillAsset & submit)
                    opt.textContent = `${asset.hostname} - ${asset.assigned || 'No User'}`;
                    dailySelect.appendChild(opt);
                });
            }

            // 2. Populasikan Dropdown Jadwal Maintenance menggunakan list inventori utuh (Gambar 2 & Request Bos Taufik)
            if (maintSelect && data.inventory) {
                maintSelect.innerHTML = '<option value="">-- Pilih Perangkat --</option>';

                data.inventory.forEach(asset => {
                    if (!asset || !asset.serial) return;
                    const opt = document.createElement('option');
                    opt.value = asset.serial; // Gunakan Serial Number sebagai value untuk PM
                    opt.textContent = `${asset.hostname} - ${asset.assigned || 'No User'}`;
                    maintSelect.appendChild(opt);
                });
            }
        })
        .withFailureHandler(function (err) {
            console.error('Gagal memuat dropdown list perangkat:', err);
        })
        .getDropdownData();
}

// Wrapper backward-compatible untuk menjaga kestabilan kode lawas
function populateAssetDropdown() {
    loadAllAssetDropdowns();
}

function populateMaintAssetDropdown() {
    loadAllAssetDropdowns();
}

function loadAssetDropdowns() {
    loadAllAssetDropdowns();
}

function populateMonthFilter(months) {
    var select = document.getElementById('maintenance-month-filter');
    if (!select) return;

    var oldVal = select.value;
    select.innerHTML = '';

    // 1. Opsi "Semua Bulan" di paling atas
    var allOpt = document.createElement('option');
    allOpt.value = '__ALL__';
    allOpt.textContent = 'Semua Bulan (Belum & Terjadwal)';
    select.appendChild(allOpt);

    // 2. Daftar Bulan Standar Lengkap mulai dari Januari 2026
    var standardMonths = [
        "Januari 2026", "Februari 2026", "Maret 2026", "April 2026",
        "Mei 2026", "Juni 2026", "Juli 2026", "Agustus 2026",
        "September 2026", "Oktober 2026", "November 2026", "Desember 2026"
    ];
    standardMonths.forEach(function (label) {
        var opt = document.createElement('option');
        opt.value = label;
        opt.textContent = label;
        select.appendChild(opt);
    });

    var unschedOpt = document.createElement('option');
    unschedOpt.value = '__UNSCHEDULED__';
    unschedOpt.textContent = 'PM Bulan Ini';
    select.appendChild(unschedOpt);

    // 4. Logika Penentuan Default Bulan Saat Ini (Auto-Select Current Month)
    if (oldVal && select.querySelector('option[value="' + oldVal + '"]')) {
        select.value = oldVal;
    } else {
        var indMonths = [
            "Januari", "Februari", "Maret", "April",
            "Mei", "Juni", "Juli", "Agustus",
            "September", "Oktober", "November", "Desember"
        ];
        var now = new Date();
        var currentMonthYear = indMonths[now.getMonth()] + " " + now.getFullYear();

        if (select.querySelector('option[value="' + currentMonthYear + '"]')) {
            select.value = currentMonthYear;
        } else {
            select.value = '__ALL__';
        }
    }
}

function renderMaintenanceTable() {
    var data = window.maintenanceData;
    if (!data || !data.schedule) return;

    var tbody = document.getElementById('maintenance-table-body');
    if (!tbody) return;

    var select = document.getElementById('maintenance-month-filter');
    var selectedMonth = select ? select.value : '__ALL__';

    var displayItems = [];

    if (selectedMonth === '__ALL__') {
        // 1. Tampilkan semua bulan terjadwal terlebih dahulu mulai dari Januari 2026
        var sortingOrder = [
            "Januari 2026", "Februari 2026", "Maret 2026", "April 2026",
            "Mei 2026", "Juni 2026", "Juli 2026", "Agustus 2026",
            "September 2026", "Oktober 2026", "November 2026", "Desember 2026"
        ];
        sortingOrder.forEach(function (month) {
            var assets = data.schedule[month] || [];
            assets.forEach(function (asset) {
                displayItems.push({
                    month: month,
                    hostname: asset.hostname,
                    serial: asset.serial || '-',
                    assigned: asset.assigned,
                    dept: asset.dept || '-',
                    type: asset.type || '-',
                    status: asset.status,
                    targetDate: asset.targetDate || '',
                    targetReschedule: asset.targetReschedule || '',
                    keterangan: asset.keterangan || ''
                });
            });
        });

        // 2. Tampilkan yang Belum Terjadwal di paling bawah sekali
        var unscheduled = data.schedule["Belum Terjadwal"] || [];
        unscheduled.forEach(function (asset) {
            displayItems.push({
                month: "",
                hostname: asset.hostname,
                serial: asset.serial || '-',
                assigned: asset.assigned,
                dept: asset.dept || '-',
                type: asset.type || '-',
                status: asset.status,
                targetDate: asset.targetDate || '',
                targetReschedule: asset.targetReschedule || '',
                keterangan: asset.keterangan || ''
            });
        });
    } else if (selectedMonth === '__UNSCHEDULED__') {
        var indMonths = [
            "Januari", "Februari", "Maret", "April",
            "Mei", "Juni", "Juli", "Agustus",
            "September", "Oktober", "November", "Desember"
        ];
        var now = new Date();
        var curMonthIndex = now.getMonth();
        var curYear = now.getFullYear();

        function isDateInCurrentMonth(dateStr) {
            if (!dateStr || dateStr === '-' || dateStr === '') return false;
            var str = dateStr.toString().trim();

            // 1. Cek format "Bulan Tahun" bahasa Indonesia (misal: "Mei 2026")
            var spaceParts = str.split(/\s+/);
            if (spaceParts.length === 2) {
                var mIdx = indMonths.indexOf(spaceParts[0]);
                var yVal = parseInt(spaceParts[1], 10);
                if (mIdx !== -1 && !isNaN(yVal)) {
                    return (mIdx === curMonthIndex && yVal === curYear);
                }
            }

            // 2. Format DD/MM/YYYY
            var parts1 = str.split('/');
            if (parts1.length === 3) {
                var mm = parseInt(parts1[1], 10) - 1;
                var yy = parseInt(parts1[2], 10);
                return (mm === curMonthIndex && yy === curYear);
            }

            // 3. Format YYYY-MM-DD
            var parts2 = str.split('-');
            if (parts2.length === 3 && parts2[0].length === 4) {
                var yy = parseInt(parts2[0], 10);
                var mm = parseInt(parts2[1], 10) - 1;
                return (mm === curMonthIndex && yy === curYear);
            }

            // 4. Default Date Parse
            var dObj = new Date(str);
            if (!isNaN(dObj.getTime())) {
                return (dObj.getMonth() === curMonthIndex && dObj.getFullYear() === curYear);
            }
            return false;
        }

        for (var monthKey in data.schedule) {
            var list = data.schedule[monthKey] || [];
            list.forEach(function (asset) {
                var hasReschedule = (asset.targetReschedule && asset.targetReschedule !== '' && asset.targetReschedule !== '-');
                var isTargetInCurMonth = isDateInCurrentMonth(asset.targetDate);
                var isRescheduleInCurMonth = isDateInCurrentMonth(asset.targetReschedule);

                var showInCurMonth = false;
                if (hasReschedule) {
                    // Jika memiliki reschedule, gunakan penentuan reschedule bulan berjalan saja
                    showInCurMonth = isRescheduleInCurMonth;
                } else {
                    // Jika tidak memiliki reschedule, gunakan target date bulan berjalan
                    showInCurMonth = isTargetInCurMonth;
                }

                if (showInCurMonth) {
                    displayItems.push({
                        month: monthKey === "Belum Terjadwal" ? "" : monthKey,
                        hostname: asset.hostname,
                        serial: asset.serial || '-',
                        assigned: asset.assigned,
                        dept: asset.dept || '-',
                        type: asset.type || '-',
                        status: asset.status,
                        targetDate: asset.targetDate || '',
                        targetReschedule: asset.targetReschedule || '',
                        keterangan: asset.keterangan || ''
                    });
                }
            });
        }
    } else {
        var assets = data.schedule[selectedMonth] || [];
        assets.forEach(function (asset) {
            displayItems.push({
                month: selectedMonth,
                hostname: asset.hostname,
                serial: asset.serial || '-',
                assigned: asset.assigned,
                dept: asset.dept || '-',
                type: asset.type || '-',
                status: asset.status,
                targetDate: asset.targetDate || '',
                targetReschedule: asset.targetReschedule || '',
                keterangan: asset.keterangan || ''
            });
        });
    }
    // Filter pencarian berdasarkan input live search di tab Maintenance
    var searchInput = document.getElementById('maintenance-search');
    var searchTerm = searchInput ? searchInput.value.toLowerCase().trim() : '';
    if (searchTerm !== '') {
        displayItems = displayItems.filter(function (item) {
            return (item.hostname && item.hostname.toLowerCase().indexOf(searchTerm) !== -1) ||
                (item.assigned && item.assigned.toLowerCase().indexOf(searchTerm) !== -1) ||
                (item.serial && item.serial.toLowerCase().indexOf(searchTerm) !== -1) ||
                (item.month && item.month.toLowerCase().indexOf(searchTerm) !== -1) ||
                (item.targetDate && item.targetDate.toLowerCase().indexOf(searchTerm) !== -1) ||
                (item.keterangan && item.keterangan.toLowerCase().indexOf(searchTerm) !== -1);
        });
    }

    var totalEl = document.getElementById('mp-total-scheduled');
    var activeEl = document.getElementById('mp-active-month');
    var doneEl = document.getElementById('mp-done-count');
    var pendingEl = document.getElementById('mp-pending-count');
    var totalUnitsEl = document.getElementById('maintenance-total-units');

    var doneCount = 0;
    var pendingCount = 0;
    displayItems.forEach(function (item) {
        if (item.status === 'Done') doneCount++;
        else pendingCount++;
    });

    if (totalEl) totalEl.textContent = data.totalEligible || 0;
    if (activeEl) {
        if (selectedMonth === '__ALL__') {
            activeEl.textContent = 'Semua Perangkat';
        } else if (selectedMonth === '__UNSCHEDULED__') {
            activeEl.textContent = 'PM Bulan Ini';
        } else {
            activeEl.textContent = selectedMonth;
        }
    }
    if (doneEl) doneEl.textContent = doneCount;
    if (pendingEl) pendingEl.textContent = pendingCount;
    if (totalUnitsEl) totalUnitsEl.textContent = displayItems.length + ' Unit';

    tbody.innerHTML = '';

    if (displayItems.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" class="px-6 py-12 text-center text-gray-400">Tidak ada perangkat untuk periode ini.</td></tr>';
        return;
    }

    displayItems.forEach(function (item, index) {
        var tr = document.createElement('tr');
        tr.className = 'hover:bg-blue-50/30 transition-colors border-b border-gray-50 last:border-0';

        var statusBadge = '';
        if (item.status === 'Done') {
            statusBadge = '<span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-600 border border-emerald-200"><i class="fa-solid fa-circle-check"></i> Done</span>';
        } else {
            statusBadge = '<span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-yellow-50 text-yellow-600 border border-yellow-200"><i class="fa-solid fa-clock"></i> Pending</span>';
        }

        var targetDateHtml = '';
        if (item.targetDate && item.targetDate !== '-') {
            targetDateHtml = '<span class="inline-flex items-center gap-1.5 text-xs font-bold text-gray-700"><i class="fa-regular fa-calendar text-brand-primary text-[10px]"></i>' + item.targetDate + '</span>';
        } else {
            targetDateHtml = '<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-400 border border-slate-200 uppercase tracking-wide"><i class="fa-solid fa-clock-rotate-left"></i> Belum Dijadwalkan</span>';
        }

        var targetRescheduleHtml = '';
        if (item.targetReschedule && item.targetReschedule !== '-' && item.targetReschedule !== '') {
            targetRescheduleHtml = '<span class="inline-flex items-center gap-1.5 text-xs font-bold text-amber-600 bg-amber-50 px-2.5 py-1 rounded border border-amber-200"><i class="fa-regular fa-calendar-minus text-amber-500 text-[10px]"></i>' + item.targetReschedule + '</span>';
        } else {
            targetRescheduleHtml = '<span class="text-xs text-gray-400 font-medium">-</span>';
        }

        var monthHtml = '';
        if (item.month && item.month !== '-') {
            monthHtml = '<span class="text-xs font-semibold text-gray-600">' + item.month + '</span>';
        } else {
            monthHtml = '<span class="text-xs font-semibold text-slate-400 italic">Belum Dijadwalkan</span>';
        }

        var keteranganHtml = '';
        if (item.status === 'Done') {
            keteranganHtml = '<span class="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold shadow-sm"><i class="fa-solid fa-calendar-check"></i> ' + (item.keterangan || '-') + '</span>';
        } else {
            keteranganHtml = '<span class="text-xs text-gray-400 italic">-</span>';
        }

        var actionButtonsHtml = '';
        var hostnameEsc = item.hostname.replace(/'/g, "\\'");
        var serialEsc = item.serial.replace(/'/g, "\\'");
        var assignedEsc = item.assigned.replace(/'/g, "\\'");

        if (item.status === 'Done') {
            actionButtonsHtml = '<span class="text-xs text-emerald-600 font-bold uppercase tracking-wider"><i class="fa-solid fa-circle-check mr-1"></i> Completed</span>';
        } else {
            var schedBtn = '<button onclick="openMaintModal(\'' + serialEsc + '\', \'' + hostnameEsc + '\')" ' +
                'class="bg-amber-500 hover:bg-amber-600 text-white px-3 py-1 rounded shadow text-xs font-bold">' +
                '<i class="fa-solid fa-calendar-plus"></i> Atur</button>';

            var doneBtn = '';
            if (item.targetDate && item.targetDate !== '') {
                doneBtn = '<button onclick="handleMarkDone(\'' + hostnameEsc + '\')" ' +
                    'class="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-brand-primary text-white hover:bg-blue-800 shadow-sm transition-all duration-200" ' +
                    'title="Tandai PM Selesai">' +
                    '<i class="fa-solid fa-check"></i> Selesai</button>';
            } else {
                doneBtn = '<button disabled ' +
                    'class="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed" ' +
                    'title="Jadwalkan PM Terlebih Dahulu">' +
                    '<i class="fa-solid fa-ban"></i> Selesai</button>';
            }

            actionButtonsHtml = '<div class="flex items-center justify-center gap-2">' + schedBtn + doneBtn + '</div>';
        }

        tr.innerHTML =
            '<td class="px-5 py-4 text-center font-bold text-gray-400 text-xs">' + (index + 1) + '</td>' +
            '<td class="px-5 py-4 whitespace-nowrap">' + targetDateHtml + '</td>' +
            '<td class="px-5 py-4 whitespace-nowrap">' + targetRescheduleHtml + '</td>' +
            '<td class="px-5 py-4 whitespace-nowrap">' + monthHtml + '</td>' +
            '<td class="px-5 py-4 text-xs font-bold text-brand-primary">' + item.hostname + '</td>' +
            '<td class="px-5 py-4 text-xs text-gray-700 font-medium">' + item.assigned + '</td>' +
            '<td class="px-5 py-4 text-center">' + statusBadge + '</td>' +
            '<td class="px-5 py-4 text-center">' + keteranganHtml + '</td>' +
            '<td class="px-5 py-4 text-center">' + actionButtonsHtml + '</td>';

        tbody.appendChild(tr);
    });
}

function handleMarkDone(hostname) {
    Swal.fire({
        title: 'Tandai Selesai?',
        html: 'Perangkat <strong>' + hostname + '</strong> akan ditandai PM selesai.<br><small class="text-gray-400">Log otomatis akan ditulis ke Daily Activity Logs.</small>',
        icon: 'question',
        background: '#0f172a',
        color: '#f8fafc',
        showCancelButton: true,
        confirmButtonColor: '#22c55e',
        cancelButtonColor: '#64748b',
        confirmButtonText: '<i class="fa-solid fa-check mr-1"></i> Ya, Selesai',
        cancelButtonText: 'Batal',
        position: 'center',
        showClass: { popup: 'animate__animated animate__zoomIn' },
        hideClass: { popup: 'animate__animated animate__zoomOut' }
    }).then(function (result) {
        if (result.isConfirmed) {
            Swal.fire({
                title: 'Menyimpan...',
                text: 'Menulis log PM untuk ' + hostname,
                allowOutsideClick: false,
                didOpen: function () { Swal.showLoading(); },
                background: '#0f172a',
                color: '#f8fafc'
            });

            google.script.run
                .withSuccessHandler(function () {
                    Swal.fire({
                        title: 'PM Selesai!',
                        text: hostname + ' berhasil ditandai Done & log tercatat.',
                        icon: 'success',
                        background: '#0f172a',
                        color: '#f8fafc',
                        confirmButtonColor: '#22c55e',
                        confirmButtonText: 'OKE',
                        iconColor: '#22c55e',
                        position: 'center'
                    });
                    fetchMaintenanceSchedule();
                })
                .withFailureHandler(function (err) {
                    Swal.fire({
                        title: 'Gagal!',
                        text: 'Error: ' + (err.message || err),
                        icon: 'error',
                        background: '#0f172a',
                        color: '#f8fafc',
                        confirmButtonColor: '#ef4444',
                        confirmButtonText: 'TUTUP',
                        position: 'center'
                    });
                })
                .markMaintenanceDone(hostname);
        }
    });
}

function openMaintModal(sn, hostName) {
    var modal = document.getElementById('maintenance-modal');
    if (!modal) return;

    var form = document.getElementById('maintenance-form');
    if (form) form.reset();

    var select = document.getElementById('maint-asset-select');
    if (select) {
        select.value = sn;
        select.disabled = true; // Lock dropdown for targeted row edit
    }

    document.getElementById('maint-sn').value = sn;

    var targetDate = '';
    var targetReschedule = '';
    var period = '';

    if (window.maintenanceData && window.maintenanceData.schedule) {
        for (var key in window.maintenanceData.schedule) {
            var list = window.maintenanceData.schedule[key] || [];
            for (var i = 0; i < list.length; i++) {
                if (list[i].serial === sn) {
                    targetDate = list[i].targetDate || '';
                    targetReschedule = list[i].targetReschedule || '';
                    period = list[i].month || '';
                    break;
                }
            }
        }
    }

    document.getElementById('maint-target-date').value = targetDate;
    document.getElementById('maint-target-reschedule').value = targetReschedule;

    if (period && period !== '') {
        document.getElementById('maint-periode').value = period;
    }

    modal.classList.remove('hidden');
}

function openMaintenanceModal() {
    var modal = document.getElementById('maintenance-modal');
    if (!modal) return;

    var form = document.getElementById('maintenance-form');
    if (form) form.reset();

    var select = document.getElementById('maint-asset-select');
    if (select) {
        select.disabled = false; // Enable select dropdown for general addition
        if (select.options.length > 0) {
            select.selectedIndex = 0;
        }
    }

    onMaintDeviceSelectChange();

    document.getElementById('maint-target-date').value = '';
    document.getElementById('maint-target-reschedule').value = '';
    document.getElementById('maint-periode').selectedIndex = 0;

    modal.classList.remove('hidden');
}

function onMaintDeviceSelectChange() {
    var select = document.getElementById('maint-asset-select');
    var snInput = document.getElementById('maint-sn');
    if (select && snInput) {
        snInput.value = select.value;

        var sn = select.value;
        var targetDate = '';
        var targetReschedule = '';
        var period = '';

        if (window.maintenanceData && window.maintenanceData.schedule) {
            for (var key in window.maintenanceData.schedule) {
                var list = window.maintenanceData.schedule[key] || [];
                for (var i = 0; i < list.length; i++) {
                    if (list[i].serial === sn) {
                        targetDate = list[i].targetDate || '';
                        targetReschedule = list[i].targetReschedule || '';
                        period = list[i].month || '';
                        break;
                    }
                }
            }
        }

        document.getElementById('maint-target-date').value = targetDate;
        document.getElementById('maint-target-reschedule').value = targetReschedule;
        if (period && period !== '') {
            document.getElementById('maint-periode').value = period;
        } else {
            document.getElementById('maint-periode').selectedIndex = 0;
        }
    }
}

function populateDeviceSelect(assets) {
    var select = document.getElementById('maint-asset-select');
    if (!select) return;

    select.innerHTML = '';

    assets.forEach(function (asset) {
        var opt = document.createElement('option');
        opt.value = asset.serial;
        opt.textContent = asset.hostname + ' - ' + (asset.assignedTo || 'No User');
        select.appendChild(opt);
    });
}

function closeMaintenanceModal() {
    var modal = document.getElementById('maintenance-modal');
    if (modal) modal.classList.add('hidden');
}

function saveMaintSchedule(event) {
    if (event) event.preventDefault();

    var sn = document.getElementById('maint-sn').value;
    var targetDate = document.getElementById('maint-target-date').value;
    var targetReschedule = document.getElementById('maint-target-reschedule').value;
    var period = document.getElementById('maint-periode').value;

    if (!sn || !targetDate || !period) {
        Swal.fire({
            title: 'Formulir Belum Lengkap',
            text: 'Silakan isi tanggal rencana PM dan periode bulan.',
            icon: 'warning',
            background: '#0f172a',
            color: '#f8fafc',
            confirmButtonColor: '#ef4444'
        });
        return;
    }

    Swal.fire({
        title: 'Menyimpan Jadwal...',
        text: 'Menghubungkan ke database...',
        allowOutsideClick: false,
        didOpen: function () { Swal.showLoading(); },
        background: '#0f172a',
        color: '#f8fafc'
    });

    google.script.run
        .withSuccessHandler(function (res) {
            if (res === true) {
                Swal.fire({
                    title: 'Jadwal Berhasil Diperbarui!',
                    text: 'Rencana tanggal PM dan periode telah berhasil dicatatkan.',
                    icon: 'success',
                    background: '#0f172a',
                    color: '#f8fafc',
                    confirmButtonColor: '#22c55e',
                    confirmButtonText: 'OKE',
                    iconColor: '#22c55e',
                    position: 'center'
                });
                closeMaintenanceModal();
                fetchMaintenanceSchedule();
            } else {
                Swal.fire({
                    title: 'Gagal Menyimpan!',
                    text: res,
                    icon: 'error',
                    background: '#0f172a',
                    color: '#f8fafc',
                    confirmButtonColor: '#ef4444',
                    confirmButtonText: 'TUTUP',
                    position: 'center'
                });
            }
        })
        .withFailureHandler(function (err) {
            Swal.fire({
                title: 'Gagal Sistem!',
                text: 'Error: ' + (err.message || err),
                icon: 'error',
                background: '#0f172a',
                color: '#f8fafc',
                confirmButtonColor: '#ef4444',
                confirmButtonText: 'TUTUP',
                position: 'center'
            });
        })
        .saveManualMaintenanceSchedule(sn, targetDate, targetReschedule, period);
}

// ==========================================
//  EVIDENCE ACTIVITY GALLERY PAGE LOGIC
// ==========================================

function fetchEvidenceData() {
    const loading = document.getElementById('evidence-loading');
    const empty = document.getElementById('evidence-empty');
    const grid = document.getElementById('evidence-grid');

    if (loading) loading.classList.remove('hidden');
    if (empty) empty.classList.add('hidden');
    if (grid) grid.classList.add('hidden');

    if (window.allActivityLogs && window.allActivityLogs.length > 0) {
        renderEvidenceGrid();
    } else {
        google.script.run
            .withSuccessHandler((logs) => {
                // Sort kronologis seperti di Logs tab
                if (logs && logs.length > 0) {
                    logs.sort(function (a, b) {
                        var dateA = parseDateForSort(a[1]);
                        var dateB = parseDateForSort(b[1]);
                        var dateDiff = dateA - dateB;
                        if (dateDiff !== 0) return dateDiff;
                        var minutesA = parseTimeToMinutes(a[12]);
                        var minutesB = parseTimeToMinutes(b[12]);
                        return minutesA - minutesB;
                    });
                }
                window.allActivityLogs = logs;
                renderEvidenceGrid();
            })
            .withFailureHandler((err) => {
                console.error("Gagal mengambil activity logs untuk Evidence:", err);
                if (loading) loading.classList.add('hidden');
                if (empty) {
                    empty.classList.remove('hidden');
                    empty.querySelector('h3').textContent = 'Error Loading Photos';
                    empty.querySelector('p').textContent = err.toString();
                }
            })
            .getActivityLogs();
    }
}

function renderEvidenceGrid() {
    const loading = document.getElementById('evidence-loading');
    const empty = document.getElementById('evidence-empty');
    const grid = document.getElementById('evidence-grid');
    const statsCount = document.getElementById('evidence-stats-count');

    if (loading) loading.classList.add('hidden');

    if (!window.allActivityLogs || window.allActivityLogs.length === 0) {
        if (empty) empty.classList.remove('hidden');
        if (grid) grid.classList.add('hidden');
        if (statsCount) statsCount.textContent = '0';
        return;
    }

    // Filter ONLY logs with a valid evidence photo URL
    let evidenceLogs = window.allActivityLogs.filter(row => {
        const evidenceUrl = row[17] || '';
        return evidenceUrl && evidenceUrl.trim() !== '' && evidenceUrl !== 'UPLOAD_ERROR';
    });

    // Apply Live Search and Dropdown Filter
    const searchVal = (document.getElementById('evidence-search-input')?.value || '').toLowerCase().trim();
    const catVal = document.getElementById('evidence-category-filter')?.value || 'ALL';

    if (catVal !== 'ALL') {
        evidenceLogs = evidenceLogs.filter(row => (row[7] || '').toLowerCase() === catVal.toLowerCase());
    }

    if (searchVal !== '') {
        evidenceLogs = evidenceLogs.filter(row => {
            const hostName = (row[2] || '').toLowerCase();
            const userName = (row[3] || '').toLowerCase();
            const engineerName = (row[11] || '').toLowerCase();
            return hostName.includes(searchVal) || userName.includes(searchVal) || engineerName.includes(searchVal);
        });
    }

    // Update stats count
    if (statsCount) statsCount.textContent = evidenceLogs.length;

    if (evidenceLogs.length === 0) {
        if (empty) empty.classList.remove('hidden');
        if (grid) grid.classList.add('hidden');
        return;
    }

    if (empty) empty.classList.add('hidden');
    if (grid) grid.classList.remove('hidden');

    grid.innerHTML = '';
    evidenceLogs.forEach(row => {
        const displayStartTime = formatTimeDisplay(row[12]);
        const displayEndTime = formatTimeDisplay(row[13]);
        const imageUrl = row[17];
        const category = row[7] || 'Other';

        let catBadgeClass = 'bg-gray-100 text-gray-700';
        if (category.toLowerCase() === 'troubleshooting') {
            catBadgeClass = 'bg-rose-50 text-rose-700 border border-rose-100';
        } else if (category.toLowerCase() === 'service') {
            catBadgeClass = 'bg-emerald-50 text-emerald-700 border border-emerald-100';
        }

        const card = document.createElement('div');
        card.className = "bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col group hover:shadow-md hover:border-gray-200 transition-all duration-300";
        card.innerHTML = `
        <!-- Image Header -->
        <div class="relative overflow-hidden bg-gray-50 h-48 border-b border-gray-50">
          <img src="${imageUrl}" alt="Evidence Photo" 
            class="w-full h-full object-cover cursor-pointer group-hover:scale-105 transition-transform duration-300"
            onclick="window.open('${imageUrl}', '_blank')" />
          <span class="absolute top-3 right-3 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${catBadgeClass}">
            ${category}
          </span>
        </div>

        <!-- Card Body -->
        <div class="p-4 flex-1 flex flex-col justify-between">
          <div>
            <!-- Date & Asset Tag -->
            <div class="flex justify-between items-center mb-2">
              <span class="text-[10px] text-gray-400 font-bold uppercase">${row[1]}</span>
              <span class="bg-blue-50 px-2 py-0.5 rounded-md text-[10px] font-bold text-brand-primary border border-blue-100">${row[2]}</span>
            </div>

            <!-- Title: User & Divisi -->
            <h4 class="text-sm font-bold text-gray-700 leading-tight mb-1 truncate" title="${row[3]}">${row[3]}</h4>
            <p class="text-[10px] text-gray-400 font-semibold uppercase tracking-wider mb-3">${row[4] || '-'}</p>
            
            <!-- Description -->
            <p class="text-xs text-gray-500 mb-4 line-clamp-2 italic" title="${row[8]}">"${row[8] || '-'}"</p>
          </div>

          <!-- Card Footer Metadata -->
          <div class="border-t border-gray-50 pt-3 flex flex-col gap-1.5">
            <div class="flex items-center gap-2 text-[11px] text-gray-500 font-medium">
              <i class="fa-solid fa-user-gear text-brand-primary w-4 text-center"></i>
              <span class="truncate">${row[11] || '-'}</span>
            </div>
            <div class="flex items-center gap-2 text-[11px] text-gray-500 font-medium">
              <i class="fa-solid fa-clock text-brand-primary w-4 text-center"></i>
              <span>${displayStartTime} - ${displayEndTime} (${row[15]} min)</span>
            </div>
          </div>
        </div>
      `;
        grid.appendChild(card);
    });
}

// =========================================================================
//  PART & ACCESSORIES INVENTORY LOGIC
// =========================================================================

window.allAccessories = [];

function openAccessoryModal() {
    const modal = document.getElementById('accessory-modal');
    if (modal) modal.classList.remove('hidden');
}

function closeAccessoryModal() {
    const modal = document.getElementById('accessory-modal');
    if (modal) {
        modal.classList.add('hidden');
        document.getElementById('accessory-form').reset();
    }
}

function fetchAccessoriesData() {
    const tbody = document.getElementById('accessories-table-body');
    if (tbody) {
        tbody.innerHTML = `<tr><td colspan="8" class="px-6 py-12 text-center text-gray-400"><i class="fa-solid fa-spinner animate-spin mr-2"></i> Memuat Data Aksesori...</td></tr>`;
    }

    google.script.run
        .withSuccessHandler((res) => {
            if (res.success) {
                window.allAccessories = res.accessories || [];
                renderAccessoriesTable();
            } else {
                console.error("Gagal mengambil data aksesori:", res.message);
                if (tbody) {
                    tbody.innerHTML = `<tr><td colspan="8" class="px-6 py-12 text-center text-rose-500 font-bold"><i class="fa-solid fa-circle-exclamation mr-2"></i> Gagal Memuat: ${res.message}</td></tr>`;
                }
            }
        })
        .withFailureHandler((err) => {
            console.error("Gagal backend mengambil aksesori:", err);
            if (tbody) {
                tbody.innerHTML = `<tr><td colspan="8" class="px-6 py-12 text-center text-rose-500 font-bold"><i class="fa-solid fa-circle-exclamation mr-2"></i> Gagal Sistem: ${err}</td></tr>`;
            }
        })
        .getAccessoriesData();
}

function renderAccessoriesTable() {
    const tbody = document.getElementById('accessories-table-body');
    const statsEl = document.getElementById('acc-stats-count');
    if (!tbody) return;

    if (statsEl) statsEl.textContent = window.allAccessories.length;

    if (window.allAccessories.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" class="px-6 py-12 text-center text-gray-400"><i class="fa-solid fa-folder-open mr-2"></i> Belum ada data aksesori terdaftar.</td></tr>`;
        return;
    }

    const searchVal = (document.getElementById('acc-search-input')?.value || '').toLowerCase().trim();
    const catVal = document.getElementById('acc-category-filter')?.value || 'ALL';

    let filtered = window.allAccessories;

    if (catVal !== 'ALL') {
        filtered = filtered.filter(item => (item.category || '').toLowerCase() === catVal.toLowerCase());
    }

    if (searchVal !== '') {
        filtered = filtered.filter(item => {
            const name = (item.name || '').toLowerCase();
            const sn = (item.sn || '').toLowerCase();
            return name.includes(searchVal) || sn.includes(searchVal);
        });
    }

    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" class="px-6 py-12 text-center text-gray-400"><i class="fa-solid fa-magnifying-glass mr-2"></i> Tidak ada aksesori cocok dengan filter.</td></tr>`;
        return;
    }

    tbody.innerHTML = '';
    filtered.forEach((item, index) => {
        let statusBadge = '';
        if (item.status === 'Available') {
            statusBadge = '<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-100">Available</span>';
        } else if (item.status === 'In Use') {
            statusBadge = '<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-100">In Use</span>';
        } else {
            statusBadge = '<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-100">Low Stock</span>';
        }

        const tr = document.createElement('tr');
        tr.className = "hover:bg-blue-50/20 transition-colors border-b border-gray-50 last:border-0";
        tr.innerHTML = `
        <td class="px-6 py-4 text-center font-bold text-gray-400 text-xs">${index + 1}</td>
        <td class="px-6 py-4 text-xs font-bold text-gray-700">${item.name}</td>
        <td class="px-6 py-4 text-xs font-mono text-gray-500">${item.sn || '—'}</td>
        <td class="px-6 py-4 text-xs text-gray-500">${item.category}</td>
        <td class="px-6 py-4 text-center text-xs font-black text-brand-primary">${item.stock}</td>
        <td class="px-6 py-4 text-xs font-bold text-gray-600">${item.assignedTo || '—'}</td>
        <td class="px-6 py-4 text-center">${statusBadge}</td>
        <td class="px-6 py-4 text-xs text-gray-400 italic">${item.notes || '—'}</td>
      `;
        tbody.appendChild(tr);
    });
}

function handleAccessorySubmit(event) {
    event.preventDefault();

    const formData = {
        name: document.getElementById('acc-name').value,
        sn: document.getElementById('acc-sn').value,
        category: document.getElementById('acc-category').value,
        stock: document.getElementById('acc-stock').value,
        status: document.getElementById('acc-status').value,
        assignedTo: document.getElementById('acc-assigned').value || '-',
        notes: document.getElementById('acc-notes').value
    };

    Swal.fire({
        title: 'Menyimpan Aksesori...',
        allowOutsideClick: false,
        didOpen: () => { Swal.showLoading(); }
    });

    google.script.run
        .withSuccessHandler((res) => {
            if (res === true) {
                Swal.fire({
                    title: 'Berhasil!',
                    text: 'Aksesori berhasil disimpan ke inventaris.',
                    icon: 'success',
                    confirmButtonColor: '#004684'
                });
                closeAccessoryModal();
                fetchAccessoriesData();
            } else {
                Swal.fire({
                    title: 'Gagal Menyimpan!',
                    text: res,
                    icon: 'error',
                    confirmButtonColor: '#ef4444'
                });
            }
        })
        .withFailureHandler((err) => {
            Swal.fire({
                title: 'Gagal Sistem!',
                text: err.toString(),
                icon: 'error',
                confirmButtonColor: '#ef4444'
            });
        })
        .addAccessory(formData);
}

// =========================================================================
//  ASSET LOANS LOGGING LOGIC (PEMINJAMAN ASET)
// =========================================================================

window.allLoans = [];

function openLoanModal() {
    const modal = document.getElementById('loan-modal');
    if (modal) {
        modal.classList.remove('hidden');
        // Set tanggal default ke hari ini
        document.getElementById('loan-date').value = new Date().toISOString().substring(0, 10);
    }
}

function closeLoanModal() {
    const modal = document.getElementById('loan-modal');
    if (modal) {
        modal.classList.add('hidden');
        document.getElementById('loan-form').reset();
    }
}

function fetchLoansData() {
    const tbody = document.getElementById('loans-table-body');
    if (tbody) {
        tbody.innerHTML = `<tr><td colspan="10" class="px-6 py-12 text-center text-gray-400"><i class="fa-solid fa-spinner animate-spin mr-2"></i> Memuat Log Peminjaman Aset...</td></tr>`;
    }

    google.script.run
        .withSuccessHandler((res) => {
            if (res.success) {
                window.allLoans = res.loans || [];
                renderLoansTable();
            } else {
                console.error("Gagal mengambil data peminjaman:", res.message);
                if (tbody) {
                    tbody.innerHTML = `<tr><td colspan="10" class="px-6 py-12 text-center text-rose-500 font-bold"><i class="fa-solid fa-circle-exclamation mr-2"></i> Gagal Memuat: ${res.message}</td></tr>`;
                }
            }
        })
        .withFailureHandler((err) => {
            console.error("Gagal backend mengambil peminjaman:", err);
            if (tbody) {
                tbody.innerHTML = `<tr><td colspan="10" class="px-6 py-12 text-center text-rose-500 font-bold"><i class="fa-solid fa-circle-exclamation mr-2"></i> Gagal Sistem: ${err}</td></tr>`;
            }
        })
        .getLoansData();
}

function renderLoansTable() {
    const tbody = document.getElementById('loans-table-body');
    const activeStatsEl = document.getElementById('loan-stats-active');
    const returnedStatsEl = document.getElementById('loan-stats-returned');
    if (!tbody) return;

    // Hitung statistik
    const activeCount = window.allLoans.filter(l => l.status === 'Dipinjam').length;
    const returnedCount = window.allLoans.filter(l => l.status === 'Kembali').length;

    if (activeStatsEl) activeStatsEl.textContent = activeCount;
    if (returnedStatsEl) returnedStatsEl.textContent = returnedCount;

    if (window.allLoans.length === 0) {
        tbody.innerHTML = `<tr><td colspan="10" class="px-6 py-12 text-center text-gray-400"><i class="fa-solid fa-folder-open mr-2"></i> Belum ada transaksi peminjaman terdaftar.</td></tr>`;
        return;
    }

    const searchVal = (document.getElementById('loan-search-input')?.value || '').toLowerCase().trim();
    const statusVal = document.getElementById('loan-status-filter')?.value || 'ALL';

    let filtered = window.allLoans;

    if (statusVal !== 'ALL') {
        filtered = filtered.filter(item => (item.status || '').toLowerCase() === statusVal.toLowerCase());
    }

    if (searchVal !== '') {
        filtered = filtered.filter(item => {
            const borrower = (item.borrowerName || '').toLowerCase();
            const asset = (item.assetName || '').toLowerCase();
            const dept = (item.department || '').toLowerCase();
            return borrower.includes(searchVal) || asset.includes(searchVal) || dept.includes(searchVal);
        });
    }

    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="10" class="px-6 py-12 text-center text-gray-400"><i class="fa-solid fa-magnifying-glass mr-2"></i> Tidak ada peminjaman cocok dengan filter.</td></tr>`;
        return;
    }

    tbody.innerHTML = '';
    filtered.forEach((item, index) => {
        let statusBadge = '';
        let actionHtml = '—';

        if (item.status === 'Dipinjam') {
            statusBadge = '<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-100">Dipinjam</span>';
            actionHtml = `
          <button onclick="confirmAssetReturn('${item.no}')" 
            class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-100 text-emerald-700 hover:bg-emerald-600 hover:text-white hover:border-emerald-600 transition-all duration-200 text-[11px] font-extrabold uppercase">
            <i class="fa-solid fa-circle-check"></i> Kembali
          </button>
        `;
        } else {
            statusBadge = '<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-100">Kembali</span>';
            actionHtml = '<span class="text-emerald-500 font-bold text-xs"><i class="fa-solid fa-circle-check mr-1"></i> Selesai</span>';
        }

        const tr = document.createElement('tr');
        tr.className = "hover:bg-blue-50/20 transition-colors border-b border-gray-50 last:border-0";
        tr.innerHTML = `
        <td class="px-6 py-4 text-center font-bold text-gray-400 text-xs">${index + 1}</td>
        <td class="px-6 py-4 text-xs font-bold text-gray-700">${item.loanDate}</td>
        <td class="px-6 py-4 text-xs font-medium text-brand-primary">
          <span class="bg-blue-50 px-2 py-1 rounded-lg border border-blue-100">${item.assetName}</span>
        </td>
        <td class="px-6 py-4 text-xs font-bold text-gray-700">${item.borrowerName}</td>
        <td class="px-6 py-4 text-xs text-gray-500">${item.department}</td>
        <td class="px-6 py-4 text-xs text-amber-600 font-semibold">${item.estReturnDate}</td>
        <td class="px-6 py-4 text-xs text-emerald-600 font-semibold">${item.actReturnDate || '—'}</td>
        <td class="px-6 py-4 text-center">${statusBadge}</td>
        <td class="px-6 py-4 text-xs text-gray-500 font-medium">${item.approvedBy}</td>
        <td class="px-6 py-4 text-center">${actionHtml}</td>
      `;
        tbody.appendChild(tr);
    });
}

function handleLoanSubmit(event) {
    event.preventDefault();

    const formData = {
        loanDate: document.getElementById('loan-date').value,
        estReturnDate: document.getElementById('loan-est-date').value,
        assetName: document.getElementById('loan-asset-name').value,
        borrowerName: document.getElementById('loan-borrower').value,
        department: document.getElementById('loan-dept').value,
        approvedBy: document.getElementById('loan-approved').value || 'IT Admin',
        notes: document.getElementById('loan-notes').value
    };

    Swal.fire({
        title: 'Mendaftarkan Peminjaman...',
        allowOutsideClick: false,
        didOpen: () => { Swal.showLoading(); }
    });

    google.script.run
        .withSuccessHandler((res) => {
            if (res === true) {
                Swal.fire({
                    title: 'Peminjaman Terdaftar!',
                    text: 'Aset berhasil didelegasikan dan status diubah ke Dipinjam.',
                    icon: 'success',
                    confirmButtonColor: '#004684'
                });
                closeLoanModal();
                fetchLoansData();
            } else {
                Swal.fire({
                    title: 'Gagal Mendaftar!',
                    text: res,
                    icon: 'error',
                    confirmButtonColor: '#ef4444'
                });
            }
        })
        .withFailureHandler((err) => {
            Swal.fire({
                title: 'Gagal Sistem!',
                text: err.toString(),
                icon: 'error',
                confirmButtonColor: '#ef4444'
            });
        })
        .addAssetLoan(formData);
}

function confirmAssetReturn(loanNo) {
    Swal.fire({
        title: 'Konfirmasi Pengembalian?',
        text: "Aset IT akan ditandai kembali dan tanggal pengembalian aktual dicatat.",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#10b981', // emerald-500
        cancelButtonColor: '#6b7280',
        confirmButtonText: 'Ya, Kembalikan',
        cancelButtonText: 'Batal'
    }).then((result) => {
        if (result.isConfirmed) {
            Swal.fire({
                title: 'Memproses Pengembalian...',
                allowOutsideClick: false,
                didOpen: () => { Swal.showLoading(); }
            });

            google.script.run
                .withSuccessHandler((res) => {
                    if (res === true) {
                        Swal.fire({
                            title: 'Pengembalian Selesai!',
                            text: 'Aset telah dikembalikan secara aman.',
                            icon: 'success',
                            confirmButtonColor: '#10b981'
                        });
                        fetchLoansData();
                    } else {
                        Swal.fire({
                            title: 'Gagal Memproses!',
                            text: res,
                            icon: 'error',
                            confirmButtonColor: '#ef4444'
                        });
                    }
                })
                .withFailureHandler((err) => {
                    Swal.fire({
                        title: 'Gagal Sistem!',
                        text: err.toString(),
                        icon: 'error',
                        confirmButtonColor: '#ef4444'
                    });
                })
                .returnAssetLoan(loanNo);
        }
    });
}// Sidebar & Navigation Functions
function handleLogout() {
    Swal.fire({
        title: 'Logout',
        text: 'Anda akan keluar dari sistem.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Ya, Logout',
        cancelButtonText: 'Batal'
    }).then((result) => {
        if (result.isConfirmed) {
            window.location.href = 'https://www.google.com';
        }
    });
}

function toggleDropdown(id, chevronId) {
    const dropdown = document.getElementById(id);
    const chevron = document.getElementById(chevronId);
    if (dropdown && chevron) {
        if (dropdown.classList.contains('max-h-0')) {
            dropdown.classList.remove('max-h-0', 'opacity-0');
            dropdown.classList.add('max-h-96', 'opacity-100');
            chevron.style.transform = 'rotate(180deg)';
        } else {
            dropdown.classList.add('max-h-0', 'opacity-0');
            dropdown.classList.remove('max-h-96', 'opacity-100');
            chevron.style.transform = 'rotate(0deg)';
        }
    }
}

function navigateSubMenu(sectionId) {
    const allSections = [
        'dashboard-content', 'inventory-content', 'logs-section', 
        'pa-section', 'maintenance-schedule', 'evidence-section', 
        'part-accessories-section', 'loan-section', 'settings-content'
    ];
    
    allSections.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.add('hidden');
    });

    document.querySelectorAll('.sidebar-menu').forEach(el => {
        el.classList.remove('sidebar-menu-active');
        el.classList.add('sidebar-menu-default');
    });
    document.querySelectorAll('.sidebar-submenu-item').forEach(el => {
        el.classList.remove('submenu-active');
    });

    if (sectionId === 'inventory-list') {
        document.getElementById('inventory-content').classList.remove('hidden');
    } else if (sectionId === 'part-accessories') {
        document.getElementById('part-accessories-section').classList.remove('hidden');
        if (typeof fetchAccessoriesData === 'function') fetchAccessoriesData();
    } else if (sectionId === 'asset-loans') {
        document.getElementById('loan-section').classList.remove('hidden');
        if (typeof fetchLoansData === 'function') fetchLoansData();
    } else {
        const sec = document.getElementById(sectionId);
        if (sec) sec.classList.remove('hidden');
    }
}
