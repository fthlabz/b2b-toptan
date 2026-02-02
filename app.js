// app.js

const API_URL = "https://script.google.com/macros/s/AKfycbyvtvYWLmkq8AqmCEhf_FP5fYLaliFpz_p-Jx4_miEM1vgCvHIM8qDS06A5kKP9F6W0ZA/exec";

const urlParams = new URLSearchParams(window.location.search);
const currentID = urlParams.get('id');

let pageData = {
  company: "", slogan: "",
  phone: "", email: "", whats: "", insta: "", address: "", maps: "", review: "", hours: "",
  legal: "",
  pLink: "", vLink: "",
  daily: "",
  adminHash: "",
  flashImg: "", flashOld: "", flashNew: "", flashLabel: ""
};

function sha256hex(str){
  return CryptoJS.SHA256(str).toString(CryptoJS.enc.Hex);
}
function storageKey(name){ return `${name}_${currentID}`; }
function encodeSafe(s){ return encodeURIComponent((s||"").trim()); }
function decodeSafe(s){ try { return decodeURIComponent(s); } catch(e){ return s; } }

function escapeHtml(str){
  return (str||"").replace(/[&<>"']/g, m => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'
  }[m]));
}

function parseProductMeta(name){
  const parts = (name || "").split("|").map(part => part.trim()).filter(Boolean);
  if(parts.length === 0) return null;
  return {
    title: parts[0],
    code: parts.length >= 2 ? parts[1] : "",
    price: parts.length >= 3 ? parts[2] : ""
  };
}

function buildProductMeta(name){
  const meta = parseProductMeta(name);
  if(!meta) return "";
  const titleHtml = `<div class="meta-title">${escapeHtml(meta.title)}</div>`;
  const codeHtml = meta.code ? `<div class="meta-code">${escapeHtml(meta.code)}</div>` : "";
  const priceHtml = meta.price ? `<div class="meta-price">${escapeHtml(meta.price)}</div>` : "";
  return `<div class="meta">${titleHtml}${codeHtml}${priceHtml}</div>`;
}

// EDIT: clickable helper (div cards)
function makeClickable(el, handler){
  el.addEventListener('click', handler);
  el.addEventListener('keydown', (e) => {
    if(e.key === 'Enter' || e.key === ' '){
      e.preventDefault();
      handler();
    }
  });
}

