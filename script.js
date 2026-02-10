// ===== Data Management (LocalStorage + Default) =====
const defaultCars = [];

// ===== Brand Normalization System =====
const BRAND_ALIASES = {
    'vw': 'Volkswagen',
    'volks': 'Volkswagen',
    'volkswagen': 'Volkswagen',
    'wolkswagen': 'Volkswagen',
    'wolkswalgen': 'Volkswagen',
    'wolks': 'Volkswagen',
    'gm': 'GM - Chevrolet',
    'chevrolet': 'GM - Chevrolet',
    'chevy': 'GM - Chevrolet',
    'gm - chevrolet': 'GM - Chevrolet',
    'nivus': 'Volkswagen',
    'tracker': 'GM - Chevrolet',
    'onix': 'GM - Chevrolet',
    'corolla': 'Toyota',
    'hilux': 'Toyota',
    'fiat': 'Fiat',
    'ford': 'Ford',
    'toyota': 'Toyota',
    'honda': 'Honda',
    'hyundai': 'Hyundai',
    'renault': 'Renault',
    'nissan': 'Nissan',
    'jeep': 'Jeep',
    'bmw': 'BMW',
    'mercedes': 'Mercedes-Benz',
    'mercedes-benz': 'Mercedes-Benz',
    'mb': 'Mercedes-Benz'
};

function normalizeBrand(input) {
    if (!input) return '';
    const cleanInput = input.toString().toLowerCase().trim();
    return BRAND_ALIASES[cleanInput] || input.trim(); // Retorna o nome padrão ou o original limpo
}

// Initialize Data
// ===== Data Service (The "Abstraction Layer") =====
// Preparando a "cama" para o banco de dados online (Supabase)
const SUPABASE_URL = 'https://ltymsdjeylwhgqtlsyaj.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx0eW1zZGpleWx3aGdxdGxzeWFqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA0MTU4MDQsImV4cCI6MjA4NTk5MTgwNH0.L_7Vyv3ZqC-pSBwVVt0sKD8EtBtCsb4o_zyX0RiMWXQ';

let supabaseClient = null;
try {
    if (SUPABASE_URL && SUPABASE_KEY && window.supabase) {
        supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    }
} catch (e) {
    console.error("Supabase fail:", e);
}

const DB = {
    // Busca todos os carros
    async getAllCars() {
        let onlineCars = [];
        let localCars = [];

        // 1. Load from Supabase (Priority Source of Truth)
        if (supabaseClient) {
            try {
                const { data, error } = await supabaseClient.from('veiculos').select('*').order('created_at', { ascending: false });
                if (!error && data) {
                    onlineCars = data.map(c => ({ ...c, createdAt: c.created_at || c.createdAt }));
                    // Clean local storage if online is healthy to prevent "zombie" cars
                    if (onlineCars.length > 0) {
                        const sanitizedLocal = onlineCars.map(c => ({ ...c, images: (c.images || []).slice(0, 1) })); // Keep only 1 thumb locally
                        localStorage.setItem('souza_cars', JSON.stringify(sanitizedLocal));
                    }
                }
            } catch (e) { console.error("Supabase load fail:", e); }
        }

        // 2. Load from LocalStorage
        try {
            const stored = JSON.parse(localStorage.getItem('souza_cars') || '[]');
            localCars = Array.isArray(stored) ? stored : [];
        } catch (e) { }

        // 3. Merge Logic (Priority to Online)
        const mergedMap = new Map();
        localCars.forEach(c => mergedMap.set(c.id, c));
        onlineCars.forEach(c => mergedMap.set(c.id, c));

        const finalData = Array.from(mergedMap.values());

        // 4. Transform and Format
        return finalData.map(car => {
            car.brand = normalizeBrand(car.brand);

            // Detector Inteligente de Motos...
            const bikeBrands = ['yamaha', 'triumph', 'harley-davidson', 'ducati', 'royal enfield', 'kawasaki', 'ktm', 'shineray', 'dafra', 'suzuki', 'bmw motorrad'];
            const b = (car.brand || '').toLowerCase();
            const t = (car.title || '').toLowerCase();
            if (bikeBrands.some(brand => b.includes(brand)) || t.includes('biz') || t.includes('cg ') || t.includes('f850') || t.includes('r1250')) {
                car.type = 'motos';
            } else if (!car.type) {
                car.type = 'carros';
            }
            return car;
        }).sort((a, b) => b.id - a.id);
    },

    async getCarById(id) {
        if (supabaseClient) {
            try {
                const { data, error } = await supabaseClient.from('veiculos').select('*').eq('id', id).single();
                if (!error && data) {
                    data.brand = normalizeBrand(data.brand);
                    return data;
                }
            } catch (e) { }
        }
        const cars = await this.getAllCars();
        return cars.find(c => c.id == id);
    },

    async saveCar(carObj) {
        if (carObj.brand === "Chevrolet") carObj.brand = "GM - Chevrolet";

        // Pre-sync security: check if images are valid URLs or heavy Base64
        const hasBase64 = (carObj.images || []).some(img => img.startsWith('data:image'));

        // 1. Try Online First (Core functionality)
        if (supabaseClient) {
            try {
                const dbPayload = {
                    id: carObj.id,
                    created_at: carObj.createdAt || new Date().toISOString(),
                    title: carObj.title,
                    brand: carObj.brand,
                    model: carObj.model,
                    year: carObj.year,
                    km: carObj.km,
                    price: carObj.price,
                    fuel: carObj.fuel,
                    badge: carObj.badge,
                    options: carObj.options,
                    lifestyle: carObj.lifestyle,
                    images: carObj.images,
                    description: carObj.description,
                    engine: carObj.engine,
                    transmission: carObj.transmission,
                    power: carObj.power,
                    color: carObj.color,
                    condition: carObj.condition, // ADICIONADO
                    type: carObj.type, // ADICIONADO
                    createdBy: carObj.createdBy,
                    lastEditedBy: carObj.lastEditedBy
                };

                const { error } = await supabaseClient.from('veiculos').upsert(dbPayload);
                if (error) throw error;
                showToast("☁️ Sincronizado na nuvem!");
            } catch (e) {
                console.error("Supabase Save Fail:", e);
                showToast("Aviso: Salvo apenas no dispositivo (sem internet)");
            }
        }

        // 2. Save Locally (Safe version)
        // Optimization: Do NOT store heavy base64 images in localStorage to prevent 5MB overflow
        const localCar = { ...carObj };
        // Optimization: Keep ONLY the first image as Base64 if needed, fallback others to logo to save space
        if (hasBase64) {
            localCar.images = (localCar.images || []).map((img, idx) => {
                if (img.startsWith('data:image')) {
                    // Keep valid cover image, remove others to save LocalStorage 5MB Limit
                    return idx === 0 ? img : 'logo.png';
                }
                return img;
            });
        }

        let currentData = [];
        try { currentData = JSON.parse(localStorage.getItem('souza_cars') || '[]'); } catch (e) { }
        const index = currentData.findIndex(c => c.id == carObj.id);
        if (index !== -1) currentData[index] = localCar;
        else currentData.unshift(localCar);

        localStorage.setItem('souza_cars', JSON.stringify(currentData.slice(0, 50))); // Limit local history
        return true;
    },

    async deleteCar(id) {
        if (supabaseClient) {
            try {
                await supabaseClient.from('veiculos').delete().eq('id', id);
            } catch (e) { }
        }
        let current = [];
        try { current = JSON.parse(localStorage.getItem('souza_cars') || '[]'); } catch (e) { }
        const filtered = current.filter(c => c.id != id);
        localStorage.setItem('souza_cars', JSON.stringify(filtered));
        return true;
    }
};

// Global State
var carsData = [];

// Função para atualizar o estado global e a UI
async function refreshAppData() {
    console.log('🔄 [RefreshData] Buscando dados frescos do DB...');
    const freshData = await DB.getAllCars();
    carsData = Array.isArray(freshData) ? freshData : [];

    console.log(`✅ [RefreshData] Estoque atualizado: ${carsData.length} veículos.`);

    // 1. Atualiza Grid de Veículos (se existir)
    if (document.getElementById('vehiclesGrid')) {
        // Se estiver na página de estoque, refresca os dropdowns e reaplica os filtros
        if (window.populateBrands) {
            window.populateBrands();
            if (window.applyAllFilters) window.applyAllFilters();
        } else {
            renderCarGrid('vehiclesGrid', carsData);
        }
    }

    // 2. Atualiza Lista Administrativa
    if (document.getElementById('adminCarList') && window.renderAdminList) window.renderAdminList();

    // 3. Atualiza Home Page (Grid e Filtros)
    if (document.getElementById('carsGrid')) {
        if (window.initHomeGrid) window.initHomeGrid();
    }

    // CRUCIAL: Notifica os filtros da Home que os dados chegaram
    if (window.updateHomeFilters) {
        window.updateHomeFilters();
    } else {
        window.isDataReady = true;
    }
}

// Função para inicializar a grid da home page
// Estado global para controle de paginação na Home
window.homeItemsLimit = 4;
window.currentHomeFilter = 'all';

function initHomeGrid() {
    const grid = document.getElementById('carsGrid');
    const loadMoreBtn = document.getElementById('loadMore');
    if (!grid) return;

    function getFilteredCars() {
        let filtered = [...(carsData || [])];
        if (window.currentHomeFilter === 'novos') {
            filtered = filtered.filter(c => {
                if (c.condition) return c.condition === 'novos';
                const kmNum = parseInt((c.km || "").toString().replace(/\D/g, '')) || 0;
                return kmNum === 0 || (c.badge && c.badge.toLowerCase().includes('0km'));
            });
        } else if (window.currentHomeFilter === 'seminovos') {
            filtered = filtered.filter(c => {
                if (c.condition) return c.condition === 'seminovos';
                const kmNum = parseInt((c.km || "").toString().replace(/\D/g, '')) || 0;
                const year = parseInt(c.year) || 0;
                return (kmNum > 0 && kmNum < 60000) || (year >= 2020);
            });
        } else if (window.currentHomeFilter === 'usados') {
            filtered = filtered.filter(c => {
                if (c.condition) return c.condition === 'usados';
                const year = parseInt(c.year) || 0;
                return (year > 0 && year < 2020);
            });
        }
        return filtered;
    }

    function updateDisplay() {
        const filtered = getFilteredCars();
        renderCarGrid('carsGrid', filtered.slice(0, window.homeItemsLimit));

        if (loadMoreBtn) {
            if (window.homeItemsLimit >= filtered.length) {
                loadMoreBtn.style.display = 'none';
            } else {
                loadMoreBtn.style.display = 'inline-block';
            }
        }
    }

    // Configuração inicial
    updateDisplay();

    // Botão Carregar Mais
    if (loadMoreBtn && !loadMoreBtn.hasAttribute('data-bound')) {
        loadMoreBtn.setAttribute('data-bound', 'true');
        loadMoreBtn.onclick = () => {
            window.homeItemsLimit += 4; // Adiciona mais uma fileira (4 veículos)
            updateDisplay();
        };
    }

    // Configurar botões de filtro
    const buttons = document.querySelectorAll('.featured-filters .filter-btn');
    if (buttons.length > 0 && !buttons[0].hasAttribute('data-bound')) {
        buttons.forEach(btn => {
            btn.setAttribute('data-bound', 'true');
            btn.onclick = () => {
                buttons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                window.currentHomeFilter = btn.dataset.filter;
                window.homeItemsLimit = 4; // Reseta limite ao mudar filtro
                updateDisplay();
            };
        });
    }

    // --- Categoria / Category Cards (Somente se não estiver vinculado) ---
    const catCards = document.querySelectorAll('.category-card');
    catCards.forEach(card => {
        if (!card.hasAttribute('data-bound')) {
            card.setAttribute('data-bound', 'true');
            card.onclick = (e) => {
                e.preventDefault();
                const cat = card.dataset.category;
                if (cat) {
                    if (cat === 'moto') {
                        window.location.href = `veiculos.html?type=motos`;
                    } else if (cat === 'esportivo') {
                        window.location.href = `veiculos.html?lifestyle=esportivos`;
                    } else {
                        window.location.href = `veiculos.html?search=${cat}`;
                    }
                }
            };
        }
    });
}

// ===== Other Data =====
const brandsData = [
    { name: "Volkswagen", logo: "https://www.carlogos.org/car-logos/volkswagen-logo.png" },
    { name: "GM - Chevrolet", logo: "https://www.carlogos.org/car-logos/chevrolet-logo.png" },
    { name: "Fiat", logo: "https://www.carlogos.org/car-logos/fiat-logo.png" },
    { name: "Toyota", logo: "https://www.carlogos.org/car-logos/toyota-logo.png" },
    { name: "Honda", logo: "https://www.carlogos.org/car-logos/honda-logo.png" },
    { name: "Jeep", logo: "https://www.carlogos.org/car-logos/jeep-logo.png" },
    { name: "BMW", logo: "https://www.carlogos.org/car-logos/bmw-logo.png" },
    { name: "Mercedes", logo: "https://www.carlogos.org/car-logos/mercedes-benz-logo.png" }
];

