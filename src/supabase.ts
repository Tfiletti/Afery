import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';

// Agora o sistema busca os dados diretamente do seu arquivo .env
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

// O '!' no final garante ao TypeScript que essas variáveis existem
export const supabase = createClient(supabaseUrl!, supabaseKey!);