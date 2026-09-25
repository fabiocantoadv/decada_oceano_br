// OceanVega — painel (branch "update"), reconstruído seção a seção sobre a
// coleta OpenAlex de 2018 em diante (build_dashboard.py).

// Tradução de idiomas e tipos de documento
const LANGUAGE_MAP = {
    'en': 'Inglês',
    'pt': 'Português',
    'es': 'Espanhol',
    'fr': 'Francês',
    'de': 'Alemão',
    'it': 'Italiano',
    'ru': 'Russo',
    'hu': 'Húngaro',
    'hr': 'Croata',
    'he': 'Hebraico',
    'ca': 'Catalão',
    'lv': 'Letão',
    'fi': 'Finlandês',
    'gl': 'Galego',
    'sl': 'Esloveno',
    'hi': 'Hindi',
    'sv': 'Sueco',
    'unknown': 'Não identificado'
};

// Nome do idioma por extenso; códigos fora da lista usam o nome do navegador (pt-BR)
const LANGUAGE_DISPLAY = (typeof Intl !== 'undefined' && Intl.DisplayNames)
    ? new Intl.DisplayNames(['pt-BR'], { type: 'language' }) : null;
function languageName(code) {
    if (LANGUAGE_MAP[code]) return LANGUAGE_MAP[code];
    try {
        const n = LANGUAGE_DISPLAY && LANGUAGE_DISPLAY.of(code);
        if (n && n !== code) return n.charAt(0).toUpperCase() + n.slice(1);
    } catch (e) { /* código inválido */ }
    return code.toUpperCase();
}

const TYPE_MAP = {
    'article': 'Artigo',
    'review': 'Revisão',
    'unknown': 'Desconhecido'
};

// Modelos de acesso do OpenAlex (open_access.oa_status). Todos os status exceto
// "closed" são acesso aberto. A ordem é a das colunas no gráfico.
const OA_STATUS_ORDER = ['diamond', 'gold', 'green', 'bronze', 'hybrid', 'closed'];
const OA_OPEN_STATUSES = ['diamond', 'gold', 'green', 'bronze', 'hybrid'];
const OA_STATUS_MAP = {
    'diamond': 'Diamante',
    'gold': 'Dourado',
    'green': 'Verde',
    'bronze': 'Bronze',
    'hybrid': 'Híbrido',
    'closed': 'Fechado',
    'unknown': 'Desconhecido'
};
const OA_STATUS_COLORS = {
    'diamond': '#6092C0',
    'gold': '#D6BF57',
    'green': '#54B399',
    'bronze': '#CD7F32',
    'hybrid': '#9170B8',
    'closed': '#A0AEC0',
    'unknown': '#CBD5E1'
};

// Colaboração científica: 1 país (só Brasil) vs 2 ou mais países entre os autores
const COLLAB_LABELS = {
    'nacional': 'Somente autores brasileiros',
    'internacional': 'Colaboração internacional'
};

// Objetivos de Desenvolvimento Sustentável: nomes oficiais em português e cores da ONU
const SDG_INFO = {
    1:  { name: 'Erradicação da pobreza', color: '#E5243B' },
    2:  { name: 'Fome zero e agricultura sustentável', color: '#DDA63A' },
    3:  { name: 'Saúde e bem-estar', color: '#4C9F38' },
    4:  { name: 'Educação de qualidade', color: '#C5192D' },
    5:  { name: 'Igualdade de gênero', color: '#FF3A21' },
    6:  { name: 'Água potável e saneamento', color: '#26BDE2' },
    7:  { name: 'Energia limpa e acessível', color: '#FCC30B' },
    8:  { name: 'Trabalho decente e crescimento econômico', color: '#A21942' },
    9:  { name: 'Indústria, inovação e infraestrutura', color: '#FD6925' },
    10: { name: 'Redução das desigualdades', color: '#DD1367' },
    11: { name: 'Cidades e comunidades sustentáveis', color: '#FD9D24' },
    12: { name: 'Consumo e produção responsáveis', color: '#BF8B2E' },
    13: { name: 'Ação contra a mudança global do clima', color: '#3F7E44' },
    14: { name: 'Vida na água', color: '#0A97D9' },
    15: { name: 'Vida terrestre', color: '#56C02B' },
    16: { name: 'Paz, justiça e instituições eficazes', color: '#00689D' },
    17: { name: 'Parcerias e meios de implementação', color: '#19486A' }
};
function sdgLabel(n) {
    return `ODS ${n} – ${SDG_INFO[n] ? SDG_INFO[n].name : ''}`;
}

// Limites de ano calculados a partir dos dados em init()
let YEAR_MIN = 0;
let YEAR_MAX = 0;

function defaultFilters() {
    return {
        yearMin: YEAR_MIN,
        yearMax: YEAR_MAX,
        language: 'all',
        type: 'all',
        area: 'all',
        subarea: 'all',
        institution: 'all',
        topic: 'all',
        country: 'all',
        openAccess: 'all', // 'aberto' | 'fechado'
        oaStatus: 'all',
        collab: 'all', // 'nacional' | 'internacional'
        source: 'all', // fonte exata (clique na tabela); a busca do topo é por trecho
        author: 'all', // índice do autor em dicts.authors
        sdg: 'all',    // número do ODS (1–17)
        firstGender: 'all' // gênero do 1º autor: 'F' | 'M' | 'I'
    };
}

let activeFilters = {};

// Estado global
let currentTemporalSort = 'publications'; // 'publications' ou 'year'
let showTemporalValues = false;             // checkbox "Mostrar valores"
let tableInstSearchQuery = '';
let tableInstSortColumn = 'count'; // 'rank', 'institution', 'count'
let tableInstSortDirection = 'desc';
let tableCountrySearchQuery = '';
let tableCountrySortColumn = 'count'; // 'rank', 'country', 'count'
let tableCountrySortDirection = 'desc';
let tableSourceSearchQuery = '';
let tableSourceSortColumn = 'count'; // 'rank', 'source', 'count'
let tableSourceSortDirection = 'desc';
let tableAuthorSearchQuery = '';
let tableAuthorSortColumn = 'count'; // 'rank', 'author', 'count'
let tableAuthorSortDirection = 'desc';

// Elementos do DOM
const minYearSlider = document.getElementById('filter-year-min');
const maxYearSlider = document.getElementById('filter-year-max');
const yearRangeDisplay = document.getElementById('year-range-display');
const selectLanguage = document.getElementById('filter-language');
const selectType = document.getElementById('filter-type');
const resetFiltersBtn = document.getElementById('btn-reset-filters');

const sortPublicationsBtn = document.getElementById('sort-by-publications');
const sortYearBtn = document.getElementById('sort-by-year');

const tableInstFilterInput = document.getElementById('table-inst-filter-input');
const tableInstFilterBtn = document.getElementById('table-inst-filter-btn');
const tableBodyInstitutions = document.getElementById('table-body-institutions');
const thInstRank = document.getElementById('th-inst-rank');
const thInstName = document.getElementById('th-inst-name');
const thInstCount = document.getElementById('th-inst-count');

const tableCountryFilterInput = document.getElementById('table-country-filter-input');
const tableCountryFilterBtn = document.getElementById('table-country-filter-btn');
const tableBodyCountries = document.getElementById('table-body-countries');

const tableSourceFilterInput = document.getElementById('table-source-filter-input');
const tableSourceFilterBtn = document.getElementById('table-source-filter-btn');
const tableBodySources = document.getElementById('table-body-sources');

const tableAuthorFilterInput = document.getElementById('table-author-filter-input');
const tableAuthorFilterBtn = document.getElementById('table-author-filter-btn');
const tableBodyAuthors = document.getElementById('table-body-authors');

const kpiPublications = document.getElementById('kpi-total-publications');

// Dados descompactados
let dashboardData = [];
let AUTHOR_NAMES = [];
let AUTHOR_ORCIDS = [];
let AUTHOR_GENDERS = []; // F, M ou I por autor (classificação pelo primeiro nome, IBGE)
let AUTHOR_DUP_NAMES = new Set(); // nomes usados por mais de um autor (IDs diferentes)

function decompressData() {
    if (typeof dashboardDataRaw === 'undefined') {
        console.error("dashboardDataRaw não carregado — verifique dashboard_data.js.");
        return false;
    }
    const d = dashboardDataRaw.dicts;
    AUTHOR_NAMES = d.authors;
    AUTHOR_ORCIDS = d.author_orcids;
    AUTHOR_GENDERS = d.author_genders || [];
    const seenNames = new Set();
    AUTHOR_NAMES.forEach(n => { if (seenNames.has(n)) AUTHOR_DUP_NAMES.add(n); else seenNames.add(n); });
    dashboardData = dashboardDataRaw.data.map(item => ({
        year: item[0],
        language: d.languages[item[1]],
        type: d.types[item[2]],
        area: d.areas[item[3]],
        subarea: d.subareas[item[4]],
        source: d.sources[item[5]],
        institutions: item[6].map(i => d.institutions[i]),
        topics: item[7].map(i => d.topics[i]),
        countries: item[8].map(i => d.countries[i]),
        // Colaboração: nº de países distintos dos autores (authorships.countries)
        collab: item[8].length >= 2 ? 'internacional' : 'nacional',
        oa_status: d.oa_statuses[item[9]],
        authors: item[10].filter(a => typeof a === 'number'), // só autores com ID (filtros/tabela)
        authorList: item[10],                                   // ordem da autoria, inclui autores sem ID
        title: item[11],
        wid: item[12],
        doi: item[13],
        citations: item[14],
        sdgs: item[15],
        firstGender: item[16] || 'I',
        is_oa: OA_OPEN_STATUSES.includes(d.oa_statuses[item[9]]),
        count: 1
    }));
    return true;
}

