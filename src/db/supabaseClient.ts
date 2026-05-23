import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { envConfig, hasSupabaseConfig } from '@/config/env'

let client: SupabaseClient | null = null

export function getSupabaseClient(): SupabaseClient | null {
  if (!hasSupabaseConfig()) return null
  if (!client) {
    client = createClient(envConfig.supabaseUrl!, envConfig.supabaseAnonKey!, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    })
  }
  return client
}

export async function testSupabaseConnection(): Promise<boolean> {
  const supabase = getSupabaseClient()
  if (!supabase) return false
  try {
    const { error } = await supabase.from('audit_entries').select('id').limit(1)
    return !error
  } catch {
    return false
  }
}