const faqData = [
    {
        question: "Como posso anunciar meu veículo?",
        answer: "Para anunciar seu veículo, basta clicar no botão 'Anunciar' no topo da página ou entrar em contato pelo WhatsApp."
    },
    {
        question: "Quais são as formas de pagamento aceitas?",
        answer: "Trabalhamos com diversas condições facilitadas. Entre em contato para uma proposta personalizada."
    }
];

const lifestyleData = [
    {
        id: "dia-a-dia",
        title: "Carros para o dia a dia",
        description: "Compacto, direção leve, bom consumo urbano",
        icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9h18l-1.5-4H4.5L3 9Z"/><path d="M3 9v8h3m12 0h3V9"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/></svg>`
    },
    {
        id: "familia",
        title: "Carros para família",
        description: "Mais espaço, conforto e segurança",
        icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`
    },
    {
        id: "off-road",
        title: "Off-road / Aventuras",
        description: "Tração 4x4, robustez e altura do solo",
        icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 17H3v-3l3-8h12l3 8v3h-2"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/><path d="M9 17h6"/><path d="M12 6v5"/></svg>`
    },
    {
        id: "premium",
        title: "Premium e Luxo",
        description: "Marcas exclusivas e acabamento superior",
        icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 17h14l1.5-6H3.5L5 17z"/><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M12 22v-5M9 22v-2M15 22v-2"/></svg>`
    }
];

const priceRangeData = [
    {
        min: 0,
        max: 70000,
        title: "Até R$ 70 mil",
        icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2"><path d="M12 2v20m5-17H9.5a3.5 3.5 0 100 7h5a3.5 3.5 0 110 7H6"/></svg>`
    },
    {
        min: 70000,
        max: 120000,
        title: "R$ 70 - 120 mil",
        icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2"><path d="M20 7h-9m9 4h-9m9 4h-9M4 7h3a1 1 0 011 1v8a1 1 0 01-1 1H4a1 1 0 01-1-1V8a1 1 0 011-1z"/></svg>`
    },
    {
        min: 120000,
        max: null,
        title: "Acima de R$ 120 mil",
        icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2"><path d="M12 2l9 4.5V17.5L12 22l-9-4.5V6.5L12 2zM12 12l9-4.5M12 12l-9-4.5M12 12v10"/></svg>`
    }
];

// ===== UI Helpers =====
function showToast(message, duration = 3000) {
    let container = document.querySelector('.toast-container');
    if (!container) {
        container = document.createElement('div');
        container.className = 'toast-container';
        document.body.appendChild(container);
    }
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = message; // Allow HTML for icons
    container.appendChild(toast);

    // Add active class after a tiny delay for animation
    setTimeout(() => toast.classList.add('active'), 10);

    setTimeout(() => {
        toast.classList.remove('active');
        setTimeout(() => toast.remove(), 400); // Wait for fade out
    }, duration);
}

function compressImage(file, quality = 0.7) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target.result;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const MAX_WIDTH = 1200;
                const MAX_HEIGHT = 1200;
                let width = img.width;
                let height = img.height;

                if (width > height) {
                    if (width > MAX_WIDTH) {
                        height *= MAX_WIDTH / width;
                        width = MAX_WIDTH;
                    }
                } else {
                    if (height > MAX_HEIGHT) {
                        width *= MAX_HEIGHT / height;
                        height = MAX_HEIGHT;
                    }
                }
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                resolve(canvas.toDataURL('image/jpeg', quality));
            };
            img.onerror = reject;
        };
        reader.onerror = reject;
    });
}

/**
 * Utilitário de Conversão HEIC (iPhone)
 * Converte arquivos .HEIC para .JPG de forma assíncrona
 */
async function convertHeicFile(file) {
    if (!file) return null;
    const fileName = file.name.toLowerCase();
    const isHeic = fileName.endsWith('.heic') || fileName.endsWith('.heif');

    if (!isHeic) return file;

    console.log(`[Motor-iPhone] Processando: ${file.name} | Tamanho: ${(file.size / 1024 / 1024).toFixed(2)}MB`);

    if (typeof heic2any === 'undefined') {
        showToast("⚠️ Sistema de fotos iPhone ainda carregando...", 3000);
        return file;
    }

    try {
        showToast("⚙️ Convertendo foto do iPhone... (Aguarde)", 5000);

        // Técnica Avançada: Ler como ArrayBuffer primeiro
        const buffer = await file.arrayBuffer();
        const blobForConversion = new Blob([buffer], { type: 'image/heic' });

        const result = await heic2any({
            blob: blobForConversion,
            toType: "image/jpeg",
            quality: 0.7
        });

        const finalBlob = Array.isArray(result) ? result[0] : result;
        const newName = file.name.replace(/\.(heic|heif)$/i, "") + ".jpg";

        console.log(`[Motor-iPhone] ✅ Sucesso: ${newName}`);
        return new File([finalBlob], newName, { type: "image/jpeg" });

    } catch (error) {
        console.error(`[Motor-iPhone] Erro na conversão:`, error);

        if (error.message && (error.message.includes('supported') || error.code === 2)) {
            showToast("⚠️ Esta foto do iPhone é incompatível. Tente uma foto comum ou print.", 6000);
        } else {
            showToast("❌ Erro ao converter foto do iPhone.", 3000);
        }

        return file; // Retorna original como fallback
    }
}

// ===== DOM Elements =====
const header = document.getElementById('header');
const mobileMenuBtn = document.querySelector('.mobile-menu-toggle') || document.querySelector('.mobile-menu-btn');
const mobileMenu = document.querySelector('.mobile-menu') || document.getElementById('mobileMenu');
const featuredCarouselTrack = document.getElementById('featuredCarouselTrack');
const faqList = document.getElementById('faqList');
const backToTop = document.getElementById('backToTop');

// ===== Helper Functions =====
function formatPrice(value) {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
        minimumFractionDigits: 0
    }).format(value);
}

// Helper: Title Case (Padroniza nomes com gramática correta)
function capitalizeText(text) {
    if (!text) return '';
    return text.toLowerCase()
        .split(' ')
        .map(word => {
            // Exceções para preposições comuns em nomes de carro (opcional)
            if (['de', 'da', 'do', 'dos', 'das', 'e'].includes(word)) return word;
            // Siglas conhecidas que ficam melhor em maiúsculo (Opcional, mas pedido foi gramática padrão)
            if (['bmw', 'gm', 'vw', '4x4', 'awd', 'fsi', 'tsi', 'hgt', 'ltz', 'rs', 'amg', 'gl', 'gls', 'lt', 'ls'].includes(word)) return word.toUpperCase();
            return word.charAt(0).toUpperCase() + word.slice(1);
        })
        .join(' ');
}

