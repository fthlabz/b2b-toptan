/* DİJİTAL KATALOG - FULL VERSİYON (app.js)
   ----------------------------------------
*/

// 🔥 API LINKINI BURAYA YAPIŞTIR:
const API_URL = "https://script.google.com/macros/s/AKfycbyvtvYWLmkq8AqmCEhf_FP5fYLaliFpz_p-Jx4_miEM1vgCvHIM8qDS06A5kKP9F6W0ZA/exec";

const urlParams = new URLSearchParams(window.location.search);
const PAGE_ID = urlParams.get('id');

let DATA = {
    title: "", slogan: "", phone: "", insta: "", map: "", review: "",
    pLink: "", vLink: "", daily: "",
    fImg: "", fTag: "", fOld: "", fNew: "", adminHash: ""
};

window.onload = function() {
    if (!PAGE_ID) {
        document.getElementById('loading-screen').innerHTML = "<br>ID EKSİK<br><small>Linke ?id=X ekleyin</small>";
        return;
    }
    fetchData();
};

async function fetchData() {
    try {
        const response = await fetch(`${API_URL}?action=read&id=${PAGE_ID}`);
        const result = await response.json();

        document.getElementById('loading-screen').style.display = 'none';

        if (result.status === "empty") {
            toggleAdminPanel(true);
            document.getElementById('ui-company').innerText = "Kurulum Modu";
            return;
        }

        const parts = (result.folder || "").split("|||");
        
        DATA = {
            title: result.title,
            slogan: safeDec(parts[3]),
            phone: safeDec(parts[4]),
            insta: safeDec(parts[6]),
            map: safeDec(parts[8]),
            
            pLink: parts[0], vLink: parts[1], adminHash: parts[2],
            daily: result.ses,
            
            fImg: safeDec(parts[9]), fOld: safeDec(parts[10]),
            fNew: safeDec(parts[11]), fTag: safeDec(parts[12]),
            
            review: safeDec(parts[14]) // Google Yorum
        };

        updateUI();
        document.getElementById('content-panel').style.display = 'block';

    } catch (error) {
        console.error(error);
        alert("Bağlantı hatası.");
    }
}

function updateUI() {
    setText('ui-company', DATA.title);
    setText('ui-slogan', DATA.slogan);

    // Google Yorum Butonu
    if (DATA.review) {
        document.getElementById('btn-review').style.display = 'flex';
    }

    // Fırsat Alanı
    if (DATA.fImg) {
        const imgID = getDriveId(DATA.fImg);
        const imgEl = document.getElementById('ui-flash-img');
        
        imgEl.src = `https://lh3.googleusercontent.com/d/${imgID}=s1000`;
        imgEl.style.display = 'block';
        document.getElementById('ui-flash-placeholder').style.display = 'none';
        
        setText('ui-flash-tag', DATA.fTag || "FIRSAT");
        setText('ui-price-old', DATA.fOld || "-");
        setText('ui-price-new', DATA.fNew || "Tükendi");
        document.getElementById('flash-section').style.display = 'block';

        checkNotification(imgID);
    } else {
        document.getElementById('flash-section').style.display = 'none';
    }
}

// --- BİLDİRİM ---
function checkNotification(id) {
    const key = `last_deal_${PAGE_ID}`;
    if (localStorage.getItem(key) !== id) {
        setTimeout(() => {
            document.getElementById('notification-toast').classList.add('show');
            localStorage.setItem(key, id);
        }, 2000);
        setTimeout(() => { document.getElementById('notification-toast').classList.remove('show'); }, 8000);
    }
}
function scrollToFlash() {
    document.getElementById('flash-section').scrollIntoView({ behavior: 'smooth' });
    document.getElementById('notification-toast').classList.remove('show');
}

