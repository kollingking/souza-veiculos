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

const VEHICLE_MEDIA_STORAGE_KEY = 'souza_vehicle_media_v1';

function getVehicleMediaStore() {
    try {
        const parsed = JSON.parse(localStorage.getItem(VEHICLE_MEDIA_STORAGE_KEY) || '{}');
        return parsed && typeof parsed === 'object' ? parsed : {};
    } catch (e) {
        return {};
    }
}

function getVehicleVideoUrlById(id) {
    if (id === null || id === undefined) return '';
    const store = getVehicleMediaStore();
    return (store[String(id)] || '').toString().trim();
}

function setVehicleVideoUrlById(id, rawUrl) {
    if (id === null || id === undefined) return;
    const store = getVehicleMediaStore();
    const key = String(id);
    const value = (rawUrl || '').toString().trim();
    if (value) {
        store[key] = value;
    } else {
        delete store[key];
    }
    localStorage.setItem(VEHICLE_MEDIA_STORAGE_KEY, JSON.stringify(store));
}

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

        // 1. Load from Supabase (Priority Source of Truth) with 5s Timeout Safety
        if (supabaseClient) {
            try {
                const supabasePromise = supabaseClient.from('veiculos').select('*').order('created_at', { ascending: false });
                const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Supabase Timeout')), 5000));

                const { data, error } = await Promise.race([supabasePromise, timeoutPromise]);

                if (!error && data) {
                    onlineCars = data.map(c => ({ ...c, createdAt: c.created_at || c.createdAt }));
                    // Sincroniza localmente versões leves para busca rápida offline
                    if (onlineCars.length > 0) {
                        const localCache = onlineCars.map(c => ({
                            ...c,
                            images: (c.images || []).slice(0, 1)
                        }));
                        localStorage.setItem('souza_cars', JSON.stringify(localCache));
                    }
                }
            } catch (e) { console.warn("Supabase load skipped (offline or timeout):", e.message); }
        }

        // 2. Load from LocalStorage
        try {
            const stored = JSON.parse(localStorage.getItem('souza_cars') || '[]');
            localCars = Array.isArray(stored) ? stored : [];
        } catch (e) { }

        // 3. Merge Logic (Priority to Online for full details/images)
        const mergedMap = new Map();
        localCars.forEach(c => mergedMap.set(c.id, c));
        onlineCars.forEach(c => {
            const local = mergedMap.get(c.id);
            // Fallback: Se o online não tem fotos mas o local tem, mantém as locais
            if (local && (!c.images || c.images.length === 0) && (local.images && local.images.length > 0)) {
                c.images = local.images;
            }
            mergedMap.set(c.id, c);
        });

        const finalData = Array.from(mergedMap.values());

        // 4. Transform and Format
        return finalData.map(car => {
            car.brand = normalizeBrand(car.brand);
            const localVideo = getVehicleVideoUrlById(car.id);
            if (localVideo && !car.videoUrl) {
                car.videoUrl = localVideo;
            }

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
        }).sort((a, b) => {
            const idA = Number(a.id) || 0;
            const idB = Number(b.id) || 0;
            return idB - idA;
        });
    },

    async getCarById(id) {
        if (supabaseClient) {
            try {
                const { data, error } = await supabaseClient.from('veiculos').select('*').eq('id', id).single();
                if (!error && data) {
                    data.brand = normalizeBrand(data.brand);
                    const localVideo = getVehicleVideoUrlById(data.id);
                    if (localVideo && !data.videoUrl) data.videoUrl = localVideo;
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
                showToast("Sincronizado na nuvem!");
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
        setVehicleVideoUrlById(carObj.id, carObj.videoUrl || carObj.video || '');
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
        setVehicleVideoUrlById(id, '');
        return true;
    }
};

// Global State
var carsData = [];
const ANALYTICS_STORAGE_KEY = 'souza_analytics_v1';

function getTodayKey() {
    return new Date().toISOString().split('T')[0];
}

function readAnalytics() {
    try {
        const parsed = JSON.parse(localStorage.getItem(ANALYTICS_STORAGE_KEY) || '{}');
        return {
            totalAccess: Number(parsed.totalAccess || 0),
            dailyAccess: parsed.dailyAccess && typeof parsed.dailyAccess === 'object' ? parsed.dailyAccess : {},
            pageAccess: parsed.pageAccess && typeof parsed.pageAccess === 'object' ? parsed.pageAccess : {},
            vehicleViews: parsed.vehicleViews && typeof parsed.vehicleViews === 'object' ? parsed.vehicleViews : {}
        };
    } catch (e) {
        return { totalAccess: 0, dailyAccess: {}, pageAccess: {}, vehicleViews: {} };
    }
}

function saveAnalytics(data) {
    localStorage.setItem(ANALYTICS_STORAGE_KEY, JSON.stringify(data));
}

function pruneDailyAccess(dailyAccess, maxDays = 90) {
    const keys = Object.keys(dailyAccess || {}).sort();
    if (keys.length <= maxDays) return dailyAccess;
    const keep = keys.slice(keys.length - maxDays);
    const next = {};
    keep.forEach((k) => {
        next[k] = Number(dailyAccess[k] || 0);
    });
    return next;
}

function recordSiteAccess() {
    const analytics = readAnalytics();
    const today = getTodayKey();
    const page = (window.location.pathname.split('/').pop() || 'index.html').toLowerCase();

    analytics.totalAccess += 1;
    analytics.dailyAccess[today] = Number(analytics.dailyAccess[today] || 0) + 1;
    analytics.pageAccess[page] = Number(analytics.pageAccess[page] || 0) + 1;
    analytics.dailyAccess = pruneDailyAccess(analytics.dailyAccess);
    saveAnalytics(analytics);
}

function recordVehicleView(vehicleId) {
    if (!vehicleId && vehicleId !== 0) return;
    const analytics = readAnalytics();
    const key = String(vehicleId);
    analytics.vehicleViews[key] = Number(analytics.vehicleViews[key] || 0) + 1;
    saveAnalytics(analytics);
}

// Função para atualizar o estado global e a UI
async function refreshAppData() {
    try {
        console.log('[RefreshData] Buscando dados frescos do DB...');
        const freshData = await DB.getAllCars();
        carsData = Array.isArray(freshData) ? freshData : [];

        console.log(`[RefreshData] Estoque atualizado: ${carsData.length} veículos.`);

        // 1. Atualiza Grid de Veículos (se existir)
        const vGrid = document.getElementById('vehiclesGrid');
        if (vGrid) {
            if (window.populateBrands) {
                window.populateBrands();
                if (window.applyAllFilters) window.applyAllFilters();
            } else {
                renderCarGrid('vehiclesGrid', carsData);
            }
        }

        // 2. Atualiza Lista Administrativa
        if (document.getElementById('adminCarList') && window.renderAdminList) window.renderAdminList();
        if (document.getElementById('dashboardTopVehicles') && window.renderAdminDashboard) window.renderAdminDashboard();

        // 3. Atualiza Home Page (Grid e Filtros)
        if (document.getElementById('carsGrid')) {
            if (typeof initHomeGrid === 'function') initHomeGrid();
        }

        // CRUCIAL: Notifica os filtros da Home que os dados chegaram
        if (window.updateHomeFilters) {
            window.updateHomeFilters();
        } else if (typeof updateHomeFilters === 'function') {
            updateHomeFilters();
        }

        window.isDataReady = true;
    } catch (err) {
        console.error('[RefreshData] Erro crítico no carregamento:', err);
        window.isDataReady = true; // Libera a UI mesmo com erro
    }
}

// Função para inicializar a grid da home page
// Estado global para controle de paginação na Home
window.homeItemsLimit = Infinity;
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
        renderCarGrid('carsGrid', filtered);

        if (loadMoreBtn) {
            loadMoreBtn.style.display = 'none';
        }
    }

    // Configuração inicial
    updateDisplay();

    // Botão Carregar Mais
    if (loadMoreBtn) {
        loadMoreBtn.style.display = 'none';
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
                window.homeItemsLimit = Infinity;
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
        showToast("Sistema de fotos iPhone ainda carregando...", 3000);
        return file;
    }

    try {
        showToast("Convertendo foto do iPhone... (Aguarde)", 5000);

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

        console.log(`[Motor-iPhone] Sucesso: ${newName}`);
        return new File([finalBlob], newName, { type: "image/jpeg" });

    } catch (error) {
        console.error(`[Motor-iPhone] Erro na conversão:`, error);

        if (error.message && (error.message.includes('supported') || error.code === 2)) {
            showToast("Esta foto do iPhone é incompatível. Tente uma foto comum ou print.", 6000);
        } else {
            showToast("Erro ao converter foto do iPhone.", 3000);
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

function resolveCardImagePair(car) {
    if (!car) return { primary: 'logo.png', hover: 'logo.png' };

    // Garante que images seja um array válido
    const images = (Array.isArray(car.images) ? car.images : []).filter(img => img && typeof img === 'string' && img.length > 5);

    // Fallback para propriedade .image (legado ou backup)
    const backupImage = car.image && typeof car.image === 'string' && car.image.length > 5 ? car.image : 'logo.png';

    const primary = images.length > 0 ? images[0] : backupImage;
    const hover = images.length > 1 ? images[1] : primary;

    return { primary, hover };
}

const prefetchedCardImages = new Set();
function prefetchCardImage(src) {
    if (!src || prefetchedCardImages.has(src)) return;
    prefetchedCardImages.add(src);
    const img = new Image();
    img.decoding = 'async';
    img.src = src;
}

window.toggleCarCardImage = (cardEl, isHover) => {
    if (!cardEl) return;
    const img = cardEl.querySelector('img[data-default-src]');
    if (!img) return;

    const defaultSrc = img.dataset.defaultSrc || img.src;
    const hoverSrc = img.dataset.hoverSrc || defaultSrc;
    img.src = isHover ? hoverSrc : defaultSrc;
};

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
        container.innerHTML = '<p style="color: var(--text-secondary); text-align: center; grid-column: 1/-1;">Nenhum veículo encontrado com esses filtros.</p>';
        return;
    }

    container.innerHTML = cars.map(car => {
        // Pega até 5 opcionais se existirem (Consistente com Carousel) e garante que é array
        let previewOptions = [];
        if (Array.isArray(car.options)) {
            previewOptions = car.options.slice(0, 5);
        }

        const { primary, hover } = resolveCardImagePair(car);
        if (hover && hover !== primary) prefetchCardImage(hover);

        return `
        <article class="car-card" onclick="window.location.href='detalhes.html?id=${car.id}'" onmouseenter="toggleCarCardImage(this, true)" onmouseleave="toggleCarCardImage(this, false)" style="cursor:pointer">
            <div class="car-image">
                <img src="${primary}" data-default-src="${primary}" data-hover-src="${hover}" alt="${car.title}" loading="lazy" decoding="async" onerror="this.src='logo.png'">
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
                <div class="car-actions">
                    <button class="btn-details"
                        onclick="event.stopPropagation(); window.location.href='detalhes.html?id=${car.id}'">Detalhes</button>
                    <button class="btn-whatsapp"
                        onclick="event.stopPropagation(); whatsappInterest('${car.title.replace(/'/g, "\\'")}')">Contato</button>
                </div>
            </div>
        </article>
    `}).join('');
}

// ===== FEATURE: Filter Logic (Veiculos Page) =====
function initFilters() {
    console.log("[FilterInit] Aplicando sincronização profunda com URL...");
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
window.adminStepState = { current: 1, total: 3 };
window.adminStockFilterState = {
    search: '',
    brand: '',
    type: '',
    status: '',
    fuel: '',
    yearMin: 1990,
    yearMax: 2030,
    priceMin: 0,
    priceMax: 1000000
};
window.adminSellerCache = [];

function parseYearFromCar(car) {
    const raw = (car.year || '').toString();
    const match = raw.match(/\d{4}/);
    return match ? Number(match[0]) : 0;
}

function parsePriceFromCar(car) {
    return Number(car.price) || 0;
}

function getNormalizedStockFilters() {
    const state = window.adminStockFilterState || {};
    const yearMin = Number(state.yearMin || 0);
    const yearMax = Number(state.yearMax || 9999);
    const priceMin = Number(state.priceMin || 0);
    const priceMax = Number(state.priceMax || Number.MAX_SAFE_INTEGER);

    return {
        search: (state.search || '').toLowerCase().trim(),
        brand: (state.brand || '').trim(),
        type: (state.type || '').trim(),
        status: (state.status || '').trim(),
        fuel: (state.fuel || '').trim(),
        yearMin: Math.min(yearMin, yearMax),
        yearMax: Math.max(yearMin, yearMax),
        priceMin: Math.min(priceMin, priceMax),
        priceMax: Math.max(priceMin, priceMax)
    };
}

function applyAdminStockFilters(cars) {
    const f = getNormalizedStockFilters();

    return (cars || []).filter((car) => {
        const title = (car.title || '').toLowerCase();
        const brand = (car.brand || '').toLowerCase();
        const model = (car.model || '').toLowerCase();
        const seller = (car.createdBy || 'Sistema').toLowerCase();
        const fuel = (car.fuel || 'Flex').toLowerCase();
        const code = (car.code || '').toLowerCase();
        const year = parseYearFromCar(car);
        const price = parsePriceFromCar(car);

        if (f.search) {
            const inText = title.includes(f.search) || brand.includes(f.search) || model.includes(f.search) || seller.includes(f.search) || code.includes(f.search);
            const inPrice = formatPrice(price).toLowerCase().includes(f.search);
            if (!inText && !inPrice) return false;
        }

        if (f.brand && (car.brand || '') !== f.brand) return false;
        if (f.type && (car.type || 'carros').toLowerCase() !== f.type.toLowerCase()) return false;
        if (f.status && (car.condition || '') !== f.status) return false;
        if (f.fuel && (car.fuel || 'Flex').toLowerCase() !== f.fuel.toLowerCase()) return false;

        if (year > 0 && (year < f.yearMin || year > f.yearMax)) return false;
        if (price < f.priceMin || price > f.priceMax) return false;

        return true;
    });
}

function syncStockFilterOptions() {
    const brandSelect = document.getElementById('stockFilterBrand');

    if (!brandSelect) return;

    const selectedBrand = brandSelect.value;

    const brands = [...new Set((carsData || []).map(c => c.brand).filter(Boolean))].sort((a, b) => a.localeCompare(b));

    brandSelect.innerHTML = '<option value="">Todas</option>' + brands.map(b => `<option value="${b}">${b}</option>`).join('');

    if (brands.includes(selectedBrand)) brandSelect.value = selectedBrand;
}

function syncStockRangeBounds() {
    const yearMinInput = document.getElementById('stockYearMin');
    const yearMaxInput = document.getElementById('stockYearMax');
    const priceMinInput = document.getElementById('stockPriceMin');
    const priceMaxInput = document.getElementById('stockPriceMax');

    if (!yearMinInput || !yearMaxInput || !priceMinInput || !priceMaxInput) return;

    const years = (carsData || []).map(parseYearFromCar).filter(y => y > 0);
    const prices = (carsData || []).map(parsePriceFromCar).filter(p => p > 0);

    const minYear = years.length ? Math.min(...years) : 1990;
    const maxYear = years.length ? Math.max(...years) : 2030;

    const minPrice = prices.length ? Math.min(...prices) : 0;
    const maxPrice = prices.length ? Math.max(...prices) : 1000000;

    yearMinInput.min = String(minYear);
    yearMinInput.max = String(maxYear);
    yearMaxInput.min = String(minYear);
    yearMaxInput.max = String(maxYear);

    priceMinInput.min = String(minPrice);
    priceMinInput.max = String(maxPrice);
    priceMaxInput.min = String(minPrice);
    priceMaxInput.max = String(maxPrice);

    if (!window.adminStockRangesBootstrapped) {
        window.adminStockFilterState.yearMin = minYear;
        window.adminStockFilterState.yearMax = maxYear;
        window.adminStockFilterState.priceMin = minPrice;
        window.adminStockFilterState.priceMax = maxPrice;

        yearMinInput.value = String(minYear);
        yearMaxInput.value = String(maxYear);
        priceMinInput.value = String(minPrice);
        priceMaxInput.value = String(maxPrice);

        window.adminStockRangesBootstrapped = true;
    } else {
        const s = window.adminStockFilterState;
        yearMinInput.value = String(Math.max(minYear, Math.min(Number(s.yearMin), maxYear)));
        yearMaxInput.value = String(Math.max(minYear, Math.min(Number(s.yearMax), maxYear)));
        priceMinInput.value = String(Math.max(minPrice, Math.min(Number(s.priceMin), maxPrice)));
        priceMaxInput.value = String(Math.max(minPrice, Math.min(Number(s.priceMax), maxPrice)));
    }
}

function updateStockRangeLabels() {
    const yearMinInput = document.getElementById('stockYearMin');
    const yearMaxInput = document.getElementById('stockYearMax');
    const priceMinInput = document.getElementById('stockPriceMin');
    const priceMaxInput = document.getElementById('stockPriceMax');

    const yearMinLabel = document.getElementById('stockYearMinLabel');
    const yearMaxLabel = document.getElementById('stockYearMaxLabel');
    const priceMinLabel = document.getElementById('stockPriceMinLabel');
    const priceMaxLabel = document.getElementById('stockPriceMaxLabel');

    if (yearMinInput && yearMinLabel) yearMinLabel.textContent = yearMinInput.value;
    if (yearMaxInput && yearMaxLabel) yearMaxLabel.textContent = yearMaxInput.value;
    if (priceMinInput && priceMinLabel) priceMinLabel.textContent = formatPrice(Number(priceMinInput.value || 0));
    if (priceMaxInput && priceMaxLabel) priceMaxLabel.textContent = formatPrice(Number(priceMaxInput.value || 0));
}

function formatStoreAge(createdAt) {
    if (!createdAt) return 'Na loja desde: data nao informada';
    const date = new Date(createdAt);
    if (Number.isNaN(date.getTime())) return 'Na loja desde: data invalida';

    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
    const shortDate = date.toLocaleDateString('pt-BR');

    if (diffDays === 0) return `Na loja desde ${shortDate} (hoje)`;
    if (diffDays === 1) return `Na loja desde ${shortDate} (ha 1 dia)`;
    return `Na loja desde ${shortDate} (ha ${diffDays} dias)`;
}

function buildSaleText(car) {
    if (!car) return '';
    const title = capitalizeText(car.title || `${car.brand || ''} ${car.model || ''}`.trim());
    const year = car.year || 'Ano nao informado';
    const km = car.km || 'Km nao informado';
    const fuel = car.fuel || 'Flex';
    const trans = car.transmission || 'Cambio nao informado';
    const price = formatPrice(car.price || 0);
    const topOptions = Array.isArray(car.options) ? car.options.slice(0, 5) : [];
    const highlights = topOptions.length ? topOptions.join(', ') : 'Excelente estado geral e muito bem cuidado';
    const phone = localStorage.getItem('souza_admin_phone') || '5519998383275';

    return `${title}
${year} | ${km} | ${fuel} | ${trans}
Valor: ${price}
Destaques: ${highlights}.
Fale com a gente no WhatsApp: https://wa.me/${phone}`;
}

async function copyTextToClipboard(text) {
    if (!text) return false;
    try {
        await navigator.clipboard.writeText(text);
        return true;
    } catch (e) {
        const temp = document.createElement('textarea');
        temp.value = text;
        document.body.appendChild(temp);
        temp.select();
        const ok = document.execCommand('copy');
        temp.remove();
        return ok;
    }
}

window.generateCarSaleText = async (id) => {
    const car = (carsData || []).find((item) => Number(item.id) === Number(id));
    if (!car) {
        showToast('Veículo não encontrado para gerar texto.');
        return;
    }

    const text = buildSaleText(car);
    const copied = await copyTextToClipboard(text);
    if (copied) {
        showToast('Texto de marketing copiado.');
    } else {
        showToast('Não foi possível copiar automaticamente.');
        alert(text);
    }
};

window.shareCarFromAdmin = (id) => {
    const car = (carsData || []).find((item) => Number(item.id) === Number(id));
    if (!car) {
        showToast('Veículo não encontrado para compartilhar.');
        return;
    }

    const baseUrl = `${window.location.origin}${window.location.pathname.replace(/\/[^/]*$/, '/')}`;
    const detailsUrl = `${baseUrl}detalhes.html?id=${car.id}`;
    const text = `Confira este veículo: ${capitalizeText(car.title)} por ${formatPrice(car.price)} ${detailsUrl}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
};

window.renderAdminList = () => {
    const list = document.getElementById('adminCarList');
    if (!list) return;

    syncStockFilterOptions();
    syncStockRangeBounds();
    updateStockRangeLabels();

    const filtered = applyAdminStockFilters(carsData || []);

    const resultLabel = document.getElementById('stockResultsCount');
    if (resultLabel) {
        resultLabel.textContent = `${filtered.length} resultado(s) encontrado(s)`;
    }

    if (!filtered.length) {
        list.innerHTML = '<div class="help-text" style="padding:20px; text-align:center;">Nenhum veículo encontrado com os filtros atuais.</div>';
        return;
    }

    list.classList.add('admin-stock-grid');

    list.innerHTML = filtered.map(car => {
        const statusLabel = car.condition === 'novos' ? 'Novo' : car.condition === 'seminovos' ? 'Seminovo' : car.condition === 'usados' ? 'Usado' : 'Pendente';
        const statusClass = car.condition ? 'badge-system' : 'badge-pending';

        return `
            <article class="admin-car-item">
                <img src="${Array.isArray(car.images) && car.images.length > 0 ? car.images[0] : (car.image || 'logo.png')}"
                     class="car-item-thumb"
                     onerror="this.src='logo.png'"
                     alt="${car.title}">

                <div class="car-item-content">
                    <h3 class="car-item-title">${capitalizeText(car.title)}</h3>
                    <div class="car-item-meta">${car.year || 'Ano N/A'} | ${car.fuel || 'Flex'}</div>
                    <div class="car-item-badges">
                        <span class="card-badge badge-system">Codigo: ${car.code || 'N/A'}</span>
                        <span class="card-badge badge-system">${car.createdBy || 'Sistema'}</span>
                        <span class="card-badge ${statusClass}">${statusLabel}</span>
                    </div>
                    <div class="car-item-price">${formatPrice(car.price)}</div>
                    <div class="car-item-store-age">${formatStoreAge(car.createdAt)}</div>
                    <div class="admin-car-actions">
                        <div class="admin-car-actions-top">
                            <button class="btn-primary" onclick="editCar(${car.id})">Editar</button>
                            <button class="btn-secondary" onclick="window.open('detalhes.html?id=${car.id}', '_blank')">Visualizar</button>
                            <button class="btn-secondary" onclick="duplicateCar(${car.id})">Duplicar</button>
                        </div>
                        <button class="btn-secondary btn-full" onclick="generateCarSaleText(${car.id})">Gerar texto de marketing</button>
                        <button class="btn-danger btn-danger-solid btn-full" onclick="deleteCar(${car.id})">Excluir</button>
                    </div>
                </div>
            </article>
        `;
    }).join('');
};

window.deleteCar = async (id, options = {}) => {
    if (!options.skipConfirm) {
        if (typeof window.openDeleteCarModal === 'function') {
            window.openDeleteCarModal(id);
            return;
        }
        if (!confirm('Tem certeza que deseja excluir este veículo?')) return;
    }

    try {
        await DB.deleteCar(id);
        await refreshAppData();
        if (window.renderAdminList) window.renderAdminList();
        showToast('Veículo excluído com sucesso!');
    } catch (e) {
        showToast('Erro ao excluir veículo.');
    }
};

function setCarFormMode(mode) {
    const submitBtn = document.getElementById('btnSaveVehicle');
    const duplicateBtn = document.getElementById('duplicateCurrentVehicleBtn');

    if (submitBtn) {
        submitBtn.textContent = mode === 'edit' ? 'Salvar alterações' : 'Salvar Veículo';
    }

    if (duplicateBtn) {
        duplicateBtn.style.display = mode === 'edit' ? 'inline-flex' : 'none';
    }
}

window.editCar = (id, options = {}) => {
    if (window.AdminTabs) {
        window.AdminTabs.open('cadastro');
    }

    const car = (carsData || []).find(c => c.id == id);
    if (!car) {
        showToast('Veículo não encontrado.');
        return;
    }

    const form = document.getElementById('addCarForm');
    if (!form) return;
    const postSaveActions = document.getElementById('postSaveActions');
    if (postSaveActions) postSaveActions.classList.remove('active');
    const saveFeedback = document.getElementById('saveFeedback');
    if (saveFeedback) {
        saveFeedback.style.display = 'none';
        saveFeedback.textContent = '';
    }

    window.selectedBrandName = '';
    window.selectedModelName = '';

    if (form.price) form.price.value = car.price || '';
    if (form.km) form.km.value = (car.km || '').replace(' km', '');
    if (form.description) form.description.value = car.description || '';
    if (form.engine) form.engine.value = car.engine || '';
    if (form.transmission) form.transmission.value = car.transmission || '';
    if (form.power) form.power.value = car.power || '';
    if (form.color) form.color.value = car.color || '';
    if (form.videoUrl) form.videoUrl.value = car.videoUrl || car.video || '';
    if (form.condition) form.condition.value = car.condition || 'seminovos';
    if (form.fuel) form.fuel.value = car.fuel || 'Flex';
    if (form.addedDate) {
        const createdAtDate = car.createdAt ? new Date(car.createdAt) : null;
        form.addedDate.value = createdAtDate && !Number.isNaN(createdAtDate.getTime())
            ? createdAtDate.toISOString().split('T')[0]
            : '';
    }

    const brandSel = document.getElementById('brandSelect');
    const modelSel = document.getElementById('modelSelect');
    const yearSel = document.getElementById('yearSelect');
    const verSel = document.getElementById('versionSelect');

    if (brandSel) {
        brandSel.innerHTML = `<option value="${car.brand}">${car.brand}</option>` + brandSel.innerHTML;
        brandSel.value = car.brand;
        brandSel.disabled = false;
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

    document.querySelectorAll('input[name="carOptions"]').forEach(cb => {
        cb.checked = Array.isArray(car.options) && car.options.includes(cb.value);
    });

    document.querySelectorAll('input[name="lifestyle"]').forEach(cb => {
        cb.checked = Array.isArray(car.lifestyle) && car.lifestyle.includes(cb.value);
    });

    let idInput = form.querySelector('[name="carId"]');
    if (!idInput) {
        idInput = document.createElement('input');
        idInput.type = 'hidden';
        idInput.name = 'carId';
        form.appendChild(idInput);
    }

    idInput.value = options.duplicate ? '' : String(car.id);

    const carImages = Array.isArray(car.images) && car.images.length > 0 ? car.images : (car.image ? [car.image] : []);
    window.carImagesState = carImages
        .filter(url => typeof url === 'string' && url.length > 10)
        .map(url => ({ type: 'url', src: url }));

    if (typeof window.renderImagePreviews === 'function') window.renderImagePreviews();

    if (options.duplicate) {
        if (form.addedDate) form.addedDate.value = new Date().toISOString().split('T')[0];
        setCarFormMode('new');
        showToast('Dados carregados para duplicacao.');
    } else {
        setCarFormMode('edit');
        showToast(`Editando: ${car.title}`);
    }

    if (typeof window.goToCarFormStep === 'function') {
        window.goToCarFormStep(1);
    }

    form.scrollIntoView({ behavior: 'smooth', block: 'start' });
};

window.duplicateCar = (id) => {
    window.editCar(id, { duplicate: true });
};

function formatInteger(value) {
    return new Intl.NumberFormat('pt-BR').format(Number(value || 0));
}

function getVehicleViewsRanking(cars, limit = 5) {
    const analytics = readAnalytics();
    const views = analytics.vehicleViews || {};

    return Object.entries(views)
        .map(([id, count]) => {
            const car = (cars || []).find((item) => Number(item.id) === Number(id));
            return {
                id: Number(id),
                count: Number(count || 0),
                car
            };
        })
        .filter(item => item.car)
        .sort((a, b) => b.count - a.count)
        .slice(0, limit);
}

function getOldestStockVehicle(cars) {
    return (cars || [])
        .filter(item => item && item.createdAt)
        .map(item => ({ car: item, date: new Date(item.createdAt) }))
        .filter(item => !Number.isNaN(item.date.getTime()))
        .sort((a, b) => a.date.getTime() - b.date.getTime())[0] || null;
}

window.renderAdminDashboard = () => {
    const wrapper = document.getElementById('dashboardTopVehicles');
    if (!wrapper) return;

    const totalAccessEl = document.getElementById('dashTotalAccess');
    const todayAccessEl = document.getElementById('dashTodayAccess');
    const stockCountEl = document.getElementById('dashStockCount');
    const topVehicleEl = document.getElementById('dashTopVehicle');
    const insightsEl = document.getElementById('dashboardStockInsights');

    const analytics = readAnalytics();
    const today = getTodayKey();
    const cars = Array.isArray(carsData) ? carsData : [];
    const ranking = getVehicleViewsRanking(cars, 5);
    const oldest = getOldestStockVehicle(cars);

    if (totalAccessEl) totalAccessEl.textContent = formatInteger(analytics.totalAccess || 0);
    if (todayAccessEl) todayAccessEl.textContent = formatInteger((analytics.dailyAccess || {})[today] || 0);
    if (stockCountEl) stockCountEl.textContent = formatInteger(cars.length);
    if (topVehicleEl) {
        topVehicleEl.textContent = ranking.length ? capitalizeText(ranking[0].car.title || '-') : '-';
    }

    if (!ranking.length) {
        wrapper.innerHTML = '<div class="help-text">Ainda não há dados de acessos em veículos nesta navegação.</div>';
    } else {
        wrapper.innerHTML = ranking.map((item, idx) => `
            <article class="dashboard-list-item">
                <div class="dashboard-list-title">${idx + 1}. ${capitalizeText(item.car.title || 'Veículo')}</div>
                <div class="dashboard-list-meta">Visualizações: ${formatInteger(item.count)} | Ano: ${item.car.year || '-'}</div>
            </article>
        `).join('');
    }

    const mostViewed = ranking[0] || null;
    const insights = [];
    if (oldest) {
        const date = oldest.date.toLocaleDateString('pt-BR');
        insights.push(`<article class="dashboard-list-item"><div class="dashboard-list-title">Veículo há mais tempo no estoque</div><div class="dashboard-list-meta">${capitalizeText(oldest.car.title || 'Veículo')} | Desde ${date}</div></article>`);
    }
    if (mostViewed) {
        insights.push(`<article class="dashboard-list-item"><div class="dashboard-list-title">Veículo mais clicado</div><div class="dashboard-list-meta">${capitalizeText(mostViewed.car.title || 'Veículo')} | ${formatInteger(mostViewed.count)} acessos</div></article>`);
    }
    if (!insights.length) {
        insights.push('<div class="help-text">Sem dados suficientes para gerar insights.</div>');
    }
    if (insightsEl) insightsEl.innerHTML = insights.join('');
};

function initAdmin() {
    const form = document.getElementById('addCarForm');
    const list = document.getElementById('adminCarList');
    if (!form || !list) return;

    const brandSelect = document.getElementById('brandSelect');
    const modelSelect = document.getElementById('modelSelect');
    const yearSelect = document.getElementById('yearSelect');
    const versionSelect = document.getElementById('versionSelect');

    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            localStorage.removeItem('souza_session');
            window.location.href = 'login.html';
        });
    }

    window.selectedBrandName = '';
    window.selectedModelName = '';
    window.carImagesState = [];
    window.lastSavedCarId = null;

    const FIPE_BASE = 'https://parallelum.com.br/fipe/api/v1';
    let currentVehicleType = 'carros';
    const selectCache = {
        brand: [],
        model: [],
        year: [],
        version: []
    };
    const selectsMap = {
        brand: brandSelect,
        model: modelSelect,
        year: yearSelect,
        version: versionSelect
    };

    function renderSelectWithFilter(type, placeholder) {
        const select = selectsMap[type];
        if (!select) return;

        const options = selectCache[type] || [];
        const currentValue = select.value;

        select.innerHTML = `<option value="">${placeholder}</option>` + options.map(opt => `<option value="${opt.value}">${opt.label}</option>`).join('');
        if (options.some(opt => String(opt.value) === String(currentValue))) {
            select.value = currentValue;
        }
    }

    function setSelectCache(type, options, placeholder) {
        selectCache[type] = Array.isArray(options) ? options : [];
        renderSelectWithFilter(type, placeholder);
    }

    function resetDependentSelects() {
        setSelectCache('model', [], 'Selecione a marca primeiro');
        setSelectCache('year', [], 'Selecione o modelo primeiro');
        setSelectCache('version', [], 'Selecione o ano');
        modelSelect.disabled = true;
        yearSelect.disabled = true;
        versionSelect.disabled = true;
    }

    const optionsContainer = document.getElementById('optionsContainer');
    const newOptionInput = document.getElementById('newOptionInput');
    const btnAddOption = document.getElementById('btnAddOption');

    const duplicateCurrentVehicleBtn = document.getElementById('duplicateCurrentVehicleBtn');
    const postSaveActions = document.getElementById('postSaveActions');
    const shareSavedBtn = document.getElementById('btnShareSavedVehicle');
    const generateSavedTextBtn = document.getElementById('btnGenerateSavedText');

    if (shareSavedBtn) {
        shareSavedBtn.addEventListener('click', () => {
            if (!window.lastSavedCarId) {
                showToast('Salve um veículo para compartilhar.');
                return;
            }
            window.shareCarFromAdmin(window.lastSavedCarId);
        });
    }

    if (generateSavedTextBtn) {
        generateSavedTextBtn.addEventListener('click', async () => {
            if (!window.lastSavedCarId) {
                showToast('Salve um veículo para gerar texto.');
                return;
            }
            await window.generateCarSaleText(window.lastSavedCarId);
        });
    }

    if (duplicateCurrentVehicleBtn) {
        duplicateCurrentVehicleBtn.addEventListener('click', () => {
            const idInput = form.querySelector('[name="carId"]');
            const editingId = idInput ? idInput.value : '';
            if (!editingId) {
                showToast('Nenhum veículo em edição para duplicar.');
                return;
            }
            window.duplicateCar(Number(editingId));
        });
    }

    function setSaveFeedback(message, isError = false) {
        const feedbackEl = document.getElementById('saveFeedback');
        if (!feedbackEl) return;
        if (window.adminSaveFeedbackTimer) {
            clearTimeout(window.adminSaveFeedbackTimer);
            window.adminSaveFeedbackTimer = null;
        }
        if (!message) {
            feedbackEl.textContent = '';
            feedbackEl.style.display = 'none';
            return;
        }

        feedbackEl.textContent = message;
        feedbackEl.style.display = 'block';
        feedbackEl.style.color = isError ? '#b42318' : '#117a3f';

        window.adminSaveFeedbackTimer = setTimeout(() => {
            feedbackEl.style.display = 'none';
        }, 5000);
    }

    (function bindDeleteCarModal() {
        const modal = document.getElementById('deleteCarModal');
        const cancelBtn = document.getElementById('deleteCarModalCancel');
        const confirmBtn = document.getElementById('deleteCarModalConfirm');
        let pendingId = null;

        if (!modal || !confirmBtn || !cancelBtn) {
            window.openDeleteCarModal = null;
            return;
        }

        const close = () => {
            modal.classList.remove('active');
            modal.setAttribute('aria-hidden', 'true');
            pendingId = null;
        };

        window.openDeleteCarModal = (id) => {
            pendingId = Number(id);
            modal.classList.add('active');
            modal.setAttribute('aria-hidden', 'false');
        };

        cancelBtn.addEventListener('click', close);
        modal.addEventListener('click', (e) => {
            if (e.target === modal) close();
        });

        confirmBtn.addEventListener('click', async () => {
            if (!pendingId && pendingId !== 0) return;
            const targetId = pendingId;
            close();
            await window.deleteCar(targetId, { skipConfirm: true });
        });
    })();

    function getStepElements() {
        return Array.from(document.querySelectorAll('.admin-step'));
    }

    function refreshStepperUI() {
        const currentStep = window.adminStepState.current;
        const steps = getStepElements();
        steps.forEach((stepEl) => {
            const stepNumber = Number(stepEl.dataset.step);
            stepEl.classList.toggle('active', stepNumber === currentStep);
        });

        document.querySelectorAll('[data-step-dot]').forEach(dot => {
            dot.classList.toggle('active', Number(dot.dataset.stepDot) === currentStep);
        });

        const prevBtn = document.getElementById('btnStepPrev');
        const nextBtn = document.getElementById('btnStepNext');
        const saveBtn = document.getElementById('btnSaveVehicle');

        if (prevBtn) prevBtn.disabled = currentStep === 1;
        if (nextBtn) nextBtn.style.display = currentStep === window.adminStepState.total ? 'none' : 'inline-flex';
        if (saveBtn) saveBtn.style.display = 'inline-flex';
    }

    function validateStep(step) {
        if (step === 1) {
            const brandOk = !!brandSelect.value;
            const modelOk = !!modelSelect.value;
            const yearOk = !!yearSelect.value;
            const versionOk = !!versionSelect.value;

            if (!brandOk || !modelOk || !yearOk || !versionOk) {
                showToast('Preencha todos os dados do veículo antes de continuar.');
                return false;
            }
            return true;
        }

        if (step === 2) {
            const price = form.price ? String(form.price.value).trim() : '';
            const km = form.km ? String(form.km.value).trim() : '';
            const condition = form.condition ? String(form.condition.value).trim() : '';

            if (!price || Number(price) <= 0) {
                showToast('Informe um preco valido para continuar.');
                return false;
            }

            if (!km) {
                showToast('Informe a quilometragem para continuar.');
                return false;
            }

            if (!condition) {
                showToast('Informe a classificacao para continuar.');
                return false;
            }

            return true;
        }

        return true;
    }

    window.goToCarFormStep = (stepNumber) => {
        const nextStep = Math.min(window.adminStepState.total, Math.max(1, Number(stepNumber)));
        window.adminStepState.current = nextStep;
        refreshStepperUI();
    };

    const stepPrevBtn = document.getElementById('btnStepPrev');
    const stepNextBtn = document.getElementById('btnStepNext');

    if (stepPrevBtn) {
        stepPrevBtn.addEventListener('click', () => {
            window.goToCarFormStep(window.adminStepState.current - 1);
        });
    }

    if (stepNextBtn) {
        stepNextBtn.addEventListener('click', () => {
            if (!validateStep(window.adminStepState.current)) return;
            window.goToCarFormStep(window.adminStepState.current + 1);
        });
    }

    window.goToCarFormStep(1);

    window.toggleVehicleType = () => {
        const select = document.getElementById('vehicleTypeSelect');
        if (select) {
            currentVehicleType = select.value;
            loadBrands();
        }
    };

    const imageInput = document.getElementById('carImageFile');
    const previewContainer = document.getElementById('imagePreviews');
    let draggedItemIndex = null;

    window.renderImagePreviews = () => {
        if (!previewContainer) return;

        previewContainer.innerHTML = '';

        window.carImagesState.forEach((imgObj, index) => {
            const wrapper = document.createElement('div');
            wrapper.draggable = true;
            wrapper.dataset.index = String(index);
            wrapper.style.cssText = 'position:relative; flex-shrink:0; width:100px; height:80px; border:1px solid #e0e0e0; border-radius:6px; overflow:hidden; background:#fff; cursor:grab;';

            const displaySrc = imgObj.type === 'file' ? URL.createObjectURL(imgObj.src) : imgObj.src;

            wrapper.innerHTML = `
                <img src="${displaySrc}" style="width:100%; height:100%; object-fit:cover; pointer-events:none;" onerror="this.onerror=null; this.src='logo.png'; this.style.opacity='0.5';">
                <div style="position:absolute; bottom:0; left:0; right:0; background:rgba(0,0,0,0.65); display:flex; justify-content:flex-end; padding:2px;">
                    <button type="button" onclick="window.removeImage(${index})" style="background:none; border:none; color:#ff6b6b; cursor:pointer; font-size:12px; font-weight:500; padding:0 4px;">x</button>
                </div>
                ${index === 0 ? '<div style="position:absolute; top:3px; left:3px; background:#FF9500; color:#fff; font-size:8px; font-weight:700; padding:2px 4px; border-radius:3px;">CAPA</div>' : ''}
            `;

            wrapper.addEventListener('dragstart', (e) => {
                draggedItemIndex = index;
                e.dataTransfer.effectAllowed = 'move';
                wrapper.style.opacity = '0.5';
                wrapper.style.borderColor = '#FF9500';
            });

            wrapper.addEventListener('dragend', () => {
                wrapper.style.opacity = '1';
                wrapper.style.borderColor = '#e0e0e0';
                draggedItemIndex = null;
            });

            wrapper.addEventListener('dragover', (e) => {
                e.preventDefault();
            });

            wrapper.addEventListener('drop', (e) => {
                e.preventDefault();
                if (draggedItemIndex === null || draggedItemIndex === index) return;

                const movedItem = window.carImagesState[draggedItemIndex];
                window.carImagesState.splice(draggedItemIndex, 1);
                window.carImagesState.splice(index, 0, movedItem);
                window.renderImagePreviews();
            });

            previewContainer.appendChild(wrapper);
        });
    };

    window.removeImage = (index) => {
        window.carImagesState.splice(index, 1);
        window.renderImagePreviews();
    };

    if (imageInput) {
        imageInput.addEventListener('change', async (e) => {
            const files = Array.from(e.target.files || []);
            if (!files.length) return;

            const submitBtn = document.getElementById('btnSaveVehicle');
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.textContent = 'Processando fotos...';
            }

            for (const file of files) {
                try {
                    const processedFile = await convertHeicFile(file);
                    if (processedFile !== file) showToast('Foto do iPhone convertida!');
                    window.carImagesState.push({ type: 'file', src: processedFile });
                    window.renderImagePreviews();
                } catch (err) {
                    console.error('[Upload] Erro no arquivo:', file.name, err);
                    showToast(`Erro no arquivo: ${file.name}.`);
                }
            }

            if (submitBtn) {
                submitBtn.disabled = false;
                setCarFormMode(form.querySelector('[name="carId"]').value ? 'edit' : 'new');
            }

            imageInput.value = '';
        });
    }

    function getStoredOptions() {
        let stored = [];
        try {
            stored = JSON.parse(localStorage.getItem('souza_options') || '[]');
        } catch (e) {
            stored = [];
        }

        const defaults = [
            'Ar Condicionado', 'Ar Condicionado Digital', 'Direcao Hidraulica', 'Direcao Eletrica',
            'Vidro Eletrico', 'Trava Eletrica', 'Alarme', 'Airbag Duplo', 'Airbag Lateral',
            'Freios ABS', 'Freio de Mao Eletronico', 'Controle de Estabilidade', 'Controle de Tracao',
            'Som Multimidia', 'Bluetooth', 'USB', 'GPS Integrado', 'CarPlay / Android Auto',
            'Camera de Re', 'Sensor de Estacionamento', 'Sensor Dianteiro', 'Camera 360',
            'Bancos de Couro', 'Ajuste Eletrico dos Bancos', 'Aquecimento dos Bancos',
            'Teto Solar', 'Teto Panoramico', 'Rodas de Liga Leve', 'Farois de LED', 'Farol de Milha',
            'Computador de Bordo', 'Piloto Automatico', 'Painel Digital', 'Chave Presencial',
            'Partida Start/Stop', 'Partida Remota', 'Carregador por Inducao', 'Retrovisores Eletricos',
            'Assistente de Faixa', 'Sensor de Chuva', 'Sensor de Luz', 'Volante Multifuncional',
            'Paddle Shifts', 'Alerta de Ponto Cego', 'Assistente de Partida em Rampa'
        ];

        const merged = [...new Set([...defaults, ...stored])].sort((a, b) => a.localeCompare(b));
        localStorage.setItem('souza_options', JSON.stringify(merged));
        return merged;
    }

    window.filterOptions = () => {
        const query = (document.getElementById('searchOptionInput').value || '').toLowerCase();
        optionsContainer.querySelectorAll('.option-item').forEach((label) => {
            const text = label.innerText.toLowerCase();
            label.style.display = text.includes(query) ? 'inline-flex' : 'none';
        });
    };

    window.updateOptionsSummary = () => {
        // Summary removed intentionally by new admin layout.
    };

    function renderOptions() {
        const options = getStoredOptions();
        optionsContainer.innerHTML = options.map(opt => `
            <label class="option-item">
                <input type="checkbox" name="carOptions" value="${opt}">
                <span>${opt}</span>
            </label>
        `).join('');

        window.filterOptions();
    }

    function addNewOption() {
        const val = (newOptionInput.value || '').trim();
        if (!val) return;

        const current = getStoredOptions();
        if (current.some(o => o.toLowerCase() === val.toLowerCase())) {
            alert('Este opcional ja existe.');
            return;
        }

        current.push(val);
        current.sort((a, b) => a.localeCompare(b));
        localStorage.setItem('souza_options', JSON.stringify(current));
        renderOptions();
        newOptionInput.value = '';

        setTimeout(() => {
            const match = document.querySelector(`input[name="carOptions"][value="${val}"]`);
            if (match) match.checked = true;
        }, 30);
    }

    if (btnAddOption) btnAddOption.addEventListener('click', addNewOption);
    if (newOptionInput) {
        newOptionInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                addNewOption();
            }
        });
    }

    async function loadBrands() {
        try {
            setSelectCache('brand', [], 'Carregando...');
            const res = await fetch(`${FIPE_BASE}/${currentVehicleType}/marcas`);
            if (!res.ok) throw new Error('API Error');
            let brands = await res.json();

            brands = brands.map(b => {
                if (b.nome && b.nome.toUpperCase() === 'CHEVROLET') {
                    return { ...b, nome: 'GM - Chevrolet' };
                }
                return b;
            });

            const allBrands = [...brands].sort((a, b) => a.nome.localeCompare(b.nome));

            setSelectCache('brand', allBrands.map(b => ({ value: b.codigo, label: b.nome })), 'Selecione a Marca');
            brandSelect.disabled = false;
            resetDependentSelects();
        } catch (error) {
            console.warn('FIPE API indisponivel, fallback local.', error);
            const fallbackBrands = [
                { codigo: '23', nome: 'GM - Chevrolet' }, { codigo: '21', nome: 'Fiat' },
                { codigo: '59', nome: 'Volkswagen' }, { codigo: '22', nome: 'Ford' },
                { codigo: '26', nome: 'Hyundai' }, { codigo: '25', nome: 'Honda' },
                { codigo: '56', nome: 'Toyota' }, { codigo: '29', nome: 'Jeep' },
                { codigo: '13', nome: 'BMW' }, { codigo: '39', nome: 'Mercedes-Benz' }
            ];

            setSelectCache('brand', fallbackBrands.map(b => ({ value: b.codigo, label: b.nome })), 'Selecione a Marca');
            brandSelect.disabled = false;
            resetDependentSelects();
        }
    }

    brandSelect.addEventListener('change', async () => {
        const brandCode = brandSelect.value;
        const vehicleType = document.getElementById('vehicleTypeSelect') ? document.getElementById('vehicleTypeSelect').value : 'carros';
        window.selectedBrandName = brandSelect.options[brandSelect.selectedIndex] ? brandSelect.options[brandSelect.selectedIndex].text : '';

        setSelectCache('model', [], 'Carregando...');
        modelSelect.disabled = true;
        setSelectCache('year', [], 'Selecione o modelo primeiro');
        setSelectCache('version', [], 'Selecione o ano');
        yearSelect.disabled = true;
        versionSelect.disabled = true;

        if (!brandCode) return;

        try {
            const res = await fetch(`${FIPE_BASE}/${vehicleType}/marcas/${brandCode}/modelos`);
            const data = await res.json();
            const modelOptions = Array.isArray(data?.modelos)
                ? data.modelos.map(m => ({ value: m.codigo, label: m.nome }))
                : [];
            setSelectCache('model', modelOptions, 'Selecione o Modelo');
            modelSelect.disabled = false;
        } catch (error) {
            console.error(error);
        }
    });

    modelSelect.addEventListener('change', async () => {
        const brandCode = brandSelect.value;
        const modelCode = modelSelect.value;
        const vehicleType = document.getElementById('vehicleTypeSelect') ? document.getElementById('vehicleTypeSelect').value : 'carros';
        window.selectedModelName = modelSelect.options[modelSelect.selectedIndex] ? modelSelect.options[modelSelect.selectedIndex].text : '';

        setSelectCache('year', [], 'Carregando...');
        yearSelect.disabled = true;
        setSelectCache('version', [], 'Selecione o ano');
        versionSelect.disabled = true;

        if (!modelCode) return;

        try {
            const res = await fetch(`${FIPE_BASE}/${vehicleType}/marcas/${brandCode}/modelos/${modelCode}/anos`);
            const years = await res.json();

            const yearOptions = Array.isArray(years)
                ? years.map(y => ({ value: y.codigo, label: y.nome }))
                : [];
            setSelectCache('year', yearOptions, 'Selecione o Ano');
            yearSelect.disabled = false;
        } catch (error) {
            console.error(error);
        }
    });

    yearSelect.addEventListener('change', async () => {
        const brandCode = brandSelect.value;
        const modelCode = modelSelect.value;
        const yearCode = yearSelect.value;
        const vehicleType = document.getElementById('vehicleTypeSelect') ? document.getElementById('vehicleTypeSelect').value : 'carros';

        if (!yearCode) return;

        try {
            const res = await fetch(`${FIPE_BASE}/${vehicleType}/marcas/${brandCode}/modelos/${modelCode}/anos/${yearCode}`);
            const details = await res.json();

            const fipePrice = details.Valor.replace('R$ ', '').replace(/\./g, '').replace(',', '.');
            if (form.price && (!form.price.value || Number(form.price.value) === 0)) {
                form.price.value = parseFloat(fipePrice);
            }

            setSelectCache('version', [{ value: details.Modelo, label: details.Modelo }], 'Selecione a versao');
            versionSelect.disabled = false;
        } catch (error) {
            console.error(error);
        }
    });

    async function saveVehicleForm(e) {
        e.preventDefault();
        setSaveFeedback('');

        if (!validateStep(1)) {
            window.goToCarFormStep(1);
            setSaveFeedback('Preencha os dados do veículo para salvar.', true);
            return;
        }
        if (!validateStep(2)) {
            window.goToCarFormStep(2);
            setSaveFeedback('Preencha os detalhes da venda para salvar.', true);
            return;
        }

        try {
            const editIdInput = form.querySelector('[name="carId"]');
            const editId = editIdInput ? editIdInput.value : null;

            let imagesData = [];
            let finalUrls = [];
            let originalBtnText = '';

            if (window.carImagesState.length > 0) {
                const btn = document.getElementById('btnSaveVehicle');
                if (btn) {
                    originalBtnText = btn.textContent;
                    btn.textContent = 'Processando fotos...';
                    btn.disabled = true;
                }

                try {
                    let imgCount = 0;
                    const totalImgs = window.carImagesState.length;

                    for (const imgObj of window.carImagesState) {
                        imgCount += 1;
                        const btn = document.getElementById('btnSaveVehicle');
                        if (btn) btn.textContent = `Enviando ${imgCount}/${totalImgs}...`;

                        if (imgObj.type === 'url') {
                            if (imgObj.src && imgObj.src.length > 10) finalUrls.push(imgObj.src);
                            continue;
                        }

                        const file = imgObj.src;
                        let blobToUpload = file;

                        if (file.size > 2 * 1024 * 1024) {
                            try {
                                const compressedBase64 = await compressImage(file, 0.7);
                                const arr = compressedBase64.split(',');
                                const mime = arr[0].match(/:(.*?);/)[1];
                                const bstr = atob(arr[1]);
                                let n = bstr.length;
                                const u8arr = new Uint8Array(n);
                                while (n--) u8arr[n] = bstr.charCodeAt(n);
                                blobToUpload = new Blob([u8arr], { type: mime });
                            } catch (err) {
                                console.warn('Falha ao comprimir imagem. Usando arquivo original.');
                            }
                        }

                        const safeName = `img_${Date.now()}_${Math.random().toString(36).substring(7)}`;
                        const fileName = `${safeName}.jpg`;

                        let uploadSuccess = false;
                        if (supabaseClient) {
                            try {
                                const { error } = await supabaseClient.storage.from('car-photos').upload(fileName, blobToUpload, {
                                    contentType: 'image/jpeg',
                                    cacheControl: '3600'
                                });

                                if (!error) {
                                    const { data: publicData } = supabaseClient.storage.from('car-photos').getPublicUrl(fileName);
                                    if (publicData) {
                                        finalUrls.push(publicData.publicUrl);
                                        uploadSuccess = true;
                                    }
                                }
                            } catch (err) {
                                console.error('Supabase Exception:', err);
                            }
                        }

                        if (!uploadSuccess) {
                            showToast(`Upload falhou, salvando localmente: ${file.name}`);
                            try {
                                const base64Local = await fileToBase64(blobToUpload);
                                finalUrls.push(base64Local);
                            } catch (err) {
                                console.error('Falha ao converter para base64:', err);
                            }
                        }
                    }
                } finally {
                    const btn = document.getElementById('btnSaveVehicle');
                    if (btn) {
                        btn.textContent = originalBtnText || 'Salvar Veículo';
                        btn.disabled = false;
                    }
                }

                imagesData = finalUrls.filter(Boolean);
            } else if (editId) {
                const existingCar = (carsData || []).find(c => c.id == editId);
                imagesData = existingCar ? (existingCar.images || []) : [];
            }

            const checkedOptions = Array.from(document.querySelectorAll('input[name="carOptions"]:checked')).map(cb => cb.value).filter(Boolean);
            const selectedLifestyle = Array.from(document.querySelectorAll('input[name="lifestyle"]:checked')).map(cb => cb.value);

            const existingCar = editId ? (carsData || []).find(c => c.id == editId) : null;

            let brand = brandSelect.options[brandSelect.selectedIndex] ? brandSelect.options[brandSelect.selectedIndex].text.trim() : '';
            let model = modelSelect.options[modelSelect.selectedIndex] ? modelSelect.options[modelSelect.selectedIndex].text.trim() : '';
            let yearText = yearSelect.options[yearSelect.selectedIndex] ? yearSelect.options[yearSelect.selectedIndex].text.trim() : '';
            let versionText = versionSelect.options[versionSelect.selectedIndex] ? versionSelect.options[versionSelect.selectedIndex].text.trim() : '';

            if (editId && existingCar) {
                if (!brand) brand = existingCar.brand;
                if (!model) model = existingCar.model;
                if (!yearText) yearText = existingCar.year;
            }

            if (!brand || !model) {
                showToast('Preencha marca e modelo.');
                return;
            }

            const rawVideoUrl = form.videoUrl ? String(form.videoUrl.value || '').trim() : '';
            if (rawVideoUrl && !resolveYoutubeEmbedUrl(rawVideoUrl)) {
                showToast('URL de video invalida. Use um link do YouTube.');
                return;
            }

            let currentUser = 'Sistema';
            const sessionData = localStorage.getItem('souza_session');
            if (sessionData) {
                try {
                    const session = JSON.parse(sessionData);
                    if (session && session.username) currentUser = session.username;
                } catch (e) { }
            }

            const domUser = document.getElementById('lblUsername');
            if (domUser && domUser.innerText) {
                const txt = domUser.innerText.trim();
                if (txt && txt !== '...' && txt !== 'undefined') currentUser = txt;
            }

            const generateCarCode = () => {
                const year = new Date().getFullYear();
                const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
                let random = '';
                for (let i = 0; i < 4; i++) random += chars.charAt(Math.floor(Math.random() * chars.length));
                return `SZ${year}${random}`;
            };

            let finalTitle = `${brand} ${model}`.trim();
            if (versionText && !finalTitle.toLowerCase().includes(versionText.toLowerCase())) {
                finalTitle += ` ${versionText}`;
            }

            const addedDateRaw = form.addedDate ? String(form.addedDate.value || '').trim() : '';
            let createdAtValue = editId && existingCar ? existingCar.createdAt : new Date().toISOString();
            if (addedDateRaw) {
                const fallbackTime = (createdAtValue && createdAtValue.includes('T'))
                    ? createdAtValue.split('T')[1]
                    : '12:00:00.000Z';
                createdAtValue = `${addedDateRaw}T${fallbackTime}`;
            }

            const carObj = {
                id: editId ? Number(editId) : Date.now(),
                code: (existingCar && existingCar.code) ? existingCar.code : generateCarCode(),
                title: capitalizeText(finalTitle),
                brand: capitalizeText(brand),
                model: capitalizeText(model),
                year: yearText,
                price: Number(form.price.value),
                km: form.km.value.includes('km') ? form.km.value : `${form.km.value} km`,
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
                videoUrl: rawVideoUrl,
                isManual: false,
                type: currentVehicleType,
                createdBy: editId && existingCar ? (existingCar.createdBy || currentUser) : currentUser,
                lastEditedBy: currentUser,
                createdAt: createdAtValue
            };

            await DB.saveCar(carObj);
            await refreshAppData();
            if (window.renderAdminList) window.renderAdminList();

            showToast(editId ? 'Veículo atualizado!' : `Veículo cadastrado! Codigo: ${carObj.code}`);
            setSaveFeedback('Veículo salvo com sucesso.');
            window.lastSavedCarId = Number(carObj.id);

            if (postSaveActions) postSaveActions.classList.add('active');

            form.reset();
            if (form.addedDate) form.addedDate.value = new Date().toISOString().split('T')[0];
            window.carImagesState = [];
            window.renderImagePreviews();
            if (imageInput) imageInput.value = '';

            loadBrands();

            const idInp = form.querySelector('[name="carId"]');
            if (idInp) idInp.value = '';

            window.selectedBrandName = '';
            window.selectedModelName = '';

            setCarFormMode('new');
            window.goToCarFormStep(1);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } catch (err) {
            console.error('Erro no salvamento:', err);
            showToast('Erro ao salvar. Verifique o console.');
            setSaveFeedback('Erro ao salvar o veículo.', true);
        }
    }

    form.addEventListener('submit', saveVehicleForm);

    function bindStockFilters() {
        const searchInput = document.getElementById('stockSearchInput');
        const brandFilter = document.getElementById('stockFilterBrand');
        const statusFilter = document.getElementById('stockFilterStatus');
        const fuelFilter = document.getElementById('stockFilterFuel');
        const yearMinInput = document.getElementById('stockYearMin');
        const yearMaxInput = document.getElementById('stockYearMax');
        const priceMinInput = document.getElementById('stockPriceMin');
        const priceMaxInput = document.getElementById('stockPriceMax');
        const typeFilter = document.getElementById('stockFilterType');
        const clearBtn = document.getElementById('clearStockFilters');

        if (searchInput) {
            searchInput.addEventListener('input', () => {
                window.adminStockFilterState.search = searchInput.value;
                window.renderAdminList();
            });
        }

        if (brandFilter) {
            brandFilter.addEventListener('change', () => {
                window.adminStockFilterState.brand = brandFilter.value;
                window.renderAdminList();
            });
        }

        if (typeFilter) {
            typeFilter.addEventListener('change', () => {
                window.adminStockFilterState.type = typeFilter.value;
                window.renderAdminList();
            });
        }

        if (statusFilter) {
            statusFilter.addEventListener('change', () => {
                window.adminStockFilterState.status = statusFilter.value;
                window.renderAdminList();
            });
        }

        if (fuelFilter) {
            fuelFilter.addEventListener('change', () => {
                window.adminStockFilterState.fuel = fuelFilter.value;
                window.renderAdminList();
            });
        }

        if (yearMinInput) {
            yearMinInput.addEventListener('input', () => {
                window.adminStockFilterState.yearMin = Number(yearMinInput.value);
                updateStockRangeLabels();
                window.renderAdminList();
            });
        }

        if (yearMaxInput) {
            yearMaxInput.addEventListener('input', () => {
                window.adminStockFilterState.yearMax = Number(yearMaxInput.value);
                updateStockRangeLabels();
                window.renderAdminList();
            });
        }

        if (priceMinInput) {
            priceMinInput.addEventListener('input', () => {
                window.adminStockFilterState.priceMin = Number(priceMinInput.value);
                updateStockRangeLabels();
                window.renderAdminList();
            });
        }

        if (priceMaxInput) {
            priceMaxInput.addEventListener('input', () => {
                window.adminStockFilterState.priceMax = Number(priceMaxInput.value);
                updateStockRangeLabels();
                window.renderAdminList();
            });
        }

        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                window.adminStockFilterState.search = '';
                window.adminStockFilterState.brand = '';
                window.adminStockFilterState.type = '';
                window.adminStockFilterState.status = '';
                window.adminStockFilterState.fuel = '';

                window.adminStockRangesBootstrapped = false;
                syncStockRangeBounds();
                updateStockRangeLabels();

                if (searchInput) searchInput.value = '';
                if (brandFilter) brandFilter.value = '';
                if (typeFilter) typeFilter.value = '';
                if (statusFilter) statusFilter.value = '';
                if (fuelFilter) fuelFilter.value = '';

                window.renderAdminList();
            });
        }
    }

    function formatLastLogin(dateValue) {
        if (!dateValue) return 'Nunca logou';
        const date = new Date(dateValue);
        if (Number.isNaN(date.getTime())) return 'Nunca logou';
        return date.toLocaleString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    function getSellerStockCount(username) {
        return (carsData || []).filter(c => (c.createdBy || '').toLowerCase() === (username || '').toLowerCase()).length;
    }

    window.renderSellers = async (forceReload = false) => {
        const container = document.getElementById('sellersList');
        if (!container) return;

        if (forceReload || !Array.isArray(window.adminSellerCache) || !window.adminSellerCache.length) {
            container.innerHTML = '<div class="help-text">Consultando base de dados...</div>';

            let sellers = [];
            if (supabaseClient) {
                const { data, error } = await supabaseClient.from('vendedores').select('*').order('username');
                if (!error && Array.isArray(data)) sellers = data;
            }
            window.adminSellerCache = sellers;
        }

        const searchTerm = (document.getElementById('sellerSearchInput')?.value || '').toLowerCase().trim();
        const sortMode = document.getElementById('sellerSortSelect')?.value || 'name';

        let sellers = [...window.adminSellerCache];

        if (searchTerm) {
            sellers = sellers.filter(s => (s.username || '').toLowerCase().includes(searchTerm));
        }

        sellers.sort((a, b) => {
            if (sortMode === 'logins') {
                const aDate = a.last_login ? new Date(a.last_login).getTime() : 0;
                const bDate = b.last_login ? new Date(b.last_login).getTime() : 0;
                return bDate - aDate;
            }

            if (sortMode === 'stock') {
                return getSellerStockCount(b.username) - getSellerStockCount(a.username);
            }

            return (a.username || '').localeCompare(b.username || '');
        });

        if (!sellers.length) {
            container.innerHTML = '<div class="help-text">Nenhum vendedor encontrado.</div>';
            return;
        }

        container.innerHTML = sellers.map(seller => {
            const totalCars = getSellerStockCount(seller.username);
            const loginCount = Number(seller.login_count || 0);

            return `
                <article class="seller-card">
                    <h3 class="seller-title">Nome: ${seller.username.toUpperCase()}</h3>
                    <div class="seller-line"></div>
                    <div class="seller-meta">Senha: ${seller.password}</div>
                    <div class="seller-meta">Ultimo acesso: ${formatLastLogin(seller.last_login)}</div>
                    <div class="seller-line"></div>
                    <div class="seller-kpis">
                        <span class="card-badge badge-inactive">${loginCount} logins</span>
                        <span class="card-badge badge-inactive">${totalCars} carros em estoque</span>
                    </div>
                    <div class="seller-line"></div>
                    <div class="seller-actions">
                        <button class="btn-secondary" onclick="editSeller('${seller.username}')">Edit</button>
                        <button class="btn-danger" onclick="deleteSeller('${seller.username}')">Remove</button>
                        <button class="btn-secondary" onclick="duplicateSeller('${seller.username}')">Duplicar</button>
                    </div>
                </article>
            `;
        }).join('');
    };

    window.createSeller = async () => {
        const usernameInput = document.getElementById('sellerUser');
        const passInput = document.getElementById('sellerPass');
        const sellerForm = document.getElementById('newSellerForm');

        const username = (usernameInput?.value || '').trim();
        const password = (passInput?.value || '').trim();

        if (!username || !password) {
            alert('Preencha usuario e senha.');
            return;
        }

        if (!supabaseClient) {
            alert('Conexao com Supabase nao esta ativa.');
            return;
        }

        const isEditing = sellerForm.dataset.editMode === 'true';
        const oldUsername = sellerForm.dataset.oldUsername;

        try {
            if (isEditing) {
                const { error } = await supabaseClient
                    .from('vendedores')
                    .update({ username, password })
                    .eq('username', oldUsername);

                if (error) throw error;
                showToast('Vendedor atualizado com sucesso!');
            } else {
                const { error } = await supabaseClient
                    .from('vendedores')
                    .insert([{ username, password, role: 'vendedor' }]);

                if (error) {
                    if (error.code === '23505') {
                        alert('Este nome de usuario ja existe.');
                        return;
                    }
                    throw error;
                }

                showToast('Vendedor criado com sucesso!');
            }

            sellerForm.reset();
            delete sellerForm.dataset.editMode;
            delete sellerForm.dataset.oldUsername;
            const submitBtn = sellerForm.querySelector('button[type="submit"]');
            if (submitBtn) submitBtn.textContent = 'Criar';

            await window.renderSellers(true);
        } catch (err) {
            console.error('Erro vendedores:', err);
            alert(`Erro ao processar vendedor: ${err.message}`);
        }
    };

    window.editSeller = async (username) => {
        if (!supabaseClient) return;

        const { data, error } = await supabaseClient
            .from('vendedores')
            .select('*')
            .eq('username', username)
            .single();

        if (error || !data) return;

        const sellerForm = document.getElementById('newSellerForm');
        const submitBtn = sellerForm.querySelector('button[type="submit"]');

        document.getElementById('sellerUser').value = data.username;
        document.getElementById('sellerPass').value = data.password;
        sellerForm.dataset.editMode = 'true';
        sellerForm.dataset.oldUsername = data.username;

        if (submitBtn) submitBtn.textContent = 'Atualizar';

        sellerForm.scrollIntoView({ behavior: 'smooth', block: 'center' });
    };

    window.deleteSeller = async (username) => {
        if (!confirm(`Deseja remover o vendedor ${username}?`)) return;
        if (!supabaseClient) return;

        const { error } = await supabaseClient.from('vendedores').delete().eq('username', username);
        if (error) {
            alert(`Erro ao deletar: ${error.message}`);
            return;
        }

        showToast('Vendedor removido!');
        await window.renderSellers(true);
    };

    window.duplicateSeller = async (username) => {
        const base = (username || '').trim();
        if (!base) return;

        const suggested = `${base}.copy`;
        const newUsername = prompt('Informe o novo usuario para duplicacao:', suggested);
        if (!newUsername) return;

        if (!supabaseClient) {
            alert('Conexao com Supabase nao esta ativa.');
            return;
        }

        const source = window.adminSellerCache.find(s => s.username === base);
        if (!source) {
            alert('Vendedor de origem nao encontrado.');
            return;
        }

        const { error } = await supabaseClient
            .from('vendedores')
            .insert([{ username: newUsername.trim(), password: source.password, role: source.role || 'vendedor' }]);

        if (error) {
            alert(`Erro ao duplicar vendedor: ${error.message}`);
            return;
        }

        showToast('Vendedor duplicado com sucesso!');
        await window.renderSellers(true);
    };

    const sellerSearchInput = document.getElementById('sellerSearchInput');
    const sellerSortSelect = document.getElementById('sellerSortSelect');
    if (sellerSearchInput) sellerSearchInput.addEventListener('input', () => window.renderSellers(false));
    if (sellerSortSelect) sellerSortSelect.addEventListener('change', () => window.renderSellers(false));

    function getIntegrationConfig() {
        try {
            return JSON.parse(localStorage.getItem('souza_integrations') || '{}');
        } catch (e) {
            return {};
        }
    }

    function saveIntegrationConfig(cfg) {
        localStorage.setItem('souza_integrations', JSON.stringify(cfg));
    }

    function setToggleState(toggleEl, isActive) {
        if (!toggleEl) return;
        toggleEl.classList.toggle('active', !!isActive);
    }

    function bindIntegrations() {
        const pixelToggle = document.getElementById('pixelToggle');
        const gaToggle = document.getElementById('gaToggle');
        const pixelIdInput = document.getElementById('pixelIdInput');
        const gaIdInput = document.getElementById('gaIdInput');

        const savePixelBtn = document.getElementById('savePixelBtn');
        const removePixelBtn = document.getElementById('removePixelBtn');
        const saveGaBtn = document.getElementById('saveGaBtn');
        const removeGaBtn = document.getElementById('removeGaBtn');

        const cfg = getIntegrationConfig();
        const pixelCfg = cfg.pixel || { enabled: false, id: '' };
        const gaCfg = cfg.ga || { enabled: false, id: '' };

        if (pixelIdInput) pixelIdInput.value = pixelCfg.id || '';
        if (gaIdInput) gaIdInput.value = gaCfg.id || '';
        setToggleState(pixelToggle, !!pixelCfg.enabled);
        setToggleState(gaToggle, !!gaCfg.enabled);

        if (pixelToggle) {
            pixelToggle.addEventListener('click', () => {
                pixelToggle.classList.toggle('active');
            });
        }

        if (gaToggle) {
            gaToggle.addEventListener('click', () => {
                gaToggle.classList.toggle('active');
            });
        }

        if (savePixelBtn) {
            savePixelBtn.addEventListener('click', () => {
                const current = getIntegrationConfig();
                current.pixel = {
                    enabled: pixelToggle ? pixelToggle.classList.contains('active') : false,
                    id: (pixelIdInput?.value || '').trim()
                };
                saveIntegrationConfig(current);
                showToast('Facebook Pixel atualizado.');
            });
        }

        if (removePixelBtn) {
            removePixelBtn.addEventListener('click', () => {
                const current = getIntegrationConfig();
                current.pixel = { enabled: false, id: '' };
                saveIntegrationConfig(current);
                if (pixelIdInput) pixelIdInput.value = '';
                setToggleState(pixelToggle, false);
                showToast('Facebook Pixel removido.');
            });
        }

        if (saveGaBtn) {
            saveGaBtn.addEventListener('click', () => {
                const current = getIntegrationConfig();
                current.ga = {
                    enabled: gaToggle ? gaToggle.classList.contains('active') : false,
                    id: (gaIdInput?.value || '').trim()
                };
                saveIntegrationConfig(current);
                showToast('Google Analytics atualizado.');
            });
        }

        if (removeGaBtn) {
            removeGaBtn.addEventListener('click', () => {
                const current = getIntegrationConfig();
                current.ga = { enabled: false, id: '' };
                saveIntegrationConfig(current);
                if (gaIdInput) gaIdInput.value = '';
                setToggleState(gaToggle, false);
                showToast('Google Analytics removido.');
            });
        }
    }

    function getStoredCompanyInfo() {
        try {
            const parsed = JSON.parse(localStorage.getItem('souza_company_info') || '{}');
            return parsed && typeof parsed === 'object' ? parsed : {};
        } catch (e) {
            return {};
        }
    }

    window.saveAdminSettings = () => {
        const phoneInput = document.getElementById('adminPhoneInput');
        const companyNameInput = document.getElementById('adminCompanyNameInput');
        const companyCnpjInput = document.getElementById('adminCompanyCnpjInput');
        const companyEmailInput = document.getElementById('adminCompanyEmailInput');
        const storeAddressInput = document.getElementById('adminStoreAddressInput');

        const phone = (phoneInput?.value || '').replace(/\D/g, '');
        const companyName = (companyNameInput?.value || '').trim();
        const companyCnpj = (companyCnpjInput?.value || '').trim();
        const companyEmail = (companyEmailInput?.value || '').trim();
        const storeAddress = (storeAddressInput?.value || '').trim();

        if (phone.length < 10) {
            alert('Numero invalido.');
            return;
        }

        localStorage.setItem('souza_admin_phone', phone);
        localStorage.setItem('souza_company_info', JSON.stringify({
            name: companyName,
            cnpj: companyCnpj,
            email: companyEmail,
            address: storeAddress
        }));

        if (storeAddress) {
            localStorage.setItem('souza_store_address', storeAddress);
        } else {
            localStorage.removeItem('souza_store_address');
        }

        updateWhatsAppLinks();
        showToast('Configurações salvas.');
    };

    loadBrands();
    renderOptions();
    bindStockFilters();
    bindIntegrations();

    renderAdminList();
    if (window.renderAdminDashboard) window.renderAdminDashboard();

    const savedPhone = localStorage.getItem('souza_admin_phone');
    const phoneInput = document.getElementById('adminPhoneInput');
    if (savedPhone && phoneInput) phoneInput.value = savedPhone;

    const companyInfo = getStoredCompanyInfo();
    const companyNameInput = document.getElementById('adminCompanyNameInput');
    const companyCnpjInput = document.getElementById('adminCompanyCnpjInput');
    const companyEmailInput = document.getElementById('adminCompanyEmailInput');
    const storeAddressInput = document.getElementById('adminStoreAddressInput');
    if (companyNameInput) companyNameInput.value = companyInfo.name || '';
    if (companyCnpjInput) companyCnpjInput.value = companyInfo.cnpj || '';
    if (companyEmailInput) companyEmailInput.value = companyInfo.email || '';
    if (storeAddressInput) {
        storeAddressInput.value = companyInfo.address || localStorage.getItem('souza_store_address') || '';
    }

    if (form.addedDate) form.addedDate.value = new Date().toISOString().split('T')[0];
    setCarFormMode('new');
}
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

        const { primary, hover } = resolveCardImagePair(car);
        if (hover && hover !== primary) prefetchCardImage(hover);

        return `
        <article class="carousel-car-card" onclick="window.location.href='detalhes.html?id=${car.id}'" onmouseenter="toggleCarCardImage(this, true)" onmouseleave="toggleCarCardImage(this, false)" style="cursor:pointer">
            <div class="car-image">
                <img src="${primary}" data-default-src="${primary}" data-hover-src="${hover}" alt="${car.title}" loading="lazy" decoding="async" onerror="this.src='logo.png'">
            </div>
            <div class="car-info">
                <h3 class="car-title">${capitalizeText(car.title)}</h3>
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
    const bindHorizontalControlActivation = (elements, control) => {
        registerGlobalHorizontalArrowControl();
        if (!elements || !control) return;
        const activate = () => { window.__activeHorizontalControl = control; };

        elements.filter(Boolean).forEach((el) => {
            el.addEventListener('mouseenter', activate);
            el.addEventListener('pointerdown', activate);
            el.addEventListener('focus', activate);
            el.addEventListener('touchstart', activate, { passive: true });
        });
    };

    const bindScrollable = (wrapper, prev, next, step) => {
        if (!wrapper || !prev || !next) return;
        if (wrapper.dataset.sliderBound === 'true') return;

        wrapper.dataset.sliderBound = 'true';
        wrapper.setAttribute('tabindex', '0');
        registerGlobalHorizontalArrowControl();

        const activate = () => {
            window.__activeHorizontalControl = { prev: prevAction, next: nextAction };
        };

        const prevAction = () => {
            activate();
            wrapper.scrollBy({ left: -step, behavior: 'smooth' });
        };
        const nextAction = () => {
            activate();
            wrapper.scrollBy({ left: step, behavior: 'smooth' });
        };

        prev.addEventListener('click', prevAction);
        next.addEventListener('click', nextAction);
        bindHorizontalControlActivation([wrapper, prev, next], { prev: prevAction, next: nextAction });

        wrapper.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowLeft') {
                e.preventDefault();
                prevAction();
            }
            if (e.key === 'ArrowRight') {
                e.preventDefault();
                nextAction();
            }
        });

        wrapper.addEventListener('wheel', (e) => {
            const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
            if (Math.abs(delta) < 1) return;
            activate();
            e.preventDefault();
            wrapper.scrollBy({ left: delta, behavior: 'auto' });
        }, { passive: false });
    };

    // Carros em Destaque
    const carWrapper = document.querySelector('.featured-carousel-wrapper');
    const carPrev = document.querySelector('.prev-btn');
    const carNext = document.querySelector('.next-btn');
    bindScrollable(carWrapper, carPrev, carNext, 320);

    // Marcas Populares
    const brandWrapper = document.querySelector('.brands-carousel');
    const brandPrev = document.querySelector('.brand-prev');
    const brandNext = document.querySelector('.brand-next');
    bindScrollable(brandWrapper, brandPrev, brandNext, 164);
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
function resolveConditionLabel(condition, badge) {
    if (condition === 'novos') return 'Zero Km';
    if (condition === 'seminovos') return 'Seminovo';
    if (condition === 'usados') return 'Usado';
    if (badge && badge.toLowerCase().includes('luxo')) return 'Destaque';
    return 'Destaque';
}

