const SUPABASE_URL = 'https://msbbyibpqfggdxqcited.supabase.co'; 
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1zYmJ5aWJwcWZnZ2R4cWNpdGVkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIwMjQ2MTEsImV4cCI6MjA3NzYwMDYxMX0.oOSb6vGQ-3vMifVhJ4q9XCZ5uVoNdw0SSDqfvxEb8LU';

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export async function registrarAcesso(id) {
  await supabase.rpc("incrementar_acesso", { giria_id: id });
}