window.onload = function() {
  if (!currentID) { document.getElementById('loading').innerHTML = "ID Yok"; return; }
  document.getElementById('certId').innerText = currentID;

  fetch(API_URL + "?action=read&id=" + currentID)
    .then(res => res.json())
    .then(data => {
      document.getElementById('loading').style.display = 'none';

      if (data.status === "empty") {
        document.getElementById('companyName').innerText = "Yeni Katalog";
        document.getElementById('companySlogan').innerText = "Kurulum gerekli";
        document.getElementById('setup-panel').style.display = 'block';
        return;
      }

      const looksEncrypted = (v) => typeof v === 'string' && v.startsWith("U2FsdGVkX1");
      if (looksEncrypted(data.title) || looksEncrypted(data.not) || looksEncrypted(data.folder) || looksEncrypted(data.ses)) {
        document.getElementById('companyName').innerText = "Güncelleme Gerekli";
        document.getElementById('companySlogan').innerText = "Eski şifreli kayıt";
        document.getElementById('view-panel').style.display = 'block';
        const bp = document.getElementById('btnProducts');
        const ba = document.getElementById('btnAds');
        const bd = document.getElementById('btnDaily');
        if(bp) bp.style.display='none';
        if(ba) ba.style.display='none';
        if(bd) bd.style.display='none';
        const fb = document.getElementById('flashBox');
        if(fb) fb.style.display='none';
        return;
      }

      pageData.company = (data.title || "").trim();
      pageData.legal   = (data.not || "").trim();
      pageData.daily   = (data.ses || "").trim();

      const folderStr = (data.folder || "").trim();
      const parts = folderStr.split("|||");

      pageData.pLink = (parts[0] || "").trim();
      pageData.vLink = (parts[1] || "").trim();
      pageData.adminHash = (parts[2] || "").trim();

      pageData.slogan  = decodeSafe(parts[3] || "");
      pageData.phone   = decodeSafe(parts[4] || "");
      pageData.whats   = decodeSafe(parts[5] || "");
      pageData.insta   = decodeSafe(parts[6] || "");
      pageData.address = decodeSafe(parts[7] || "");
      pageData.maps    = decodeSafe(parts[8] || "");

      pageData.flashImg   = decodeSafe(parts[9] || "");
      pageData.flashOld   = decodeSafe(parts[10] || "");
      pageData.flashNew   = decodeSafe(parts[11] || "");
      pageData.flashLabel = decodeSafe(parts[12] || "");

      pageData.email  = decodeSafe(parts[13] || "");
      pageData.review = decodeSafe(parts[14] || "");
      pageData.hours  = decodeSafe(parts[15] || "");

      document.getElementById('companyName').innerText = pageData.company || "Dijital Katalog";
      document.getElementById('companySlogan').innerText = pageData.slogan || "";

      // EDIT: V-Card = sadece şirket adı + Digital V Card
      const vcardName = document.getElementById('vcardName');
      const vcardSub = document.getElementById('vcardSub');
      if(vcardName) vcardName.innerText = pageData.company || "İşletme";
      if(vcardSub) vcardSub.innerText = "Digital V Card";

      // (butonlar UI'da kalksa bile, varlıklarına göre eski kontrolleri bozmayalım)
      const bp = document.getElementById('btnProducts');
      const ba = document.getElementById('btnAds');
      const bd = document.getElementById('btnDaily');
      if (bp && !pageData.pLink) bp.style.display='none';
      if (ba && !pageData.vLink) ba.style.display='none';
      if (bd && !pageData.daily) bd.style.display='none';

      renderFlash();
      renderGrids();
      renderFeatured(); // EDIT
      document.getElementById('view-panel').style.display = 'block';
    })
    .catch(() => alert("Bağlantı Hatası: URL'yi kontrol et."));
};

function getDriveId(link){
  const m = (link||"").match(/[-\w]{25,}/);
  return m ? m[0] : "";
}

function renderFlash(){
  const img = document.getElementById('flashImg');
  const ph  = document.getElementById('flashPlaceholder');
  const oldT = document.getElementById('oldPriceText');
  const newT = document.getElementById('newPriceText');
  const title = document.getElementById('flashTitle');
  const flashState = document.getElementById('flashState');

  if(!img || !ph || !oldT || !newT || !title) return;

  const label = (pageData.flashLabel || "FLAŞ FIRSAT").trim();
  title.innerHTML = `<i class="fas fa-bolt"></i> ${escapeHtml(label).toUpperCase()}`;

  oldT.innerText = pageData.flashOld ? pageData.flashOld : "—";
  newT.innerText = pageData.flashNew ? pageData.flashNew : "—";

  if(pageData.flashImg){
    const id = getDriveId(pageData.flashImg);
    const src = id ? (`https://lh3.googleusercontent.com/d/${id}=s2000`) : pageData.flashImg;
    img.src = src;
    img.style.display = 'block';
    ph.style.display = 'none';
  } else {
    img.style.display = 'none';
    ph.style.display = 'flex';
  }

  // Eski işleyiş bozulmasın (CSS zaten gizli olabilir)
  if(flashState){
    if(pageData.review){
      flashState.style.display = 'inline-flex';
      flashState.innerText = "⭐ Değerlendir & Puan Ver";
      flashState.style.cursor = 'pointer';
      flashState.onclick = () => window.open(pageData.review, "_blank", "noopener,noreferrer");
    } else {
      flashState.style.display = 'none';
      flashState.onclick = null;
    }
  }
}

// EDIT: grid placeholders
function buildGridPlaceholders(label, context){
  const cards = [];
  const count = context === 'vitrin' ? 2 : 6;
  for(let i = 0; i < count; i++){
    const extraClass = context === 'vitrin' ? ' vitrin-card' : '';
    cards.push(`
      <div class="grid-card placeholder-card${extraClass}">
        <div class="grid-media placeholder-media"></div>
        <div class="grid-caption">${label}</div>
      </div>
    `);
  }
  return cards.join("");
}