function normalizeBodyType(car) {
    const explicit = (car.bodyType || car.body || '').toString().trim();
    if (explicit) return explicit;

    const model = (car.model || '').toLowerCase();
    const title = (car.title || '').toLowerCase();
    const blob = `${model} ${title}`;

    if (blob.includes('suv')) return 'SUV';
    if (blob.includes('sedan')) return 'Sedan';
    if (blob.includes('hatch')) return 'Hatch';
    if (blob.includes('pickup') || blob.includes('picape')) return 'Picape';
    if (blob.includes('cupe')) return 'Coupe';
    if (blob.includes('moto')) return 'Moto';
    return car.type === 'motos' ? 'Moto' : 'Automovel';
}

function resolveBrandLogo(brandName) {
    if (!brandName || !Array.isArray(brandsData)) return 'logo.png';
    const target = normalizeBrand(brandName).toLowerCase();
    const match = brandsData.find((b) => normalizeBrand(b.name).toLowerCase() === target);
    return match && match.logo ? match.logo : 'logo.png';
}

function resolveYoutubeEmbedUrl(raw) {
    if (!raw || typeof raw !== 'string') return '';

    const value = raw.trim();
    if (!value) return '';

    if (value.includes('/embed/')) return value;

    const watch = value.match(/[?&]v=([^&]+)/);
    if (watch && watch[1]) return `https://www.youtube.com/embed/${watch[1]}`;

    const short = value.match(/youtu\.be\/([^?&/]+)/);
    if (short && short[1]) return `https://www.youtube.com/embed/${short[1]}`;

    const shorts = value.match(/youtube\.com\/shorts\/([^?&/]+)/);
    if (shorts && shorts[1]) return `https://www.youtube.com/embed/${shorts[1]}`;

    return '';
}

