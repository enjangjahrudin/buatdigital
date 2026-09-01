let allProducts = [];
let activeFilter = 'ALL';
let currentSelectedProduct = null;
let siteSettings = {
  whatsappNumber: '6281234567890',
  whatsappOrderTemplate: 'Halo BuatDigital.id, saya tertarik untuk memesan produk *{product_name}* dengan harga {product_price}. Mohon info cara pembayarannya.',
  enableMidtrans: false,
  midtransClientKey: '',
  midtransIsProduction: false
};

// Format Currency
function formatRupiah(num) {
  if (!num || num === 0) return 'Gratis';
  return 'Rp ' + Number(num).toLocaleString('id-ID');
}

// Format Pricing Model Badge & Subtitle
function getPricingMeta(type) {
  switch (type) {
    case 'TOKEN':
      return {
        label: 'Paket Token / Top-Up',
        badgeClass: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30',
        suffix: '/ Paket Token'
      };
    case 'ONETIME':
      return {
        label: 'Sekali Bayar',
        badgeClass: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
        suffix: '/ Sekali Bayar'
      };
    case 'MONTHLY':
      return {
        label: 'Langganan Bulanan',
        badgeClass: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
        suffix: '/ Bulan'
      };
    case 'YEARLY':
      return {
        label: 'Langganan Tahunan',
        badgeClass: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
        suffix: '/ Tahun'
      };
    case 'FREE':
      return {
        label: 'Gratis',
        badgeClass: 'bg-teal-500/10 text-teal-400 border-teal-500/30',
        suffix: ''
      };
    default:
      return {
        label: 'Custom / Project',
        badgeClass: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
        suffix: ''
      };
  }
}

// Dynamically load Midtrans Snap JS
function loadMidtransScript() {
  const isProd = Boolean(siteSettings.midtransIsProduction);
  const snapUrl = isProd 
    ? 'https://app.midtrans.com/snap/snap.js' 
    : 'https://app.sandbox.midtrans.com/snap/snap.js';

  const clientKey = siteSettings.midtransClientKey || 'SB-Mid-client-sample';

  // Check if script already exists
  let script = document.getElementById('midtransSnapScript');
  if (!script) {
    script = document.createElement('script');
    script.id = 'midtransSnapScript';
    script.type = 'text/javascript';
    script.src = snapUrl;
    script.setAttribute('data-client-key', clientKey);
    document.head.appendChild(script);
  }
}

// Load Settings & Products
async function loadData() {
  try {
    // 1. Load Settings
    const resSettings = await fetch('/api/settings/public');
    const dataSettings = await resSettings.json();
    if (dataSettings.settings) {
      siteSettings = dataSettings.settings;
      updateContactLinks();
      loadMidtransScript();
    }

    // 2. Load Products
    const resProducts = await fetch('/api/products');
    const dataProducts = await resProducts.json();
    allProducts = dataProducts.products || [];
    renderProducts();

    // Check payment finish redirect
    checkPaymentReturn();

  } catch (err) {
    console.error('Error loading data:', err);
  }
}

function checkPaymentReturn() {
  const params = new URLSearchParams(window.location.search);
  const status = params.get('status');
  const orderId = params.get('order_id');

  if (status === 'success' && orderId) {
    alert(`🎉 PEMBAYARAN BERHASIL!\n\nOrder #${orderId} telah terkonfirmasi. Terima kasih atas pembelian Anda di BuatDigital.id. Akses lisensi telah aktif.`);
  }
}

function updateContactLinks() {
  const phone = siteSettings.whatsappNumber || '6281234567890';
  const waUrl = `https://wa.me/${phone}?text=${encodeURIComponent('Halo BuatDigital.id, saya ingin bertanya seputar produk dan layanan aplikasi web.')}`;

  const navWa = document.getElementById('navWhatsappBtn');
  if (navWa) navWa.href = waUrl;

  const heroWa = document.getElementById('heroWaBtn');
  if (heroWa) heroWa.href = waUrl;

  const footerWa = document.getElementById('footerWa');
  if (footerWa) footerWa.href = waUrl;
}

