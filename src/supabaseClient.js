import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://cukbmobwyrtbletwtfxh.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN1a2Jtb2J3eXJ0YmxldHd0ZnhoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk5OTkzNTEsImV4cCI6MjA4NTU3NTM1MX0.H5rAdIuz-pfuzJgeJKR8d4gUvMC_yQwhsKUlC-LlGrU'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)