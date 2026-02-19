// --- START OF FILE sw.js ---

const CACHE_NAME = 'giria-online-v1';
const ASSETS_TO_CACHE = [
    '/',
    '/index.html',
    '/giria.html',
    '/blog.html',
    '/style.css',
    '/script.js',
    '/giria.js',
    '/supabase-config.js',
    // Adicione aqui suas imagens se tiver (ex: '/logo.png')
    'https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;600;700&display=swap', // Fontes
    'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2' // Biblioteca Supabase
];

// 1. Instalação: Baixa os arquivos essenciais
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('📦 Baixando arquivos para modo offline...');
            return cache.addAll(ASSETS_TO_CACHE);
        })
    );
});

// 2. Ativação: Limpa caches antigos se você atualizar a versão
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keyList) => {
            return Promise.all(keyList.map((key) => {
                if (key !== CACHE_NAME) {
                    console.log('🧹 Limpando cache antigo:', key);
                    return caches.delete(key);
                }
            }));
        })
    );
});

// 3. Interceptação (A Mágica): Tenta Network, se falhar, usa Cache
self.addEventListener('fetch', (event) => {
    // Ignora requisições que não são GET (como salvar votos/comentários)
    if (event.request.method !== 'GET') return;

    event.respondWith(
        fetch(event.request)
            .then((response) => {
                // Se a internet funcionou, atualiza o cache para a próxima vez
                const responseClone = response.clone();
                caches.open(CACHE_NAME).then((cache) => {
                    cache.put(event.request, responseClone);
                });
                return response;
            })
            .catch(() => {
                // Se falhar (sem net), busca no cache
                return caches.match(event.request).then((cachedResponse) => {
                    if (cachedResponse) {
                        return cachedResponse;
                    }
                    // Se não tiver no cache e for uma página HTML, tenta retornar a home
                    if (event.request.headers.get('accept').includes('text/html')) {
                        return caches.match('/');
                    }
                });
            })
    );
});