function setFilter(filter) {
  activeFilter = filter;

  // Update button active state
  document.querySelectorAll('.filter-btn').forEach(btn => {
    if (btn.getAttribute('data-filter') === filter) {
      btn.className = 'filter-btn active px-4 py-2 rounded-xl font-semibold transition-all bg-blue-600 text-white';
    } else {
      btn.className = 'filter-btn px-4 py-2 rounded-xl font-semibold transition-all bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700';
    }
  });

  renderProducts();
}

function renderProducts() {
  const container = document.getElementById('productsGrid');
  if (!container) return;

  let filtered = allProducts;
  if (activeFilter === 'TOKEN') {
    filtered = allProducts.filter(p => p.pricingType === 'TOKEN');
  } else if (activeFilter === 'ONETIME') {
    filtered = allProducts.filter(p => p.pricingType === 'ONETIME');
  } else if (activeFilter === 'SUBSCRIPTION') {
    filtered = allProducts.filter(p => p.pricingType === 'MONTHLY' || p.pricingType === 'YEARLY');
  }

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="col-span-full py-16 text-center text-slate-500">
        <i class="fa-solid fa-box-open text-4xl mb-3 block text-slate-600"></i>
        <p class="text-sm">Belum ada produk dalam kategori ini.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = filtered.map(product => {
    const meta = getPricingMeta(product.pricingType);
    const finalPrice = product.discountPrice || product.price;
    const hasDiscount = product.discountPrice && product.discountPrice < product.price;

    const featuresList = (product.features || []).slice(0, 4).map(f => `
      <li class="flex items-start gap-2 text-xs text-slate-300">
        <i class="fa-solid fa-check text-emerald-400 mt-0.5 flex-shrink-0"></i>
        <span>${f}</span>
      </li>
    `).join('');

    return `
      <div class="bg-slate-900/90 border border-slate-800 hover:border-blue-500/50 rounded-3xl p-6 flex flex-col justify-between space-y-5 transition-all hover:shadow-2xl hover:shadow-blue-900/10 group">
        
        <div class="space-y-4">
          <!-- Card Header / Badges -->
          <div class="flex items-center justify-between gap-2">
            <span class="inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-bold border ${meta.badgeClass}">
              ${meta.label}
            </span>
            ${product.badge ? `
              <span class="inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30">
                <i class="fa-solid fa-star text-[9px] mr-1"></i> ${product.badge}
              </span>
            ` : ''}
          </div>

          <!-- Product Icon & Title -->
          <div class="flex items-start space-x-3.5 pt-1">
            <div class="w-12 h-12 rounded-2xl bg-gradient-to-br ${product.thumbnailColor || 'from-blue-600 to-indigo-900'} flex items-center justify-center text-white text-xl shadow-md flex-shrink-0 group-hover:scale-105 transition-transform">
              <i class="fa-solid ${product.icon || 'fa-cubes'}"></i>
            </div>
            <div>
              <span class="text-[10px] uppercase font-bold text-slate-400 tracking-wider">${product.category || 'Aplikasi Web'}</span>
              <h3 class="text-base font-bold text-white group-hover:text-blue-300 transition-colors leading-snug">${product.name}</h3>
            </div>
          </div>

          <!-- Short Description -->
          <p class="text-xs text-slate-400 line-clamp-2 leading-relaxed">
            ${product.shortDesc || ''}
          </p>

          <!-- Key Features -->
          <div class="pt-3 border-t border-slate-800/80">
            <ul class="space-y-2">
              ${featuresList}
            </ul>
          </div>
        </div>

        <!-- Pricing & Card Actions -->
        <div class="pt-4 border-t border-slate-800 space-y-4">
          <!-- Price display -->
          <div class="flex items-baseline justify-between">
            <div>
              ${hasDiscount ? `
                <span class="text-[11px] text-slate-500 line-through block">${formatRupiah(product.price)}</span>
              ` : ''}
              <div class="flex items-baseline gap-1">
                <span class="text-xl font-black text-white">${formatRupiah(finalPrice)}</span>
                <span class="text-[11px] text-slate-400">${meta.suffix}</span>
              </div>
            </div>
            <button onclick="openProductModal('${product.id}')" class="text-xs text-blue-400 hover:text-blue-300 font-semibold flex items-center gap-1 hover:underline">
              Detail Fitur &rarr;
            </button>
          </div>

          <!-- Action Buttons -->
          <div class="grid grid-cols-2 gap-2">
            ${product.demoUrl && product.demoUrl !== '#' ? `
              <a href="${product.demoUrl}" target="_blank" class="px-3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center justify-center gap-1.5 border border-slate-700 hover:border-slate-600 transition-all text-center">
                <i class="fa-solid fa-arrow-up-right-from-square text-[10px]"></i> Coba Demo
              </a>
            ` : `
              <button onclick="openProductModal('${product.id}')" class="px-3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center justify-center gap-1.5 border border-slate-700 transition-all text-center">
                <i class="fa-solid fa-circle-info text-[10px]"></i> Info Lengkap
              </button>
            `}
            ${product.externalCheckoutUrl ? `
              <a href="${product.externalCheckoutUrl}" target="_blank" class="px-3 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-lg shadow-blue-900/30 transition-all text-center">
                <i class="fa-solid fa-arrow-up-right-from-square text-xs"></i> ${product.externalCheckoutLabel || 'Buka Aplikasi'}
              </a>
            ` : `
              <button onclick="openCheckoutModal('${product.id}')" class="px-3 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-900/30 transition-all text-center">
                <i class="fa-solid fa-cart-shopping text-xs"></i> Pesan / Beli
              </button>
            `}
          </div>
        </div>

      </div>
    `;
  }).join('');
}

