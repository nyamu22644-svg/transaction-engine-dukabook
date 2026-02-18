import { UserRole, StoreProfile, User, AuthUser } from '../types';
import { supabase, isSupabaseEnabled } from './supabaseClient';
import { createTrialSubscription } from './billingService';
import { generateUniqueAccessCode } from './credentialService';

// ============================================================================
// AUTHENTICATION SERVICE
// ============================================================================

// Re-export generateUniqueAccessCode for backward compatibility
export { generateUniqueAccessCode };

export interface SignUpPayload {
  email: string;
  password: string;
  full_name: string;
  phone?: string;
  storeName?: string;
  businessType?: string;
}

/**
 * Sign up a new user (Store Owner)
 * 
 * FIXED: Create all database records FIRST, then create auth account LAST.
 * This ensures if any step fails, no auth account is created.
 */
export const signUp = async (payload: SignUpPayload): Promise<{ user: AuthUser; store: StoreProfile } | null> => {
  if (!isSupabaseEnabled || !supabase) return null;

  try {
    // STEP 1: Create store FIRST (with temporary owner_id, will update after auth user is created)
    // Let the database auto-generate the UUID ID
    const accessCode = await generateUniqueAccessCode();
    const { data: storeData, error: storeError } = await supabase
      .from('stores')
      .insert({
        owner_id: null, // Will update after auth user is created
        name: payload.storeName || `${payload.full_name}'s Store`,
        business_type: payload.businessType || 'GENERAL',
        access_code: accessCode,
        owner_pin: payload.businessType ? '1234' : '1234', // Default, should be changed
      })
      .select()
      .single();

    if (storeError) {
      console.error('Store creation failed:', storeError);
      throw new Error('Failed to create store. Please try again.');
    }

    const storeId = storeData.id;

    // STEP 2: Check if email already exists in users table (catch early before auth)
    const { data: existingUser } = await supabase
      .from('users')
      .select('*')
      .eq('email', payload.email.toLowerCase())
      .single();

    if (existingUser) {
      // Rollback store creation
      await supabase.from('stores').delete().eq('id', storeId);
      
      // Email already registered
      return {
        user: {
          id: existingUser.id,
          email: existingUser.email,
          full_name: existingUser.full_name,
          role: existingUser.role,
          store_id: existingUser.store_id,
        },
        store: null,
        needsStoreCreation: !existingUser.store_id,
      } as any;
    }

    // STEP 3: Now create the AUTH ACCOUNT (after store is ready and no email conflict)
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: payload.email,
      password: payload.password,
    });

    if (authError) {
      // Auth creation failed - rollback store creation
      await supabase.from('stores').delete().eq('id', storeId);
      console.error('Auth creation failed:', authError);
      throw new Error('Failed to create account. Please try again.');
    }

    if (!authData?.user) {
      // Rollback store
      await supabase.from('stores').delete().eq('id', storeId);
      throw new Error('User creation failed');
    }

    const userId = authData.user.id;

    // STEP 4: Update store with owner_id
    const { error: storeUpdateError } = await supabase
      .from('stores')
      .update({ owner_id: userId })
      .eq('id', storeId);

    if (storeUpdateError) {
      // Rollback: delete store
      await supabase.from('stores').delete().eq('id', storeId);
      throw new Error('Failed to link store to account.');
    }

    // STEP 5: Insert user profile
    const { data: userData, error: userError } = await supabase
      .from('users')
      .insert({
        id: userId,
        email: payload.email,
        full_name: payload.full_name,
        phone: payload.phone,
        role: 'STORE_OWNER',
        password_hash: authData.user.user_metadata?.sub || '',
        store_id: storeId,
      })
      .select()
      .single();

    if (userError) {
      // Rollback: delete created store if user profile insert fails
      try {
        await supabase.from('stores').delete().eq('id', storeId);
      } catch (e) {
        console.error('Failed to rollback store after user insert failure', e);
      }
      throw userError;
    }

    // STEP 6: Create 7-day trial subscription for the new store
    const trialResult = await createTrialSubscription(storeId);
    if (!trialResult) {
      console.warn('Failed to create trial subscription, but signup completed');
    }

    return {
      user: {
        id: userId,
        email: payload.email,
        full_name: payload.full_name,
        role: 'STORE_OWNER',
        store_id: storeId,
        is_active: true,
        created_at: new Date().toISOString(),
      },
      store: storeData as StoreProfile,
    };
  } catch (error) {
    console.error('Signup error:', error);
    const errorMsg = error instanceof Error ? error.message : 'Signup failed. Please try again.';
    // Return null but log the actual error for debugging
    throw new Error(errorMsg);
  }
};

/**
 * Log in user
 */
export const logIn = async (email: string, password: string): Promise<AuthUser | null> => {
  if (!isSupabaseEnabled || !supabase) return null;

  try {
    console.log('Attempting login for:', email);
    
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      console.error('Auth error:', authError.message);
      throw authError;
    }
    if (!authData.user) throw new Error('Login failed');

    console.log('Auth successful, fetching user profile...');

    // Fetch user profile
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', authData.user.id)
      .single();

    if (userError) {
      console.error('User profile error:', userError.message);
      throw userError;
    }

    let storeId = userData.store_id;

    // If no store_id, try to find a store where this user is the owner
    if (!storeId) {
      console.log('No store_id found, checking if user owns a store...');
      const { data: ownedStore } = await supabase
        .from('stores')
        .select('id')
        .eq('owner_id', userData.id)
        .single();

      if (ownedStore) {
        console.log('Found owned store:', ownedStore.id);
        storeId = ownedStore.id;
        
        // Update user record with the store_id
        await supabase
          .from('users')
          .update({ store_id: storeId })
          .eq('id', userData.id);
      }
    }

    console.log('Login complete for store:', storeId);

    const authUser: AuthUser = {
      id: userData.id,
      email: userData.email,
      full_name: userData.full_name,
      phone: userData.phone,
      role: userData.role,
      store_id: storeId,
      is_active: userData.is_active || true,
      created_at: userData.created_at || new Date().toISOString(),
    };
    return authUser;
  } catch (error: any) {
    console.error('Login error:', error?.message || error);
    return null;
  }
};

