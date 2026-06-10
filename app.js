// Human-readable translations for languages and document types
const LANGUAGE_MAP = {
    'en': 'Inglês (en)',
    'pt': 'Português (pt)',
    'es': 'Espanhol (es)',
    'fr': 'Francês (fr)',
    'de': 'Alemão (de)',
    'it': 'Italiano (it)',
    'hr': 'Croata (hr)',
    'he': 'Hebraico (he)',
    'ca': 'Catalão (ca)',
    'lv': 'Letão (lv)',
    'fi': 'Finlandês (fi)',
    'gl': 'Galego (gl)',
    'hi': 'Hindi (hi)',
    'sv': 'Sueco (sv)',
    'unknown': 'Desconhecido'
};

const TYPE_MAP = {
    'article': 'Artigo',
    'review': 'Revisão',
    'book-chapter': 'Capítulo de Livro',
    'preprint': 'Preprint',
    'book': 'Livro',
    'letter': 'Carta',
    'editorial': 'Editorial',
    'erratum': 'Errata',
    'dissertation': 'Dissertação',
    'other': 'Outro',
    'dataset': 'Dataset',
    'report': 'Relatório',
    'unknown': 'Desconhecido'
};

// Global Interactive Kibana Filters State
let activeFilters = {
    yearMin: 1915,
    yearMax: 2025,
    language: 'all',
    type: 'all',
    searchSource: '',
    gender: 'all',
    area: 'all',
    subarea: 'all',
    country: 'all',
    topic: 'all',
    openAccess: 'all',
    oaStatus: 'all',
    institution: 'all',
    author: 'all'
};

// Global State
let currentTemporalSort = 'publications'; // 'publications' or 'year'
let tableSearchQuery = '';
let tableSortColumn = 'count'; // 'rank', 'source', 'count'
let tableSortDirection = 'desc'; // 'asc', 'desc'

let tableInstSearchQuery = '';
let tableInstSortColumn = 'count'; // 'rank', 'institution', 'count'
let tableInstSortDirection = 'desc'; // 'asc', 'desc'

// Autoras table state
let autorasSearchQuery = '';

// Publications list table state
let publicationsListCurrentPage = 1;
const publicationsListPageSize = 10;
let publicationsListData = []; // Grouped source, type, year, count

// DOM Elements
const minYearSlider = document.getElementById('filter-year-min');
const maxYearSlider = document.getElementById('filter-year-max');
const yearRangeDisplay = document.getElementById('year-range-display');
const selectLanguage = document.getElementById('filter-language');
const selectType = document.getElementById('filter-type');
const searchSourceInput = document.getElementById('filter-search-source');
const clearSearchBtn = document.getElementById('clear-search-btn');
const resetFiltersBtn = document.getElementById('btn-reset-filters');

const sortPublicationsBtn = document.getElementById('sort-by-publications');
const sortYearBtn = document.getElementById('sort-by-year');

// DOM Elements for Tables
const tableFilterInput = document.getElementById('table-filter-input');
const tableFilterBtn = document.getElementById('table-filter-btn');
const tableBodySources = document.getElementById('table-body-sources');
const thRank = document.getElementById('th-rank');
const thSource = document.getElementById('th-source');
const thCount = document.getElementById('th-count');

const tableInstFilterInput = document.getElementById('table-inst-filter-input');
const tableInstFilterBtn = document.getElementById('table-inst-filter-btn');
const tableBodyInstitutions = document.getElementById('table-body-institutions');
const thInstRank = document.getElementById('th-inst-rank');
const thInstName = document.getElementById('th-inst-name');
const thInstCount = document.getElementById('th-inst-count');

const tableBodyPublicationsList = document.getElementById('table-body-publications-list');
const tablePagination = document.getElementById('table-pagination');
const exportRawBtn = document.getElementById('export-raw-btn');
const exportFormattedBtn = document.getElementById('export-formatted-btn');

// KPIs Elements
const kpiPublications = document.getElementById('kpi-total-publications');
const kpiCitations = document.getElementById('kpi-total-citations');
const kpiAvgCitations = document.getElementById('kpi-avg-citations');
const kpiSources = document.getElementById('kpi-total-sources');

// Color Palette for Pie Charts
const COLOR_SCHEME = [
    "#55b399", "#4299e1", "#ed8936", "#805ad5", "#ecc94b", 
    "#f56565", "#48bb78", "#38b2ac", "#9f7aea", "#ed64a6", 
    "#a0aec0", "#e2e8f0", "#718096", "#cbd5e1"
];

// Global dataset decompressed
let dashboardData = [];

function decompressData() {
    if (typeof dashboardDataRaw === 'undefined') {
        console.error("dashboardDataRaw is not loaded! Make sure dashboard_data.js is present.");
        return false;
    }
    const dicts = dashboardDataRaw.dicts;
    dashboardData = dashboardDataRaw.data.map(item => ({
        year: item[0],
        language: dicts.languages[item[1]],
        type: dicts.types[item[2]],
        gender: dicts.genders[item[3]],
        area: dicts.areas[item[4]],
        subarea: dicts.subareas[item[5]],
        source: dicts.sources[item[6]],
        institution: dicts.institutions[item[7]],
        countries: dicts.countries[item[8]],
        fields: dicts.fields[item[9]],
        is_oa: item[10],
        oa_status: dicts.oa_statuses[item[11]],
        citations: item[12],
        count: 1,
        title: item[13],
        authors: item[14],
        link: item[15]
    }));
    return true;
}

// Initialize the application
function init() {
    if (!decompressData()) {
        console.error("Dashboard data could not be loaded. Please ensure dashboard_data.js is present.");
        return;
    }

    populateFilterOptions();
    setupEventListeners();
    updateTableSortIndicators();
    updateTableInstSortIndicators();
    updateDashboard();
}

// Populate language and type filters from raw data
function populateFilterOptions() {
    const languages = new Set();
    const types = new Set();

    dashboardData.forEach(item => {
        if (item.language) languages.add(item.language);
        if (item.type) types.add(item.type);
    });

    // Populate Languages Dropdown
    const sortedLanguages = Array.from(languages).sort();
    sortedLanguages.forEach(lang => {
        const option = document.createElement('option');
        option.value = lang;
        option.textContent = LANGUAGE_MAP[lang] || lang.toUpperCase();
        selectLanguage.appendChild(option);
    });

    // Populate Types Dropdown
    const sortedTypes = Array.from(types).sort();
    sortedTypes.forEach(type => {
        const option = document.createElement('option');
        option.value = type;
        option.textContent = TYPE_MAP[type] || type.charAt(0).toUpperCase() + type.slice(1);
        selectType.appendChild(option);
    });
}

// Setup Event Listeners
function setupEventListeners() {
    // Year range inputs
    minYearSlider.addEventListener('input', () => {
        const minVal = parseInt(minYearSlider.value);
        const maxVal = parseInt(maxYearSlider.value);
        if (minVal > maxVal) {
            minYearSlider.value = maxVal;
        }
        updateYearRangeDisplay();
        updateDashboard();
    });

    maxYearSlider.addEventListener('input', () => {
        const minVal = parseInt(minYearSlider.value);
        const maxVal = parseInt(maxYearSlider.value);
        if (maxVal < minVal) {
            maxYearSlider.value = minVal;
        }
        updateYearRangeDisplay();
        updateDashboard();
    });

    // Dropdown changes
    selectLanguage.addEventListener('change', updateDashboard);
    selectType.addEventListener('change', updateDashboard);

    // Search source input
    searchSourceInput.addEventListener('input', () => {
        if (searchSourceInput.value.trim() !== '') {
            clearSearchBtn.style.display = 'block';
        } else {
            clearSearchBtn.style.display = 'none';
        }
        updateDashboard();
    });

    // Clear search button click
    clearSearchBtn.addEventListener('click', () => {
        searchSourceInput.value = '';
        clearSearchBtn.style.display = 'none';
        updateDashboard();
    });

    // Reset filters button click
    resetFiltersBtn.addEventListener('click', resetFilters);

    // Sorting toggles for the temporal chart
    sortPublicationsBtn.addEventListener('click', () => {
        if (currentTemporalSort !== 'publications') {
            currentTemporalSort = 'publications';
            sortPublicationsBtn.classList.add('active');
            sortYearBtn.classList.remove('active');
            renderTemporalChart();
        }
    });

    sortYearBtn.addEventListener('click', () => {
        if (currentTemporalSort !== 'year') {
            currentTemporalSort = 'year';
            sortYearBtn.classList.add('active');
            sortPublicationsBtn.classList.remove('active');
            renderTemporalChart();
        }
    });

    // Sources Table card search input
    tableFilterInput.addEventListener('input', () => {
        tableSearchQuery = tableFilterInput.value.toLowerCase().trim();
        renderSourcesTable();
    });
    tableFilterInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            tableSearchQuery = tableFilterInput.value.toLowerCase().trim();
            renderSourcesTable();
        }
    });
    tableFilterBtn.addEventListener('click', () => {
        tableSearchQuery = tableFilterInput.value.toLowerCase().trim();
        renderSourcesTable();
    });

    // Sources Table sorting column headers
    thRank.addEventListener('click', () => handleTableSort('rank'));
    thSource.addEventListener('click', () => handleTableSort('source'));
    thCount.addEventListener('click', () => handleTableSort('count'));

    // Institutions Table card search input
    tableInstFilterInput.addEventListener('input', () => {
        tableInstSearchQuery = tableInstFilterInput.value.toLowerCase().trim();
        renderInstitutionsTable();
    });
    tableInstFilterInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            tableInstSearchQuery = tableInstFilterInput.value.toLowerCase().trim();
            renderInstitutionsTable();
        }
    });
    tableInstFilterBtn.addEventListener('click', () => {
        tableInstSearchQuery = tableInstFilterInput.value.toLowerCase().trim();
        renderInstitutionsTable();
    });

    // Institutions Table sorting column headers
    thInstRank.addEventListener('click', () => handleTableInstSort('rank'));
    thInstName.addEventListener('click', () => handleTableInstSort('institution'));
    thInstCount.addEventListener('click', () => handleTableInstSort('count'));

    // Active filters clear all button
    document.getElementById('btn-clear-all-filters').addEventListener('click', resetFilters);

    // Export links
    exportRawBtn.addEventListener('click', (e) => {
        e.preventDefault();
        exportPublicationsList(true);
    });
    exportFormattedBtn.addEventListener('click', (e) => {
        e.preventDefault();
        exportPublicationsList(false);
    });

    // Chart level clear buttons listeners
    document.getElementById('btn-clear-temporal').addEventListener('click', () => {
        activeFilters.yearMin = 1915;
        activeFilters.yearMax = 2025;
        minYearSlider.value = 1915;
        maxYearSlider.value = 2025;
        updateYearRangeDisplay();
        updateDashboard();
    });
    document.getElementById('btn-clear-language').addEventListener('click', () => {
        activeFilters.language = 'all';
        selectLanguage.value = 'all';
        updateDashboard();
    });
    document.getElementById('btn-clear-sources').addEventListener('click', () => {
        activeFilters.searchSource = '';
        searchSourceInput.value = '';
        clearSearchBtn.style.display = 'none';
        updateDashboard();
    });
    document.getElementById('btn-clear-areas').addEventListener('click', () => {
        activeFilters.area = 'all';
        updateDashboard();
    });
    document.getElementById('btn-clear-institutions').addEventListener('click', () => {
        activeFilters.institution = 'all';
        updateDashboard();
    });
    document.getElementById('btn-clear-subareas').addEventListener('click', () => {
        activeFilters.subarea = 'all';
        updateDashboard();
    });
    document.getElementById('btn-clear-countries').addEventListener('click', () => {
        activeFilters.country = 'all';
        updateDashboard();
    });
    document.getElementById('btn-clear-topics').addEventListener('click', () => {
        activeFilters.topic = 'all';
        updateDashboard();
    });
    document.getElementById('btn-clear-type').addEventListener('click', () => {
        activeFilters.type = 'all';
        selectType.value = 'all';
        updateDashboard();
    });
    document.getElementById('btn-clear-gender').addEventListener('click', () => {
        activeFilters.gender = 'all';
        updateDashboard();
    });
    document.getElementById('btn-clear-oa-pie').addEventListener('click', () => {
        activeFilters.openAccess = 'all';
        updateDashboard();
    });
    document.getElementById('btn-clear-oa-status-bar').addEventListener('click', () => {
        activeFilters.oaStatus = 'all';
        updateDashboard();
    });

    const btnClearAuthor = document.getElementById('btn-clear-author');
    if (btnClearAuthor) {
        btnClearAuthor.addEventListener('click', () => {
            activeFilters.author = 'all';
            updateDashboard();
        });
    }

    // Autoras Table search input
    const autorasFilterInput = document.getElementById('table-autoras-filter-input');
    const autorasFilterBtn = document.getElementById('table-autoras-filter-btn');
    if (autorasFilterInput) {
        autorasFilterInput.addEventListener('input', () => {
            autorasSearchQuery = autorasFilterInput.value.toLowerCase().trim();
            renderAutorasTable();
        });
        autorasFilterInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                autorasSearchQuery = autorasFilterInput.value.toLowerCase().trim();
                renderAutorasTable();
            }
        });
    }
    if (autorasFilterBtn) {
        autorasFilterBtn.addEventListener('click', () => {
            autorasSearchQuery = document.getElementById('table-autoras-filter-input').value.toLowerCase().trim();
            renderAutorasTable();
        });
    }
}