function buildVehicleMiniCard(car, type = 'mini') {
    const isRelated = type === 'related';
    const { primary, hover } = resolveCardImagePair(car);
    if (hover && hover !== primary) prefetchCardImage(hover);
    const subtitle = `${car.year || '-'} | ${car.km || '-'}`;
    const tech = [car.engine, car.transmission].filter(Boolean).join(' • ') || 'Especificação disponível';

    return `
        <article class="${isRelated ? 'vehicle-related-card' : 'vehicle-mini-card'}" onclick="window.location.href='detalhes.html?id=${car.id}'" onmouseenter="toggleCarCardImage(this, true)" onmouseleave="toggleCarCardImage(this, false)">
            <div class="${isRelated ? 'vehicle-related-image' : 'vehicle-mini-image'}">
                <img src="${primary}" data-default-src="${primary}" data-hover-src="${hover}" alt="${capitalizeText(car.title)}" loading="lazy" decoding="async" onerror="this.src='logo.png'">
            </div>
            <div class="${isRelated ? 'vehicle-related-body' : 'vehicle-mini-body'}">
                <h3 class="${isRelated ? 'vehicle-related-title' : 'vehicle-mini-title'}">${capitalizeText(car.title)}</h3>
                <p class="${isRelated ? 'vehicle-related-meta' : 'vehicle-mini-meta'}">${tech}</p>
                <p class="${isRelated ? 'vehicle-related-price' : 'vehicle-mini-price'}">${formatPrice(car.price)}</p>
                <div class="${isRelated ? 'vehicle-related-bottom' : 'vehicle-mini-bottom'}">
                    <span>${subtitle}</span>
                    ${isRelated ? `<span class="vehicle-related-fav"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg></span>` : ''}
                </div>
            </div>
        </article>
    `;
}