function init() {
    if (!decompressData()) return;

    const years = dashboardData.map(d => d.year).filter(Boolean);
    YEAR_MIN = Math.min(...years);
    YEAR_MAX = Math.max(...years);
    [minYearSlider, maxYearSlider].forEach(s => { s.min = YEAR_MIN; s.max = YEAR_MAX; });
    minYearSlider.value = YEAR_MIN;
    maxYearSlider.value = YEAR_MAX;
    updateYearRangeDisplay();
    activeFilters = defaultFilters();

    populateFilterOptions();
    setupEventListeners();
    setupFirstNamesTable();
    setupExpandButtons();
    updateTableInstSortIndicators();
    updateTableCountrySortIndicators();
    updateTableSourceSortIndicators();
    updateTableAuthorSortIndicators();
    updateDashboard();
}

function populateFilterOptions() {
    const languages = new Set();
    const types = new Set();
    dashboardData.forEach(item => {
        if (item.language) languages.add(item.language);
        if (item.type) types.add(item.type);
    });

    Array.from(languages).sort((a, b) => languageName(a).localeCompare(languageName(b), 'pt-BR')).forEach(lang => {
        const option = document.createElement('option');
        option.value = lang;
        option.textContent = languageName(lang);
        selectLanguage.appendChild(option);
    });

    Array.from(types).sort().forEach(type => {
        const option = document.createElement('option');
        option.value = type;
        option.textContent = TYPE_MAP[type] || type.charAt(0).toUpperCase() + type.slice(1);
        selectType.appendChild(option);
    });
}

function resetYearRange() {
    activeFilters.yearMin = YEAR_MIN;
    activeFilters.yearMax = YEAR_MAX;
    minYearSlider.value = YEAR_MIN;
    maxYearSlider.value = YEAR_MAX;
    updateYearRangeDisplay();
}

function yearFilterActive() {
    return activeFilters.yearMin > YEAR_MIN || activeFilters.yearMax < YEAR_MAX;
}

function setupEventListeners() {
    minYearSlider.addEventListener('input', () => {
        if (parseInt(minYearSlider.value) > parseInt(maxYearSlider.value)) minYearSlider.value = maxYearSlider.value;
        updateYearRangeDisplay();
        updateDashboard();
    });
    maxYearSlider.addEventListener('input', () => {
        if (parseInt(maxYearSlider.value) < parseInt(minYearSlider.value)) maxYearSlider.value = minYearSlider.value;
        updateYearRangeDisplay();
        updateDashboard();
    });

    selectLanguage.addEventListener('change', updateDashboard);
    selectType.addEventListener('change', updateDashboard);

    resetFiltersBtn.addEventListener('click', resetFilters);
    document.getElementById('btn-clear-all-filters').addEventListener('click', resetFilters);

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

    document.getElementById('toggle-temporal-values').addEventListener('change', e => {
        showTemporalValues = e.target.checked;
        renderTemporalChart();
    });

    const applyInstSearch = () => {
        tableInstSearchQuery = tableInstFilterInput.value.toLowerCase().trim();
        renderInstitutionsTable();
    };
    tableInstFilterInput.addEventListener('input', applyInstSearch);
    tableInstFilterInput.addEventListener('keydown', e => { if (e.key === 'Enter') applyInstSearch(); });
    tableInstFilterBtn.addEventListener('click', applyInstSearch);

    thInstRank.addEventListener('click', () => handleTableInstSort('rank'));
    thInstName.addEventListener('click', () => handleTableInstSort('institution'));
    thInstCount.addEventListener('click', () => handleTableInstSort('count'));

    const applyCountrySearch = () => {
        tableCountrySearchQuery = tableCountryFilterInput.value.toLowerCase().trim();
        renderCountriesTable();
    };
    tableCountryFilterInput.addEventListener('input', applyCountrySearch);
    tableCountryFilterInput.addEventListener('keydown', e => { if (e.key === 'Enter') applyCountrySearch(); });
    tableCountryFilterBtn.addEventListener('click', applyCountrySearch);
    const applyAuthorSearch = () => {
        tableAuthorSearchQuery = normalizeText(tableAuthorFilterInput.value.trim());
        renderAuthorsTable();
    };
    tableAuthorFilterInput.addEventListener('input', applyAuthorSearch);
    tableAuthorFilterInput.addEventListener('keydown', e => { if (e.key === 'Enter') applyAuthorSearch(); });
    tableAuthorFilterBtn.addEventListener('click', applyAuthorSearch);
    ['rank', 'author', 'count'].forEach(col => {
        document.getElementById(`th-author-${col}`).addEventListener('click', () => handleTableAuthorSort(col));
    });

    const applySourceSearch = () => {
        tableSourceSearchQuery = tableSourceFilterInput.value.toLowerCase().trim();
        renderSourcesTable();
    };
    tableSourceFilterInput.addEventListener('input', applySourceSearch);
    tableSourceFilterInput.addEventListener('keydown', e => { if (e.key === 'Enter') applySourceSearch(); });
    tableSourceFilterBtn.addEventListener('click', applySourceSearch);
    ['rank', 'source', 'count', 'pct'].forEach(col => {
        document.getElementById(`th-source-${col}`).addEventListener('click', () => handleTableSourceSort(col === 'pct' ? 'count' : col));
    });

    ['rank', 'country', 'count', 'pct'].forEach(col => {
        document.getElementById(`th-country-${col}`).addEventListener('click', () => handleTableCountrySort(col === 'pct' ? 'count' : col));
    });

    // Botões "Limpar Filtro" de cada gráfico
    document.getElementById('btn-clear-temporal').addEventListener('click', () => { resetYearRange(); updateDashboard(); });
    document.getElementById('btn-clear-language').addEventListener('click', () => {
        selectLanguage.value = 'all';
        updateDashboard();
    });
    document.getElementById('btn-clear-areas').addEventListener('click', () => { activeFilters.area = 'all'; updateDashboard(); });
    document.getElementById('btn-clear-subareas').addEventListener('click', () => { activeFilters.subarea = 'all'; updateDashboard(); });
    document.getElementById('btn-clear-institutions').addEventListener('click', () => { activeFilters.institution = 'all'; updateDashboard(); });
    document.getElementById('btn-clear-countries').addEventListener('click', () => { activeFilters.country = 'all'; updateDashboard(); });
    document.getElementById('btn-clear-oa-pie').addEventListener('click', () => { activeFilters.openAccess = 'all'; updateDashboard(); });
    document.getElementById('btn-clear-oa-status').addEventListener('click', () => { activeFilters.oaStatus = 'all'; updateDashboard(); });
    document.getElementById('btn-clear-collab').addEventListener('click', () => { activeFilters.collab = 'all'; updateDashboard(); });
    document.getElementById('btn-clear-first-gender').addEventListener('click', () => { activeFilters.firstGender = 'all'; updateDashboard(); });
    document.getElementById('btn-clear-sdg').addEventListener('click', () => { activeFilters.sdg = 'all'; updateDashboard(); });
    document.getElementById('btn-clear-authors').addEventListener('click', () => { activeFilters.author = 'all'; updateDashboard(); });
    document.getElementById('btn-clear-sources').addEventListener('click', () => { activeFilters.source = 'all'; updateDashboard(); });
    document.getElementById('btn-clear-topics').addEventListener('click', () => { activeFilters.topic = 'all'; updateDashboard(); });
    document.getElementById('btn-clear-type').addEventListener('click', () => { selectType.value = 'all'; updateDashboard(); });
}

function updateYearRangeDisplay() {
    yearRangeDisplay.textContent = `${minYearSlider.value} - ${maxYearSlider.value}`;
}

function resetFilters() {
    activeFilters = defaultFilters();
    resetYearRange();
    selectLanguage.value = 'all';
    selectType.value = 'all';
    tableInstFilterInput.value = '';
    tableInstSearchQuery = '';
    tableInstSortColumn = 'count';
    tableInstSortDirection = 'desc';
    updateTableInstSortIndicators();

    tableCountryFilterInput.value = '';
    tableCountrySearchQuery = '';
    tableCountrySortColumn = 'count';
    tableCountrySortDirection = 'desc';
    updateTableCountrySortIndicators();

    tableSourceFilterInput.value = '';
    tableSourceSearchQuery = '';
    tableSourceSortColumn = 'count';
    tableSourceSortDirection = 'desc';
    updateTableSourceSortIndicators();

    tableAuthorFilterInput.value = '';
    tableAuthorSearchQuery = '';
    tableAuthorSortColumn = 'count';
    tableAuthorSortDirection = 'desc';
    updateTableAuthorSortIndicators();

    updateDashboard();
}

function syncFiltersFromUI() {
    activeFilters.yearMin = parseInt(minYearSlider.value);
    activeFilters.yearMax = parseInt(maxYearSlider.value);
    activeFilters.language = selectLanguage.value;
    activeFilters.type = selectType.value;
}

let filteredData = [];