/**
 * Log out current user
 */
export const logOut = async (): Promise<boolean> => {
  if (!isSupabaseEnabled || !supabase) return false;

  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Logout error:', error);
    return false;
  }
};

/**
 * Get current authenticated user
 */
export const getCurrentUser = async (): Promise<AuthUser | null> => {
  if (!isSupabaseEnabled || !supabase) return null;

  try {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) return null;

    const { data: userData } = await supabase
      .from('users')
      .select('*')
      .eq('id', authUser.id)
      .single();

    if (!userData) return null;

    const currentAuthUser: AuthUser = {
      id: userData.id,
      email: userData.email,
      full_name: userData.full_name,
      phone: userData.phone,
      role: userData.role,
      store_id: userData.store_id,
      is_active: userData.is_active || true,
      created_at: userData.created_at || new Date().toISOString(),
    };
    return currentAuthUser;
  } catch (error) {
    console.error('Get current user error:', error);
    return null;
  }
};

/**
 * Update user password
 */
export const updatePassword = async (newPassword: string): Promise<boolean> => {
  if (!isSupabaseEnabled || !supabase) return false;

  try {
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });
    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Password update error:', error);
    return false;
  }
};

/**
 * Reset password (send reset email)
 */
export const resetPassword = async (email: string): Promise<boolean> => {
  if (!isSupabaseEnabled || !supabase) return false;

  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Password reset error:', error);
    return false;
  }
};

/**
 * Create employee account (Store Owner only)
 */
export const createEmployee = async (
  storeId: string,
  email: string,
  fullName: string,
  password: string,
  phone?: string
): Promise<AuthUser | null> => {
  // NOTE: Requires a server-side service key to use auth.admin safely.
  if (!isSupabaseEnabled || !supabase) return null;

  try {
    // Create auth user
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (authError) throw authError;

    // Create employee profile
    const { data: userData, error: userError } = await supabase
      .from('users')
      .insert({
        id: authData.user.id,
        email,
        full_name: fullName,
        phone,
        role: 'EMPLOYEE',
        store_id: storeId,
      })
      .select()
      .single();

    if (userError) throw userError;

    const newEmployee: AuthUser = {
      id: userData.id,
      email: userData.email,
      full_name: userData.full_name,
      phone: userData.phone,
      role: userData.role,
      store_id: userData.store_id,
      is_active: userData.is_active || true,
      created_at: userData.created_at || new Date().toISOString(),
    };
    return newEmployee;
  } catch (error) {
    console.error('Create employee error:', error);
    return null;
  }
};

/**
 * List employees for a store
 */
export const getStoreEmployees = async (storeId: string): Promise<AuthUser[]> => {
  if (!isSupabaseEnabled || !supabase) return [];

  try {
    const { data: users, error } = await supabase
      .from('users')
      .select('*')
      .eq('store_id', storeId)
      .eq('role', 'EMPLOYEE');

    if (error) throw error;

    const employees: AuthUser[] = users.map(u => ({
      id: u.id,
      email: u.email,
      full_name: u.full_name,
      phone: u.phone,
      role: u.role,
      store_id: u.store_id,
      is_active: u.is_active || true,
      created_at: u.created_at || new Date().toISOString(),
    } as AuthUser));
    return employees;
  } catch (error) {
    console.error('Get employees error:', error);
    return [];
  }
};

/**
 * Update user role (Admin only)
 */
export const updateUserRole = async (userId: string, newRole: UserRole): Promise<boolean> => {
  if (!isSupabaseEnabled || !supabase) return false;

  try {
    const { error } = await supabase
      .from('users')
      .update({ role: newRole })
      .eq('id', userId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Update user role error:', error);
    return false;
  }
};

/**
 * Deactivate user account
 */
export const deactivateUser = async (userId: string): Promise<boolean> => {
  if (!isSupabaseEnabled || !supabase) return false;

  try {
    const { error } = await supabase
      .from('users')
      .update({ is_active: false })
      .eq('id', userId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Deactivate user error:', error);
    return false;
  }
};

/**
 * Log user action for audit trail
 */
export const logUserAction = async (
  userId: string,
  storeId: string,
  action: string,
  description?: string
): Promise<boolean> => {
  if (!isSupabaseEnabled || !supabase) return false;

  try {
    const { error } = await supabase
      .from('user_audit_logs')
      .insert({
        user_id: userId,
        store_id: storeId,
        action,
        description,
        ip_address: await getClientIP(),
        user_agent: navigator.userAgent,
      });

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Log user action error:', error);
    return false;
  }
};

/**
 * Get client IP (requires backend support)
 */
const getClientIP = async (): Promise<string> => {
  try {
    const response = await fetch('https://api.ipify.org?format=json');
    const data = await response.json();
    return data.ip || 'unknown';
  } catch {
    return 'unknown';
  }
};
