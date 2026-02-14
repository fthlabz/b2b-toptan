// app.js - ULTRA HIZLI PERFORMANS SÜRÜMÜ

const API_URL = "https://script.google.com/macros/s/AKfycbyvtvYWLmkq8AqmCEhf_FP5fYLaliFpz_p-Jx4_miEM1vgCvHIM8qDS06A5kKP9F6W0ZA/exec";

const urlParams = new URLSearchParams(window.location.search);
const currentID = urlParams.get('id');

// Veri Modeli
let pageData = {
  company: "", slogan: "",
  phone: "", email: "", whats: "", insta: "", address: "", maps: "", review: "", hours: "",
  legal: "",
  pLink: "", vLink: "",
  daily: "",
  adminHash: "",
  flashImg: "", flashOld: "", flashNew: "", flashLabel: ""
};

/* --- YARDIMCI FONKSİYONLAR --- */
function sha256hex(str){
  return CryptoJS.SHA256(str).toString(CryptoJS.enc.Hex);
}
function storageKey(name){ return `${name}_${currentID}`; }
function encodeSafe(s){ return encodeURIComponent((s||"").trim()); }
function decodeSafe(s){ try { return decodeURIComponent(s); } catch(e){ return s; } }

function escapeHtml(str){
  return (str||"").replace(/[&<>"']/g, m => ({
    '&':'&','<':'<','>':'>','"':'"','\'':"'"
  }[m]));
}
function escapeJs(s){
  return (s||"").replace(/\\/g,'\\\\').replace(/'/g,"\\'").replace(/\n/g,' ');
}

// Drive ID Ayıklama
function getDriveId(link){
  const m = (link||"").match(/[-\w]{25,}/);
  return m ? m[0] : "";
}

// --- KRİTİK DÜZELTME: AKILLI RESİM BOYUTLANDIRMA ---
// Grid için küçük (sz=w400), Modal için orta (sz=w1000)
function driveThumb(fileId, size=400){ 
  return `https://drive.google.com/thumbnail?id=${fileId}&sz=w${size}`;
}

// İndirme Linki (ORİJİNAL BOYUT)
function driveDownloadLink(fileId){
  // "view" yerine "uc?export=download" veya "view?usp=drivesdk" kullanılabilir.
  // Kullanıcı "İndir / Aç" dediği için view daha güvenli.
  return `https://drive.google.com/file/d/${fileId}/view?usp=drivesdk`;
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
  const codeHtml = meta.code ? `<div class="meta-code">KOD: ${escapeHtml(meta.code)}</div>` : "";
  const priceHtml = meta.price ? `<div class="meta-price">${escapeHtml(meta.price)}</div>` : "";
  return `<div class="meta-box">${titleHtml}${codeHtml}${priceHtml}</div>`;
}

/* --- INIT --- */
window.onload = function() {
  if (!currentID) { document.getElementById('loading').innerHTML = "ID BULUNAMADI"; return; }
  document.getElementById('certId').innerText = currentID;

  fetch(API_URL + "?action=read&id=" + currentID)
    .then(res => res.json())
    .then(data => {
      document.getElementById('loading').style.display = 'none';

      if (data.status === "empty") {
        document.getElementById('companyName').innerText = "Toptan Katalog";
        document.getElementById('companySlogan').innerText = "Kurulum Bekleniyor";
        document.getElementById('setup-panel').style.display = 'block';
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

      document.getElementById('companyName').innerText = pageData.company || "Toptan Firma";
      document.getElementById('companySlogan').innerText = pageData.slogan || "";
      
      const vcardTitle = document.querySelector('.vcard-title');
      if(vcardTitle) vcardTitle.innerText = pageData.company || "Firma Bilgileri";

      renderFlash();
      renderGrids();
      renderFeatured();

      document.getElementById('view-panel').style.display = 'block';
    })
    .catch((e) => {
      console.error(e);
      document.getElementById('loading').innerHTML = "Bağlantı Hatası.<br>İnternetinizi kontrol edin.";
    });
};

/* --- RENDER --- */

function renderFlash(){
  const img = document.getElementById('flashImg');
  const ph  = document.getElementById('flashPlaceholder');
  const oldT = document.getElementById('oldPriceText');
  const newT = document.getElementById('newPriceText');
  const title = document.getElementById('flashTitle');

  const label = (pageData.flashLabel || "ÖZEL FIRSAT").trim();
  title.innerHTML = `<i class="fas fa-bolt"></i> ${escapeHtml(label).toUpperCase()}`;

  oldT.innerText = pageData.flashOld ? pageData.flashOld : "—";
  newT.innerText = pageData.flashNew ? pageData.flashNew : "—";

  if(pageData.flashImg){
    const id = getDriveId(pageData.flashImg);
    // Kampanya resmi biraz daha kaliteli olabilir (w800)
    const src = id ? driveThumb(id, 800) : pageData.flashImg;
    img.src = src;
    img.style.display = 'block';
    ph.style.display = 'none';
    
    document.getElementById('flashMedia').onclick = () => openMediaModal({
        title: label,
        mediaType: 'image',
        src: src, 
        realId: id, 
        metaHtml: `<div class="meta-price">Fiyat: ${pageData.flashNew || 'Sorunuz'}</div>`
    });

  } else {
    img.style.display = 'none';
    ph.style.display = 'flex';
  }
}

function buildGridPlaceholders(label, count=3){
  let html = "";
  for(let i=0; i<count; i++){
    html += `
      <div class="grid-card placeholder-card">
        <div class="grid-media placeholder-media"></div>
        <div class="grid-caption">${label}</div>
      </div>`;
  }
  return html;
}

function renderGrid(context, link, grid, label){
  if(!grid) return;
  if(!link){
    grid.parentElement.style.display = 'none';
    return;
  }

  grid.innerHTML = buildGridPlaceholders("Yükleniyor...", 3);

  fetch(API_URL + "?action=getFiles&url=" + encodeURIComponent(link))
    .then(res => res.json())
    .then(data => {
      if(data.status === "error" || !data.files || data.files.length === 0){
        grid.innerHTML = `<div class="empty-msg">Bu klasör boş.</div>`;
        return;
      }

      grid.innerHTML = "";
      // Grid için çok hafif resimler (w350 yeterli)
      const thumbSize = 350;

      data.files.slice(0, 15).forEach(file => { // Max 15 ürün
        const card = document.createElement('div');
        card.className = context === 'vitrin' ? 'grid-card vitrin-card' : 'grid-card';
        
        const name = (file.name || "").trim();
        const meta = parseProductMeta(name);
        const productTitle = (meta && meta.title) ? meta.title : (name || label);
        const thumb = driveThumb(file.id, thumbSize);

        // loading="lazy" ekledik: Ekrana gelmeyen resim yüklenmez
        if(file.type === 'video' || context === 'vitrin'){
           card.innerHTML = `
             <div class="grid-media vitrin-media">
               <img src="${thumb}" alt="" loading="lazy">
               <span class="vitrin-play"><i class="fas fa-play"></i></span>
             </div>
             <div class="grid-caption">${escapeHtml(productTitle)}</div>
           `;
           card.onclick = () => openMediaModal({
             title: productTitle,
             mediaType: 'video',
             src: `https://drive.google.com/file/d/${file.id}/preview`,
             realId: file.id,
             metaHtml: buildProductMeta(name)
           });

        } else {
           card.innerHTML = `
             <div class="grid-media">
               <img src="${thumb}" alt="" loading="lazy">
             </div>
             <div class="grid-caption">${escapeHtml(productTitle)}</div>
             <button class="offer-btn" onclick="event.stopPropagation(); orderOnWhatsApp('${escapeJs(productTitle)}', '${file.id}')">
                <i class="fab fa-whatsapp"></i> Fiyat Al
             </button>
           `;
           card.onclick = () => openMediaModal({
             title: productTitle,
             mediaType: 'image',
             src: thumb, // Modal açılırken önce küçüğü göster, modal fonksiyonu büyüğünü çekecek
             realId: file.id,
             metaHtml: buildProductMeta(name)
           });
        }
        grid.appendChild(card);
      });
    })
    .catch(err => {
      console.log(err);
      grid.innerHTML = "Yüklenemedi.";
    });
}

function renderGrids(){
  renderGrid("product", pageData.pLink, document.getElementById('productGrid'), "Ürün");
  renderGrid("vitrin", pageData.vLink, document.getElementById('vitrinGrid'), "Vitrin");
}

/* --- KURUMSAL GÖRSELLER (DÜZELTİLDİ: VİDEO DESTEKLİ) --- */
function renderFeatured(){
  const grid = document.getElementById('featuredGrid');
  if(!grid) return;
  const link = (pageData.daily || "").trim();
  
  if(!link){
    document.getElementById('featuredSection').style.display = 'none';
    return;
  }

  fetch(API_URL + "?action=getFiles&url=" + encodeURIComponent(link))
    .then(res => res.json())
    .then(data => {
      if(data.files && data.files.length){
        grid.innerHTML = "";
        data.files.slice(0, 4).forEach(file => {
           const card = document.createElement('div');
           card.className = 'grid-card featured-card';
           // Burası da küçük resim (w400)
           const thumb = driveThumb(file.id, 400);
           
           const playIcon = (file.type === 'video') 
             ? '<div class="vitrin-play" style="font-size:14px;"><i class="fas fa-play"></i></div>' 
             : '';

           card.innerHTML = `
             <div class="grid-media">
                <img src="${thumb}" alt="" loading="lazy">
                ${playIcon}
             </div>
             <div class="grid-caption" style="text-align:center;">İncele</div>
           `;
           
           card.onclick = () => openMediaModal({
             title: "Kurumsal",
             mediaType: (file.type === 'video') ? 'video' : 'image',
             src: (file.type === 'video') ? `https://drive.google.com/file/d/${file.id}/preview` : thumb,
             realId: file.id,
             metaHtml: ""
           });
           grid.appendChild(card);
        });
      }
    }).catch(()=>{});
}

/* --- MEDYA MODAL & İNDİRME --- */
function openMediaModal(payload){
  const modal = document.getElementById('mediaModal');
  const body = document.getElementById('mediaModalBody');
  const title = document.getElementById('mediaModalTitle');

  title.innerText = payload.title || "Detay";
  
  let mediaHtml = "";
  if(payload.mediaType === 'video'){
    mediaHtml = `<div class="modal-media video"><iframe src="${payload.src}" allow="autoplay; fullscreen" allowfullscreen></iframe></div>`;
  } else {
    // MODAL AÇILINCA: Biraz daha kaliteli çek (w1000) ama Full HD değil.
    // Full HD'yi sadece indir butonuna saklıyoruz.
    const mediumSrc = payload.realId ? driveThumb(payload.realId, 1000) : payload.src;
    mediaHtml = `<div class="modal-media"><img src="${mediumSrc}" alt=""></div>`;
  }

  const metaHtml = payload.metaHtml ? `<div class="modal-meta">${payload.metaHtml}</div>` : "";
  
  // DOWNLOAD BUTTON: İşte burası ORİJİNAL dosyayı verir.
  let downloadHtml = "";
  if(payload.realId){
      const dlLink = driveDownloadLink(payload.realId);
      downloadHtml = `
        <a href="${dlLink}" target="_blank" class="btn-download">
           <i class="fas fa-download"></i> Orijinal Boyut İndir / Aç
        </a>
      `;
  }

  const waHtml = `
    <button class="btn-whatsapp modal-whatsapp" onclick="orderOnWhatsApp('${escapeJs(payload.title)}', '${payload.realId||''}')">
      <i class="fab fa-whatsapp"></i> Bu Ürün İçin Fiyat Al
    </button>
  `;

  body.innerHTML = `${mediaHtml} ${metaHtml} <div class="modal-actions">${waHtml} ${downloadHtml}</div>`;
  modal.style.display = 'flex';
}

function closeMediaModal(){
  document.getElementById('mediaModal').style.display = 'none';
  document.getElementById('mediaModalBody').innerHTML = '';
}

/* --- WHATSAPP & DİĞER --- */
function normalizeWhats(w){ return (w||"").replace(/[^\d]/g,'').replace(/^0/,'90'); }

function orderOnWhatsApp(title, fileId, context){
  const num = normalizeWhats(pageData.whats || pageData.phone);
  if(!num){
    alert("Firma iletişim numarası henüz eklenmemiş.");
    return;
  }
  let text = "Merhaba, ürünleriniz hakkında bilgi almak istiyorum.";
  if(title && fileId){
    text = `Merhaba, şu ürün için fiyat/stok bilgisi alabilir miyim?\n\nÜrün: ${title}\nReferans: https://drive.google.com/file/d/${fileId}/view`;
  } else if(context){
    text = `Merhaba, ${context} hakkında bilgi almak istiyorum.`;
  }
  const url = `https://wa.me/${num}?text=${encodeURIComponent(text)}`;
  window.open(url, "_blank");
}

/* --- GALERİ (TÜMÜNÜ GÖR) --- */
function openGallery(type) {
  let link = (type === 'video') ? pageData.vLink : pageData.pLink;
  let title = (type === 'video') ? "VİTRİN VİDEOLARI" : "TÜM ÜRÜNLER";
  if(!link) return;

  const overlay = document.getElementById('gallery-overlay');
  const slider = document.getElementById('slider-track');
  document.getElementById('galTitle').innerText = title;
  
  slider.innerHTML = '<div class="spinner"><i class="fas fa-circle-notch fa-spin"></i> Yükleniyor...</div>';
  overlay.style.display = 'flex';

  fetch(API_URL + "?action=getFiles&url=" + encodeURIComponent(link))
    .then(res => res.json())
    .then(data => {
      slider.innerHTML = "";
      if(!data.files || !data.files.length){
        slider.innerHTML = '<div class="error-msg">Dosya bulunamadı.</div>';
        return;
      }
      data.files.forEach(file => {
        const slide = document.createElement('div');
        slide.className = 'slide';
        
        if(file.type === 'video'){
           const url = `https://drive.google.com/file/d/${file.id}/preview`;
           slide.innerHTML = `<div class="media-frame"><iframe src="${url}"></iframe><div class="meta">${escapeHtml(file.name)}</div></div>`;
        } else {
           // Galeride de w1000 yeterli
           const src = driveThumb(file.id, 1000);
           slide.innerHTML = `
             <div class="media-frame">
                <img src="${src}" loading="lazy">
                <div class="meta">${escapeHtml(file.name)}</div>
                <button class="btn-whatsapp" style="margin-top:10px;" onclick="orderOnWhatsApp('${escapeJs(file.name)}', '${file.id}')">Fiyat Sor</button>
             </div>`;
        }
        slider.appendChild(slide);
      });
    });
}
function closeGallery() {
  document.getElementById('gallery-overlay').style.display = 'none';
  document.getElementById('slider-track').innerHTML = "";
}

/* --- ADMIN --- */
function isAdminRemembered(){ return localStorage.getItem(storageKey("admin_ok")) === "1"; }
function rememberAdmin(){ localStorage.setItem(storageKey("admin_ok"), "1"); }

function enableEdit() {
  if(isAdminRemembered()){ openSetupPrefilled(); return; }
  
  if(!pageData.adminHash){
    if(confirm("Yönetici şifresi oluşturulmamış. Kuruluma geçilsin mi?")) openSetupPrefilled();
    return;
  }
  
  const p = prompt("Yönetici Şifresi:");
  if(sha256hex(p) === pageData.adminHash){
    rememberAdmin();
    openSetupPrefilled();
  } else {
    alert("Hatalı şifre");
  }
}

function openSetupPrefilled(){
  document.getElementById('view-panel').style.display='none';
  document.getElementById('setup-panel').style.display='block';
  
  const map = {
    'inTitle': pageData.company, 'inSlogan': pageData.slogan,
    'inPhone': pageData.phone, 'inWhats': pageData.whats, 'inEmail': pageData.email,
    'inInsta': pageData.insta, 'inAddress': pageData.address, 'inMaps': pageData.maps,
    'inReview': pageData.review, 'inHours': pageData.hours,
    'inPhotoLink': pageData.pLink, 'inVideoLink': pageData.vLink, 'inDaily': pageData.daily,
    'inFlashImg': pageData.flashImg, 'inOldPrice': pageData.flashOld, 'inNewPrice': pageData.flashNew, 'inFlashLabel': pageData.flashLabel,
    'inNot': pageData.legal
  };

  for(let id in map){
    if(document.getElementById(id)) document.getElementById(id).value = map[id] || "";
  }
}

function saveData() {
  const getVal = (id) => (document.getElementById(id).value || "").trim();
  const company = getVal('inTitle');
  if(!company) return alert("Firma Adı Zorunlu!");

  const pass = getVal('inPass');
  const pass2 = getVal('inPassConfirm');
  
  if(!pageData.adminHash && !pass) return alert("İlk kurulumda şifre belirlemelisiniz.");
  if(pass && pass !== pass2) return alert("Şifreler uyuşmuyor.");

  const btn = document.querySelector('#setup-panel .btn-gold');
  btn.innerText = "KAYDEDİLİYOR...";
  btn.disabled = true;

  let newHash = pageData.adminHash;
  if(pass) newHash = sha256hex(pass);

  const folderArr = [
    getVal('inPhotoLink'), getVal('inVideoLink'), newHash,
    encodeSafe(getVal('inSlogan')),
    encodeSafe(getVal('inPhone')), encodeSafe(getVal('inWhats')),
    encodeSafe(getVal('inInsta')), encodeSafe(getVal('inAddress')),
    encodeSafe(getVal('inMaps')),
    encodeSafe(getVal('inFlashImg')), encodeSafe(getVal('inOldPrice')),
    encodeSafe(getVal('inNewPrice')), encodeSafe(getVal('inFlashLabel')),
    encodeSafe(getVal('inEmail')), encodeSafe(getVal('inReview')),
    encodeSafe(getVal('inHours'))
  ];

  const url = `${API_URL}?action=save&id=${currentID}&title=${encodeURIComponent(company)}&not=${encodeURIComponent(getVal('inNot'))}&ses=${encodeURIComponent(getVal('inDaily'))}&folder=${encodeURIComponent(folderArr.join("|||"))}`;

  fetch(url)
    .then(res => res.json())
    .then(d => {
      if(d.status === "success"){
        rememberAdmin();
        location.reload();
      } else {
        alert("Hata oluştu.");
        btn.disabled = false;
      }
    });
}
/* CARD MODAL & INFO */
function openCardModal(){
  const m = document.getElementById('cardModal');
  setText('dispPhone', pageData.phone || pageData.whats || '-');
  setText('dispAddress', pageData.address || '-');
  setText('dispHours', pageData.hours || '-');
  setText('dispLegal', pageData.legal || 'Sipariş ve teslimat bilgisi girilmemiş.');

  showIf('infoPhone', pageData.phone || pageData.whats);
  showIf('infoAddress', pageData.address);
  showIf('infoHours', pageData.hours);
  
  if(pageData.insta){
    const iLink = document.getElementById('quickInsta');
    iLink.href = "https://instagram.com/" + pageData.insta.replace('@','');
    iLink.style.display = 'block';
    document.getElementById('cardQuickLinks').style.display = 'block';
  }
  if(pageData.maps){
    const btnMap = document.getElementById('btnMap');
    btnMap.style.display = 'block';
    btnMap.onclick = () => window.open(pageData.maps, '_blank');
  }
  m.style.display = 'flex';
}
function closeCardModal(){ document.getElementById('cardModal').style.display = 'none'; }
function setText(id, val){ document.getElementById(id).innerText = val; }
function showIf(id, condition){ document.getElementById(id).style.display = condition ? 'flex' : 'none'; }
function saveToContacts(){ alert("Rehbere ekleme özelliği cihazınızın desteklediği formatta açılacak."); }