function updateDashboard() {
    syncFiltersFromUI();
    const f = activeFilters;

    filteredData = dashboardData.filter(item => {
        if (item.year < f.yearMin || item.year > f.yearMax) return false;
        if (f.language !== 'all' && item.language !== f.language) return false;
        if (f.type !== 'all' && item.type !== f.type) return false;
        if (f.area !== 'all' && item.area !== f.area) return false;
        if (f.subarea !== 'all' && item.subarea !== f.subarea) return false;
        if (f.institution !== 'all' && !item.institutions.includes(f.institution)) return false;
        if (f.topic !== 'all' && !item.topics.includes(f.topic)) return false;
        if (f.country !== 'all' && !item.countries.includes(f.country)) return false;
        if (f.openAccess !== 'all' && item.is_oa !== (f.openAccess === 'aberto')) return false;
        if (f.oaStatus !== 'all' && item.oa_status !== f.oaStatus) return false;
        if (f.collab !== 'all' && item.collab !== f.collab) return false;
        if (f.source !== 'all' && item.source !== f.source) return false;
        if (f.author !== 'all' && !item.authors.includes(f.author)) return false;
        if (f.sdg !== 'all' && !item.sdgs.includes(f.sdg)) return false;
        if (f.firstGender !== 'all' && item.firstGender !== f.firstGender) return false;
        return true;
    });

    renderActiveFiltersBar();
    updateChartClearButtonsVisibility();
    updateKPIs();

    renderTemporalChart();
    renderLanguageChart();
    renderAreasChart();
    renderSourcesTable();
    renderAuthorsTable();
    renderInstitutionsTable();
    renderCountriesTable();
    renderSubareasChart();
    renderTopicsChart();
    renderTypeChart();
    renderOAPieChart();
    renderOAStatusBarChart();
    renderCollabChart();
    renderSDGChart();
    renderAuthorGenderChart();
    renderFirstAuthorGenderChart();
    renderFirstNamesTable();
    renderPublicationsTable();
}

function updateKPIs() {
    kpiPublications.textContent = filteredData.length.toLocaleString('pt-BR');
    const ctx = document.getElementById('kpi-pub-context');
    if (ctx) {
        ctx.textContent = activeFilters.type !== 'all'
            ? (TYPE_MAP[activeFilters.type] || activeFilters.type)
            : 'artigos e revisões';
    }
}

// Barra de filtros ativos (tags estilo Kibana)
function renderActiveFiltersBar() {
    const bar = document.getElementById('active-filters-bar');
    document.getElementById('active-filters-list').innerHTML = '';
    const f = activeFilters;
    let has = false;
    const tag = (label, value, onRemove) => { createFilterTag(label, value, onRemove); has = true; };

    if (yearFilterActive()) {
        tag("Ano", `${f.yearMin} - ${f.yearMax}`, () => { resetYearRange(); updateDashboard(); });
    }
    if (f.language !== 'all') {
        tag("Idioma", languageName(f.language), () => { selectLanguage.value = 'all'; updateDashboard(); });
    }
    if (f.type !== 'all') {
        tag("Tipo", TYPE_MAP[f.type] || f.type, () => { selectType.value = 'all'; updateDashboard(); });
    }
    if (f.area !== 'all') tag("Área", f.area, () => { activeFilters.area = 'all'; updateDashboard(); });
    if (f.subarea !== 'all') tag("Subárea", f.subarea, () => { activeFilters.subarea = 'all'; updateDashboard(); });
    if (f.institution !== 'all') tag("Instituição", f.institution, () => { activeFilters.institution = 'all'; updateDashboard(); });
    if (f.country !== 'all') tag("País", f.country, () => { activeFilters.country = 'all'; updateDashboard(); });
    if (f.openAccess !== 'all') tag("Acesso", f.openAccess === 'aberto' ? 'Aberto' : 'Fechado', () => { activeFilters.openAccess = 'all'; updateDashboard(); });
    if (f.oaStatus !== 'all') tag("Modelo de acesso", OA_STATUS_MAP[f.oaStatus] || f.oaStatus, () => { activeFilters.oaStatus = 'all'; updateDashboard(); });
    if (f.firstGender !== 'all') tag("Gênero do 1º autor", GENDER_LABELS[f.firstGender], () => { activeFilters.firstGender = 'all'; updateDashboard(); });
    if (f.sdg !== 'all') tag("ODS", sdgLabel(f.sdg), () => { activeFilters.sdg = 'all'; updateDashboard(); });
    if (f.author !== 'all') tag("Autor", authorLabel(f.author), () => { activeFilters.author = 'all'; updateDashboard(); });
    if (f.source !== 'all') tag("Fonte", f.source, () => { activeFilters.source = 'all'; updateDashboard(); });
    if (f.collab !== 'all') tag("Colaboração", COLLAB_LABELS[f.collab], () => { activeFilters.collab = 'all'; updateDashboard(); });
    if (f.topic !== 'all') tag("Tópico", f.topic, () => { activeFilters.topic = 'all'; updateDashboard(); });

    bar.style.display = has ? 'flex' : 'none';
}

function updateChartClearButtonsVisibility() {
    const show = (id, on) => { document.getElementById(id).style.display = on ? 'inline-block' : 'none'; };
    show('btn-clear-temporal', yearFilterActive());
    show('btn-clear-language', activeFilters.language !== 'all');
    show('btn-clear-areas', activeFilters.area !== 'all');
    show('btn-clear-subareas', activeFilters.subarea !== 'all');
    show('btn-clear-institutions', activeFilters.institution !== 'all');
    show('btn-clear-countries', activeFilters.country !== 'all');
    show('btn-clear-oa-pie', activeFilters.openAccess !== 'all');
    show('btn-clear-oa-status', activeFilters.oaStatus !== 'all');
    show('btn-clear-first-gender', activeFilters.firstGender !== 'all');
    show('btn-clear-sdg', activeFilters.sdg !== 'all');
    show('btn-clear-authors', activeFilters.author !== 'all');
    show('btn-clear-sources', activeFilters.source !== 'all');
    show('btn-clear-collab', activeFilters.collab !== 'all');
    show('btn-clear-topics', activeFilters.topic !== 'all');
    show('btn-clear-type', activeFilters.type !== 'all');
}

function createFilterTag(label, value, onRemove) {
    const list = document.getElementById('active-filters-list');
    const tag = document.createElement('div');
    tag.className = 'filter-tag';
    const span = document.createElement('span');
    span.innerHTML = `<strong>${label}</strong>: `;
    span.appendChild(document.createTextNode(value));
    tag.appendChild(span);

    const removeBtn = document.createElement('button');
    removeBtn.className = 'remove-filter-btn';
    removeBtn.innerHTML = '&times;';
    removeBtn.addEventListener('click', onRemove);
    tag.appendChild(removeBtn);
    list.appendChild(tag);
}

