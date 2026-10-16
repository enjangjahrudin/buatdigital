// Admin State & Data
let adminToken = localStorage.getItem('bd_admin_token');
let overviewData = null;
let allProducts = [];
let allSales = [];
let revenueChart = null;
let modelChart = null;

function getAuthHeaders() {
  return {
    'Content-Type': 'application/json',
    'x-admin-token': adminToken || ''
  };
}

// Redirect if not logged in
if (!adminToken) {
  window.location.href = '/login';
}

function adminLogout() {
  localStorage.removeItem('bd_admin_token');
  window.location.href = '/login';
}

function formatRupiah(num) {
  if (!num || num === 0) return 'Rp 0';
  return 'Rp ' + Number(num).toLocaleString('id-ID');
}

function getPricingLabel(type) {
  switch (type) {
    case 'TOKEN': return '<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-100 text-cyan-800">Paket Token</span>';
    case 'ONETIME': return '<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">Sekali Bayar</span>';
    case 'MONTHLY': return '<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800">Langganan Bulanan</span>';
    case 'YEARLY': return '<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">Langganan Tahunan</span>';
    case 'FREE': return '<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-teal-100 text-teal-800">Gratis</span>';
    default: return '<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-800">Custom</span>';
  }
}

// Sidebar Toggle Functionality (Desktop Collapse & Mobile Offcanvas)
function toggleSidebar() {
  const isMobile = window.innerWidth < 1024;
  if (isMobile) {
    toggleMobileSidebar();
  } else {
    document.body.classList.toggle('sidebar-collapsed');
    const isCollapsed = document.body.classList.contains('sidebar-collapsed');
    localStorage.setItem('bd_sidebar_collapsed', isCollapsed ? 'true' : 'false');
  }
}

function toggleMobileSidebar() {
  const sidebar = document.getElementById('sidebar');
  const backdrop = document.getElementById('sidebarBackdrop');
  if (!sidebar) return;

  const isHidden = sidebar.classList.contains('-translate-x-full');
  if (isHidden) {
    sidebar.classList.remove('-translate-x-full');
    if (backdrop) backdrop.classList.remove('hidden');
  } else {
    sidebar.classList.add('-translate-x-full');
    if (backdrop) backdrop.classList.add('hidden');
  }
}

// Restore sidebar preference
if (localStorage.getItem('bd_sidebar_collapsed') === 'true' && window.innerWidth >= 1024) {
  document.body.classList.add('sidebar-collapsed');
}

// Initial mobile sidebar setup
if (window.innerWidth < 1024) {
  const sidebar = document.getElementById('sidebar');
  if (sidebar) sidebar.classList.add('-translate-x-full');
}

// Switch Tabs
function switchAdminTab(tab) {
  const tabs = ['overview', 'products', 'sales', 'settings'];
  const titles = {
    overview: 'Laporan & Statistik Keuangan',
    products: 'Manajemen Katalog Produk',
    sales: 'Data Penjualan & Pembeli',
    settings: 'Pengaturan & Integrasi Midtrans'
  };

  const topBarTitle = document.getElementById('topBarTitle');
  if (topBarTitle && titles[tab]) {
    topBarTitle.innerHTML = `<span class="text-slate-400 font-normal hidden sm:inline">Admin /</span> ${titles[tab]}`;
  }

  tabs.forEach(t => {
    const el = document.getElementById(`tab${t.charAt(0).toUpperCase() + t.slice(1)}`);
    const btn = document.getElementById(`tab${t.charAt(0).toUpperCase() + t.slice(1)}Btn`);
    if (t === tab) {
      if (el) el.classList.remove('hidden');
      if (btn) {
        btn.className = 'sidebar-nav-btn w-full flex items-center justify-between px-3.5 py-3 rounded-xl transition-all bg-blue-600 text-white shadow-md shadow-blue-900/30';
        const icon = btn.querySelector('i');
        if (icon) icon.className = icon.className.replace('text-slate-400', 'text-blue-200');
      }
    } else {
      if (el) el.classList.add('hidden');
      if (btn) {
        btn.className = 'sidebar-nav-btn w-full flex items-center justify-between px-3.5 py-3 rounded-xl transition-all text-slate-400 hover:text-white hover:bg-slate-900';
        const icon = btn.querySelector('i');
        if (icon) icon.className = icon.className.replace('text-blue-200', 'text-slate-400');
      }
    }
  });

  // Close mobile sidebar on navigation
  if (window.innerWidth < 1024) {
    const sidebar = document.getElementById('sidebar');
    const backdrop = document.getElementById('sidebarBackdrop');
    if (sidebar) sidebar.classList.add('-translate-x-full');
    if (backdrop) backdrop.classList.add('hidden');
  }

  if (tab === 'overview') loadOverview();
  if (tab === 'products') loadProducts();
  if (tab === 'sales') loadSales();
  if (tab === 'settings') loadSettings();
}

