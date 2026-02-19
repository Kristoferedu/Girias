// script.js - VERSÃO TOTALMENTE UNIFICADA (Cache + Blog + Popup + Tendências)

document.addEventListener('DOMContentLoaded', () => {
    // 1. VERIFICAÇÃO DE CONEXÃO
    if (typeof window.db === 'undefined') { 
        console.error("Erro: O cliente Supabase (window.db) não foi carregado."); 
        return; 
    }

    // --- SELETORES GLOBAIS ---
    const giriasDestaqueContainer = document.getElementById('girias-destaque-container');
    const tendenciasContainer = document.getElementById('tendencias-container');
    const searchInput = document.getElementById('search-giria');
    const suggestionsContainer = document.getElementById('suggestions-container');
    const giriasCountElement = document.getElementById('girias-count');
    const blogPostsContainer = document.getElementById('container-posts-dinamicos');

    // --- CONFIGURAÇÃO DE CACHE ---
    const CACHE_KEY = 'girias_cache_v1';
    const CACHE_TIME_KEY = 'girias_cache_time';
    const TEMPO_VALIDADE = 24 * 60 * 60 * 1000; // 24 horas

    // --- ESTADO DA APLICAÇÃO ---
    let giriasCache = []; 
    let giriasAleatorias = []; 
    let currentPage = 1;
    const itemsPerPage = 5;

    // ============================================================
    // 🌐 FUNÇÕES DE DADOS (SUPABASE + CACHE)
    // ============================================================

    async function fetchAllGirias(forceUpdate = false) {
        const now = Date.now();
        const savedData = localStorage.getItem(CACHE_KEY);
        const savedTime = localStorage.getItem(CACHE_TIME_KEY);

        if (!forceUpdate && savedData && savedTime) {
            const idade = now - parseInt(savedTime);
            if (idade < TEMPO_VALIDADE) {
                console.log("⚡ Usando gírias do cache local");
                giriasCache = JSON.parse(savedData);
                return giriasCache;
            }
        }

        console.log("🌐 Buscando gírias frescas do Supabase...");
        const { data, error } = await window.db
            .from('girias')
            .select('*')
            .eq('status', 'aprovado')
            .order('created_at', { ascending: false }); 
        
        if (!error && data) {
            localStorage.setItem(CACHE_KEY, JSON.stringify(data));
            localStorage.setItem(CACHE_TIME_KEY, now.toString());
            giriasCache = data;
            return data;
        }
        return [];
    }

    async function carregarPostsPublicos() {
        if (!blogPostsContainer) return;

        const { data: posts, error } = await window.db
            .from('posts')
            .select('*')
            .eq('status', 'publicado') 
            .order('created_at', { ascending: false });

        const loadingMsg = document.getElementById('blog-loading');

        if (error) {
            blogPostsContainer.innerHTML = "<p>Erro ao carregar blog.</p>";
            return;
        }

        if (!posts || posts.length === 0) {
            blogPostsContainer.innerHTML = "<p>Em breve, novos artigos por aqui! 🚀</p>";
            if(loadingMsg) loadingMsg.style.display = 'none';
            return;
        }

        if(loadingMsg) loadingMsg.style.display = 'none';
        
        blogPostsContainer.innerHTML = '';
        posts.forEach(post => {
            const date = new Date(post.created_at).toLocaleDateString('pt-BR');
            const article = document.createElement('article');
            article.className = 'post-card';
            article.innerHTML = `
                ${post.imagem_url ? `<img src="${post.imagem_url}" alt="${post.titulo}" style="width:100%; border-radius:8px; margin-bottom:15px;">` : ''}
                <h3>${post.titulo}</h3>
                <div class="post-meta">Por ${post.autor || 'Equipe'} | ${date}</div>
                <p>${post.resumo || post.conteudo.substring(0, 150) + '...'}</p>
                <a href="/post.html?slug=${post.slug}" style="color:var(--accent-color); font-weight:bold; text-decoration:none;">Ler tudo →</a>
            `;
            blogPostsContainer.appendChild(article);
        });
    }

    async function displayTendencias() {
        if (!tendenciasContainer) return;
        const { data: trends } = await window.db
            .from('girias')
            .select('*')
            .eq('status', 'aprovado')
            .order('acessos', { ascending: false })
            .limit(5);

        if (trends) {
            tendenciasContainer.innerHTML = '';
            trends.forEach(g => {
                const card = document.createElement('a');
                card.href = `/giria.html?slug=${slugify(g.nome)}`;
                card.className = 'giria-card trend-item';
                card.innerHTML = `<strong>${g.nome}</strong><span>${g.significado.substring(0, 70)}...</span><p style="font-size:0.8em; margin-top:10px; color:var(--primary-color)">🔥 ${g.acessos || 0} acessos</p>`;
                tendenciasContainer.appendChild(card);
            });
        }
    }

    // ============================================================
    // 🎨 FUNÇÕES DE INTERFACE (UI)
    // ============================================================

    function slugify(text) {
        return text.toString().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, '-').replace(/[^\w\-]+/g, '');            
    }

    function renderGiriasPaginadas() {
        if (!giriasDestaqueContainer) return;
        giriasDestaqueContainer.innerHTML = '';
        const start = (currentPage - 1) * itemsPerPage;
        const paginatedItems = giriasAleatorias.slice(start, start + itemsPerPage);
        paginatedItems.forEach(g => {
            const div = document.createElement('a');
            div.href = `/giria.html?slug=${slugify(g.nome)}`;
            div.className = 'giria-card';
            div.innerHTML = `<strong>${g.nome}</strong><span>${g.significado.substring(0, 100)}...</span>`;
            giriasDestaqueContainer.appendChild(div);
        });
        
        const prev = document.getElementById('prev-button');
        const next = document.getElementById('next-button');
        if(prev) prev.disabled = currentPage === 1;
        if(next) next.disabled = (start + itemsPerPage) >= giriasAleatorias.length;
    }

    function displayGiriaDoDia() {
        const nomeEl = document.getElementById('giria-do-dia-nome');
        if (!nomeEl || giriasCache.length === 0) return;

        const dayIndex = Math.floor((new Date().setHours(0,0,0,0) / 86400000) % giriasCache.length);
        const g = giriasCache[dayIndex];

        nomeEl.textContent = g.nome;
        const sigEl = document.getElementById('giria-do-dia-significado');
        if(sigEl) sigEl.textContent = g.significado;
        
        const cat = document.getElementById('giria-do-dia-categoria');
        if(cat) { cat.textContent = g.categoria; cat.style.display = 'inline-block'; }

        const box = document.querySelector('.giria-do-dia');
        if (box) {
            box.style.cursor = 'pointer';
            box.onclick = () => window.location.href = `/giria.html?slug=${slugify(g.nome)}`;
        }
    }

    // ============================================================
    // 🚀 POP-UP DE NOVIDADES DINÂMICO
    // ============================================================

    async function gerenciarPopupNovidades() {
        const { data: novidades, error } = await window.db
            .from('plataforma_novidades')
            .select('*')
            .eq('status', 'publicado')
            .order('created_at', { ascending: false })
            .limit(1);

        if (error || !novidades || novidades.length === 0) return;

        const ultimaNovidade = novidades[0];
        const lastSeenId = localStorage.getItem('seen_news_id');

        if (lastSeenId !== ultimaNovidade.id.toString()) {
            const iconEl = document.getElementById('popup-icon');
            const titleEl = document.getElementById('popup-title');
            const descEl = document.getElementById('popup-desc');

            if(iconEl) iconEl.innerText = ultimaNovidade.icone || '🚀';
            if(titleEl) titleEl.innerText = ultimaNovidade.titulo;
            if(descEl) descEl.innerText = ultimaNovidade.descricao;
            
            window.currentNewsId = ultimaNovidade.id;

            setTimeout(() => {
                const popup = document.getElementById('popup-news');
                if (popup) popup.style.display = 'flex';
            }, 2500);
        }
    }

    // Tornando as funções do Popup globais para o onclick no HTML
    window.fecharPopup = () => { document.getElementById('popup-news').style.display = 'none'; };
    window.marcarComoVisto = () => {
        if (window.currentNewsId) localStorage.setItem('seen_news_id', window.currentNewsId.toString());
        window.fecharPopup();
    };

    // ============================================================
    // ⌨️ BUSCA E FORMULÁRIOS
    // ============================================================

    if (searchInput) {
        let debounceTimer;
        searchInput.addEventListener('input', function() {
            clearTimeout(debounceTimer);
            const val = this.value.trim();
            if (val.length < 2) { if(suggestionsContainer) suggestionsContainer.style.display = 'none'; return; }

            debounceTimer = setTimeout(async () => {
                const { data } = await window.db.from('girias')
                    .select('nome, significado').eq('status', 'aprovado')
                    .or(`nome.ilike.%${val}%,significado.ilike.%${val}%`).limit(5);

                if (data && data.length > 0) {
                    suggestionsContainer.innerHTML = '';
                    suggestionsContainer.style.display = 'block';
                    data.forEach(g => {
                        const d = document.createElement('div');
                        d.className = 'suggestion-item';
                        d.innerHTML = `<strong>${g.nome}</strong> - <small>${g.significado.substring(0,30)}...</small>`;
                        d.onclick = () => window.location.href = `/giria.html?slug=${slugify(g.nome)}`;
                        suggestionsContainer.appendChild(d);
                    });
                } else if(suggestionsContainer) { suggestionsContainer.style.display = 'none'; }
            }, 300);
        });
    }

    // ============================================================
    // 🚀 INICIALIZAÇÃO
    // ============================================================

    async function initializePage() {
        await fetchAllGirias();
        
        if (giriasDestaqueContainer) {
            giriasAleatorias = [...giriasCache].sort(() => 0.5 - Math.random());
            renderGiriasPaginadas();
        }

        if (giriasCountElement) giriasCountElement.textContent = giriasCache.length;
        displayGiriaDoDia();
        displayTendencias();
        carregarPostsPublicos();
        gerenciarPopupNovidades();
    }

    const refreshBtn = document.getElementById('refresh-button');
    if(refreshBtn) {
        refreshBtn.addEventListener('click', async () => {
            refreshBtn.textContent = 'Buscando...';
            await fetchAllGirias(true); 
            location.reload(); 
        });
    }

    document.getElementById('next-button')?.addEventListener('click', () => { currentPage++; renderGiriasPaginadas(); });
    document.getElementById('prev-button')?.addEventListener('click', () => { currentPage--; renderGiriasPaginadas(); });

    initializePage();
});

// Registro de Service Worker para Modo Offline
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').catch(err => console.log('SW error:', err));
    });
}