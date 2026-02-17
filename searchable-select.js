/**
 * 🏭 SEARCHABLE SELECT PRO v2.1
 * Features:
 * - Busca Inteligente com Aliases (Ex: VW -> Volkswagen)
 * - Observador de Mutações (Reatividade total ao script.js)
 * - Correção de Eventos de Clique (Mousedown vs Click)
 */

const DICTIONARY_ALIASES = {
    'vw': 'volkswagen',
    'volks': 'volkswagen',
    'gm': 'chevrolet',
    'chevy': 'chevrolet'
};

class SearchableSelect {
    constructor(selectId, options = {}) {
        this.select = document.getElementById(selectId);
        if (!this.select) return;

        this.options = {
            allowManual: true,
            placeholder: options.placeholder || 'Selecione ou digite...',
            onManualEntry: options.onManualEntry || null,
            onFipeEntry: options.onFipeEntry || null,
            ...options
        };

        this.init();
    }

    init() {
        this.select.style.display = 'none';

        this.wrapper = document.createElement('div');
        this.wrapper.className = 'searchable-select-wrapper';

        this.input = document.createElement('input');
        this.input.type = 'text';
        this.input.className = 'searchable-select-input';
        this.input.placeholder = this.options.placeholder;
        this.input.autocomplete = 'off';

        this.dropdown = document.createElement('div');
        this.dropdown.className = 'searchable-select-dropdown';

        this.wrapper.appendChild(this.input);
        this.wrapper.appendChild(this.dropdown);
        this.select.parentNode.insertBefore(this.wrapper, this.select);

        // OBSERVER: O Segredo da Reatividade
        // Observa se o script.js mudou as opções (childList) ou desativou o select (attributes)
        const observer = new MutationObserver(() => this.updateInternalOptions());
        observer.observe(this.select, { childList: true, attributes: true });

        this.bindEvents();
        this.updateInternalOptions();
        this.syncInputFromSelect();
    }

    syncInputFromSelect() {
        const opt = this.select.options[this.select.selectedIndex];
        if (opt && opt.value) {
            this.input.value = opt.text;
        } else {
            // Se o select foi resetado (ex: mudou a marca), limpa o input
            this.input.value = '';
        }
    }

    updateInternalOptions() {
        // 1. Sincroniza estado Disabled (ex: Carregando...)
        if (this.select.disabled) {
            this.input.disabled = true;
            this.wrapper.classList.add('loading');
            this.input.placeholder = "Aguarde, carregando...";
        } else {
            this.input.disabled = false;
            this.wrapper.classList.remove('loading');
            this.input.placeholder = this.options.placeholder;
        }

        // 2. Atualiza lista interna
        this.items = Array.from(this.select.options)
            .filter(opt => opt.value !== "")
            .map(opt => ({
                value: opt.value,
                text: opt.text,
                searchStr: this.normalizeString(opt.text)
            }));

        // 3. REATIVIDADE: Se o usuário já digitou algo (ex: "VIR") e a FIPE acabou de carregar,
        // atualiza o dropdown na cara dele!
        if (this.input === document.activeElement && this.input.value.length > 0) {
            this.filterAndShow(this.input.value);
        }
    }

    normalizeString(str) {
        return str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    }

    bindEvents() {
        this.input.addEventListener('focus', () => {
            this.input.select();
            this.filterAndShow(this.input.value);
        });

        this.input.addEventListener('input', (e) => {
            this.filterAndShow(e.target.value);
        });

        this.input.addEventListener('blur', () => {
            // Delay para permitir clique no dropdown
            setTimeout(() => {
                this.handleManualEntry();
                this.dropdown.classList.remove('active');
            }, 200);
        });

        // Quando o script.js muda o valor programaticamente
        this.select.addEventListener('change', () => {
            if (document.activeElement !== this.input) {
                this.syncInputFromSelect();
            }
        });
    }

    filterAndShow(query) {
        let normalizedQuery = this.normalizeString(query);

        if (DICTIONARY_ALIASES[normalizedQuery]) {
            normalizedQuery = DICTIONARY_ALIASES[normalizedQuery];
        }

        const matches = this.items.filter(item =>
            item.searchStr.includes(normalizedQuery)
        );

        this.renderDropdown(matches, query);
        this.dropdown.classList.add('active');
    }

    renderDropdown(matches, currentQuery) {
        this.dropdown.innerHTML = '';

        // 1. Renderiza opções da FIPE (Exact & Partial Matches)
        if (matches.length > 0) {
            matches.forEach(item => {
                const div = document.createElement('div');
                div.className = 'searchable-select-option';
                div.textContent = item.text;
                // MOUSEDOWN é vitão: Dispara antes do blur!
                div.onmousedown = (e) => {
                    e.preventDefault();
                    this.applySelection(item.text, item.value, false);
                };
                this.dropdown.appendChild(div);
            });
        }

        // 2. Renderiza Opção Manual (Fallback)
        // Só mostra se tiver texto digitado
        if (currentQuery.length > 0) {
            const separator = document.createElement('div');
            separator.style.borderTop = '1px solid #eee';
            separator.style.margin = '4px 0';
            this.dropdown.appendChild(separator);

            const manualDiv = document.createElement('div');
            manualDiv.className = 'searchable-select-manual-option';
            manualDiv.innerHTML = `🖋️ Usar manual: <strong>"${currentQuery}"</strong>`;
            manualDiv.onmousedown = (e) => {
                e.preventDefault();
                this.applySelection(currentQuery, currentQuery, true);
            };
            this.dropdown.appendChild(manualDiv);
        }

        if (matches.length === 0 && currentQuery.length === 0) {
            const info = document.createElement('div');
            info.style.padding = '10px';
            info.style.color = '#999';
            info.style.fontStyle = 'italic';
            info.textContent = 'Digite para buscar...';
            this.dropdown.appendChild(info);
        }
    }

    applySelection(text, value, isManual) {
        this.input.value = text;

        if (isManual) {
            // Cria option manual se não existir
            let exists = Array.from(this.select.options).find(o => o.value === value);
            if (!exists) {
                const newOpt = document.createElement('option');
                newOpt.value = value;
                newOpt.text = text;
                newOpt.setAttribute('data-manual', 'true');
                this.select.appendChild(newOpt);
            }
            this.select.value = value;
            if (this.options.onManualEntry) this.options.onManualEntry(value);
        } else {
            this.select.value = value;
            if (this.options.onFipeEntry) this.options.onFipeEntry(value, text);
        }

        const event = new Event('change', { bubbles: true });
        this.select.dispatchEvent(event);

        this.dropdown.classList.remove('active');
        this.input.blur(); // Remove foco para confirmar
    }

    handleManualEntry() {
        const val = this.input.value.trim();
        if (!val) {
            // Se limpou o input, limpa o select
            this.select.value = '';
            return;
        }

        // Se já escolheu algo válido (matches select), não faz nada
        const currentSelectText = this.select.options[this.select.selectedIndex]?.text;
        if (currentSelectText === val) return;

        // Se saiu do campo sem clicar, assume manual ou top match?
        // Assume manual para segurança
        // this.applySelection(val, val, true); // Opcional: Auto-select on blur
    }
}

window.makeSearchableSelect = (id, opts) => new SearchableSelect(id, opts);