// Helper to update the text showing the selected range
function updateYearRangeDisplay() {
    yearRangeDisplay.textContent = `${minYearSlider.value} - ${maxYearSlider.value}`;
}

// Reset filters to defaults
function resetFilters() {
    activeFilters = {
        yearMin: 1915,
        yearMax: 2025,
        language: 'all',
        type: 'all',
        searchSource: '',
        gender: 'all',
        area: 'all',
        subarea: 'all',
        country: 'all',
        topic: 'all',
        openAccess: 'all',
        oaStatus: 'all',
        institution: 'all',
        author: 'all'
    };

    minYearSlider.value = 1915;
    maxYearSlider.value = 2025;
    updateYearRangeDisplay();
    
    selectLanguage.value = 'all';
    selectType.value = 'all';
    searchSourceInput.value = '';
    clearSearchBtn.style.display = 'none';

    // Reset local tables search
    tableFilterInput.value = '';
    tableSearchQuery = '';
    tableSortColumn = 'count';
    tableSortDirection = 'desc';
    updateTableSortIndicators();

    tableInstFilterInput.value = '';
    tableInstSearchQuery = '';
    tableInstSortColumn = 'count';
    tableInstSortDirection = 'desc';
    updateTableInstSortIndicators();

    // Reset autoras table
    const autorasInput = document.getElementById('table-autoras-filter-input');
    if (autorasInput) autorasInput.value = '';
    autorasSearchQuery = '';
    
    publicationsListCurrentPage = 1;
    
    updateDashboard();
}

// Sync active filters from the standard filter dropdowns/sliders
function syncFiltersFromUI() {
    activeFilters.yearMin = parseInt(minYearSlider.value);
    activeFilters.yearMax = parseInt(maxYearSlider.value);
    activeFilters.language = selectLanguage.value;
    activeFilters.type = selectType.value;
    activeFilters.searchSource = searchSourceInput.value.trim();
}

// Filter dataset and refresh KPIs + Charts
let filteredData = [];

function updateDashboard() {
    // 1. Sync filter state from standard HTML filters
    syncFiltersFromUI();

    // 2. Filter the dataset based on activeFilters state (Kibana cross-filtering)
    filteredData = dashboardData.filter(item => {
        // Year filter
        if (item.year < activeFilters.yearMin || item.year > activeFilters.yearMax) return false;
        
        // Language filter
        if (activeFilters.language !== 'all' && item.language !== activeFilters.language) return false;
        
        // Type filter
        if (activeFilters.type !== 'all' && item.type !== activeFilters.type) return false;
        
        // Search query filter
        if (activeFilters.searchSource !== '') {
            if (!item.source.toLowerCase().includes(activeFilters.searchSource.toLowerCase())) return false;
        }
        
        // Gender filter
        if (activeFilters.gender !== 'all' && item.gender !== activeFilters.gender) return false;
        
        // Area filter
        if (activeFilters.area !== 'all' && item.area !== activeFilters.area) return false;
        
        // Subarea filter
        if (activeFilters.subarea !== 'all' && item.subarea !== activeFilters.subarea) return false;
        
        // Country filter
        if (activeFilters.country !== 'all') {
            const countryList = (item.countries || "BR").split(';').map(c => c.trim().toUpperCase());
            if (!countryList.includes(activeFilters.country.toUpperCase())) return false;
        }
        
        // Topic field filter
        if (activeFilters.topic !== 'all') {
            const topicList = (item.fields || "Other").split(';').map(t => t.trim());
            if (!topicList.includes(activeFilters.topic)) return false;
        }
        
        // Open Access filter
        if (activeFilters.openAccess !== 'all') {
            const isOABool = activeFilters.openAccess === 'true';
            if (item.is_oa !== isOABool) return false;
        }
        
        // OA Status filter
        if (activeFilters.oaStatus !== 'all' && item.oa_status !== activeFilters.oaStatus) return false;
        
        // Institution filter
        if (activeFilters.institution !== 'all' && item.institution !== activeFilters.institution) return false;
        
        // Author filter
        if (activeFilters.author !== 'all' && item.authors !== activeFilters.author) return false;
        
        return true;
    });

    // 3. Render active filters tag bar
    renderActiveFiltersBar();
    updateChartClearButtonsVisibility();

    // 4. Update KPIs
    updateKPIs();

    // 5. Render all Charts and Tables
    renderTemporalChart();
    renderLanguageChart();
    renderSourcesTable();
    renderAreasChart();
    renderInstitutionsTable();
    renderSubareasChart();
    renderCountriesChart();
    renderTopicsChart();
    renderTypeChart();
    renderGenderChart();
    renderOAPieChart();
    renderOAStatusBarChart();
    renderPublicationsListTable();
    renderAutorasTable();
    renderGenderCitationsPanel();
}

// Compute and update KPIs values in the HTML
function updateKPIs() {
    let totalPublications = 0;
    let totalCitations = 0;
    const uniqueSources = new Set();

    filteredData.forEach(item => {
        totalPublications += item.count;
        totalCitations += item.citations;
        if (item.source && item.source !== "Unknown Source") {
            uniqueSources.add(item.source);
        }
    });

    const avgCitations = totalPublications > 0 ? (totalCitations / totalPublications).toFixed(1) : '0.0';

    // Format numbers with thousands separators
    kpiPublications.textContent = totalPublications.toLocaleString('pt-BR');
    kpiCitations.textContent = totalCitations.toLocaleString('pt-BR');
    kpiAvgCitations.textContent = avgCitations.toLocaleString('pt-BR');
    kpiSources.textContent = uniqueSources.size.toLocaleString('pt-BR');

    // Dynamic KPI context label for publications
    const kpiPubContext = document.getElementById('kpi-pub-context');
    if (kpiPubContext) {
        if (activeFilters.type !== 'all') {
            kpiPubContext.textContent = TYPE_MAP[activeFilters.type] || activeFilters.type;
        } else {
            kpiPubContext.textContent = 'todos os tipos';
        }
    }
}