// --- GALERİLER ---
async function openGallery(type) {
    const modal = document.getElementById('gallery-modal');
    const container = document.getElementById('gallery-grid');
    const title = document.getElementById('gallery-title');
    
    let targetLink = (type === 'products') ? DATA.pLink : DATA.vLink;

    if (!targetLink) return alert("İçerik henüz eklenmemiş.");

    modal.style.display = 'flex';
    container.innerHTML = '<div class="spinner"></div>';
    container.className = 'gallery-body'; // Reset classes

    try {
        const resp = await fetch(`${API_URL}?action=getFiles&url=${encodeURIComponent(targetLink)}`);
        const res = await resp.json();
        container.innerHTML = "";

        if (!res.files || res.files.length === 0) {
            container.innerHTML = '<p style="text-align:center;color:#fff">Dosya Yok</p>'; return;
        }

        if (type === 'products') {
            title.innerText = "ÜRÜNLER";
            container.classList.add('product-grid'); // Izgara Modu
            
            res.files.forEach((file, i) => {
                const p = file.name.split("|");
                const name = (p[0]||"").trim();
                const price = (p[2]||"").trim();
                const img = `https://lh3.googleusercontent.com/d/${file.id}=s500`;
                const wp = `https://wa.me/${cleanPhone(DATA.phone)}?text=${encodeURIComponent('Merhaba, '+name+' hakkında bilgi almak istiyorum.')}`;
                
                container.innerHTML += `
                <div class="prod-card" style="animation-delay:${i*50}ms">
                    <img src="${img}" class="prod-img" loading="lazy">
                    <div class="prod-details">
                        <div class="prod-name">${name}</div>
                        <div class="prod-price">${price}</div>
                        <a href="${wp}" class="btn-sm"><i class="fab fa-whatsapp"></i> Sor</a>
                    </div>
                </div>`;
            });

        } else {
            // VİDEO SLIDER MODU
            title.innerText = "VİTRİN";
            container.classList.add('video-slider'); // Yatay Slider Modu
            
            res.files.forEach(file => {
                if (file.mimeType.includes('video')) {
                    const vUrl = `https://drive.google.com/file/d/${file.id}/preview`;
                    container.innerHTML += `
                    <div class="video-slide">
                        <iframe src="${vUrl}" allowfullscreen></iframe>
                    </div>`;
                }
            });
        }
    } catch { container.innerHTML = '<p style="text-align:center;color:red">Hata</p>'; }
}

function openFeatured() {
    if (!DATA.daily) return alert("Video yok.");
    const modal = document.getElementById('gallery-modal');
    const container = document.getElementById('gallery-grid');
    
    document.getElementById('gallery-title').innerText = "ÖNE ÇIKAN";
    modal.style.display = 'flex';
    container.className = 'gallery-body';
    
    const vID = getDriveId(DATA.daily);
    container.innerHTML = `<div style="height:100%;display:flex;align-items:center;justify-content:center"><iframe src="https://drive.google.com/file/d/${vID}/preview" style="width:100%;height:300px;border-radius:16px;border:none" allow="autoplay" allowfullscreen></iframe></div>`;
}

// --- ANA EKRANA EKLE & REHBER MODALI ---
function openInstallModal(){
    const modal = document.getElementById('install-modal');
    const txt = document.getElementById('install-text');
    const ios = document.getElementById('ios-steps');
    const android = document.getElementById('android-steps');
    
    modal.style.display = 'flex';
    
    // OS Tespiti
    const ua = navigator.userAgent.toLowerCase();
    const isIOS = /iphone|ipad|ipod/.test(ua);
    const isAndroid = /android/.test(ua);

    if(isIOS){
        txt.innerText = "iPhone/iPad için:";
        ios.style.display = 'block';
        android.style.display = 'none';
    } else if(isAndroid){
        txt.innerText = "Android için:";
        ios.style.display = 'none';
        android.style.display = 'block';
    } else {
        txt.innerText = "Tarayıcı ayarlarından 'Ana Ekrana Ekle' diyebilirsin.";
        ios.style.display = 'none';
        android.style.display = 'none';
    }
}
function closeInstallModal(){ document.getElementById('install-modal').style.display = 'none'; }
function closeGallery(){ document.getElementById('gallery-modal').style.display = 'none'; }

