import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://qtryzofqaxnmidahasus.supabase.co';
const supabaseKey = 'sb_publishable_4rJ2cTC_Sl-r6v4Su9NYOQ_LsCB-OU9';

export const supabase = createClient(supabaseUrl, supabaseKey);