// RENDER ACTIVE FILTERS BAR (Kibana-like tags)
function renderActiveFiltersBar() {
    const bar = document.getElementById('active-filters-bar');
    const list = document.getElementById('active-filters-list');
    list.innerHTML = '';
    
    let hasFilters = false;
    
    // Check if any filter is active
    // year range
    if (activeFilters.yearMin > 1915 || activeFilters.yearMax < 2025) {
        createFilterTag("Ano", `${activeFilters.yearMin} - ${activeFilters.yearMax}`, () => {
            activeFilters.yearMin = 1915;
            activeFilters.yearMax = 2025;
            minYearSlider.value = 1915;
            maxYearSlider.value = 2025;
            updateYearRangeDisplay();
            updateDashboard();
        });
        hasFilters = true;
    }
    
    // language
    if (activeFilters.language !== 'all') {
        const langLabel = LANGUAGE_MAP[activeFilters.language] || activeFilters.language;
        createFilterTag("Idioma", langLabel, () => {
            activeFilters.language = 'all';
            selectLanguage.value = 'all';
            updateDashboard();
        });
        hasFilters = true;
    }
    
    // type
    if (activeFilters.type !== 'all') {
        const typeLabel = TYPE_MAP[activeFilters.type] || activeFilters.type;
        createFilterTag("Tipo", typeLabel, () => {
            activeFilters.type = 'all';
            selectType.value = 'all';
            updateDashboard();
        });
        hasFilters = true;
    }
    
    // search source
    if (activeFilters.searchSource !== '') {
        createFilterTag("Busca Fonte", activeFilters.searchSource, () => {
            activeFilters.searchSource = '';
            searchSourceInput.value = '';
            clearSearchBtn.style.display = 'none';
            updateDashboard();
        });
        hasFilters = true;
    }
    
    // gender
    if (activeFilters.gender !== 'all') {
        createFilterTag("Gênero", activeFilters.gender, () => {
            activeFilters.gender = 'all';
            updateDashboard();
        });
        hasFilters = true;
    }
    
    // area
    if (activeFilters.area !== 'all') {
        createFilterTag("Área", activeFilters.area, () => {
            activeFilters.area = 'all';
            updateDashboard();
        });
        hasFilters = true;
    }
    
    // subarea
    if (activeFilters.subarea !== 'all') {
        createFilterTag("Subárea", activeFilters.subarea, () => {
            activeFilters.subarea = 'all';
            updateDashboard();
        });
        hasFilters = true;
    }
    
    // country
    if (activeFilters.country !== 'all') {
        createFilterTag("País", activeFilters.country, () => {
            activeFilters.country = 'all';
            updateDashboard();
        });
        hasFilters = true;
    }
    
    // topic
    if (activeFilters.topic !== 'all') {
        createFilterTag("Tópico", activeFilters.topic, () => {
            activeFilters.topic = 'all';
            updateDashboard();
        });
        hasFilters = true;
    }
    
    // open access
    if (activeFilters.openAccess !== 'all') {
        createFilterTag("Acesso Aberto", activeFilters.openAccess === 'true' ? "Aberto (true)" : "Fechado (false)", () => {
            activeFilters.openAccess = 'all';
            updateDashboard();
        });
        hasFilters = true;
    }
    
    // oa status
    if (activeFilters.oaStatus !== 'all') {
        createFilterTag("Status OA", activeFilters.oaStatus, () => {
            activeFilters.oaStatus = 'all';
            updateDashboard();
        });
        hasFilters = true;
    }
    
    // institution
    if (activeFilters.institution !== 'all') {
        createFilterTag("Instituição", activeFilters.institution, () => {
            activeFilters.institution = 'all';
            updateDashboard();
        });
        hasFilters = true;
    }

    // author
    if (activeFilters.author !== 'all') {
        createFilterTag("Autora", activeFilters.author, () => {
            activeFilters.author = 'all';
            updateDashboard();
        });
        hasFilters = true;
    }
    
    if (hasFilters) {
        bar.style.display = 'flex';
    } else {
        bar.style.display = 'none';
    }
}

function updateChartClearButtonsVisibility() {
    document.getElementById('btn-clear-temporal').style.display = (activeFilters.yearMin > 1915 || activeFilters.yearMax < 2025) ? 'inline-block' : 'none';
    document.getElementById('btn-clear-language').style.display = (activeFilters.language !== 'all') ? 'inline-block' : 'none';
    document.getElementById('btn-clear-sources').style.display = (activeFilters.searchSource !== '') ? 'inline-block' : 'none';
    document.getElementById('btn-clear-areas').style.display = (activeFilters.area !== 'all') ? 'inline-block' : 'none';
    document.getElementById('btn-clear-institutions').style.display = (activeFilters.institution !== 'all') ? 'inline-block' : 'none';
    document.getElementById('btn-clear-subareas').style.display = (activeFilters.subarea !== 'all') ? 'inline-block' : 'none';
    document.getElementById('btn-clear-countries').style.display = (activeFilters.country !== 'all') ? 'inline-block' : 'none';
    document.getElementById('btn-clear-topics').style.display = (activeFilters.topic !== 'all') ? 'inline-block' : 'none';
    document.getElementById('btn-clear-type').style.display = (activeFilters.type !== 'all') ? 'inline-block' : 'none';
    document.getElementById('btn-clear-gender').style.display = (activeFilters.gender !== 'all') ? 'inline-block' : 'none';
    document.getElementById('btn-clear-oa-pie').style.display = (activeFilters.openAccess !== 'all') ? 'inline-block' : 'none';
    document.getElementById('btn-clear-oa-status-bar').style.display = (activeFilters.oaStatus !== 'all') ? 'inline-block' : 'none';
    const btnClearAuthor = document.getElementById('btn-clear-author');
    if (btnClearAuthor) btnClearAuthor.style.display = (activeFilters.author !== 'all') ? 'inline-block' : 'none';
}

function createFilterTag(label, value, onRemove) {
    const list = document.getElementById('active-filters-list');
    const tag = document.createElement('div');
    tag.className = 'filter-tag';
    tag.innerHTML = `<span><strong>${label}</strong>: ${value}</span>`;
    
    const removeBtn = document.createElement('button');
    removeBtn.className = 'remove-filter-btn';
    removeBtn.innerHTML = '&times;';
    removeBtn.addEventListener('click', onRemove);
    
    tag.appendChild(removeBtn);
    list.appendChild(tag);
}

// HANDLE CHART CLICK INTERACTIVE FILTERS
function handleChartClick(chartType, datum) {
    if (!datum) return;
    let keyVal = datum.key || datum.year || datum.id;
    
    // Extract keyVal from typical nested Vega-Lite datum structures
    if (!keyVal && datum.datum) {
        keyVal = datum.datum.key || datum.datum.year || datum.datum.id;
    }
    
    if (keyVal === undefined || keyVal === null) return;
    
    console.log("Chart Selection filter applied (toggle):", chartType, keyVal);
    
    // Update active filter based on chartType with toggle behavior
    if (chartType === 'temporal') {
        const val = parseInt(keyVal);
        if (activeFilters.yearMin === val && activeFilters.yearMax === val) {
            // Toggle off
            activeFilters.yearMin = 1915;
            activeFilters.yearMax = 2025;
            minYearSlider.value = 1915;
            maxYearSlider.value = 2025;
        } else {
            // Toggle on
            activeFilters.yearMin = val;
            activeFilters.yearMax = val;
            minYearSlider.value = val;
            maxYearSlider.value = val;
        }
        updateYearRangeDisplay();
    } else if (chartType === 'language') {
        let iso = keyVal;
        for (const [k, v] of Object.entries(LANGUAGE_MAP)) {
            if (v.startsWith(keyVal)) {
                iso = k;
                break;
            }
        }
        if (activeFilters.language === iso) {
            activeFilters.language = 'all';
            selectLanguage.value = 'all';
        } else {
            activeFilters.language = iso;
            selectLanguage.value = iso;
        }
    } else if (chartType === 'type') {
        let docType = keyVal;
        for (const [k, v] of Object.entries(TYPE_MAP)) {
            if (v === keyVal) {
                docType = k;
                break;
            }
        }
        if (activeFilters.type === docType) {
            activeFilters.type = 'all';
            selectType.value = 'all';
        } else {
            activeFilters.type = docType;
            selectType.value = docType;
        }
    } else if (chartType === 'area') {
        if (activeFilters.area === keyVal) {
            activeFilters.area = 'all';
        } else {
            activeFilters.area = keyVal;
        }
    } else if (chartType === 'subarea') {
        if (activeFilters.subarea === keyVal) {
            activeFilters.subarea = 'all';
        } else {
            activeFilters.subarea = keyVal;
        }
    } else if (chartType === 'country') {
        if (activeFilters.country === keyVal) {
            activeFilters.country = 'all';
        } else {
            activeFilters.country = keyVal;
        }
    } else if (chartType === 'topic') {
        if (activeFilters.topic === keyVal) {
            activeFilters.topic = 'all';
        } else {
            activeFilters.topic = keyVal;
        }
    } else if (chartType === 'gender') {
        if (activeFilters.gender === keyVal) {
            activeFilters.gender = 'all';
        } else {
            activeFilters.gender = keyVal;
        }
    } else if (chartType === 'is_oa') {
        const valStr = keyVal.toString();
        if (activeFilters.openAccess === valStr) {
            activeFilters.openAccess = 'all';
        } else {
            activeFilters.openAccess = valStr;
        }
    } else if (chartType === 'oa_status') {
        if (activeFilters.oaStatus === keyVal) {
            activeFilters.oaStatus = 'all';
        } else {
            activeFilters.oaStatus = keyVal;
        }
    } else if (chartType === 'source_table') {
        if (activeFilters.searchSource === keyVal) {
            activeFilters.searchSource = '';
            searchSourceInput.value = '';
            clearSearchBtn.style.display = 'none';
        } else {
            activeFilters.searchSource = keyVal;
            searchSourceInput.value = keyVal;
            clearSearchBtn.style.display = 'block';
        }
    } else if (chartType === 'institution') {
        if (activeFilters.institution === keyVal) {
            activeFilters.institution = 'all';
        } else {
            activeFilters.institution = keyVal;
        }
    } else if (chartType === 'author') {
        if (activeFilters.author === keyVal) {
            activeFilters.author = 'all';
        } else {
            activeFilters.author = keyVal;
        }
    }
    
    // Reset list pagination back to page 1
    publicationsListCurrentPage = 1;
    
    updateDashboard();
}

// ─── ELEGANT HTML DONUT CHART ────────────────────────────────────────────────
// Replaces the Vega pie spec. Renders a clean SVG donut (no text inside slices)
// plus a responsive legend panel with color swatches and percentage bars.

const DONUT_COLORS = [
    '#54B399', '#6092C0', '#D36086', '#9170B8', '#D6BF57',
    '#DA8B45', '#E7664C', '#00BFB3', '#5B9BD5', '#2E8B57',
    '#B04B7E', '#CA8EAE', '#1F6E8C', '#6BAE79', '#C0475B',
    '#7B5EA7', '#3D87A4', '#CD7F32', '#B9A888', '#AA6556',
];

