// Global variables to hold our loaded data
let allUrls = [];
let departmentMapping = {};
let aliasToCanonicalMap = {};
let searchCorpus = [];
let fuse; // Variable to hold the Fuse.js instance

// Base URL prefix for parsing paths
const BASE_URL_PREFIX = "http://10.18.24.75/peqp/";

// Keys for storing/retrieving values from chrome.storage.local
const STORAGE_KEYS = {
    LAST_SUBJECT: 'lastSubjectInput',
    LAST_DEPARTMENT: 'lastDepartmentInput'
};

// --- Utility Functions ---

// Function to fetch JSON files bundled with the extension
async function fetchExtensionResource(filename) {
    try {
        const response = await fetch(chrome.runtime.getURL(filename));
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error(`Failed to fetch ${filename}:`, error);
        document.getElementById('statusMessage').textContent = `Error loading ${filename}. See console.`;
        return null;
    }
}

// Normalize a string for comparison (lowercase, replace separators with spaces)
function normalizeString(str) {
    return str.toLowerCase().replace(/_/g, ' ').replace(/-/g, ' ').trim();
}

// Extracts components from a URL for display and filtering
function parseUrlComponents(url) {
    const relativePath = url.substring(BASE_URL_PREFIX.length);
    // URL-decode each part for display/search
    const pathPartsDecoded = relativePath.split('/').filter(p => p !== '').map(p => decodeURIComponent(p));
    // Keep raw parts for department matching against raw URL segments
    const pathPartsRaw = relativePath.split('/').filter(p => p !== '');

    if (pathPartsDecoded.length < 4) {
        return null; // Does not fit expected Year/Semester/Department/Filename structure
    }

    const year = pathPartsDecoded[0];
    const semester = pathPartsDecoded[1];
    const departmentDecoded = pathPartsDecoded[2]; // Decoded for display
    const departmentRaw = pathPartsRaw[2]; // Raw for matching against alias patterns
    const filenameDecoded = pathPartsDecoded[3]; // Decoded for subject display

    return { year, semester, departmentDecoded, departmentRaw, filenameDecoded };
}

// --- Persistence Functions ---

async function saveLastSearch(subject, department) {
    try {
        await chrome.storage.local.set({
            [STORAGE_KEYS.LAST_SUBJECT]: subject,
            [STORAGE_KEYS.LAST_DEPARTMENT]: department
        });
        //console.log("Last search saved:", { subject, department });
    } catch (error) {
        console.error("Failed to save last search:", error);
    }
}

async function loadLastSearch() {
    try {
        const result = await chrome.storage.local.get([STORAGE_KEYS.LAST_SUBJECT, STORAGE_KEYS.LAST_DEPARTMENT]);
        document.getElementById('subjectInput').value = result[STORAGE_KEYS.LAST_SUBJECT] || '';
        document.getElementById('departmentInput').value = result[STORAGE_KEYS.LAST_DEPARTMENT] || '';
        //console.log("Last search loaded:", result);
    } catch (error) {
        console.error("Failed to load last search:", error);
    }
}


// --- Main Search Logic ---

