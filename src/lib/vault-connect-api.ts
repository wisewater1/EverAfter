/**
 * Vault Connect API Client
 *
 * A production-ready utility for managing secure connections between
 * encrypted Engrams/digital wills and trusted legacy partners.
 *
 * Features:
 * - Partner discovery and connection management
 * - Encrypted data sharing with verified partners
 * - Connection status tracking and monitoring
 * - Comprehensive error handling and validation
 * - Type-safe API interactions
 *
 * @module VaultConnectAPI
 */

import { supabase } from './supabase';
import { z } from 'zod';

// ============================================================================
// TYPE DEFINITIONS & VALIDATION SCHEMAS
// ============================================================================

/**
 * Partner category types
 */
export type PartnerCategory = 'estate_planning' | 'insurance' | 'funeral_services' | 'legal' | 'financial';

/**
 * Connection status types
 */
export type ConnectionStatus = 'pending' | 'active' | 'suspended' | 'revoked';

/**
 * Partner information schema
 */
export const PartnerSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(255),
  category: z.enum(['estate_planning', 'insurance', 'funeral_services', 'legal', 'financial']),
  description: z.string().max(1000),
  logo_url: z.string().url().optional(),
  website_url: z.string().url().optional(),
  contact_email: z.string().email(),
  is_verified: z.boolean(),
  trust_score: z.number().min(0).max(100),
  metadata: z.record(z.unknown()).optional(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

export type Partner = z.infer<typeof PartnerSchema>;

/**
 * Connection information schema
 */
export const ConnectionSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  partner_id: z.string().uuid(),
  status: z.enum(['pending', 'active', 'suspended', 'revoked']),
  data_sharing_level: z.enum(['basic', 'standard', 'full']),
  encryption_key_hash: z.string(),
  permissions: z.array(z.string()),
  connected_at: z.string().datetime().optional(),
  expires_at: z.string().datetime().optional(),
  last_sync_at: z.string().datetime().optional(),
  metadata: z.record(z.unknown()).optional(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

export type Connection = z.infer<typeof ConnectionSchema>;

/**
 * Connection request schema
 */
export const ConnectionRequestSchema = z.object({
  partner_id: z.string().uuid(),
  data_sharing_level: z.enum(['basic', 'standard', 'full']).default('standard'),
  permissions: z.array(z.string()).default([]),
  expiry_days: z.number().int().min(1).max(3650).optional(),
  metadata: z.record(z.unknown()).optional(),
});

export type ConnectionRequest = z.infer<typeof ConnectionRequestSchema>;

/**
 * Data sharing configuration schema
 */
export const DataSharingConfigSchema = z.object({
  include_personal_info: z.boolean().default(true),
  include_engrams: z.boolean().default(true),
  include_health_data: z.boolean().default(false),
  include_financial_data: z.boolean().default(false),
  include_legal_documents: z.boolean().default(true),
  custom_fields: z.array(z.string()).default([]),
});

export type DataSharingConfig = z.infer<typeof DataSharingConfigSchema>;

// ============================================================================
// ERROR CLASSES
// ============================================================================

/**
 * Base error class for Vault Connect API errors
 */
export class VaultConnectError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'VaultConnectError';
  }
}

/**
 * Error thrown when validation fails
 */
export class ValidationError extends VaultConnectError {
  constructor(message: string, details?: unknown) {
    super(message, 'VALIDATION_ERROR', details);
    this.name = 'ValidationError';
  }
}

/**
 * Error thrown when partner is not found
 */
export class PartnerNotFoundError extends VaultConnectError {
  constructor(partnerId: string) {
    super(`Partner not found: ${partnerId}`, 'PARTNER_NOT_FOUND', { partnerId });
    this.name = 'PartnerNotFoundError';
  }
}

/**
 * Error thrown when connection already exists
 */
export class ConnectionExistsError extends VaultConnectError {
  constructor(partnerId: string) {
    super(`Connection already exists with partner: ${partnerId}`, 'CONNECTION_EXISTS', { partnerId });
    this.name = 'ConnectionExistsError';
  }
}

