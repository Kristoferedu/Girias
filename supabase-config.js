const SUPABASE_URL = 'https://bisfmownhjmznungxbti.supabase.co'; 
const SUPABASE_ANON_KEY = 'sb_publishable_66Dw-XC1VPEvIaOJmFHEjw_43yLBSLR';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const SUPABASE_SERVICE_ROLE_KEY = 'sb_service_role_66Dw-XC1VPEvIaOJmFHEjw_43yLBSLR';

export { supabase, SUPABASE_SERVICE_ROLE_KEY };