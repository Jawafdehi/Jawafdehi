/**
 * Multi-widget JavaScript functionality
 * Handles dynamic add/remove, drag-and-drop, and auto-resize for Django form widgets
 */

class MultiWidgetManager {
    constructor(containerId, hiddenInputId, config) {
        this.container = document.getElementById(containerId);
        this.hiddenInput = document.getElementById(hiddenInputId);
        this.addBtn = document.getElementById(`${hiddenInputId}_add`);
        this.config = config;
        this.draggedRow = null;
        
        this.init();
    }
    
    init() {
        if (!this.container || !this.hiddenInput || !this.addBtn) return;
        
        this.setupAddButton();
        this.setupExistingRows();
        this.setupDragAndDrop();
        this.setupFormSubmit();
    }
    
    setupAddButton() {
        this.addBtn.addEventListener('click', (e) => {
            e.preventDefault();
            this.addRow();
        });
    }
    
    setupExistingRows() {
        this.container.querySelectorAll('.input-row').forEach(row => {
            this.setupRow(row);
        });
        
        // Auto-resize existing textareas
        this.container.querySelectorAll('textarea.auto-resize').forEach(textarea => {
            this.autoResize(textarea);
        });
    }
    
    setupRow(row) {
        // Setup input listeners
        row.querySelectorAll(`.${this.config.inputClass}`).forEach(input => {
            input.addEventListener('input', () => this.updateHidden());
            
            if (input.classList.contains('auto-resize')) {
                input.addEventListener('input', () => this.autoResize(input));
                input.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter') e.preventDefault();
                });
            }
        });
        
        // Setup remove button
        const removeBtn = row.querySelector('.remove-input');
        if (removeBtn) {
            removeBtn.addEventListener('click', (e) => {
                e.preventDefault();
                row.remove();
                this.updateHidden();
            });
        }
        
        // Setup widget-specific handlers
        if (this.config.setupRowCallback) {
            this.config.setupRowCallback(row, this);
        }
    }
    
    addRow() {
        const row = document.createElement('div');
        row.className = this.config.rowClass || 'input-row';
        row.innerHTML = this.config.rowTemplate;
        row.draggable = true;
        
        if (this.config.rowStyles) {
            Object.assign(row.style, this.config.rowStyles);
        }
        
        this.addBtn.parentElement.insertAdjacentElement('beforebegin', row);
        this.setupRow(row);
    }
    
    updateHidden() {
        const values = this.config.getValues(this.container);
        this.hiddenInput.value = JSON.stringify(values);
    }
    
    autoResize(textarea) {
        if(textarea.scrollHeight === 0){
            // Wait for DOM/CSS initialization before calculating height.
            return setTimeout(() => this.autoResize(textarea), 200);
        }
        textarea.style.height = 'auto';
        textarea.style.height = textarea.scrollHeight + 'px';
    }
    
    setupDragAndDrop() {
        this.container.addEventListener('dragstart', (e) => {
            if (e.target.classList.contains('input-row')) {
                this.draggedRow = e.target;
                e.target.classList.add('dragging');
            }
        });
        
        this.container.addEventListener('dragend', (e) => {
            if (e.target.classList.contains('input-row')) {
                e.target.classList.remove('dragging');
            }
        });
        
        this.container.addEventListener('dragover', (e) => {
            e.preventDefault();
            const afterElement = this.getDragAfterElement(e.clientY);
            if (afterElement == null) {
                const rows = this.container.querySelectorAll('.input-row');
                if (rows.length > 0) {
                    this.container.insertBefore(this.draggedRow, this.addBtn.parentElement);
                }
            } else {
                this.container.insertBefore(this.draggedRow, afterElement);
            }
        });
        
        this.container.addEventListener('drop', (e) => {
            e.preventDefault();
            this.updateHidden();
        });
    }
    
    getDragAfterElement(y) {
        const draggableElements = [...this.container.querySelectorAll('.input-row:not(.dragging)')];
        return draggableElements.reduce((closest, child) => {
            const box = child.getBoundingClientRect();
            const offset = y - box.top - box.height / 2;
            if (offset < 0 && offset > closest.offset) {
                return { offset: offset, element: child };
            } else {
                return closest;
            }
        }, { offset: Number.NEGATIVE_INFINITY }).element;
    }
    
    setupFormSubmit() {
        const form = this.container.closest('form');
        if (form) {
            form.addEventListener('submit', () => {
                this.updateHidden();
            });
        }
    }
}

// Widget-specific configurations
window.MultiWidgetConfigs = {
    entity: {
        inputClass: 'entity-input',
        rowClass: 'input-row',
        getValues: (container) => {
            const inputs = container.querySelectorAll('.entity-input');
            return Array.from(inputs).map(i => i.value.trim()).filter(v => v);
        }
    },
    
    text: {
        inputClass: 'text-input',
        rowClass: 'input-row',
        getValues: (container) => {
            const inputs = container.querySelectorAll('.text-input');
            return Array.from(inputs).map(i => i.value.trim()).filter(v => v);
        }
    },
    
    timeline: {
        inputClass: 'timeline-input',
        rowClass: 'input-row timeline-row',
        rowStyles: {
            marginBottom: '16px',
            padding: '12px',
            border: '1px solid #ddd',
            borderRadius: '4px',
            position: 'relative'
        },
        getValues: (container) => {
            return Array.from(container.querySelectorAll('.input-row')).map(row => {
                const inputs = row.querySelectorAll('.timeline-input');
                if (!inputs[0].value && !inputs[1].value && !inputs[2].value) return null;
                return {
                    date: inputs[0].value.trim(),
                    title: inputs[1].value.trim(),
                    description: inputs[2].value.trim()
                };
            }).filter(v => v);
        }
    },
    
    evidence: {
        inputClass: 'evidence-input',
        rowClass: 'input-row evidence-row',
        rowStyles: {
            marginBottom: '16px',
            padding: '12px',
            border: '1px solid #ddd',
            borderRadius: '4px',
            position: 'relative'
        },
        getValues: (container) => {
            return Array.from(container.querySelectorAll('.input-row')).map(row => {
                const inputs = row.querySelectorAll('.evidence-input');
                const sourceId = inputs[0].value.trim();
                const desc = inputs[1].value.trim();
                return (sourceId || desc) ? { source_id: sourceId, description: desc } : null;
            }).filter(v => v);
        },
        setupRowCallback: (row, manager) => {
            // Setup view button for evidence widget
            const select = row.querySelector('.source-select');
            const viewBtn = row.querySelector('.view-source-btn');
            
            if (select && viewBtn && manager.config.sourceUrlMap) {
                const updateViewButton = () => {
                    const sourceId = select.value;
                    if (sourceId && manager.config.sourceUrlMap[sourceId]) {
                        viewBtn.href = manager.config.sourceUrlMap[sourceId];
                        viewBtn.style.display = '';
                    } else {
                        viewBtn.style.display = 'none';
                    }
                };
                
                updateViewButton();
                select.addEventListener('change', updateViewButton);
            }
        }
    }
};

// Initialize widget
window.initMultiWidget = function(containerId, hiddenInputId, widgetType, extraConfig = {}) {
    const config = { ...window.MultiWidgetConfigs[widgetType], ...extraConfig };
    new MultiWidgetManager(containerId, hiddenInputId, config);
};