function whatsappInterest(carTitle) {
    const text = `Olá! Tenho interesse no ${capitalizeText(carTitle)} que vi no site.`;
    const phone = localStorage.getItem('souza_admin_phone') || "5519998383275";
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(text)}`, '_blank');
}

function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });
}

// ===== CORE: Render Logic =====
function renderCarGrid(containerId, cars) {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (cars.length === 0) {
        container.innerHTML = '<p style="color: #fff; text-align: center; grid-column: 1/-1;">Nenhum veículo encontrado com esses filtros.</p>';
        return;
    }

    container.innerHTML = cars.map(car => {
        // Pega até 5 opcionais se existirem (Consistente com Carousel) e garante que é array
        let previewOptions = [];
        if (Array.isArray(car.options)) {
            previewOptions = car.options.slice(0, 5);
        }

        return `
        <article class="car-card" onclick="window.location.href='detalhes.html?id=${car.id}'" style="cursor:pointer">
            <div class="car-image">
                <img src="${Array.isArray(car.images) && car.images.length > 0 ? car.images[0] : (car.image || 'logo.png')}" alt="${car.title}" loading="lazy" onerror="this.src='logo.png'">
                ${car.badge ? `<span class="car-badge">${car.badge}</span>` : ''}
            </div>
            <div class="car-info">
                <h3 class="car-title">${capitalizeText(car.title)}</h3>
                <div class="car-specs">
                    <span class="car-spec">${car.year}</span>
                    <span class="car-spec">${car.km}</span>
                    <span class="car-spec">${car.fuel || 'Flex'}</span>
                </div>
                ${previewOptions.length > 0
                ? `<div class="car-options-preview" style="font-size:0.75rem; color:var(--text-light); margin-bottom:10px; display:flex; flex-wrap:wrap; gap:4px; height:48px; overflow:hidden; align-content: flex-start;">
                    ${previewOptions.map(opt => `<span style="background:var(--bg-secondary); padding:2px 8px; border-radius:4px; white-space:nowrap; font-weight:500;">${opt}</span>`).join('')}
                   </div>`
                : ''}
                <div class="car-price">
                    <span class="price-value">${formatPrice(car.price)}</span>
                </div>
                <div class="car-actions" style="margin-top: 15px; display: flex; gap: 10px;">
                    <button class="btn-anunciar" style="flex: 1; padding: 10px;" onclick="event.stopPropagation(); window.location.href='detalhes.html?id=${car.id}'">Detalhes</button>
                    <button class="btn-anunciar" style="flex: 1; padding: 10px; background: #25D366; border-color: #25D366;" onclick="event.stopPropagation(); whatsappInterest('${car.title.replace(/'/g, "\\'")}')">WhatsApp</button>
                </div>
            </div>
        </article>
    `}).join('');
}

// ===== FEATURE: Filter Logic (Veiculos Page) =====
function initFilters() {
    console.log("🚀 [FilterInit] Aplicando sincronização profunda com URL...");
    const typeSelect = document.getElementById('filterType');
    const brandSelect = document.getElementById('filterBrand');
    const modelSelect = document.getElementById('filterModel');
    const searchInput = document.getElementById('searchInput');
    const searchCounter = document.getElementById('searchCounter');

    if (!brandSelect) return;

    let searchDebounce;

    // Helper: Update URL (Para manter a barra de endereço limpa e funcional)
    function updateURL(params) {
        const url = new URL(window.location);
        Object.keys(params).forEach(key => {
            const val = params[key];
            if (val && val !== 'null' && val !== '') {
                url.searchParams.set(key, val);
            } else {
                url.searchParams.delete(key);
            }
        });
        window.history.pushState({}, '', url.toString());
    }

    window.populateBrands = function () {
        const type = typeSelect ? typeSelect.value : '';
        let pool = carsData || [];
        // Filtro de tipo: se for vazio (Todos), não filtra nada
        if (type) {
            pool = pool.filter(c => (c.type || 'carros').toLowerCase() === type.toLowerCase());
        }

        const brands = [...new Set(pool.map(c => normalizeBrand(c.brand)).filter(b => b))].sort();
        const currentBrand = brandSelect.value;

        brandSelect.innerHTML = '<option value="">Todas as Marcas</option>' +
            brands.map(b => `<option value="${b}">${b}</option>`).join('');

        if (brands.includes(currentBrand)) {
            brandSelect.value = currentBrand;
        } else {
            brandSelect.value = "";
        }
    }

    function populateModels() {
        const type = typeSelect ? typeSelect.value : '';
        const brand = brandSelect.value;

        if (!brand) {
            modelSelect.innerHTML = '<option value="">Todos os Modelos</option>';
            modelSelect.disabled = true;
            return;
        }

        let pool = (carsData || []).filter(c => normalizeBrand(c.brand) === brand);
        if (type) {
            pool = pool.filter(c => (c.type || 'carros').toLowerCase() === type.toLowerCase());
        }

        const models = [...new Set(pool.map(c => c.model).filter(m => m))].sort();
        const currentModel = modelSelect.value;

        modelSelect.innerHTML = '<option value="">Todos os Modelos</option>' +
            models.map(m => `<option value="${m}">${m}</option>`).join('');

        if (models.includes(currentModel)) modelSelect.value = currentModel;
        else modelSelect.value = "";

        modelSelect.disabled = false;
    }

    function applyAllFilters() {
        let filtered = [...(carsData || [])];
        const up = new URLSearchParams(window.location.search);

        // Prioridade 1: O que está selecionado na tela
        let type = typeSelect ? typeSelect.value : '';
        let brand = brandSelect.value;
        let model = modelSelect.value;
        let searchText = searchInput ? searchInput.value.toLowerCase().trim() : '';

        // Prioridade 2: Se a tela estiver vazia, olhar a URL (Conexão Home)
        const urlSearch = up.get('search') || up.get('q');
        const urlYear = up.get('year');
        const urlPriceMax = up.get('priceMax') || up.get('max');
        const urlLifestyle = up.get('lifestyle');
        const urlCondition = up.get('condition');

        // Se o input de busca estiver vazio mas tiver na URL, sincroniza
        if (!searchText && urlSearch) {
            searchText = urlSearch.toLowerCase().trim();
            if (searchInput) searchInput.value = urlSearch;
        }

        // Aplicação da lógica de filtragem

        // 1. Tipo (Filtra se houver seleção, senão mostra todos)
        if (type) {
            filtered = filtered.filter(c => (c.type || 'carros').toLowerCase() === type.toLowerCase());
        }

        // 2. Marca e Modelo
        if (brand) filtered = filtered.filter(c => normalizeBrand(c.brand) === brand);
        if (model) filtered = filtered.filter(c => c.model === model);

        // 3. Busca Textual Global
        if (searchText) {
            const words = searchText.split(' ');
            filtered = filtered.filter(c => {
                const searchString = `${c.title} ${c.brand} ${c.model} ${c.year} ${c.engine || ''} ${c.description || ''}`.toLowerCase();
                return words.every(w => searchString.includes(w));
            });
        }

        // 4. Parâmetros Extras (URL)
        if (urlYear) filtered = filtered.filter(c => c.year == urlYear);
        if (urlLifestyle) filtered = filtered.filter(c => Array.isArray(c.lifestyle) && c.lifestyle.includes(urlLifestyle));

        if (urlCondition === 'novos' || urlCondition === 'novo') {
            filtered = filtered.filter(c => {
                if (c.condition) return c.condition === 'novos';
                const km = (c.km || "").toString().replace(/\D/g, '');
                return km === "0" || (c.badge && c.badge.toLowerCase().includes('0km'));
            });
        } else if (urlCondition === 'seminovos' || urlCondition === 'seminovo') {
            filtered = filtered.filter(c => {
                if (c.condition) return c.condition === 'seminovos';
                const km = (c.km || "").toString().replace(/\D/g, '');
                return km.length > 0 && km !== "0";
            });
        } else if (urlCondition === 'usados' || urlCondition === 'usado') {
            filtered = filtered.filter(c => {
                if (c.condition) return c.condition === 'usados';
                const year = parseInt(c.year) || 0;
                return (year > 0 && year < 2020);
            });
        }

        if (urlPriceMax && !isNaN(parseFloat(urlPriceMax))) {
            filtered = filtered.filter(c => c.price <= parseFloat(urlPriceMax));
        }

        // UI Update
        renderCarGrid('vehiclesGrid', filtered);

        // Counter UI
        if (searchCounter) {
            searchCounter.innerText = filtered.length === (carsData || []).length
                ? `${filtered.length} veículos encontrados`
                : `${filtered.length} de ${(carsData || []).length} veículos encontrados`;
        }

        // URL Sync
        updateURL({
            type: type,
            brand: brand,
            model: model,
            search: searchText,
            year: urlYear,
            max: urlPriceMax
        });
    }

    // Bindings
    if (typeSelect) typeSelect.onchange = () => { window.populateBrands(); applyAllFilters(); };
    brandSelect.onchange = () => { populateModels(); applyAllFilters(); };
    modelSelect.onchange = applyAllFilters;

    // Expor para o window para que o refreshAppData possa chamar
    window.applyAllFilters = applyAllFilters;

    const btnPageSearch = document.getElementById('btnPageSearch');
    if (btnPageSearch) {
        btnPageSearch.onclick = (e) => {
            e.preventDefault();
            applyAllFilters();
        };
    }

    if (searchInput) {
        searchInput.oninput = () => {
            clearTimeout(searchDebounce);
            searchDebounce = setTimeout(applyAllFilters, 300);
        };
    }

    // --- SINCRONIZAÇÃO DE POUSO (URL -> UI) ---
    const urlParams = new URLSearchParams(window.location.search);

    // 1. Tipo
    if (urlParams.get('type') && typeSelect) {
        typeSelect.value = urlParams.get('type');
    }

    // 2. Marcas (Preenche e Seleciona)
    window.populateBrands();
    if (urlParams.get('brand')) {
        brandSelect.value = urlParams.get('brand');
        // 3. Modelos (Preenche e Seleciona)
        populateModels();
        if (urlParams.get('model')) {
            modelSelect.value = urlParams.get('model');
        }
    }

    // Executa a filtragem inicial master
    applyAllFilters();
}



// ===== GLOBAL ADMIN FUNCTIONS (Must be before initAdmin) =====

// Global render function for Admin List
// Global render function for Admin List
window.renderAdminList = () => {
    const list = document.getElementById('adminCarList');
    if (!list) return;

    if (!carsData || carsData.length === 0) {
        list.innerHTML = '<div style="color: #666; padding: 40px; text-align: center;">Nenhum veículo cadastrado.</div>';
        return;
    }

    list.innerHTML = carsData.map(car => `
        <div class="admin-car-item">
            <div class="car-item-info">
                <img src="${Array.isArray(car.images) && car.images.length > 0 ? car.images[0] : (car.image || 'logo.png')}" 
                     class="car-item-thumb" 
                     onerror="this.src='logo.png'">
                <div>
                    <div style="color:#fff; font-weight:bold; font-size: 1.1em;">${capitalizeText(car.title)}</div>
                    <div style="color:#888; font-size:0.9em; margin-top: 5px;">
                        ${car.year} | ${car.fuel || 'Flex'} <br>
                        <div style="display:flex; gap:5px; margin-top:5px; flex-wrap:wrap;">
                            <span style="background: #222; color: #4A90E2; padding: 2px 6px; border-radius: 4px; font-size: 0.75em; font-weight:bold;">Cód: ${car.code || 'N/A'}</span>
                            <span style="background: #222; color: #d4af37; padding: 2px 6px; border-radius: 4px; font-size: 0.75em; font-weight:bold;">${car.createdBy || 'Sistema'}</span>
                            ${car.condition ?
            `<span style="background: #111; border: 1px solid #d4af37; color: #d4af37; padding: 1px 6px; border-radius: 4px; font-size: 0.75em; font-weight:bold; text-transform:uppercase;">${car.condition === 'novos' ? '0KM' : car.condition === 'seminovos' ? 'Seminovo' : 'Usado'}</span>` :
            `<span style="background: #222; color: #666; padding: 1px 6px; border-radius: 4px; font-size: 0.7em; font-style:italic; border:1px dashed #444;">Pendente</span>`
        }
                        </div>
                    </div>
                </div>
            </div>
            
            <div style="display: flex; flex-direction: column; gap: 10px; width: 100%;">
                <div style="color:#fff; font-weight:bold; font-size: 1.1em; text-align: right;" class="car-item-price">${formatPrice(car.price)}</div>
                
                <div class="admin-car-actions" style="display:grid; grid-template-columns: 1fr 1fr 1fr; gap:10px;">
                    <button onclick="window.open('detalhes.html?id=${car.id}', '_blank')" 
                            style="background:#333; color:white; border:1px solid #444; padding:10px; border-radius:4px; cursor:pointer; font-weight:600;">
                        Visualizar
                    </button>
                    <button onclick="editCar(${car.id})" 
                            style="background:#d4af37; color:black; border:none; padding:10px; border-radius:4px; cursor:pointer; font-weight:600;">
                        Editar
                    </button>
                    <button onclick="deleteCar(${car.id})" 
                            style="background:transparent; border:1px solid #ff3333; color:#ff3333; padding:10px; border-radius:4px; cursor:pointer; font-weight:600;">
                        Excluir
                    </button>
                </div>
            </div>
        </div>
    `).map(html => html.trim()).join('');
};

// Delete Car Function (GLOBAL)
window.deleteCar = async (id) => {
    if (!confirm('Tem certeza que deseja excluir este veículo?')) return;
    try {
        await DB.deleteCar(id);
        await refreshAppData();
        if (window.renderAdminList) window.renderAdminList();
        showToast('Veículo excluído com sucesso!');
    } catch (e) {
        showToast('Erro ao excluir');
    }
};

// Edit Car Function (GLOBAL)
// Edit Car Function (GLOBAL)
window.editCar = (id) => {
    // 1. Switch to "Cadastro" tab immediately
    if (typeof AdminTabs !== 'undefined') {
        AdminTabs.open('cadastro');
        setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 100);
    }
    else if (window.AdminTabs) {
        window.AdminTabs.open('cadastro');
        setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 100);
    }

    const car = carsData.find(c => c.id == id);
    if (!car) {
        showToast('Veículo não encontrado');
        return;
    }

    const form = document.getElementById('addCarForm');
    if (!form) return;

    // Reset global Fipe names to force fallback during edit save if not changed
    window.selectedBrandName = "";
    window.selectedModelName = "";

    // 2. Populate basic fields
    form.price.value = car.price;
    form.km.value = car.km.replace(' km', '');

    // 3. FIPE Selects Placeholder Strategy (AVOID BLOCKING 'REQUIRED' VALIDATION)
    const brandSel = document.getElementById('brandSelect');
    const modelSel = document.getElementById('modelSelect');
    const yearSel = document.getElementById('yearSelect');
    const verSel = document.getElementById('versionSelect');

    if (brandSel) {
        // Set value to existing brand so 'required' validation passes
        brandSel.innerHTML = `<option value="${car.brand}">${car.brand}</option>` + brandSel.innerHTML;
        brandSel.value = car.brand;
    }
    if (modelSel) {
        modelSel.innerHTML = `<option value="${car.model}">${car.model}</option>`;
        modelSel.value = car.model;
        modelSel.disabled = false;
    }
    if (yearSel) {
        yearSel.innerHTML = `<option value="${car.year}">${car.year}</option>`;
        yearSel.value = car.year;
        yearSel.disabled = false;
    }
    if (verSel) {
        verSel.innerHTML = `<option value="${car.title}">${car.title}</option>`;
        verSel.value = car.title;
        verSel.disabled = false;
    }

    // 3.1 Description & Specs
    if (form.description) form.description.value = car.description || '';
    if (form.engine) form.engine.value = car.engine || '';
    if (form.transmission) form.transmission.value = car.transmission || '';
    if (form.power) form.power.value = car.power || '';
    if (form.color) form.color.value = car.color || '';
    if (form.condition) form.condition.value = car.condition || 'seminovos';

    // 4. Pre-check checkboxes (Options & Lifestyle)
    document.querySelectorAll('input[name="carOptions"]').forEach(cb => {
        cb.checked = car.options && car.options.includes(cb.value);
    });

    document.querySelectorAll('input[name="lifestyle"]').forEach(cb => {
        cb.checked = car.lifestyle && car.lifestyle.includes(cb.value);
    });

    // 5. Setup hidden ID for update mode
    let idInput = form.querySelector('[name="carId"]');
    if (!idInput) {
        idInput = document.createElement('input');
        idInput.type = 'hidden'; idInput.name = 'carId';
        form.appendChild(idInput);
    }
    idInput.value = car.id;

    // 5.1 Load Images into state for ordering
    const carImages = Array.isArray(car.images) && car.images.length > 0 ? car.images : (car.image ? [car.image] : []);

    // Filter out potential broken URLs from the past
    window.carImagesState = carImages
        .filter(url => url && typeof url === 'string' && url.length > 15 && !url.includes('undefined'))
        .map(url => ({ type: 'url', src: url }));

    if (typeof window.renderImagePreviews === 'function') window.renderImagePreviews();

    // 6. Scroll visibility
    form.scrollIntoView({ behavior: 'smooth', block: 'start' });

    // 7. Update button text
    const submitBtn = form.querySelector('button[type="submit"]');
    if (submitBtn) submitBtn.innerText = 'SALVAR ALTERAÇÕES';

    showToast(`Editando: ${car.title}`);
};

// ===== FEATURE: Admin Logic (FIPE + Options) =====
function initAdmin() {
    const form = document.getElementById('addCarForm');
    const list = document.getElementById('adminCarList');
    if (!form || !list) return;

    // FIPE Elements
    const brandSelect = document.getElementById('brandSelect');
    const modelSelect = document.getElementById('modelSelect');
    const yearSelect = document.getElementById('yearSelect');
    const versionSelect = document.getElementById('versionSelect'); // We might use this differently or hide if redundant

    // Logout Logic
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            localStorage.removeItem('souza_session');
            window.location.href = 'login.html';
        });
    }

    // State (Global within script.js to allow editCar resets)
    window.selectedBrandName = '';
    window.selectedModelName = '';

    // Manual Entry States (Exposed to window for scope accessibility in Parser)
    window.isBrandManual = false;
    window.isModelManual = false;
    window.isYearManual = false;

    // Image Order State
    window.carImagesState = []; // Array of { type: 'file'|'url', src: string|File }

    // FIPE & Options Essentials
    const FIPE_BASE = 'https://parallelum.com.br/fipe/api/v1';
    let currentVehicleType = 'carros';
    const optionsContainer = document.getElementById('optionsContainer');
    const newOptionInput = document.getElementById('newOptionInput');
    const btnAddOption = document.getElementById('btnAddOption');

    window.toggleManualBrand = () => {
        window.isBrandManual = !window.isBrandManual;
        const select = document.getElementById('brandSelect');
        const input = document.getElementById('brandManualInput');

        if (window.isBrandManual) {
            select.style.display = 'none';
            select.required = false;
            input.style.display = 'block';
            input.required = true;
            // Also force model to manual if brand is manual
            if (!window.isModelManual) window.toggleManualModel();
        } else {
            select.style.display = 'block';
            select.required = true;
            input.style.display = 'none';
            input.required = false;
        }
    };

    window.toggleManualModel = () => {
        window.isModelManual = !window.isModelManual;
        const select = document.getElementById('modelSelect');
        const input = document.getElementById('modelManualInput');

        if (window.isModelManual) {
            select.style.display = 'none';
            select.required = false;
            input.style.display = 'block';
            input.required = true;
            // NEW: Also enable manual year entry automatically when model is manual
            if (!window.isYearManual) window.toggleManualYear();
        } else {
            select.style.display = 'block';
            select.required = true;
            input.style.display = 'none';
            input.required = false;
        }
    };

    window.toggleManualYear = () => {
        window.isYearManual = !window.isYearManual;
        const select = document.getElementById('yearSelect');
        const input = document.getElementById('yearManualInput');

        if (window.isYearManual) {
            select.style.display = 'none';
            select.required = false;
            input.style.display = 'block';
            input.required = true;
        } else {
            select.style.display = 'block';
            select.required = true;
            input.style.display = 'none';
            input.required = false;
        }
    };

    window.toggleManualVersion = () => {
        window.isVersionManual = !window.isVersionManual;
        const select = document.getElementById('versionSelect');
        const input = document.getElementById('versionManualInput');

        if (window.isVersionManual) {
            select.style.display = 'none';
            select.required = false;
            input.style.display = 'block';
            input.required = true;
        } else {
            select.style.display = 'block';
            select.required = true;
            input.style.display = 'none';
            input.required = false;
        }
    };

    window.toggleVehicleType = () => {
        const select = document.getElementById('vehicleTypeSelect');
        if (select) {
            currentVehicleType = select.value;
            loadBrands();
        }
    };

    // --- Image Previews & Ordering (DRAG & DROP) ---
    const imageInput = document.getElementById('carImageFile');
    const previewContainer = document.getElementById('imagePreviews');
    let draggedItemIndex = null; // Track dragged item

    window.renderImagePreviews = () => {
        if (!previewContainer) return;
        previewContainer.innerHTML = '';

        window.carImagesState.forEach((imgObj, index) => {
            const wrapper = document.createElement('div');
            // Enable Drag
            wrapper.draggable = true;
            wrapper.dataset.index = index;
            wrapper.style.cssText = 'position:relative; flex-shrink:0; width:100px; height:80px; border:1px solid #333; border-radius:4px; overflow:hidden; background:#222; cursor:grab; transition: all 0.2s ease;';

            const displaySrc = imgObj.type === 'file' ? URL.createObjectURL(imgObj.src) : imgObj.src;

            wrapper.innerHTML = `
                <img src="${displaySrc}" style="width:100%; height:100%; object-fit:cover; pointer-events:none;" onerror="this.onerror=null; this.src='https://via.placeholder.com/100x80?text=Erro'; this.style.opacity='0.5';">
                <div style="position:absolute; bottom:0; left:0; right:0; background:rgba(0,0,0,0.7); display:flex; justify-content:flex-end; padding:2px;">
                    <button type="button" onclick="window.removeImage(${index})" style="background:none; border:none; color:#ff4444; cursor:pointer; font-size:12px; font-weight:bold; padding:0 5px;">✕</button>
                </div>
                ${index === 0 ? '<div style="position:absolute; top:2px; left:2px; background:#d4af37; color:black; font-size:8px; font-weight:bold; padding:2px; border-radius:2px;">CAPA</div>' : ''}
            `;

            // Drag Events
            wrapper.addEventListener('dragstart', (e) => {
                draggedItemIndex = index;
                e.dataTransfer.effectAllowed = 'move';
                wrapper.style.opacity = '0.5';
                wrapper.style.borderColor = '#d4af37';
            });

            wrapper.addEventListener('dragend', () => {
                wrapper.style.opacity = '1';
                wrapper.style.borderColor = '#333';
                draggedItemIndex = null;
            });

            wrapper.addEventListener('dragover', (e) => {
                e.preventDefault(); // Necessary for drop
                e.dataTransfer.dropEffect = 'move';
                wrapper.style.transform = 'scale(1.05)';
            });

            wrapper.addEventListener('dragleave', () => {
                wrapper.style.transform = 'scale(1)';
            });

            wrapper.addEventListener('drop', (e) => {
                e.preventDefault();
                wrapper.style.transform = 'scale(1)';

                if (draggedItemIndex !== null && draggedItemIndex !== index) {
                    // Reorder Array
                    const movedItem = window.carImagesState[draggedItemIndex];
                    window.carImagesState.splice(draggedItemIndex, 1);
                    window.carImagesState.splice(index, 0, movedItem);

                    // Re-render
                    window.renderImagePreviews();
                }
            });

            previewContainer.appendChild(wrapper);
        });
    };

    window.moveImage = (index, direction) => {
        const newIndex = index + direction;
        if (newIndex < 0 || newIndex >= window.carImagesState.length) return;
        const temp = window.carImagesState[index];
        window.carImagesState[index] = window.carImagesState[newIndex];
        window.carImagesState[newIndex] = temp;
        window.renderImagePreviews();
    };

    window.removeImage = (index) => {
        window.carImagesState.splice(index, 1);
        window.renderImagePreviews();
    };

    if (imageInput) {
        imageInput.addEventListener('change', async (e) => {
            const files = Array.from(e.target.files);
            if (!files.length) return;

            console.log("Iniciando imagens...");

            // Bloquear botão de salvar durante processamento para segurança
            const submitBtn = document.querySelector('button[type="submit"]');
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.style.opacity = '0.5';
                submitBtn.innerText = 'PROCESSANDO FOTOS...';
            }

            for (const file of files) {
                try {
                    // Usar o novo utilitário global de conversão
                    const processedFile = await convertHeicFile(file);

                    if (processedFile !== file) {
                        showToast(`✅ Foto do iPhone convertida!`, 1500);
                    }

                    window.carImagesState.push({ type: 'file', src: processedFile });
                    window.renderImagePreviews();

                } catch (err) {
                    console.error("[Upload] Erro ao processar arquivo:", file.name, err);
                    showToast(`❌ Erro no arquivo: ${file.name}.`);
                    if (!file.name.toLowerCase().endsWith('.heic')) {
                        window.carImagesState.push({ type: 'file', src: file });
                        window.renderImagePreviews();
                    }
                }
            }

            // Restaurar botão
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.style.opacity = '1';
                submitBtn.innerText = 'SALVAR VEÍCULO';
            }
            imageInput.value = '';
            console.log("[Google-Engine] Frequência de processamento finalizada.");
        });
    }

    // --- Options System Logic ---
    function getStoredOptions() {
        // Reset cache logic for consistency
        let stored = [];
        try {
            const temp = JSON.parse(localStorage.getItem('souza_options'));
            if (temp && temp.length < 20) {
                localStorage.removeItem('souza_options');
            } else {
                stored = temp;
            }
        } catch (e) { localStorage.removeItem('souza_options'); }

        // Default seed - Lista estendida
        const defaults = [
            "Ar Condicionado", "Ar Condicionado Digital", "Direção Hidráulica", "Direção Elétrica",
            "Vidro Elétrico", "Trava Elétrica", "Alarme", "Airbag Duplo", "Airbag Lateral",
            "Freios ABS", "Freio de Mão Eletrônico", "Controle de Estabilidade", "Controle de Tração",
            "Som Multimídia", "Bluetooth", "USB", "GPS Integrado", "CarPlay / Android Auto",
            "Câmera de Ré", "Sensor de Estacionamento", "Sensor de Estacionamento Dianteiro", "Câmera 360",
            "Bancos de Couro", "Ajuste Elétrico dos Bancos", "Aquecimento dos Bancos",
            "Teto Solar", "Teto Panorâmico",
            "Rodas de Liga Leve", "Rodas de Liga Leve Diamantadas", "Faróis de LED", "Faróis Full LED", "Faróis de Xenon", "Farol de Milha",
            "Computador de Bordo", "Piloto Automático", "Piloto Automático Adaptativo (ACC)", "Painel Digital (Virtual Cockpit)",
            "Chave Presencial", "Partida Start/Stop", "Partida Remota", "Carregador por Indução",
            "Retrovisores Elétricos", "Rebatimento de Retrovisores", "Assistente de Permanência em Faixa",
            "Sensor de Chuva", "Sensor de Luz", "Volante Multifuncional", "Paddle Shifts",
            "Alerta de Ponto Cego", "Assistente de Partida em Rampa (Auto Hold)", "Iluminação Interna em LED"
        ].map(opt => opt.charAt(0).toUpperCase() + opt.slice(1).toLowerCase().replace(/\s([a-z])/g, (match) => match.toUpperCase()));

        if (!stored || !Array.isArray(stored)) {
            stored = [];
        }

        // Merge defaults into stored to ensure new defaults appear
        // Using Set to avoid duplicates
        const merged = [...new Set([...defaults, ...stored])].sort();

        localStorage.setItem('souza_options', JSON.stringify(merged));
        return merged;
    }

    window.filterOptions = () => {
        const query = document.getElementById('searchOptionInput').value.toLowerCase();
        const items = optionsContainer.querySelectorAll('label');
        items.forEach(item => {
            const text = item.innerText.toLowerCase();
            item.style.display = text.includes(query) ? 'inline-flex' : 'none';
        });
    };

    function renderOptions() {
        const options = getStoredOptions();

        // 1. Create Summary Container if not exists
        let summaryDiv = document.getElementById('optionsSummary');
        if (!summaryDiv) {
            summaryDiv = document.createElement('div');
            summaryDiv.id = 'optionsSummary';
            summaryDiv.style.cssText = 'margin-bottom: 15px; padding: 10px; background: #1a1a1a; border: 1px dashed #444; border-radius: 6px; min-height: 40px; display: flex; flex-wrap: wrap; gap: 8px; font-size: 0.85em; color: #aaa;';
            summaryDiv.innerHTML = '<span style="width:100%; font-style:italic;">Nenhum opcional selecionado...</span>';
            // Insert BEFORE the grid container
            optionsContainer.parentNode.insertBefore(summaryDiv, optionsContainer);
        }

        // 2. Render Checkboxes
        optionsContainer.innerHTML = options.map(opt => `
            <label style="display: inline-flex; align-items: center; gap: 5px; background: #222; padding: 5px 10px; border-radius: 4px; cursor: pointer; border: 1px solid #333;">
                <input type="checkbox" name="carOptions" value="${opt}" onchange="updateOptionsSummary()">
                <span style="color: #ddd; font-size: 0.9em;">${opt}</span>
            </label>
        `).join('');

        // 3. Helper to Update Summary
        window.updateOptionsSummary = () => {
            const checked = Array.from(document.querySelectorAll('input[name="carOptions"]:checked')).map(cb => cb.value);
            if (checked.length === 0) {
                summaryDiv.innerHTML = '<span style="width:100%; font-style:italic;">Nenhum opcional selecionado...</span>';
            } else {
                summaryDiv.innerHTML = checked.map(val => `
                    <span style="background: #d4af3720; color: #d4af37; border: 1px solid #d4af3750; padding: 2px 8px; border-radius: 12px; display: flex; align-items: center; gap: 5px;">
                        ${val} <button type="button" onclick="uncheckOption('${val}')" style="background:none; border:none; color:#d4af37; font-weight:bold; cursor:pointer; font-size:1.1em; line-height:1;">×</button>
                    </span>
                `).join('');
            }
        };

        window.uncheckOption = (val) => {
            const cb = document.querySelector(`input[name="carOptions"][value="${val}"]`);
            if (cb) {
                cb.checked = false;
                updateOptionsSummary();
            }
        };

        // Re-apply filter if someone is typing
        window.filterOptions();
        window.updateOptionsSummary(); // Init
    }



    function addNewOption() {
        const val = newOptionInput.value.trim();
        if (!val) return;

        // Check duplicates (case insensitive)
        const current = getStoredOptions();
        if (current.some(o => o.toLowerCase() === val.toLowerCase())) {
            alert('Este opcional já existe!');
            return;
        }

        current.push(val);
        // Sort alphabetically
        current.sort();

        localStorage.setItem('souza_options', JSON.stringify(current));
        renderOptions();
        newOptionInput.value = '';

        // Auto-check the newly created option
        setTimeout(() => {
            const inputs = document.getElementsByName('carOptions');
            for (let inp of inputs) {
                if (inp.value === val) inp.checked = true;
            }
        }, 50);
    }

    btnAddOption.addEventListener('click', addNewOption);
    newOptionInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            addNewOption();
        }
    });

    // --- FIPE Logic ---
    // --- FIPE Logic ---
    async function loadBrands() {
        try {
            brandSelect.innerHTML = '<option value="">Carregando...</option>';
            const res = await fetch(`${FIPE_BASE}/${currentVehicleType}/marcas`);
            if (!res.ok) throw new Error('API Error');
            let brands = await res.json();

            // FORÇA: Renomear Chevrolet para GM - Chevrolet para facilitar busca
            brands = brands.map(b => {
                if (b.nome.toUpperCase() === 'CHEVROLET') {
                    return { ...b, nome: 'GM - Chevrolet' };
                }
                return b;
            });

            // Merge with Custom Persistent Brands
            const customBrandsStored = JSON.parse(localStorage.getItem('souza_custom_brands') || '[]');
            const customBrandsObjects = customBrandsStored.map(n => ({ codigo: 'custom', nome: n }));

            let allBrands = [...customBrandsObjects, ...brands];

            // Sort Alphabetically
            allBrands.sort((a, b) => a.nome.localeCompare(b.nome));

            brandSelect.innerHTML = '<option value="">Selecione a Marca</option>' +
                allBrands.map(b => `<option value="${b.codigo}">${b.nome}</option>`).join('');
            brandSelect.disabled = false;
        } catch (error) {
            console.warn("FIPE API Error, using fallback:", error);
            const fallbackBrands = [
                { codigo: '23', nome: 'GM - Chevrolet' },
                { codigo: '21', nome: 'Fiat' },
                { codigo: '59', nome: 'Volkswagen' },
                { codigo: '22', nome: 'Ford' },
                { codigo: '26', nome: 'Hyundai' },
                { codigo: '25', nome: 'Honda' },
                { codigo: '56', nome: 'Toyota' },
                { codigo: '29', nome: 'Jeep' },
                { codigo: '13', nome: 'BMW' },
                { codigo: '39', nome: 'Mercedes-Benz' },
                { codigo: '7', nome: 'Audi' }
            ];

            const customBrandsStored = JSON.parse(localStorage.getItem('souza_custom_brands') || '[]');
            const allBrands = [...customBrandsStored.map(n => ({ codigo: 'custom', nome: n })), ...fallbackBrands];
            allBrands.sort((a, b) => a.nome.localeCompare(b.nome));

            brandSelect.innerHTML = '<option value="">Selecione a Marca (Servidor Offline)</option>' +
                allBrands.map(b => `<option value="${b.codigo}">${b.nome}</option>`).join('');
            brandSelect.disabled = false;
        }
    }

    brandSelect.addEventListener('change', async () => {
        const brandCode = brandSelect.value;
        const vehicleType = document.getElementById('vehicleTypeSelect') ? document.getElementById('vehicleTypeSelect').value : 'carros';
        window.selectedBrandName = brandSelect.options[brandSelect.selectedIndex].text;

        modelSelect.innerHTML = '<option value="">Carregando...</option>';
        yearSelect.innerHTML = '<option value="">Selecione um modelo primeiro</option>';
        versionSelect.innerHTML = '<option value="">Selecione um ano primeiro</option>';
        modelSelect.disabled = true;
        yearSelect.disabled = true;
        versionSelect.disabled = true;

        if (!brandCode) return;

        // NEW: If custom brand, skip FIPE and go to manual model
        if (brandCode === 'custom') {
            if (!isModelManual) window.toggleManualModel();
            return;
        }

        try {
            const res = await fetch(`${FIPE_BASE}/${vehicleType}/marcas/${brandCode}/modelos`);
            const data = await res.json(); // { modelos: [], anos: [] }

            // Populate models
            modelSelect.innerHTML = '<option value="">Selecione o Modelo</option>' +
                data.modelos.map(m => `<option value="${m.codigo}">${m.nome}</option>`).join('');
            modelSelect.disabled = false;
        } catch (error) {
            console.error(error);
        }
    });

    modelSelect.addEventListener('change', async () => {
        const brandCode = brandSelect.value;
        const modelCode = modelSelect.value;
        const vehicleType = document.getElementById('vehicleTypeSelect') ? document.getElementById('vehicleTypeSelect').value : 'carros';
        window.selectedModelName = modelSelect.options[modelSelect.selectedIndex].text;

        yearSelect.innerHTML = '<option value="">Carregando...</option>';
        yearSelect.disabled = true;

        if (!modelCode) return;

        try {
            const res = await fetch(`${FIPE_BASE}/${vehicleType}/marcas/${brandCode}/modelos/${modelCode}/anos`);
            const years = await res.json();

            yearSelect.innerHTML = '<option value="">Selecione o Ano</option>' +
                years.map(y => `<option value="${y.codigo}">${y.nome}</option>`).join('');
            yearSelect.disabled = false;
        } catch (error) {
            console.error(error);
        }
    });

    yearSelect.addEventListener('change', async () => {
        // When year is selected, we technically have the specific version in FIPE terms
        // We can fetch data to get price reference
        const brandCode = brandSelect.value;
        const modelCode = modelSelect.value;
        const yearCode = yearSelect.value;
        const vehicleType = document.getElementById('vehicleTypeSelect') ? document.getElementById('vehicleTypeSelect').value : 'carros';

        if (!yearCode) return;

        try {
            const res = await fetch(`${FIPE_BASE}/${vehicleType}/marcas/${brandCode}/modelos/${modelCode}/anos/${yearCode}`);
            const details = await res.json();

            // Auto-fill price suggestion
            // FIPE Price string: "R$ 100.000,00"
            const fipePrice = details.Valor.replace('R$ ', '').replace('.', '').replace(',', '.');
            form.price.value = parseFloat(fipePrice);

            // Use versionSelect to show the 'Fipe Name' as a confirmation
            versionSelect.innerHTML = `<option value="${details.Modelo}" selected>${details.Modelo}</option>`;
            versionSelect.disabled = false;

        } catch (error) {
            console.error(error);
        }
    });


    // --- Render List Logic ---
    renderAdminList();

    // --- Form Submit Logic ---
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        try {
            const editIdInput = form.querySelector('[name="carId"]');
            const editId = editIdInput ? editIdInput.value : null;
            let imagesData = [];
            let finalUrls = [];

            // Image Upload Strategy
            if (window.carImagesState.length > 0) {
                try {
                    const btn = form.querySelector('button[type="submit"]');
                    const originalBtnText = btn.innerText;
                    btn.innerText = 'Processando fotos...';
                    btn.disabled = true;

                    let imgCount = 0;
                    const totalImgs = window.carImagesState.length;

                    for (let imgObj of window.carImagesState) {
                        imgCount++;
                        btn.innerText = `Enviando ${imgCount}/${totalImgs}...`;

                        if (imgObj.type === 'url') {
                            if (imgObj.src && imgObj.src.length > 10) {
                                finalUrls.push(imgObj.src);
                            }
                        } else {
                            // Upload Direto do Arquivo (Objetivo e Rápido)
                            const file = imgObj.src;

                            // Se o arquivo for maior que 2MB, fazemos uma compressão rápida no cliente
                            // Se for menor, enviamos o original para máxima qualidade e velocidade
                            let blobToUpload = file;
                            if (file.size > 2 * 1024 * 1024) {
                                try {
                                    const compressedBase64 = await compressImage(file, 0.7);
                                    const dataURLtoBlob = (dataurl) => {
                                        const arr = dataurl.split(','), mime = arr[0].match(/:(.*?);/)[1];
                                        const bstr = atob(arr[1]);
                                        let n = bstr.length;
                                        const u8arr = new Uint8Array(n);
                                        while (n--) u8arr[n] = bstr.charCodeAt(n);
                                        return new Blob([u8arr], { type: mime });
                                    };
                                    blobToUpload = dataURLtoBlob(compressedBase64);
                                } catch (e) {
                                    console.warn("Falha na compressão, enviando original...");
                                }
                            }

                            const safeName = `img_${Date.now()}_${Math.random().toString(36).substring(7)}`;
                            const fileName = `${safeName}.jpg`;

                            let uploadSuccess = false;
                            if (supabaseClient) {
                                try {
                                    const { error, data } = await supabaseClient.storage.from('car-photos').upload(fileName, blobToUpload, {
                                        contentType: 'image/jpeg',
                                        cacheControl: '3600'
                                    });

                                    if (!error) {
                                        const { data: publicData } = supabaseClient.storage.from('car-photos').getPublicUrl(fileName);
                                        if (publicData) {
                                            finalUrls.push(publicData.publicUrl);
                                            uploadSuccess = true;
                                        }
                                    } else {
                                        console.warn("Supabase Error:", error);
                                    }
                                } catch (e) { console.error("Supabase Exception:", e); }
                            }

                            // Fallback: Upload failed or Offline -> Use Base64 (Local)
                            if (!uploadSuccess) {
                                showToast(`⚠️ Upload falhou, salvando localmente: ${file.name}`);
                                try {
                                    const base64Local = await fileToBase64(blobToUpload);
                                    finalUrls.push(base64Local);
                                } catch (e) {
                                    console.error("Base64 conversion failed", e);
                                }
                            }
                        }
                    }

                } catch (imgError) {
                    console.error("Erro no processamento de fotos:", imgError);
                } finally {
                    const btn = form.querySelector('button[type="submit"]');
                    if (btn) {
                        btn.innerText = originalBtnText;
                        btn.disabled = false;
                    }
                }
                imagesData = finalUrls.filter(u => u && u.trim() !== "");
            } else if (editId) {
                const existingCar = (carsData || []).find(c => c.id == editId);
                imagesData = existingCar ? (existingCar.images || []) : [];
            }

            // Collect selected options (Robust Method)
            const checkedOptions = [];
            // Query strictly for CHECKED checkboxes with name="carOptions"
            const optionsNodes = document.querySelectorAll('input[name="carOptions"]:checked');
            if (optionsNodes.length > 0) {
                optionsNodes.forEach(cb => {
                    if (cb.value && cb.value.trim() !== "") {
                        checkedOptions.push(cb.value);
                    }
                });
            }

            const selectedLifestyle = [];
            document.querySelectorAll('input[name="lifestyle"]:checked').forEach(cb => {
                selectedLifestyle.push(cb.value);
            });

            // Detect Edit Mode and find existing car safely
            const existingCar = editId ? carsData.find(c => c.id == editId) : null;

            // Get FIPE data or Manual data
            let brand = window.isBrandManual ? document.getElementById('brandManualInput').value : window.selectedBrandName;
            let model = window.isModelManual ? document.getElementById('modelManualInput').value : window.selectedModelName;

            // Fix Year Logic
            let yearText = "";
            if (window.isYearManual) {
                yearText = document.getElementById('yearManualInput').value;
            } else {
                // If select is disabled or empty but we are in edit mode, trust existing car
                if (editId && existingCar && (!yearSelect.value || yearSelect.value === "")) {
                    yearText = existingCar.year;
                } else {
                    yearText = yearSelect.options[yearSelect.selectedIndex] ? yearSelect.options[yearSelect.selectedIndex].text : '';
                }
            }

            // Fix Version Logic (Manual vs Select)
            let versionText = "";
            if (window.isVersionManual) {
                versionText = document.getElementById('versionManualInput').value;
            } else {
                if (editId && existingCar && (!versionSelect.value || versionSelect.value === "")) {
                    // If editing and select is empty, use existing title part if possible or just rely on brand model
                    versionText = ""; // Hard to extract exact version string from title reliably without FIPE id
                } else {
                    versionText = versionSelect.options[versionSelect.selectedIndex] ? versionSelect.options[versionSelect.selectedIndex].text : '';
                }
            }

            if (editId && existingCar) {
                if (!brand) brand = existingCar.brand;
                if (!model) model = existingCar.model;
                if (!yearText) yearText = existingCar.year;
            }

            if (!brand || !model) {
                showToast("Por favor, preencha a Marca e o Modelo.");
                return;
            }

            // ... (Custom Brand logic) ...

            // ... (Duplicate logic) ...

            // Get current user correctly
            // ---ROBUST USER DETECTION (100% SURE)--
            let currentUser = 'Sistema'; // Default

            // 1. Check Primary Session Object
            const sessionData = localStorage.getItem('souza_session');
            if (sessionData) {
                try {
                    const session = JSON.parse(sessionData);
                    if (session && session.username) currentUser = session.username;
                } catch (e) { }
            }

            // 2. Fallback: Simple String Key (Often used in simple logins)
            if (currentUser === 'Sistema' || currentUser === 'Admin') {
                const simpleUser = localStorage.getItem('souza_current_user');
                if (simpleUser && simpleUser.trim() !== "") currentUser = simpleUser;
            }

            // 3. Fallback: Legacy objects
            if (currentUser === 'Sistema') {
                try {
                    const legacy = JSON.parse(localStorage.getItem('souza_user'));
                    if (legacy && legacy.username) currentUser = legacy.username;
                } catch (e) { }
            }

            // 4. DOM THEFT (UI PROOF) - If the sidebar says "Kaua", IT IS KAUA.
            const domUser = document.getElementById('lblUsername');

            if (domUser && domUser.innerText) {
                const txt = domUser.innerText.trim();
                if (txt && txt !== 'Admin' && txt !== '...' && txt !== 'undefined') {
                    currentUser = txt;
                }
            }

            // Log for debugging
            console.log("🔒 USER FINAL (WITH DOM CHECK): ", currentUser);

            // Generate unique code SZ + YEAR + random alphanumeric
            const generateCarCode = () => {
                const year = new Date().getFullYear();
                const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
                let random = '';
                for (let i = 0; i < 4; i++) {
                    random += chars.charAt(Math.floor(Math.random() * chars.length));
                }
                return `SZ${year}${random}`;
            };

            // Construct Title: Brand + Model + Version (Clean & Smart)
            let finalTitle = `${brand} ${model}`.trim();

            if (versionText && versionText !== "Selecione o Ano" && !versionText.includes("Selecione um") && versionText.trim() !== "") {
                const v = versionText.trim();
                const t = finalTitle;

                // Case A: Version starts with Title
                if (v.toLowerCase().startsWith(t.toLowerCase())) {
                    finalTitle = v;
                }
                // Case B: Title ends with parts of version
                else if (!t.toLowerCase().includes(v.toLowerCase())) {
                    finalTitle += ` ${v}`;
                }
            }

            const carObj = {
                id: editId ? Number(editId) : Date.now(),
                code: (existingCar && existingCar.code) ? existingCar.code : generateCarCode(),
                title: capitalizeText(finalTitle),
                brand: capitalizeText(brand),
                model: capitalizeText(model),
                year: yearText,
                price: Number(form.price.value),
                km: form.km.value.includes('km') ? form.km.value : form.km.value + ' km',
                images: imagesData,
                badge: selectedLifestyle.includes('premium') ? 'Luxo' : 'Destaque',
                fuel: form.fuel.value || 'Flex',
                engine: form.engine ? form.engine.value : '',
                transmission: form.transmission ? form.transmission.value : '',
                power: form.power ? form.power.value : '',
                color: capitalizeText(form.color ? form.color.value : ''),
                options: checkedOptions,
                lifestyle: selectedLifestyle,
                condition: form.condition ? form.condition.value : 'seminovos',
                description: form.description ? form.description.value : '',
                isManual: window.isBrandManual || window.isModelManual || window.isYearManual,
                type: currentVehicleType,
                // Preserva quem criou se for edição, senão usa quem tá logado agora
                createdBy: editId && existingCar ? (existingCar.createdBy || currentUser) : currentUser,
                lastEditedBy: currentUser,
                createdAt: editId && existingCar ? existingCar.createdAt : new Date().toISOString()
            };

            // Save to DB
            try {
                await DB.saveCar(carObj);
                await refreshAppData();
                if (window.renderAdminList) window.renderAdminList();
                showToast(editId ? 'Veículo atualizado!' : `Veículo cadastrado! Código: ${carObj.code}`);
            } catch (dbError) {
                console.error("DB Save Error:", dbError);
                showToast("Erro ao salvar no banco de dados: " + dbError.message);
                return; // Stop reset
            }

            // Reset form
            form.reset();
            window.carImagesState = [];
            window.renderImagePreviews();
            document.getElementById('carImageFile').value = '';
            form.querySelector('button[type="submit"]').innerText = 'SALVAR VEÍCULO';

            // Reset selects
            brandSelect.value = "";
            modelSelect.innerHTML = '<option value="">Selecione a Marca primeiro</option>';
            modelSelect.disabled = true;
            yearSelect.innerHTML = '<option value="">Selecione o Modelo primeiro</option>';
            yearSelect.disabled = true;
            versionSelect.innerHTML = '<option value="">Selecione o Ano</option>';
            versionSelect.disabled = true;

            // Reset checkboxes
            document.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = false);

            // Reset edit ID if exists
            const idInp = form.querySelector('[name="carId"]');
            if (idInp) idInp.value = '';

            // Reset global names
            window.selectedBrandName = "";
            window.selectedModelName = "";

            // Reset Manual Flags and Inputs
            if (window.isBrandManual) window.toggleManualBrand();
            if (window.isModelManual) window.toggleManualModel();
            if (window.isYearManual) window.toggleManualYear();
            document.getElementById('brandManualInput').value = '';
            document.getElementById('modelManualInput').value = '';
            document.getElementById('yearManualInput').value = '';

            // Scroll to top
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } catch (err) {
            console.error("Erro no salvamento:", err);
            showToast("Erro ao salvar. Verifique o console.");
        }
    });

    // --- Sellers Management Logic (Supabase Powered) ---
    window.renderSellers = async () => {
        const container = document.getElementById('sellersList');
        if (!container) return;

        container.innerHTML = '<div style="color: #666; padding: 20px;">Consultando base de dados online...</div>';

        // 1. Fetch Sellers from Supabase
        let sellers = [];
        if (supabaseClient) {
            const { data, error } = await supabaseClient.from('vendedores').select('*').order('username');
            if (!error) sellers = data;
        }

        if (sellers.length === 0) {
            container.innerHTML = '<div style="color:#666; font-style:italic;">Nenhum vendedor adicional cadastrado na nuvem.</div>';
            return;
        }

        container.innerHTML = sellers.map(s => {
            const userCars = carsData.filter(c => c.createdBy && c.createdBy.toLowerCase() === s.username.toLowerCase());
            const totalCreated = userCars.length;

            // Format Last Login
            let lastLoginStr = "Nunca logou";
            if (s.last_login) {
                const date = new Date(s.last_login);
                lastLoginStr = date.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
            }

            return `
            <div style="background:#1a1a1a; padding:20px; border-radius:12px; border:1px solid #333; display:flex; flex-direction:column; gap:15px; position:relative;">
                <div style="display:flex; justify-content:space-between; align-items:start;">
                    <div>
                        <div style="font-weight:700; color:#d4af37; font-size:1.2rem;">${s.username}</div>
                        <div style="font-size:0.8em; color:#888;">Senha: ${s.password}</div>
                        <div style="font-size:0.7em; color:#555; margin-top:5px;">Último acesso: <span style="color:#888;">${lastLoginStr}</span></div>
                    </div>
                    <div style="background:#333; padding:5px 10px; border-radius:12px; text-align:center;">
                         <div style="font-size:0.9rem; color:#fff; font-weight:bold;">${s.login_count || 0}</div>
                         <div style="font-size:0.5rem; color:#666; text-transform:uppercase;">Logins</div>
                    </div>
                </div>
                
                <div style="display:grid; grid-template-columns: 1fr; gap:10px;">
                    <div style="background:#0a0a0a; padding:10px; border-radius:8px; text-align:center; border:1px solid #222;">
                        <div style="font-size:1.3rem; font-weight:800; color:#fff;">${totalCreated}</div>
                        <div style="font-size:0.6rem; color:#666; text-transform:uppercase;">Carros em Estoque</div>
                    </div>
                </div>

                <div style="border-top: 1px solid #222; padding-top:10px; display:flex; justify-content:space-between; align-items:center;">
                    <span style="font-size:0.6rem; color:#444;">AUDIT_ID: ${s.id.slice(0, 8)}</span>
                    <div style="display:flex; gap:10px;">
                        <button onclick="editSeller('${s.username}')" style="color:#d4af37; background:none; border:none; cursor:pointer; font-size:0.8rem; font-weight:bold;">Editar</button>
                        <button onclick="deleteSeller('${s.username}')" style="color:#ff3333; background:none; border:none; cursor:pointer; font-size:0.8rem; font-weight:bold;">Remover</button>
                    </div>
                </div>
            </div>
            `;
        }).join('');
    };

    window.createSeller = async () => {
        const u = document.getElementById('sellerUser').value.trim();
        const p = document.getElementById('sellerPass').value.trim();
        const form = document.getElementById('newSellerForm');
        const isEditing = form.dataset.editMode === 'true';
        const oldUsername = form.dataset.oldUsername;

        if (!u || !p) { alert('Preencha usuario e senha'); return; }
        if (!supabaseClient) { alert('Erro: Conexão com Supabase não ativa.'); return; }

        try {
            if (isEditing) {
                const { error } = await supabaseClient
                    .from('vendedores')
                    .update({ username: u, password: p })
                    .eq('username', oldUsername);

                if (error) throw error;
                alert('Vendedor atualizado com sucesso!');
            } else {
                const { error } = await supabaseClient
                    .from('vendedores')
                    .insert([{ username: u, password: p, role: 'vendedor' }]);

                if (error) {
                    if (error.code === '23505') alert('Este nome de usuário já existe.');
                    else throw error;
                    return;
                }
                alert('Vendedor criado na nuvem!');
            }

            // Reset Form and Refresh
            form.reset();
            delete form.dataset.editMode;
            delete form.dataset.oldUsername;
            form.querySelector('button[type="submit"]').innerText = 'CRIAR';
            window.renderSellers();

        } catch (err) {
            console.error("Erro Vendedores:", err);
            alert("Erro ao processar: " + err.message);
        }
    };

    window.editSeller = async (username) => {
        const { data, error } = await supabaseClient.from('vendedores').select('*').eq('username', username).single();
        if (error || !data) return;

        const form = document.getElementById('newSellerForm');
        document.getElementById('sellerUser').value = data.username;
        document.getElementById('sellerPass').value = data.password;
        form.dataset.editMode = 'true';
        form.dataset.oldUsername = data.username;
        form.querySelector('button[type="submit"]').innerText = 'ATUALIZAR';

        window.scrollTo({ top: form.offsetTop - 100, behavior: 'smooth' });
    };

    window.deleteSeller = async (username) => {
        if (!confirm(`Deseja realmente remover o vendedor ${username}?`)) return;

        const { error } = await supabaseClient.from('vendedores').delete().eq('username', username);
        if (error) {
            alert("Erro ao deletar: " + error.message);
        } else {
            alert("Vendedor removido!");
            window.renderSellers();
        }
    };

    // --- Settings Logic ---
    window.saveAdminSettings = () => {
        const phone = document.getElementById('adminPhoneInput').value.replace(/\D/g, '');
        if (phone.length < 10) {
            alert('Número inválido');
            return;
        }
        localStorage.setItem('souza_admin_phone', phone);
        alert('Configurações salvas!');
    };

    // Init
    loadBrands();
    renderOptions();
    renderAdminList();
    if (document.getElementById('sellersList')) window.renderSellers();

    // Load Settings
    const savedPhone = localStorage.getItem('souza_admin_phone');
    const phoneInput = document.getElementById('adminPhoneInput');
    if (savedPhone && phoneInput) phoneInput.value = savedPhone;
}

// ===== Shared Components =====
function initMobileMenu() {
    const btn = document.querySelector('.mobile-menu-btn') || document.getElementById('mobileMenuBtn');
    const menu = document.querySelector('.mobile-menu') || document.getElementById('mobileMenu');

    if (btn && menu) {
        // Remove listeners antigos para evitar duplicidade (clone)
        const newBtn = btn.cloneNode(true);
        btn.parentNode.replaceChild(newBtn, btn);

        newBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            newBtn.classList.toggle('active');
            menu.classList.toggle('active');
            console.log('Mobile menu toggled');
        });

        const links = menu.querySelectorAll('a');
        links.forEach(link => {
            link.addEventListener('click', () => {
                newBtn.classList.remove('active');
                menu.classList.remove('active');
            });
        });
        console.log('Mobile menu initialized');
    } else {
        console.warn('Mobile menu elements not found');
    }
}

function renderBrands() {
    const brandsTrack = document.getElementById('brandsTrack');
    if (!brandsTrack) return;

    // Duplicate data purely for visual scrolling effect
    const allBrands = [...brandsData, ...brandsData];
    brandsTrack.innerHTML = allBrands.map(brand => `
        <div class="brand-card" title="${brand.name}" 
             onclick="window.location.href='veiculos.html?brand=${encodeURIComponent(brand.name)}'"
             style="cursor:pointer">
            <img src="${brand.logo}" alt="${brand.name}" loading="lazy">
        </div>
    `).join('');
}

function renderFAQ() {
    if (!faqList) return;
    faqList.innerHTML = faqData.map((faq, index) => `
        <div class="faq-item">
            <button class="faq-question">
                <span>${faq.question}</span>
                <span class="faq-icon">+</span>
            </button>
            <div class="faq-answer">
                <p>${faq.answer}</p>
            </div>
        </div>
    `).join('');

    document.querySelectorAll('.faq-question').forEach(btn => {
        btn.addEventListener('click', () => {
            const item = btn.parentElement;
            item.classList.toggle('active');
        });
    });
}

function renderFeaturedCarousel() {
    if (!featuredCarouselTrack) return;

    // Show only the first 5 or customized selection 
    const featured = carsData.slice(0, 6);

    featuredCarouselTrack.innerHTML = featured.map(car => {
        // Pega até 5 opcionais se existirem
        const previewOptions = car.options ? car.options.slice(0, 5) : [];
        const optionsHtml = previewOptions.length > 0
            ? `<div class="car-options-preview" style="font-size:0.75rem; color:var(--text-light); margin-bottom:10px; display:flex; flex-wrap:wrap; gap:4px;">
                ${previewOptions.map(opt => `<span style="background:var(--bg-secondary); padding:2px 6px; border-radius:4px;">${opt}</span>`).join('')}
               </div>`
            : '';

        return `
        <article class="carousel-car-card" onclick="window.location.href='detalhes.html?id=${car.id}'" style="cursor:pointer">
            <div class="car-image">
                <img src="${Array.isArray(car.images) && car.images.length > 0 ? car.images[0] : (car.image || 'logo.png')}" alt="${car.title}" loading="lazy" onerror="this.src='logo.png'">
                <span class="car-badge">${car.badge || 'Oferta'}</span>
            </div>
            <div class="car-info">
                <h3 class="car-title">${car.title}</h3>
                <div class="car-specs">
                    <span class="car-spec">${car.year}</span>
                    <span class="car-spec">${car.km}</span>
                </div>
                ${car.options && car.options.length > 0
                ? `<div class="car-options-preview" style="font-size:0.75rem; color:var(--text-light); margin-bottom:10px; display:flex; flex-wrap:wrap; gap:4px; height:48px; overflow:hidden; align-content: flex-start;">
                        ${car.options.slice(0, 5).map(opt => `<span style="background:var(--bg-secondary); padding:2px 8px; border-radius:4px; white-space:nowrap; font-weight:500;">${opt}</span>`).join('')}
                       </div>`
                : ''}
                <div class="car-price">
                    <span class="price-value">${formatPrice(car.price)}</span>
                </div>
            </div>
        </article>
    `}).join('');

    initCarouselControls();
}

function initCarouselControls() {
    // Carros em Destaque
    const carWrapper = document.querySelector('.featured-carousel-wrapper');
    const carPrev = document.querySelector('.prev-btn');
    const carNext = document.querySelector('.next-btn');

    if (carWrapper && carPrev && carNext) {
        carPrev.addEventListener('click', () => {
            carWrapper.scrollLeft -= 320;
        });
        carNext.addEventListener('click', () => {
            carWrapper.scrollLeft += 320;
        });
    }

    // Marcas Populares
    const brandWrapper = document.querySelector('.brands-carousel');
    const brandPrev = document.querySelector('.brand-prev');
    const brandNext = document.querySelector('.brand-next');

    if (brandWrapper && brandPrev && brandNext) {
        brandPrev.addEventListener('click', () => {
            brandWrapper.scrollLeft -= 164;
        });
        brandNext.addEventListener('click', () => {
            brandWrapper.scrollLeft += 164;
        });
    }
}

function renderLifestyleCards() {
    const container = document.getElementById('lifestyleGrid');
    if (!container) return;
    container.innerHTML = lifestyleData.map(item => `
        <div class="lifestyle-card" onclick="window.location.href='veiculos.html?lifestyle=${item.id}'" style="cursor:pointer">
            <div class="lifestyle-icon">${item.icon}</div>
            <div class="lifestyle-content">
                <h3 class="lifestyle-title">${item.title}</h3>
                <p class="lifestyle-desc">${item.description}</p>
            </div>
        </div>
    `).join('');
}

function renderInstallmentCards() {
    // Section removed per user request
    return;
}

function renderPriceRangeCards() {
    const container = document.getElementById('priceRangeGrid');
    if (!container) return;
    container.innerHTML = priceRangeData.map(item => `
        <div class="price-range-card" onclick="window.location.href='veiculos.html?min=${item.min}&max=${item.max}'" style="cursor:pointer">
            <span class="price-range-icon">${item.icon}</span>
            <span class="price-range-title">${item.title}</span>
        </div>
    `).join('');
}

function initBannerSlider() {
    const slides = document.querySelectorAll('.banner-slide');
    if (slides.length === 0) return;
    let currentSlide = 0;
    setInterval(() => {
        slides[currentSlide].classList.remove('active');
        currentSlide = (currentSlide + 1) % slides.length;
        slides[currentSlide].classList.add('active');
    }, 5000);
}

// ===== FEATURE: WhatsApp Text Parser (Suggestion 2) =====


// ===== FEATURE: Vehicle Details Page =====
async function initDetails() {
    const params = new URLSearchParams(window.location.search);
    const idParam = params.get('id');

    if (!idParam) {
        window.location.href = 'index.html';
        return;
    }

    const id = parseInt(idParam);
    let car = null;

    // Tenta buscar nos dados ja carregados ou busca individualmente (Performance)
    if (typeof carsData !== 'undefined' && carsData.length > 0) {
        car = carsData.find(c => c.id === id);
    }

    // Se nao achou (ou nao carregou tudo), busca direto no DB/Supabase
    if (!car) {
        try {
            document.body.style.cursor = 'wait';
            car = await DB.getCarById(id);
        } catch (e) {
            console.error('Erro ao buscar veiculo:', e);
        } finally {
            document.body.style.cursor = 'default';
        }
    }

    if (!car) {
        document.body.innerHTML = '<div style="color:white; text-align:center; padding:100px; font-family:sans-serif;"><h1>Veículo não encontrado</h1><a href="index.html" style="color:#e65100; text-decoration:none; font-weight:bold;">Voltar para Home</a></div>';
        return;
    }

    // Title
    document.title = `${car.title} - Souza Select Car`;

    // Main Image
    const mainImg = document.getElementById('detailsMainImg');
    const thumbGrid = document.getElementById('detailsThumbs');
    const carImages = Array.isArray(car.images) && car.images.length > 0 ? car.images : [car.image || 'logo.png'];

    if (mainImg) {
        mainImg.src = carImages[0];
        mainImg.onerror = function () { // Direct handler for initial load
            this.src = 'logo.png';
            this.style.opacity = '0.5';
        };
    }

    if (thumbGrid) {
        thumbGrid.innerHTML = carImages.map((img, idx) => `
            <img src="${img}" 
                 onclick="document.getElementById('detailsMainImg').src='${img}'; window.currentModalImageIndex=${idx};" 
                 onerror="this.onerror=null; this.src='logo.png'; this.style.opacity='0.5';"
                 loading="lazy"
                 style="width:80px; height:60px; object-fit:cover; cursor:pointer; border:1px solid ${idx === 0 ? 'var(--primary)' : 'var(--border-color)'}; border-radius:4px;">
        `).join('');
    }

    // Modal Gallery Setup
    window.currentCarImages = carImages;
    window.currentModalImageIndex = 0;

    if (mainImg) {
        mainImg.style.cursor = 'zoom-in';
        mainImg.onclick = () => window.openGallery(window.currentModalImageIndex);
    }


    // --- Info Population ---
    const titleEl = document.getElementById('detailsTitle');
    const priceEl = document.getElementById('detailsPrice');
    const yearEl = document.getElementById('detailsYear');
    const kmEl = document.getElementById('detailsKm');
    const fuelEl = document.getElementById('detailsFuel');
    const engineEl = document.getElementById('detailsEngine');
    const transEl = document.getElementById('detailsTransmission');
    const powerEl = document.getElementById('detailsPower');
    const colorEl = document.getElementById('detailsColor');

    if (titleEl) titleEl.innerText = car.title;
    if (priceEl) priceEl.innerText = formatPrice(car.price);
    if (yearEl) yearEl.innerText = car.year;
    if (kmEl) kmEl.innerText = car.km;
    if (fuelEl) fuelEl.innerText = car.fuel || 'Flex';
    if (engineEl) engineEl.innerText = car.engine || 'N/A';
    if (transEl) transEl.innerText = car.transmission || 'N/A';
    if (powerEl) powerEl.innerText = car.power || 'N/A';
    if (colorEl) colorEl.innerText = car.color || 'N/A';

    const optsContainer = document.getElementById('detailsOptions');
    if (optsContainer && car.options) {
        optsContainer.innerHTML = car.options.map(opt => `<li>${opt}</li>`).join('');
    }

    const descEl = document.getElementById('detailsDescription');
    if (descEl) descEl.innerText = car.description || 'Sem descrição adicional.';

    const btnInt = document.getElementById('btnInterest');
    if (btnInt) btnInt.onclick = () => whatsappInterest(car.title);
}

// (Código antigo da galeria removido para evitar duplicidade - Versão Enhanced abaixo)

// ===== Global Gallery Functions (Enhanced) =====
window.openGallery = (index) => {
    const modal = document.getElementById('modalGallery');
    if (!modal) return;

    window.currentModalImageIndex = index;
    updateModalImage();

    modal.classList.add('active');
    document.body.style.overflow = 'hidden'; // Trava scroll da página

    // Attach Events Dynamically
    document.addEventListener('keydown', handleGalleryKeyboard);

    // Mobile Swipe Events
    const mainImg = document.getElementById('modalMainImg');
    if (mainImg) {
        mainImg.addEventListener('touchstart', handleTouchStart, { passive: true });
        mainImg.addEventListener('touchend', handleTouchEnd, { passive: true });
    }
};

window.closeGallery = () => {
    const modal = document.getElementById('modalGallery');
    if (modal) modal.classList.remove('active');
    document.body.style.overflow = ''; // Destrava scroll

    // Detach Events
    document.removeEventListener('keydown', handleGalleryKeyboard);

    const mainImg = document.getElementById('modalMainImg');
    if (mainImg) {
        mainImg.removeEventListener('touchstart', handleTouchStart);
        mainImg.removeEventListener('touchend', handleTouchEnd);
    }
};

window.changeModalImage = (direction) => {
    if (!window.currentCarImages || window.currentCarImages.length === 0) return;

    window.currentModalImageIndex += direction;

    // Loop infinito
    if (window.currentModalImageIndex < 0) {
        window.currentModalImageIndex = window.currentCarImages.length - 1;
    } else if (window.currentModalImageIndex >= window.currentCarImages.length) {
        window.currentModalImageIndex = 0;
    }

    updateModalImage();
};

function updateModalImage() {
    const img = document.getElementById('modalMainImg');
    const counter = document.getElementById('modalCounter');

    if (img && window.currentCarImages && window.currentCarImages[window.currentModalImageIndex]) {
        // Fade effect simpples
        img.style.opacity = '0.5';
        setTimeout(() => {
            img.src = window.currentCarImages[window.currentModalImageIndex];
            img.style.opacity = '1';
        }, 150);

        if (counter) {
            counter.innerText = `${window.currentModalImageIndex + 1} / ${window.currentCarImages.length}`;
        }
    }
}

// Keyboard Handler
function handleGalleryKeyboard(e) {
    if (e.key === 'Escape') closeGallery();
    if (e.key === 'ArrowLeft') changeModalImage(-1);
    if (e.key === 'ArrowRight') changeModalImage(1);
}

// Touch Gestures (Swipe)
let touchStartX = 0;
let touchEndX = 0;

function handleTouchStart(e) {
    touchStartX = e.changedTouches[0].screenX;
}

function handleTouchEnd(e) {
    touchEndX = e.changedTouches[0].screenX;
    handleSwipeGesture();
}

function handleSwipeGesture() {
    const threshold = 30; // Sensibilidade do swipe
    if (touchEndX < touchStartX - threshold) {
        changeModalImage(1); // Swipe Left -> Next
    }
    if (touchEndX > touchStartX + threshold) {
        changeModalImage(-1); // Swipe Right -> Prev
    }
}

// New: Evaluation Action (Suggestion 1)
function whatsappEvaluation() {
    const message = `Olá! Gostaria de uma avaliação para o meu veículo usado como parte de pagamento ou para venda.`;
    const phone = localStorage.getItem('souza_admin_phone') || "5519998383275";
    window.open(`https://api.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(message)}`, '_blank');
}