// ----------------------------------------------------
// TAB 1: OVERVIEW & ANALYTICS
// ----------------------------------------------------
async function loadOverview() {
  try {
    const res = await fetch('/api/admin/overview', { headers: getAuthHeaders() });
    if (res.status === 403) return adminLogout();
    const data = await res.json();
    overviewData = data;

    const { analytics, totalProductsCount, publishedProductsCount } = data;

    document.getElementById('statTotalRevenue').innerText = formatRupiah(analytics.totalRevenue);
    document.getElementById('statTotalOrders').innerText = analytics.totalOrders;
    document.getElementById('statActiveProducts').innerText = `${publishedProductsCount} / ${totalProductsCount}`;
    document.getElementById('statAvgOrder').innerText = formatRupiah(analytics.averageOrderValue);

    document.getElementById('tabProductCount').innerText = totalProductsCount;
    document.getElementById('tabSalesCount').innerText = analytics.totalOrders;

    renderMonthlyChart(analytics.monthlyChart);
    renderPricingModelChart(analytics.pricingTypeBreakdown);
    renderRecentSales(analytics.recentSales || []);

  } catch (err) {
    console.error('Error loading overview:', err);
  }
}

function renderMonthlyChart(chartData) {
  const ctx = document.getElementById('monthlyRevenueChart');
  if (!ctx) return;

  if (revenueChart) revenueChart.destroy();

  revenueChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: chartData.labels,
      datasets: [{
        label: 'Omset Penjualan (Rp)',
        data: chartData.data,
        borderColor: '#2563eb',
        backgroundColor: 'rgba(37, 99, 235, 0.08)',
        borderWidth: 3,
        fill: true,
        tension: 0.35,
        pointBackgroundColor: '#2563eb',
        pointRadius: 4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx) => ' ' + formatRupiah(ctx.raw)
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: (v) => 'Rp ' + (v >= 1000000 ? (v / 1000000).toFixed(1) + 'M' : (v / 1000) + 'k'),
            font: { size: 10 }
          },
          grid: { color: '#f1f5f9' }
        },
        x: {
          ticks: { font: { size: 10 } },
          grid: { display: false }
        }
      }
    }
  });
}

function renderPricingModelChart(breakdown) {
  const ctx = document.getElementById('pricingModelChart');
  if (!ctx) return;

  if (modelChart) modelChart.destroy();

  const labels = ['Sekali Bayar', 'Langganan Bulanan', 'Langganan Tahunan', 'Lainnya'];
  const values = [
    breakdown.ONETIME ? breakdown.ONETIME.revenue : 0,
    breakdown.MONTHLY ? breakdown.MONTHLY.revenue : 0,
    breakdown.YEARLY ? breakdown.YEARLY.revenue : 0,
    breakdown.OTHER ? breakdown.OTHER.revenue : 0
  ];

  modelChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{
        data: values,
        backgroundColor: ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6'],
        borderWidth: 2,
        borderColor: '#ffffff'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false }
      },
      cutout: '70%'
    }
  });

  const legend = document.getElementById('pricingModelLegend');
  if (legend) {
    legend.innerHTML = `
      <div class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> Sekali Bayar: <strong>${formatRupiah(values[0])}</strong></div>
      <div class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-full bg-blue-500"></span> Bulanan: <strong>${formatRupiah(values[1])}</strong></div>
      <div class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-full bg-amber-500"></span> Tahunan: <strong>${formatRupiah(values[2])}</strong></div>
      <div class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-full bg-purple-500"></span> Lainnya: <strong>${formatRupiah(values[3])}</strong></div>
    `;
  }
}

