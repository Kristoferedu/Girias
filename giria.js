document.addEventListener('DOMContentLoaded', () => {
    // Verifica se Supabase carregou
    if (typeof supabase === 'undefined') {
        console.error("ERRO CRÍTICO: Cliente Supabase não encontrado.");
        return;
    }

    // --- ELEMENTOS DO DOM ---
    const giriaContainer = document.getElementById('giria-detalhe-container');
    const actionsContainer = document.getElementById('actions-container');
    const exemplosContainer = document.getElementById('exemplos-container');
    const relacionadosContainer = document.getElementById('relacionados-container');
    const listaRelacionados = document.getElementById('lista-relacionados');
    
    // Busca
    const searchInput = document.getElementById('search-giria');
    const searchButton = document.getElementById('search-button');
    const suggestionsContainer = document.getElementById('suggestions-container');

    // Botões e Contadores
    const btnUp = document.getElementById('btn-upvote');
    const btnDown = document.getElementById('btn-downvote');
    const countUp = document.getElementById('count-up');
    const countDown = document.getElementById('count-down');
    const listaExemplos = document.getElementById('lista-exemplos');
    const formExemplo = document.getElementById('form-exemplo');
    const shareButtonsContainer = document.getElementById('share-buttons-container');

    // Sidebar
    const giriasCountElement = document.getElementById('girias-count');
    const gDiaNome = document.getElementById('giria-do-dia-nome');
    const gDiaSig = document.getElementById('giria-do-dia-significado');
    const gDiaCat = document.getElementById('giria-do-dia-categoria');

    // Variável Global
    let currentGiria = null;
    let currentId = null; 

    // --- HELPERS ---
    const getSlug = () => new URLSearchParams(window.location.search).get('slug');
    const unslugify = (s) => decodeURIComponent(s).replace(/-/g, ' ');
    const slugify = (t) => t.toString().toLowerCase().trim().replace(/\s+/g, '-');

    // ============================================================
    // 🔎 SISTEMA DE BUSCA INTELIGENTE (CORRIGIDO)
    // ============================================================
    
    // 1. Buscar enquanto digita
    if (searchInput) {
        let debounceTimer; // Para não travar o banco se digitar muito rápido

        searchInput.addEventListener('input', function() {
            clearTimeout(debounceTimer);
            const val = this.value.trim();

            // Só busca se tiver mais de 2 letras
            if (val.length < 2) {
                if(suggestionsContainer) suggestionsContainer.style.display = 'none';
                return;
            }

            debounceTimer = setTimeout(async () => {
                // Busca no NOME ou no SIGNIFICADO (Contexto)
                // A sintaxe .or() permite buscar em colunas diferentes
                const { data, error } = await supabase
                    .from('girias')
                    .select('nome, significado, categoria')
                    .or(`nome.ilike.%${val}%,significado.ilike.%${val}%`)
                    .limit(5);

                if (data && data.length > 0 && suggestionsContainer) {
                    suggestionsContainer.innerHTML = '';
                    suggestionsContainer.style.display = 'block';

                    data.forEach(g => {
                        const div = document.createElement('div');
                        div.className = 'suggestion-item';
                        // Layout do item da lista
                        div.innerHTML = `
                            <div style="display:flex; justify-content:space-between; align-items:center;">
                                <strong style="color:#1D2D44;">${g.nome}</strong>
                                <span class="category-badge" style="font-size:0.7em; padding:2px 6px; margin:0;">${g.categoria}</span>
                            </div>
                            <div style="font-size:0.85em; color:#666; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">
                                ${g.significado}
                            </div>
                        `;
                        // Ao clicar, vai para a página
                        div.onclick = () => {
                            const link = slugify(g.nome);
                            window.location.href = `/giria.html?slug=${link}`;
                        };
                        suggestionsContainer.appendChild(div);
                    });
                } else {
                    if(suggestionsContainer) suggestionsContainer.style.display = 'none';
                }
            }, 300); // Espera 300ms após parar de digitar
        });

        // 2. Clicar fora fecha a busca
        document.addEventListener('click', (e) => {
            if (e.target !== searchInput && suggestionsContainer) {
                suggestionsContainer.style.display = 'none';
            }
        });

        // 3. Botão buscar força ir para a primeira opção ou busca exata
        if (searchButton) {
            searchButton.addEventListener('click', () => {
                const val = searchInput.value.trim();
                if(val) window.location.href = `/giria.html?slug=${slugify(val)}`;
            });
        }
    }

    // ============================================================
    // FIM DA BUSCA
    // ============================================================

    // --- FUNÇÃO PRINCIPAL DE CARREGAMENTO DA PÁGINA ---
    async function fetchGiria() {
        const slug = getSlug();
        if (!slug) { 
            giriaContainer.innerHTML = '<h2>Gíria não especificada na URL.</h2>'; 
            return; 
        }
        
        const term = unslugify(slug);

        // 1. TENTA BUSCAR NO BANCO (Match Exato)
        let { data, error } = await supabase.from('girias').select('*').ilike('nome', term).limit(1);

        // 2. FALLBACK: Se não achar com acento, tenta buscar sem acento
        if (!data || data.length === 0) {
            const termNoAccent = term.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
            const res = await supabase.from('girias').select('*').ilike('nome', termNoAccent).limit(1);
            if(res.data && res.data.length > 0) data = res.data;
        }

        if (!data || data.length === 0) {
            giriaContainer.innerHTML = `<h2>A gíria "${term}" não foi encontrada :(</h2><a href="/#adicionar" class="btn-primary">Adicionar ela agora!</a>`;
            return;
        }

        currentGiria = data[0];
        currentId = currentGiria.id || currentGiria.codigo; 

        // LÓGICA DE VISUALIZAÇÃO (CRONÔMETRO DE 30 MIN)
        const storageKey = `last_view_${currentId}`;
        const now = Date.now();
        const lastView = localStorage.getItem(storageKey);
        const TIME_LIMIT = 30 * 60 * 1000; 

        let shouldCount = false;
        if (!lastView || (now - parseInt(lastView) > TIME_LIMIT)) {
            shouldCount = true;
        }

        const viewsReais = currentGiria.acessos || 0;
        const viewsVisuais = shouldCount ? (viewsReais + 1) : viewsReais;
        const dateStr = currentGiria.created_at ? new Date(currentGiria.created_at).toLocaleDateString('pt-BR') : 'Data desconhecida';

        giriaContainer.innerHTML = `
            <span class="category-badge">${currentGiria.categoria}</span>
            <h2 style="font-size: 3.5em; margin: 15px 0; color: var(--primary-color); line-height:1.1;">${currentGiria.nome}</h2>
            <p style="font-size: 1.4em; line-height: 1.6; color: #333;">${currentGiria.significado}</p>
            <div style="margin-top: 30px; padding-top:20px; border-top:1px solid #eee; color: #666; font-size: 1em;">
                👁️ <strong style="color:var(--secondary-color)">${viewsVisuais}</strong> visualizações | 📅 ${dateStr}
            </div>
        `;

        if (shouldCount) {
            localStorage.setItem(storageKey, now.toString());
            supabase.rpc('incrementar_acesso', { giria_id: currentId }).then(({ error }) => {
                if(error) console.warn("Sync views:", error.message);
            });
        }

        if(actionsContainer) actionsContainer.style.display = 'block';
        if(exemplosContainer) exemplosContainer.style.display = 'block';
        if(relacionadosContainer) relacionadosContainer.style.display = 'block';

        setupVotes();
        renderExamples();
        setupSharing();
        fetchRelated();
    }

    // --- VOTOS ---
    function setupVotes() {
        if(!currentGiria) return;
        countUp.innerText = currentGiria.upvotes || 0;
        countDown.innerText = currentGiria.downvotes || 0;

        const localVote = localStorage.getItem(`vote_${currentId}`);
        updateVoteUI(localVote);

        btnUp.onclick = () => handleVote('up');
        btnDown.onclick = () => handleVote('down');
    }

    function updateVoteUI(selected) {
        btnUp.style.opacity = '1'; btnDown.style.opacity = '1';
        btnUp.style.border = 'none'; btnDown.style.border = 'none';

        if (selected === 'up') {
            btnUp.style.border = '2px solid #4CAF50';
            btnDown.style.opacity = '0.5';
        } else if (selected === 'down') {
            btnDown.style.border = '2px solid #f44336';
            btnUp.style.opacity = '0.5';
        }
    }

    async function handleVote(newVote) {
        const key = `vote_${currentId}`;
        const oldVote = localStorage.getItem(key);

        if (oldVote === newVote) return; 

        if (oldVote) {
            if (oldVote === 'up') {
                countUp.innerText = Math.max(0, parseInt(countUp.innerText) - 1);
                supabase.rpc('decrementar_upvote', { giria_id: currentId });
            } else {
                countDown.innerText = Math.max(0, parseInt(countDown.innerText) - 1);
                supabase.rpc('decrementar_downvote', { giria_id: currentId });
            }
        }

        if (newVote === 'up') {
            countUp.innerText = parseInt(countUp.innerText) + 1;
            supabase.rpc('incrementar_upvote', { giria_id: currentId });
        } else {
            countDown.innerText = parseInt(countDown.innerText) + 1;
            supabase.rpc('incrementar_downvote', { giria_id: currentId });
        }

        localStorage.setItem(key, newVote);
        updateVoteUI(newVote);
    }

    // --- COMPARTILHAR ---
    function setupSharing() {
        const url = encodeURIComponent(window.location.href);
        const text = encodeURIComponent(`Olha o significado de "${currentGiria.nome}": `);

        if(shareButtonsContainer) {
            shareButtonsContainer.innerHTML = `
                <a href="https://api.whatsapp.com/send?text=${text}${url}" target="_blank" style="background:#25D366; color:white; padding:10px 20px; text-decoration:none; border-radius:5px; font-weight:bold;">WhatsApp</a>
                <a href="https://twitter.com/intent/tweet?text=${text}&url=${url}" target="_blank" style="background:#1DA1F2; color:white; padding:10px 20px; text-decoration:none; border-radius:5px; font-weight:bold;">Twitter</a>
                <button id="btn-copy" style="background:var(--secondary-color); color:white; padding:10px 20px; border:none; border-radius:5px; cursor:pointer; font-weight:bold;">Copiar Link</button>
            `;
            
            document.getElementById('btn-copy').onclick = () => {
                navigator.clipboard.writeText(window.location.href);
                alert("Link copiado!");
            };
        }
    }

    // --- EXEMPLOS ---
    function renderExamples() {
        const exemplos = currentGiria.exemplos || [];
        listaExemplos.innerHTML = '';

        if (exemplos.length === 0) {
            listaExemplos.innerHTML = '<p style="color:#777; font-style:italic;">Nenhum exemplo ainda.</p>';
        } else {
            exemplos.forEach(ex => {
                const div = document.createElement('div');
                div.style = "background: #f9f9f9; padding: 15px; border-left: 4px solid var(--secondary-color); margin-bottom: 10px; border-radius: 4px; color:#444; font-size:1.1em;";
                div.innerText = `"${ex}"`;
                listaExemplos.appendChild(div);
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
            const txtOrig = btn.textContent;
            btn.textContent = 'Enviando...'; btn.disabled = true;

            const { error } = await supabase.rpc('adicionar_exemplo', { 
                giria_id: currentId, 
                novo_exemplo: texto 
            });

            if (!error) {
                if(!currentGiria.exemplos) currentGiria.exemplos = [];
                currentGiria.exemplos.push(texto);
                renderExamples();
                input.value = '';
                alert("Exemplo enviado!");
            } else {
                alert("Erro ao salvar.");
            }
            btn.textContent = txtOrig; btn.disabled = false;
        });
    }

    // --- VEJA TAMBÉM ---
    // --- VEJA TAMBÉM (COM FALLBACK INTELIGENTE) ---
    async function fetchRelated() {
        // Coluna para não repetir a gíria atual na lista
        const colName = currentGiria.id ? 'id' : 'codigo';

        // 1. Tenta buscar gírias da MESMA categoria
        let { data } = await supabase
            .from('girias')
            .select('nome, significado, categoria')
            .eq('categoria', currentGiria.categoria)
            .neq(colName, currentId)
            .limit(4);

        let tituloSugestao = "Veja Também";

        // 2. SE NÃO ACHOU NADA (Fallback), busca quaisquer gírias recentes
        if (!data || data.length === 0) {
            const { data: dataBackup } = await supabase
                .from('girias')
                .select('nome, significado, categoria')
                .neq(colName, currentId) // Só não mostra a atual
                .limit(5);
            
            if (dataBackup && dataBackup.length > 0) {
                data = dataBackup;
                tituloSugestao = "Outras sugestões populares";
            }
        }

        // 3. Verifica se o container existe no HTML
        if (!listaRelacionados) return;

        // Tenta atualizar o título da seção para ficar mais dinâmico
        const sectionTitle = document.querySelector('#relacionados-container h3');
        if (sectionTitle) sectionTitle.innerText = `${tituloSugestao} 👀`;

        // 4. Se ainda assim estiver vazio (banco zerado), avisa
        if (!data || data.length === 0) {
            listaRelacionados.innerHTML = '<p style="color:#888; font-style:italic;">Ainda sem sugestões. Seja o primeiro a adicionar mais!</p>';
            return;
        }

        // 5. Renderiza os Cards
        let html = '';
        data.forEach(g => {
            // Função slugify repetida aqui caso esteja fora de escopo, para garantir links
            const slug = g.nome.toLowerCase().trim()
                .replace(/\s+/g, '-')
                .replace(/[^\w\-\u00C0-\u00FF]+/g, '');

            html += `
                <a href="/giria.html?slug=${slug}" class="giria-card" style="text-decoration:none; color:inherit; display:block; padding:20px; border:1px solid #eef2f5; border-left:6px solid var(--secondary-color); border-radius:8px; background:white; margin-bottom:15px; transition:0.2s;">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                        <strong style="color:var(--primary-color); font-size:1.2em;">${g.nome}</strong>
                        <span style="font-size:0.7em; background:#f0f0f0; padding:2px 6px; border-radius:4px; text-transform:uppercase;">${g.categoria}</span>
                    </div>
                    <span style="font-size:0.95em; color:#666; display:block;">${g.significado.substring(0, 60)}...</span>
                </a>
            `;
        });
        listaRelacionados.innerHTML = html;
    }

    // --- SIDEBAR (Sidebar global da página) ---
    async function loadGlobals() {
        const { count } = await supabase.from('girias').select('*', { count: 'exact', head: true });
        if (count !== null && giriasCountElement) {
            giriasCountElement.innerText = count;
        }

        if(gDiaNome) {
            const { data } = await supabase.from('girias').select('*').limit(50);
            if(data && data.length > 0) {
                const dayIndex = Math.floor((new Date().setHours(0,0,0,0) / 86400000) % data.length);
                const today = data[dayIndex];
                gDiaNome.textContent = today.nome;
                gDiaSig.textContent = today.significado;
                if(gDiaCat) gDiaCat.textContent = today.categoria;
                
                const box = document.querySelector('.giria-do-dia');
                if(box) {
                    box.style.cursor = 'pointer';
                    const linkDay = today.nome.toLowerCase().trim().replace(/\s+/g, '-');
                    box.onclick = () => window.location.href = `/giria.html?slug=${linkDay}`;
                }
            }
        }
    }

    fetchGiria();
    loadGlobals();
});