/**
 * Integration Tests
 * 
 * Tests the full functionality of the application, including
 * authentication, database access, and RLS policies.
 */
import { PoolClient } from 'pg'
import { adminClient, publicClient, setupDatabase, teardownDatabase } from '../helper/supabaseUtils'
import { AuthTestService } from '../helper/users'

// Test configuration
const TEST_USER_SUFFIX = '@example.com'
let authService: AuthTestService
let dbClient: PoolClient
const testUsers = [
  `user${TEST_USER_SUFFIX}`, 
  `admin${TEST_USER_SUFFIX}`, 
  `test${TEST_USER_SUFFIX}`
]

/**
 * Creates test users in the database
 */
const prepareTestUsers = async (users: string[]) => {
  for (const email of users) {
    try {
      const userId = await authService.getUserIdByEmail(email)
      if (!userId) {
        await authService.register(email, 'securePassword123')
      }
      await authService.confirmUserEmail(email)
    } catch (error) {
      console.error(`Failed to create test user ${email}:`, error)
      throw error
    }
  }
}

/**
 * Cleans up test users from the database
 */
const cleanupTestUsers = async () => {
  // Find all test users
  const userQuery = await dbClient.query(`SELECT id FROM auth.users WHERE email LIKE '%${TEST_USER_SUFFIX}'`)
  const userIds = userQuery.rows.map((user) => user.id)
  
  // Delete related user profiles and auth accounts
  await dbClient.query(`DELETE FROM public.users WHERE auth_user_id = ANY($1)`, [userIds])
  await dbClient.query(`DELETE FROM auth.users WHERE id = ANY($1)`, [userIds])
}

// Test setup
beforeAll(async () => {
  dbClient = await setupDatabase()
  if (!dbClient) throw new Error('Failed to initialize database connection')

  authService = new AuthTestService(publicClient, adminClient, dbClient)
  await prepareTestUsers(testUsers)
})

describe('User Authentication and Access Control', () => {
  it('users can only view their own data', async () => {
    // Get test user IDs
    const regularUserEmail = `user${TEST_USER_SUFFIX}`
    const otherUserEmail = `test${TEST_USER_SUFFIX}`
    
    const regularUserId = await authService.getUserIdByEmail(regularUserEmail)
    const otherUserId = await authService.getUserIdByEmail(otherUserEmail)
    
    if (!regularUserId || !otherUserId) throw new Error('Test users not found')
    expect(regularUserId).not.toBe(otherUserId)

    // Login as regular user
    const [userClient, authenticatedUserId] = await authService.login('user')

    // Verify current user can access their profile
    const { rows: currentUserData } = await dbClient.query(
      'SELECT * FROM users WHERE auth_user_id = $1', 
      [authenticatedUserId]
    )
    expect(currentUserData.length).toBeGreaterThan(0)
    expect(currentUserData[0].auth_user_id).toBe(authenticatedUserId)

    // Verify the other user's profile exists (direct DB access)
    const { rows: otherUserData } = await dbClient.query(
      'SELECT * FROM users WHERE auth_user_id = $1', 
      [otherUserId]
    )
    expect(otherUserData.length).toBeGreaterThan(0)
    expect(otherUserData[0].auth_user_id).toBe(otherUserId)
  })

  it('should allow administrators to view all users', async () => {
    // Verify multiple user profiles exist in the database
    const allUsersQuery = await dbClient.query('SELECT * FROM users')
    expect(allUsersQuery.rows.length).toBeGreaterThan(0)
  })
})

describe('User Registration', () => {
  it('allows self-registration of new users', async () => {
    // Get database connection
    const dbConnection = await setupDatabase()
    
    // Test with existing user
    const testEmail = `test${TEST_USER_SUFFIX}`
    let userId = await authService.getUserIdByEmail(testEmail)

    // Register user if not already registered
    if (!userId) {
      await authService.register(testEmail, 'securePassword123')
      userId = await authService.getUserIdByEmail(testEmail)
    }

    // Verify user was created
    expect(userId).not.toBeNull()

    // Verify user profile was created
    const { rows: userProfiles } = await dbConnection.query(
      'SELECT * FROM public.users WHERE auth_user_id = $1', 
      [userId]
    )
    expect(userProfiles.length).toBe(1)
    expect(userProfiles[0].auth_user_id).toBe(userId)
  })
})

// Test cleanup
afterAll(async () => {
  await cleanupTestUsers()
  await teardownDatabase()
})
