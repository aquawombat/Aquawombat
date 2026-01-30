/* ============================================
   Galactic Gecko NFT Explorer - Main Application
   ============================================ */

// ============================================
// Configuration
// ============================================
const CONFIG = {
    perPage: 100,
    dataFile: 'geckos.json',  // Path to gecko data file
    autoLoad: true,           // Automatically load data on page load
    storageKeys: {
        favorites: 'galacticGecko_favorites',
        lastPage: 'galacticGecko_lastPage'
    }
};

// ============================================
// State Management
// ============================================
let geckos = [];
let currentPage = 1;
let totalPages = 0;
let favorites = new Set();

// ============================================
// Favorites System
// ============================================
const FavoritesManager = {
    init() {
        const stored = localStorage.getItem(CONFIG.storageKeys.favorites);
        if (stored) {
            try {
                favorites = new Set(JSON.parse(stored));
            } catch (e) {
                console.warn('Could not parse favorites from localStorage');
                favorites = new Set();
            }
        }
        this.updateFavoritesCount();
    },

    save() {
        localStorage.setItem(CONFIG.storageKeys.favorites, JSON.stringify([...favorites]));
        this.updateFavoritesCount();
    },

    toggle(geckoId) {
        if (favorites.has(geckoId)) {
            favorites.delete(geckoId);
        } else {
            favorites.add(geckoId);
        }
        this.save();
        return favorites.has(geckoId);
    },

    isFavorite(geckoId) {
        return favorites.has(geckoId);
    },

    getAll() {
        return [...favorites];
    },

    getCount() {
        return favorites.size;
    },

    updateFavoritesCount() {
        const countElements = document.querySelectorAll('.favorites-count');
        countElements.forEach(el => {
            el.textContent = this.getCount();
        });
    },

    getFavoriteGeckos() {
        return geckos.filter(g => favorites.has(g.id));
    }
};

// ============================================
// DOM Elements
// ============================================
let geckoGrid, topControls, bottomControls, modal;

function initDOMElements() {
    geckoGrid = document.getElementById('geckoGrid');
    topControls = document.getElementById('topControls');
    bottomControls = document.getElementById('bottomControls');
    modal = document.getElementById('modal');
}

// ============================================
// Data Loading
// ============================================

// Auto-load gecko data from file path
async function autoLoadGeckos() {
    try {
        const response = await fetch(CONFIG.dataFile);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        processGeckoData(data);

    } catch (error) {
        console.error('Failed to load gecko data:', error.message);
    }
}

// Process loaded gecko data
function processGeckoData(data) {
    geckos = data.result.data.items;
    totalPages = Math.ceil(geckos.length / CONFIG.perPage);

    const pageInput = document.getElementById('pageInput');
    if (pageInput) {
        pageInput.max = totalPages;
    }

    // Show the browser UI
    if (topControls) topControls.classList.add('visible');
    if (geckoGrid) geckoGrid.classList.add('visible');
    if (bottomControls) bottomControls.classList.add('visible');

    renderPagination();
    renderGeckos();
}

// ============================================
// Pagination
// ============================================
function renderPagination() {
    const paginationHTML = generatePaginationHTML();

    const paginationTop = document.getElementById('pagination');
    const paginationBottom = document.getElementById('paginationBottom');
    const pageInput = document.getElementById('pageInput');
    const pageInfo = document.getElementById('pageInfo');

    if (paginationTop) paginationTop.innerHTML = paginationHTML;
    if (paginationBottom) paginationBottom.innerHTML = paginationHTML;
    if (pageInput) pageInput.value = currentPage;

    if (pageInfo) {
        const start = (currentPage - 1) * CONFIG.perPage + 1;
        const end = Math.min(currentPage * CONFIG.perPage, geckos.length);
        pageInfo.textContent = `Showing ${start}-${end} of ${geckos.length} geckos`;
    }
}

