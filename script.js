// script.js (VERSÃO FINAL E CORRIGIDA)

document.addEventListener('DOMContentLoaded', () => {
    // Verifica se o cliente Supabase foi inicializado
    if (typeof supabase === 'undefined' || !supabase.supabaseUrl) {
        console.error("Erro: O cliente Supabase não foi inicializado corretamente.");
        return;
    }

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
    const modalGiriaNome = document.getElementById('modal-giria-nome');
    const modalGiriaSignificado = document.getElementById('modal-giria-significado');
    const modalGiriaCategoria = document.getElementById('modal-giria-categoria');
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
        const giriaCard = document.createElement('div');
        giriaCard.classList.add('giria-card');
        const acessosHTML = showAcessos ? `<p style="font-size: 0.9em; color: var(--primary-color); font-weight: 600; margin-top: 10px;">🔥 ${giria.acessos || 0} acessos</p>` : '';
        giriaCard.innerHTML = `<strong>${giria.nome}</strong><span>${giria.significado.substring(0, 100)}${giria.significado.length > 100 ? '...' : ''}</span><p style="font-size: 0.8em; color: #888; margin-top: 5px;">Categoria: ${giria.categoria}</p>${acessosHTML}`;
        giriaCard.addEventListener('click', () => openModal(giria));
        return giriaCard;
    }

    function displayGiriaDoDia() {
        if (!giriaDoDiaNome || giriasCache.length === 0) {
            if (giriaDoDiaNome) giriaDoDiaNome.textContent = 'Indisponível';
            return;
        }
        const now = new Date();
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const dayIndex = Math.floor((startOfDay.getTime() / 86400000) % giriasCache.length);
        const giriaDoDia = giriasCache[dayIndex];
        giriaDoDiaNome.textContent = giriaDoDia.nome;
        giriaDoDiaSignificado.textContent = ` ${giriaDoDia.significado}`;
        giriaDoDiaCategoria.textContent = ` ${giriaDoDia.categoria}`;
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
    
    function openModal(giria) {
        supabase.rpc('incrementar_acesso', { giria_id: giria.id }).then(({ error }) => {
            if (error) {
                console.error('Erro ao chamar a função RPC "incrementar_acesso":', error);
            } else {
                const cachedGiria = giriasCache.find(g => g.id === giria.id);
                if (cachedGiria) cachedGiria.acessos = (cachedGiria.acessos || 0) + 1;
                displayTendencias();
            }
        });
        modalGiriaNome.textContent = giria.nome;
        modalGiriaSignificado.textContent = giria.significado;
        modalGiriaCategoria.textContent = `Categoria: ${giria.categoria}`;
        giriaModal.style.display = 'flex';
    }

    // --- EVENT LISTENERS ---
    if(closeButton) closeButton.addEventListener('click', () => giriaModal.style.display = 'none');
    window.addEventListener('click', (event) => {
        if (event.target === giriaModal) giriaModal.style.display = 'none';
    });

    const handleSearch = async () => {
        const searchTerm = searchInput.value.trim();
        if (!searchTerm) {
            alert('Por favor, digite uma gíria para buscar.');
            return;
        }
        const results = await searchGirias(searchTerm);
        if (results && results.length > 0) openModal(results[0]);
        else alert(`A gíria "${searchTerm}" não foi encontrada.`);
    };

    if(searchButton) searchButton.addEventListener('click', handleSearch);
    if(searchInput) searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleSearch();
    });

    if(searchInput) searchInput.addEventListener('input', () => {
        const searchTerm = searchInput.value.trim().toLowerCase();
        if (searchTerm.length < 2) {
            suggestionsContainer.innerHTML = '';
            suggestionsContainer.style.display = 'none';
            return;
        }
        const filteredGirias = giriasCache.filter(g => g.nome.toLowerCase().includes(searchTerm) || g.significado.toLowerCase().includes(searchTerm)).slice(0, 5); 
        suggestionsContainer.innerHTML = '';
        if (filteredGirias.length > 0) {
            filteredGirias.forEach(giria => {
                const item = document.createElement('div');
                item.classList.add('suggestion-item');
                item.innerHTML = `<strong>${giria.nome}</strong><em>${giria.significado.substring(0, 45)}${giria.significado.length > 45 ? '...' : ''}</em>`;
                item.addEventListener('click', () => {
                    searchInput.value = '';
                    suggestionsContainer.innerHTML = '';
                    suggestionsContainer.style.display = 'none';
                    openModal(giria);
                });
                suggestionsContainer.appendChild(item);
            });
            suggestionsContainer.style.display = 'block';
        } else {
            suggestionsContainer.style.display = 'none';
        }
    });
    
    document.addEventListener('click', (e) => {
        if (e.target !== searchInput) {
           if(suggestionsContainer) suggestionsContainer.style.display = 'none';
        }
    });

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

    // --- INICIALIZAÇÃO ---
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