function renderHTMLDonut(containerId, data, chartType) {
    const container = document.querySelector(containerId);
    if (!container) return;
    container.innerHTML = '';

    if (!data || data.length === 0) {
        container.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:260px;color:#718096;font-family:Inter,sans-serif;">Sem dados</div>';
        return;
    }

    const total = data.reduce((s, d) => s + d.value, 0);
    const totalFmt = total.toLocaleString('pt-BR');

    // Outer wrapper
    const wrap = document.createElement('div');
    wrap.style.cssText = 'display:flex;align-items:center;gap:28px;width:100%;padding:8px 4px;box-sizing:border-box;font-family:Inter,sans-serif;';

    // ── SVG Donut ────────────────────────────────────────────────────────────
    const size  = 220;
    const cx    = size / 2;
    const cy    = size / 2;
    const R     = 88;   // outer radius
    const r     = 54;   // inner radius (hole)

    const svgNS = 'http://www.w3.org/2000/svg';
    const svg   = document.createElementNS(svgNS, 'svg');
    svg.setAttribute('width',  size);
    svg.setAttribute('height', size);
    svg.setAttribute('viewBox', `0 0 ${size} ${size}`);
    svg.style.cssText = 'flex-shrink:0;overflow:visible;';

    // Build paths
    let startAngle = -Math.PI / 2; // start at top
    data.forEach((d, idx) => {
        const sweep = (d.value / total) * 2 * Math.PI;
        const endAngle = startAngle + sweep;
        const color = DONUT_COLORS[idx % DONUT_COLORS.length];

        const x1 = cx + R * Math.cos(startAngle);
        const y1 = cy + R * Math.sin(startAngle);
        const x2 = cx + R * Math.cos(endAngle);
        const y2 = cy + R * Math.sin(endAngle);
        const ix1 = cx + r * Math.cos(endAngle);
        const iy1 = cy + r * Math.sin(endAngle);
        const ix2 = cx + r * Math.cos(startAngle);
        const iy2 = cy + r * Math.sin(startAngle);

        const largeArc = sweep > Math.PI ? 1 : 0;

        const path = document.createElementNS(svgNS, 'path');
        const dAttr = [
            `M ${x1} ${y1}`,
            `A ${R} ${R} 0 ${largeArc} 1 ${x2} ${y2}`,
            `L ${ix1} ${iy1}`,
            `A ${r} ${r} 0 ${largeArc} 0 ${ix2} ${iy2}`,
            'Z'
        ].join(' ');

        path.setAttribute('d', dAttr);
        path.setAttribute('fill', color);
        path.style.cssText = 'cursor:pointer;transition:opacity 0.15s ease,transform 0.15s ease;transform-origin:' + cx + 'px ' + cy + 'px;';
        path.setAttribute('data-key', d.key);

        const pctStr = (d.percentage * 100).toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2});
        path.setAttribute('title', `${d.key}: ${pctStr}%`);

        // Hover: scale slice outward
        path.addEventListener('mouseenter', () => { path.style.opacity = '0.82'; path.style.transform = 'scale(1.04)'; });
        path.addEventListener('mouseleave', () => { path.style.opacity = '';     path.style.transform = ''; });

        // Click → cross-filter
        path.addEventListener('click', () => {
            handleChartClick(chartType, { key: d.key, value: d.value, percentage: d.percentage });
        });

        svg.appendChild(path);
        startAngle = endAngle;
    });

    // Center text: total
    const centerG = document.createElementNS(svgNS, 'g');
    centerG.style.pointerEvents = 'none';

    const hole = document.createElementNS(svgNS, 'circle');
    hole.setAttribute('cx', cx);
    hole.setAttribute('cy', cy);
    hole.setAttribute('r', r - 2);
    hole.setAttribute('fill', 'white');
    centerG.appendChild(hole);

    const labelTotal = document.createElementNS(svgNS, 'text');
    labelTotal.setAttribute('x', cx);
    labelTotal.setAttribute('y', cy - 6);
    labelTotal.setAttribute('text-anchor', 'middle');
    labelTotal.setAttribute('dominant-baseline', 'middle');
    labelTotal.setAttribute('fill', '#2d3748');
    labelTotal.setAttribute('font-family', 'Inter, sans-serif');
    labelTotal.setAttribute('font-size', '15');
    labelTotal.setAttribute('font-weight', '700');
    labelTotal.textContent = totalFmt;
    centerG.appendChild(labelTotal);

    const labelSub = document.createElementNS(svgNS, 'text');
    labelSub.setAttribute('x', cx);
    labelSub.setAttribute('y', cy + 14);
    labelSub.setAttribute('text-anchor', 'middle');
    labelSub.setAttribute('fill', '#a0aec0');
    labelSub.setAttribute('font-family', 'Inter, sans-serif');
    labelSub.setAttribute('font-size', '10');
    labelSub.textContent = 'registros';
    centerG.appendChild(labelSub);

    svg.appendChild(centerG);
    wrap.appendChild(svg);

    // ── Legend Panel ─────────────────────────────────────────────────────────
    const legend = document.createElement('div');
    legend.style.cssText = 'flex:1;min-width:0;display:flex;flex-direction:column;gap:7px;max-height:260px;overflow-y:auto;padding-right:4px;';
    // Scrollbar styling via CSS class
    legend.className = 'donut-legend';

    data.forEach((d, idx) => {
        const color = DONUT_COLORS[idx % DONUT_COLORS.length];
        const pct = (d.percentage * 100);
        const pctFmt = pct.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2});

        const row = document.createElement('div');
        row.style.cssText = 'display:flex;align-items:center;gap:8px;cursor:pointer;padding:3px 6px;border-radius:5px;transition:background 0.12s;';
        row.title = `${d.key}: ${pctFmt}% (${d.value.toLocaleString('pt-BR')} registros)`;

        row.addEventListener('mouseenter', () => { row.style.background = '#f7fafc'; });
        row.addEventListener('mouseleave', () => { row.style.background = ''; });
        row.addEventListener('click', () => {
            handleChartClick(chartType, { key: d.key, value: d.value, percentage: d.percentage });
        });

        // Color swatch
        const swatch = document.createElement('span');
        swatch.style.cssText = `width:10px;height:10px;min-width:10px;border-radius:50%;background:${color};display:inline-block;flex-shrink:0;`;
        row.appendChild(swatch);

        // Label + bar container
        const labelWrap = document.createElement('div');
        labelWrap.style.cssText = 'flex:1;min-width:0;';

        const topLine = document.createElement('div');
        topLine.style.cssText = 'display:flex;justify-content:space-between;align-items:baseline;gap:6px;';

        const nameEl = document.createElement('span');
        nameEl.style.cssText = 'font-size:11px;font-weight:500;color:#2d3748;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:160px;display:block;';
        nameEl.textContent = d.key;
        topLine.appendChild(nameEl);

        const pctEl = document.createElement('span');
        pctEl.style.cssText = 'font-size:11px;font-weight:700;color:#4a5568;white-space:nowrap;flex-shrink:0;';
        pctEl.textContent = `${pctFmt}%`;
        topLine.appendChild(pctEl);

        labelWrap.appendChild(topLine);

        // Percentage bar
        const barBg = document.createElement('div');
        barBg.style.cssText = 'margin-top:3px;height:3px;background:#edf2f7;border-radius:2px;overflow:hidden;';
        const barFill = document.createElement('div');
        barFill.style.cssText = `height:100%;border-radius:2px;background:${color};width:${Math.min(pct, 100)}%;transition:width 0.4s ease;`;
        barBg.appendChild(barFill);
        labelWrap.appendChild(barBg);

        row.appendChild(labelWrap);
        legend.appendChild(row);
    });

    wrap.appendChild(legend);
    container.appendChild(wrap);
}



// ─── PURE JS SQUARIFY TREEMAP (Bruls, Huizing, van Wijk 2000) ───────────────
// Standard algorithm producing near-square tiles for elegant Kibana-like layout.

function squarify(data, x0, y0, x1, y1) {
    if (!data || !data.length) return [];

    const totalArea  = (x1 - x0) * (y1 - y0);
    const totalValue = data.reduce((s, d) => s + d.value, 0);
    if (totalValue === 0 || totalArea === 0) return [];

    // Assign proportional area to every node
    const nodes = data
        .slice()
        .sort((a, b) => b.value - a.value)
        .map(d => ({ ...d, _a: (d.value / totalValue) * totalArea }));

    const result = [];

    // Worst aspect-ratio for a row placed along a strip of width w
    function worst(row, w) {
        const s  = row.reduce((acc, n) => acc + n._a, 0);
        const mx = row.reduce((m,   n) => Math.max(m, n._a), -Infinity);
        const mn = row.reduce((m,   n) => Math.min(m, n._a),  Infinity);
        const w2 = w * w, s2 = s * s;
        return Math.max(w2 * mx / s2, s2 / (w2 * mn));
    }

    function tile(nodes, x0, y0, x1, y1) {
        if (!nodes.length) return;
        const dx = x1 - x0, dy = y1 - y0;
        if (dx <= 0 || dy <= 0) return;

        if (nodes.length === 1) {
            result.push({ ...nodes[0], x0, y0, x1, y1 });
            return;
        }

        const w = Math.min(dx, dy); // short side of remaining area

        // Greedily build optimal row
        let row = [nodes[0]], i = 1;
        while (i < nodes.length) {
            const cand = row.concat(nodes[i]);
            if (worst(cand, w) <= worst(row, w)) { row = cand; i++; }
            else break;
        }

        const rowArea = row.reduce((s, n) => s + n._a, 0);
        const strip   = rowArea / w; // thickness of this strip

        if (dx >= dy) {
            // Landscape: vertical column on the left
            let cy = y0;
            row.forEach(n => {
                const h = (n._a / rowArea) * dy;
                result.push({ ...n, x0, y0: cy, x1: x0 + strip, y1: cy + h });
                cy += h;
            });
            tile(nodes.slice(i), x0 + strip, y0, x1, y1);
        } else {
            // Portrait: horizontal row on the top
            let cx = x0;
            row.forEach(n => {
                const cw = (n._a / rowArea) * dx;
                result.push({ ...n, x0: cx, y0, x1: cx + cw, y1: y0 + strip });
                cx += cw;
            });
            tile(nodes.slice(i), x0, y0 + strip, x1, y1);
        }
    }

    tile(nodes, x0, y0, x1, y1);
    return result;
}

// Kibana-inspired color palette
const TREEMAP_COLORS = [
    '#54B399', // teal-green
    '#6092C0', // steel-blue
    '#D36086', // pink
    '#9170B8', // purple
    '#CA8EAE', // mauve
    '#D6BF57', // golden
    '#DA8B45', // amber
    '#AA6556', // terracotta
    '#E7664C', // coral
    '#00BFB3', // bright teal
    '#5B9BD5', // cornflower
    '#2E8B57', // sea-green
    '#B04B7E', // magenta
    '#54B399', '#6092C0', '#D36086', '#9170B8', '#CA8EAE',
    '#D6BF57', '#DA8B45', '#AA6556', '#E7664C', '#00BFB3',
    '#5B9BD5', '#2E8B57', '#B04B7E', '#1F6E8C', '#6BAE79',
    '#C0475B', '#7B5EA7', '#3D87A4'
];

