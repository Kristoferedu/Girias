document.addEventListener('DOMContentLoaded', () => {
    if (typeof supabase === 'undefined') {
        console.error("Supabase não foi inicializado.");
        return;
    }

    // --- SELETORES DO DOM ---
    const giriaDetalheContainer = document.getElementById('giria-detalhe-container');
    const giriasCountElement = document.getElementById('girias-count');
    const searchInput = document.getElementById('search-giria');
    const searchButton = document.getElementById('search-button');
    const suggestionsContainer = document.getElementById('suggestions-container');
    const modalGiriaNome = document.getElementById('modal-giria-nome');
    const modalGiriaSignificado = document.getElementById('modal-giria-significado');
    const modalGiriaCategoria = document.getElementById('modal-giria-categoria');
    const giriaModal = document.getElementById('giriaModal');
    const closeButton = document.querySelector('.close-button');
    // NOVOS SELETORES PARA A GÍRIA DO DIA
    const giriaDoDiaNome = document.getElementById('giria-do-dia-nome');
    const giriaDoDiaSignificado = document.getElementById('giria-do-dia-significado');
    const giriaDoDiaCategoria = document.getElementById('giria-do-dia-categoria');

    // NOVA VARIÁVEL: Cache para guardar todas as gírias
    let giriasCache = [];

    // --- FUNÇÕES AUXILIARES ---
    function getGiriaSlugFromQuery() {
        const params = new URLSearchParams(window.location.search);
        return params.get('slug');
    }

    function unslugify(slug) {
        return slug.replace(/-/g, ' ');
    }

    function slugify(text) {
        return text.toString().toLowerCase()
            .replace(/\s+/g, '-')
            .replace(/[^\w\-]+/g, '')
            .replace(/\-\-+/g, '-')
            .replace(/^-+/, '')
            .replace(/-+$/, '');
    }

    // --- LÓGICA DE BUSCA DE DADOS ---

    // NOVA FUNÇÃO: Busca todas as gírias para usar na Gíria do Dia
    async function fetchAllGirias() {
        const { data, error } = await supabase.from('girias').select('*');
        if (error) {
            console.error('Erro ao buscar todas as gírias:', error);
            return;
        }
        giriasCache = data;
    }

    async function fetchAndDisplayGiria() {
        const slug = getGiriaSlugFromQuery();
        if (!slug) {
            giriaDetalheContainer.innerHTML = '<h2>Gíria não encontrada na URL.</h2>';
            return;
        }
        const searchTerm = unslugify(slug);
        const { data, error } = await supabase.from('girias').select('*').ilike('nome', searchTerm).limit(1);

        if (error || data.length === 0) {
            console.error('Erro ao buscar a gíria:', error);
            giriaDetalheContainer.innerHTML = `<h2>A gíria "${searchTerm}" não foi encontrada.</h2>`;
            document.title = `Gíria não encontrada | Gíria Online!`;
            return;
        }

        const giria = data[0];
        supabase.rpc('incrementar_acesso', { giria_id: giria.codigo });

        document.title = `O que significa ${giria.nome}? | Gíria Online!`;
        document.querySelector('meta[name="description"]').setAttribute('content', giria.significado);

        giriaDetalheContainer.innerHTML = `
            <h2 style="font-size: 2.5em;">${giria.nome}</h2>
            <p style="font-size: 1.2em; color: #555;">${giria.significado}</p>
            <div style="margin-top: 20px;">
                <span id="modal-giria-categoria">${giria.categoria}</span>
            </div>
            <p style="margin-top: 30px; font-size: 0.9em; color: #777;">Acessos: ${giria.acessos || 0}</p>
        `;
    }

    // NOVA FUNÇÃO: Lógica para exibir a Gíria do Dia
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

    // --- LÓGICA DA BARRA DE PESQUISA ---
    async function searchGirias(searchTerm) {
        const { data, error } = await supabase.from('girias').select('*').or(`nome.ilike.%${searchTerm}%,significado.ilike.%${searchTerm}%`);
        if (error) {
            console.error('Erro na busca:', error);
            return [];
        }
        return data;
    }

    const handleSearch = async () => {
        const searchTerm = searchInput.value.trim();
        if (!searchTerm) {
            alert('Por favor, digite uma gíria para buscar.');
            return;
        }
        const results = await searchGirias(searchTerm);
        if (results && results.length > 0) {
            const giria = results[0];
            const newSlug = slugify(giria.nome);
            const newUrl = `/giria.html?slug=${newSlug}`;
            history.pushState({ slug: newSlug }, '', newUrl);
            fetchAndDisplayGiria();
        } else {
            alert(`A gíria "${searchTerm}" não foi encontrada.`);
        }
    };
    
    // --- INICIALIZAÇÃO E EVENT LISTENERS ---
    
    // ATUALIZADO: A função de inicialização agora coordena tudo
    async function initializePage() {
        // 1. Busca a gíria principal da URL
        await fetchAndDisplayGiria();
        
        // 2. Busca todas as gírias em segundo plano para o cache
        await fetchAllGirias();
        
        // 3. Usa o cache para exibir o contador e a gíria do dia
        if (giriasCountElement) {
            giriasCountElement.textContent = giriasCache.length;
        }
        displayGiriaDoDia();
    }
    
    initializePage();

    // Event listeners da barra de pesquisa
    searchButton.addEventListener('click', handleSearch);
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleSearch();
    });

    // Event listener para o botão "voltar" do navegador
    window.addEventListener('popstate', fetchAndDisplayGiria);
});