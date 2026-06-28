// BigQuery Release Explorer Frontend Logic

document.addEventListener('DOMContentLoaded', () => {
    // State Variables
    let allReleases = [];
    let filteredReleases = [];
    let currentFilterType = 'all';
    let currentSearchQuery = '';
    let currentTimeFilter = 'all';

    // DOM Elements
    const feedContainer = document.getElementById('feed-container');
    const searchInput = document.getElementById('search-input');
    const clearSearchBtn = document.getElementById('clear-search');
    const timeFilterSelect = document.getElementById('time-filter');
    const refreshBtn = document.getElementById('refresh-btn');
    const exportCsvBtn = document.getElementById('export-csv-btn');
    const cacheTimeEl = document.getElementById('cache-time');
    const resultsCountEl = document.getElementById('results-count');
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toast-message');

    // Stat Elements
    const statTotal = document.getElementById('stat-total');
    const statFeatures = document.getElementById('stat-features');
    const statBreaking = document.getElementById('stat-breaking');
    const statChanges = document.getElementById('stat-changes');
    const statCards = document.querySelectorAll('.stat-card');

    // Initialize Application
    fetchReleases();
    setupEventListeners();

    // Event Listeners Setup
    function setupEventListeners() {
        // Search Input
        searchInput.addEventListener('input', (e) => {
            currentSearchQuery = e.target.value.toLowerCase().stripHtml().trim();
            toggleClearSearchButton();
            filterAndRender();
        });

        // Clear Search Button
        clearSearchBtn.addEventListener('click', () => {
            searchInput.value = '';
            currentSearchQuery = '';
            toggleClearSearchButton();
            searchInput.focus();
            filterAndRender();
        });

        // Type Filter Buttons (Sidebar)
        const filterBtns = document.querySelectorAll('.filter-btn');
        filterBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                filterBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                currentFilterType = btn.getAttribute('data-type');
                filterAndRender();
            });
        });

        // Time Period Filter
        timeFilterSelect.addEventListener('change', (e) => {
            currentTimeFilter = e.target.value;
            filterAndRender();
        });

        // Stat Card Click Filters
        statCards.forEach(card => {
            card.addEventListener('click', () => {
                const type = card.getAttribute('data-type');
                // Deactivate all sidebar filter buttons first
                filterBtns.forEach(b => b.classList.remove('active'));
                
                if (type === 'all') {
                    currentFilterType = 'all';
                    document.querySelector('.filter-btn[data-type="all"]').classList.add('active');
                } else if (type === 'feature') {
                    currentFilterType = 'Feature';
                    document.querySelector('.filter-btn[data-type="Feature"]').classList.add('active');
                } else if (type === 'breaking') {
                    currentFilterType = 'Breaking'; // In our feed, let's also match Issue
                    document.querySelector('.filter-btn[data-type="Breaking"]').classList.add('active');
                } else if (type === 'change') {
                    currentFilterType = 'Change';
                    document.querySelector('.filter-btn[data-type="Change"]').classList.add('active');
                }
                filterAndRender();
            });
        });

        // Force Refresh Button
        refreshBtn.addEventListener('click', () => {
            fetchReleases(true);
        });

        // Export to CSV Button
        exportCsvBtn.addEventListener('click', () => {
            exportToCSV(filteredReleases);
        });
    }

    // Helper: Simple HTML strip for clean string match
    String.prototype.stripHtml = function() {
        return this.replace(/<[^>]*>?/gm, '');
    };

    // Toggle Clear Search Button Visibility
    function toggleClearSearchButton() {
        if (searchInput.value.length > 0) {
            clearSearchBtn.style.display = 'flex';
        } else {
            clearSearchBtn.style.display = 'none';
        }
    }

    // Fetch Release Notes from API
    async function fetchReleases(forceRefresh = false) {
        setLoadingState();
        try {
            const url = `/api/releases${forceRefresh ? '?refresh=true' : ''}`;
            const response = await fetch(url);
            const data = await response.json();
            
            if (data.success) {
                allReleases = data.releases;
                
                // Update Cache Time display
                const dateStr = new Date(data.last_updated).toLocaleString();
                cacheTimeEl.textContent = `${dateStr} (${data.from_cache ? 'Cached' : 'Fetched Live'})`;
                
                // Render dashboard statistics
                calculateStats(allReleases);
                
                // Filter and Render Feed
                filterAndRender();
            } else {
                renderErrorState(data.error || 'Failed to fetch release notes.');
            }
        } catch (error) {
            console.error('Error fetching release notes:', error);
            renderErrorState('Network error occurred while fetching release notes.');
        } finally {
            unsetLoadingState();
        }
    }

    // Calculate Statistics based on full dataset
    function calculateStats(releases) {
        statTotal.textContent = releases.length;
        
        const features = releases.filter(r => r.type.toLowerCase() === 'feature').length;
        const changes = releases.filter(r => r.type.toLowerCase() === 'change').length;
        const breakingIssues = releases.filter(r => 
            r.type.toLowerCase() === 'breaking' || r.type.toLowerCase() === 'issue'
        ).length;

        // Animate counter values
        animateCounter(statTotal, releases.length);
        animateCounter(statFeatures, features);
        animateCounter(statChanges, changes);
        animateCounter(statBreaking, breakingIssues);
    }

    // Counter animation utility
    function animateCounter(element, targetValue) {
        let currentValue = 0;
        const duration = 800; // ms
        const stepTime = Math.max(Math.floor(duration / (targetValue || 1)), 15);
        const increment = Math.ceil(targetValue / (duration / stepTime));
        
        if (targetValue === 0) {
            element.textContent = 0;
            return;
        }

        const timer = setInterval(() => {
            currentValue += increment;
            if (currentValue >= targetValue) {
                element.textContent = targetValue;
                clearInterval(timer);
            } else {
                element.textContent = currentValue;
            }
        }, stepTime);
    }

    // Dynamic filtering and rendering
    function filterAndRender() {
        let filtered = allReleases;

        // 1. Type Filter
        if (currentFilterType !== 'all') {
            filtered = filtered.filter(item => item.type === currentFilterType);
        }

        // 2. Date/Time Filter
        if (currentTimeFilter !== 'all') {
            const daysLimit = parseInt(currentTimeFilter);
            const limitDate = new Date();
            limitDate.setDate(limitDate.getDate() - daysLimit);
            
            filtered = filtered.filter(item => {
                const itemDate = new Date(item.updated);
                return itemDate >= limitDate;
            });
        }

        // 3. Search Query Filter
        if (currentSearchQuery) {
            filtered = filtered.filter(item => {
                const matchType = item.type.toLowerCase().includes(currentSearchQuery);
                const matchDate = item.date.toLowerCase().includes(currentSearchQuery);
                const matchContent = item.content.toLowerCase().stripHtml().includes(currentSearchQuery);
                return matchType || matchDate || matchContent;
            });
        }

        // Update Results Count label
        updateCountLabel(filtered.length);

        // Save active list for CSV export
        filteredReleases = filtered;

        // Render Results
        renderFeed(filtered);
    }

    // Update the results text label
    function updateCountLabel(count) {
        let filterText = '';
        if (currentFilterType !== 'all') {
            filterText += ` ${currentFilterType}s`;
        } else {
            filterText += ' release notes';
        }

        if (currentTimeFilter !== 'all') {
            filterText += ` in the last ${timeFilterSelect.options[timeFilterSelect.selectedIndex].text.toLowerCase()}`;
        }

        if (currentSearchQuery) {
            filterText += ` matching "${currentSearchQuery}"`;
        }

        resultsCountEl.textContent = `Showing ${count} ${filterText}`;
    }

    // Render Cards in DOM
    function renderFeed(releases) {
        feedContainer.innerHTML = '';

        if (releases.length === 0) {
            renderEmptyState();
            return;
        }

        releases.forEach((item, index) => {
            const card = document.createElement('div');
            card.className = 'release-card';
            // Stagger animation timing slightly for smooth loading flow
            card.style.animationDelay = `${Math.min(index * 0.04, 0.4)}s`;
            
            // Format type CSS class
            const typeClass = item.type.toLowerCase();

            // Prepare highlight markup if search is active
            let displayContent = item.content;
            if (currentSearchQuery) {
                displayContent = highlightText(displayContent, currentSearchQuery);
            }

            card.innerHTML = `
                <div class="card-header">
                    <div class="badge-and-date">
                        <span class="type-badge ${typeClass}">${item.type}</span>
                        <span class="release-date">${item.date}</span>
                    </div>
                    <div class="card-actions">
                        <button class="card-action-btn copy-btn" title="Copy Content" data-id="${item.id}">
                            <i class="fa-regular fa-copy"></i>
                        </button>
                        <a href="${item.link}" target="_blank" class="card-action-btn" title="View Source">
                            <i class="fa-solid fa-arrow-up-right-from-square"></i>
                        </a>
                    </div>
                </div>
                <div class="card-body">
                    ${displayContent}
                </div>
            `;

            // Event listener for Copy Button
            const copyBtn = card.querySelector('.copy-btn');
            copyBtn.addEventListener('click', () => {
                copyToClipboard(item.content.stripHtml(), "Release note content copied!");
            });

            feedContainer.appendChild(card);
        });
    }

    // Basic highlighter that doesn't break HTML tag matches
    function highlightText(html, query) {
        if (!query) return html;
        
        // Use a DOM parser to parse HTML, highlight only within text nodes, then serialize back
        const parser = new DOMParser();
        const doc = parser.parseFromString(`<div>${html}</div>`, 'text/html');
        const container = doc.body.firstChild;

        const walk = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, null, false);
        let node;
        const nodesToReplace = [];

        while (node = walk.nextNode()) {
            if (node.nodeValue.toLowerCase().includes(query)) {
                nodesToReplace.push(node);
            }
        }

        nodesToReplace.forEach(textNode => {
            const parent = textNode.parentNode;
            const text = textNode.nodeValue;
            const regex = new RegExp(`(${escapeRegExp(query)})`, 'gi');
            const parts = text.split(regex);
            
            const fragment = document.createDocumentFragment();
            parts.forEach(part => {
                if (part.toLowerCase() === query) {
                    const mark = document.createElement('mark');
                    mark.textContent = part;
                    fragment.appendChild(mark);
                } else if (part) {
                    fragment.appendChild(document.createTextNode(part));
                }
            });
            parent.replaceChild(fragment, textNode);
        });

        return container.innerHTML;
    }

    // Regex escape utility
    function escapeRegExp(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    // Copy text to clipboard and show toast
    function copyToClipboard(text, message) {
        navigator.clipboard.writeText(text).then(() => {
            showToast(message);
        }).catch(err => {
            console.error('Could not copy text: ', err);
        });
    }

    // Toast show utility
    function showToast(message) {
        toastMessage.textContent = message;
        toast.classList.add('show');
        setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    }

    // Loading/Spinner States
    function setLoadingState() {
        refreshBtn.disabled = true;
        const icon = refreshBtn.querySelector('i');
        icon.classList.add('spin');
    }

    function unsetLoadingState() {
        refreshBtn.disabled = false;
        const icon = refreshBtn.querySelector('i');
        icon.classList.remove('spin');
    }

    // Render skeleton loading items
    function renderSkeletonLoaders() {
        feedContainer.innerHTML = '';
        for (let i = 0; i < 3; i++) {
            const sk = document.createElement('div');
            sk.className = 'skeleton-card';
            sk.innerHTML = `
                <div class="skeleton-header">
                    <div class="skeleton-badge"></div>
                    <div class="skeleton-date"></div>
                </div>
                <div class="skeleton-body">
                    <div class="skeleton-line medium"></div>
                    <div class="skeleton-line"></div>
                    <div class="skeleton-line short"></div>
                </div>
            `;
            feedContainer.appendChild(sk);
        }
    }

    // Set UI to loading representation
    function setLoadingState() {
        refreshBtn.disabled = true;
        const icon = refreshBtn.querySelector('i');
        icon.classList.add('spin');
        renderSkeletonLoaders();
    }

    // Unset spinner/buttons
    function unsetLoadingState() {
        refreshBtn.disabled = false;
        const icon = refreshBtn.querySelector('i');
        icon.classList.remove('spin');
    }

    // Render Empty State
    function renderEmptyState() {
        feedContainer.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon"><i class="fa-solid fa-clipboard-question"></i></div>
                <h3>No Release Notes Found</h3>
                <p>Try clearing your keyword filters or selecting a different type/time period.</p>
            </div>
        `;
    }

    // Render Error State
    function renderErrorState(message) {
        feedContainer.innerHTML = `
            <div class="empty-state" style="border-color: rgba(239, 68, 68, 0.3);">
                <div class="empty-state-icon" style="color: var(--color-breaking);"><i class="fa-solid fa-circle-exclamation"></i></div>
                <h3 style="color: var(--color-breaking);">Error Loading Data</h3>
                <p>${message}</p>
                <button onclick="window.location.reload()" class="refresh-action-btn" style="margin-top: 16px; max-width: 200px;">
                    <i class="fa-solid fa-arrow-rotate-right"></i> Try Again
                </button>
            </div>
        `;
    }

    // Export to CSV Utility
    function exportToCSV(releases) {
        if (releases.length === 0) {
            showToast("No release notes to export.");
            return;
        }

        // CSV Headers
        const headers = ["ID", "Date", "Updated ISO", "Type", "Link", "Content"];
        
        // Convert release items to CSV rows
        const rows = releases.map(item => [
            item.id,
            item.date,
            item.updated,
            item.type,
            item.link,
            // Strip HTML and escape quotes for content
            item.content.stripHtml().replace(/"/g, '""').trim()
        ]);

        // Construct CSV String with proper line endings and double-quotes
        const csvContent = [
            headers.join(","),
            ...rows.map(r => r.map(val => `"${val}"`).join(","))
        ].join("\n");

        // Create file download in browser
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        
        // Generate dynamic file name with current context and timestamp
        const dateStr = new Date().toISOString().slice(0, 10);
        const typeStr = currentFilterType.toLowerCase();
        link.setAttribute("download", `bigquery_releases_${typeStr}_${dateStr}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        showToast(`Successfully exported ${releases.length} rows to CSV!`);
    }
});