async function performSearch() {
    document.getElementById('resultsList').innerHTML = ''; // Clear previous results
    document.getElementById('statusMessage').textContent = 'Searching...';

    const subjectInput = document.getElementById('subjectInput').value.trim();
    const departmentInput = document.getElementById('departmentInput').value.trim();

    const searchSubjectNormalized = normalizeString(subjectInput);
    const searchDepartmentNormalized = normalizeString(departmentInput);

    let filteredCorpusItems = [];

    // --- 1. Fuzzy Search on Subject (using Fuse.js) ---
    if (searchSubjectNormalized && fuse) {
        const fuseResults = fuse.search(searchSubjectNormalized);
        filteredCorpusItems = fuseResults.map(result => result.item);
    } else if (!searchSubjectNormalized) {
        filteredCorpusItems = searchCorpus;
    } else {
        document.getElementById('statusMessage').textContent = 'Error: Search functionality not ready.';
        return;
    }

    // --- 2. Department Filtering (if department input provided) ---
    let matchingPapers = [];

    if (searchDepartmentNormalized) {
        let targetCanonicalDeptName = null;
        let deptSearchPatterns = [];

        if (aliasToCanonicalMap[searchDepartmentNormalized]) {
            targetCanonicalDeptName = aliasToCanonicalMap[searchDepartmentNormalized];
        } else {
            let bestMatchScore = -1;
            for (const canonicalName of Object.keys(departmentMapping)) {
                if (searchDepartmentNormalized.includes(normalizeString(canonicalName))) {
                    const score = searchDepartmentNormalized.length / normalizeString(canonicalName).length;
                    if (score > bestMatchScore) {
                        bestMatchScore = score;
                        targetCanonicalDeptName = canonicalName;
                    }
                }
            }
        }

        if (targetCanonicalDeptName && departmentMapping[targetCanonicalDeptName]) {
            const deptEntry = departmentMapping[targetCanonicalDeptName];
            const allDeptSearchTerms = [...new Set(deptEntry.search_aliases.concat(deptEntry.codes.map(c => c.toLowerCase())))];

            for (const term of allDeptSearchTerms) {
                deptSearchPatterns.push(normalizeString(term));
                deptSearchPatterns.push(normalizeString(term).replace(/ /g, '%20'));
                deptSearchPatterns.push(normalizeString(term).replace(/ /g, '_'));
            }
            deptSearchPatterns = [...new Set(deptSearchPatterns.filter(p => p !== ''))];
        } else if (searchDepartmentNormalized) {
            deptSearchPatterns.push(searchDepartmentNormalized);
            deptSearchPatterns.push(searchDepartmentNormalized.replace(/ /g, '%20'));
            deptSearchPatterns.push(searchDepartmentNormalized.replace(/ /g, '_'));
        }
        
        for (const item of filteredCorpusItems) {
            const urlComponents = parseUrlComponents(item.url);
            if (!urlComponents) continue;

            let departmentMatch = false;
            if (deptSearchPatterns.length > 0) {
                const targetDeptRawNormalized = normalizeString(urlComponents.departmentRaw);
                const targetDeptDecodedNormalized = normalizeString(urlComponents.departmentDecoded);

                for (const pattern of deptSearchPatterns) {
                    if (targetDeptRawNormalized.includes(pattern) || targetDeptDecodedNormalized.includes(pattern)) {
                        departmentMatch = true;
                        break;
                    }
                }
            } else {
                departmentMatch = true;
            }

            if (departmentMatch) {
                matchingPapers.push({
                    ...item,
                    year: urlComponents.year,
                    semester: urlComponents.semester,
                    departmentDecoded: urlComponents.departmentDecoded,
                    departmentDisplay: targetCanonicalDeptName || urlComponents.departmentDecoded
                });
            }
        }

    } else {
        for (const item of filteredCorpusItems) {
            const urlComponents = parseUrlComponents(item.url);
            if (!urlComponents) continue;

            const targetCanonicalDeptName = aliasToCanonicalMap[normalizeString(urlComponents.departmentDecoded)] || urlComponents.departmentDecoded;

            matchingPapers.push({
                ...item,
                year: urlComponents.year,
                semester: urlComponents.semester,
                departmentDecoded: urlComponents.departmentDecoded,
                departmentDisplay: targetCanonicalDeptName
            });
        }
    }

    matchingPapers.sort((a, b) => {
        if (a.year !== b.year) return a.year.localeCompare(b.year);
        if (a.semester !== b.semester) return a.semester.localeCompare(b.semester);
        if (a.departmentDisplay !== b.departmentDisplay) return a.departmentDisplay.localeCompare(b.departmentDisplay);
        return a.original_filename.localeCompare(b.original_filename);
    });

    // --- Display Results ---
    const resultsList = document.getElementById('resultsList');
    if (matchingPapers.length > 0) {
        document.getElementById('statusMessage').textContent = `Found ${matchingPapers.length} papers.`;
        matchingPapers.forEach((paper, index) => {
            const listItem = document.createElement('li');
            listItem.className = 'result-item';

            const detailsDiv = document.createElement('div');
            detailsDiv.className = 'result-details';
            detailsDiv.innerHTML = `
                <strong>${index + 1}.</strong> 
                <strong>Year:</strong> ${paper.year}, 
                <strong>Semester:</strong> ${paper.semester}, 
                <strong>Dept:</strong> ${paper.departmentDisplay}, 
                <strong>Subject:</strong> ${paper.original_filename.replace(/\.pdf$/i, '')}
            `;
            listItem.appendChild(detailsDiv);

            const downloadButton = document.createElement('button');
            downloadButton.className = 'result-link-button';
            downloadButton.textContent = 'Download PDF';
            downloadButton.dataset.url = paper.url;
            downloadButton.dataset.filename = `${paper.departmentDisplay}_${paper.year}_${paper.semester}_${paper.original_filename}`;
            downloadButton.addEventListener('click', handleDownload);
            listItem.appendChild(downloadButton);

            resultsList.appendChild(listItem);
        });
        // Save the search terms after a successful display
        saveLastSearch(subjectInput, departmentInput);
    } else {
        document.getElementById('statusMessage').textContent = 'No papers found matching your criteria.';
        const noResultsItem = document.createElement('li');
        noResultsItem.className = 'no-results';
        noResultsItem.textContent = 'Please try different keywords or fewer filters.';
        resultsList.appendChild(noResultsItem);
    }
}

