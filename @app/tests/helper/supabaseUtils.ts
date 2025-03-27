/**
 * Database and Supabase Client Utilities
 * 
 * This module provides functionality for connecting to Supabase and PostgreSQL
 * with proper configuration for testing purposes.
 */
import { createClient } from '@supabase/supabase-js'
import { Pool, PoolClient } from 'pg'

// Configuration constants from environment variables
const SUPABASE_ENDPOINT = process.env.SUPABASE_URL
const ANON_API_KEY = process.env.SUPABASE_ANON_KEY
const SERVICE_API_KEY = process.env.SUPABASE_SERVICE_KEY
const POSTGRES_CONNECTION_STRING = process.env.DATABASE_URL

// Create Supabase clients with appropriate configuration
export const publicClient = createClient(SUPABASE_ENDPOINT, ANON_API_KEY, { 
  auth: { persistSession: false },
  db: { schema: 'public' }
})

export const adminClient = createClient(SUPABASE_ENDPOINT, SERVICE_API_KEY, { 
  auth: { persistSession: false },
  db: { schema: 'public' }
})

// Database connection management
let dbPool: Pool
let dbConnection: PoolClient | null = null

/**
 * Initializes a connection to the database
 * Creates a connection pool if not already created
 * Returns a client that can be used for database operations
 */
export const setupDatabase = async (): Promise<PoolClient> => {
  if (!dbPool) {
    dbPool = new Pool({ connectionString: POSTGRES_CONNECTION_STRING })
  }
  
  if (!dbConnection) {
    dbConnection = await dbPool.connect()
  }
  
  return dbConnection
}

/**
 * Safely closes database connections
 * Should be called after tests are complete to clean up resources
 */
export const teardownDatabase = async (): Promise<void> => {
  try {
    if (dbConnection) {
      await dbConnection.release()
    }
  } catch (error) {
    console.error('Failed to release database connection:', error)
  } finally {
    if (dbPool) {
      await dbPool.end()
    }
  }
}