// Update Static WhatsApp Links
function updateWhatsAppLinks() {
    const phone = localStorage.getItem('souza_admin_phone') || "5519998383275";
    document.querySelectorAll('a[href*="whatsapp"]').forEach(link => {
        let href = link.href;
        // Simple replace for common patterns
        if (href.includes('5519998383275')) {
            link.href = href.replace('5519998383275', phone);
        } else if (href.includes('5519999999999')) { // Placeholder found in HTML
            link.href = href.replace('5519999999999', phone);
        }
    });
}

// ===== Main Init =====
// ===== Loader Logic =====


// ===== Main Init =====
document.addEventListener('DOMContentLoaded', async () => {
    try {
        console.log("Inicializando aplicação...");

        // Deteccao de Pagina para Performance
        const isDetailsPage = !!document.getElementById('detailsTitle');
        const isAdminPage = !!document.getElementById('adminCarList');

        // 0. Inicializa UI IMEDIATAMENTE (Prioridade UX)
        initMobileMenu();
        initBannerSlider();
        updateWhatsAppLinks();
        // Não depende de dados, pode rodar logo

        // 1. Carrega dados (Logica Otimizada)
        if (isDetailsPage) {
            console.log("🚀 [Init] Modo Detalhes (Carregamento Rápido Unico)");
            // initDetails agora busca seu proprio carro se necessario
            await initDetails();
            // Carrega o resto em background sem travar a UI
            refreshAppData().then(() => {
                console.log("📦 [Background] Dados completos carregados");
                // renderBrands(); // Opcional no background
            });
        } else {
            // Home ou Estoque ou Admin - Precisa de tudo
            console.log("🚀 [Init] Carregando aplicação completa...");
            await refreshAppData();

            // 3. Page specific inits (pos-carga)

            if (document.getElementById('vehiclesGrid')) {
                initFilters();
            } else if (document.getElementById('marca')) {
                initHomeFilters();
                renderFeaturedCarousel();
                renderPriceRangeCards();
                initHomeGrid();
            }
        }

        // 2. Shared Inits (Leves - os que sobraram)
        renderFAQ();
        renderLifestyleCards();
        if (!isDetailsPage) renderBrands();

        if (isAdminPage) {
            initAdmin();
        }

        // Header Scroll
        const header = document.getElementById('header');
        if (header) {
            window.addEventListener('scroll', () => {
                if (window.scrollY > 50) {
                    header.classList.add('scrolled');
                } else {
                    header.classList.remove('scrolled');
                }
            });
        }

    } catch (err) {
        console.error("CRITICAL ERROR IN APP INIT:", err);
        // Fallback: Tenta iniciar admin mesmo com erro no resto
        if (document.getElementById('adminCarList')) {
            try { initAdmin(); } catch (e) { console.error('Admin Init Failed:', e); }
        }
    }
});