// Clique nos gráficos: aplica/remove filtro (toggle)
function handleChartClick(chartType, datum) {
    if (!datum) return;
    if (chartType === 'first_gender') {
        const g = Object.keys(GENDER_LABELS).find(k => GENDER_LABELS[k] === datum.key);
        if (g) activeFilters.firstGender = activeFilters.firstGender === g ? 'all' : g;
        updateDashboard();
        return;
    }
    if (chartType === 'sdg') {
        const n = datum.sdg !== undefined ? datum.sdg : (datum.datum && datum.datum.sdg);
        if (n === undefined) return;
        activeFilters.sdg = activeFilters.sdg === n ? 'all' : n;
        updateDashboard();
        return;
    }
    if (chartType === 'author') {
        // Autor é identificado pelo índice (0 é válido), não pelo nome
        activeFilters.author = activeFilters.author === datum.index ? 'all' : datum.index;
        updateDashboard();
        return;
    }
    let keyVal = datum.key || datum.year || datum.id;
    if (!keyVal && datum.datum) keyVal = datum.datum.key || datum.datum.year || datum.datum.id;
    if (keyVal === undefined || keyVal === null) return;

    const toggle = (field) => { activeFilters[field] = activeFilters[field] === keyVal ? 'all' : keyVal; };

    if (chartType === 'temporal') {
        const val = parseInt(keyVal);
        if (activeFilters.yearMin === val && activeFilters.yearMax === val) {
            resetYearRange();
        } else {
            minYearSlider.value = val;
            maxYearSlider.value = val;
            updateYearRangeDisplay();
        }
    } else if (chartType === 'language') {
        // A rosca mostra o nome por extenso; o filtro usa o código do idioma
        const code = Object.keys(LANGUAGE_MAP).find(k => LANGUAGE_MAP[k] === keyVal)
            || Array.from(selectLanguage.options).map(o => o.value).find(v => languageName(v) === keyVal)
            || keyVal;
        selectLanguage.value = activeFilters.language === code ? 'all' : code;
    } else if (chartType === 'area') {
        toggle('area');
    } else if (chartType === 'subarea') {
        toggle('subarea');
    } else if (chartType === 'institution') {
        toggle('institution');
    } else if (chartType === 'country') {
        toggle('country');
    } else if (chartType === 'open_access') {
        const v = keyVal === 'Acesso Aberto' ? 'aberto' : 'fechado';
        activeFilters.openAccess = activeFilters.openAccess === v ? 'all' : v;
    } else if (chartType === 'oa_status') {
        const code = datum.code || (datum.datum && datum.datum.code) || keyVal;
        activeFilters.oaStatus = activeFilters.oaStatus === code ? 'all' : code;
    } else if (chartType === 'source') {
        toggle('source');
    } else if (chartType === 'collab') {
        const v = Object.keys(COLLAB_LABELS).find(k => COLLAB_LABELS[k] === keyVal);
        if (v) activeFilters.collab = activeFilters.collab === v ? 'all' : v;
    } else if (chartType === 'topic') {
        toggle('topic');
    } else if (chartType === 'type') {
        // A legenda mostra o rótulo traduzido; converte de volta para o código
        const code = Object.keys(TYPE_MAP).find(k => TYPE_MAP[k] === keyVal) || keyVal;
        selectType.value = activeFilters.type === code ? 'all' : code;
    }
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

function renderHTMLDonut(containerId, data, chartType, centerLabel = 'registros') {
    const clickable = !!chartType;
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
    const big   = isExpanded(container);
    const k     = big ? 1.7 : 1;       // escala quando o card está ampliado
    const size  = 220 * k;
    const cx    = size / 2;
    const cy    = size / 2;
    const R     = 88 * k;   // outer radius
    const r     = 54 * k;   // inner radius (hole)

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
        const color = d.color || DONUT_COLORS[idx % DONUT_COLORS.length];

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
        const fullRing = sweep >= 2 * Math.PI - 1e-6;
        const dAttr = fullRing ? [
            `M ${cx} ${cy - R}`,
            `A ${R} ${R} 0 1 1 ${cx} ${cy + R}`,
            `A ${R} ${R} 0 1 1 ${cx} ${cy - R}`,
            `M ${cx} ${cy - r}`,
            `A ${r} ${r} 0 1 0 ${cx} ${cy + r}`,
            `A ${r} ${r} 0 1 0 ${cx} ${cy - r}`,
            'Z'
        ].join(' ') : [
            `M ${x1} ${y1}`,
            `A ${R} ${R} 0 ${largeArc} 1 ${x2} ${y2}`,
            `L ${ix1} ${iy1}`,
            `A ${r} ${r} 0 ${largeArc} 0 ${ix2} ${iy2}`,
            'Z'
        ].join(' ');

        path.setAttribute('d', dAttr);
        path.setAttribute('fill', color);
        path.style.cssText = (clickable ? 'cursor:pointer;' : '') + 'transition:opacity 0.15s ease,transform 0.15s ease;transform-origin:' + cx + 'px ' + cy + 'px;';
        path.setAttribute('data-key', d.key);

        const pctStr = (d.percentage * 100).toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2});
        path.setAttribute('title', `${d.key}: ${pctStr}%`);

        // Hover: scale slice outward
        path.addEventListener('mouseenter', () => { path.style.opacity = '0.82'; path.style.transform = 'scale(1.04)'; });
        path.addEventListener('mouseleave', () => { path.style.opacity = '';     path.style.transform = ''; });

        // Click → cross-filter
        if (clickable) path.addEventListener('click', () => {
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
    labelTotal.setAttribute('y', cy - 6 * k);
    labelTotal.setAttribute('text-anchor', 'middle');
    labelTotal.setAttribute('dominant-baseline', 'middle');
    labelTotal.setAttribute('fill', '#2d3748');
    labelTotal.setAttribute('font-family', 'Inter, sans-serif');
    labelTotal.setAttribute('font-size', String(15 * k));
    labelTotal.setAttribute('font-weight', '700');
    labelTotal.textContent = totalFmt;
    centerG.appendChild(labelTotal);

    const labelSub = document.createElementNS(svgNS, 'text');
    labelSub.setAttribute('x', cx);
    labelSub.setAttribute('y', cy + 14 * k);
    labelSub.setAttribute('text-anchor', 'middle');
    labelSub.setAttribute('fill', '#a0aec0');
    labelSub.setAttribute('font-family', 'Inter, sans-serif');
    labelSub.setAttribute('font-size', String(10 * k));
    labelSub.textContent = centerLabel;
    centerG.appendChild(labelSub);

    svg.appendChild(centerG);
    wrap.appendChild(svg);

    // ── Legend Panel ─────────────────────────────────────────────────────────
    const legend = document.createElement('div');
    legend.style.cssText = 'flex:1;min-width:0;display:flex;flex-direction:column;gap:7px;' + (big ? 'max-height:none;overflow-y:visible;' : 'max-height:260px;overflow-y:auto;') + 'padding-right:4px;';
    // Scrollbar styling via CSS class
    legend.className = 'donut-legend';

    data.forEach((d, idx) => {
        const color = d.color || DONUT_COLORS[idx % DONUT_COLORS.length];
        const pct = (d.percentage * 100);
        const pctFmt = (pct > 0 && pct < 0.005) ? '<0,01' : pct.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2});

        const row = document.createElement('div');
        row.style.cssText = 'display:flex;align-items:center;gap:8px;' + (clickable ? 'cursor:pointer;' : '') + 'padding:3px 6px;border-radius:5px;transition:background 0.12s;';
        row.title = `${d.key}: ${pctFmt}% (${d.value.toLocaleString('pt-BR')} ${centerLabel})`;

        row.addEventListener('mouseenter', () => { row.style.background = '#f7fafc'; });
        row.addEventListener('mouseleave', () => { row.style.background = ''; });
        if (clickable) row.addEventListener('click', () => {
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
        nameEl.style.cssText = `font-size:${big ? 14 : 11}px;font-weight:500;color:#2d3748;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:${big ? 'none' : '160px'};display:block;`;
        nameEl.textContent = d.key;
        topLine.appendChild(nameEl);

        const pctEl = document.createElement('span');
        pctEl.style.cssText = `font-size:${big ? 14 : 11}px;font-weight:700;color:#4a5568;white-space:nowrap;flex-shrink:0;`;
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
        "height": chartHeight('chart-temporal', 260),
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
                    // Em ordem cronológica com muitos anos, mostra só um rótulo a cada 5 anos
                    "labelExpr": (isCron && chartData.length > 20) ? "(datum.value % 5 === 0) ? datum.value : ''" : "datum.value"
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

    // Números no padrão brasileiro (3.000) nos eixos, rótulos e tooltip
    spec.config.locale = { "number": { "decimal": ",", "thousands": ".", "grouping": [3] } };

    if (showTemporalValues) {
        // Barras + rótulo com o total acima de cada barra
        const barMark = spec.mark;
        delete spec.mark;
        spec.layer = [
            { "mark": barMark },
            {
                "mark": { "type": "text", "dy": -7, "fontSize": 10, "fontWeight": 600, "color": "#4a5568" },
                "encoding": { "text": { "field": "total_count", "type": "quantitative", "format": ",d" } }
            }
        ];
        // Folga no topo para o rótulo da barra mais alta não ser cortado
        const maxCount = Math.max(0, ...chartData.map(d => d.total_count));
        spec.encoding.y.scale = { "domainMax": Math.ceil(maxCount * 1.12) };
    }

    vegaEmbed('#chart-temporal', spec, { actions: false }).then(result => {
        result.view.addEventListener('click', (event, item) => {
            if (item && item.datum) handleChartClick('temporal', item.datum);
        });
    });
}

// GRÁFICO: Idioma das Publicações
function renderLanguageChart() {
    const counts = {};
    filteredData.forEach(item => {
        const lang = item.language || "unknown";
        counts[lang] = (counts[lang] || 0) + 1;
    });
    const total = filteredData.length || 1;
    const data = Object.entries(counts)
        .map(([code, value]) => ({ key: languageName(code), code, value, percentage: value / total }))
        .sort((a, b) => b.value - a.value);
    renderHTMLDonut('#chart-language', data, 'language');
}

function countBy(field) {
    const counts = {};
    filteredData.forEach(item => {
        const v = item[field] || "Outros";
        counts[v] = (counts[v] || 0) + 1;
    });
    const total = filteredData.length || 1;
    return Object.entries(counts)
        .map(([id, value]) => ({ id, value, percentage: value / total }))
        .sort((a, b) => b.value - a.value);
}

// GRÁFICO: Áreas (treemap) — campo (field) do tópico principal no OpenAlex
function renderAreasChart() {
    renderHTMLTreemap('#chart-areas', countBy('area'), 'area');
}

// GRÁFICO: Subáreas (treemap) — subárea (subfield) do tópico principal no OpenAlex, 50 maiores
function renderSubareasChart() {
    renderHTMLTreemap('#chart-subareas', countBy('subarea').slice(0, 50), 'subarea');
}

// GRÁFICO: Tópicos de Pesquisa (treemap) — todos os tópicos atribuídos pelo
// OpenAlex (até 3 por obra); cada obra conta uma vez em cada um de seus tópicos,
// então os percentuais são sobre o total de atribuições, não de obras.
function renderTopicsChart() {
    const counts = {};
    let total = 0;
    filteredData.forEach(item => {
        item.topics.forEach(t => { counts[t] = (counts[t] || 0) + 1; total++; });
    });
    const items = Object.entries(counts)
        .map(([id, value]) => ({ id, value, percentage: value / (total || 1) }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 50);
    renderHTMLTreemap('#chart-topics', items, 'topic');
}

// GRÁFICO: Tipo de Documento (pizza/rosca)
function renderTypeChart() {
    const counts = {};
    filteredData.forEach(item => {
        const label = TYPE_MAP[item.type] || item.type;
        counts[label] = (counts[label] || 0) + 1;
    });
    const total = filteredData.length || 1;
    const data = Object.entries(counts)
        .map(([key, value]) => ({ key, value, percentage: value / total }))
        .sort((a, b) => b.value - a.value);
    renderHTMLDonut('#chart-type', data, 'type');
}

// GRÁFICO: Acesso Aberto vs Fechado (rosca)
function renderOAPieChart() {
    let open = 0;
    filteredData.forEach(item => { if (item.is_oa) open++; });
    const total = filteredData.length || 1;
    const data = [
        { key: 'Acesso Aberto', value: open, color: '#54B399' },
        { key: 'Acesso Fechado', value: filteredData.length - open, color: OA_STATUS_COLORS.closed }
    ]
        .filter(d => d.value > 0)
        .map(d => ({ ...d, percentage: d.value / total }))
        .sort((a, b) => b.value - a.value);
    renderHTMLDonut('#chart-oa-pie', data, 'open_access');
}

// GRÁFICO: Modelo de Acesso (colunas) — todos os status do OpenAlex,
// incluindo "closed" (o painel anterior omitia as obras fechadas).
function renderOAStatusBarChart() {
    const counts = {};
    filteredData.forEach(item => { counts[item.oa_status] = (counts[item.oa_status] || 0) + 1; });
    const total = filteredData.length || 1;
    const order = OA_STATUS_ORDER.concat(Object.keys(counts).filter(k => !OA_STATUS_ORDER.includes(k)));
    const chartData = order.map(code => ({
        code,
        key: OA_STATUS_MAP[code] || code,
        value: counts[code] || 0,
        pct: (counts[code] || 0) / total
    }));

    const spec = {
        "$schema": "https://vega.github.io/schema/vega-lite/v5.json",
        "width": "container",
        "height": chartHeight('chart-oa-status', 260),
        "data": { "values": chartData },
        "layer": [
            {
                "mark": { "type": "bar", "cornerRadiusEnd": 3, "tooltip": true, "cursor": "pointer" },
                "encoding": {
                    "color": {
                        "field": "code", "type": "nominal", "legend": null,
                        "scale": { "domain": order, "range": order.map(c => OA_STATUS_COLORS[c] || '#CBD5E1') }
                    },
                    "opacity": activeFilters.oaStatus === 'all'
                        ? { "value": 1 }
                        : { "condition": { "test": `datum.code === '${activeFilters.oaStatus}'`, "value": 1 }, "value": 0.35 }
                }
            },
            {
                "mark": { "type": "text", "dy": -8, "fontSize": 10, "fontWeight": 600, "color": "#4a5568" },
                "encoding": {
                    "text": { "field": "pct", "type": "quantitative", "format": ".1%" }
                }
            }
        ],
        "encoding": {
            "x": {
                "field": "key", "type": "nominal", "title": null,
                "sort": order.map(c => OA_STATUS_MAP[c] || c),
                "axis": {
                    "labelAngle": 0, "labelColor": "#718096", "labelFontSize": 11,
                    "grid": false, "domainColor": "#e2e8f0", "ticks": false, "labelPadding": 8
                }
            },
            "y": {
                "field": "value", "type": "quantitative", "title": "Publicações",
                "axis": {
                    "grid": true, "gridDash": [4, 4], "gridColor": "#e8edf2", "gridOpacity": 0.8,
                    "labelColor": "#718096", "titleColor": "#4a5568", "titleFontWeight": 600,
                    "labelFontSize": 9, "titleFontSize": 10, "format": ",d",
                    "domain": false, "ticks": false, "labelPadding": 6
                }
            },
            "tooltip": [
                { "field": "key", "type": "nominal", "title": "Modelo de acesso" },
                { "field": "code", "type": "nominal", "title": "OpenAlex (oa_status)" },
                { "field": "value", "type": "quantitative", "title": "Publicações", "format": ",d" },
                { "field": "pct", "type": "quantitative", "title": "% das publicações", "format": ".1%" }
            ]
        },
        "config": {
            "background": "transparent",
            "view": { "stroke": null },
            "scale": { "bandPaddingInner": 0.3 },
            "locale": { "number": { "decimal": ",", "thousands": ".", "grouping": [3] } }
        }
    };

    vegaEmbed('#chart-oa-status', spec, { actions: false }).then(result => {
        result.view.addEventListener('click', (event, item) => {
            if (item && item.datum) handleChartClick('oa_status', item.datum);
        });
    });
}

// GRÁFICO: ODS (barras horizontais) — uma obra pode ter mais de um ODS, então
// os percentuais (sobre as obras filtradas) somam mais de 100%.
function renderSDGChart() {
    const counts = {};
    filteredData.forEach(item => {
        item.sdgs.forEach(n => { counts[n] = (counts[n] || 0) + 1; });
    });
    const total = filteredData.length || 1;
    const toDatum = n => ({
        sdg: n,
        label: sdgLabel(n),
        value: counts[n] || 0,
        pct: (counts[n] || 0) / total,
        color: SDG_INFO[n].color
    });
    // Só ODS com mais de 1% das publicações filtradas, do maior para o menor;
    // o ODS selecionado no filtro sempre aparece.
    const chartData = [...Array(17).keys()].map(i => toDatum(i + 1))
        .filter(d => d.pct > 0.01 || d.sdg === activeFilters.sdg)
        .sort((a, b) => b.value - a.value || a.sdg - b.sdg);
    const maxValue = Math.max(1, ...chartData.map(d => d.value));
    // Altura de cada barra: 24px normal; ampliado, as barras ocupam a janela (até 70px)
    const sdgEl = document.getElementById('chart-sdg');
    const sdgStep = isExpanded(sdgEl)
        ? Math.max(24, Math.min(70, Math.floor((sdgEl.clientHeight - 70) / Math.max(1, chartData.length))))
        : 24;

    const spec = {
        "$schema": "https://vega.github.io/schema/vega-lite/v5.json",
        "width": "container",
        "height": { "step": sdgStep },
        "data": { "values": chartData },
        "encoding": {
            "y": {
                "field": "label", "type": "nominal", "title": null,
                "sort": chartData.map(d => d.label),
                "axis": { "labelColor": "#4a5568", "labelFontSize": 11, "labelLimit": 320, "ticks": false, "domain": false, "labelPadding": 8 }
            },
            "x": {
                "field": "value", "type": "quantitative", "title": "Publicações",
                "scale": { "domainMax": Math.ceil(maxValue * 1.15) },
                "axis": {
                    "grid": true, "gridDash": [4, 4], "gridColor": "#e8edf2", "format": ",d", "tickCount": 8,
                    "labelColor": "#718096", "labelFontSize": 9, "titleColor": "#4a5568",
                    "titleFontWeight": 600, "titleFontSize": 10, "domain": false, "ticks": false
                }
            },
            "tooltip": [
                { "field": "label", "type": "nominal", "title": "ODS" },
                { "field": "value", "type": "quantitative", "title": "Publicações", "format": ",d" },
                { "field": "pct", "type": "quantitative", "title": "% das publicações", "format": ".1%" }
            ]
        },
        "layer": [
            {
                "mark": { "type": "bar", "cornerRadiusEnd": 3, "cursor": "pointer", "height": { "band": 0.72 } },
                "encoding": {
                    "color": { "field": "color", "type": "nominal", "scale": null, "legend": null },
                    "opacity": activeFilters.sdg === 'all'
                        ? { "value": 1 }
                        : { "condition": { "test": `datum.sdg === ${activeFilters.sdg}`, "value": 1 }, "value": 0.3 }
                }
            },
            {
                "transform": [{ "calculate": "format(datum.value, ',d') + '  (' + format(datum.pct, '.1%') + ')'", "as": "txt" }],
                "mark": { "type": "text", "align": "left", "dx": 5, "fontSize": 10, "color": "#4a5568" },
                "encoding": { "text": { "field": "txt" } }
            }
        ],
        "config": {
            "background": "transparent",
            "view": { "stroke": null },
            "locale": { "number": { "decimal": ",", "thousands": ".", "grouping": [3] } }
        }
    };

    vegaEmbed('#chart-sdg', spec, { actions: false }).then(result => {
        result.view.addEventListener('click', (event, item) => {
            if (item && item.datum) handleChartClick('sdg', item.datum);
        });
    });
}

// GRÁFICO: Gênero dos autores (rosca) — autores distintos (ID do OpenAlex) das
// publicações filtradas, pelo gênero previsto a partir do primeiro nome (IBGE).
// Só visualização: não filtra o painel.
const GENDER_LABELS = { F: 'Feminino', M: 'Masculino', I: 'Indefinido' };
const GENDER_COLORS = { F: '#9170B8', M: '#54B399', I: '#A0AEC0' };

function renderAuthorGenderChart() {
    const seenAuthors = new Set();
    filteredData.forEach(item => item.authors.forEach(a => seenAuthors.add(a)));
    const counts = { F: 0, M: 0, I: 0 };
    seenAuthors.forEach(a => { counts[AUTHOR_GENDERS[a] || 'I']++; });
    const total = seenAuthors.size || 1;
    const data = ['F', 'M', 'I']
        .map(g => ({ key: GENDER_LABELS[g], value: counts[g], color: GENDER_COLORS[g], percentage: counts[g] / total }))
        .filter(d => d.value > 0)
        .sort((a, b) => b.value - a.value);
    renderHTMLDonut('#chart-author-gender', data, null, 'autores');
}

// GRÁFICO: Gênero do primeiro autor (rosca) — uma obra por fatia, pelo gênero
// previsto do 1º autor; clicar filtra o painel.
function renderFirstAuthorGenderChart() {
    const counts = { F: 0, M: 0, I: 0 };
    filteredData.forEach(item => { counts[item.firstGender] = (counts[item.firstGender] || 0) + 1; });
    const total = filteredData.length || 1;
    const data = ['F', 'M', 'I']
        .map(g => ({ key: GENDER_LABELS[g], value: counts[g], color: GENDER_COLORS[g], percentage: counts[g] / total }))
        .filter(d => d.value > 0)
        .sort((a, b) => b.value - a.value);
    renderHTMLDonut('#chart-first-gender', data, 'first_gender', 'publicações');
}

// TABELA: Primeiros nomes por gênero (conferência da classificação) — autores
// distintos das publicações filtradas, agrupados pelo primeiro nome usado na
// classificação; mostra a proporção feminina e a frequência do nome no IBGE.
let fnTableSearch = '';
let fnTableGender = 'all';        // 'all' | 'F' | 'M' | 'I'
let fnTableSortColumn = 'count';  // 'name' | 'gender' | 'count' | 'pf' | 'freq'
let fnTableSortDirection = 'desc';
const FN_TABLE_LIMIT = 500;

function setupFirstNamesTable() {
    const input = document.getElementById('table-fn-filter-input');
    input.addEventListener('input', () => { fnTableSearch = normalizeText(input.value.trim()); renderFirstNamesTable(); });
    document.querySelectorAll('#fn-gender-toggle .toggle-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            fnTableGender = btn.dataset.gender;
            document.querySelectorAll('#fn-gender-toggle .toggle-btn').forEach(b => b.classList.toggle('active', b === btn));
            renderFirstNamesTable();
        });
    });
    ['name', 'gender', 'count', 'pf', 'freq'].forEach(col => {
        document.getElementById(`th-fn-${col}`).addEventListener('click', () => {
            if (fnTableSortColumn === col) fnTableSortDirection = fnTableSortDirection === 'asc' ? 'desc' : 'asc';
            else { fnTableSortColumn = col; fnTableSortDirection = (col === 'name' || col === 'gender') ? 'asc' : 'desc'; }
            renderFirstNamesTable();
        });
    });
}

function renderFirstNamesTable() {
    const FN = dashboardDataRaw.dicts.first_names || [];
    const AFN = dashboardDataRaw.dicts.author_first_names || [];
    const seenAuthors = new Set();
    filteredData.forEach(item => item.authors.forEach(a => seenAuthors.add(a)));
    const counts = new Map();
    seenAuthors.forEach(a => {
        const i = AFN[a];
        if (i === undefined || i < 0) return;
        counts.set(i, (counts.get(i) || 0) + 1);
    });

    let rows = Array.from(counts, ([i, count]) => {
        const [name, gender, pf, freq, motivo] = FN[i];
        return { name: name || '(nome abreviado)', gender, pf, freq, motivo, count };
    });
    const totals = { F: 0, M: 0, I: 0 };
    rows.forEach(r => { totals[r.gender] += 1; });

    if (fnTableGender !== 'all') rows = rows.filter(r => r.gender === fnTableGender);
    if (fnTableSearch) rows = rows.filter(r => normalizeText(r.name).includes(fnTableSearch));

    const dir = fnTableSortDirection === 'asc' ? 1 : -1;
    const key = { name: r => r.name, gender: r => GENDER_LABELS[r.gender], count: r => r.count,
                  pf: r => (r.pf === null ? -1 : r.pf), freq: r => r.freq }[fnTableSortColumn];
    rows.sort((a, b) => {
        const va = key(a), vb = key(b);
        const c = typeof va === 'string' ? va.localeCompare(vb, 'pt-BR') : va - vb;
        return c * dir || b.count - a.count || a.name.localeCompare(b.name, 'pt-BR');
    });

    ['name', 'gender', 'count', 'pf', 'freq'].forEach(col => {
        const ind = document.querySelector(`#th-fn-${col} .sort-indicator`);
        if (ind) ind.textContent = fnTableSortColumn === col ? (fnTableSortDirection === 'asc' ? ' ▲' : ' ▼') : '';
    });

    const nf = n => n.toLocaleString('pt-BR');
    document.getElementById('fn-table-info').textContent =
        `${nf(counts.size)} primeiros nomes distintos — Feminino: ${nf(totals.F)} · Masculino: ${nf(totals.M)} · Indefinido: ${nf(totals.I)}` +
        (rows.length > FN_TABLE_LIMIT ? ` (mostrando ${nf(FN_TABLE_LIMIT)} de ${nf(rows.length)}; use a busca)` : '');

    const tbody = document.getElementById('table-body-first-names');
    tbody.innerHTML = '';
    if (rows.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:var(--text-muted);padding:20px;">Nenhum nome encontrado</td></tr>';
        return;
    }
    rows.slice(0, FN_TABLE_LIMIT).forEach((r, idx) => {
        const tr = document.createElement('tr');
        const cells = [
            ['cell-rank', String(idx + 1)],
            ['cell-fn-name', r.name],
            ['', GENDER_LABELS[r.gender]],
            ['cell-count', nf(r.count)],
            ['cell-count', r.pf === null ? '—' : (r.pf * 100).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + '%'],
            ['cell-count', r.freq ? nf(r.freq) : '—'],
            ['cell-fn-note', r.gender === 'I' ? r.motivo : '']
        ];
        cells.forEach(([cls, text], ci) => {
            const td = document.createElement('td');
            if (cls) td.className = cls;
            if (ci === 2) {
                const dot = document.createElement('span');
                dot.className = 'gender-dot';
                dot.style.background = GENDER_COLORS[r.gender];
                td.appendChild(dot);
                td.appendChild(document.createTextNode(text));
            } else {
                td.textContent = text;
            }
            tr.appendChild(td);
        });
        tbody.appendChild(tr);
    });
}

// GRÁFICO: Colaboração científica (rosca)
function renderCollabChart() {
    let intl = 0;
    filteredData.forEach(item => { if (item.collab === 'internacional') intl++; });
    const total = filteredData.length || 1;
    const data = [
        { key: COLLAB_LABELS.nacional, value: filteredData.length - intl, color: '#54B399' },
        { key: COLLAB_LABELS.internacional, value: intl, color: '#6092C0' }
    ]
        .filter(d => d.value > 0)
        .map(d => ({ ...d, percentage: d.value / total }))
        .sort((a, b) => b.value - a.value);
    renderHTMLDonut('#chart-collab', data, 'collab');
}

// TABELA: Listagem das publicações — ordenada por citações (não exibidas),
// depois ano (mais recente) e título; 10 por página.
const PUBS_PAGE_SIZE = 10;
const PUBS_MAX_AUTHORS = 3;
let pubsCurrentPage = 1;
let pubsSorted = [];

function authorName(a) {
    return typeof a === 'number' ? AUTHOR_NAMES[a] : a;
}

function renderPublicationsTable(resetPage = true) {
    if (resetPage) {
        pubsCurrentPage = 1;
        pubsSorted = filteredData.slice().sort((a, b) =>
            (b.citations - a.citations) || (b.year - a.year) || a.title.localeCompare(b.title));
    }

    const tbody = document.getElementById('table-body-publications');
    tbody.innerHTML = '';

    const total = pubsSorted.length;
    const totalPages = Math.max(1, Math.ceil(total / PUBS_PAGE_SIZE));
    pubsCurrentPage = Math.min(Math.max(1, pubsCurrentPage), totalPages);
    const start = (pubsCurrentPage - 1) * PUBS_PAGE_SIZE;
    const pageItems = pubsSorted.slice(start, start + PUBS_PAGE_SIZE);

    const info = document.getElementById('publications-count-info');
    info.textContent = total === 0
        ? 'Nenhuma publicação'
        : `${(start + 1).toLocaleString('pt-BR')}–${(start + pageItems.length).toLocaleString('pt-BR')} de ${total.toLocaleString('pt-BR')} publicações`;

    if (total === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--text-muted); padding: 20px;">Nenhuma publicação encontrada</td></tr>`;
        renderPublicationsPagination(0);
        return;
    }

    pageItems.forEach(item => {
        const row = document.createElement('tr');

        // Título -> página do work no OpenAlex
        const tdTitle = document.createElement('td');
        tdTitle.className = 'cell-pub-title';
        const a = document.createElement('a');
        a.href = `https://openalex.org/works/${item.wid}`;
        a.target = '_blank';
        a.rel = 'noopener';
        a.textContent = item.title || 'Sem título';
        a.title = 'Abrir no OpenAlex';
        tdTitle.appendChild(a);

        // Autores: os 3 primeiros + "et al."; lista completa no tooltip
        const tdAuthors = document.createElement('td');
        tdAuthors.className = 'cell-pub-authors';
        const names = item.authorList.map(authorName).filter(Boolean);
        tdAuthors.textContent = names.length === 0
            ? '—'
            : names.slice(0, PUBS_MAX_AUTHORS).join('; ') + (names.length > PUBS_MAX_AUTHORS ? ' et al.' : '');
        if (names.length > PUBS_MAX_AUTHORS) {
            tdAuthors.title = `${names.length} autores: ` + names.slice(0, 50).join('; ') + (names.length > 50 ? '; …' : '');
        }

        const tdSource = document.createElement('td');
        tdSource.className = 'cell-pub-source';
        tdSource.textContent = item.source;

        const tdYear = document.createElement('td');
        tdYear.className = 'cell-pub-year';
        tdYear.textContent = item.year;

        // DOI com link
        const tdDoi = document.createElement('td');
        tdDoi.className = 'cell-pub-doi';
        if (item.doi) {
            const d = document.createElement('a');
            d.href = `https://doi.org/${item.doi}`;
            d.target = '_blank';
            d.rel = 'noopener';
            d.textContent = item.doi;
            tdDoi.appendChild(d);
        } else {
            tdDoi.textContent = '—';
        }

        row.append(tdTitle, tdAuthors, tdSource, tdYear, tdDoi);
        tbody.appendChild(row);
    });

    renderPublicationsPagination(totalPages);
}

