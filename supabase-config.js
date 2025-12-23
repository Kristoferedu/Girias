const SUPABASE_URL = 'https://bisfmownhjmznungxbti.supabase.co'; 
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJpc2Ztb3duaGptem51bmd4YnRpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY0OTUwMDYsImV4cCI6MjA4MjA3MTAwNn0.6aeBDKhbc3sGE5cIt4IisQdg2TwQMiQgtpI9uTMYynM';

if (window.supabase) {
    window.db = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    console.log("Banco de dados conectado como 'window.db'");
} else {
    console.error("ERRO: A biblioteca do Supabase não carregou antes deste arquivo.");
}