// ===== DARK/LIGHT MODE TOGGLE (Light First Policy) =====
(function initThemeToggle() {
    const savedTheme = localStorage.getItem('souza_theme');
    const initialTheme = savedTheme || 'light'; // Light is the source of truth

    if (initialTheme === 'dark') {
        document.body.classList.add('dark-mode');
    }

    const toggleBtn = document.getElementById('themeToggle');
    if (toggleBtn) {
        toggleBtn.addEventListener('click', () => {
            document.body.classList.toggle('dark-mode');
            const isDark = document.body.classList.contains('dark-mode');
            localStorage.setItem('souza_theme', isDark ? 'dark' : 'light');
            toggleBtn.style.transform = 'rotate(360deg)';
            setTimeout(() => {
                toggleBtn.style.transform = '';
            }, 300);
        });
    }
})();



// --- OVERRIDE: WhatsApp Parser (Smart Fill Fixed) ---
window.parseWhatsAppText = () => {
    const textArea = document.getElementById('whatsappPasteArea');
    const text = textArea ? textArea.value : '';

    if (!text || text.trim().length < 5) {
        alert("Cole o texto do anúncio primeiro!");
        return;
    }

    const fullText = text.toLowerCase();
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);

    // 1. Preço (Smart Regex)
    const priceMatch = text.match(/(?:r\$|valor|por|investimento)\s?([\d.,]+)/i);
    if (priceMatch) {
        const val = priceMatch[1].replace(/\./g, '').replace(',', '.');
        const priceInput = document.getElementById('priceInput');
        if (priceInput) priceInput.value = parseFloat(val);
    }

    // 2. KM (Smart Regex)
    const kmMatch = text.match(/(\d{1,3}(?:\.?\d{3})*)\s?(?:km|quilômetros|rodados)/i);
    if (kmMatch) {
        const k = document.querySelector('input[name="km"]');
        if (k) k.value = kmMatch[1].replace(/\./g, '') + ' km';
    }

    // 3. Ano (Smart Regex)
    const yearMatch = text.match(/(?:ano|modelo)?\s?(20\d{2}(?:\/20\d{2}|-20\d{2})?)/i);
    if (yearMatch) {
        if (!window.isYearManual) window.toggleManualYear();
        const y = document.getElementById('yearManualInput');
        if (y) y.value = yearMatch[1];
    }

    // 4. Marca e Modelo (Primeira Linha Heurística)
    if (lines.length > 0) {
        const firstLine = lines[0];
        // Remove emojis comuns
        const cleanFirstLine = firstLine.replace(/[\u{1F300}-\u{1F9FF}]|[\u{2700}-\u{27BF}]|[\u{1F600}-\u{1F64F}]|[\u{1F680}-\u{1F6FF}]|[\u{2600}-\u{26FF}]|[\u{1F1E0}-\u{1F1FF}]/gu, '').trim();
        const parts = cleanFirstLine.split(' ');

        if (parts.length >= 1) {
            if (!window.isBrandManual) window.toggleManualBrand();
            const b = document.getElementById('brandManualInput');
            if (b) b.value = normalizeBrand(parts[0]);

            if (parts.length >= 2) {
                if (!window.isModelManual) window.toggleManualModel();
                const m = document.getElementById('modelManualInput');
                if (m) m.value = parts.slice(1).join(' ');
            }
        }
    }

    // 5. Motorização e Câmbio
    const engineMatch = text.match(/(\d\.\d(?:\s?turbo|v6|v8|v10)?)/i);
    if (engineMatch && engineMatch[1]) {
        const eng = document.querySelector('input[name="engine"]');
        if (eng) eng.value = engineMatch[1].toUpperCase();
    }

    const transmissionMatch = text.match(/(automático|automatico|aut\.|manual|cvt|dualogic|dsg)/i);
    if (transmissionMatch && transmissionMatch[1]) {
        const trans = document.querySelector('input[name="transmission"]');
        if (trans) trans.value = transmissionMatch[1].charAt(0).toUpperCase() + transmissionMatch[1].slice(1).toLowerCase();
    }

    // 5.1 Combustível
    const fuelMatch = text.match(/(flex|álcool|alcool|gasolina|diesel|híbrido|hibrido|elétrico|eletrico)/i);
    if (fuelMatch && fuelMatch[1]) {
        const fuel = document.querySelector('select[name="fuel"]') || document.getElementById('fuel');
        if (fuel) {
            const val = fuelMatch[1].toLowerCase();
            if (val.includes('flex')) fuel.value = 'Flex';
            else if (val.includes('alcool')) fuel.value = 'Álcool';
            else if (val.includes('gasolina')) fuel.value = 'Gasolina';
            else if (val.includes('diesel')) fuel.value = 'Diesel';
        }
    }

    // 5.2 Conservação (Novo/Seminovo)
    const conditionMatch = text.match(/(novo|0km|zero|seminovo|usado)/i);
    if (conditionMatch && conditionMatch[1]) {
        const cond = document.querySelector('select[name="condition"]') || document.getElementById('condition');
        if (cond) {
            const val = conditionMatch[1].toLowerCase();
            if (val.includes('novo') || val.includes('0km') || val.includes('zero')) cond.value = 'novos';
            else cond.value = 'seminovos';
        }
    }

    // 6. Descrição (Geral)
    const descInput = document.getElementById('descriptionInput');
    if (descInput) descInput.value = text;

    // 7. Opcionais (Checkboxes)
    const inputs = document.getElementsByName('carOptions');
    let foundCount = 0;

    // Uncheck all first
    for (let inp of inputs) inp.checked = false;

    const keywordMap = {
        'Ar Condicionado': ['ar condicionado', 'ar-condicionado', 'ar con', 'climatizador'],
        'Direção': ['direção', 'dh', 'direcao', 'assistida'],
        'Vidro': ['vidro', 'trio', 'vidros'],
        'Trava': ['trava', 'trio', 'travas'],
        'Alarme': ['alarme', 'trio', 'segurança'],
        'Som': ['som', 'multimídia', 'multimidia', 'mp3', 'usb', 'bluetooth', 'tela'],
        'Couro': ['couro', 'revestimento'],
        'Teto': ['teto solar', 'panorâmico', 'panoramico'],
        'Automático': ['automático', 'automatico', 'câmbio aut', 'at6', 'at9', 'at'],
        '4x4': ['4x4', 'awd', 'tração', 'diesel'],
        'Sensor': ['sensor', 'estacionamento', 'park'],
        'Câmera': ['câmera', 'camera', 'ré'],
        'LED': ['led', 'xenon', 'iluminação'],
        'ABS': ['abs', 'freios'],
        'Airbag': ['airbag', 'air bag', 'bolsas']
    };

    for (let inp of inputs) {
        let labelText = inp.parentElement ? inp.parentElement.innerText.toLowerCase().trim() : inp.value.toLowerCase().trim();

        // Match by label
        if (fullText.includes(labelText)) {
            inp.checked = true;
            foundCount++;
            continue;
        }

        // Match by keyword map
        for (let [key, synonyms] of Object.entries(keywordMap)) {
            if (labelText.includes(key.toLowerCase())) {
                if (synonyms.some(s => fullText.includes(s))) {
                    inp.checked = true;
                    foundCount++;
                    break;
                }
            }
        }
    }

    if (window.updateOptionsSummary) window.updateOptionsSummary();

    const feedback = document.getElementById('pasteStatus');
    if (feedback) {
        feedback.style.display = 'block';
        feedback.style.color = '#4caf50';
        feedback.innerText = `✅ Sucesso! Detectamos Marca/Modelo/Ano e ${foundCount} opcionais.`;
    }

    showToast("🤖 Inteligência de leitura aplicada!");
};