function goToPublicationsPage(page) {
    pubsCurrentPage = page;
    renderPublicationsTable(false);
}

function renderPublicationsPagination(totalPages) {
    const nav = document.getElementById('publications-pagination');
    nav.innerHTML = '';
    if (totalPages <= 1) return;

    const cur = pubsCurrentPage;
    const add = (label, page, { active = false, disabled = false, dots = false } = {}) => {
        if (dots) {
            const s = document.createElement('span');
            s.className = 'dots';
            s.textContent = '…';
            nav.appendChild(s);
            return;
        }
        if (active || disabled) {
            const s = document.createElement('span');
            s.className = active ? 'active' : 'disabled';
            s.innerHTML = label;
            nav.appendChild(s);
            return;
        }
        const a = document.createElement('a');
        a.innerHTML = label;
        a.addEventListener('click', e => { e.preventDefault(); goToPublicationsPage(page); });
        nav.appendChild(a);
    };

    add('&laquo;', cur - 1, { disabled: cur === 1 });
    const range = 2;
    add('1', 1, { active: cur === 1 });
    if (cur > range + 2) add(null, null, { dots: true });
    for (let i = Math.max(2, cur - range); i <= Math.min(totalPages - 1, cur + range); i++) {
        add(i.toLocaleString('pt-BR'), i, { active: i === cur });
    }
    if (cur < totalPages - range - 1) add(null, null, { dots: true });
    add(totalPages.toLocaleString('pt-BR'), totalPages, { active: cur === totalPages });
    add('&raquo;', cur + 1, { disabled: cur === totalPages });
}