function generatePaginationHTML() {
    let html = '';

    html += `<button onclick="changePage(${currentPage - 1})" ${currentPage === 1 ? 'disabled' : ''}>← Prev</button>`;

    if (currentPage > 3) {
        html += `<button onclick="changePage(1)">1</button>`;
        if (currentPage > 4) {
            html += `<span class="pagination-ellipsis">...</span>`;
        }
    }

    for (let i = Math.max(1, currentPage - 2); i <= Math.min(totalPages, currentPage + 2); i++) {
        html += `<button onclick="changePage(${i})" class="${i === currentPage ? 'active' : ''}">${i}</button>`;
    }

    if (currentPage < totalPages - 2) {
        if (currentPage < totalPages - 3) {
            html += `<span class="pagination-ellipsis">...</span>`;
        }
        html += `<button onclick="changePage(${totalPages})">${totalPages}</button>`;
    }

    html += `<button onclick="changePage(${currentPage + 1})" ${currentPage === totalPages ? 'disabled' : ''}>Next →</button>`;

    return html;
}

function changePage(page) {
    if (page < 1 || page > totalPages) return;
    currentPage = page;
    renderPagination();
    renderGeckos();
}

function goToPage() {
    const input = document.getElementById('pageInput');
    const page = parseInt(input.value);
    if (page >= 1 && page <= totalPages) {
        changePage(page);
    }
}