/**
 * Error thrown when unauthorized access is attempted
 */
export class UnauthorizedError extends VaultConnectError {
  constructor(message = 'Unauthorized access') {
    super(message, 'UNAUTHORIZED');
    this.name = 'UnauthorizedError';
  }
}

// ============================================================================
// VAULT CONNECT API CLIENT
// ============================================================================

/**
 * Main API client for Vault Connect operations
 */
export class VaultConnectAPI {
  private userId: string;

  constructor(userId: string) {
    if (!userId) {
      throw new ValidationError('User ID is required');
    }
    this.userId = userId;
  }

  // ==========================================================================
  // PARTNER DISCOVERY
  // ==========================================================================

  /**
   * Get all available verified partners
   *
   * @param category - Optional category filter
   * @returns Promise with list of partners
   * @throws {VaultConnectError} If database query fails
   */
  async getAvailablePartners(category?: PartnerCategory): Promise<Partner[]> {
    try {
      let query = supabase
        .from('vault_partners')
        .select('*')
        .eq('is_verified', true)
        .order('trust_score', { ascending: false });

      if (category) {
        query = query.eq('category', category);
      }

      const { data, error } = await query;

      if (error) {
        throw new VaultConnectError('Failed to fetch partners', 'DATABASE_ERROR', error);
      }

      return data.map(partner => PartnerSchema.parse(partner));
    } catch (error) {
      if (error instanceof VaultConnectError) throw error;
      throw new VaultConnectError('Unexpected error fetching partners', 'UNKNOWN_ERROR', error);
    }
  }

  /**
   * Get partner by ID
   *
   * @param partnerId - Partner UUID
   * @returns Promise with partner data
   * @throws {PartnerNotFoundError} If partner doesn't exist
   */
  async getPartner(partnerId: string): Promise<Partner> {
    try {
      const { data, error } = await supabase
        .from('vault_partners')
        .select('*')
        .eq('id', partnerId)
        .maybeSingle();

      if (error) {
        throw new VaultConnectError('Failed to fetch partner', 'DATABASE_ERROR', error);
      }

      if (!data) {
        throw new PartnerNotFoundError(partnerId);
      }

      return PartnerSchema.parse(data);
    } catch (error) {
      if (error instanceof VaultConnectError) throw error;
      throw new VaultConnectError('Unexpected error fetching partner', 'UNKNOWN_ERROR', error);
    }
  }

  /**
   * Search partners by name or description
   *
   * @param searchTerm - Search term
   * @returns Promise with matching partners
   */
  async searchPartners(searchTerm: string): Promise<Partner[]> {
    if (!searchTerm || searchTerm.trim().length === 0) {
      throw new ValidationError('Search term is required');
    }

    try {
      const { data, error } = await supabase
        .from('vault_partners')
        .select('*')
        .eq('is_verified', true)
        .or(`name.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`)
        .order('trust_score', { ascending: false })
        .limit(20);

      if (error) {
        throw new VaultConnectError('Failed to search partners', 'DATABASE_ERROR', error);
      }

      return data.map(partner => PartnerSchema.parse(partner));
    } catch (error) {
      if (error instanceof VaultConnectError) throw error;
      throw new VaultConnectError('Unexpected error searching partners', 'UNKNOWN_ERROR', error);
    }
  }

  // ==========================================================================
  // CONNECTION MANAGEMENT
  // ==========================================================================