// TABELA: Autores — cada obra conta uma vez para cada autor (ID do OpenAlex)
function normalizeText(t) {
    return t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

function authorLabel(i) {
    const name = AUTHOR_NAMES[i];
    return AUTHOR_DUP_NAMES.has(name) && AUTHOR_ORCIDS[i] ? `${name} (ORCID ${AUTHOR_ORCIDS[i]})` : name;
}

function handleTableAuthorSort(column) {
    if (tableAuthorSortColumn === column) {
        tableAuthorSortDirection = tableAuthorSortDirection === 'asc' ? 'desc' : 'asc';
    } else {
        tableAuthorSortColumn = column;
        tableAuthorSortDirection = column === 'author' ? 'asc' : 'desc';
    }
    updateTableAuthorSortIndicators();
    renderAuthorsTable();
}

function updateTableAuthorSortIndicators() {
    ['rank', 'author', 'count'].forEach(col => {
        const th = document.getElementById(`th-author-${col}`);
        if (!th) return;
        let indicator = th.querySelector('.sort-indicator');
        if (!indicator) {
            indicator = document.createElement('span');
            indicator.className = 'sort-indicator';
            th.appendChild(indicator);
        }
        indicator.textContent = tableAuthorSortColumn === col
            ? (tableAuthorSortDirection === 'asc' ? ' ▲' : ' ▼')
            : '';
    });
}

const AUTHOR_TABLE_LIMIT = 500;

function renderAuthorsTable() {
    const stats = new Map();
    filteredData.forEach(item => {
        item.authors.forEach(a => stats.set(a, (stats.get(a) || 0) + 1));
    });

    // Ranking: mais publicações primeiro; empates em ordem alfabética
    let tableData = Array.from(stats, ([index, count]) => ({ index, count }))
        .sort((a, b) => b.count - a.count || AUTHOR_NAMES[a.index].localeCompare(AUTHOR_NAMES[b.index], 'pt-BR'));
    tableData.forEach((item, i) => { item.rank = i + 1; });

    if (tableAuthorSearchQuery !== '') {
        tableData = tableData.filter(item => normalizeText(AUTHOR_NAMES[item.index]).includes(tableAuthorSearchQuery));
    }

    if (tableAuthorSortColumn !== 'count' || tableAuthorSortDirection !== 'desc') {
        tableData.sort((a, b) => {
            if (tableAuthorSortColumn === 'author') {
                const cmp = AUTHOR_NAMES[a.index].localeCompare(AUTHOR_NAMES[b.index], 'pt-BR');
                return tableAuthorSortDirection === 'asc' ? cmp : -cmp;
            }
            const key = tableAuthorSortColumn === 'rank' ? 'rank' : 'count';
            const diff = a[key] - b[key];
            return tableAuthorSortDirection === 'asc' ? diff : -diff;
        });
    }

    tableBodyAuthors.innerHTML = '';
    if (tableData.length === 0) {
        tableBodyAuthors.innerHTML = `<tr><td colspan="3" style="text-align: center; color: var(--text-muted); padding: 20px;">Nenhum autor encontrado</td></tr>`;
        return;
    }

    // Limita as linhas renderizadas (são dezenas de milhares de autores); a busca alcança todos.
    tableData.slice(0, AUTHOR_TABLE_LIMIT).forEach(item => {
        const row = document.createElement('tr');

        const tdRank = document.createElement('td');
        tdRank.className = 'cell-rank';
        tdRank.textContent = item.rank;

        const tdName = document.createElement('td');
        tdName.className = 'cell-source';
        tdName.style.cursor = 'pointer';
        tdName.textContent = AUTHOR_NAMES[item.index];
        const orcid = AUTHOR_ORCIDS[item.index];
        if (orcid) {
            // ORCID com link para o perfil (não aciona o filtro do painel)
            const link = document.createElement('a');
            link.href = `https://orcid.org/${orcid}`;
            link.target = '_blank';
            link.rel = 'noopener';
            link.className = 'orcid-link';
            link.title = 'Abrir perfil ORCID';
            link.textContent = orcid;
            link.addEventListener('click', e => e.stopPropagation());
            tdName.appendChild(link);
        }
        tdName.addEventListener('click', () => handleChartClick('author', { index: item.index }));

        const tdCount = document.createElement('td');
        tdCount.className = 'cell-count';
        tdCount.textContent = item.count.toLocaleString('pt-BR');

        row.append(tdRank, tdName, tdCount);
        tableBodyAuthors.appendChild(row);
    });
}

// TABELA: Fontes — fonte da localização principal da obra
// (primary_location.source): periódico, repositório etc.
function handleTableSourceSort(column) {
    if (tableSourceSortColumn === column) {
        tableSourceSortDirection = tableSourceSortDirection === 'asc' ? 'desc' : 'asc';
    } else {
        tableSourceSortColumn = column;
        tableSourceSortDirection = column === 'source' ? 'asc' : 'desc';
    }
    updateTableSourceSortIndicators();
    renderSourcesTable();
}

function updateTableSourceSortIndicators() {
    ['rank', 'source', 'count'].forEach(col => {
        const th = document.getElementById(`th-source-${col}`);
        if (!th) return;
        let indicator = th.querySelector('.sort-indicator');
        if (!indicator) {
            indicator = document.createElement('span');
            indicator.className = 'sort-indicator';
            th.appendChild(indicator);
        }
        indicator.textContent = tableSourceSortColumn === col
            ? (tableSourceSortDirection === 'asc' ? ' ▲' : ' ▼')
            : '';
    });
}

const SOURCE_TABLE_LIMIT = 500;

function renderSourcesTable() {
    const stats = {};
    filteredData.forEach(item => { stats[item.source] = (stats[item.source] || 0) + 1; });
    const totalWorks = filteredData.length || 1;

    let tableData = Object.entries(stats)
        .map(([source, count]) => ({ source, count, pct: count / totalWorks }))
        .sort((a, b) => b.count - a.count);
    tableData.forEach((item, i) => { item.rank = i + 1; });

    if (tableSourceSearchQuery !== '') {
        tableData = tableData.filter(item => item.source.toLowerCase().includes(tableSourceSearchQuery));
    }

    tableData.sort((a, b) => {
        let valA, valB;
        if (tableSourceSortColumn === 'rank') { valA = a.rank; valB = b.rank; }
        else if (tableSourceSortColumn === 'source') { valA = a.source.toLowerCase(); valB = b.source.toLowerCase(); }
        else { valA = a.count; valB = b.count; }
        if (valA < valB) return tableSourceSortDirection === 'asc' ? -1 : 1;
        if (valA > valB) return tableSourceSortDirection === 'asc' ? 1 : -1;
        return 0;
    });

    tableBodySources.innerHTML = '';
    if (tableData.length === 0) {
        tableBodySources.innerHTML = `<tr><td colspan="4" style="text-align: center; color: var(--text-muted); padding: 20px;">Nenhuma fonte encontrada</td></tr>`;
        return;
    }

    // Limita as linhas renderizadas (são milhares de fontes); a busca alcança todas.
    tableData.slice(0, SOURCE_TABLE_LIMIT).forEach(item => {
        const row = document.createElement('tr');

        const tdRank = document.createElement('td');
        tdRank.className = 'cell-rank';
        tdRank.textContent = item.rank;

        const tdName = document.createElement('td');
        tdName.className = 'cell-source';
        tdName.style.cursor = 'pointer';
        tdName.textContent = item.source;
        tdName.addEventListener('click', () => handleChartClick('source', { key: item.source }));

        const tdCount = document.createElement('td');
        tdCount.className = 'cell-count';
        tdCount.textContent = item.count.toLocaleString('pt-BR');

        const tdPct = document.createElement('td');
        tdPct.className = 'cell-count';
        const pct = item.pct * 100;
        tdPct.textContent = pct > 0 && pct < 0.1
            ? '<0,1%'
            : pct.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + '%';

        row.append(tdRank, tdName, tdCount, tdPct);
        tableBodySources.appendChild(row);
    });
}

// TABELA: Instituições — cada obra conta uma vez para cada instituição
// distinta entre seus autores (contagem integral).
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
        indicator.textContent = tableInstSortColumn === (col === 'name' ? 'institution' : col)
            ? (tableInstSortDirection === 'asc' ? ' ▲' : ' ▼')
            : '';
    });
}