function renderGrids(){
  const productGrid = document.getElementById('productGrid');
  const vitrinGrid = document.getElementById('vitrinGrid');

  if(productGrid){
    renderGrid("product", pageData.pLink, productGrid, "Ürün");
  }
  if(vitrinGrid){
    renderGrid("vitrin", pageData.vLink, vitrinGrid, "Vitrin");
  }

  const modal = document.getElementById('mediaModal');
  if(modal && !modal.dataset.bound){
    modal.addEventListener('click', (event) => {
      if(event.target === modal){
        closeMediaModal();
      }
    });
    modal.dataset.bound = '1';
  }
}

function renderGrid(context, link, grid, label){
  if(!grid) return;
  grid.innerHTML = buildGridPlaceholders(label, context);
  if(!link) return;

  fetch(API_URL + "?action=getFiles&url=" + encodeURIComponent(link))
    .then(res => res.json())
    .then(data => {
      if(data.status === "error" || !data.files || data.files.length === 0){
        grid.innerHTML = buildGridPlaceholders(label, context);
        return;
      }

      grid.innerHTML = "";
      data.files.forEach(file => {
        const card = document.createElement('div'); // EDIT: button yerine div (buton içi offer butonla çakışmasın)
        card.className = context === 'vitrin' ? 'grid-card vitrin-card' : 'grid-card';
        card.setAttribute('role','button');
        card.tabIndex = 0;

        const name = (file.name || "").trim();

        if(context === 'vitrin'){
          const proxyUrl = file.type === 'image'
            ? ("https://lh3.googleusercontent.com/d/" + file.id + "=s1200")
            : "";

          card.innerHTML = `
            <div class="grid-media vitrin-media">
              ${proxyUrl ? `<img src="${proxyUrl}" alt="">` : ``}
              <span class="vitrin-play"><i class="fas fa-play"></i></span>
            </div>
            <div class="grid-caption">${escapeHtml(name || label)}</div>
          `;

          // EDIT: vitrin tıklanınca vitrin butonu gibi açılacak (drive'a yönlendirme yok)
          makeClickable(card, () => openGallery('video'));
        }
        else if(file.type === 'image'){
          const proxyUrl = "https://lh3.googleusercontent.com/d/" + file.id + "=s1200";
          const meta = parseProductMeta(name);
          const offerText = meta?.title ? meta.title : (name || label);

          card.innerHTML = `
            <div class="grid-media">
              <img src="${proxyUrl}" alt="">
            </div>
            <div class="grid-caption">${escapeHtml(meta?.title || name || label)}</div>
            <button type="button" class="offer-btn"><i class="fab fa-whatsapp"></i> WhatsApp ile teklif al</button>
          `;

          // Kart tık = detay (mevcut işleyiş)
          const metaHtml = buildProductMeta(name);
          makeClickable(card, () => openMediaModal({
            context,
            title: name || label,
            mediaType: 'image',
            src: proxyUrl,
            metaHtml
          }));

          // EDIT: teklif butonu sadece o ürün için
          const btn = card.querySelector('.offer-btn');
          if(btn){
            btn.addEventListener('click', (e) => {
              e.stopPropagation();
              orderOnWhatsApp(offerText);
            });
          }
        }
        else if(file.type === 'video'){
          const videoUrl = `https://drive.google.com/file/d/${file.id}/preview`;
          card.innerHTML = `
            <div class="grid-media video">
              <iframe src="${videoUrl}" allow="autoplay; fullscreen" allowfullscreen></iframe>
            </div>
            <div class="grid-caption">${escapeHtml(name || label)}</div>
          `;
          makeClickable(card, () => openMediaModal({
            context,
            title: name || label,
            mediaType: 'video',
            src: videoUrl,
            metaHtml: ""
          }));
        }

        grid.appendChild(card);
      });
    })
    .catch(() => {
      grid.innerHTML = buildGridPlaceholders(label, context);
    });
}

