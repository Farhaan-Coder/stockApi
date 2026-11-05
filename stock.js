const localLogos = {
    "SBI": "sbi.png",
    "ACC": "ACC.png",
    "ITC": "ITC.png",
    "MRF": "MRF.png",
    "TCS": "TCS.png",
    "HCL": "hcl.png",
    "PSB": "PSB.png",
    "BPL": "BPL.png",
    "DLF": "DLF.png",
    "NAC": "nac.png",
    "IC8": "vodafone.png",
    "BTV": "airtel.png"
};

let cachedStockList = [];
let activeFilter = 'all';

function renderSkeletons() {
    const display = document.getElementById("display");
    if (!display || cachedStockList.length > 0) return;

    let skeletons = '';
    for (let i = 0; i < 8; i++) {
        skeletons += `
            <div class="col-sm-6 col-lg-3">
                <div class="stock-card h-100 p-3 placeholder-glow">
                    <div class="placeholder rounded w-100 mb-3" style="height: 140px;"></div>
                    <div class="placeholder col-7 mb-2"></div>
                    <div class="placeholder col-4 mb-3"></div>
                    <div class="placeholder col-8 mb-2"></div>
                    <div class="placeholder col-5"></div>
                </div>
            </div>`;
    }
    display.innerHTML = skeletons;
}

function getStocks() {
    renderSkeletons();
    const url = "http://localhost:7600/stocks";
    const url2 = "https://priceapi.moneycontrol.com/pricefeed/bse/equitycash";

    fetch(url)
        .then((res) => res.json())
        .then((stocks) => {
            const fetchPromises = stocks.map((item) => {
                return fetch(`${url2}/${item.name}`)
                    .then((res) => res.json())
                    .then((price) => ({
                        item: item,
                        price: price && price.data ? price.data : null
                    }))
                    .catch((err) => {
                        console.error(`Error fetching price for ${item.name}:`, err);
                        return { item: item, price: null };
                    });
            });

            Promise.all(fetchPromises).then((results) => {
                cachedStockList = results.filter(r => r.price !== null);
                updateTimestamp();
                updateStats(cachedStockList);
                renderStocks();
            });
        })
        .catch((err) => {
            console.error("Error fetching stock catalog:", err);
            const display = document.getElementById("display");
            if (display && cachedStockList.length === 0) {
                display.innerHTML = `
                    <div class="col-12 text-center py-5">
                        <div class="alert alert-danger d-inline-block shadow-sm">
                            <i class="bi bi-exclamation-triangle-fill me-2"></i>
                            Could not load stocks from API. Ensure json-server is running on port 7600.
                        </div>
                    </div>`;
            }
        });
}