// ============================================
// Gecko Grid Rendering
// ============================================
function renderGeckos() {
    if (!geckoGrid) return;

    const start = (currentPage - 1) * CONFIG.perPage;
    const end = start + CONFIG.perPage;
    const pageGeckos = geckos.slice(start, end);

    geckoGrid.innerHTML = pageGeckos.map(gecko => createGeckoCard(gecko)).join('');

    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function createGeckoCard(gecko) {
    const faction = gecko.attributes.find(a => a.name === 'Faction');
    const body = gecko.attributes.find(a => a.name === 'Body');
    const helmet = gecko.attributes.find(a => a.name === 'Helmet');
    const armor = gecko.attributes.find(a => a.name === 'Armor');
    const eyes = gecko.attributes.find(a => a.name === 'Eyes');
    const mouth = gecko.attributes.find(a => a.name === 'Mouth');
    const ears = gecko.attributes.find(a => a.name === 'Ears');

    const attributesHTML = [
        faction ? `<span class="attribute faction">${faction.value}</span>` : '',
        body && body.value !== 'None' ? `<span class="attribute">${body.value}</span>` : '',
        eyes && eyes.value !== 'None' ? `<span class="attribute">${eyes.value}</span>` : '',
        mouth && mouth.value !== 'None' ? `<span class="attribute">${mouth.value}</span>` : '',
        ears && ears.value !== 'None' ? `<span class="attribute">${ears.value}</span>` : '',
        helmet && helmet.value !== 'None' ? `<span class="attribute">${helmet.value}</span>` : '',
        armor && armor.value !== 'None' ? `<span class="attribute">${armor.value}</span>` : ''
    ].filter(Boolean).join('');

    const isFavorited = FavoritesManager.isFavorite(gecko.id);

    return `
        <div class="gecko-card" onclick="openModal(${gecko.id})">
            <button class="favorite-btn ${isFavorited ? 'favorited' : ''}" onclick="event.stopPropagation(); toggleFavorite(${gecko.id}, this)" title="${isFavorited ? 'Remove from favorites' : 'Add to favorites'}">
                <svg viewBox="0 0 24 24">
                    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                </svg>
            </button>
            <img class="gecko-image" src="${gecko.image}" alt="${gecko.name}" loading="lazy">
            <div class="gecko-info">
                <div class="gecko-name">${gecko.name}</div>
                <div class="gecko-rank">Rank #${gecko.rank}</div>
                <div class="gecko-attributes">${attributesHTML}</div>
            </div>
        </div>
    `;
}

function toggleFavorite(geckoId, buttonElement) {
    const isFavorited = FavoritesManager.toggle(geckoId);

    if (buttonElement) {
        buttonElement.classList.toggle('favorited', isFavorited);
        buttonElement.title = isFavorited ? 'Remove from favorites' : 'Add to favorites';
    }

    // Update modal favorite button if open
    const modalFavoriteBtn = document.getElementById('modalFavoriteBtn');
    if (modalFavoriteBtn && modalFavoriteBtn.dataset.geckoId == geckoId) {
        modalFavoriteBtn.classList.toggle('favorited', isFavorited);
        modalFavoriteBtn.innerHTML = isFavorited ? '♥ Favorited' : '♡ Add to Favorites';
    }
}

// ============================================
// Modal Functions
// ============================================
function openModal(geckoId) {
    const gecko = geckos.find(g => g.id === geckoId);
    if (!gecko) return;

    const modalTitle = document.getElementById('modalTitle');
    const modalImage = document.getElementById('modalImage');
    const modalRank = document.getElementById('modalRank');
    const modalDescription = document.getElementById('modalDescription');
    const modalTraits = document.getElementById('modalTraits');
    const modalLinks = document.getElementById('modalLinks');

    if (modalTitle) modalTitle.textContent = gecko.name;
    if (modalImage) {
        modalImage.src = gecko.image;
        modalImage.alt = gecko.name;
    }
    if (modalRank) modalRank.textContent = `Rank #${gecko.rank}`;
    if (modalDescription) modalDescription.textContent = gecko.description;

    // Build traits list
    if (modalTraits) {
        const traitOrder = ['Faction', 'Body', 'Eyes', 'Mouth', 'Ears', 'Helmet', 'Armor'];
        const traitsHTML = traitOrder.map(traitName => {
            const trait = gecko.attributes.find(a => a.name === traitName);
            if (!trait) return '';
            const rarityText = trait.rarity ? `<span class="trait-rarity">${trait.rarity}%</span>` : '';
            return `
                <div class="trait-row">
                    <span class="trait-name">${trait.name}</span>
                    <span>
                        <span class="trait-value">${trait.value}</span>
                        ${rarityText}
                    </span>
                </div>
            `;
        }).join('');
        modalTraits.innerHTML = traitsHTML;
    }

    // Build links with favorite button
    if (modalLinks) {
        const isFavorited = FavoritesManager.isFavorite(geckoId);
        const linksHTML = `
            <button id="modalFavoriteBtn" class="modal-favorite-btn ${isFavorited ? 'favorited' : ''}" data-gecko-id="${geckoId}" onclick="toggleFavoriteFromModal(${geckoId})">
                ${isFavorited ? '♥ Favorited' : '♡ Add to Favorites'}
            </button>
            <a href="${gecko.link}" target="_blank" class="modal-link">View on HowRare.is</a>
            <a href="${gecko.image}" target="_blank" class="modal-link">Full Image</a>
        `;
        modalLinks.innerHTML = linksHTML;
    }

    if (modal) {
        modal.classList.add('visible');
        document.body.style.overflow = 'hidden';
    }
}

function toggleFavoriteFromModal(geckoId) {
    const isFavorited = FavoritesManager.toggle(geckoId);

    // Update modal button
    const modalFavoriteBtn = document.getElementById('modalFavoriteBtn');
    if (modalFavoriteBtn) {
        modalFavoriteBtn.classList.toggle('favorited', isFavorited);
        modalFavoriteBtn.innerHTML = isFavorited ? '♥ Favorited' : '♡ Add to Favorites';
    }

    // Update card button if visible
    const cards = document.querySelectorAll('.gecko-card');
    cards.forEach(card => {
        const btn = card.querySelector('.favorite-btn');
        if (btn && card.onclick.toString().includes(geckoId)) {
            btn.classList.toggle('favorited', isFavorited);
        }
    });

    // Re-render to update card state
    renderGeckos();
}

function closeModal() {
    if (modal) {
        modal.classList.remove('visible');
        document.body.style.overflow = '';
    }
}

// ============================================
// Event Listeners
// ============================================
function initEventListeners() {
    // Page input enter key
    const pageInput = document.getElementById('pageInput');
    if (pageInput) {
        pageInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                goToPage();
            }
        });
    }

    // Close modal on overlay click
    if (modal) {
        modal.addEventListener('click', function(e) {
            if (e.target === this) {
                closeModal();
            }
        });
    }

    // Close modal on Escape key
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            closeModal();
        }
    });
}

// ============================================
// Initialization
// ============================================
function init() {
    initDOMElements();
    FavoritesManager.init();
    initEventListeners();

    // Auto-load gecko data if enabled
    if (CONFIG.autoLoad) {
        autoLoadGeckos();
    }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

// ============================================
// Export for global access (needed for onclick handlers)
// ============================================
window.changePage = changePage;
window.goToPage = goToPage;
window.openModal = openModal;
window.closeModal = closeModal;
window.toggleFavorite = toggleFavorite;
window.toggleFavoriteFromModal = toggleFavoriteFromModal;
window.FavoritesManager = FavoritesManager;
window.autoLoadGeckos = autoLoadGeckos;
window.processGeckoData = processGeckoData;
window.geckos = geckos;