// --- DİĞER AKSİYONLAR ---
function goReview(){
    if(DATA.review) window.open(DATA.review, '_blank');
}
function actionWhatsApp(isFlash){
    const num = cleanPhone(DATA.phone);
    if(!num) return alert("Numara yok");
    let msg = isFlash ? `Fırsat ürünü (${DATA.fTag}) için yazıyorum.` : "Merhaba, bilgi almak istiyorum.";
    window.open(`https://wa.me/${num}?text=${encodeURIComponent(msg)}`, '_blank');
}
function actionCall(){
    const num = cleanPhone(DATA.phone);
    if(num) window.open(`tel:${num}`);
}
function actionSaveContact(){
    const vcard = `BEGIN:VCARD\nVERSION:3.0\nFN:${DATA.title}\nTEL:${cleanPhone(DATA.phone)}\nURL:${window.location.href}\nEND:VCARD`;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([vcard], {type:"text/vcard"}));
    a.download = "contact.vcf";
    a.click();
}

// --- YÖNETİCİ ---
function toggleAdminPanel(force) {
    const panel = document.getElementById('setup-panel');
    if(force) { panel.style.display = 'block'; return; }

    if(panel.style.display === 'none'){
        // Hatırlama Kontrolü
        const savedAuth = localStorage.getItem(`admin_auth_${PAGE_ID}`);
        if(savedAuth && savedAuth === DATA.adminHash){
            panel.style.display = 'block';
            fillForm();
            return;
        }

        const pass = prompt("Şifre:");
        if(CryptoJS.SHA256(pass).toString() === DATA.adminHash || !DATA.adminHash){
            // Başarılı giriş -> Kaydet
            localStorage.setItem(`admin_auth_${PAGE_ID}`, DATA.adminHash);
            panel.style.display = 'block';
            fillForm();
        } else {
            alert("Hatalı");
        }
    } else {
        panel.style.display = 'none';
    }
}

function fillForm(){
    ['title','slogan','phone','insta','map','review','plink','vlink','daily','fimg','ftag','fold','fnew'].forEach(k => {
        let val = DATA[k] || DATA[k.replace('link','Link').replace('img','Img').replace('old','Old').replace('new','New').replace('tag','Tag')]; 
        try{ document.getElementById('in-'+k).value = val || ""; }catch(e){}
    });
}

function saveSettings() {
    const btn = document.querySelector('#setup-panel button');
    btn.innerText = "...";
    
    const pass = document.getElementById('in-pass').value;
    const h = pass ? CryptoJS.SHA256(pass).toString() : DATA.adminHash;
    
    const folder = [
        getVal('in-plink'), getVal('in-vlink'), h,
        safeEnc(getVal('in-slogan')), safeEnc(getVal('in-phone')), "", 
        safeEnc(getVal('in-insta')), "", safeEnc(getVal('in-map')),
        safeEnc(getVal('in-fimg')), safeEnc(getVal('in-fold')), 
        safeEnc(getVal('in-fnew')), safeEnc(getVal('in-ftag')),"",
        safeEnc(getVal('in-review'))
    ].join("|||");

    const u = `${API_URL}?action=save&id=${PAGE_ID}&title=${safeEnc(getVal('in-title'))}&folder=${encodeURIComponent(folder)}&ses=${encodeURIComponent(getVal('in-daily'))}`;
    
    fetch(u).then(r=>r.json()).then(d=>{
        if(d.status==='success') {
            localStorage.setItem(`admin_auth_${PAGE_ID}`, h); // Yeni şifreyi hatırla
            location.reload();
        }
    });
}

// Utils
function getDriveId(u){ const m=(u||"").match(/[-\w]{25,}/); return m?m[0]:""; }
function cleanPhone(p){ return (p||"").replace(/[^\d]/g,'').replace(/^0/,'90'); }
function setText(i,t){ const e=document.getElementById(i); if(e)e.innerText=t||""; }
function getVal(i){ return document.getElementById(i).value; }
function safeEnc(s){ return encodeURIComponent((s||"").trim()); }
function safeDec(s){ try{return decodeURIComponent(s)}catch{return s} }