function renderHTMLTreemap(containerId, items, chartType) {
    const container = document.querySelector(containerId);
    if (!container) return;

    container.innerHTML = '';

    if (!items || items.length === 0) {
        container.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#718096;font-family:Inter,sans-serif;">Sem dados</div>';
        return;
    }

    // Dark wrapper filling the whole container (no gaps)
    const wrapper = document.createElement('div');
    wrapper.style.cssText = 'position:relative;width:100%;height:100%;overflow:hidden;border-radius:6px;';
    container.appendChild(wrapper);

    // Read real dimensions after browser lays out the wrapper
    requestAnimationFrame(() => {
        const W = wrapper.offsetWidth  || 600;
        const H = wrapper.offsetHeight || 460;

        const sorted = items.slice().sort((a, b) => b.value - a.value);
        // Call with (data, x0, y0, x1, y1)
        const layout = squarify(sorted, 0, 0, W, H);

        layout.forEach((cell, idx) => {
            const cellW = cell.x1 - cell.x0;
            const cellH = cell.y1 - cell.y0;
            const color = TREEMAP_COLORS[idx % TREEMAP_COLORS.length];

            const div = document.createElement('div');
            div.style.cssText = [
                'position:absolute',
                `left:${cell.x0.toFixed(1)}px`,
                `top:${cell.y0.toFixed(1)}px`,
                `width:${Math.max(0, cellW - 1).toFixed(1)}px`,
                `height:${Math.max(0, cellH - 1).toFixed(1)}px`,
                `background:${color}`,
                'box-sizing:border-box',
                'overflow:hidden',
                'padding:8px 10px',
                'cursor:pointer',
                'transition:filter 0.12s ease, box-shadow 0.12s ease',
            ].join(';');

            // Adaptive labels — only when cell has enough room
            if (cellW > 44 && cellH > 22) {
                const pct = (cell.percentage * 100).toLocaleString('pt-BR', {
                    minimumFractionDigits: 2, maximumFractionDigits: 2
                });

                // Font size scales with cell area like Kibana
                let fs = 10;
                if (cellW > 220 && cellH > 110) fs = 15;
                else if (cellW > 140 && cellH > 70)  fs = 13;
                else if (cellW > 90  && cellH > 45)  fs = 11;

                const nameEl = document.createElement('span');
                nameEl.style.cssText = [
                    'display:block',
                    'font-family:Inter,sans-serif',
                    `font-size:${fs}px`,
                    'font-weight:600',
                    'color:#fff',
                    'line-height:1.35',
                    'word-break:break-word',
                    'overflow:hidden',
                    `max-height:${Math.max(cellH - 24, 14)}px`,
                    'pointer-events:none',
                    'user-select:none',
                    'text-shadow:0 1px 4px rgba(0,0,0,0.45)',
                ].join(';');
                nameEl.textContent = cell.id;
                div.appendChild(nameEl);

                // Separate percentage line for medium/large cells
                if (cellH > 44) {
                    const pctEl = document.createElement('span');
                    pctEl.style.cssText = [
                        'display:block',
                        'font-family:Inter,sans-serif',
                        `font-size:${fs}px`,
                        'font-weight:700',
                        'color:#fff',
                        'opacity:0.9',
                        'margin-top:2px',
                        'pointer-events:none',
                        'user-select:none',
                        'text-shadow:0 1px 4px rgba(0,0,0,0.45)',
                    ].join(';');
                    pctEl.textContent = `${pct}%`;
                    div.appendChild(pctEl);
                } else {
                    nameEl.textContent += ` ${pct}%`;
                }
            }

            // Browser tooltip for all cells
            const pctStr = (cell.percentage * 100).toLocaleString('pt-BR', {
                minimumFractionDigits: 2, maximumFractionDigits: 2
            });
            div.title = `${cell.id}\nRegistros: ${cell.value.toLocaleString('pt-BR')}\nPercentual: ${pctStr}%`;
            
            // Hover brightness
            div.addEventListener('mouseenter', () => { div.style.filter = 'brightness(0.82)'; });
            div.addEventListener('mouseleave', () => { div.style.filter = ''; });
            
            // Cross-filter on click
            div.addEventListener('click', () => {
                handleChartClick(chartType, { id: cell.id, key: cell.id });
            });
            
            wrapper.appendChild(div);
        });
    });
}




// CHART 1: Evolução Temporal
function renderTemporalChart() {
    const isCron = currentTemporalSort === 'year';
    
    // Group and aggregate filteredData by year in JavaScript
    const yearCounts = {};
    filteredData.forEach(item => {
        yearCounts[item.year] = (yearCounts[item.year] || 0) + item.count;
    });
    
    let chartData = Object.entries(yearCounts).map(([year, total_count]) => ({
        year: parseInt(year),
        total_count
    }));
    
    if (isCron) {
        // Chronological: sort by year ascending
        chartData.sort((a, b) => a.year - b.year);
    } else {
        // Sorted by Publications: sort by count descending, take top 20 to avoid label squeezing
        chartData.sort((a, b) => b.total_count - a.total_count);
        chartData = chartData.slice(0, 20);
    }
    
    const spec = {
        "$schema": "https://vega.github.io/schema/vega-lite/v5.json",
        "width": "container",
        "height": 260,
        "data": { "values": chartData },
        "mark": {
            "type": "bar",
            "color": "#55b399",
            "cornerRadiusEnd": 3,
            "tooltip": true,
            "cursor": "pointer"
        },
        "encoding": {
            "x": {
                "field": "year",
                "type": "nominal", // Nominal for proper spacing and discrete bars
                "title": "Ano de Publicação",
                "sort": isCron ? null : "-y", // Vega-Lite respects JS sort if sort is null
                "axis": {
                    "labelAngle": -90, // Keep vertical layout matching the design screenshot
                    "grid": false,
                    "labelColor": "#718096",
                    "titleColor": "#2d3748",
                    "titleFontWeight": 600,
                    "labelFontSize": 9,
                    "titleFontSize": 10,
                    // If chronological, show every 5 years to guarantee vertical labels do not overlap
                    "labelExpr": isCron ? "(datum.value % 5 === 0) ? datum.value : ''" : "datum.value"
                }
            },
            "y": {
                "field": "total_count",
                "type": "quantitative",
                "title": "Publicações",
                "axis": {
                    "grid": true,
                    "gridDash": [4, 4],
                    "gridColor": "#e8edf2",
                    "gridOpacity": 0.8,
                    "labelColor": "#718096",
                    "titleColor": "#4a5568",
                    "titleFontWeight": 600,
                    "labelFontSize": 9,
                    "titleFontSize": 10,
                    "format": ",d",
                    "domain": false,
                    "ticks": false,
                    "labelPadding": 6
                }
            },
            "tooltip": [
                { "field": "year", "type": "nominal", "title": "Ano de Publicação" },
                { "field": "total_count", "type": "quantitative", "title": "Publicações", "format": ",d" }
            ]
        },
        "config": {
            "background": "transparent",
            "view": { "stroke": null },
            "scale": { "bandPaddingInner": 0.25 }
        }
    };

    vegaEmbed('#chart-temporal', spec, { actions: false }).then(result => {
        result.view.addEventListener('click', (event, item) => {
            if (item && item.datum) handleChartClick('temporal', item.datum);
        });
    });
}

// CHART 2: Idioma das Publicações
function renderLanguageChart() {
    const langCounts = {};
    let total = 0;
    
    filteredData.forEach(item => {
        const lang = item.language || "unknown";
        langCounts[lang] = (langCounts[lang] || 0) + item.count;
        total += item.count;
    });

    const languageData = Object.entries(langCounts).map(([key, value]) => ({
        key,
        value,
        percentage: value / (total || 1)
    })).sort((a, b) => b.value - a.value);

    renderHTMLDonut('#chart-language', languageData, 'language');
}

// CHART 4: Áreas — HTML Squarify Treemap
function renderAreasChart() {
    const areaCounts = {};
    let total = 0;

    filteredData.forEach(item => {
        const area = item.area || "Other";
        areaCounts[area] = (areaCounts[area] || 0) + item.count;
        total += item.count;
    });

    const items = Object.entries(areaCounts).map(([id, value]) => ({
        id,
        value,
        percentage: value / (total || 1)
    })).sort((a, b) => b.value - a.value);

    renderHTMLTreemap('#chart-areas', items, 'area');
}