function renderRecentSales(sales) {
  const tbody = document.getElementById('overviewRecentSalesBody');
  if (!tbody) return;

  if (sales.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" class="text-center py-4 text-slate-400">Belum ada transaksi penjualan.</td></tr>`;
    return;
  }

  tbody.innerHTML = sales.slice(0, 5).map(s => `
    <tr class="hover:bg-slate-50">
      <td class="px-4 py-2.5 font-medium text-slate-900">${s.productName}</td>
      <td class="px-4 py-2.5">${s.customerName}</td>
      <td class="px-3 py-2.5 text-center">${getPricingLabel(s.pricingType)}</td>
      <td class="px-4 py-2.5 text-right font-bold text-slate-800">${formatRupiah(s.amount)}</td>
      <td class="px-4 py-2.5 text-slate-400 text-[11px]">${new Date(s.createdAt).toLocaleDateString('id-ID')}</td>
    </tr>
  `).join('');
}

// ----------------------------------------------------
// TAB 2: PRODUCT CATALOG CRUD
// ----------------------------------------------------
async function loadProducts() {
  try {
    const res = await fetch(`/api/admin/products?t=${Date.now()}`, { headers: getAuthHeaders() });
    if (res.status === 403) return adminLogout();
    const data = await res.json();
    allProducts = data.products || [];

    document.getElementById('tabProductCount').innerText = allProducts.length;
    renderProductsList();
  } catch (err) {
    console.error('Error loading products:', err);
  }
}