// Product Modal Handlers
function openProductModal(productId) {
  const p = allProducts.find(item => item.id === productId);
  if (!p) return;

  currentSelectedProduct = p;
  const meta = getPricingMeta(p.pricingType);
  const finalPrice = p.discountPrice || p.price;

  document.getElementById('modalCategoryBadge').innerText = p.category || 'Aplikasi Web';
  document.getElementById('modalTitle').innerText = p.name;
  document.getElementById('modalFullDesc').innerText = p.fullDesc || p.shortDesc || '';
  document.getElementById('modalPrice').innerText = formatRupiah(finalPrice);
  document.getElementById('modalPricingType').innerText = meta.suffix;

  const iconBox = document.getElementById('modalIconBox');
  iconBox.className = `w-12 h-12 rounded-2xl bg-gradient-to-br ${p.thumbnailColor || 'from-blue-600 to-indigo-900'} flex items-center justify-center text-white text-xl flex-shrink-0`;
  document.getElementById('modalIcon').className = `fa-solid ${p.icon || 'fa-cubes'}`;

  // Features
  const featuresUl = document.getElementById('modalFeaturesList');
  featuresUl.innerHTML = (p.features || []).map(f => `
    <li class="flex items-start gap-2 text-xs text-slate-300">
      <i class="fa-solid fa-circle-check text-emerald-400 mt-0.5 flex-shrink-0"></i>
      <span>${f}</span>
    </li>
  `).join('');

  // Demo button
  const demoBtn = document.getElementById('modalDemoBtn');
  if (p.demoUrl && p.demoUrl !== '#') {
    demoBtn.href = p.demoUrl;
    demoBtn.classList.remove('hidden');
  } else {
    demoBtn.classList.add('hidden');
  }

  // Modal Checkout button
  const checkoutBtn = document.getElementById('modalCheckoutBtn');
  if (checkoutBtn) {
    if (p.externalCheckoutUrl) {
      checkoutBtn.innerHTML = `<i class="fa-solid fa-arrow-up-right-from-square text-xs"></i> ${p.externalCheckoutLabel || 'Buka di ModulAI.id'}`;
      checkoutBtn.onclick = () => window.open(p.externalCheckoutUrl, '_blank');
    } else {
      checkoutBtn.innerHTML = `<i class="fa-solid fa-cart-shopping text-sm"></i> Beli Sekarang`;
      checkoutBtn.onclick = () => openCheckoutModalFromCurrent();
    }
  }

  document.getElementById('productModal').classList.remove('hidden');
}

function closeProductModal() {
  document.getElementById('productModal').classList.add('hidden');
}

function openCheckoutModalFromCurrent() {
  closeProductModal();
  if (currentSelectedProduct) {
    openCheckoutModal(currentSelectedProduct.id);
  }
}

