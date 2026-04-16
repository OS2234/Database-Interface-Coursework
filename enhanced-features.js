// ============================================
// PART 1: SMART SEARCH
// ============================================

class SmartSearch {
    constructor() {
        this.searchTimeout = null;
        this.searchDelay = 300; // milliseconds
    }

    // Core search function - searches across multiple fields
    search(items, searchTerm, searchFields) {
        if (!searchTerm || searchTerm.trim() === '') {
            return items;
        }

        const term = searchTerm.toLowerCase().trim();

        return items.filter(item => {
            return searchFields.some(field => {
                const value = this.getNestedValue(item, field);
                if (!value) return false;
                return value.toString().toLowerCase().includes(term);
            });
        });
    }

    // Get nested object values (e.g., 'user.name')
    getNestedValue(obj, path) {
        return path.split('.').reduce((current, key) => {
            return current && current[key] !== undefined ? current[key] : null;
        }, obj);
    }

    // Highlight matching text in results
    highlightMatch(text, searchTerm) {
        if (!searchTerm || !text) return text;

        const term = searchTerm.toLowerCase();
        const textStr = text.toString();
        const textLower = textStr.toLowerCase();

        if (textLower.includes(term)) {
            const regex = new RegExp(`(${this.escapeRegex(term)})`, 'gi');
            return textStr.replace(regex, '<mark class="search-highlight">$1</mark>');
        }
        return textStr;
    }

    // Escape special regex characters
    escapeRegex(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    // Debounced search handler
    debouncedSearch(callback) {
        clearTimeout(this.searchTimeout);
        this.searchTimeout = setTimeout(callback, this.searchDelay);
    }
}

// ============================================
// PART 2: AUTO-SAVE DRAFT
// ============================================

class DraftManager {
    constructor() {
        this.draftKey = 'evaluation_draft';
        this.saveTimeout = null;
        this.debounceDelay = 3000; // 3 seconds after user stops typing
        this.formData = null;
        this.isTyping = false;
    }

    // Save current form data (called after debounce)
    saveDraft(studentId, assessorId, scores, remarks) {
        const draft = {
            studentId: studentId,
            assessorId: assessorId,
            scores: scores,
            remarks: remarks,
            lastModified: new Date().toISOString()
        };

        localStorage.setItem(this.draftKey, JSON.stringify(draft));
        this.showIndicator('💾 Draft saved', '#4caf50');
        return true;
    }

    // Debounced save - only saves after user stops typing
    debouncedSave(studentId, assessorId, scores, remarks) {
        // Clear any existing timeout
        if (this.saveTimeout) {
            clearTimeout(this.saveTimeout);
        }

        // Show "typing..." indicator
        this.showTypingIndicator(true);

        // Set new timeout to save after 5 seconds of inactivity
        this.saveTimeout = setTimeout(() => {
            // Only save if there's actual content
            const hasContent = Object.values(scores).some(s => s > 0 && s !== 50) || remarks.length > 0;

            if (hasContent) {
                this.saveDraft(studentId, assessorId, scores, remarks);
                this.showTypingIndicator(false);
            } else {
                this.showTypingIndicator(false);
            }
            this.saveTimeout = null;
        }, this.debounceDelay);
    }

    // Load saved draft
    loadDraft() {
        const saved = localStorage.getItem(this.draftKey);
        if (!saved) return null;

        try {
            return JSON.parse(saved);
        } catch (e) {
            console.error('Failed to load draft:', e);
            return null;
        }
    }

    // Check if draft exists for current student
    hasValidDraft(studentId, assessorId) {
        const draft = this.loadDraft();
        if (!draft) return false;

        // Check if draft matches current student AND is less than 24 hours old
        const isMatch = draft.studentId === studentId && draft.assessorId === assessorId;
        const isRecent = (new Date() - new Date(draft.lastModified)) < 24 * 60 * 60 * 1000;

        return isMatch && isRecent;
    }

    // Restore draft to form
    restoreDraftToForm(draft) {
        // Restore scores
        for (const [key, value] of Object.entries(draft.scores)) {
            const input = document.getElementById(`score_${key}`);
            if (input) {
                input.value = value;
                input.dispatchEvent(new Event('change'));
            }
        }

        // Restore remarks
        const remarksField = document.getElementById('assessorRemarks');
        if (remarksField && draft.remarks) {
            remarksField.value = draft.remarks;
        }

        this.showIndicator('📋 Draft restored', '#2196f3');
    }