// CHART 6: Subáreas — HTML Squarify Treemap
function renderSubareasChart() {
    const subareaCounts = {};
    let total = 0;

    filteredData.forEach(item => {
        const sub = item.subarea || "Other";
        subareaCounts[sub] = (subareaCounts[sub] || 0) + item.count;
        total += item.count;
    });

    const items = Object.entries(subareaCounts)
        .map(([id, value]) => ({
            id,
            value,
            percentage: value / (total || 1)
        }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 50); // top 50 for density matching the reference screenshot

    renderHTMLTreemap('#chart-subareas', items, 'subarea');
}

// CHART 7: Produção Científica Por País
function renderCountriesChart() {
    const countryCounts = {};
    let total = 0;

    filteredData.forEach(item => {
        const countries = item.countries || "BR";
        countries.split(';').forEach(c => {
            const country = c.trim().toUpperCase();
            if (country) {
                countryCounts[country] = (countryCounts[country] || 0) + item.count;
                total += item.count;
            }
        });
    });

    const chartData = Object.entries(countryCounts).map(([key, value]) => ({
        key,
        value,
        percentage: value / (total || 1)
    })).sort((a, b) => b.value - a.value).slice(0, 12);

    renderHTMLDonut('#chart-countries', chartData, 'country');
}

// CHART 8: Tópicos de Pesquisa
function renderTopicsChart() {
    const topicCounts = {};
    let total = 0;

    filteredData.forEach(item => {
        const fields = item.fields || "Other";
        fields.split(';').forEach(f => {
            const field = f.trim();
            if (field) {
                topicCounts[field] = (topicCounts[field] || 0) + item.count;
                total += item.count;
            }
        });
    });

    const chartData = Object.entries(topicCounts).map(([key, value]) => ({
        key,
        value,
        percentage: value / (total || 1)
    })).sort((a, b) => b.value - a.value).slice(0, 10);

    renderHTMLDonut('#chart-topics', chartData, 'topic');
}

// CHART 9: Distribuição por Tipo de Documento
function renderTypeChart() {
    const typeCounts = {};
    filteredData.forEach(item => {
        const mapped = TYPE_MAP[item.type] || item.type;
        typeCounts[mapped] = (typeCounts[mapped] || 0) + item.count;
    });

    const typeData = Object.entries(typeCounts).map(([key, value]) => ({ key, value }));

    const spec = {
        "$schema": "https://vega.github.io/schema/vega-lite/v5.json",
        "width": "container",
        "height": 260,
        "data": { "values": typeData },
        "mark": { "type": "bar", "color": "#f56565", "cornerRadiusEnd": 3, "tooltip": true, "cursor": "pointer" },
        "encoding": {
            "x": {
                "field": "key",
                "type": "nominal",
                "title": null,
                "sort": "-y",
                "axis": {
                    "labelAngle": -35,
                    "labelColor": "#718096",
                    "labelFontSize": 9
                }
            },
            "y": {
                "field": "value",
                "type": "quantitative",
                "title": "Publicações",
                "axis": {
                    "grid": true,
                    "gridDash": [3, 3],
                    "gridColor": "#edf2f7",
                    "labelColor": "#718096",
                    "labelFontSize": 9,
                    "titleFontSize": 10,
                    "format": ",d" // Formatted large numbers with commas
                }
            },
            "tooltip": [
                { "field": "key", "type": "nominal", "title": "Tipo" },
                { "field": "value", "type": "quantitative", "title": "Publicações", "format": ",d" }
            ]
        },
        "config": {
            "background": "transparent",
            "view": { "stroke": null }
        }
    };

    vegaEmbed('#chart-type', spec, { actions: false }).then(result => {
        result.view.addEventListener('click', (event, item) => {
            if (item && item.datum) handleChartClick('type', item.datum);
        });
    });
}

// CHART 10: Gênero
function renderGenderChart() {
    const genderCounts = {};
    let total = 0;

    filteredData.forEach(item => {
        const gender = item.gender || "INDEFINIDO";
        genderCounts[gender] = (genderCounts[gender] || 0) + item.count;
        total += item.count;
    });

    const genderData = Object.entries(genderCounts).map(([key, value]) => ({
        key,
        value,
        percentage: value / (total || 1)
    })).sort((a, b) => b.value - a.value);

    renderHTMLDonut('#chart-gender', genderData, 'gender');
}

// CHART 11: Acesso Aberto (Donut Card)
function renderOAPieChart() {
    const oaCounts = { "true": 0, "false": 0 };
    let total = 0;

    filteredData.forEach(item => {
        const k = item.is_oa ? "true" : "false";
        oaCounts[k] = (oaCounts[k] || 0) + item.count;
        total += item.count;
    });

    const oaData = Object.entries(oaCounts).map(([key, value]) => ({
        key: key === 'true' ? 'Acesso Aberto' : 'Acesso Fechado',
        value,
        percentage: value / (total || 1)
    })).sort((a, b) => b.value - a.value);

    renderHTMLDonut('#chart-oa-pie', oaData, 'is_oa');
}

// CHART 12: OA Status (New Bar Card)
function renderOAStatusBarChart() {
    const statusCounts = {};
    filteredData.forEach(item => {
        // Exclude closed or closed equivalents from counts if is_oa is false,
        // wait! In the screenshot, closed is mapped to diamond, so we show all status!
        const stat = item.oa_status || "diamond";
        statusCounts[stat] = (statusCounts[stat] || 0) + item.count;
    });

    // Custom order: diamond, gold, green, bronze, hybrid
    const sortOrder = ["diamond", "gold", "green", "bronze", "hybrid"];
    const statusData = sortOrder.map(key => ({
        key,
        value: statusCounts[key] || 0
    }));

    const spec = {
        "$schema": "https://vega.github.io/schema/vega-lite/v5.json",
        "width": "container",
        "height": 340,
        "data": { "values": statusData },
        "mark": {
            "type": "bar",
            "color": "#54B399",
            "tooltip": true,
            "cursor": "pointer"
        },
        "encoding": {
            "x": {
                "field": "key",
                "type": "nominal",
                "title": "OA Status",
                "sort": sortOrder,
                "axis": {
                    "labelAngle": 0,
                    "labelColor": "#718096",
                    "titleColor": "#4a5568",
                    "titleFontWeight": 600,
                    "labelFontSize": 11,
                    "titleFontSize": 12,
                    "grid": false,
                    "domain": true,
                    "domainColor": "#e2e8f0",
                    "ticks": false,
                    "labelPadding": 8
                }
            },
            "y": {
                "field": "value",
                "type": "quantitative",
                "title": "Contador de Registros",
                "axis": {
                    "grid": true,
                    "gridDash": [4, 4],
                    "gridColor": "#e8edf2",
                    "gridOpacity": 0.8,
                    "labelColor": "#718096",
                    "titleColor": "#4a5568",
                    "titleFontWeight": 600,
                    "labelFontSize": 10,
                    "titleFontSize": 12,
                    "format": ",d",
                    "domain": false,
                    "ticks": false,
                    "labelPadding": 8
                }
            },
            "tooltip": [
                { "field": "key",   "type": "nominal",      "title": "OA Status" },
                { "field": "value", "type": "quantitative", "title": "Contador de Registros", "format": ",d" }
            ]
        },
        "config": {
            "background": "transparent",
            "view": { "stroke": null },
            "bar": { "binSpacing": 2 },
            "scale": { "bandPaddingInner": 0.35 }
        }
    };

    vegaEmbed('#chart-oa-status-bar', spec, { actions: false }).then(result => {
        result.view.addEventListener('click', (event, item) => {
            if (item && item.datum) handleChartClick('oa_status', item.datum);
        });
    });
}

// SOURCES TABLE CARD LOGIC & RENDERING
function handleTableSort(column) {
    if (tableSortColumn === column) {
        tableSortDirection = tableSortDirection === 'asc' ? 'desc' : 'asc';
    } else {
        tableSortColumn = column;
        tableSortDirection = column === 'source' ? 'asc' : 'desc';
    }
    updateTableSortIndicators();
    renderSourcesTable();
}

function updateTableSortIndicators() {
    ['rank', 'source', 'count'].forEach(col => {
        const th = document.getElementById(`th-${col}`);
        if (!th) return;
        let indicator = th.querySelector('.sort-indicator');
        if (!indicator) {
            indicator = document.createElement('span');
            indicator.className = 'sort-indicator';
            th.appendChild(indicator);
        }
        if (tableSortColumn === col) {
            indicator.textContent = tableSortDirection === 'asc' ? ' ▲' : ' ▼';
        } else {
            indicator.textContent = '';
        }
    });
}

function renderSourcesTable() {
    const sourceStats = {};
    filteredData.forEach(item => {
        const src = item.source || "Unknown Source";
        if (src === "Unknown Source") return;
        sourceStats[src] = (sourceStats[src] || 0) + item.count;
    });

    let tableData = Object.entries(sourceStats).map(([source, count]) => ({
        source,
        count
    }));

    tableData.sort((a, b) => b.count - a.count);
    tableData.forEach((item, index) => {
        item.rank = index + 1;
    });

    if (tableSearchQuery !== '') {
        tableData = tableData.filter(item => item.source.toLowerCase().includes(tableSearchQuery));
    }

    tableData.sort((a, b) => {
        let valA, valB;
        if (tableSortColumn === 'rank') {
            valA = a.rank;
            valB = b.rank;
        } else if (tableSortColumn === 'source') {
            valA = a.source.toLowerCase();
            valB = b.source.toLowerCase();
        } else {
            valA = a.count;
            valB = b.count;
        }

        if (valA < valB) return tableSortDirection === 'asc' ? -1 : 1;
        if (valA > valB) return tableSortDirection === 'asc' ? 1 : -1;
        return 0;
    });

    tableBodySources.innerHTML = '';
    
    if (tableData.length === 0) {
        const row = document.createElement('tr');
        row.innerHTML = `<td colspan="3" style="text-align: center; color: var(--text-muted); padding: 20px;">Nenhum periódico encontrado</td>`;
        tableBodySources.appendChild(row);
        return;
    }

    tableData.forEach(item => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td class="cell-rank">${item.rank}</td>
            <td class="cell-source" style="cursor: pointer;" onclick="handleChartClick('source_table', {key: '${item.source.replace(/'/g, "\\'")}'})">${item.source}</td>
            <td class="cell-count">${item.count.toLocaleString('pt-BR')}</td>
        `;
        tableBodySources.appendChild(row);
    });
}

// INSTITUTIONS TABLE CARD LOGIC & RENDERING
function handleTableInstSort(column) {
    if (tableInstSortColumn === column) {
        tableInstSortDirection = tableInstSortDirection === 'asc' ? 'desc' : 'asc';
    } else {
        tableInstSortColumn = column;
        tableInstSortDirection = column === 'institution' ? 'asc' : 'desc';
    }
    updateTableInstSortIndicators();
    renderInstitutionsTable();
}

function updateTableInstSortIndicators() {
    ['rank', 'name', 'count'].forEach(col => {
        const th = document.getElementById(`th-inst-${col}`);
        if (!th) return;
        let indicator = th.querySelector('.sort-indicator');
        if (!indicator) {
            indicator = document.createElement('span');
            indicator.className = 'sort-indicator';
            th.appendChild(indicator);
        }
        if (tableInstSortColumn === (col === 'name' ? 'institution' : col)) {
            indicator.textContent = tableInstSortDirection === 'asc' ? ' ▲' : ' ▼';
        } else {
            indicator.textContent = '';
        }
    });
}

function renderInstitutionsTable() {
    const instStats = {};
    filteredData.forEach(item => {
        const inst = item.institution || "Sem instituição";
        instStats[inst] = (instStats[inst] || 0) + item.count;
    });

    let tableData = Object.entries(instStats).map(([institution, count]) => ({
        institution,
        count
    }));

    tableData.sort((a, b) => b.count - a.count);
    tableData.forEach((item, index) => {
        item.rank = index + 1;
    });

    if (tableInstSearchQuery !== '') {
        tableData = tableData.filter(item => item.institution.toLowerCase().includes(tableInstSearchQuery));
    }

    tableData.sort((a, b) => {
        let valA, valB;
        if (tableInstSortColumn === 'rank') {
            valA = a.rank;
            valB = b.rank;
        } else if (tableInstSortColumn === 'institution') {
            valA = a.institution.toLowerCase();
            valB = b.institution.toLowerCase();
        } else {
            valA = a.count;
            valB = b.count;
        }

        if (valA < valB) return tableInstSortDirection === 'asc' ? -1 : 1;
        if (valA > valB) return tableInstSortDirection === 'asc' ? 1 : -1;
        return 0;
    });

    tableBodyInstitutions.innerHTML = '';
    
    if (tableData.length === 0) {
        const row = document.createElement('tr');
        row.innerHTML = `<td colspan="3" style="text-align: center; color: var(--text-muted); padding: 20px;">Nenhuma instituição encontrada</td>`;
        tableBodyInstitutions.appendChild(row);
        return;
    }

    tableData.forEach(item => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td class="cell-rank">${item.rank}</td>
            <td class="cell-source" style="cursor: pointer;" onclick="handleChartClick('institution', {key: '${item.institution.replace(/'/g, "\\'")}'})">${item.institution}</td>
            <td class="cell-count">${item.count.toLocaleString('pt-BR')}</td>
        `;
        tableBodyInstitutions.appendChild(row);
    });
}

