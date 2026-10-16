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
        badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
        suffix: '/ Paket Token'
      };
    case 'ONETIME':
      return {
        label: 'Sekali Bayar',
        badgeClass: 'bg-orange-50 text-orange-700 border-orange-200',
        suffix: '/ Sekali Bayar'
      };
    case 'MONTHLY':
      return {
        label: 'Langganan Bulanan',
        badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
        suffix: '/ Bulan'
      };
    case 'YEARLY':
      return {
        label: 'Langganan Tahunan',
        badgeClass: 'bg-orange-50 text-orange-700 border-orange-200',
        suffix: '/ Tahun'
      };
    case 'FREE':
      return {
        label: 'Gratis',
        badgeClass: 'bg-orange-50 text-orange-700 border-orange-200',
        suffix: ''
      };
    default:
      return {
        label: 'Custom / Project',
        badgeClass: 'bg-orange-50 text-orange-700 border-orange-200',
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
      btn.className = 'filter-btn active px-4 py-2 rounded-xl font-semibold transition-all bg-blue-600 text-white shadow-sm';
    } else {
      btn.className = 'filter-btn px-4 py-2 rounded-xl font-semibold transition-all bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 shadow-sm';
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
      <div class="col-span-full py-16 text-center text-slate-400">
        <i class="fa-solid fa-box-open text-4xl mb-3 block text-slate-300"></i>
        <p class="text-sm">Belum ada produk dalam kategori ini.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = filtered.map((product, idx) => {
    const meta = getPricingMeta(product.pricingType);
    const finalPrice = product.discountPrice || product.price;
    const hasDiscount = product.discountPrice && product.discountPrice < product.price;

    const featuresList = (product.features || []).slice(0, 4).map(f => `
      <li class="flex items-start gap-2 text-xs text-slate-600">
        <i class="fa-solid fa-check text-orange-600 mt-0.5 flex-shrink-0"></i>
        <span>${f}</span>
      </li>
    `).join('');

    const isExternal = product.checkoutType === 'EXTERNAL' || (Boolean(product.externalCheckoutUrl) && product.checkoutType !== 'BUATDIGITAL');
    const isPriceShown = product.showPrice !== false;

    return `
      <div style="animation-delay:${idx*80}ms" class="card-in bg-white border border-slate-200/90 hover:border-orange-400 hover:-translate-y-1.5 rounded-3xl p-6 flex flex-col justify-between space-y-5 transition-all shadow-sm hover:shadow-xl hover:shadow-slate-200/50 group">
        
        <div class="space-y-4">
          <!-- Card Header / Badges -->
          <div class="flex items-center justify-between gap-2">
            <span class="inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-bold border ${meta.badgeClass}">
              ${meta.label}
            </span>
            ${product.badge ? `
              <span class="inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-bold bg-orange-50 text-orange-700 border border-orange-200">
                <i class="fa-solid fa-star text-[9px] mr-1"></i> ${product.badge}
              </span>
            ` : ''}
          </div>

          <!-- Product Icon & Title -->
          <div class="flex items-start space-x-3.5 pt-1">
            <div class="w-12 h-12 rounded-2xl bg-gradient-to-br ${product.thumbnailColor || 'from-blue-600 to-blue-700'} flex items-center justify-center text-white text-xl shadow-sm flex-shrink-0 group-hover:scale-105 transition-transform">
              <i class="fa-solid ${product.icon || 'fa-cubes'}"></i>
            </div>
            <div>
              <span class="text-[10px] uppercase font-bold text-slate-400 tracking-wider">${product.category || 'Aplikasi Web'}</span>
              <h3 class="text-base font-bold text-slate-900 group-hover:text-blue-600 transition-colors leading-snug">${product.name}</h3>
            </div>
          </div>

          <!-- Short Description -->
          <p class="text-xs text-slate-500 line-clamp-2 leading-relaxed">
            ${product.shortDesc || ''}
          </p>

          <!-- Key Features -->
          <div class="pt-3 border-t border-slate-100">
            <ul class="space-y-2">
              ${featuresList}
            </ul>
          </div>
        </div>

        <!-- Pricing & Card Actions -->
        <div class="pt-4 border-t border-slate-100 space-y-4">
          <!-- Price display -->
          <div class="flex items-baseline justify-between min-h-[38px]">
            <div>
              ${isPriceShown ? `
                ${hasDiscount ? `
                  <span class="text-[11px] text-slate-400 line-through block">${formatRupiah(product.price)}</span>
                ` : ''}
                <div class="flex items-baseline gap-1">
                  <span class="text-xl font-black text-slate-900">${formatRupiah(finalPrice)}</span>
                  <span class="text-[11px] text-slate-500 font-medium">${meta.suffix}</span>
                </div>
              ` : `
                <div class="flex items-center gap-1.5 text-slate-600 font-semibold text-xs py-1">
                  <span class="w-2 h-2 rounded-full bg-slate-400"></span>
                  <span>Hubungi Kami / Kustom</span>
                </div>
              `}
            </div>
            <button onclick="openProductModal('${product.id}')" class="text-xs text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1 hover:underline">
              Detail Fitur &rarr;
            </button>
          </div>

          <!-- Action Buttons -->
          <div class="grid grid-cols-2 gap-2">
            ${product.demoUrl && product.demoUrl !== '#' ? `
              <a href="${product.demoUrl}" target="_blank" class="px-3 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center justify-center gap-1.5 border border-slate-200 hover:border-slate-300 transition-all text-center">
                <i class="fa-solid fa-arrow-up-right-from-square text-[10px]"></i> Coba Demo
              </a>
            ` : `
              <button onclick="openProductModal('${product.id}')" class="px-3 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center justify-center gap-1.5 border border-slate-200 transition-all text-center">
                <i class="fa-solid fa-circle-info text-[10px]"></i> Info Lengkap
              </button>
            `}
            ${isExternal ? `
              <a href="${product.externalCheckoutUrl || product.appUrl || product.demoUrl || '#'}" target="_blank" class="px-3 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm hover:shadow transition-all text-center">
                <i class="fa-solid fa-arrow-up-right-from-square text-xs"></i> ${product.externalCheckoutLabel || 'Buka Aplikasi'}
              </a>
            ` : `
              <button onclick="openCheckoutModal('${product.id}')" class="px-3 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm hover:shadow transition-all text-center">
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
  const isExternal = p.checkoutType === 'EXTERNAL' || (Boolean(p.externalCheckoutUrl) && p.checkoutType !== 'BUATDIGITAL');
  const isPriceShown = p.showPrice !== false;

  document.getElementById('modalCategoryBadge').innerText = p.category || 'Aplikasi Web';
  document.getElementById('modalTitle').innerText = p.name;
  document.getElementById('modalFullDesc').innerText = p.fullDesc || p.shortDesc || '';

  // Modal Price Container
  const priceBox = document.getElementById('modalPriceBox');
  if (priceBox) {
    if (isPriceShown) {
      priceBox.classList.remove('hidden');
      document.getElementById('modalPrice').innerText = formatRupiah(finalPrice);
      document.getElementById('modalPricingType').innerText = meta.suffix;
    } else {
      priceBox.classList.add('hidden');
    }
  } else {
    document.getElementById('modalPrice').innerText = isPriceShown ? formatRupiah(finalPrice) : 'Harga Kustom';
    document.getElementById('modalPricingType').innerText = isPriceShown ? meta.suffix : '';
  }

  const iconBox = document.getElementById('modalIconBox');
  iconBox.className = `w-12 h-12 rounded-2xl bg-gradient-to-br ${p.thumbnailColor || 'from-blue-600 to-blue-700'} flex items-center justify-center text-white text-xl flex-shrink-0 shadow-sm`;
  document.getElementById('modalIcon').className = `fa-solid ${p.icon || 'fa-cubes'}`;

  // Features
  const featuresUl = document.getElementById('modalFeaturesList');
  featuresUl.innerHTML = (p.features || []).map(f => `
    <li class="flex items-start gap-2 text-xs text-slate-600">
      <i class="fa-solid fa-circle-check text-orange-600 mt-0.5 flex-shrink-0"></i>
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
    if (isExternal) {
      const extUrl = p.externalCheckoutUrl || p.appUrl || p.demoUrl || '#';
      checkoutBtn.className = "flex-1 sm:flex-none px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-lg shadow-blue-600/20 transition-all";
      checkoutBtn.innerHTML = `<i class="fa-solid fa-arrow-up-right-from-square text-xs"></i> ${p.externalCheckoutLabel || 'Buka di ' + p.name}`;
      checkoutBtn.onclick = () => window.open(extUrl, '_blank');
    } else {
      checkoutBtn.className = "flex-1 sm:flex-none px-5 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-lg shadow-orange-600/20 transition-all";
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

// Scroll reveal: bagian muncul saat di-scroll
(function () {
  const io = new IntersectionObserver((entries) => {
    entries.forEach(en => { if (en.isIntersecting) { en.target.classList.add('in-view'); io.unobserve(en.target); } });
  }, { threshold: 0.12 });
  window.addEventListener('DOMContentLoaded', () => document.querySelectorAll('.reveal').forEach(el => io.observe(el)));
})();