
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ucndvkkndnyqxtiiztvd.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVjbmR2a2tuZG55cXh0aWl6dHZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA0NTE5NjMsImV4cCI6MjA4NjAyNzk2M30.G1B-czmirf9xyK7S--FKCuV_9hQUAAdRE_vuteTSL6I';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