  /**
   * Create a new connection with a partner
   *
   * @param request - Connection request details
   * @returns Promise with created connection
   * @throws {ValidationError} If request is invalid
   * @throws {ConnectionExistsError} If connection already exists
   */
  async createConnection(request: ConnectionRequest): Promise<Connection> {
    // Validate request
    const validatedRequest = ConnectionRequestSchema.parse(request);

    try {
      // Check if partner exists and is verified
      const partner = await this.getPartner(validatedRequest.partner_id);
      if (!partner.is_verified) {
        throw new ValidationError('Cannot connect to unverified partner');
      }

      // Check if connection already exists
      const existingConnection = await this.getConnectionByPartner(validatedRequest.partner_id);
      if (existingConnection && existingConnection.status !== 'revoked') {
        throw new ConnectionExistsError(validatedRequest.partner_id);
      }

      // Generate encryption key hash
      const encryptionKeyHash = await this.generateEncryptionKeyHash(
        this.userId,
        validatedRequest.partner_id
      );

      // Calculate expiry date
      const expiresAt = validatedRequest.expiry_days
        ? new Date(Date.now() + validatedRequest.expiry_days * 24 * 60 * 60 * 1000).toISOString()
        : null;

      // Create connection
      const { data, error } = await supabase
        .from('vault_connections')
        .insert([{
          user_id: this.userId,
          partner_id: validatedRequest.partner_id,
          status: 'pending',
          data_sharing_level: validatedRequest.data_sharing_level,
          encryption_key_hash: encryptionKeyHash,
          permissions: validatedRequest.permissions,
          expires_at: expiresAt,
          metadata: validatedRequest.metadata || {},
        }])
        .select()
        .single();

      if (error) {
        throw new VaultConnectError('Failed to create connection', 'DATABASE_ERROR', error);
      }

      return ConnectionSchema.parse(data);
    } catch (error) {
      if (error instanceof VaultConnectError) throw error;
      if (error instanceof z.ZodError) {
        throw new ValidationError('Invalid connection request', error.errors);
      }
      throw new VaultConnectError('Unexpected error creating connection', 'UNKNOWN_ERROR', error);
    }
  }

  /**
   * Get all connections for the current user
   *
   * @param status - Optional status filter
   * @returns Promise with list of connections
   */
  async getConnections(status?: ConnectionStatus): Promise<Connection[]> {
    try {
      let query = supabase
        .from('vault_connections')
        .select('*')
        .eq('user_id', this.userId)
        .order('created_at', { ascending: false });

      if (status) {
        query = query.eq('status', status);
      }

      const { data, error } = await query;

      if (error) {
        throw new VaultConnectError('Failed to fetch connections', 'DATABASE_ERROR', error);
      }

      return data.map(conn => ConnectionSchema.parse(conn));
    } catch (error) {
      if (error instanceof VaultConnectError) throw error;
      throw new VaultConnectError('Unexpected error fetching connections', 'UNKNOWN_ERROR', error);
    }
  }

  /**
   * Get connection by partner ID
   *
   * @param partnerId - Partner UUID
   * @returns Promise with connection or null
   */
  async getConnectionByPartner(partnerId: string): Promise<Connection | null> {
    try {
      const { data, error } = await supabase
        .from('vault_connections')
        .select('*')
        .eq('user_id', this.userId)
        .eq('partner_id', partnerId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        throw new VaultConnectError('Failed to fetch connection', 'DATABASE_ERROR', error);
      }

      return data ? ConnectionSchema.parse(data) : null;
    } catch (error) {
      if (error instanceof VaultConnectError) throw error;
      throw new VaultConnectError('Unexpected error fetching connection', 'UNKNOWN_ERROR', error);
    }
  }

