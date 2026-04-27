import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim()
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim()

// Mode démo uniquement si Supabase n'est pas configuré.
// Les projets Supabase récents peuvent utiliser des clés `sb_publishable_...`
// au lieu des anciennes clés JWT `eyJ...`.
export const DEMO_MODE = !supabaseUrl || !supabaseAnonKey

export const isDemoMode = DEMO_MODE

const demoResult = { data: null, error: null, count: null, status: 200, statusText: 'OK' }

function createDemoQueryBuilder() {
  const builder = {
    select: () => builder,
    insert: () => builder,
    update: () => builder,
    upsert: () => builder,
    delete: () => builder,
    eq: () => builder,
    neq: () => builder,
    gt: () => builder,
    gte: () => builder,
    lt: () => builder,
    lte: () => builder,
    order: () => builder,
    limit: () => builder,
    single: async () => demoResult,
    maybeSingle: async () => demoResult,
    then: (resolve: (value: typeof demoResult) => unknown) => Promise.resolve(demoResult).then(resolve),
  }

  return builder
}

function createDemoSupabaseClient() {
  return {
    from: () => createDemoQueryBuilder(),
    rpc: async () => demoResult,
    auth: {
      getSession: async () => ({ data: { session: null }, error: null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => undefined } } }),
      signInWithPassword: async () => demoResult,
      signUp: async () => demoResult,
      signOut: async () => demoResult,
    },
    storage: {
      from: () => ({
        upload: async () => demoResult,
        remove: async () => demoResult,
      }),
    },
    functions: {
      invoke: async () => demoResult,
    },
  } as unknown as SupabaseClient
}

export const supabase: SupabaseClient = DEMO_MODE
  ? createDemoSupabaseClient()
  : createClient(supabaseUrl!, supabaseAnonKey!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
