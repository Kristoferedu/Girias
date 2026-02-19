// --- START OF FILE giria.js (VERSÃO FINAL COM POP-UP DINÂMICO) ---

document.addEventListener('DOMContentLoaded', () => {
    if (typeof window.db === 'undefined') {
        console.error("ERRO CRÍTICO: Cliente Supabase (window.db) não encontrado.");
        return;
    }

    const giriaContainer = document.getElementById('giria-detalhe-container');
    const actionsContainer = document.getElementById('actions-container');
    const exemplosContainer = document.getElementById('exemplos-container');
    const relacionadosContainer = document.getElementById('relacionados-container');
    const listaRelacionados = document.getElementById('lista-relacionados');
    const searchInput = document.getElementById('search-giria');
    const searchButton = document.getElementById('search-button');
    const suggestionsContainer = document.getElementById('suggestions-container');
    const btnUp = document.getElementById('btn-upvote');
    const btnDown = document.getElementById('btn-downvote');
    const countUp = document.getElementById('count-up');
    const countDown = document.getElementById('count-down');
    const listaExemplos = document.getElementById('lista-exemplos');
    const formExemplo = document.getElementById('form-exemplo');
    const shareButtonsContainer = document.getElementById('share-buttons-container');
    const giriasCountElement = document.getElementById('girias-count');
    const gDiaNome = document.getElementById('giria-do-dia-nome');
    const gDiaSig = document.getElementById('giria-do-dia-significado');
    const gDiaCat = document.getElementById('giria-do-dia-categoria');

    let currentGiria = null;
    let currentId = null; 

    const getSlug = () => new URLSearchParams(window.location.search).get('slug');
    const unslugify = (s) => decodeURIComponent(s).replace(/-/g, ' ');
    const slugify = (t) => t.toString().toLowerCase().trim().replace(/\s+/g, '-');

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
                const { data } = await window.db
                    .from('girias')
                    .select('nome, significado, categoria')
                    .eq('status', 'aprovado')
                    .or(`nome.ilike.%${val}%,significado.ilike.%${val}%`)
                    .limit(5);

                if (data && data.length > 0 && suggestionsContainer) {
                    suggestionsContainer.innerHTML = '';
                    suggestionsContainer.style.display = 'block';
                    data.forEach(g => {
                        const div = document.createElement('div');
                        div.className = 'suggestion-item';
                        div.innerHTML = `<strong>${g.nome}</strong><br><small>${g.categoria}</small>`;
                        div.onclick = () => window.location.href = `/giria.html?slug=${slugify(g.nome)}`;
                        suggestionsContainer.appendChild(div);
                    });
                } else if(suggestionsContainer) {
                    suggestionsContainer.style.display = 'none';
                }
            }, 300); 
        });
    }

    if (searchButton && searchInput) {
        searchButton.onclick = () => {
            const val = searchInput.value.trim();
            if(val) window.location.href = `/giria.html?slug=${slugify(val)}`;
        };
    }

    async function fetchGiria() {
        const slug = getSlug();
        if (!slug) return;
        const term = unslugify(slug);

        let { data, error } = await window.db
            .from('girias')
            .select('codigo, nome, significado, categoria, exemplos, acessos, created_at, upvotes, downvotes')
            .ilike('nome', term)
            .limit(1);

        if (!data || data.length === 0) {
            const termNoAccent = term.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
            const res = await window.db.from('girias').select('*').ilike('nome', termNoAccent).limit(1);
            if(res.data && res.data.length > 0) data = res.data;
        }

        if (!data || data.length === 0) {
            giriaContainer.innerHTML = `<h2>A gíria "${term}" não foi encontrada.</h2><br><a href="/#adicionar" class="btn-primary" style="text-decoration:none">Sugerir essa gíria</a>`;
            return;
        }

        currentGiria = data[0];
        currentId = currentGiria.codigo;

        const storageKey = `last_view_${currentId}`;
        const now = Date.now();
        const lastView = localStorage.getItem(storageKey);
        const TIME_LIMIT = 30 * 60 * 1000; 

        let shouldCount = (!lastView || (now - parseInt(lastView) > TIME_LIMIT));
        const viewsVisuais = shouldCount ? ((currentGiria.acessos || 0) + 1) : (currentGiria.acessos || 0);
        const dateStr = currentGiria.created_at ? new Date(currentGiria.created_at).toLocaleDateString('pt-BR') : 'Recente';

        giriaContainer.innerHTML = `
            <span class="category-badge">${currentGiria.categoria}</span>
            <h2 style="font-size: 3em; margin: 15px 0; color: var(--primary-color); line-height:1.1;">${currentGiria.nome}</h2>
            <p style="font-size: 1.4em; line-height: 1.6; color: #333;">${currentGiria.significado}</p>
            <div style="margin-top: 25px; padding-top:15px; border-top:1px solid #eee; color: #777; font-size: 0.9em;">
                👁️ <strong>${viewsVisuais}</strong> visualizações | 📅 ${dateStr}
            </div>
        `;

        if (shouldCount) {
            localStorage.setItem(storageKey, now.toString());
            window.db.rpc('incrementar_acesso', { id_para_aumentar: currentId });
        }

        if(actionsContainer) actionsContainer.style.display = 'block';
        if(exemplosContainer) exemplosContainer.style.display = 'block';
        if(relacionadosContainer) relacionadosContainer.style.display = 'block';

        setupVotes();
        renderExamples();
        setupSharing();
        fetchRelated();
    }

    function setupVotes() {
        if(!currentGiria) return;
        countUp.innerText = currentGiria.upvotes || 0;
        countDown.innerText = currentGiria.downvotes || 0;
        const localVote = localStorage.getItem(`vote_${currentId}`);
        updateVoteUI(localVote);
        btnUp.onclick = () => handleVote('up');
        btnDown.onclick = () => handleVote('down');
    }

    async function handleVote(type) {
        if (!currentId) return;
        const key = `vote_${currentId}`;
        const oldVote = localStorage.getItem(key);

        if (oldVote === type) {
            if (type === 'up') {
                countUp.innerText = Math.max(0, parseInt(countUp.innerText) - 1);
                window.db.rpc('decrementar_upvote', { id_para_aumentar: currentId });
            } else {
                countDown.innerText = Math.max(0, parseInt(countDown.innerText) - 1);
                window.db.rpc('decrementar_downvote', { id_para_aumentar: currentId });
            }
            localStorage.removeItem(key);
            updateVoteUI(null);
            return;
        }

        if (oldVote) {
            if (oldVote === 'up') {
                countUp.innerText = Math.max(0, parseInt(countUp.innerText) - 1);
                window.db.rpc('decrementar_upvote', { id_para_aumentar: currentId });
            } else {
                countDown.innerText = Math.max(0, parseInt(countDown.innerText) - 1);
                window.db.rpc('decrementar_downvote', { id_para_aumentar: currentId });
            }
        }

        if (type === 'up') {
            countUp.innerText = parseInt(countUp.innerText) + 1;
            window.db.rpc('incrementar_upvote', { id_para_aumentar: currentId });
        } else {
            countDown.innerText = parseInt(countDown.innerText) + 1;
            window.db.rpc('incrementar_downvote', { id_para_aumentar: currentId });
        }

        localStorage.setItem(key, type);
        updateVoteUI(type);
    }

    function updateVoteUI(vote) {
        btnUp.style.background = '#4CAF50'; 
        btnDown.style.background = '#f44336';
        btnUp.style.opacity = vote === 'up' ? '1' : '0.6'; 
        btnDown.style.opacity = vote === 'down' ? '1' : '0.6';
        btnUp.style.border = vote === 'up' ? '2px solid #2E7D32' : 'none';
        btnDown.style.border = vote === 'down' ? '2px solid #C62828' : 'none';
    }

    function renderExamples() {
        const ex = currentGiria.exemplos || [];
        listaExemplos.innerHTML = ''; 
        if (ex.length === 0) {
            listaExemplos.innerHTML = '<p style="color:#777; font-style:italic;">Nenhum exemplo aprovado ainda.</p>';
        } else {
            ex.forEach(text => {
                const d = document.createElement('div');
                d.style = "background:#f9f9f9; padding:15px; border-left:4px solid var(--secondary-color); margin-bottom:10px; border-radius:4px; font-size:1.1em; color:#333;";
                d.innerText = `"${text}"`;
                listaExemplos.appendChild(d);
            });
        }
    }

    if(formExemplo) {
        formExemplo.addEventListener('submit', async (e) => {
            e.preventDefault();
            const input = document.getElementById('novo-exemplo');
            const texto = input.value.trim();
            if(!texto) return;
            const btn = formExemplo.querySelector('button');
            const originalText = btn.innerText;
            btn.disabled = true; btn.innerText = 'Enviando...';
            const { error } = await window.db
                .from('sugestoes_exemplos')
                .insert([{ giria_id: currentId, conteudo: texto, status: 'pendente' }]);
            if (!error) {
                input.value = '';
                alert("Valeu! Seu exemplo foi enviado para análise.");
            } else {
                alert("Erro: " + error.message);
            }
            btn.disabled = false; btn.innerText = originalText;
        });
    }

    function setupSharing() {
        const url = encodeURIComponent(window.location.href);
        const text = encodeURIComponent(`Olha o que significa "${currentGiria.nome}": `);
        if(shareButtonsContainer) {
            shareButtonsContainer.innerHTML = `
                <a href="https://api.whatsapp.com/send?text=${text}${url}" target="_blank" class="btn-share" style="background:#25D366; color:white; padding:10px 20px; border-radius:5px; text-decoration:none; font-weight:bold;">WhatsApp</a>
                <a href="https://twitter.com/intent/tweet?url=${url}&text=${text}" target="_blank" class="btn-share" style="background:#1DA1F2; color:white; padding:10px 20px; border-radius:5px; text-decoration:none; margin-left:10px; font-weight:bold;">Twitter</a>
            `;
        }
    }

    async function fetchRelated() {
        let { data } = await window.db
            .from('girias')
            .select('nome, significado, categoria')
            .eq('categoria', currentGiria.categoria)
            .neq('codigo', currentId)
            .limit(4);
        if(!data || data.length === 0) {
            const res = await window.db.from('girias').select('nome, significado, categoria').limit(4);
            data = res.data;
        }
        if(listaRelacionados && data) {
            listaRelacionados.innerHTML = '';
            data.forEach(g => {
                const card = document.createElement('a');
                card.href = `/giria.html?slug=${slugify(g.nome)}`;
                card.style = "text-decoration:none; color:inherit; display:block; padding:15px; background:white; border-radius:8px; margin-bottom:10px; border:1px solid #eee; transition:0.2s;";
                card.innerHTML = `<strong style="color:var(--primary-color)">${g.nome}</strong><br><small style="color:#666">${g.significado.substring(0,50)}...</small>`;
                listaRelacionados.appendChild(card);
            });
        }
    }

    async function loadGlobals() {
        const { count } = await window.db.from('girias').select('*', { count: 'exact', head: true });
        if(giriasCountElement) giriasCountElement.innerText = count || 0;
        if(gDiaNome) {
            const { data } = await window.db.from('girias').select('*').limit(30);
            if(data && data.length > 0) {
                const today = data[Math.floor((new Date().getDate() * 7) % data.length)];
                gDiaNome.innerText = today.nome;
                gDiaSig.innerText = today.significado;
                gDiaCat.innerText = today.categoria;
                const box = document.querySelector('.giria-do-dia');
                if(box) box.onclick = () => window.location.href = `/giria.html?slug=${slugify(today.nome)}`;
            }
        }
    }

    fetchGiria();
    loadGlobals();
    
    // Inicia a verificação do pop-up
    gerenciarPopupNovidades();
});

// ============================================================
// 🚀 LÓGICA DO POP-UP DE NOVIDADES DINÂMICO
// ============================================================

async function gerenciarPopupNovidades() {
    if (typeof window.db === 'undefined') return;

    // 1. Busca a novidade mais recente que está publicada
    const { data: novidades, error } = await window.db
        .from('plataforma_novidades')
        .select('*')
        .eq('status', 'publicado')
        .order('created_at', { ascending: false })
        .limit(1);

    if (error || !novidades || novidades.length === 0) return;

    const ultimaNovidade = novidades[0];
    const lastSeenId = localStorage.getItem('seen_news_id');

    // 2. Só mostra se o ID da notícia for diferente do que ele já viu
    if (lastSeenId !== ultimaNovidade.id.toString()) {
        
        // Preenche o pop-up com os dados reais do banco
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

// Tornando as funções globais para serem acessadas pelo HTML onclick
window.fecharPopup = function() {
    const popup = document.getElementById('popup-news');
    if(popup) popup.style.display = 'none';
}

window.marcarComoVisto = function() {
    if (window.currentNewsId) {
        localStorage.setItem('seen_news_id', window.currentNewsId.toString());
    }
    window.fecharPopup();
}