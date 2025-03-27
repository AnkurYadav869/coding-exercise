/**
 * Authentication and User Management Service
 * 
 * This module provides test utilities for managing test users
 * and authentication in the test environment.
 */
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { PoolClient } from 'pg'

// Constants for test account management
const TEST_USER_SUFFIX = '@example.com'
const SECURE_TEST_PASSWORD = process.env.TEST_USER_PASSWORD || 'securePassword123'

/**
 * Provides methods for user management during tests
 */
export class AuthTestService {
  private readonly anonApiClient: SupabaseClient
  private readonly serviceRoleClient: SupabaseClient
  private readonly pgClient: PoolClient

  /**
   * Creates a new AuthTestService instance
   * 
   * @param anonApiClient - Supabase client with anonymous permissions
   * @param serviceRoleClient - Supabase client with service role permissions
   * @param pgClient - PostgreSQL client for direct database access
   */
  constructor(
    anonApiClient: SupabaseClient, 
    serviceRoleClient: SupabaseClient, 
    pgClient: PoolClient
  ) {
    if (!pgClient) throw new Error('PostgreSQL client is required')
    this.anonApiClient = anonApiClient
    this.serviceRoleClient = serviceRoleClient
    this.pgClient = pgClient
    // Make pgClient read-only to prevent accidental reassignment
    Object.defineProperty(this, 'pgClient', { value: pgClient, writable: false })
  }

  /**
   * Finds a user ID based on email address
   * 
   * @param email - Email to search for
   * @returns User ID if found, null otherwise
   */
  async getUserIdByEmail(email: string): Promise<string | null> {
    if (!this.pgClient) throw new Error('Database connection not available')

    try {
      const result = await this.pgClient.query('SELECT id FROM auth.users WHERE email = $1', [email])
      return result.rows.length > 0 ? result.rows[0].id : null
    } catch (error) {
      console.error(`Failed to retrieve user ID for email: ${email}`, error)
      throw error
    }
  }

  /**
   * Marks a user email as confirmed
   * 
   * @param email - Email to confirm
   */
  async confirmUserEmail(email: string): Promise<void> {
    if (!this.pgClient) throw new Error('Database connection not available')

    // Update confirmation timestamp
    await this.pgClient.query(
      'UPDATE auth.users SET email_confirmed_at = CURRENT_TIMESTAMP WHERE email = $1', 
      [email]
    )
    
    // Verify the update worked
    const result = await this.pgClient.query(
      'SELECT email_confirmed_at FROM auth.users WHERE email = $1', 
      [email]
    )
    
    if (!result.rows[0]?.email_confirmed_at) {
      throw new Error(`Failed to confirm email for user: ${email}`)
    }
  }

  /**
   * Registers a new test user
   * 
   * @param email - Email address for the new user
   * @param password - Password (defaults to secure test password)
   */
  async register(email: string, password: string = SECURE_TEST_PASSWORD): Promise<void> {
    // Create the user account
    const { data, error } = await this.anonApiClient.auth.signUp({ 
      email, 
      password 
    })
    
    if (error) throw error

    // Confirm the email address (for testing convenience)
    const { error: adminError } = await this.serviceRoleClient.auth.admin.updateUserById(
      data.user.id,
      { email_confirm: true }
    )
    
    if (adminError) throw adminError
  }

  /**
   * Logs in as a test user and returns a client with their session
   * 
   * @param userType - Type of user to login as ('user' or 'admin')
   * @returns Tuple with authenticated client and user ID
   */
  async login(userType: 'user' | 'admin'): Promise<[SupabaseClient, string]> {
    const email = `${userType}${TEST_USER_SUFFIX}`
    
    // Ensure email is confirmed
    await this.confirmUserEmail(email)

    // Login with password
    const authResult = await this.anonApiClient.auth.signInWithPassword({
      email,
      password: SECURE_TEST_PASSWORD
    })

    if (authResult.error) throw authResult.error
    const { session } = authResult.data

    // Create a new client with the user's session
    const authenticatedClient = createClient(
      process.env.SUPABASE_URL, 
      process.env.SUPABASE_ANON_KEY, 
      {
        global: { 
          headers: { Authorization: `Bearer ${session.access_token}` } 
        },
        auth: { persistSession: false },
        db: { schema: 'public' }
      }
    )

    return [authenticatedClient, session.user.id]
  }
}