function renderProductsList() {
  const container = document.getElementById('adminProductsContainer');
  if (!container) return;

  if (allProducts.length === 0) {
    container.innerHTML = `<div class="col-span-full py-12 text-center text-slate-400">Belum ada produk. Klik "Tambah Produk Baru".</div>`;
    return;
  }

  container.innerHTML = allProducts.map(p => {
    const finalPrice = p.discountPrice || p.price;
    const isDiscount = p.discountPrice && p.discountPrice < p.price;

    return `
      <div class="bg-white rounded-2xl shadow-sm border ${p.isPublished ? 'border-slate-200' : 'border-dashed border-amber-300 bg-amber-50/20'} p-5 space-y-4 flex flex-col justify-between">
        <div class="space-y-3">
          <div class="flex items-center justify-between gap-2">
            <div class="flex items-center gap-2">
              ${getPricingLabel(p.pricingType)}
              <span class="text-[10px] uppercase font-bold text-slate-400">${p.category || 'Aplikasi Web'}</span>
            </div>
            <span class="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${p.isPublished ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-100 text-amber-800'}">
              ${p.isPublished ? '<span class="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1"></span> Live Web' : 'Draft / Disembunyikan'}
            </span>
          </div>

          <div class="flex items-start space-x-3">
            <div class="w-10 h-10 rounded-xl bg-gradient-to-br ${p.thumbnailColor || 'from-blue-600 to-indigo-900'} flex items-center justify-center text-white text-lg flex-shrink-0">
              <i class="fa-solid ${p.icon || 'fa-cubes'}"></i>
            </div>
            <div>
              <h4 class="text-sm font-bold text-slate-900">${p.name}</h4>
              <p class="text-xs text-slate-500 line-clamp-2 mt-0.5">${p.shortDesc || ''}</p>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-slate-100">
            <div>
              <span class="text-[10px] text-slate-400 block">Harga:</span>
              <span class="font-bold text-slate-900">${formatRupiah(finalPrice)}</span>
              ${isDiscount ? `<span class="text-[10px] text-slate-400 line-through block">${formatRupiah(p.price)}</span>` : ''}
            </div>
            <div>
              <span class="text-[10px] text-slate-400 block">Total Terjual:</span>
              <span class="font-bold text-blue-600">${p.totalSalesCount || 0}x (${formatRupiah(p.totalRevenue || 0)})</span>
            </div>
          </div>
        </div>

        <div class="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
          <div class="flex items-center gap-1.5">
            ${p.demoUrl && p.demoUrl !== '#' ? `
              <a href="${p.demoUrl}" target="_blank" title="Coba Demo" class="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs">
                <i class="fa-solid fa-arrow-up-right-from-square"></i>
              </a>
            ` : ''}
            <button onclick="togglePublishProduct('${p.id}', ${!p.isPublished})" title="${p.isPublished ? 'Sembunyikan dari Web' : 'Publikasikan'}" class="p-1.5 rounded-lg ${p.isPublished ? 'bg-slate-100 hover:bg-amber-100 text-slate-600 hover:text-amber-700' : 'bg-emerald-100 text-emerald-800'} text-xs">
              <i class="fa-solid ${p.isPublished ? 'fa-eye-slash' : 'fa-eye'}"></i>
            </button>
          </div>

          <div class="flex items-center gap-1.5">
            <button onclick="editProductModal('${p.id}')" class="px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold flex items-center gap-1">
              <i class="fa-solid fa-pen-to-square"></i> Edit
            </button>
            <button onclick="deleteProduct('${p.id}', '${p.name}')" class="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs" title="Hapus Produk">
              <i class="fa-solid fa-trash"></i>
            </button>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function openProductFormModal(isEdit = false) {
  const modal = document.getElementById('productFormModal');
  const heading = document.getElementById('productModalHeading');
  modal.classList.remove('hidden');

  if (!isEdit) {
    heading.innerHTML = '<i class="fa-solid fa-cube text-blue-600"></i> Tambah Produk Baru';
    document.getElementById('editProductId').value = '';
    document.getElementById('productForm').reset();
    document.getElementById('prodCheckoutType').value = 'BUATDIGITAL';
    toggleCheckoutFields('BUATDIGITAL');
    document.getElementById('prodShowPrice').value = 'true';
  }
}

function closeProductFormModal() {
  document.getElementById('productFormModal').classList.add('hidden');
}

function toggleCheckoutFields(val) {
  const el = document.getElementById('externalCheckoutFields');
  if (!el) return;
  if (val === 'EXTERNAL') {
    el.classList.remove('hidden');
  } else {
    el.classList.add('hidden');
  }
}

function editProductModal(id) {
  const p = allProducts.find(item => item.id === id);
  if (!p) return;

  openProductFormModal(true);
  document.getElementById('productModalHeading').innerHTML = '<i class="fa-solid fa-pen-to-square text-blue-600"></i> Edit Produk';

  document.getElementById('editProductId').value = p.id;
  document.getElementById('prodName').value = p.name || '';
  document.getElementById('prodCategory').value = p.category || '';
  document.getElementById('prodPricingType').value = p.pricingType || 'ONETIME';
  document.getElementById('prodPrice').value = p.price || '';
  document.getElementById('prodDiscountPrice').value = p.discountPrice || '';
  document.getElementById('prodBadge').value = p.badge || '';
  document.getElementById('prodIcon').value = p.icon || '';
  document.getElementById('prodShortDesc').value = p.shortDesc || '';
  document.getElementById('prodFullDesc').value = p.fullDesc || '';
  document.getElementById('prodFeatures').value = Array.isArray(p.features) ? p.features.join('\n') : '';
  document.getElementById('prodDemoUrl').value = p.demoUrl || '';
  
  // Checkout Type & Show Price
  const checkoutType = p.checkoutType || (p.externalCheckoutUrl ? 'EXTERNAL' : 'BUATDIGITAL');
  document.getElementById('prodCheckoutType').value = checkoutType;
  toggleCheckoutFields(checkoutType);

  document.getElementById('prodExternalCheckoutUrl').value = p.externalCheckoutUrl || '';
  document.getElementById('prodExternalCheckoutLabel').value = p.externalCheckoutLabel || '';
  document.getElementById('prodShowPrice').value = p.showPrice !== false ? 'true' : 'false';
  document.getElementById('prodIsPublished').value = p.isPublished ? 'true' : 'false';
}

async function handleSaveProduct(e) {
  e.preventDefault();
  const id = document.getElementById('editProductId').value;

  const checkoutType = document.getElementById('prodCheckoutType').value;
  const externalUrl = document.getElementById('prodExternalCheckoutUrl').value.trim();
  const externalLabel = document.getElementById('prodExternalCheckoutLabel').value.trim();

  const payload = {
    name: document.getElementById('prodName').value.trim(),
    category: document.getElementById('prodCategory').value.trim(),
    pricingType: document.getElementById('prodPricingType').value,
    price: Number(document.getElementById('prodPrice').value) || 0,
    discountPrice: Number(document.getElementById('prodDiscountPrice').value) || 0,
    badge: document.getElementById('prodBadge').value.trim(),
    icon: document.getElementById('prodIcon').value.trim(),
    shortDesc: document.getElementById('prodShortDesc').value.trim(),
    fullDesc: document.getElementById('prodFullDesc').value.trim(),
    features: document.getElementById('prodFeatures').value.split('\n').filter(Boolean),
    demoUrl: document.getElementById('prodDemoUrl').value.trim(),
    checkoutType: checkoutType,
    externalCheckoutUrl: checkoutType === 'EXTERNAL' ? externalUrl : '',
    externalCheckoutLabel: checkoutType === 'EXTERNAL' ? externalLabel : '',
    showPrice: document.getElementById('prodShowPrice').value === 'true',
    isPublished: document.getElementById('prodIsPublished').value === 'true'
  };

  try {
    const url = id ? `/api/admin/products/${id}` : '/api/admin/products';
    const method = id ? 'PUT' : 'POST';

    const res = await fetch(url, {
      method,
      headers: getAuthHeaders(),
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Gagal menyimpan produk');

    closeProductFormModal();
    alert('Produk berhasil disimpan!');
    loadProducts();
  } catch (err) {
    alert('Error: ' + err.message);
  }
}

async function togglePublishProduct(id, status) {
  try {
    const res = await fetch(`/api/admin/products/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ isPublished: status })
    });
    if (!res.ok) throw new Error('Gagal update status');
    loadProducts();
  } catch (err) {
    alert('Error: ' + err.message);
  }
}