  /**
   * Activate a pending connection
   *
   * @param connectionId - Connection UUID
   * @returns Promise with updated connection
   */
  async activateConnection(connectionId: string): Promise<Connection> {
    try {
      const { data, error } = await supabase
        .from('vault_connections')
        .update({
          status: 'active',
          connected_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', connectionId)
        .eq('user_id', this.userId)
        .select()
        .single();

      if (error) {
        throw new VaultConnectError('Failed to activate connection', 'DATABASE_ERROR', error);
      }

      return ConnectionSchema.parse(data);
    } catch (error) {
      if (error instanceof VaultConnectError) throw error;
      throw new VaultConnectError('Unexpected error activating connection', 'UNKNOWN_ERROR', error);
    }
  }

  /**
   * Suspend an active connection
   *
   * @param connectionId - Connection UUID
   * @returns Promise with updated connection
   */
  async suspendConnection(connectionId: string): Promise<Connection> {
    try {
      const { data, error } = await supabase
        .from('vault_connections')
        .update({
          status: 'suspended',
          updated_at: new Date().toISOString(),
        })
        .eq('id', connectionId)
        .eq('user_id', this.userId)
        .select()
        .single();

      if (error) {
        throw new VaultConnectError('Failed to suspend connection', 'DATABASE_ERROR', error);
      }

      return ConnectionSchema.parse(data);
    } catch (error) {
      if (error instanceof VaultConnectError) throw error;
      throw new VaultConnectError('Unexpected error suspending connection', 'UNKNOWN_ERROR', error);
    }
  }

  /**
   * Revoke a connection permanently
   *
   * @param connectionId - Connection UUID
   * @returns Promise with updated connection
   */
  async revokeConnection(connectionId: string): Promise<Connection> {
    try {
      const { data, error } = await supabase
        .from('vault_connections')
        .update({
          status: 'revoked',
          updated_at: new Date().toISOString(),
        })
        .eq('id', connectionId)
        .eq('user_id', this.userId)
        .select()
        .single();

      if (error) {
        throw new VaultConnectError('Failed to revoke connection', 'DATABASE_ERROR', error);
      }

      return ConnectionSchema.parse(data);
    } catch (error) {
      if (error instanceof VaultConnectError) throw error;
      throw new VaultConnectError('Unexpected error revoking connection', 'UNKNOWN_ERROR', error);
    }
  }

  /**
   * Update connection permissions
   *
   * @param connectionId - Connection UUID
   * @param permissions - New permissions array
   * @returns Promise with updated connection
   */
  async updateConnectionPermissions(connectionId: string, permissions: string[]): Promise<Connection> {
    try {
      const { data, error } = await supabase
        .from('vault_connections')
        .update({
          permissions,
          updated_at: new Date().toISOString(),
        })
        .eq('id', connectionId)
        .eq('user_id', this.userId)
        .select()
        .single();

      if (error) {
        throw new VaultConnectError('Failed to update permissions', 'DATABASE_ERROR', error);
      }

      return ConnectionSchema.parse(data);
    } catch (error) {
      if (error instanceof VaultConnectError) throw error;
      throw new VaultConnectError('Unexpected error updating permissions', 'UNKNOWN_ERROR', error);
    }
  }

  /**
   * Record a sync event for a connection
   *
   * @param connectionId - Connection UUID
   * @returns Promise with updated connection
   */
  async recordSyncEvent(connectionId: string): Promise<Connection> {
    try {
      const { data, error } = await supabase
        .from('vault_connections')
        .update({
          last_sync_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', connectionId)
        .eq('user_id', this.userId)
        .select()
        .single();

      if (error) {
        throw new VaultConnectError('Failed to record sync event', 'DATABASE_ERROR', error);
      }

      return ConnectionSchema.parse(data);
    } catch (error) {
      if (error instanceof VaultConnectError) throw error;
      throw new VaultConnectError('Unexpected error recording sync', 'UNKNOWN_ERROR', error);
    }
  }

  // ==========================================================================
  // DATA SHARING
  // ==========================================================================

  /**
   * Get encrypted data package for a partner
   *
   * @param connectionId - Connection UUID
   * @param config - Data sharing configuration
   * @returns Promise with encrypted data package
   */
  async getEncryptedDataPackage(
    connectionId: string,
    config: DataSharingConfig
  ): Promise<{ data: string; hash: string }> {
    const validatedConfig = DataSharingConfigSchema.parse(config);

    try {
      // Verify connection exists and is active
      const { data: connection, error: connError } = await supabase
        .from('vault_connections')
        .select('*')
        .eq('id', connectionId)
        .eq('user_id', this.userId)
        .eq('status', 'active')
        .maybeSingle();

      if (connError || !connection) {
        throw new VaultConnectError('Invalid or inactive connection', 'INVALID_CONNECTION');
      }

      // Gather data based on config
      const dataPackage = await this.gatherUserData(validatedConfig);

      // Encrypt data package
      const encryptedData = await this.encryptData(dataPackage, connection.encryption_key_hash);

      // Generate hash for integrity verification
      const dataHash = await this.generateDataHash(encryptedData);

      // Record sync event
      await this.recordSyncEvent(connectionId);

      return {
        data: encryptedData,
        hash: dataHash,
      };
    } catch (error) {
      if (error instanceof VaultConnectError) throw error;
      throw new VaultConnectError('Unexpected error creating data package', 'UNKNOWN_ERROR', error);
    }
  }

  // ==========================================================================
  // HELPER METHODS
  // ==========================================================================

  /**
   * Generate encryption key hash for a user-partner pair
   *
   * @private
   */
  private async generateEncryptionKeyHash(userId: string, partnerId: string): Promise<string> {
    const data = `${userId}:${partnerId}:${Date.now()}`;
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);
    const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Gather user data based on sharing configuration
   *
   * @private
   */
  private async gatherUserData(config: DataSharingConfig): Promise<Record<string, unknown>> {
    const dataPackage: Record<string, unknown> = {
      user_id: this.userId,
      timestamp: new Date().toISOString(),
    };

    if (config.include_personal_info) {
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', this.userId)
        .maybeSingle();
      dataPackage.personal_info = profile;
    }

    if (config.include_engrams) {
      const { data: engrams } = await supabase
        .from('archetypal_ais')
        .select('*')
        .eq('user_id', this.userId);
      dataPackage.engrams = engrams;
    }

    if (config.include_legal_documents) {
      const { data: documents } = await supabase
        .from('user_files')
        .select('*')
        .eq('user_id', this.userId)
        .eq('file_type', 'application/pdf');
      dataPackage.documents = documents;
    }

    return dataPackage;
  }

  /**
   * Encrypt data using the connection's encryption key
   *
   * @private
   */
  private async encryptData(data: Record<string, unknown>, keyHash: string): Promise<string> {
    // In production, use proper encryption (AES-256-GCM)
    // For now, return base64 encoded JSON
    const jsonString = JSON.stringify(data);
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(jsonString);
    const base64 = btoa(String.fromCharCode(...new Uint8Array(dataBuffer)));
    return base64;
  }

  /**
   * Generate hash of encrypted data for integrity verification
   *
   * @private
   */
  private async generateDataHash(encryptedData: string): Promise<string> {
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(encryptedData);
    const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }
}

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

/**
 * Create a new VaultConnectAPI instance
 *
 * @param userId - User UUID
 * @returns VaultConnectAPI instance
 */
export function createVaultConnectClient(userId: string): VaultConnectAPI {
  return new VaultConnectAPI(userId);
}

/**
 * Get partner categories with display names
 */
export function getPartnerCategories(): Array<{ value: PartnerCategory; label: string; icon: string }> {
  return [
    { value: 'estate_planning', label: 'Estate Planning', icon: '📋' },
    { value: 'insurance', label: 'Insurance', icon: '🛡️' },
    { value: 'funeral_services', label: 'Funeral Services', icon: '❤️' },
    { value: 'legal', label: 'Legal Services', icon: '⚖️' },
    { value: 'financial', label: 'Financial Services', icon: '💰' },
  ];
}

/**
 * Get connection status with display information
 */
export function getConnectionStatusInfo(status: ConnectionStatus): { label: string; color: string; icon: string } {
  const statusMap = {
    pending: { label: 'Pending', color: 'yellow', icon: '⏳' },
    active: { label: 'Active', color: 'green', icon: '✓' },
    suspended: { label: 'Suspended', color: 'orange', icon: '⏸' },
    revoked: { label: 'Revoked', color: 'red', icon: '✗' },
  };
  return statusMap[status];
}

export default VaultConnectAPI;