function registerGlobalHorizontalArrowControl() {
    if (window.__globalHorizontalArrowBound) return;
    window.__globalHorizontalArrowBound = 'true';

    document.addEventListener('keydown', (e) => {
        if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;

        const target = e.target;
        if (
            target &&
            (
                target.tagName === 'INPUT' ||
                target.tagName === 'TEXTAREA' ||
                target.tagName === 'SELECT' ||
                target.isContentEditable
            )
        ) {
            return;
        }

        const modal = document.getElementById('modalGallery');
        if (modal && modal.classList.contains('active')) return;

        const control = window.__activeHorizontalControl;
        if (!control) return;

        e.preventDefault();
        if (e.key === 'ArrowLeft') control.prev();
        if (e.key === 'ArrowRight') control.next();
    });
}

function bindTrackButtons(trackId, prevId, nextId) {
    const track = document.getElementById(trackId);
    const prev = document.getElementById(prevId);
    const next = document.getElementById(nextId);

    if (!track || !prev || !next) return;
    if (track.dataset.sliderBound === 'true') return;
    track.dataset.sliderBound = 'true';
    track.setAttribute('tabindex', track.getAttribute('tabindex') || '0');

    const getStep = () => {
        const first = track.firstElementChild;
        if (!first) return 300;
        const style = window.getComputedStyle(track);
        const gap = parseInt(style.columnGap || style.gap || '12', 10) || 12;
        return first.getBoundingClientRect().width + gap;
    };

    const activateHorizontalControl = () => {
        window.__activeHorizontalControl = { prev: prevAction, next: nextAction };
    };

    const prevAction = () => {
        activateHorizontalControl();
        const maxScroll = Math.max(0, track.scrollWidth - track.clientWidth);
        if (track.scrollLeft <= 4) {
            track.scrollTo({ left: maxScroll, behavior: 'smooth' });
            return;
        }
        track.scrollBy({ left: -getStep(), behavior: 'smooth' });
    };

    const nextAction = () => {
        activateHorizontalControl();
        const maxScroll = Math.max(0, track.scrollWidth - track.clientWidth);
        if (track.scrollLeft >= maxScroll - 4) {
            track.scrollTo({ left: 0, behavior: 'smooth' });
            return;
        }
        track.scrollBy({ left: getStep(), behavior: 'smooth' });
    };

    prev.onclick = prevAction;
    next.onclick = nextAction;

    registerGlobalHorizontalArrowControl();
    [track, prev, next].forEach((el) => {
        if (!el) return;
        el.addEventListener('mouseenter', activateHorizontalControl);
        el.addEventListener('pointerdown', activateHorizontalControl);
        el.addEventListener('focus', activateHorizontalControl);
        el.addEventListener('touchstart', activateHorizontalControl, { passive: true });
    });

    track.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowLeft') {
            e.preventDefault();
            prevAction();
        }
        if (e.key === 'ArrowRight') {
            e.preventDefault();
            nextAction();
        }
    });

    // Converte scroll vertical do mouse/trackpad em scroll horizontal do carrossel.
    track.addEventListener('wheel', (e) => {
        const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
        if (Math.abs(delta) < 1) return;
        activateHorizontalControl();
        e.preventDefault();
        track.scrollBy({ left: delta, behavior: 'auto' });
    }, { passive: false });
}