    // Clear draft after submission
    clearDraft() {
        localStorage.removeItem(this.draftKey);
        if (this.saveTimeout) {
            clearTimeout(this.saveTimeout);
            this.saveTimeout = null;
        }
        this.showTypingIndicator(false);
        this.showIndicator('✓ Draft cleared', '#4caf50');
    }

    // Show typing indicator
    showTypingIndicator(isTyping) {
        let indicator = document.getElementById('typingIndicator');

        if (!indicator) {
            indicator = document.createElement('div');
            indicator.id = 'typingIndicator';
            indicator.style.cssText = `
                position: fixed;
                bottom: 20px;
                right: 20px;
                background: rgba(0,0,0,0.8);
                backdrop-filter: blur(5px);
                padding: 8px 16px;
                border-radius: 20px;
                font-size: 12px;
                z-index: 10000;
                transition: opacity 0.3s ease;
                pointer-events: none;
                font-family: monospace;
                opacity: 0;
            `;
            document.body.appendChild(indicator);
        }

        if (isTyping) {
            indicator.textContent = '✏️ Editing...';
            indicator.style.color = '#ffaa44';
            indicator.style.border = '1px solid #ffaa44';
            indicator.style.opacity = '1';
        } else {
            indicator.style.opacity = '0';
        }
    }

    // Show save indicator
    showIndicator(message, color) {
        let indicator = document.getElementById('draftIndicator');

        if (!indicator) {
            indicator = document.createElement('div');
            indicator.id = 'draftIndicator';
            indicator.style.cssText = `
                position: fixed;
                bottom: 20px;
                left: 20px;
                background: rgba(0,0,0,0.8);
                backdrop-filter: blur(5px);
                padding: 8px 16px;
                border-radius: 20px;
                font-size: 12px;
                z-index: 10000;
                transition: opacity 0.3s ease;
                pointer-events: none;
                font-family: monospace;
            `;
            document.body.appendChild(indicator);
        }

        indicator.style.color = color;
        indicator.style.border = `1px solid ${color}`;
        indicator.textContent = `${message} ${new Date().toLocaleTimeString()}`;
        indicator.style.opacity = '1';

        setTimeout(() => {
            indicator.style.opacity = '0';
        }, 2000);
    }

    // Setup event listeners for debounced saving
    setupFormListeners(studentId, assessorId, getFormData) {
        const scoreInputs = document.querySelectorAll('.score-input-field');
        const remarksField = document.getElementById('assessorRemarks');

        const handleInput = () => {
            const { scores, remarks } = getFormData();
            this.debouncedSave(studentId, assessorId, scores, remarks);
        };

        // Add listeners to all score inputs
        scoreInputs.forEach(input => {
            input.removeEventListener('input', handleInput);
            input.addEventListener('input', handleInput);
        });

        // Add listener to remarks field
        if (remarksField) {
            remarksField.removeEventListener('input', handleInput);
            remarksField.addEventListener('input', handleInput);
        }

        // Store cleanup function
        this.cleanup = () => {
            scoreInputs.forEach(input => {
                input.removeEventListener('input', handleInput);
            });
            if (remarksField) {
                remarksField.removeEventListener('input', handleInput);
            }
            if (this.saveTimeout) {
                clearTimeout(this.saveTimeout);
            }
        };
    }

    // Clean up listeners
    removeFormListeners() {
        if (this.cleanup) {
            this.cleanup();
            this.cleanup = null;
        }
    }
}

// ============================================
// PART 3: CSV EXPORT
// ============================================

class CSVExporter {
    constructor() {
        this.supportedFormats = ['csv'];
    }