// --- HOME PAGE SEARCH LOGIC ---
function initHomeFilters() {
    const homeBrandSelect = document.getElementById('marca');
    const homeModelSelect = document.getElementById('modelo');
    const homeYearSelect = document.getElementById('ano');
    const homePriceSelect = document.getElementById('preco');
    const homeSearchBtn = document.getElementById('homeSearchBtn');
    const tabs = document.querySelectorAll('.tab-btn');

    if (!homeBrandSelect) return;

    console.log("🏠 [HomeFilters] Inicializando filtros da Home...");

    // Expor função de update para o refreshAppData
    window.updateHomeFilters = function () {
        const pool = carsData || [];
        if (pool.length === 0) return; // Aguarda dados reais

        console.log('🏠 [HomeFilters] Populando marcas a partir de', pool.length, 'veículos');

        const type = getActiveType();
        // Filtro inteligente: Se o carro não tiver tipo, tratamos como 'carros' (default)
        const typePool = pool.filter(c => {
            const cType = (c.type || 'carros').toLowerCase();
            return cType === type;
        });

        // 1. Marcas
        const brands = [...new Set(typePool.map(c => normalizeBrand(c.brand)).filter(b => b))].sort();
        const currentBrand = homeBrandSelect.value;

        homeBrandSelect.innerHTML = '<option value="">Todas as Marcas</option>' +
            brands.map(b => `<option value="${b}">${b}</option>`).join('');

        if (brands.includes(currentBrand)) homeBrandSelect.value = currentBrand;
        else homeBrandSelect.value = "";

        // 2. Reset Modelos e Anos
        if (homeModelSelect) {
            homeModelSelect.innerHTML = '<option value="">Todos os Modelos</option>';
            homeModelSelect.disabled = true;
        }
        updateYears(typePool);
        updatePrices(typePool);
    };

    function getActiveType() {
        const activeTab = document.querySelector('.tab-btn.active');
        return activeTab ? activeTab.getAttribute('data-tab').toLowerCase() : 'carros';
    }

    function updateYears(filteredList) {
        if (!homeYearSelect) return;
        const years = [...new Set(filteredList.map(c => c.year).filter(y => y))].sort((a, b) => b - a);
        homeYearSelect.innerHTML = '<option value="">Ano</option>' +
            years.map(y => `<option value="${y}">${y}</option>`).join('');
        homeYearSelect.disabled = years.length === 0;
    }

    function updatePrices(pool) {
        if (!homePriceSelect) return;
        const prices = pool.map(c => Number(c.price) || 0).filter(p => p > 0);
        const maxInStock = prices.length > 0 ? Math.max(...prices) : 0;

        homePriceSelect.innerHTML = '<option value="">Preço até</option>';
        if (maxInStock > 0) {
            // Steps de preço mais realistas
            const steps = [30000, 50000, 70000, 100000, 150000, 200000, 300000, 500000, 1000000];
            steps.filter(s => s <= maxInStock * 1.5).forEach(s => {
                const label = s.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
                homePriceSelect.innerHTML += `<option value="${s}">${label}</option>`;
            });
        }
    }

    // Eventos
    tabs.forEach(tab => {
        tab.onclick = (e) => {
            e.preventDefault();
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            window.updateHomeFilters();

            // Haptic/Click Feel
            if ('vibrate' in navigator) navigator.vibrate(5);
        };
    });

    homeBrandSelect.onchange = () => {
        const brand = homeBrandSelect.value;
        const type = getActiveType();
        let pool = carsData || [];
        pool = pool.filter(c => (c.type || 'carros').toLowerCase() === type);
        if (brand) pool = pool.filter(c => normalizeBrand(c.brand) === brand);

        if (homeModelSelect) {
            const models = [...new Set(pool.map(c => c.model).filter(m => m))].sort();
            homeModelSelect.innerHTML = '<option value="">Todos os Modelos</option>' +
                models.map(m => `<option value="${m}">${m}</option>`).join('');
            homeModelSelect.disabled = !brand || models.length === 0;
        }
        updateYears(pool);
    };

    if (homeModelSelect) {
        homeModelSelect.onchange = () => {
            const brand = homeBrandSelect.value;
            const model = homeModelSelect.value;
            const type = getActiveType();
            let pool = carsData || [];
            pool = pool.filter(c => (c.type || 'carros').toLowerCase() === type);
            if (brand) pool = pool.filter(c => normalizeBrand(c.brand) === brand);
            if (model) pool = pool.filter(c => c.model === model);
            updateYears(pool);
        };
    }

    if (homeSearchBtn) {
        homeSearchBtn.onclick = (e) => {
            e.preventDefault();
            const params = new URLSearchParams();
            const type = getActiveType();
            if (type) params.append('type', type);
            if (homeBrandSelect.value) params.append('brand', homeBrandSelect.value);
            if (homeModelSelect && homeModelSelect.value) params.append('model', homeModelSelect.value);
            if (homeYearSelect && homeYearSelect.value) params.append('year', homeYearSelect.value);
            if (homePriceSelect && homePriceSelect.value) params.append('priceMax', homePriceSelect.value);

            console.log('🔍 [HomeSearch] Navegando:', params.toString());
            window.location.href = `veiculos.html?${params.toString()}`;
        };
    }

    // Tenta inicializar. Se os dados já chegaram (isDataReady), ele popula agora.
    if (window.isDataReady || (carsData && carsData.length > 0)) {
        window.updateHomeFilters();
    }
}