function pushRecentVehicle(id) {
    let recent = [];
    try {
        recent = JSON.parse(localStorage.getItem('souza_recent_vehicles') || '[]');
    } catch (e) {
        recent = [];
    }

    recent = [id, ...recent.filter(item => Number(item) !== Number(id))].slice(0, 12);
    localStorage.setItem('souza_recent_vehicles', JSON.stringify(recent));
}

function getRecentVehicles(allCars, currentId) {
    let recent = [];
    try {
        recent = JSON.parse(localStorage.getItem('souza_recent_vehicles') || '[]');
    } catch (e) {
        recent = [];
    }

    return recent
        .filter(id => Number(id) !== Number(currentId))
        .map(id => allCars.find(car => Number(car.id) === Number(id)))
        .filter(Boolean);
}

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
            console.error('Erro ao buscar veículo:', e);
        } finally {
            document.body.style.cursor = 'default';
        }
    }

    if (!car) {
        document.body.innerHTML = '<div style="color:#222; text-align:center; padding:80px; font-family:\'Plus Jakarta Sans\', sans-serif;"><h1 style="font-weight:500;">Veículo não encontrado</h1><a href="index.html" style="color:#ff9500; text-decoration:none; font-weight:500;">Voltar para Home</a></div>';
        return;
    }

    document.title = `${car.title} - Souza Select Car`;
    pushRecentVehicle(id);
    recordVehicleView(id);

    const rawImages = Array.isArray(car.images) && car.images.length > 0 ? car.images : [car.image || 'logo.png'];
    const heroImages = [...rawImages];
    while (heroImages.length < 3) heroImages.push(rawImages[heroImages.length % rawImages.length]);

    const mainTitle = `${(car.brand || '').trim()} ${(car.model || '').trim()}`.trim() || capitalizeText(car.title || 'Veículo');
    const titleLower = (car.title || '').toLowerCase();
    const mainTitleLower = mainTitle.toLowerCase();
    const derivedVersion = titleLower.startsWith(mainTitleLower) ? car.title.slice(mainTitle.length).trim() : (car.version || '');
    const subtitle = derivedVersion || [car.engine, car.transmission, car.fuel].filter(Boolean).join(' • ') || 'Especificação técnica';
    const ownerPhone = localStorage.getItem('souza_admin_phone') || '5519998383275';

    const brandLogoInlineEl = document.getElementById('detailsBrandLogoInline');
    const brandLogo = resolveBrandLogo(car.brand);
    if (brandLogoInlineEl) {
        brandLogoInlineEl.src = brandLogo;
    }

    const heroWindow = document.getElementById('vehicleHeroWindow');
    const heroTrack = document.getElementById('detailsHeroTrack');
    const prevMainBtn = document.getElementById('vehiclePrevBtn');
    const nextMainBtn = document.getElementById('vehicleNextBtn');
    let heroStartIndex = 0;

    const getVisibleSlides = () => 1;

    heroImages.slice(0, 6).forEach((src) => {
        const preloadImg = new Image();
        preloadImg.decoding = 'async';
        preloadImg.src = src;
    });

    const renderHeroSlides = () => {
        if (!heroTrack) return;
        heroTrack.innerHTML = heroImages.map((img, idx) => `
            <button type="button" class="vehicle-hero-photo" data-idx="${idx}">
                <img src="${img}" alt="Foto ${idx + 1} do veículo" loading="${idx < 3 ? 'eager' : 'lazy'}" fetchpriority="${idx === 0 ? 'high' : 'auto'}" onerror="this.onerror=null; this.src='logo.png';">
            </button>
        `).join('');

        heroTrack.querySelectorAll('.vehicle-hero-photo').forEach((btn) => {
            btn.addEventListener('click', () => {
                const idx = Number(btn.dataset.idx || '0') % rawImages.length;
                window.openGallery(idx);
            });
        });
    };

    const updateHeroPosition = () => {
        if (!heroTrack) return;
        const visible = getVisibleSlides();
        const maxStart = Math.max(0, heroImages.length - visible);
        if (heroStartIndex > maxStart) heroStartIndex = maxStart;
        const stepPercent = 100 / visible;
        heroTrack.style.transform = `translateX(-${heroStartIndex * stepPercent}%)`;
    };

    const stepHero = (direction) => {
        const visible = getVisibleSlides();
        const maxStart = Math.max(0, heroImages.length - visible);

        if (direction > 0) {
            heroStartIndex = heroStartIndex >= maxStart ? 0 : heroStartIndex + 1;
        } else {
            heroStartIndex = heroStartIndex <= 0 ? maxStart : heroStartIndex - 1;
        }
        updateHeroPosition();
    };

    renderHeroSlides();
    updateHeroPosition();

    if (prevMainBtn) prevMainBtn.onclick = () => stepHero(-1);
    if (nextMainBtn) nextMainBtn.onclick = () => stepHero(1);

    if (heroWindow) {
        heroWindow.setAttribute('tabindex', '0');
        heroWindow.addEventListener('wheel', (e) => {
            const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
            if (Math.abs(delta) < 6) return;
            e.preventDefault();
            stepHero(delta > 0 ? 1 : -1);
        }, { passive: false });
        heroWindow.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowLeft') {
                e.preventDefault();
                stepHero(-1);
            }
            if (e.key === 'ArrowRight') {
                e.preventDefault();
                stepHero(1);
            }
        });
    }

    const activateHeroControl = () => {
        registerGlobalHorizontalArrowControl();
        window.__activeHorizontalControl = {
            prev: () => stepHero(-1),
            next: () => stepHero(1)
        };
    };
    [heroWindow, prevMainBtn, nextMainBtn].forEach((el) => {
        if (!el) return;
        el.addEventListener('mouseenter', activateHeroControl);
        el.addEventListener('pointerdown', activateHeroControl);
        el.addEventListener('focus', activateHeroControl);
        el.addEventListener('touchstart', activateHeroControl, { passive: true });
    });
    activateHeroControl();

    window.addEventListener('resize', updateHeroPosition);

    window.currentCarImages = rawImages;
    window.currentModalImageIndex = 0;

    const titleEl = document.getElementById('detailsTitle');
    const subtitleEl = document.getElementById('detailsSubtitle');
    const priceEl = document.getElementById('detailsPrice');
    const versionEl = document.getElementById('detailsVersion');
    const yearEl = document.getElementById('detailsYear');
    const kmEl = document.getElementById('detailsKm');
    const fuelEl = document.getElementById('detailsFuel');
    const engineEl = document.getElementById('detailsEngine');
    const transEl = document.getElementById('detailsTransmission');
    const colorEl = document.getElementById('detailsColor');

    // Já declarado acima no escopo do initDetails
    if (brandLogoInlineEl) {
        brandLogoInlineEl.src = brandLogo;
        brandLogoInlineEl.alt = `Logo ${car.brand || 'marca'}`;
        brandLogoInlineEl.onerror = function () { this.src = 'logo.png'; };
    }

    if (titleEl) titleEl.innerText = capitalizeText(mainTitle);
    if (subtitleEl) subtitleEl.innerText = subtitle;
    if (priceEl) priceEl.innerText = formatPrice(car.price);
    if (versionEl) versionEl.innerText = derivedVersion || subtitle;
    if (yearEl) yearEl.innerText = car.year || '-';
    if (kmEl) kmEl.innerText = car.km || '-';
    if (fuelEl) fuelEl.innerText = car.fuel || 'Flex';
    if (engineEl) engineEl.innerText = car.engine || 'N/A';
    if (transEl) transEl.innerText = car.transmission || 'N/A';
    if (colorEl) colorEl.innerText = car.color || 'N/A';

    const optsContainer = document.getElementById('detailsOptions');
    const fallbackOptions = ['Ar-condicionado', 'Direcao eletrica', 'Multimidia', 'Camera de re', 'Airbags', 'Freios ABS'];
    const options = Array.isArray(car.options) && car.options.length > 0 ? car.options : fallbackOptions;
    if (optsContainer) {
        optsContainer.innerHTML = options.map(opt => `
            <li>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M20 6L9 17l-5-5"></path>
                </svg>
                ${opt}
            </li>
        `).join('');
    }

    const videoFrame = document.getElementById('detailsVideoFrame');
    const videoWrap = document.getElementById('detailsVideoWrap');
    const mosaicWrap = document.getElementById('detailsMosaicWrap');
    const mediaTitle = document.getElementById('detailsMediaTitle');
    const mediaNote = document.getElementById('detailsMediaNote');
    const mediaVideoUrl = resolveYoutubeEmbedUrl(car.videoUrl || car.video || getVehicleVideoUrlById(car.id));

    if (mediaVideoUrl) {
        if (videoFrame) videoFrame.src = mediaVideoUrl;
        if (videoWrap) videoWrap.hidden = false;
        if (mosaicWrap) {
            mosaicWrap.hidden = true;
            mosaicWrap.innerHTML = '';
        }
        if (mediaTitle) mediaTitle.textContent = 'Assista ao Vídeo';
        if (mediaNote) mediaNote.hidden = true;
    } else {
        const mosaicImages = (rawImages && rawImages.length ? rawImages : ['logo.png']).filter(Boolean);
        const maxTiles = 8;
        const visibleImages = mosaicImages.slice(0, maxTiles);
        const overflow = Math.max(0, mosaicImages.length - maxTiles);

        if (videoFrame) videoFrame.src = '';
        if (videoWrap) videoWrap.hidden = true;
        if (mosaicWrap) {
            const baseTiles = visibleImages.map((src, index) => `
                <button type="button" class="vehicle-mosaic-tile" data-mosaic-index="${index}">
                    <img src="${src}" alt="Foto ${index + 1} do veículo" loading="lazy" decoding="async" onerror="this.onerror=null; this.src='logo.png';">
                </button>
            `);
            if (overflow > 0 && baseTiles.length > 0) {
                const lastIndex = baseTiles.length - 1;
                baseTiles[lastIndex] = `
                    <button type="button" class="vehicle-mosaic-tile vehicle-mosaic-overflow" data-mosaic-index="${lastIndex}">
                        <img src="${visibleImages[lastIndex]}" alt="Mais fotos do veículo" loading="lazy" decoding="async" onerror="this.onerror=null; this.src='logo.png';">
                        <span>+${overflow}</span>
                    </button>
                `;
            }
            mosaicWrap.innerHTML = baseTiles.join('');
            mosaicWrap.hidden = false;
            mosaicWrap.querySelectorAll('[data-mosaic-index]').forEach((btn) => {
                btn.addEventListener('click', () => {
                    const idx = Number(btn.getAttribute('data-mosaic-index') || '0');
                    window.openGallery(idx);
                });
            });
        }
        if (mediaTitle) mediaTitle.textContent = 'Galeria de Fotos';
        if (mediaNote) {
            mediaNote.textContent = 'Sem vídeo cadastrado para este veículo.';
            mediaNote.hidden = false;
        }
    }

    const currentUrl = window.location.href;
    const shareText = `${mainTitle} por ${formatPrice(car.price)}`;
    const encodedUrl = encodeURIComponent(currentUrl);
    const encodedText = encodeURIComponent(shareText);

    const shareWhatsapp = document.getElementById('shareWhatsapp');
    const shareFacebook = document.getElementById('shareFacebook');
    const shareInstagram = document.getElementById('shareInstagram');
    const shareLinkedin = document.getElementById('shareLinkedin');
    const instagramUrl = localStorage.getItem('souza_instagram_url') || 'https://www.instagram.com/';

    if (shareWhatsapp) shareWhatsapp.href = `https://wa.me/?text=${encodedText}%20${encodedUrl}`;
    if (shareFacebook) shareFacebook.href = `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`;
    if (shareInstagram) shareInstagram.href = instagramUrl;
    if (shareLinkedin) shareLinkedin.href = `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`;

    const addressEl = document.getElementById('detailsAddress');
    const mapFrameEl = document.getElementById('detailsMapFrame');
    let currentAddress = 'Rua 6, 3212, Santana, Rio Claro/SP';
    if (addressEl) {
        const savedAddress = localStorage.getItem('souza_store_address');
        if (savedAddress && savedAddress.trim()) {
            currentAddress = savedAddress.trim();
        }
        addressEl.innerText = currentAddress;
    }
    if (mapFrameEl) {
        mapFrameEl.src = `https://www.google.com/maps?q=${encodeURIComponent(currentAddress)}&output=embed`;
    }

    const interestBtn = document.getElementById('btnInterest');
    if (interestBtn) {
        interestBtn.addEventListener('click', () => {
            const message = `Olá! Tenho interesse no ${mainTitle} (${car.year || ''}) por ${formatPrice(car.price)}.`;
            window.open(`https://wa.me/${ownerPhone}?text=${encodeURIComponent(message)}`, '_blank');
        });
    }

    const favBtn = document.getElementById('detailsFavBtn');
    let favorites = [];
    try {
        favorites = JSON.parse(localStorage.getItem('souza_favorites') || '[]');
    } catch (e) {
        favorites = [];
    }

    const refreshFavoriteButton = () => {
        if (!favBtn) return;
        favBtn.classList.toggle('active', favorites.includes(Number(id)));
    };

    refreshFavoriteButton();

    if (favBtn) {
        favBtn.onclick = () => {
            const targetId = Number(id);
            if (favorites.includes(targetId)) {
                favorites = favorites.filter(item => item !== targetId);
            } else {
                favorites.push(targetId);
            }
            localStorage.setItem('souza_favorites', JSON.stringify(favorites));
            refreshFavoriteButton();
        };
    }

    const allCars = Array.isArray(carsData) && carsData.length > 0 ? carsData : (await DB.getAllCars());
    const relatedTrack = document.getElementById('relatedTrack');

    if (relatedTrack) {
        const relatedCars = allCars
            .filter(item => Number(item.id) !== Number(id))
            .filter(item => normalizeBrand(item.brand) === normalizeBrand(car.brand) || item.type === car.type)
            .slice(0, 8);

        const baseRelated = relatedCars.length ? relatedCars : allCars.filter(item => Number(item.id) !== Number(id)).slice(0, 8);
        const finalRelated = [...baseRelated];
        let cursor = 0;
        while (finalRelated.length < 10 && baseRelated.length > 0) {
            finalRelated.push(baseRelated[cursor % baseRelated.length]);
            cursor += 1;
        }
        relatedTrack.innerHTML = finalRelated.map(item => buildVehicleMiniCard(item, 'related')).join('');
    }

    bindTrackButtons('relatedTrack', 'relatedPrevBtn', 'relatedNextBtn');
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
    const phone = (localStorage.getItem('souza_admin_phone') || '5519998383275').replace(/\D/g, '');
    const links = document.querySelectorAll('a[href*="wa.me"], a[href*="whatsapp.com"], a[href*="api.whatsapp.com"], a[href*="5519998383275"], a[href*="5519999999999"]');

    links.forEach((link) => {
        const rawHref = link.getAttribute('href') || '';
        if (!rawHref || rawHref.startsWith('#') || rawHref.startsWith('javascript:')) return;

        try {
            const url = new URL(rawHref, window.location.origin);
            const host = (url.hostname || '').toLowerCase();

            if (host.includes('wa.me')) {
                url.pathname = `/${phone}`;
                link.setAttribute('href', url.toString());
                return;
            }

            if (host.includes('whatsapp.com')) {
                url.searchParams.set('phone', phone);
                link.setAttribute('href', url.toString());
                return;
            }

            const replaced = rawHref.replace(/55\d{10,11}/g, phone);
            link.setAttribute('href', replaced);
        } catch (err) {
            const replaced = rawHref.replace(/55\d{10,11}/g, phone);
            link.setAttribute('href', replaced);
        }
    });
}

