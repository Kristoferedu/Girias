document.addEventListener('DOMContentLoaded', async () => {
    // Verifica conexão
    if (!window.db || !window.db.auth) {
        console.error('ERRO: Supabase não carregou.');
        return;
    }
window.loadPlatformNews = async function() {
    const list = document.getElementById('news-list');
    if(!list) return;
    const { data } = await window.db.from('plataforma_novidades').select('*').order('created_at', { ascending: false });
    
    list.innerHTML = '';
    data.forEach(item => {
        list.innerHTML += `
            <div class="list-item">
                <div style="display:flex; justify-content:space-between;">
                    <h3>${item.icone} ${item.titulo}</h3>
                    <button class="reject" style="padding:5px 10px" onclick="deleteNews(${item.id})">Apagar</button>
                </div>
                <p class="muted">${item.descricao}</p>
            </div>
        `;
    });
}

window.openNewsModal = () => document.getElementById('newsModal').style.display = 'flex';

document.getElementById('newsForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = {
        titulo: document.getElementById('newsTitle').value,
        descricao: document.getElementById('newsDesc').value,
        icone: document.getElementById('newsIcon').value,
        status: 'publicado'
    };
    await window.db.from('plataforma_novidades').insert([payload]);
    document.getElementById('newsModal').style.display = 'none';
    loadPlatformNews();
});

window.deleteNews = async (id) => {
    if(confirm("Deseja apagar esta novidade?")) {
        await window.db.from('plataforma_novidades').delete().eq('id', id);
        loadPlatformNews();
    }
}

