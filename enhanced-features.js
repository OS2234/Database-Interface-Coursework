// ============================================
// UTILITY FUNCTIONS
// ============================================

const Utils = {
    debounce(func, delay) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, delay);
        };
    },

    escapeRegex(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    },

    formatDate(date, format = 'iso') {
        const d = new Date(date);
        if (isNaN(d.getTime())) return date;

        if (format === 'iso') {
            return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        }
        return d.toLocaleDateString('en-GB');
    },

    getTimestamp() {
        const now = new Date();
        return `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;
    },

    escapeCsvField(field) {
        if (!field) return '';
        if (field.includes(',') || field.includes('"') || field.includes('\n')) {
            return `"${field.replace(/"/g, '""')}"`;
        }
        return field;
    }
};

// ============================================
// PART 1: SMART SEARCH
// ============================================

class SmartSearch {
    constructor() {
        this.searchDelay = 300;
    }

    search(items, searchTerm, searchFields) {
        if (!searchTerm?.trim()) return items;

        const term = searchTerm.toLowerCase().trim();

        return items.filter(item =>
            searchFields.some(field => {
                const value = this._getNestedValue(item, field);
                return value && value.toString().toLowerCase().includes(term);
            })
        );
    }

    _getNestedValue(obj, path) {
        return path.split('.').reduce((current, key) =>
            current?.[key] !== undefined ? current[key] : null, obj
        );
    }

    highlightMatch(text, searchTerm) {
        if (!searchTerm || !text) return text;

        const term = searchTerm.toLowerCase();
        const textStr = text.toString();

        if (textStr.toLowerCase().includes(term)) {
            const regex = new RegExp(`(${Utils.escapeRegex(term)})`, 'gi');
            return textStr.replace(regex, '<mark class="search-highlight">$1</mark>');
        }
        return textStr;
    }

    debouncedSearch(callback) {
        return Utils.debounce(callback, this.searchDelay);
    }
}

// ============================================
// PART 2: AUTO-SAVE DRAFT
// ============================================

class DraftManager {
    constructor() {
        this.DRAFT_KEY = 'evaluation_draft';
        this.saveDelay = 3000;
        this.saveTimeout = null;
        this.cleanupFn = null;
    }

    saveDraft(studentId, assessorId, scores, remarks) {
        const draft = {
            studentId, assessorId, scores, remarks,
            lastModified: new Date().toISOString()
        };

        localStorage.setItem(this.DRAFT_KEY, JSON.stringify(draft));
        this._showIndicator('💾 Draft saved', '#4caf50');
        return true;
    }

    debouncedSave(studentId, assessorId, scores, remarks) {
        if (this.saveTimeout) clearTimeout(this.saveTimeout);

        this._showTypingIndicator(true);

        this.saveTimeout = setTimeout(() => {
            const hasContent = Object.values(scores).some(s => s > 0 && s !== 50) || remarks.length > 0;
            if (hasContent) {
                this.saveDraft(studentId, assessorId, scores, remarks);
            }
            this._showTypingIndicator(false);
            this.saveTimeout = null;
        }, this.saveDelay);
    }

    loadDraft() {
        const saved = localStorage.getItem(this.DRAFT_KEY);
        try { return saved ? JSON.parse(saved) : null; }
        catch { return null; }
    }

    hasValidDraft(studentId, assessorId) {
        const draft = this.loadDraft();
        if (!draft) return false;

        const isMatch = draft.studentId === studentId && draft.assessorId === assessorId;
        const isRecent = (new Date() - new Date(draft.lastModified)) < 24 * 60 * 60 * 1000;
        return isMatch && isRecent;
    }

    restoreDraftToForm(draft) {
        for (const [key, value] of Object.entries(draft.scores)) {
            const input = document.getElementById(`score_${key}`);
            if (input) {
                input.value = value;
                input.dispatchEvent(new Event('change'));
            }
        }

        const remarksField = document.getElementById('assessorRemarks');
        if (remarksField && draft.remarks) remarksField.value = draft.remarks;

        this._showIndicator('📋 Draft restored', '#2196f3');
    }

    clearDraft() {
        localStorage.removeItem(this.DRAFT_KEY);
        if (this.saveTimeout) clearTimeout(this.saveTimeout);
        this._showTypingIndicator(false);
        this._showIndicator('✓ Draft cleared', '#4caf50');
    }