    // Main export function
    exportToCSV(data, filename, columns) {
        if (!data || data.length === 0) {
            this.showMessage('No data to export', 'warning');
            return false;
        }

        // Build CSV content
        let csvContent = '';

        // Add headers
        const headers = columns.map(col => this.escapeField(col.label));
        csvContent += headers.join(',') + '\n';

        // Add data rows
        data.forEach(row => {
            const rowData = columns.map(col => {
                let value = row[col.key];

                if (value === null || value === undefined) {
                    value = '';
                } else if (col.isDate && value) {
                    value = this.formatDate(value);
                } else if (typeof value === 'object') {
                    value = Array.isArray(value) ? value.length : JSON.stringify(value);
                }

                return this.escapeField(value.toString());
            });

            csvContent += rowData.join(',') + '\n';
        });

        // Add UTF-8 BOM for proper Unicode support
        const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });

        // Download file
        const timestamp = this.getTimestamp();
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.href = url;
        link.download = `${filename}_${timestamp}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        this.showMessage(`Exported ${data.length} records to ${filename}.csv`, 'success');
        return true;
    }

    // Escape fields that contain commas or quotes
    escapeField(field) {
        if (!field) return '';

        if (field.includes(',') || field.includes('"') || field.includes('\n')) {
            return `"${field.replace(/"/g, '""')}"`;
        }
        return field;
    }

    // Format date for CSV
    formatDate(date) {
        const d = new Date(date);
        if (isNaN(d.getTime())) return date;

        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }

    // Get timestamp for filename
    getTimestamp() {
        const now = new Date();
        return `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;
    }

    // Show message to user
    showMessage(message, type) {
        alert(message); // Simple fallback
    }
}

// ============================================
// CREATE EXPORT BUTTON (GLOBAL FUNCTION)
// ============================================

function createExportButton(clickHandler, label = 'Export CSV') {
    const btn = document.createElement('button');
    btn.innerHTML = label;
    btn.className = 'export-btn';
    btn.style.cssText = `
        background: transparent;
        border: 1px solid #4caf50;
        border-radius: 20px;
        padding: 6px 15px;
        color: #4caf50;
        cursor: pointer;
        font-size: 14px;
        transition: all 0.3s ease;
        margin-left: 10px;
        white-space: nowrap;
    `;
    btn.onmouseenter = () => {
        btn.style.background = 'rgba(76, 175, 80, 0.2)';
        btn.style.transform = 'scale(1.02)';
    };
    btn.onmouseleave = () => {
        btn.style.background = 'transparent';
        btn.style.transform = 'scale(1)';
    };
    btn.onclick = clickHandler;
    return btn;
}

// ============================================
// ADD CSS FOR SEARCH HIGHLIGHTS
// ============================================

function addSearchHighlightStyles() {
    const style = document.createElement('style');
    style.textContent = `
        .search-highlight {
            background: #ffeb3b;
            color: #000;
            padding: 0 2px;
            border-radius: 3px;
            font-weight: bold;
        }
        
        /* Apply to ALL export button variations */
        .export-btn,
        .export-csv-btn,
        .export-dashboard-btn {
            background: transparent;
            border: 1px solid #4caf50;
            border-radius: 20px;
            padding: 6px 15px;
            color: #4caf50;
            cursor: pointer;
            font-size: 12px;
            transition: all 0.3s ease;
            margin-left: 10px;
        }
        
        .export-btn:hover,
        .export-csv-btn:hover,
        .export-dashboard-btn:hover {
            background: rgba(76, 175, 80, 0.2);
            transform: scale(1.02);
        }
        
        .search-input {
            transition: all 0.3s ease;
        }
        
        .search-input:focus {
            border-color: #4caf50;
            box-shadow: 0 0 5px rgba(76, 175, 80, 0.5);
        }
    `;
    document.head.appendChild(style);
}

// ============================================
// CREATE GLOBAL INSTANCES
// ============================================

// Create instances
const smartSearch = new SmartSearch();
const draftManager = new DraftManager();
const csvExporter = new CSVExporter();

// Add styles
addSearchHighlightStyles();

// ============================================
// EXPOSE GLOBALS TO WINDOW
// ============================================

window.smartSearch = smartSearch;
window.draftManager = draftManager;
window.csvExporter = csvExporter;
window.createExportButton = createExportButton;

console.log('✅ Enhanced features loaded. Available:', {
    smartSearch: typeof window.smartSearch !== 'undefined',
    csvExporter: typeof window.csvExporter !== 'undefined',
    createExportButton: typeof window.createExportButton !== 'undefined',
    draftManager: typeof window.draftManager !== 'undefined'
});