// PUBLICATIONS LIST TABLE RENDERING & PAGINATION (New Card)
function renderPublicationsListTable() {
    // We display individual filtered items
    publicationsListData = filteredData;

    // Sort descending by year, then by citations, then by title
    publicationsListData.sort((a, b) => {
        if (b.year !== a.year) return b.year - a.year;
        if (b.citations !== a.citations) return b.citations - a.citations;
        return (a.title || "").localeCompare(b.title || "");
    });

    // Populate rows for current page
    const startIndex = (publicationsListCurrentPage - 1) * publicationsListPageSize;
    const endIndex = Math.min(startIndex + publicationsListPageSize, publicationsListData.length);
    const currentPageData = publicationsListData.slice(startIndex, endIndex);

    tableBodyPublicationsList.innerHTML = '';

    if (publicationsListData.length === 0) {
        const row = document.createElement('tr');
        row.innerHTML = `<td colspan="6" style="text-align: center; color: var(--text-muted); padding: 20px;">Nenhuma publicação encontrada</td>`;
        tableBodyPublicationsList.appendChild(row);
        renderTablePagination(0);
        return;
    }

    currentPageData.forEach((item, index) => {
        const rank = startIndex + index + 1;
        const row = document.createElement('tr');
        
        let titleHtml = item.title || "Sem título";
        if (item.link) {
            titleHtml = `<a href="${item.link}" target="_blank" style="color: var(--text-main); font-weight: 600; text-decoration: none; border-bottom: 1px dashed var(--primary-color);">${item.title}</a>`;
        }
        
        row.innerHTML = `
            <td class="cell-rank">${rank}</td>
            <td class="cell-title">${titleHtml}</td>
            <td class="cell-author">${item.authors || "Autor Desconhecido"}</td>
            <td class="cell-source" style="cursor: pointer;" onclick="handleChartClick('source_table', {key: '${item.source.replace(/'/g, "\\'")}'})">${item.source}</td>
            <td style="cursor: pointer;" onclick="handleChartClick('temporal', {year: ${item.year}})">${item.year}</td>
            <td class="cell-count">${item.citations.toLocaleString('pt-BR')}</td>
        `;
        tableBodyPublicationsList.appendChild(row);
    });

    renderTablePagination(publicationsListData.length);
}

function renderTablePagination(totalRecords) {
    const totalPages = Math.ceil(totalRecords / publicationsListPageSize);
    tablePagination.innerHTML = '';

    if (totalPages <= 1) return;

    // Helper to add pagination link
    const addLink = (page, text, isActive = false, isDots = false) => {
        if (isDots) {
            const span = document.createElement('span');
            span.className = 'dots';
            span.textContent = '...';
            tablePagination.appendChild(span);
        } else if (isActive) {
            const span = document.createElement('span');
            span.className = 'active';
            span.textContent = text;
            tablePagination.appendChild(span);
        } else {
            const a = document.createElement('a');
            a.textContent = text;
            a.addEventListener('click', (e) => {
                e.preventDefault();
                publicationsListCurrentPage = page;
                renderPublicationsListTable();
            });
            tablePagination.appendChild(a);
        }
    };

    // Current page link layout: e.g. 1 2 3 4 5 ... 810 >>
    const pageRange = 2; // how many pages to show around current page
    
    // First Page
    if (publicationsListCurrentPage === 1) {
        addLink(1, '1', true);
    } else {
        addLink(1, '1');
    }

    // Dots or range start
    if (publicationsListCurrentPage > pageRange + 2) {
        addLink(null, null, false, true);
    }

    // Show pages around current page
    const startPage = Math.max(2, publicationsListCurrentPage - pageRange);
    const endPage = Math.min(totalPages - 1, publicationsListCurrentPage + pageRange);

    for (let i = startPage; i <= endPage; i++) {
        if (i === publicationsListCurrentPage) {
            addLink(i, i.toString(), true);
        } else {
            addLink(i, i.toString());
        }
    }

    // Dots or range end
    if (publicationsListCurrentPage < totalPages - pageRange - 1) {
        addLink(null, null, false, true);
    }

    // Last Page
    if (totalPages > 1) {
        if (publicationsListCurrentPage === totalPages) {
            addLink(totalPages, totalPages.toString(), true);
        } else {
            addLink(totalPages, totalPages.toString());
        }
    }

    // Next page angle bracket
    if (publicationsListCurrentPage < totalPages) {
        const nextA = document.createElement('a');
        nextA.innerHTML = '&raquo;';
        nextA.addEventListener('click', (e) => {
            e.preventDefault();
            publicationsListCurrentPage += 1;
            renderPublicationsListTable();
        });
        tablePagination.appendChild(nextA);
    }
}