// ===== Main Init =====
// ===== Loader Logic =====


// ===== Main Init =====
document.addEventListener('DOMContentLoaded', async () => {
    try {
        console.log("Inicializando aplicação...");
        recordSiteAccess();

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
            console.log("[Init] Modo Detalhes (Carregamento Rápido Unico)");
            // initDetails agora busca seu proprio carro se necessario
            await initDetails();
            // Carrega o resto em background sem travar a UI
            refreshAppData().then(() => {
                console.log("[Background] Dados completos carregados");
                // renderBrands(); // Opcional no background
            });
        } else {
            // Home ou Estoque ou Admin - Precisa de tudo
            console.log("[Init] Carregando aplicação completa...");
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



// Mantido para compatibilidade com layouts antigos que ainda podem chamar essa função.
window.parseWhatsAppText = () => {
    const textArea = document.getElementById('whatsappPasteArea');
    const text = textArea ? textArea.value : '';

    if (!text || text.trim().length < 5) {
        showToast('Cole o texto do anúncio primeiro.');
        return;
    }

    const fullText = text.toLowerCase();
    let foundCount = 0;

    const priceMatch = text.match(/(?:r\$|valor|por|investimento)\s?([\d.,]+)/i);
    if (priceMatch) {
        const val = priceMatch[1].replace(/\./g, '').replace(',', '.');
        const priceInput = document.getElementById('priceInput');
        if (priceInput) {
            priceInput.value = parseFloat(val);
            foundCount += 1;
        }
    }

    const kmMatch = text.match(/(\d{1,3}(?:\.?\d{3})*)\s?(?:km|quilometros|rodados)/i);
    if (kmMatch) {
        const kmInput = document.querySelector('input[name="km"]');
        if (kmInput) {
            kmInput.value = `${kmMatch[1].replace(/\./g, '')} km`;
            foundCount += 1;
        }
    }

    const engineMatch = text.match(/(\d\.\d(?:\s?turbo|v6|v8|v10)?)/i);
    if (engineMatch && engineMatch[1]) {
        const engineInput = document.querySelector('input[name="engine"]');
        if (engineInput) {
            engineInput.value = engineMatch[1].toUpperCase();
            foundCount += 1;
        }
    }

    const transmissionMatch = text.match(/(automatico|aut\.|manual|cvt|dualogic|dsg)/i);
    if (transmissionMatch && transmissionMatch[1]) {
        const transmissionInput = document.querySelector('input[name="transmission"]');
        if (transmissionInput) {
            const val = transmissionMatch[1].replace('.', '');
            transmissionInput.value = val.charAt(0).toUpperCase() + val.slice(1).toLowerCase();
            foundCount += 1;
        }
    }

    const fuelMatch = text.match(/(flex|alcool|gasolina|diesel|hibrido|eletrico)/i);
    if (fuelMatch && fuelMatch[1]) {
        const fuel = document.querySelector('select[name="fuel"]') || document.getElementById('fuel');
        if (fuel) {
            const val = fuelMatch[1].toLowerCase();
            if (val.includes('flex')) fuel.value = 'Flex';
            else if (val.includes('alcool')) fuel.value = 'Alcool';
            else if (val.includes('gasolina')) fuel.value = 'Gasolina';
            else if (val.includes('diesel')) fuel.value = 'Diesel';
            foundCount += 1;
        }
    }

    const conditionMatch = text.match(/(novo|0km|zero|seminovo|usado)/i);
    if (conditionMatch && conditionMatch[1]) {
        const cond = document.querySelector('select[name="condition"]') || document.getElementById('condition');
        if (cond) {
            const val = conditionMatch[1].toLowerCase();
            cond.value = (val.includes('novo') || val.includes('0km') || val.includes('zero')) ? 'novos' : 'seminovos';
            foundCount += 1;
        }
    }

    const descInput = document.getElementById('descriptionInput');
    if (descInput) {
        descInput.value = text;
    }

    const inputs = document.getElementsByName('carOptions');
    const keywordMap = {
        'Ar Condicionado': ['ar condicionado', 'ar-condicionado', 'climatizador'],
        'Direcao': ['direcao', 'assistida', 'hidraulica'],
        'Vidro': ['vidro', 'vidros'],
        'Trava': ['trava', 'travas'],
        'Alarme': ['alarme', 'seguranca'],
        'Som': ['som', 'multimidia', 'mp3', 'usb', 'bluetooth'],
        'Couro': ['couro', 'revestimento'],
        'Teto': ['teto solar', 'panoramico'],
        'Automatico': ['automatico', 'cambio aut', 'at6', 'at9'],
        '4x4': ['4x4', 'awd', 'tracao'],
        'Sensor': ['sensor', 'estacionamento', 'park'],
        'Camera': ['camera', 're'],
        'LED': ['led', 'xenon'],
        'ABS': ['abs', 'freios'],
        'Airbag': ['airbag', 'air bag']
    };

    for (const inp of inputs) inp.checked = false;
    for (const inp of inputs) {
        const labelText = (inp.parentElement ? inp.parentElement.innerText : inp.value).toLowerCase().trim();
        if (fullText.includes(labelText)) {
            inp.checked = true;
            continue;
        }
        for (const [key, synonyms] of Object.entries(keywordMap)) {
            if (!labelText.includes(key.toLowerCase())) continue;
            if (synonyms.some(s => fullText.includes(s))) {
                inp.checked = true;
                break;
            }
        }
    }

    if (window.updateOptionsSummary) window.updateOptionsSummary();
    const feedback = document.getElementById('pasteStatus');
    if (feedback) {
        feedback.style.display = 'block';
        feedback.style.color = '#4caf50';
        feedback.innerText = `Leitura aplicada. Campos preenchidos: ${foundCount}.`;
    }
    showToast('Leitura do texto concluida.');
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

    console.log("[HomeFilters] Inicializando filtros da Home...");

    // Expor função de update para o refreshAppData
    window.updateHomeFilters = function () {
        const pool = carsData || [];
        if (pool.length === 0) return; // Aguarda dados reais

        console.log('[HomeFilters] Populando marcas a partir de', pool.length, 'veículos');

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

            console.log('[HomeSearch] Navegando:', params.toString());
            window.location.href = `veiculos.html?${params.toString()}`;
        };
    }

    // Tenta inicializar. Se os dados já chegaram (isDataReady), ele popula agora.
    if (window.isDataReady || (carsData && carsData.length > 0)) {
        window.updateHomeFilters();
    }
}