const INST_TABLE_LIMIT = 500;

function renderInstitutionsTable() {
    const stats = {};
    filteredData.forEach(item => {
        item.institutions.forEach(inst => { stats[inst] = (stats[inst] || 0) + 1; });
    });

    let tableData = Object.entries(stats)
        .map(([institution, count]) => ({ institution, count }))
        .sort((a, b) => b.count - a.count);
    tableData.forEach((item, i) => { item.rank = i + 1; });

    if (tableInstSearchQuery !== '') {
        tableData = tableData.filter(item => item.institution.toLowerCase().includes(tableInstSearchQuery));
    }

    tableData.sort((a, b) => {
        let valA, valB;
        if (tableInstSortColumn === 'rank') { valA = a.rank; valB = b.rank; }
        else if (tableInstSortColumn === 'institution') { valA = a.institution.toLowerCase(); valB = b.institution.toLowerCase(); }
        else { valA = a.count; valB = b.count; }
        if (valA < valB) return tableInstSortDirection === 'asc' ? -1 : 1;
        if (valA > valB) return tableInstSortDirection === 'asc' ? 1 : -1;
        return 0;
    });

    tableBodyInstitutions.innerHTML = '';
    if (tableData.length === 0) {
        tableBodyInstitutions.innerHTML = `<tr><td colspan="3" style="text-align: center; color: var(--text-muted); padding: 20px;">Nenhuma instituição encontrada</td></tr>`;
        return;
    }

    // Limita as linhas renderizadas (são milhares de instituições); a busca alcança todas.
    tableData.slice(0, INST_TABLE_LIMIT).forEach(item => {
        const row = document.createElement('tr');

        const tdRank = document.createElement('td');
        tdRank.className = 'cell-rank';
        tdRank.textContent = item.rank;

        const tdName = document.createElement('td');
        tdName.className = 'cell-source';
        tdName.style.cursor = 'pointer';
        tdName.textContent = item.institution;
        tdName.addEventListener('click', () => handleChartClick('institution', { key: item.institution }));

        const tdCount = document.createElement('td');
        tdCount.className = 'cell-count';
        tdCount.textContent = item.count.toLocaleString('pt-BR');

        row.append(tdRank, tdName, tdCount);
        tableBodyInstitutions.appendChild(row);
    });
}