// ==============================================
// CHECKOUT & MIDTRANS PAYMENT MODAL HANDLER
// ==============================================
function openCheckoutModal(productId) {
  const p = allProducts.find(item => item.id === productId);
  if (!p) return;

  currentSelectedProduct = p;
  const meta = getPricingMeta(p.pricingType);
  const finalPrice = p.discountPrice || p.price;

  document.getElementById('coCategory').innerText = p.category || 'Aplikasi Web';
  document.getElementById('coProductName').innerText = p.name;
  document.getElementById('coProductPrice').innerText = `${formatRupiah(finalPrice)} ${meta.suffix}`.trim();

  // Reset form error
  document.getElementById('checkoutErrorMsg').classList.add('hidden');

  document.getElementById('checkoutModal').classList.remove('hidden');
}

function closeCheckoutModal() {
  document.getElementById('checkoutModal').classList.add('hidden');
}

async function handleProcessCheckout(e) {
  e.preventDefault();
  if (!currentSelectedProduct) return;

  const name = document.getElementById('coCustomerName').value.trim();
  const email = document.getElementById('coCustomerEmail').value.trim();
  const phone = document.getElementById('coCustomerPhone').value.trim();
  const paymentChoice = document.querySelector('input[name="paymentChoice"]:checked').value;
  const btn = document.getElementById('coSubmitBtn');
  const errorMsg = document.getElementById('checkoutErrorMsg');

  errorMsg.classList.add('hidden');

  // Option 1: WhatsApp Manual Checkout
  if (paymentChoice === 'WHATSAPP') {
    const finalPrice = currentSelectedProduct.discountPrice || currentSelectedProduct.price;
    const meta = getPricingMeta(currentSelectedProduct.pricingType);
    const waPhone = siteSettings.whatsappNumber || '6281234567890';

    let msg = `Halo Admin BuatDigital.id, saya ingin memesan:\n\n*Produk:* ${currentSelectedProduct.name}\n*Harga:* ${formatRupiah(finalPrice)} ${meta.suffix}\n*Nama Pembeli:* ${name}\n*Email Lisensi:* ${email}\n*No. WA:* ${phone}\n\nMohon info nomor rekening / pembayaran. Terima kasih.`;
    window.open(`https://wa.me/${waPhone}?text=${encodeURIComponent(msg)}`, '_blank');
    closeCheckoutModal();
    return;
  }

  // Option 2: Midtrans Payment Gateway (QRIS, VA Bank, E-Wallet)
  btn.disabled = true;
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Menghubungkan ke Midtrans...';

  try {
    const res = await fetch('/api/payment/create-snap', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        productId: currentSelectedProduct.id,
        customer: { name, email, phone }
      })
    });
    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || 'Gagal memproses pembayaran Midtrans.');
    }

    if (window.snap && data.token) {
      window.snap.pay(data.token, {
        onSuccess: function(result) {
          alert(`🎉 PEMBAYARAN BERHASIL!\n\nID Transaksi: ${result.order_id}\nMetode: ${result.payment_type}\n\nLisensi email (${email}) akan otomatis diaktifkan.`);
          closeCheckoutModal();
          window.location.reload();
        },
        onPending: function(result) {
          alert(`⏳ MENUNGGU PEMBAYARAN\n\nSilakan selesaikan pembayaran Anda via ${result.payment_type}.\nID Transaksi: ${result.order_id}`);
          closeCheckoutModal();
        },
        onError: function(result) {
          alert('❌ Pembayaran gagal atau dibatalkan.');
        },
        onClose: function() {
          console.log('Customer closed Midtrans popup');
        }
      });
    } else if (data.redirectUrl) {
      window.location.href = data.redirectUrl;
    } else {
      throw new Error('Midtrans Snap Client belum siap.');
    }

  } catch (err) {
    errorMsg.classList.remove('hidden');
    errorMsg.innerText = err.message;
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i class="fa-solid fa-lock text-sm"></i> Lanjutkan ke Pembayaran';
  }
}

// Close modals on escape
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closeProductModal();
    closeCheckoutModal();
  }
});

document.getElementById('checkoutModal').addEventListener('click', (e) => {
  if (e.target.id === 'checkoutModal') closeCheckoutModal();
});

window.addEventListener('DOMContentLoaded', loadData);