// Lembre de adicionar "if(tabId === 'novidades') loadPlatformNews();" dentro da sua função switchTab no HTML
    const processedIds = new Set();
    
    // --- 1. LOGIN E SESSÃO ---
    const { data: sessionData } = await window.db.auth.getSession();
    if (!sessionData.session) {
        window.location.href = '/admin/login.html';
        return;
    }
    const sessionEmail = document.getElementById('session-email');
    if (sessionEmail) sessionEmail.textContent = sessionData.session.user.email;

    const logoutBtn = document.getElementById('logout-button');
    if (logoutBtn) logoutBtn.addEventListener('click', async () => {
        await window.db.auth.signOut();
        window.location.href = '/admin/login.html';
    });

    // ============================================================
    // 🛠️ FUNÇÕES DO BLOG (CORREÇÃO DOS BOTÕES)
    // ============================================================
    
    // Tornamos as funções globais (window.) para o HTML conseguir clicar
    window.openBlogModal = function() {
        const modal = document.getElementById('blogModal');
        const form = document.getElementById('blogForm');
        
        if (form) form.reset(); // Limpa o formulário
        document.getElementById('postId').value = ''; // Garante que é um novo post
        document.getElementById('postStatus').value = 'rascunho'; // Padrão
        
        if (modal) modal.style.display = 'flex';
    }

    window.editPost = function(post) {
        const modal = document.getElementById('blogModal');
        if(!modal) return;

        document.getElementById('postId').value = post.id;
        document.getElementById('postTitle').value = post.titulo;
        document.getElementById('postSlug').value = post.slug;
        document.getElementById('postImage').value = post.imagem_url || '';
        document.getElementById('postResumo').value = post.resumo || '';
        document.getElementById('postContent').value = post.conteudo;
        
        // CORREÇÃO: Força o select a selecionar a opção certa
        const statusSelect = document.getElementById('postStatus');
        if(statusSelect) {
            statusSelect.value = post.status; 
        }

        modal.style.display = 'flex';
    }

    // Salvar Post (Novo ou Edição)
    const blogForm = document.getElementById('blogForm');
    if(blogForm) {
        blogForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const btn = e.submitter;
            const txtOrig = btn.textContent;
            btn.disabled = true; 
            btn.textContent = "Salvando...";

            const id = document.getElementById('postId').value;
            const postData = {
                titulo: document.getElementById('postTitle').value,
                slug: document.getElementById('postSlug').value,
                imagem_url: document.getElementById('postImage').value,
                resumo: document.getElementById('postResumo').value,
                conteudo: document.getElementById('postContent').value,
                status: document.getElementById('postStatus').value, // Pega o valor do select
                autor: 'Equipe Gíria Online'
            };

            let result;
            if (id) {
                // Atualizar
                result = await window.db.from('posts').update(postData).eq('id', id);
            } else {
                // Criar
                result = await window.db.from('posts').insert([postData]);
            }

            if (result.error) {
                alert('Erro ao salvar: ' + result.error.message);
                console.error(result.error);
            } else {
                alert('Post salvo com sucesso!');
                document.getElementById('blogModal').style.display = 'none';
                loadBlogPosts(); // Atualiza a lista na hora
            }
            
            btn.disabled = false;
            btn.textContent = txtOrig;
        });
    }

    window.loadBlogPosts = async function() {
        const list = document.getElementById('blog-list');
        if(!list) return;
        list.innerHTML = 'Carregando...';

        const { data, error } = await window.db.from('posts').select('*').order('created_at', { ascending: false });

        if (error) { list.innerHTML = 'Erro ao carregar posts.'; return; }
        if (!data.length) { list.innerHTML = 'Nenhum post encontrado.'; return; }

        list.innerHTML = '';
        data.forEach(post => {
            // Visual do Status
            const isPub = post.status === 'publicado';
            const badgeColor = isPub ? '#22c55e' : '#ff6b6b';
            const badgeText = isPub ? 'NO AR' : 'RASCUNHO';

            const item = document.createElement('div');
            item.className = 'list-item';
            item.innerHTML = `
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <div>
                        <h3 style="margin:0">${escapeHtml(post.titulo)}</h3>
                        <small style="color:#888">${post.slug}</small>
                    </div>
                    <span style="border:1px solid ${badgeColor}; color:${badgeColor}; padding:2px 8px; border-radius:4px; font-size:0.7em; font-weight:bold;">
                        ${badgeText}
                    </span>
                </div>
                <div class="actions" style="margin-top:10px;">
                    <button class="ghost" onclick='editPost(${JSON.stringify(post)})'>✏️ Editar</button>
                </div>
            `;
            list.appendChild(item);
        });
        
        const kpi = document.getElementById('kpi-posts');
        if(kpi) kpi.textContent = data.length;
    }

    // ============================================================
    // 🟢 OUTRAS FUNÇÕES (GÍRIAS E EXEMPLOS) - Mantidas iguais
    // ============================================================
    window.loadPendingGirias = async function() {
        const list = document.getElementById('pending-list');
        if(!list) return;
        
        const { data } = await window.db.from('girias').select('*').eq('status', 'pendente');
        if(!data || !data.length) { list.innerHTML = '<p class="status-text success">Nada pendente.</p>'; return; }

        list.innerHTML = '';
        data.filter(g => !processedIds.has(g.codigo)).forEach(g => {
            const d = document.createElement('div');
            d.className = 'list-item';
            d.innerHTML = `
                <div class="list-item-header"><h3>${escapeHtml(g.nome)}</h3><small>${g.categoria}</small></div>
                <p class="meaning">${escapeHtml(g.significado)}</p>
                <div class="actions">
                    <button class="approve" onclick="updateGiria(${g.codigo}, 'aprovado', this.parentElement.parentElement)">Aprovar</button>
                    <button class="reject" onclick="updateGiria(${g.codigo}, 'rejeitado', this.parentElement.parentElement)">Rejeitar</button>
                </div>`;
            list.appendChild(d);
        });
        updateKPIs();
    }

    window.updateGiria = async function(id, status, card) {
        processedIds.add(id);
        card.style.opacity = '0.5';
        await window.db.from('girias').update({status}).eq('codigo', id);
        card.remove();
        if(!document.getElementById('pending-list').hasChildNodes()) loadPendingGirias();
    }

    window.loadPendingExamples = async function() {
        const list = document.getElementById('examples-list');
        if(!list) return;
        
        const { data } = await window.db.from('sugestoes_exemplos').select('*, girias(nome)').eq('status', 'pendente');
        if(!data || !data.length) { list.innerHTML = '<p class="status-text success">Nada pendente.</p>'; return; }

        list.innerHTML = '';
        data.forEach(ex => {
            const gName = ex.girias?.nome || 'ID ' + ex.giria_id;
            const d = document.createElement('div');
            d.className = 'list-item';
            d.innerHTML = `
                <div class="list-item-header"><p class="eyebrow">Para: <strong>${escapeHtml(gName)}</strong></p></div>
                <p style="font-size:1.1em; color:#fff">"${escapeHtml(ex.conteudo)}"</p>
                <div class="actions">
                    <button class="approve" onclick="approveEx(${ex.id}, this.parentElement.parentElement)">Aprovar</button>
                    <button class="reject" onclick="rejectEx(${ex.id}, this.parentElement.parentElement)">Rejeitar</button>
                </div>`;
            list.appendChild(d);
        });
        updateKPIs();
    }

    window.approveEx = async function(id, card) {
        card.style.opacity = '0.5';
        const { error } = await window.db.rpc('aprovar_exemplo', { exemplo_id: id });
        if(error) alert('Erro: ' + error.message);
        else card.remove();
        if(!document.getElementById('examples-list').hasChildNodes()) loadPendingExamples();
    }

    window.rejectEx = async function(id, card) {
        await window.db.from('sugestoes_exemplos').update({status:'rejeitado'}).eq('id', id);
        card.remove();
        if(!document.getElementById('examples-list').hasChildNodes()) loadPendingExamples();
    }

    function escapeHtml(t) { return t ? t.toString().replace(/</g,"&lt;") : ''; }
    
    async function updateKPIs() {
        try {
            const { count: p } = await window.db.from('girias').select('*', { count: 'exact', head: true }).eq('status', 'pendente');
            const { count: e } = await window.db.from('sugestoes_exemplos').select('*', { count: 'exact', head: true }).eq('status', 'pendente');
            if(document.getElementById('kpi-pendentes')) document.getElementById('kpi-pendentes').textContent = p;
            if(document.getElementById('kpi-exemplos')) document.getElementById('kpi-exemplos').textContent = e;
        } catch(e){}
    }

    // Inicializa
    loadPendingGirias();
    loadPendingExamples();
    loadBlogPosts();
    updateKPIs();
});