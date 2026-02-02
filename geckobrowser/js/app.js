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
let currentColumns = 5;
let filteredGeckos = [];
let isFilterActive = false;
let activeFilters = {
    Faction: new Set(),
    Body: new Set(),
    Eyes: new Set(),
    Mouth: new Set(),
    Ears: new Set(),
    Helmet: new Set(),
    Armor: new Set()
};
let traitValues = {}; // Will store all unique values for each trait

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
let geckoGrid, topControls, bottomControls, modal, filterPanel, filterOverlay;

function initDOMElements() {
    geckoGrid = document.getElementById('geckoGrid');
    topControls = document.getElementById('topControls');
    bottomControls = document.getElementById('bottomControls');
    modal = document.getElementById('modal');
    filterPanel = document.getElementById('filterPanel');
    filterOverlay = document.getElementById('filterOverlay');
}

// ============================================
// Data Loading
// ============================================

// Auto-load gecko data from file path
async function autoLoadGeckos() {
    console.log('Loading gecko data from:', CONFIG.dataFile);
    try {
        const response = await fetch(CONFIG.dataFile);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        console.log('Gecko data loaded successfully, items:', data.result.data.items.length);
        processGeckoData(data);

    } catch (error) {
        console.error('Failed to load gecko data:', error.message);
        // Show error to user
        if (geckoGrid) {
            geckoGrid.innerHTML = '<div style="text-align:center;padding:50px;color:#ff6b6b;">Failed to load gecko data. Make sure you are running this on a local server (not file://).</div>';
            geckoGrid.classList.add('visible');
        }
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

    // Initialize filter system
    extractTraitValues();
    populateFilterPanel();

    // Show the browser UI
    if (topControls) topControls.classList.add('visible');
    if (geckoGrid) {
        geckoGrid.classList.add('visible');
        geckoGrid.classList.add('cols-' + currentColumns);
    }
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
        const displayGeckos = isFilterActive ? filteredGeckos : geckos;
        const start = displayGeckos.length > 0 ? (currentPage - 1) * CONFIG.perPage + 1 : 0;
        const end = Math.min(currentPage * CONFIG.perPage, displayGeckos.length);
        const filterText = isFilterActive ? ' (filtered)' : '';
        pageInfo.textContent = `Showing ${start}-${end} of ${displayGeckos.length.toLocaleString()} geckos${filterText}`;
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
// Go to Gecko by Number
// ============================================
function goToGecko() {
    const input = document.getElementById('geckoInput');
    const geckoNum = parseInt(input.value);

    if (isNaN(geckoNum) || geckoNum < 1 || geckoNum > geckos.length) {
        alert(`Please enter a gecko number between 1 and ${geckos.length}`);
        return;
    }

    // Find the gecko by its number (name contains the number)
    const geckoIndex = geckos.findIndex(g => {
        const match = g.name.match(/Galactic Gecko #(\d+)/);
        return match && parseInt(match[1]) === geckoNum;
    });

    if (geckoIndex === -1) {
        alert(`Gecko #${geckoNum} not found`);
        return;
    }

    // Calculate which page this gecko is on
    const pageNum = Math.floor(geckoIndex / CONFIG.perPage) + 1;
    changePage(pageNum);

    // After render, scroll to and highlight the gecko
    setTimeout(() => {
        const cards = document.querySelectorAll('.gecko-card');
        const cardIndex = geckoIndex % CONFIG.perPage;
        if (cards[cardIndex]) {
            cards[cardIndex].scrollIntoView({ behavior: 'smooth', block: 'center' });
            cards[cardIndex].classList.add('highlight');
            setTimeout(() => cards[cardIndex].classList.remove('highlight'), 2000);
        }
    }, 100);
}

// ============================================
// Column Selector
// ============================================
function setColumns(cols) {
    currentColumns = cols;

    // Update grid class - remove old cols-* class and add new one
    if (geckoGrid) {
        // Remove any existing cols-* classes (convert to array first to avoid mutation issues)
        const classesToRemove = Array.from(geckoGrid.classList).filter(cls => cls.startsWith('cols-'));
        classesToRemove.forEach(cls => geckoGrid.classList.remove(cls));
        // Add the new column class
        geckoGrid.classList.add('cols-' + cols);
    }

    // Update active button state
    document.querySelectorAll('.col-btn').forEach(btn => {
        btn.classList.toggle('active', parseInt(btn.textContent) === cols);
    });

    // Save preference
    localStorage.setItem('galacticGecko_columns', cols);
}

function loadColumnPreference() {
    const saved = localStorage.getItem('galacticGecko_columns');
    if (saved) {
        const cols = parseInt(saved);
        if (cols >= 3 && cols <= 8) {
            currentColumns = cols;
            // Update button state immediately
            document.querySelectorAll('.col-btn').forEach(btn => {
                btn.classList.toggle('active', parseInt(btn.textContent) === currentColumns);
            });
        }
    }
}

// ============================================
// Filter System
// ============================================
const TRAIT_ORDER = ['Faction', 'Body', 'Eyes', 'Mouth', 'Ears', 'Helmet', 'Armor'];

function extractTraitValues() {
    // Initialize traitValues with empty Maps (value -> count)
    TRAIT_ORDER.forEach(trait => {
        traitValues[trait] = new Map();
    });

    // Count occurrences of each trait value
    geckos.forEach(gecko => {
        TRAIT_ORDER.forEach(traitName => {
            const trait = gecko.attributes.find(a => a.name === traitName);
            if (trait) {
                const count = traitValues[traitName].get(trait.value) || 0;
                traitValues[traitName].set(trait.value, count + 1);
            }
        });
    });
}

function populateFilterPanel() {
    TRAIT_ORDER.forEach(traitName => {
        // Body trait has a different ID to avoid conflict with filter-body wrapper
        const containerId = traitName === 'Body' ? 'filterBodyTrait' : 'filter' + traitName;
        const container = document.getElementById(containerId);
        if (!container) return;

        const values = traitValues[traitName];
        if (!values || values.size === 0) return;

        // Sort values alphabetically, but put "None" at the end
        const sortedValues = Array.from(values.entries()).sort((a, b) => {
            if (a[0] === 'None') return 1;
            if (b[0] === 'None') return -1;
            return a[0].localeCompare(b[0]);
        });

        container.innerHTML = sortedValues.map(([value, count]) => `
            <label class="filter-option">
                <input type="checkbox"
                    data-trait="${traitName}"
                    data-value="${value}"
                    onchange="handleFilterChange(this)">
                <span class="filter-checkbox"></span>
                <span class="filter-option-label">${value}</span>
                <span class="filter-option-count">(${count.toLocaleString()})</span>
            </label>
        `).join('');
    });

    updateFilterCount();
}

function toggleFilterPanel() {
    const isVisible = filterPanel && filterPanel.classList.contains('visible');

    if (isVisible) {
        filterPanel.classList.remove('visible');
        filterOverlay.classList.remove('visible');
        document.body.style.overflow = '';
    } else {
        filterPanel.classList.add('visible');
        filterOverlay.classList.add('visible');
        document.body.style.overflow = 'hidden';
    }
}

function toggleFilterSection(header) {
    const section = header.closest('.filter-section');
    section.classList.toggle('collapsed');
    const toggle = header.querySelector('.filter-section-toggle');
    toggle.textContent = section.classList.contains('collapsed') ? '+' : '-';
}

function handleFilterChange(checkbox) {
    const trait = checkbox.dataset.trait;
    const value = checkbox.dataset.value;

    if (checkbox.checked) {
        activeFilters[trait].add(value);
    } else {
        activeFilters[trait].delete(value);
    }

    updateFilterCount();
}

function getFilteredGeckos() {
    return geckos.filter(gecko => {
        // Check each trait that has active filters
        for (const traitName of TRAIT_ORDER) {
            const filterSet = activeFilters[traitName];
            if (filterSet.size === 0) continue; // No filter for this trait

            // Find this gecko's value for the trait
            const trait = gecko.attributes.find(a => a.name === traitName);
            const geckoValue = trait ? trait.value : null;

            // Gecko must have one of the selected values (OR within trait)
            if (!filterSet.has(geckoValue)) {
                return false; // AND across traits - must match all
            }
        }
        return true;
    });
}

function updateFilterCount() {
    const matchingGeckos = getFilteredGeckos();
    const countEl = document.getElementById('filterCount');
    if (countEl) {
        countEl.textContent = `${matchingGeckos.length.toLocaleString()} gecko${matchingGeckos.length !== 1 ? 's' : ''}`;
    }
}

function getActiveFilterCount() {
    let count = 0;
    TRAIT_ORDER.forEach(trait => {
        count += activeFilters[trait].size;
    });
    return count;
}

function updateFilterBadge() {
    const badge = document.getElementById('filterBadge');
    if (!badge) return;

    const count = getActiveFilterCount();
    if (count > 0) {
        badge.textContent = count;
        badge.classList.add('visible');
    } else {
        badge.classList.remove('visible');
    }
}

function applyFilters() {
    const hasFilters = getActiveFilterCount() > 0;

    if (hasFilters) {
        filteredGeckos = getFilteredGeckos();
        isFilterActive = true;
    } else {
        filteredGeckos = [];
        isFilterActive = false;
    }

    // Reset to page 1 when filters change
    currentPage = 1;

    // Recalculate total pages based on filtered results
    const displayGeckos = isFilterActive ? filteredGeckos : geckos;
    totalPages = Math.ceil(displayGeckos.length / CONFIG.perPage);

    // Update the page input max
    const pageInput = document.getElementById('pageInput');
    if (pageInput) {
        pageInput.max = totalPages;
    }

    updateFilterBadge();
    renderPagination();
    renderGeckos();
    toggleFilterPanel();
}

function clearFilters() {
    // Clear all active filters
    TRAIT_ORDER.forEach(trait => {
        activeFilters[trait].clear();
    });

    // Uncheck all checkboxes
    document.querySelectorAll('.filter-option input[type="checkbox"]').forEach(cb => {
        cb.checked = false;
    });

    // Reset filter state
    filteredGeckos = [];
    isFilterActive = false;
    currentPage = 1;
    totalPages = Math.ceil(geckos.length / CONFIG.perPage);

    const pageInput = document.getElementById('pageInput');
    if (pageInput) {
        pageInput.max = totalPages;
    }

    updateFilterCount();
    updateFilterBadge();
    renderPagination();
    renderGeckos();
}

// ============================================
// Gecko Grid Rendering
// ============================================
function renderGeckos() {
    if (!geckoGrid) return;

    const displayGeckos = isFilterActive ? filteredGeckos : geckos;
    const start = (currentPage - 1) * CONFIG.perPage;
    const end = start + CONFIG.perPage;
    const pageGeckos = displayGeckos.slice(start, end);

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

    // Gecko input enter key
    const geckoInput = document.getElementById('geckoInput');
    if (geckoInput) {
        geckoInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                goToGecko();
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

    // Close modal or filter panel on Escape key
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            if (filterPanel && filterPanel.classList.contains('visible')) {
                toggleFilterPanel();
            } else {
                closeModal();
            }
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
    loadColumnPreference();

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
window.goToGecko = goToGecko;
window.setColumns = setColumns;
window.openModal = openModal;
window.closeModal = closeModal;
window.toggleFavorite = toggleFavorite;
window.toggleFavoriteFromModal = toggleFavoriteFromModal;
window.FavoritesManager = FavoritesManager;
window.autoLoadGeckos = autoLoadGeckos;
window.processGeckoData = processGeckoData;
window.geckos = geckos;
// Filter functions
window.toggleFilterPanel = toggleFilterPanel;
window.toggleFilterSection = toggleFilterSection;
window.handleFilterChange = handleFilterChange;
window.applyFilters = applyFilters;
window.clearFilters = clearFilters;
