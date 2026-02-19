const SUPABASE_URL = 'https://vdtmrlrwkoslcwmnmktt.supabase.co'; 
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZkdG1ybHJ3a29zbGN3bW5ta3R0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE0NTIwODAsImV4cCI6MjA4NzAyODA4MH0.KXK9nd2e0obDdgLgZeET4ABOu9lywblP_J2j67Ti0rI';

if (window.supabase) {
    window.db = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    console.log("Banco de dados conectado como 'window.db'");
} else {
    console.error("ERRO: A biblioteca do Supabase não carregou antes deste arquivo.");
}