// EXPORT TO CSV (RAW OR FORMATTED)
function exportPublicationsList(raw = true) {
    if (publicationsListData.length === 0) {
        alert("Nenhum dado para exportar!");
        return;
    }

    let csvContent = "";
    let filename = "";

    if (raw) {
        csvContent += "Rank,Title,Author,Source,Year,Citations,Link\n";
        publicationsListData.forEach((item, index) => {
            const rank = index + 1;
            const cleanTitle = (item.title || "").replace(/"/g, '""');
            const cleanAuthor = (item.authors || "").replace(/"/g, '""');
            const cleanSource = (item.source || "").replace(/"/g, '""');
            csvContent += `${rank},"${cleanTitle}","${cleanAuthor}","${cleanSource}",${item.year},${item.citations},"${item.link || ''}"\n`;
        });
        filename = "listagem_publicacoes_raw.csv";
    } else {
        csvContent += "Posição,Título do Artigo,Autor,Periódico / Fonte,Ano de Publicação,Citações,Link do Artigo\n";
        publicationsListData.forEach((item, index) => {
            const rank = index + 1;
            const cleanTitle = (item.title || "").replace(/"/g, '""');
            const cleanAuthor = (item.authors || "").replace(/"/g, '""');
            const cleanSource = (item.source || "").replace(/"/g, '""');
            csvContent += `${rank},"${cleanTitle}","${cleanAuthor}","${cleanSource}",${item.year},${item.citations},"${item.link || ''}"\n`;
        });
        filename = "listagem_publicacoes_formatada.csv";
    }

    // Create file and download
    const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], { type: 'text/csv;charset=utf-8;' }); // UTF-8 BOM for Excel compatibility
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// ─── ARTIGOS MAIS CITADOS POR AUTORAS ────────────────────────────────────────
// Renders a ranked table of articles where the first author is FEMININO,
// sorted by citations descending. Supports a local search filter.

function renderAutorasTable() {
    const tableBody = document.getElementById('table-body-autoras');
    if (!tableBody) return;

    // Filter to female-authored publications only
    let data = filteredData
        .filter(item => item.gender === 'FEMININO' && item.title)
        .sort((a, b) => b.citations - a.citations);

    // Apply local search
    if (autorasSearchQuery !== '') {
        data = data.filter(item =>
            (item.authors || '').toLowerCase().includes(autorasSearchQuery) ||
            (item.title  || '').toLowerCase().includes(autorasSearchQuery)
        );
    }

    tableBody.innerHTML = '';

    if (data.length === 0) {
        const row = document.createElement('tr');
        row.innerHTML = `<td colspan="6" style="text-align:center;color:var(--text-muted);padding:20px;">Nenhuma publicação encontrada</td>`;
        tableBody.appendChild(row);
        return;
    }

    data.slice(0, 200).forEach((item, index) => {
        const row = document.createElement('tr');

        let titleHtml = item.title || 'Sem título';
        if (item.link) {
            titleHtml = `<a href="${item.link}" target="_blank"
                style="color:var(--text-main);font-weight:600;text-decoration:none;border-bottom:1px dashed var(--primary-color);"
            >${item.title}</a>`;
        }

        const safeSrc = (item.source || '').replace(/'/g, "\\'");
        const safeAuthor = (item.authors || '').replace(/'/g, "\\'");

        row.innerHTML = `
            <td class="cell-rank">${index + 1}</td>
            <td style="font-weight:600;color:var(--primary-hover);white-space:nowrap;cursor:pointer;"
                onclick="handleChartClick('author',{key:'${safeAuthor}'})"
            >${item.authors || '—'}</td>
            <td>${titleHtml}</td>
            <td class="cell-source" style="cursor:pointer;"
                onclick="handleChartClick('source_table',{key:'${safeSrc}'})"
            >${item.source || '—'}</td>
            <td style="cursor:pointer;white-space:nowrap;"
                onclick="handleChartClick('temporal',{year:${item.year}})"
            >${item.year}</td>
            <td class="cell-count">${item.citations.toLocaleString('pt-BR')}</td>
        `;
        tableBody.appendChild(row);
    });
}

// Start app on page load
window.addEventListener('DOMContentLoaded', init);

// ─────────────────────────────────────────────────────────────────────────────
// ANÁLISE DE CITAÇÕES POR GÊNERO — com teste t de Welch
// ─────────────────────────────────────────────────────────────────────────────

function calcStats(values) {
    const n = values.length;
    if (n === 0) return { mean: 0, variance: 0, n: 0 };
    const mean = values.reduce((s, v) => s + v, 0) / n;
    const variance = n > 1
        ? values.reduce((s, v) => s + (v - mean) ** 2, 0) / (n - 1)
        : 0;
    return { mean, variance, n };
}

function welchTTest(stats1, stats2) {
    const { mean: m1, variance: v1, n: n1 } = stats1;
    const { mean: m2, variance: v2, n: n2 } = stats2;
    if (n1 < 2 || n2 < 2) return { t: 0, p: 1, df: 0 };
    const se = Math.sqrt(v1 / n1 + v2 / n2);
    if (se === 0) return { t: 0, p: 1, df: 0 };
    const t = Math.abs(m1 - m2) / se;
    const df = ((v1 / n1 + v2 / n2) ** 2) /
               ((v1 / n1) ** 2 / (n1 - 1) + (v2 / n2) ** 2 / (n2 - 1));
    function normalCDF(x) {
        const t2 = 1 / (1 + 0.2316419 * Math.abs(x));
        const poly = t2 * (0.319381530 + t2 * (-0.356563782 + t2 * (1.781477937 + t2 * (-1.821255978 + t2 * 1.330274429))));
        const phi = Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI);
        const result = phi * poly;
        return x >= 0 ? 1 - result : result;
    }
    const p = 2 * normalCDF(-t);
    return { t, p, df: Math.round(df) };
}

function renderGenderCitationsPanel() {
    const panel = document.getElementById('gender-citations-panel');
    if (!panel) return;

    const groups = { MASCULINO: [], FEMININO: [], INDEFINIDO: [] };
    filteredData.forEach(item => {
        const g = item.gender || 'INDEFINIDO';
        if (groups[g]) groups[g].push(item.citations);
        else groups['INDEFINIDO'].push(item.citations);
    });

    const statsMasc = calcStats(groups.MASCULINO);
    const statsFem  = calcStats(groups.FEMININO);
    const statsInd  = calcStats(groups.INDEFINIDO);

    if (statsMasc.n === 0 && statsFem.n === 0) {
        panel.innerHTML = '<div style="padding:24px;color:var(--text-muted);text-align:center">Sem dados de gênero no filtro atual</div>';
        return;
    }

    const test = welchTTest(statsMasc, statsFem);
    const p = test.p;

    let sigLabel, sigClass, sigDots, sigColor;
    if (p < 0.001)     { sigLabel = 'p < 0,001 — Altamente Significativa'; sigClass = 'sig-high';   sigDots = 3; sigColor = '#276749'; }
    else if (p < 0.01) { sigLabel = 'p < 0,01 — Muito Significativa';      sigClass = 'sig-high';   sigDots = 2; sigColor = '#276749'; }
    else if (p < 0.05) { sigLabel = 'p < 0,05 — Significativa';            sigClass = 'sig-medium'; sigDots = 1; sigColor = '#7b5c00'; }
    else if (p < 0.10) { sigLabel = 'p < 0,10 — Marginalmente Sign.';      sigClass = 'sig-low';    sigDots = 0; sigColor = '#c53030'; }
    else               { sigLabel = 'p > 0,10 — Não Significativa';         sigClass = 'sig-none';   sigDots = 0; sigColor = '#718096'; }

    const dotsHtml = Array.from({length:3}, (_,i) =>
        `<span class="gcb2-dot-sig" style="background:${i < sigDots ? sigColor : '#e2e8f0'}"></span>`
    ).join('');

    const pFmt  = p < 0.001 ? '< 0,001' : p.toLocaleString('pt-BR', { maximumFractionDigits: 4 });
    const tFmt  = test.t.toLocaleString('pt-BR', { maximumFractionDigits: 2 });
    const dfFmt = test.df.toLocaleString('pt-BR');

    const diff    = statsMasc.mean - statsFem.mean;
    const diffAbs = Math.abs(diff).toFixed(1);
    const diffPct = statsFem.mean > 0 ? Math.abs(diff / statsFem.mean * 100).toFixed(1) : '—';
    const diffDir = diff > 0 ? 'acima' : 'abaixo';

    const se = statsMasc.n > 1 && statsFem.n > 1
        ? Math.sqrt(statsMasc.variance / statsMasc.n + statsFem.variance / statsFem.n)
        : 0;
    const ic95lo = (diff - 1.96 * se).toFixed(1);
    const ic95hi = (diff + 1.96 * se).toFixed(1);
    const icFmt  = se > 0 ? `[${ic95lo}; ${ic95hi}]` : '—';

    const maxMean  = Math.max(statsMasc.mean, statsFem.mean, statsInd.mean, 1);
    const BR_REF   = 10;

    function barRow(label, stats, color, note) {
        if (stats.n === 0) return '';
        const barW  = Math.min((stats.mean / (maxMean * 1.15)) * 100, 100);
        const brW   = Math.min((BR_REF / (maxMean * 1.15)) * 100, 100);
        const mFmt  = stats.mean.toLocaleString('pt-BR', {minimumFractionDigits:1, maximumFractionDigits:1});
        const sdFmt = Math.sqrt(stats.variance).toLocaleString('pt-BR', {minimumFractionDigits:1, maximumFractionDigits:1});
        return `
        <div class="gcb2-row">
            <div class="gcb2-row-header">
                <span class="gcb2-color-pill" style="background:${color}"></span>
                <span class="gcb2-row-label">${label}</span>
                <span class="gcb2-row-n">${stats.n.toLocaleString('pt-BR')} publicações</span>
                ${note ? `<span class="gcb2-row-note">${note}</span>` : ''}
            </div>
            <div class="gcb2-track-wrap">
                <div class="gcb2-track">
                    <div class="gcb2-fill" style="width:${barW}%;background:${color}"></div>
                    <div class="gcb2-br-marker" style="left:${brW}%" title="Referência Brasil ~${BR_REF} cit./publ."></div>
                </div>
                <div class="gcb2-track-stats">
                    <span class="gcb2-mean-val">${mFmt}</span>
                    <span class="gcb2-mean-unit">cit./publ.</span>
                    <span class="gcb2-sd">dp ± ${sdFmt}</span>
                </div>
            </div>
        </div>`;
    }

    const interpretText = p < 0.05
        ? `A diferença de <strong>${diffAbs} citações/publicação</strong> (${diffPct}% ${diffDir} para autores masculinos) é <strong>estatisticamente significativa</strong> (p ${pFmt}). Com mais de ${Math.min(statsMasc.n, statsFem.n).toLocaleString('pt-BR')} publicações em cada grupo, o resultado dificilmente se deve ao acaso. Isso pode indicar vieses de citação por gênero, diferenças nos temas pesquisados, ou acesso desigual a redes de colaboração internacional.`
        : `A diferença de <strong>${diffAbs} citações/publicação</strong> entre os grupos <strong>não é estatisticamente significativa</strong> (p = ${pFmt}). Não há evidência robusta de disparidade de impacto por gênero com os dados atuais. Isso não descarta a existência de diferença — pode haver limitações de poder estatístico ou heterogeneidade temática.`;

    panel.innerHTML = `
    <div class="gcb2-root">
        <div class="gcb2-banner">
            <div class="gcb2-banner-item">
                <div class="gcb2-banner-val" style="color:#6092C0">${statsMasc.mean.toLocaleString('pt-BR',{minimumFractionDigits:1,maximumFractionDigits:1})}</div>
                <div class="gcb2-banner-key">cit./publ. — <strong>Masculino</strong></div>
                <div class="gcb2-banner-sub">${statsMasc.n.toLocaleString('pt-BR')} publicações</div>
            </div>
            <div class="gcb2-banner-vs">
                <div class="gcb2-banner-diff ${diff > 0 ? 'diff-pos' : 'diff-neg'}">${diff > 0 ? '+' : ''}${diffAbs}</div>
                <div class="gcb2-banner-diff-label">cit./publ. (masc. ${diffDir} das fem.)</div>
                <div class="gcb2-banner-pct">${diffPct}% de diferença relativa</div>
            </div>
            <div class="gcb2-banner-item">
                <div class="gcb2-banner-val" style="color:#D36086">${statsFem.mean.toLocaleString('pt-BR',{minimumFractionDigits:1,maximumFractionDigits:1})}</div>
                <div class="gcb2-banner-key">cit./publ. — <strong>Feminino</strong></div>
                <div class="gcb2-banner-sub">${statsFem.n.toLocaleString('pt-BR')} publicações</div>
            </div>
        </div>

        <div class="gcb2-body">
            <div class="gcb2-bars-col">
                <div class="gcb2-col-title">Média de Citações por Publicação
                    <span class="gcb2-col-sub">por gênero do(a) primeiro(a) autor(a) · dp = desvio padrão</span>
                </div>
                ${barRow('Masculino', statsMasc, '#6092C0')}
                ${barRow('Feminino', statsFem, '#D36086')}
                ${statsInd.n > 0 ? barRow('Gênero não identificado', statsInd, '#a0aec0', '⚠ inclui nomes ambíguos/estrangeiros') : ''}
                <div class="gcb2-legend">
                    <span class="gcb2-legend-marker"></span>
                    <span class="gcb2-legend-text">Marcador vertical = referência Brasil ~${BR_REF} cit./publ. em Ciências Marinhas (OpenAlex)</span>
                </div>
            </div>

            <div class="gcb2-stats-col">
                <div class="gcb2-col-title">Teste de Significância Estatística
                    <span class="gcb2-col-sub">Teste t de Welch para amostras independentes</span>
                </div>

                <div class="gcb2-sig-block ${sigClass}">
                    <div class="gcb2-sig-dots">${dotsHtml}</div>
                    <div class="gcb2-sig-label">${sigLabel}</div>
                </div>

                <div class="gcb2-metrics">
                    <div class="gcb2-metric">
                        <div class="gcb2-metric-val">${tFmt}</div>
                        <div class="gcb2-metric-name">Estatística <em>t</em> de Welch</div>
                        <div class="gcb2-metric-desc">Razão entre a diferença das médias e o erro padrão combinado. Quanto mais afastado de zero, mais expressiva é a diferença em relação à variabilidade interna dos grupos.</div>
                    </div>
                    <div class="gcb2-metric">
                        <div class="gcb2-metric-val">${pFmt}</div>
                        <div class="gcb2-metric-name">Valor-<em>p</em> (bicaudal)</div>
                        <div class="gcb2-metric-desc">Probabilidade de observar uma diferença tão grande por puro acaso. Convenção científica: p &lt; 0,05 indica resultado estatisticamente significativo.</div>
                    </div>
                    <div class="gcb2-metric">
                        <div class="gcb2-metric-val">${dfFmt}</div>
                        <div class="gcb2-metric-name">Graus de liberdade</div>
                        <div class="gcb2-metric-desc">Calculados pela fórmula de Welch-Satterthwaite, que não exige homogeneidade de variâncias — adequado quando os grupos têm dispersões distintas.</div>
                    </div>
                    <div class="gcb2-metric">
                        <div class="gcb2-metric-val gcb2-ic">${icFmt}</div>
                        <div class="gcb2-metric-name">IC 95% da diferença (masc. − fem.)</div>
                        <div class="gcb2-metric-desc">Se o intervalo não contém o zero, a diferença é significativa a 5%. Intervalo calculado com z = 1,96 (aproximação normal).</div>
                    </div>
                </div>

                <div class="gcb2-interpretation">
                    <div class="gcb2-interp-title">💡 Interpretação</div>
                    <p>${interpretText}</p>
                </div>

                <p class="gcb2-footnote">Método: teste <em>t</em> de Welch (1947) para amostras independentes com variâncias desiguais. Valor-<em>p</em> via aproximação normal padrão (válida para gl &gt; 30). Gênero inferido do primeiro nome do(a) primeiro(a) autor(a) listado(a).</p>
            </div>
        </div>
    </div>`;
}

