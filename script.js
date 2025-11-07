document.addEventListener('DOMContentLoaded', () => {
    // Verifica se o cliente Supabase foi inicializado
    if (typeof supabase === 'undefined') {
        console.error("Erro: O cliente Supabase não foi inicializado. Verifique a configuração.");
        return;
    }

    // --- SELETORES DE ELEMENTOS DO DOM ---
    const giriasDestaqueContainer = document.getElementById('girias-destaque-container');
    const searchInput = document.getElementById('search-giria');
    const searchButton = document.getElementById('search-button');
    const addGiriaForm = document.getElementById('add-giria-form');
    const formMessage = document.getElementById('form-message');
    const categoryList = document.querySelector('.category-list');
    
    // Modal
    const giriaModal = document.getElementById('giriaModal');
    const closeButton = document.querySelector('.close-button');
    const modalGiriaNome = document.getElementById('modal-giria-nome');
    const modalGiriaSignificado = document.getElementById('modal-giria-significado');
    const modalGiriaCategoria = document.getElementById('modal-giria-categoria');

    // Gíria do Dia
    const giriaDoDiaNome = document.getElementById('giria-do-dia-nome');
    const giriaDoDiaSignificado = document.getElementById('giria-do-dia-significado');
    const giriaDoDiaCategoria = document.getElementById('giria-do-dia-categoria');
    
    let giriasCache = []; // Cache para armazenar todas as gírias

    // --- FUNÇÕES DE INTERAÇÃO COM O SUPABASE ---

    // Busca todas as gírias do Supabase
    async function fetchGirias() {
        const { data, error } = await supabase
            .from('girias')
            .select('*')
            .order('created_at', { ascending: false }); 
        
        if (error) {
            console.error('Erro ao buscar gírias:', error);
            giriasDestaqueContainer.innerHTML = '<p>Erro ao carregar as gírias. Tente novamente mais tarde.</p>';
            return [];
        }

        giriasCache = data; // Armazena no cache
        return data;
    }

    // Salva uma nova gíria no Supabase
    async function saveNewGiria(newGiriaData) {
        const { data, error } = await supabase
            .from('girias')
            .insert([{ 
                nome: newGiriaData.nome, 
                significado: newGiriaData.significado, 
                categoria: newGiriaData.categoria 
            }])
            .select(); 

        if (error) {
            console.error('Erro ao salvar gíria:', error);
            return false;
        }
        
        giriasCache.unshift(data[0]); 
        return true;
    }

    // --- FUNÇÕES DE RENDERIZAÇÃO E LÓGICA ---
    
    // Função para embaralhar um array (algoritmo Fisher-Yates)
    function shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }

    /**
     * NOVO: Busca e exibe a Gíria do Dia.
     */
    async function fetchAndDisplayGiriaDoDia() {
        // Usa o cache se já estiver preenchido
        const girias = giriasCache.length > 0 ? giriasCache : await fetchGirias();

        if (!girias || girias.length === 0) {
            giriaDoDiaNome.textContent = 'Indisponível';
            return;
        }

        // Seleciona uma gíria aleatória
        const randomIndex = Math.floor(Math.random() * girias.length);
        const giriaDoDia = girias[randomIndex];

        // Atualiza o HTML
        giriaDoDiaNome.textContent = giriaDoDia.nome;
        giriaDoDiaSignificado.textContent = ` ${giriaDoDia.significado}`;
        giriaDoDiaCategoria.textContent = ` ${giriaDoDia.categoria}`;
    }

    /**
     * ATUALIZADO: Renderiza as gírias. Se nenhum dado for passado,
     * exibe 10 gírias aleatórias. Se dados forem passados (pelo filtro de categoria),
     * exibe esses dados.
     */
    async function renderGiriasDestaque(dataToRender = null) {
        giriasDestaqueContainer.innerHTML = '<p>Carregando...</p>';
        let giriasToShow;

        if (dataToRender) {
            // Se vier do filtro de categoria, usa os dados filtrados
            giriasToShow = dataToRender;
        } else {
            // Carregamento inicial: busca, embaralha e pega 10
            let allGirias = giriasCache.length > 0 ? giriasCache : await fetchGirias();
            if (allGirias.length > 0) {
                giriasToShow = shuffleArray([...allGirias]).slice(0, 10);
            } else {
                giriasToShow = [];
            }
        }
        
        giriasDestaqueContainer.innerHTML = '';
        if (giriasToShow.length === 0) {
            giriasDestaqueContainer.innerHTML = '<p>Nenhuma gíria encontrada.</p>';
            return;
        }

        giriasToShow.forEach(giria => {
            const giriaCard = document.createElement('div');
            giriaCard.classList.add('giria-card');
            giriaCard.innerHTML = `
                <strong>${giria.nome}</strong>
                <span>${giria.significado}</span>
                <p style="font-size: 0.8em; color: #888; margin-top: 5px;">Categoria: ${giria.categoria}</p>
            `;
            giriaCard.addEventListener('click', () => openModal(giria));
            giriasDestaqueContainer.appendChild(giriaCard);
        });
    }
    
    // Abre o modal com os dados de uma gíria
    function openModal(giria) {
        modalGiriaNome.textContent = giria.nome;
        modalGiriaSignificado.textContent = giria.significado;
        modalGiriaCategoria.textContent = `Categoria: ${giria.categoria}`;
        giriaModal.style.display = 'flex';
    }

    // --- EVENT LISTENERS ---

    // Fecha o modal
    closeButton.addEventListener('click', () => giriaModal.style.display = 'none');
    window.addEventListener('click', (event) => {
        if (event.target === giriaModal) {
            giriaModal.style.display = 'none';
        }
    });

    /**
     * NOVO: Lida com a busca. Procura por uma gíria e abre o modal se encontrar.
     */
    const handleSearch = async () => {
        const searchTerm = searchInput.value.trim();
        if (!searchTerm) {
            alert('Por favor, digite uma gíria para buscar.');
            return;
        }
        
        // Busca no Supabase por uma gíria com nome exato (case-insensitive)
        const { data, error } = await supabase
            .from('girias')
            .select('*')
            .ilike('nome', searchTerm);

        if (error) {
            console.error('Erro na busca:', error);
            alert('Ocorreu um erro ao realizar a busca.');
            return;
        }

        if (data && data.length > 0) {
            openModal(data[0]); // Abre o modal com a gíria encontrada
        } else {
            alert(`A gíria "${searchTerm}" não foi encontrada.`);
        }
    };

    searchButton.addEventListener('click', handleSearch);
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            handleSearch();
        }
    });

    // Adiciona uma nova gíria
    addGiriaForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        formMessage.textContent = 'Enviando...';
        
        const success = await saveNewGiria({
            nome: document.getElementById('giria-nome').value,
            significado: document.getElementById('giria-significado').value,
            categoria: document.getElementById('giria-categoria').value
        });
        
        if (success) {
            renderGiriasDestaque(); // Re-renderiza os destaques
            addGiriaForm.reset();
            formMessage.style.color = 'green';
            formMessage.textContent = 'Gíria adicionada com sucesso!';
        } else {
            formMessage.style.color = 'red';
            formMessage.textContent = 'Falha ao adicionar a gíria.';
        }
        
        setTimeout(() => formMessage.textContent = '', 3000);
    });

    // Filtra gírias por categoria
    categoryList.addEventListener('click', (e) => {
        if (e.target.tagName === 'LI') {
            const category = e.target.dataset.category.toLowerCase();
            const filteredGirias = giriasCache.filter(giria => 
                giria.categoria.toLowerCase().includes(category)
            );
            renderGiriasDestaque(filteredGirias); // Re-renderiza com os dados filtrados
        }
    });

    // --- INICIALIZAÇÃO ---
    // Carrega as gírias em destaque e a gíria do dia ao iniciar a página
    async function initializePage() {
        await renderGiriasDestaque();
        await fetchAndDisplayGiriaDoDia();
    }
    
    initializePage();
});