function openMediaModal(payload){
  const modal = document.getElementById('mediaModal');
  const body = document.getElementById('mediaModalBody');
  const title = document.getElementById('mediaModalTitle');
  if(!modal || !body || !title) return;

  title.innerText = payload.title || (payload.context === 'vitrin' ? 'Vitrin' : 'Ürün');

  let mediaHtml = "";
  if(payload.mediaType === 'video'){
    mediaHtml = `<div class="modal-media video"><iframe src="${payload.src}" allow="autoplay; fullscreen" allowfullscreen></iframe></div>`;
  } else {
    mediaHtml = `<div class="modal-media"><img src="${payload.src}" alt=""></div>`;
  }

  const metaHtml = payload.metaHtml ? `<div class="modal-meta">${payload.metaHtml}</div>` : "";

  // EDIT: modal teklif butonu da ürün bazlı çalışsın
  const productTitle = (payload.title || "").trim();
  const safeTitle = productTitle.replace(/\\/g, "\\\\").replace(/'/g, "\\'").replace(/\n/g, " ");
  const actionHtml = payload.context === 'product'
    ? `<button class="btn-whatsapp modal-whatsapp" onclick="orderOnWhatsApp('${safeTitle}')">WhatsApp ile teklif al</button>`
    : "";

  body.innerHTML = `${mediaHtml}${metaHtml}${actionHtml}`;
  modal.style.display = 'flex';
}

function closeMediaModal(){
  const modal = document.getElementById('mediaModal');
  const body = document.getElementById('mediaModalBody');
  if(modal) modal.style.display = 'none';
  if(body) body.innerHTML = '';
}

// EDIT: Öne Çıkanlar (vitrinden sonra 2'li grid)
function renderFeatured(){
  const section = document.getElementById('featuredSection');
  const grid = document.getElementById('featuredGrid');
  if(!section || !grid) return;

  if(!pageData.daily){
    section.style.display = 'none';
    return;
  }
  section.style.display = 'block';

  const fileId = getDriveId(pageData.daily);
  const thumb = fileId ? `https://lh3.googleusercontent.com/d/${fileId}=s1200` : "";

  grid.innerHTML = `
    <div class="featured-card" role="button" tabindex="0" id="featuredCard1">
      <div class="featured-thumb">
        ${thumb ? `<img src="${thumb}" alt="">` : `<i class="fas fa-star"></i>`}
      </div>
      <div class="featured-title">Öne Çıkan</div>
      <div class="featured-sub">Dokun • Aç</div>
    </div>
  `;

  const c1 = document.getElementById('featuredCard1');
  if(c1){
    makeClickable(c1, () => openDaily());
  }
}

function openDaily(){
  if(!pageData.daily) return;
  const overlay = document.getElementById('gallery-overlay');
  const slider = document.getElementById('slider-track');
  document.getElementById('galTitle').innerText = "Öne Çıkanlar";
  slider.innerHTML = "";
  overlay.style.display = 'flex';

  const fileId = getDriveId(pageData.daily);
  if(fileId){
    const playerUrl = `https://drive.google.com/file/d/${fileId}/preview`;
    slider.innerHTML = `<div class="slide"><div class="video-wrapper"><iframe src="${playerUrl}" allow="autoplay; fullscreen" allowfullscreen></iframe></div></div>`;
  } else {
    slider.innerHTML = '<div class="error-msg">Link Hatalı</div>';
  }
}

function openGallery(type) {
  let link = "";
  let title = "";
  if(type === 'video') { link = pageData.vLink; title = "Vitrin"; }
  if(type === 'photo') { link = pageData.pLink; title = "Ürünlerimiz"; }
  if(!link) return;

  const overlay = document.getElementById('gallery-overlay');
  const slider = document.getElementById('slider-track');
  document.getElementById('galTitle').innerText = title;
  slider.innerHTML = '<div class="spinner"><i class="fas fa-circle-notch fa-spin"></i><br><span style="font-size:10px; letter-spacing:.12em; text-transform:uppercase;">Yükleniyor...</span></div>';
  overlay.style.display = 'flex';

  fetch(API_URL + "?action=getFiles&url=" + encodeURIComponent(link))
    .then(res => res.json())
    .then(data => {
      slider.innerHTML = "";
      if(data.status === "error") {
        slider.innerHTML = `<div class="error-msg">⚠️ BAĞLANTI HATASI<br>${data.msg}</div>`;
        return;
      }
      if(!data.files || data.files.length === 0) {
        slider.innerHTML = '<div class="error-msg">Bu klasör boş görünüyor.</div>';
        return;
      }

      data.files.forEach(file => {
        const slide = document.createElement('div');
        slide.className = 'slide';

        if(file.type === 'image') {
          const proxyUrl = "https://lh3.googleusercontent.com/d/" + file.id + "=s2000";
          const name = (file.name || "").trim();

          if(type === 'photo'){
            const metaHtml = buildProductMeta(name);
            slide.innerHTML = `
              <div class="media-frame">
                <img src="${proxyUrl}" loading="lazy">
                ${metaHtml}
              </div>
            `;
          } else {
            slide.innerHTML = `
              <div class="gallery-frame">
                ${name ? `<div class="gallery-title">${escapeHtml(name)}</div>` : ""}
                <div class="gallery-media">
                  <img src="${proxyUrl}" loading="lazy">
                </div>
              </div>
            `;
          }
        }
        else if (file.type === 'video') {
          const videoUrl = `https://drive.google.com/file/d/${file.id}/preview`;
          slide.innerHTML = `<div class="video-wrapper"><iframe src="${videoUrl}" allow="autoplay; fullscreen" allowfullscreen></iframe></div>`;
        }

        slider.appendChild(slide);
      });
    });
}

function closeGallery() {
  document.getElementById('gallery-overlay').style.display = 'none';
  document.getElementById('slider-track').innerHTML = "";
}

function normalizeHandle(h){ return (h||"").trim().replace(/^@/,'').replace(/\s+/g,''); }
function normalizeWhats(w){ return (w||"").replace(/[^\d]/g,'').replace(/^0/,'90'); }
function normalizeTel(t){ return (t||"").replace(/\s+/g,''); }

// EDIT: ürün bazlı WhatsApp mesajı (param opsiyonel)
function orderOnWhatsApp(productTitle){
  const num = normalizeWhats(pageData.whats || pageData.phone);
  if(!num){
    alert("WhatsApp/Telefon numarası eklenmemiş. Yönetici panelinden ekleyin.");
    return;
  }

  const msgLines = [];
  msgLines.push(`Merhaba, ${pageData.company || "işletme"} için teklif istiyorum.`);
  if(productTitle){
    msgLines.push(`Ürün: ${productTitle}`);
  }
  if(pageData.flashNew || pageData.flashOld){
    msgLines.push(`Anlık Kampanya: ${pageData.flashOld ? ("Eski: " + pageData.flashOld) : ""}${(pageData.flashOld && pageData.flashNew) ? " | " : ""}${pageData.flashNew ? ("Yeni: " + pageData.flashNew) : ""}`);
  }
  msgLines.push(`Katalog ID: ${currentID}`);

  const msg = encodeURIComponent(msgLines.join("\n"));
  const url = `https://wa.me/${num}?text=${msg}`;
  window.open(url, "_blank");
}

function isAdminRemembered(){
  try{ return localStorage.getItem(storageKey("admin_ok")) === "1"; }
  catch(e){ return false; }
}
function rememberAdmin(){
  try{ localStorage.setItem(storageKey("admin_ok"), "1"); } catch(e){}
}

function enableEdit() {
  if(isAdminRemembered()){
    openSetupPrefilled();
    return;
  }

  if(!pageData.adminHash){
    const ok = confirm("Yönetici şifresi kaydı bulunamadı. Düzenlemeye geçilsin mi?");
    if(!ok) return;
    openSetupPrefilled();
    return;
  }

  const adminPass = prompt("Yönetici şifresi:");
  if(!adminPass) return;

  const h = sha256hex(adminPass);
  if(h !== pageData.adminHash){
    alert("Şifre yanlış!");
    return;
  }

  rememberAdmin();
  openSetupPrefilled();
}

function openSetupPrefilled(){
  document.getElementById('view-panel').style.display='none';
  document.getElementById('setup-panel').style.display='block';

  document.getElementById('inTitle').value = pageData.company || "";
  document.getElementById('inSlogan').value = pageData.slogan || "";

  document.getElementById('inPhone').value = pageData.phone || "";
  document.getElementById('inEmail').value = pageData.email || "";
  document.getElementById('inWhats').value = pageData.whats || "";
  document.getElementById('inInsta').value = pageData.insta || "";
  document.getElementById('inAddress').value = pageData.address || "";
  document.getElementById('inMaps').value = pageData.maps || "";
  document.getElementById('inReview').value = pageData.review || "";
  document.getElementById('inHours').value = pageData.hours || "";

  document.getElementById('inPhotoLink').value = pageData.pLink || "";
  document.getElementById('inVideoLink').value = pageData.vLink || "";
  document.getElementById('inDaily').value = pageData.daily || "";

  document.getElementById('inFlashImg').value = pageData.flashImg || "";
  document.getElementById('inOldPrice').value = pageData.flashOld || "";
  document.getElementById('inNewPrice').value = pageData.flashNew || "";
  document.getElementById('inFlashLabel').value = pageData.flashLabel || "";

  document.getElementById('inNot').value = pageData.legal || "";

  document.getElementById('inPass').value = "";
  document.getElementById('inPassConfirm').value = "";
}

function saveData() {
  const company = (document.getElementById('inTitle').value || "").trim();
  if(!company) return alert("Şirket adı boş olamaz.");

  const firstSetup = !pageData.adminHash;

  const pass = (document.getElementById('inPass').value || "");
  const pass2 = (document.getElementById('inPassConfirm').value || "");

  if(firstSetup){
    if(!pass) return alert("İlk kurulumda yönetici şifresi boş olamaz.");
    if(pass !== pass2) return alert("Şifreler uyuşmuyor.");
  } else {
    if(pass){
      if(pass !== pass2) return alert("Şifreler uyuşmuyor.");
    }
  }

  const btn = document.querySelector('#setup-panel .btn-gold');
  btn.innerText = "KAYDEDİLİYOR...";
  btn.disabled = true;

  const slogan  = (document.getElementById('inSlogan').value || "").trim();

  const phone   = (document.getElementById('inPhone').value || "").trim();
  const email   = (document.getElementById('inEmail').value || "").trim();
  const whats   = (document.getElementById('inWhats').value || "").trim();
  const insta   = (document.getElementById('inInsta').value || "").trim();
  const address = (document.getElementById('inAddress').value || "").trim();
  const maps    = (document.getElementById('inMaps').value || "").trim();
  const review  = (document.getElementById('inReview').value || "").trim();
  const hours   = (document.getElementById('inHours').value || "").trim();

  const pLink   = (document.getElementById('inPhotoLink').value || "").trim();
  const vLink   = (document.getElementById('inVideoLink').value || "").trim();
  const daily   = (document.getElementById('inDaily').value || "").trim();

  const flashImg   = (document.getElementById('inFlashImg').value || "").trim();
  const flashOld   = (document.getElementById('inOldPrice').value || "").trim();
  const flashNew   = (document.getElementById('inNewPrice').value || "").trim();
  const flashLabel = (document.getElementById('inFlashLabel').value || "").trim();

  const legal   = (document.getElementById('inNot').value || "").trim();

  let adminHash = pageData.adminHash || "";
  if(firstSetup || pass){
    adminHash = sha256hex(pass);
  }

  const folder = [
    pLink, vLink, adminHash,
    encodeSafe(slogan),
    encodeSafe(phone),
    encodeSafe(whats),
    encodeSafe(insta),
    encodeSafe(address),
    encodeSafe(maps),
    encodeSafe(flashImg),
    encodeSafe(flashOld),
    encodeSafe(flashNew),
    encodeSafe(flashLabel),
    encodeSafe(email),
    encodeSafe(review),
    encodeSafe(hours)
  ].join("|||");

  fetch(API_URL + `?action=save&id=${encodeURIComponent(currentID)}&title=${encodeURIComponent(company)}&not=${encodeURIComponent(legal)}&folder=${encodeURIComponent(folder)}&ses=${encodeURIComponent(daily)}`)
    .then(res => res.json())
    .then(data => {
      if (data.status === "success") {
        rememberAdmin();
        location.reload();
      } else {
        alert("Hata!");
        btn.disabled = false;
        btn.innerText = "KAYDET";
      }
    })
    .catch(() => {
      alert("Kaydetme hatası!");
      btn.disabled = false;
      btn.innerText = "KAYDET";
    });
}

function openCardModal(){
  prepareCardModal();
  document.getElementById('cardModal').style.display = 'flex';
}
function closeCardModal(){
  document.getElementById('cardModal').style.display = 'none';
  document.getElementById('a2hsSteps').style.display = 'none';
}

function isIOS(){
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
}
function isAndroid(){
  return /Android/.test(navigator.userAgent);
}
function isSafari(){
  const ua = navigator.userAgent;
  const isSafari = /^((?!chrome|android).)*safari/i.test(ua);
  return isSafari && isIOS();
}

function prepareCardModal(){
  const a2hsText = document.getElementById('a2hsText');
  if(isIOS()){
    a2hsText.innerHTML = "iPhone/iPad: Safari’de <b>Paylaş</b> → <b>Ana Ekrana Ekle</b> ile kısayol ekleyebilirsin.";
  } else if(isAndroid()){
    a2hsText.innerHTML = "Android: Chrome’da <b>⋮</b> menüsü → <b>Ana ekrana ekle</b> ile kısayol ekleyebilirsin.";
  } else {
    a2hsText.innerHTML = "Tarayıcı menüsünden “Ana ekrana ekle / Kısayol oluştur” seçeneklerini kullanabilirsin.";
  }

  const box = document.getElementById('cardQuickLinks');
  const tel = document.getElementById('quickTel');
  const map = document.getElementById('quickMap');
  const ins = document.getElementById('quickInsta');
  const rev = document.getElementById('quickReview');
  const web = document.getElementById('quickWeb');

  let any = false;

  if(pageData.phone){
    tel.href = `tel:${normalizeTel(pageData.phone)}`;
    tel.style.display = 'inline-block';
    any = true;
  } else tel.style.display='none';

  if(pageData.maps){
    map.href = pageData.maps;
    map.style.display = 'inline-block';
    any = true;
  } else map.style.display='none';

  if(pageData.insta){
    const handle = normalizeHandle(pageData.insta);
    ins.href = `https://instagram.com/${handle}`;
    ins.style.display = 'inline-block';
    any = true;
  } else ins.style.display='none';

  if(pageData.review){
    rev.href = pageData.review;
    rev.style.display = 'inline-block';
    any = true;
  } else rev.style.display='none';

  web.href = window.location.href;
  web.style.display = 'inline-block';
  any = true;

  box.style.display = any ? 'block' : 'none';
}

function showA2HSHelp(){
  const steps = document.getElementById('a2hsSteps');
  steps.style.display = 'block';

  if(isIOS()){
    steps.innerHTML = `
      <div class="step">
        <div class="step-ico"><i class="fas fa-share-square"></i></div>
        <div class="step-text">Safari’de alttaki <b>Paylaş</b> ikonuna dokun.</div>
      </div>
      <div class="step">
        <div class="step-ico"><i class="fas fa-plus"></i></div>
        <div class="step-text"><b>Ana Ekrana Ekle</b> seçeneğini seç.</div>
      </div>
      <div class="step">
        <div class="step-ico"><i class="fas fa-check"></i></div>
        <div class="step-text">Sağ üstten <b>Ekle</b> diyerek bitir.</div>
      </div>
      <div class="mini" style="margin-top:10px;">
        Not: iOS’ta bu işlem sadece kullanıcı onayıyla yapılabilir; web sayfası otomatik ekleyemez.
      </div>
    `;
  } else if(isAndroid()){
    steps.innerHTML = `
      <div class="step">
        <div class="step-ico"><i class="fas fa-ellipsis-vertical"></i></div>
        <div class="step-text">Chrome’da sağ üst <b>⋮</b> menüsüne dokun.</div>
      </div>
      <div class="step">
        <div class="step-ico"><i class="fas fa-house"></i></div>
        <div class="step-text"><b>Ana ekrana ekle</b> / <b>Uygulama yükle</b> seçeneğini seç.</div>
      </div>
      <div class="step">
        <div class="step-ico"><i class="fas fa-check"></i></div>
        <div class="step-text"><b>Ekle</b> diyerek bitir.</div>
      </div>
    `;
  } else {
    steps.innerHTML = `
      <div class="mini">
        Tarayıcı menüsünden “Ana ekrana ekle / Kısayol oluştur / Install app” seçeneklerini kullanabilirsin.
      </div>
    `;
  }
}

function sanitizeVCardValue(s){
  return (s||"").replace(/\\/g,'\\\\').replace(/\n/g,'\\n').replace(/;/g,'\\;').replace(/,/g,'\\,');
}
function buildVCard(){
  const lines = [];
  const company = pageData.company || "İşletme";
  const slogan  = pageData.slogan || "";
  const phone   = pageData.phone || "";
  const email   = pageData.email || "";
  const address = pageData.address || "";
  const maps    = pageData.maps || "";
  const insta   = pageData.insta || "";
  const whats   = pageData.whats || "";
  const review  = pageData.review || "";
  const hours   = pageData.hours || "";

  lines.push("BEGIN:VCARD");
  lines.push("VERSION:3.0");
  lines.push(`FN:${sanitizeVCardValue(company)}`);
  lines.push(`ORG:${sanitizeVCardValue(company)}`);

  if(phone) lines.push(`TEL;TYPE=CELL,VOICE:${sanitizeVCardValue(phone)}`);
  if(email) lines.push(`EMAIL;TYPE=INTERNET:${sanitizeVCardValue(email)}`);
  if(address) lines.push(`ADR;TYPE=WORK:;;${sanitizeVCardValue(address)};;;;`);
  lines.push(`URL:${sanitizeVCardValue(window.location.href)}`);

  const noteParts = [];
  if(slogan) noteParts.push(slogan);
  if(hours) noteParts.push(`Çalışma Saatleri: ${hours}`);
  if(maps) noteParts.push(`Konum: ${maps}`);
  if(insta) noteParts.push(`Instagram: https://instagram.com/${normalizeHandle(insta)}`);
  if(review) noteParts.push(`Yorumlar: ${review}`);

  const w = normalizeWhats(whats || phone);
  if(w) noteParts.push(`WhatsApp: https://wa.me/${w}`);

  noteParts.push(`Katalog ID: ${currentID}`);

  if(noteParts.length){
    lines.push(`NOTE:${sanitizeVCardValue(noteParts.join("\n"))}`);
  }

  lines.push("END:VCARD");
  return lines.join("\r\n");
}

function saveToContacts(){
  const vcf = buildVCard();
  const filename = `${(pageData.company || "isletme").replace(/[^\w\d\-]+/g,'_')}_${currentID}.vcf`;

  try{
    const blob = new Blob([vcf], { type: "text/vcard;charset=utf-8" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);

    a.click();

    setTimeout(() => {
      URL.revokeObjectURL(url);
      document.body.removeChild(a);
    }, 1500);
  } catch(e){
    const dataUri = "data:text/vcard;charset=utf-8," + encodeURIComponent(vcf);
    window.location.href = dataUri;
  }
}

function showShareToast(message){
  let toast = document.getElementById('shareToast');
  if(!toast){
    toast = document.createElement('div');
    toast.id = 'shareToast';
    toast.className = 'share-toast';
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toast.hideTimer);
  toast.hideTimer = setTimeout(() => {
    toast.classList.remove('show');
  }, 1800);
}

function shareCatalog(){
  const url = window.location.href;
  const title = (document.getElementById('companyName')?.innerText || 'Dijital Katalog').trim();

  if(navigator.share){
    navigator.share({ title, url }).catch(() => {
      showShareToast('Paylaşım iptal edildi.');
    });
    return;
  }

  if(navigator.clipboard && navigator.clipboard.writeText){
    navigator.clipboard.writeText(url).then(() => {
      showShareToast('Link panoya kopyalandı.');
    }).catch(() => {
      showShareToast('Link kopyalanamadı.');
    });
    return;
  }

  const temp = document.createElement('input');
  temp.value = url;
  document.body.appendChild(temp);
  temp.select();
  document.execCommand('copy');
  document.body.removeChild(temp);
  showShareToast('Link panoya kopyalandı.');
}