function handleDownload(event) {
    const url = event.target.dataset.url;
    let filename = event.target.dataset.filename;

    filename = filename.replace(/[<>:"/\\|?*]/g, '_');
    if (!filename.toLowerCase().endsWith('.pdf')) {
        filename += '.pdf';
    }

    if (url) {
        chrome.downloads.download({
            url: url,
            filename: filename
        });
    } else {
        console.error('Download URL not found for this item.');
    }
}

// --- Initialization ---

async function initializeExtension() {
    document.getElementById('statusMessage').textContent = 'Loading data...';
    
    // Load last search terms first so inputs are populated quickly
    await loadLastSearch();

    // Load all necessary JSON data
    const loadedUrls = await fetchExtensionResource("urls_data.json");
    const loadedDeptMap = await fetchExtensionResource("department_mapping.json");
    const loadedSearchCorpus = await fetchExtensionResource("search_corpus.json");

    if (loadedUrls && loadedDeptMap && loadedSearchCorpus) {
        allUrls = loadedUrls;
        departmentMapping = {};
        aliasToCanonicalMap = loadedDeptMap.alias_to_canonical_map;

        loadedDeptMap.canonical_departments.forEach(dept => {
            departmentMapping[dept.display_name] = dept;
        });

        searchCorpus = loadedSearchCorpus;

        const fuseOptions = {
            keys: ['normalized_filename', 'original_filename'],
            threshold: 0.3,
            includeScore: true
        };
        fuse = new Fuse(searchCorpus, fuseOptions);

        document.getElementById('statusMessage').textContent = 'Ready to search!';
        
        // If there were pre-loaded values, automatically perform a search
        const subjectVal = document.getElementById('subjectInput').value;
        const departmentVal = document.getElementById('departmentInput').value;
        if (subjectVal || departmentVal) {
            performSearch();
        }

    } else {
        document.getElementById('statusMessage').textContent = 'Failed to load all data. Check console for errors.';
    }
}

// Event Listeners
document.addEventListener('DOMContentLoaded', initializeExtension);
document.getElementById('searchButton').addEventListener('click', performSearch);
document.getElementById('subjectInput').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        performSearch();
    }
});
document.getElementById('departmentInput').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        performSearch();
    }
});