async function deleteProduct(id, name) {
  if (confirm(`Yakin ingin menghapus produk "${name}"?`)) {
    try {
      const res = await fetch(`/api/admin/products/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      if (!res.ok) throw new Error('Gagal menghapus produk');
      loadProducts();
    } catch (err) {
      alert('Error: ' + err.message);
    }
  }
}

// ----------------------------------------------------
// TAB 3: SALES & CUSTOMER TRACKER
// ----------------------------------------------------
async function loadSales() {
  try {
    const res = await fetch('/api/admin/sales', { headers: getAuthHeaders() });
    if (res.status === 403) return adminLogout();
    const data = await res.json();
    allSales = data.sales || [];

    document.getElementById('tabSalesCount').innerText = allSales.length;
    renderSalesTable();
  } catch (err) {
    console.error('Error loading sales:', err);
  }
}

function renderSalesTable() {
  const tbody = document.getElementById('adminSalesTableBody');
  const search = (document.getElementById('searchSalesInput').value || '').toLowerCase().trim();

  let filtered = allSales;
  if (search) {
    filtered = filtered.filter(s => 
      s.customerName.toLowerCase().includes(search) ||
      s.productName.toLowerCase().includes(search) ||
      (s.customerPhone && s.customerPhone.includes(search)) ||
      (s.customerEmail && s.customerEmail.toLowerCase().includes(search))
    );
  }

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="text-center py-8 text-slate-400">Tidak ada data transaksi.</td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map(s => `
    <tr class="hover:bg-slate-50 transition-colors">
      <td class="px-4 py-3 font-semibold text-slate-900">${s.productName}</td>
      <td class="px-4 py-3">
        <p class="font-medium text-slate-800">${s.customerName}</p>
        <p class="text-[10px] text-slate-400">${s.customerPhone || ''} ${s.customerEmail && s.customerEmail !== '-' ? '&bull; ' + s.customerEmail : ''}</p>
      </td>
      <td class="px-3 py-3 text-center">${getPricingLabel(s.pricingType)}</td>
      <td class="px-4 py-3 text-right font-black text-slate-900">${formatRupiah(s.amount)}</td>
      <td class="px-3 py-3 text-center text-xs text-slate-600">${s.paymentMethod || 'Transfer'}</td>
      <td class="px-4 py-3 text-xs text-slate-500">${new Date(s.createdAt).toLocaleDateString('id-ID')}</td>
      <td class="px-3 py-3 text-center">
        <button onclick="deleteSale('${s.id}')" title="Hapus Data" class="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs">
          <i class="fa-solid fa-trash"></i>
        </button>
      </td>
    </tr>
  `).join('');
}

function openSalesFormModal() {
  const modal = document.getElementById('salesFormModal');
  const select = document.getElementById('saleProductId');

  // Populate products dropdown
  select.innerHTML = allProducts.map(p => `
    <option value="${p.id}" data-name="${p.name}" data-price="${p.discountPrice || p.price}" data-pricing="${p.pricingType}">
      ${p.name} - ${formatRupiah(p.discountPrice || p.price)}
    </option>
  `).join('');

  // Auto set amount on product select
  select.onchange = () => {
    const opt = select.options[select.selectedIndex];
    if (opt) {
      document.getElementById('saleAmount').value = opt.getAttribute('data-price') || 0;
    }
  };
  if (select.options.length) {
    select.onchange();
  }

  modal.classList.remove('hidden');
}

function closeSalesFormModal() {
  document.getElementById('salesFormModal').classList.add('hidden');
}

async function handleSaveSale(e) {
  e.preventDefault();
  const select = document.getElementById('saleProductId');
  const opt = select.options[select.selectedIndex];

  const payload = {
    productId: select.value,
    productName: opt ? opt.getAttribute('data-name') : 'Produk Digital',
    pricingType: opt ? opt.getAttribute('data-pricing') : 'ONETIME',
    customerName: document.getElementById('saleCustomerName').value.trim(),
    customerEmail: document.getElementById('saleCustomerEmail').value.trim() || '-',
    customerPhone: document.getElementById('saleCustomerPhone').value.trim() || '-',
    amount: Number(document.getElementById('saleAmount').value) || 0,
    paymentMethod: document.getElementById('salePaymentMethod').value,
    status: 'PAID'
  };

  try {
    const res = await fetch('/api/admin/sales', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Gagal menyimpan transaksi');

    closeSalesFormModal();
    alert('Transaksi penjualan berhasil dicatat!');
    loadSales();
    loadOverview();
  } catch (err) {
    alert('Error: ' + err.message);
  }
}

async function deleteSale(id) {
  if (confirm('Hapus riwayat transaksi ini?')) {
    try {
      const res = await fetch(`/api/admin/sales/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      if (!res.ok) throw new Error('Gagal menghapus');
      loadSales();
      loadOverview();
    } catch (err) {
      alert('Error: ' + err.message);
    }
  }
}

// ----------------------------------------------------
// TAB 4: SETTINGS & SECURITY
// ----------------------------------------------------
async function loadSettings() {
  try {
    const res = await fetch('/api/admin/settings', { headers: getAuthHeaders() });
    if (res.status === 403) return adminLogout();
    const data = await res.json();
    const s = data.settings || {};

    // Midtrans Form Fields
    document.getElementById('settingMidtransIsProd').value = String(Boolean(s.midtransIsProduction));
    document.getElementById('settingPaymentMode').value = s.paymentMode || 'MIDTRANS_AND_WA';
    document.getElementById('settingMidtransServerKey').value = s.midtransServerKey || '';
    document.getElementById('settingMidtransClientKey').value = s.midtransClientKey || '';

    // WhatsApp Fields
    document.getElementById('settingWaNumber').value = s.whatsappNumber || '';
    document.getElementById('settingWaTemplate').value = s.whatsappOrderTemplate || '';
    document.getElementById('settingContactEmail').value = s.contactEmail || '';
  } catch (err) {
    console.error('Error loading settings:', err);
  }
}

async function handleSaveSettings(e) {
  e.preventDefault();
  const payload = {
    // Midtrans Settings
    midtransIsProduction: document.getElementById('settingMidtransIsProd').value === 'true',
    paymentMode: document.getElementById('settingPaymentMode').value,
    midtransServerKey: document.getElementById('settingMidtransServerKey').value.trim(),
    midtransClientKey: document.getElementById('settingMidtransClientKey').value.trim(),
    enableMidtrans: true,

    // WhatsApp & Contact Settings
    whatsappNumber: document.getElementById('settingWaNumber').value.trim(),
    whatsappOrderTemplate: document.getElementById('settingWaTemplate').value.trim(),
    contactEmail: document.getElementById('settingContactEmail').value.trim()
  };

  try {
    const res = await fetch('/api/admin/settings', {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error('Gagal menyimpan pengaturan');
    alert('Pengaturan situs & Midtrans berhasil disimpan!');
    loadSettings();
  } catch (err) {
    alert('Error: ' + err.message);
  }
}

async function handleChangePin(e) {
  e.preventDefault();
  const oldPin = document.getElementById('oldPinInput').value;
  const newPin = document.getElementById('newPinInput').value;

  try {
    const res = await fetch('/api/admin/change-pin', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ oldPin, newPin })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Gagal mengubah PIN');

    alert('PIN Admin berhasil diperbarui!');
    document.getElementById('changePinForm').reset();
  } catch (err) {
    alert('Error: ' + err.message);
  }
}

// Initialize
window.addEventListener('DOMContentLoaded', () => {
  loadOverview();
  loadProducts();
});