function renderStocks() {
    const display = document.getElementById("display");
    if (!display) return;

    const searchTerm = (document.getElementById("searchInput")?.value || "").toLowerCase().trim();

    const filtered = cachedStockList.filter(({ item, price }) => {
        const companyName = (price.company || item.name || "").toLowerCase();
        const symbol = (item.name || "").toLowerCase();
        const subsec = (price.SC_SUBSEC || "").toLowerCase();
        const matchesSearch = companyName.includes(searchTerm) || symbol.includes(searchTerm) || subsec.includes(searchTerm);

        if (!matchesSearch) return false;

        const change = parseFloat(price.pricechange || 0);
        if (activeFilter === 'gainers') return change > 0;
        if (activeFilter === 'losers') return change < 0;
        return true;
    });

    // Update count badge
    const badge = document.getElementById("resultCountBadge");
    if (badge) {
        badge.innerText = `${filtered.length} Equities`;
    }

    if (filtered.length === 0) {
        display.innerHTML = `
            <div class="col-12 text-center py-5">
                <div class="text-muted">
                    <i class="bi bi-search fs-1 d-block mb-2 text-secondary"></i>
                    <h5 class="fw-bold">No stocks match your criteria</h5>
                    <p class="small">Try adjusting your search query or reset the filter.</p>
                    <button class="btn btn-outline-dark btn-sm rounded-pill mt-2" onclick="resetFilters()">Reset Filters</button>
                </div>
            </div>`;
        return;
    }

    let cardsHtml = "";
    filtered.forEach(({ item, price }) => {
        const fallback = localLogos[item.name] || `${item.name.toLowerCase()}.png`;
        const logoSrc = item.logo || fallback;

        const changeNum = parseFloat(price.pricechange || 0);
        const percentNum = parseFloat(price.pricepercentchange || 0);
        const isPositive = changeNum >= 0;

        const badgeClass = isPositive 
            ? "bg-success-subtle text-success border border-success-subtle" 
            : "bg-danger-subtle text-danger border border-danger-subtle";
        
        const arrowIcon = isPositive ? "bi-arrow-up-right" : "bi-arrow-down-right";
        const signPrefix = isPositive ? "+" : "";

        cardsHtml += `
            <div class="col-sm-6 col-lg-3">
                <div class="stock-card h-100 d-flex flex-column shadow-sm">
                    <!-- Card Header / Logo Box -->
                    <div class="logo-box position-relative">
                        <span class="position-absolute top-0 start-0 m-3 badge bg-dark bg-opacity-75 text-light fw-normal" style="font-size: 0.7rem; letter-spacing: 0.5px;">
                            ${item.name}
                        </span>
                        <span class="position-absolute top-0 end-0 m-3 badge ${badgeClass} d-flex align-items-center gap-1">
                            <i class="bi ${arrowIcon}"></i>
                            ${signPrefix}${percentNum.toFixed(2)}%
                        </span>
                        <img src="${logoSrc}" onerror="this.onerror=null;this.src='${fallback}';" alt="${price.company || item.name}" />
                    </div>

                    <!-- Card Body -->
                    <div class="card-body p-4 d-flex flex-column justify-content-between">
                        <div>
                            <div class="d-flex justify-content-between align-items-start mb-1">
                                <h6 class="fw-bold text-dark mb-0 text-truncate" title="${price.company || item.name}">
                                    ${price.company || item.name}
                                </h6>
                            </div>
                            <div class="text-muted small text-truncate mb-3" style="font-size: 0.8rem;" title="${price.SC_SUBSEC || 'Equity'}">
                                ${price.SC_SUBSEC || 'Equity'}
                            </div>

                            <!-- Live Price -->
                            <div class="mb-3">
                                <div class="text-secondary small fw-medium" style="font-size: 0.75rem;">CURRENT PRICE</div>
                                <div class="fs-4 fw-extrabold text-dark tracking-tight">
                                    ₹${price.pricecurrent || '-'}
                                </div>
                            </div>
                        </div>

                        <!-- Price Metrics Footer inside Card -->
                        <div class="pt-3 border-top mt-auto">
                            <div class="row g-2 text-center" style="font-size: 0.78rem;">
                                <div class="col-6 text-start">
                                    <span class="text-muted d-block" style="font-size: 0.7rem;">Net Change</span>
                                    <span class="fw-bold ${isPositive ? 'text-success' : 'text-danger'}">
                                        ${signPrefix}${changeNum.toFixed(2)}
                                    </span>
                                </div>
                                <div class="col-6 text-end">
                                    <span class="text-muted d-block" style="font-size: 0.7rem;">Day Range</span>
                                    <span class="text-secondary fw-semibold">
                                        ₹${price.LP || '-'} - ₹${price.HP || '-'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>`;
    });

    display.innerHTML = cardsHtml;
}

function filterStocks() {
    renderStocks();
}

function setFilter(type) {
    activeFilter = type;
    document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
    const targetBtn = document.getElementById(`filter-${type}`);
    if (targetBtn) targetBtn.classList.add('active');
    renderStocks();
}

function resetFilters() {
    const searchInput = document.getElementById("searchInput");
    if (searchInput) searchInput.value = "";
    setFilter('all');
}

function updateTimestamp() {
    const el = document.getElementById("lastUpdatedText");
    if (el) {
        const now = new Date();
        el.innerText = `Updated at ${now.toLocaleTimeString()}`;
    }
}

function updateStats(stocks) {
    const countEl = document.getElementById("statStockCount");
    if (countEl) countEl.innerText = stocks.length;
}

function manualRefresh() {
    const icon = document.getElementById("refreshIcon");
    if (icon) icon.classList.add("spin");

    getStocks();

    setTimeout(() => {
        if (icon) icon.classList.remove("spin");
    }, 900);
}
