document.addEventListener('DOMContentLoaded', () => {
    // A variável 'supabase' é carregada do supabase-config.js
    if (typeof supabase === 'undefined') {
        console.error("Erro: O cliente Supabase não foi inicializado. Verifique 'supabase-config.js'.");
        return;
    }

    const giriasDestaqueContainer = document.getElementById('girias-destaque-container');
    const searchInput = document.getElementById('search-giria');
    const searchButton = document.getElementById('search-button');
    const addGiriaForm = document.getElementById('add-giria-form');
    const formMessage = document.getElementById('form-message');
    const categoryList = document.querySelector('.category-list');
    const giriaModal = document.getElementById('giriaModal');
    const closeButton = document.querySelector('.close-button');
    const modalGiriaNome = document.getElementById('modal-giria-nome');
    const modalGiriaSignificado = document.getElementById('modal-giria-significado');
    const modalGiriaCategoria = document.getElementById('modal-giria-categoria');
    
    let giriasCache = []; // Cache para evitar múltiplas buscas grandes (pode ser ajustado)

    // --- FUNÇÕES DE INTERAÇÃO COM O SUPABASE ---

    // Busca as gírias do Supabase (com filtro opcional para a busca)
    async function fetchGirias(filter = '') {
        let query = supabase
            .from('girias')
            .select('*')
            .order('created_at', { ascending: false }); 

        if (filter) {
             const lowerCaseFilter = filter.toLowerCase();
             // Busca por 'nome' OU 'significado' (usa o operador 'or' e 'ilike' para ser case-insensitive)
             query = query.or(`nome.ilike.%${lowerCaseFilter}%,significado.ilike.%${lowerCaseFilter}%`);
        }
        
        const { data, error } = await query;
        
        if (error) {
            console.error('Erro ao buscar gírias:', error);
            giriasDestaqueContainer.innerHTML = '<p>Erro ao carregar as gírias. Tente novamente mais tarde.</p>';
            return [];
        }

        giriasCache = data; 
        return data;
    }

    // Salva uma nova gíria no Supabase
    async function saveNewGiria(newGiriaData) {
        const { data, error } = await supabase
            .from('girias')
            .insert([
                { 
                    nome: newGiriaData.nome, 
                    significado: newGiriaData.significado, 
                    categoria: newGiriaData.categoria 
                },
            ])
            .select(); 

        if (error) {
            console.error('Erro ao salvar gíria:', error);
            return false;
        }
        
        // Adiciona o novo item ao cache na primeira posição e retorna sucesso
        giriasCache.unshift(data[0]); 
        return true;
    }

    // --- FUNÇÕES DE RENDERIZAÇÃO E EVENTOS (ADAPTADAS) ---

    // Função para renderizar as gírias
    async function renderGiriasDestaque(dataToRender = null) {
        // Se a chamada for sem dados específicos, carrega do cache ou busca do DB
        if (!dataToRender) {
             if (giriasCache.length === 0) {
                 dataToRender = await fetchGirias(); // Busca se o cache estiver vazio
             } else {
                 dataToRender = giriasCache; // Usa o cache
             }
        }

        giriasDestaqueContainer.innerHTML = '';
        if (dataToRender.length === 0) {
            giriasDestaqueContainer.innerHTML = '<p>Nenhuma gíria encontrada.</p>';
            return;
        }

        dataToRender.forEach(giria => {
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

    // Abre o modal
    function openModal(giria) {
        modalGiriaNome.textContent = giria.nome;
        modalGiriaSignificado.textContent = giria.significado;
        modalGiriaCategoria.textContent = giria.categoria;
        giriaModal.style.display = 'flex';
    }

    // Fecha o modal (eventos sem alteração)
    closeButton.addEventListener('click', () => {
        giriaModal.style.display = 'none';
    });
    window.addEventListener('click', (event) => {
        if (event.target === giriaModal) {
            giriaModal.style.display = 'none';
        }
    });


    // Evento de busca (usa fetchGirias com filtro)
    const handleSearch = async () => {
        const searchTerm = searchInput.value;
        const filteredData = await fetchGirias(searchTerm);
        renderGiriasDestaque(filteredData);
    };

    searchButton.addEventListener('click', handleSearch);

    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            handleSearch();
        }
    });

    // Evento de submissão do formulário (ADAPTADO para salvar)
    addGiriaForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        formMessage.textContent = 'Enviando...';
        formMessage.style.color = '#6a0572'; 
        
        const newGiriaData = {
            nome: document.getElementById('giria-nome').value,
            significado: document.getElementById('giria-significado').value,
            categoria: document.getElementById('giria-categoria').value
        };

        const success = await saveNewGiria(newGiriaData);
        
        if (success) {
            // Re-renderiza a lista usando o cache atualizado
            renderGiriasDestaque(giriasCache); 
            addGiriaForm.reset();
            formMessage.style.color = 'green';
            formMessage.textContent = 'Gíria adicionada com sucesso! Obrigado pela sua contribuição!';
        } else {
            formMessage.style.color = 'red';
            formMessage.textContent = 'Falha ao adicionar a gíria. Verifique a conexão com o Supabase.';
        }
        
        setTimeout(() => {
            formMessage.textContent = '';
        }, 3000);
    });

    // Evento para filtrar por categoria (filtra no cache local após a busca inicial)
    categoryList.addEventListener('click', (e) => {
        if (e.target.tagName === 'LI') {
            const category = e.target.dataset.category;
            
            // Filtra no array de cache local
            const filteredGirias = giriasCache.filter(giria => 
                giria.categoria.toLowerCase().includes(category.toLowerCase()) ||
                (category === 'outras' && !['carioca', 'paulista', 'nordeste', 'lgbtqiapan+', 'gamer', 'internet'].some(cat => giria.categoria.toLowerCase().includes(cat)))
            );

            // Re-renderiza apenas os cards filtrados
            renderGiriasDestaque(filteredGirias);
        }
    });

    // Carrega as gírias do Supabase na primeira vez
    renderGiriasDestaque();
});