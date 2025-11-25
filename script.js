// script.js - VERSÃO FINAL COM BUSCA REDIRECIONANDO PARA A PÁGINA DA GÍRIA

document.addEventListener('DOMContentLoaded', () => {
    if (typeof supabase === 'undefined') { console.error("Erro: O cliente Supabase não foi inicializado corretamente."); return; }

    // --- SELETORES DE ELEMENTOS DO DOM ---
    const giriasDestaqueContainer = document.getElementById('girias-destaque-container');
    const searchInput = document.getElementById('search-giria');
    const searchButton = document.getElementById('search-button');
    const suggestionsContainer = document.getElementById('suggestions-container');
    const addGiriaForm = document.getElementById('add-giria-form');
    const formMessage = document.getElementById('form-message');
    const categoryList = document.querySelector('.category-list');
    const giriaModal = document.getElementById('giriaModal');
    const closeButton = document.querySelector('.close-button');
    const giriaDoDiaNome = document.getElementById('giria-do-dia-nome');
    const giriaDoDiaSignificado = document.getElementById('giria-do-dia-significado');
    const giriaDoDiaCategoria = document.getElementById('giria-do-dia-categoria');
    const giriasCountElement = document.getElementById('girias-count');
    const tendenciasContainer = document.getElementById('tendencias-container');
    const prevButton = document.getElementById('prev-button');
    const nextButton = document.getElementById('next-button');
    const refreshButton = document.getElementById('refresh-button');

    // --- ESTADO DA APLICAÇÃO ---
    let giriasCache = []; 
    let giriasAleatorias = []; 
    let currentPage = 1;
    const itemsPerPage = 5;

    // --- FUNÇÕES DE INTERAÇÃO COM O SUPABASE ---
    async function fetchAllGirias() {
        const { data, error } = await supabase.from('girias').select('*').order('created_at', { ascending: false }); 
        if (error) {
            console.error('Erro ao buscar gírias:', error);
            if(giriasDestaqueContainer) giriasDestaqueContainer.innerHTML = `<p style="color: red;">Erro ao carregar as gírias.</p>`;
            return [];
        }
        giriasCache = data;
        return data;
    }
    
    async function searchGirias(searchTerm) {
        const { data, error } = await supabase.from('girias').select('*').or(`nome.ilike.%${searchTerm}%,significado.ilike.%${searchTerm}%`);
        if (error) {
            console.error('Erro na busca:', error);
            return [];
        }
        return data;
    }

    async function saveNewGiria(newGiriaData) {
        const { data, error } = await supabase.from('girias').insert([newGiriaData]).select(); 
        if (error) {
            console.error('Erro ao salvar gíria:', error);
            return null;
        }
        giriasCache.unshift(data[0]); 
        return data[0];
    }
    
    // --- FUNÇÕES DE RENDERIZAÇÃO E LÓGICA ---
    function slugify(text) {
        return text.toString().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, '-').replace(/[^\w\-]+/g, '');            
    }

    function shuffleArray(array) {
        let newArray = [...array];
        for (let i = newArray.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
        }
        return newArray;
    }

    function renderGiriasPaginadas() {
        if (!giriasDestaqueContainer) return;
        giriasDestaqueContainer.innerHTML = '';
        const start = (currentPage - 1) * itemsPerPage;
        const end = start + itemsPerPage;
        const paginatedItems = giriasAleatorias.slice(start, end);

        if (paginatedItems.length === 0) {
            giriasDestaqueContainer.innerHTML = '<p>Nenhuma gíria encontrada.</p>';
        } else {
            paginatedItems.forEach(giria => giriasDestaqueContainer.appendChild(createGiriaCard(giria)));
        }
        
        prevButton.disabled = currentPage === 1;
        nextButton.disabled = end >= giriasAleatorias.length;
    }
    
    function renderGiriasList(container, giriasList) {
        if (!container) return;
        container.innerHTML = '';
        if (!giriasList || giriasList.length === 0) {
            container.innerHTML = '<p>Nenhuma gíria encontrada.</p>';
            return;
        }
        const isTendencia = container.id === 'tendencias-container';
        giriasList.forEach(giria => container.appendChild(createGiriaCard(giria, isTendencia)));
    }

    function createGiriaCard(giria, showAcessos = false) {
        const giriaCard = document.createElement('a');
        const slug = slugify(giria.nome);
        giriaCard.href = `/giria.html?slug=${slug}`;
        
        giriaCard.classList.add('giria-card');
        const acessosHTML = showAcessos ? `<p style="font-size: 0.9em; color: var(--primary-color); font-weight: 600; margin-top: 10px;">🔥 ${giria.acessos || 0} acessos</p>` : '';
        giriaCard.innerHTML = `<strong>${giria.nome}</strong><span>${giria.significado.substring(0, 100)}${giria.significado.length > 100 ? '...' : ''}</span><p style="font-size: 0.8em; color: #888; margin-top: 5px;">Categoria: ${giria.categoria}</p>${acessosHTML}`;
        
        return giriaCard;
    }

    function displayGiriaDoDia() {
        if (!giriaDoDiaNome || giriasCache.length === 0) {
            if (giriaDoDiaNome) giriaDoDiaNome.textContent = 'Indisponível';
            return;
        }

        // 1. Escolhe a gíria baseada na data
        const now = new Date();
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const dayIndex = Math.floor((startOfDay.getTime() / 86400000) % giriasCache.length);
        const giriaDoDia = giriasCache[dayIndex];

        // 2. Preenche o texto
        giriaDoDiaNome.textContent = giriaDoDia.nome;
        giriaDoDiaSignificado.textContent = ` ${giriaDoDia.significado}`;
        if(giriaDoDiaCategoria) giriaDoDiaCategoria.textContent = ` ${giriaDoDia.categoria}`;

        // 3. FAZ A CAIXA SER CLICÁVEL (Correção)
        const box = document.querySelector('.giria-do-dia');
        if (box) {
            box.style.cursor = 'pointer'; // Mostra a mãozinha
            box.onclick = function() {
                const link = slugify(giriaDoDia.nome);
                window.location.href = `/giria.html?slug=${link}`;
            };
        }
    }

    function displayGiriasCount() {
        if(giriasCountElement) giriasCountElement.textContent = giriasCache.length;
    }

    async function displayTendencias() {
        if (!tendenciasContainer) return;
        const { data: tendencias, error } = await supabase.from('girias').select('*').order('acessos', { ascending: false, nullsFirst: false }).limit(5); 
        if (error) {
            console.error("Erro ao buscar tendências:", error);
            tendenciasContainer.innerHTML = '<p>Não foi possível carregar as tendências.</p>';
            return;
        }
        renderGiriasList(tendenciasContainer, tendencias);
    }
    
    if(closeButton) closeButton.addEventListener('click', () => giriaModal.style.display = 'none');
    window.addEventListener('click', (event) => {
        if (event.target === giriaModal) giriaModal.style.display = 'none';
    });

    // --- BUSCA INTELIGENTE (ENQUANTO DIGITA) ---
    if (searchInput) {
        let debounceTimer;

        searchInput.addEventListener('input', function() {
            clearTimeout(debounceTimer);
            const val = this.value.trim();

            if (val.length < 2) {
                if(suggestionsContainer) suggestionsContainer.style.display = 'none';
                return;
            }

            debounceTimer = setTimeout(async () => {
                const { data, error } = await supabase
                    .from('girias')
                    .select('nome, significado, categoria')
                    .or(`nome.ilike.%${val}%,significado.ilike.%${val}%`) // Busca nome E contexto
                    .limit(5);

                if (data && data.length > 0 && suggestionsContainer) {
                    suggestionsContainer.innerHTML = '';
                    suggestionsContainer.style.display = 'block';

                    data.forEach(g => {
                        const div = document.createElement('div');
                        div.className = 'suggestion-item';
                        div.innerHTML = `
                            <div style="display:flex; justify-content:space-between;">
                                <strong>${g.nome}</strong>
                                <span style="font-size:0.8em; background:#eee; padding:2px 5px; border-radius:3px;">${g.categoria}</span>
                            </div>
                            <em style="font-size:0.9em; color:#666; display:block;">${g.significado.substring(0, 50)}...</em>
                        `;
                        div.onclick = () => {
                            const link = slugify(g.nome);
                            window.location.href = `/giria.html?slug=${link}`;
                        };
                        suggestionsContainer.appendChild(div);
                    });
                } else {
                    if(suggestionsContainer) suggestionsContainer.style.display = 'none';
                }
            }, 300);
        });

        // Fechar ao clicar fora
        document.addEventListener('click', (e) => {
            if (e.target !== searchInput && suggestionsContainer) {
                suggestionsContainer.style.display = 'none';
            }
        });

        // Botão Buscar
        if (searchButton) {
            searchButton.addEventListener('click', () => {
                const val = searchInput.value.trim();
                if(val) window.location.href = `/giria.html?slug=${slugify(val)}`;
            });
        }
        
        // Enter
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                const val = searchInput.value.trim();
                if(val) window.location.href = `/giria.html?slug=${slugify(val)}`;
            }
        });
    }

    if (addGiriaForm) {
        addGiriaForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            formMessage.textContent = 'Enviando...';
            const newGiria = await saveNewGiria({
                nome: document.getElementById('giria-nome').value,
                significado: document.getElementById('giria-significado').value,
                categoria: document.getElementById('giria-categoria').value
            });
            if (newGiria) {
                addGiriaForm.reset();
                formMessage.style.color = 'green';
                formMessage.textContent = 'Gíria adicionada com sucesso!';
                initializePage();
            } else {
                formMessage.style.color = 'red';
                formMessage.textContent = 'Falha ao adicionar a gíria.';
            }
            setTimeout(() => formMessage.textContent = '', 3000);
        });
    }

    if (categoryList) {
        categoryList.addEventListener('click', (e) => {
            if (e.target.tagName === 'LI') {
                const category = e.target.dataset.category.toLowerCase();
                const filteredGirias = giriasCache.filter(giria => giria.categoria.toLowerCase().replace('+', 'p').includes(category));
                document.getElementById('destaques').querySelector('h2').textContent = `Gírias da Categoria: ${e.target.textContent}`;
                giriasAleatorias = filteredGirias;
                currentPage = 1;
                renderGiriasPaginadas();
            }
        });
    }
    
    if (prevButton) prevButton.addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            renderGiriasPaginadas();
        }
    });
    if (nextButton) nextButton.addEventListener('click', () => {
        const maxPage = Math.ceil(giriasAleatorias.length / itemsPerPage);
        if (currentPage < maxPage) {
            currentPage++;
            renderGiriasPaginadas();
        }
    });
    if (refreshButton) refreshButton.addEventListener('click', () => {
        document.getElementById('destaques').querySelector('h2').textContent = "Gírias Aleatórias 🎲";
        giriasAleatorias = shuffleArray(giriasCache);
        currentPage = 1;
        renderGiriasPaginadas();
    });

    async function initializePage() {
        if(giriasDestaqueContainer) giriasDestaqueContainer.innerHTML = '<p>Carregando gírias...</p>';
        await fetchAllGirias();
        if(giriasDestaqueContainer) {
            giriasAleatorias = shuffleArray(giriasCache);
            currentPage = 1;
            renderGiriasPaginadas();
        }
        displayGiriasCount();
        displayGiriaDoDia();
        displayTendencias();
    }
    
    initializePage();
});