    setupFormListeners(studentId, assessorId, getFormData) {
        this.removeFormListeners();

        const handleInput = () => {
            const { scores, remarks } = getFormData();
            this.debouncedSave(studentId, assessorId, scores, remarks);
        };

        const scoreInputs = document.querySelectorAll('.score-input-field');
        const remarksField = document.getElementById('assessorRemarks');

        scoreInputs.forEach(input => input.addEventListener('input', handleInput));
        if (remarksField) remarksField.addEventListener('input', handleInput);

        this.cleanupFn = () => {
            scoreInputs.forEach(input => input.removeEventListener('input', handleInput));
            if (remarksField) remarksField.removeEventListener('input', handleInput);
            if (this.saveTimeout) clearTimeout(this.saveTimeout);
        };
    }

    removeFormListeners() {
        if (this.cleanupFn) {
            this.cleanupFn();
            this.cleanupFn = null;
        }
    }

    _showTypingIndicator(isTyping) {
        let indicator = document.getElementById('typingIndicator');

        if (!indicator) {
            indicator = this._createIndicator('typingIndicator', 'bottom: 20px; right: 20px;');
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

    _showIndicator(message, color) {
        let indicator = document.getElementById('draftIndicator');

        if (!indicator) {
            indicator = this._createIndicator('draftIndicator', 'bottom: 20px; left: 20px;');
            document.body.appendChild(indicator);
        }

        indicator.style.color = color;
        indicator.style.border = `1px solid ${color}`;
        indicator.textContent = `${message} ${new Date().toLocaleTimeString()}`;
        indicator.style.opacity = '1';

        setTimeout(() => { indicator.style.opacity = '0'; }, 2000);
    }

    _createIndicator(id, position) {
        const el = document.createElement('div');
        el.id = id;
        el.style.cssText = `
            position: fixed; ${position}
            background: rgba(0,0,0,0.8); backdrop-filter: blur(5px);
            padding: 8px 16px; border-radius: 20px; font-size: 12px;
            z-index: 10000; transition: opacity 0.3s ease;
            pointer-events: none; font-family: monospace; opacity: 0;
        `;
        return el;
    }
}

// ============================================
// PART 3: CSV EXPORT
// ============================================

class CSVExporter {
    exportToCSV(data, filename, columns) {
        if (!data?.length) {
            this._showMessage('No data to export', 'warning');
            return false;
        }

        const headers = columns.map(col => Utils.escapeCsvField(col.label));
        const rows = data.map(row =>
            columns.map(col => {
                let value = row[col.key];
                if (value === null || value === undefined) value = '';
                if (col.isDate && value) value = Utils.formatDate(value);
                if (typeof value === 'object') value = Array.isArray(value) ? value.length : JSON.stringify(value);
                return Utils.escapeCsvField(value.toString());
            }).join(',')
        );

        const csvContent = headers.join(',') + '\n' + rows.join('\n');
        const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });

        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.href = url;
        link.download = `${filename}_${Utils.getTimestamp()}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        this._showMessage(`Exported ${data.length} records`, 'success');
        return true;
    }

    _showMessage(message, type) {
        alert(message);
    }
}

// ============================================
// EXPORT BUTTON CREATOR
// ============================================

function createExportButton(clickHandler, label = 'Export CSV') {
    const btn = document.createElement('button');
    btn.innerHTML = label;
    btn.className = 'export-btn';
    Object.assign(btn.style, {
        background: 'transparent',
        border: '1px solid #4caf50',
        borderRadius: '20px',
        padding: '6px 15px',
        color: '#4caf50',
        cursor: 'pointer',
        fontSize: '14px',
        transition: 'all 0.3s ease',
        marginLeft: '10px',
        whiteSpace: 'nowrap'
    });

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
// STYLES INJECTION
// ============================================

function injectStyles() {
    const style = document.createElement('style');
    style.textContent = `
        .search-highlight { background: #ffeb3b; color: #000; padding: 0 2px; border-radius: 3px; font-weight: bold; }
        .export-btn, .export-csv-btn, .export-dashboard-btn {
            background: transparent; border: 1px solid #4caf50; border-radius: 20px;
            padding: 6px 15px; color: #4caf50; cursor: pointer; font-size: 12px;
            transition: all 0.3s ease; margin-left: 10px;
        }
        .export-btn:hover, .export-csv-btn:hover, .export-dashboard-btn:hover {
            background: rgba(76, 175, 80, 0.2); transform: scale(1.02);
        }
        .search-input:focus { border-color: #4caf50; box-shadow: 0 0 5px rgba(76, 175, 80, 0.5); }
    `;
    document.head.appendChild(style);
}

// ============================================
// INITIALIZATION
// ============================================

const smartSearch = new SmartSearch();
const draftManager = new DraftManager();
const csvExporter = new CSVExporter();

injectStyles();

Object.assign(window, {
    smartSearch, draftManager, csvExporter,
    createExportButton, Utils
});

console.log('Enhanced features loaded');