// TABELA: Países — no formato do OpenAlex (authorships.countries): cada obra
// conta uma vez para cada país distinto de seus autores; o percentual é sobre o
// total de obras filtradas. Brasil = 100% por ser critério da coleta.
function handleTableCountrySort(column) {
    if (tableCountrySortColumn === column) {
        tableCountrySortDirection = tableCountrySortDirection === 'asc' ? 'desc' : 'asc';
    } else {
        tableCountrySortColumn = column;
        tableCountrySortDirection = column === 'country' ? 'asc' : 'desc';
    }
    updateTableCountrySortIndicators();
    renderCountriesTable();
}

function updateTableCountrySortIndicators() {
    ['rank', 'country', 'count'].forEach(col => {
        const th = document.getElementById(`th-country-${col}`);
        if (!th) return;
        let indicator = th.querySelector('.sort-indicator');
        if (!indicator) {
            indicator = document.createElement('span');
            indicator.className = 'sort-indicator';
            th.appendChild(indicator);
        }
        indicator.textContent = tableCountrySortColumn === col
            ? (tableCountrySortDirection === 'asc' ? ' ▲' : ' ▼')
            : '';
    });
}

function renderCountriesTable() {
    const stats = {};
    filteredData.forEach(item => {
        item.countries.forEach(c => { stats[c] = (stats[c] || 0) + 1; });
    });
    const totalWorks = filteredData.length || 1;

    let tableData = Object.entries(stats)
        .map(([country, count]) => ({ country, count, pct: count / totalWorks }))
        .sort((a, b) => b.count - a.count);
    tableData.forEach((item, i) => { item.rank = i + 1; });

    if (tableCountrySearchQuery !== '') {
        tableData = tableData.filter(item => item.country.toLowerCase().includes(tableCountrySearchQuery));
    }

    tableData.sort((a, b) => {
        let valA, valB;
        if (tableCountrySortColumn === 'rank') { valA = a.rank; valB = b.rank; }
        else if (tableCountrySortColumn === 'country') { valA = a.country.toLowerCase(); valB = b.country.toLowerCase(); }
        else { valA = a.count; valB = b.count; }
        if (valA < valB) return tableCountrySortDirection === 'asc' ? -1 : 1;
        if (valA > valB) return tableCountrySortDirection === 'asc' ? 1 : -1;
        return 0;
    });

    tableBodyCountries.innerHTML = '';
    if (tableData.length === 0) {
        tableBodyCountries.innerHTML = `<tr><td colspan="4" style="text-align: center; color: var(--text-muted); padding: 20px;">Nenhum país encontrado</td></tr>`;
        return;
    }

    tableData.forEach(item => {
        const row = document.createElement('tr');

        const tdRank = document.createElement('td');
        tdRank.className = 'cell-rank';
        tdRank.textContent = item.rank;

        const tdName = document.createElement('td');
        tdName.className = 'cell-source';
        tdName.style.cursor = 'pointer';
        tdName.textContent = item.country;
        tdName.addEventListener('click', () => handleChartClick('country', { key: item.country }));

        const tdCount = document.createElement('td');
        tdCount.className = 'cell-count';
        tdCount.textContent = item.count.toLocaleString('pt-BR');

        const tdPct = document.createElement('td');
        tdPct.className = 'cell-count';
        const pct = item.pct * 100;
        tdPct.textContent = pct > 0 && pct < 0.1
            ? '<0,1%'
            : pct.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + '%';

        row.append(tdRank, tdName, tdCount, tdPct);
        tableBodyCountries.appendChild(row);
    });
}

// ─── AMPLIAR GRÁFICOS E TABELAS ──────────────────────────────────────────────
// Cada card ganha um botão que o abre numa janela sobreposta maior. O próprio
// card é movido para a janela (filtros, ordenação e buscas continuam valendo) e
// volta ao lugar ao fechar. Os gráficos são redesenhados no novo tamanho.

const EXPAND_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>';
const COLLAPSE_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';

// Redesenho de cada gráfico pelo id do seu container (tabelas só mudam de tamanho)
const CARD_RENDERERS = {
    'chart-temporal': () => renderTemporalChart(),
    'chart-language': () => renderLanguageChart(),
    'chart-type': () => renderTypeChart(),
    'chart-collab': () => renderCollabChart(),
    'chart-author-gender': () => renderAuthorGenderChart(),
    'chart-first-gender': () => renderFirstAuthorGenderChart(),
    'chart-oa-pie': () => renderOAPieChart(),
    'chart-oa-status': () => renderOAStatusBarChart(),
    'chart-sdg': () => renderSDGChart(),
    'chart-areas': () => renderAreasChart(),
    'chart-subareas': () => renderSubareasChart(),
    'chart-topics': () => renderTopicsChart()
};

let expandedCard = null;
let expandPlaceholder = null;

function isExpanded(el) {
    const node = typeof el === 'string' ? document.querySelector(el) : el;
    return !!(node && node.closest('.chart-modal'));
}

// Altura útil de um gráfico Vega: maior quando o card está ampliado
function chartHeight(containerId, normalHeight) {
    const el = document.getElementById(containerId);
    if (!el || !isExpanded(el)) return normalHeight;
    return Math.max(normalHeight, el.clientHeight - 90);
}

function rerenderCard(card) {
    Object.keys(CARD_RENDERERS).forEach(id => {
        if (card.querySelector('#' + id)) CARD_RENDERERS[id]();
    });
}

function setupExpandButtons() {
    const overlay = document.createElement('div');
    overlay.className = 'chart-modal-overlay';
    overlay.innerHTML = '<div class="chart-modal" role="dialog" aria-modal="true"></div>';
    overlay.addEventListener('click', e => { if (e.target === overlay) closeExpandedCard(); });
    document.body.appendChild(overlay);

    document.addEventListener('keydown', e => {
        if (e.key === 'Escape' && expandedCard) closeExpandedCard();
    });

    let resizeTimer = null;
    window.addEventListener('resize', () => {
        if (!expandedCard) return;
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => rerenderCard(expandedCard), 150);
    });

    document.querySelectorAll('.dashboard-grid > .chart-card').forEach(card => {
        const header = card.querySelector('.chart-header');
        if (!header) return;
        let actions = header.querySelector('.chart-actions');
        if (!actions) {
            actions = document.createElement('div');
            actions.className = 'chart-actions';
            header.appendChild(actions);
        }
        const title = (header.querySelector('h2') || {}).textContent || 'gráfico';
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'chart-expand-btn';
        btn.innerHTML = EXPAND_ICON;
        btn.title = 'Ampliar';
        btn.setAttribute('aria-label', `Ampliar: ${title}`);
        btn.addEventListener('click', () => {
            if (expandedCard === card) closeExpandedCard();
            else openExpandedCard(card);
        });
        actions.appendChild(btn);
    });
}

function openExpandedCard(card) {
    if (expandedCard) closeExpandedCard();
    const overlay = document.querySelector('.chart-modal-overlay');
    const modal = overlay.querySelector('.chart-modal');

    // Reserva o espaço do card na grade para o painel não "pular"
    expandPlaceholder = document.createElement('div');
    expandPlaceholder.className = card.className + ' chart-card-placeholder';
    expandPlaceholder.style.height = card.offsetHeight + 'px';
    card.parentNode.insertBefore(expandPlaceholder, card);

    modal.setAttribute('aria-label', (card.querySelector('h2') || {}).textContent || '');
    modal.appendChild(card);
    card.classList.add('is-expanded');
    overlay.classList.add('open');
    document.body.classList.add('modal-open');
    expandedCard = card;

    const btn = card.querySelector('.chart-expand-btn');
    btn.innerHTML = COLLAPSE_ICON;
    btn.title = 'Fechar (Esc)';
    btn.focus();

    requestAnimationFrame(() => rerenderCard(card));
}

function closeExpandedCard() {
    if (!expandedCard) return;
    const card = expandedCard;
    const overlay = document.querySelector('.chart-modal-overlay');

    card.classList.remove('is-expanded');
    expandPlaceholder.parentNode.insertBefore(card, expandPlaceholder);
    expandPlaceholder.remove();
    expandPlaceholder = null;
    overlay.classList.remove('open');
    document.body.classList.remove('modal-open');
    expandedCard = null;

    const btn = card.querySelector('.chart-expand-btn');
    btn.innerHTML = EXPAND_ICON;
    btn.title = 'Ampliar';
    btn.focus();

    requestAnimationFrame(() => rerenderCard(card));
}

window.addEventListener('DOMContentLoaded', init);
