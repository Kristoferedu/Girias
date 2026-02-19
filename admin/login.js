document.addEventListener('DOMContentLoaded', () => {
    if (!window.db || !window.db.auth) {
        console.error('Supabase não carregou corretamente.');
        return;
    }

    const form = document.getElementById('login-form');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const statusText = document.getElementById('form-message');

    // Se já existe sessão ativa, redireciona
    window.db.auth.getSession().then(({ data }) => {
        if (data.session) {
            window.location.href = '/admin/painel.html';
        }
    });

    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        statusText.textContent = '';

        const email = emailInput.value.trim();
        const password = passwordInput.value;

        if (!email || !password) {
            statusText.textContent = 'Preencha e-mail e senha.';
            statusText.className = 'status-text error';
            return;
        }

        statusText.textContent = 'Autenticando...';
        statusText.className = 'status-text';

        const { error } = await window.db.auth.signInWithPassword({ email, password });

        if (error) {
            statusText.textContent = 'Falha ao entrar: ' + (error.message || 'verifique os dados.');
            statusText.className = 'status-text error';
            return;
        }

        statusText.textContent = 'Login realizado! Redirecionando...';
        statusText.className = 'status-text success';
        setTimeout(() => {
            window.location.href = '/admin/painel.html';
        }, 600);
    });
});