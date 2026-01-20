/**
 * Supabase Storage Service for XnRoot Application
 * 
 * This module provides Supabase database functionality using vanilla JavaScript
 * Direct connection to Supabase - No offline fallback
 * 
 * Features:
 * - Direct Supabase REST API calls (no library needed)
 * - Player stats management (CRUD operations)
 * - Real-time data synchronization
 * - Cloud-only storage
 */

(function () {
  'use strict';

  // Supabase Configuration
  const SUPABASE_CONFIG = {
    url: 'https://pbjcnavaeccyqkvizuqg.supabase.co', // Ganti dengan URL Supabase Anda
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBiamNuYXZhZWNjeXFrdml6dXFnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg5MDUxODgsImV4cCI6MjA4NDQ4MTE4OH0.O5WWNmt1_3PR5vOAuwhtH5JVXnczn27Dk7IN6KsqM4o', // Ganti dengan Anon Key Supabase Anda
    tableName: 'player_stats' // Nama tabel di Supabase
  };

  /**
   * Result class untuk konsistensi dengan storage.js
   */
  class SupabaseResult {
    constructor(success, data, error) {
      this._success = success;
      this._data = data;
      this._error = error;
    }

    static ok(data) {
      return new SupabaseResult(true, data, undefined);
    }

    static error(error) {
      return new SupabaseResult(false, undefined, error);
    }

    get isOk() {
      return this._success;
    }

    get isError() {
      return !this._success;
    }

    get data() {
      if (!this._success) {
        throw new Error("Cannot access data on error result");
      }
      return this._data;
    }

    get error() {
      if (this._success) {
        throw new Error("Cannot access error on success result");
      }
      return this._error;
    }
  }

  /**
   * Supabase HTTP Client
   * Menangani semua request ke Supabase REST API
   */
  class SupabaseHTTPClient {
    constructor(url, apiKey) {
      this.baseUrl = url;
      this.apiKey = apiKey;
      this.headers = {
        'apikey': apiKey,
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      };
    }

    /**
     * GET request
     */
    async get(table, filters = {}) {
      try {
        let url = `${this.baseUrl}/rest/v1/${table}?select=*`;

        // Add filters if provided
        Object.keys(filters).forEach(key => {
          url += `&${key}=eq.${filters[key]}`;
        });

        const response = await fetch(url, {
          method: 'GET',
          headers: this.headers
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        return { success: true, data };
      } catch (error) {
        console.error('[Supabase Client] GET error:', error);
        return { success: false, error: error.message };
      }
    }

    /**
     * POST request (Create)
     */
    async post(table, record) {
      try {
        const response = await fetch(`${this.baseUrl}/rest/v1/${table}`, {
          method: 'POST',
          headers: this.headers,
          body: JSON.stringify(record)
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        return { success: true, data: data[0] || data };
      } catch (error) {
        console.error('[Supabase Client] POST error:', error);
        return { success: false, error: error.message };
      }
    }

    /**
     * PATCH request (Update)
     */
    async patch(table, id, record) {
      try {
        const response = await fetch(`${this.baseUrl}/rest/v1/${table}?id=eq.${id}`, {
          method: 'PATCH',
          headers: this.headers,
          body: JSON.stringify(record)
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        return { success: true, data: data[0] || data };
      } catch (error) {
        console.error('[Supabase Client] PATCH error:', error);
        return { success: false, error: error.message };
      }
    }

    /**
     * DELETE request
     */
    async delete(table, id) {
      try {
        const response = await fetch(`${this.baseUrl}/rest/v1/${table}?id=eq.${id}`, {
          method: 'DELETE',
          headers: this.headers
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
        }

        return { success: true };
      } catch (error) {
        console.error('[Supabase Client] DELETE error:', error);
        return { success: false, error: error.message };
      }
    }
  }

  /**
   * Supabase Storage Service
   * API utama untuk manajemen player stats
   */
  class SupabaseStorageService {
    constructor() {
      this.client = null;
      this.dataHandler = null;
      this.initialized = false;
      this.config = SUPABASE_CONFIG;
      this.realtimeSubscription = null;
    }

    /**
     * Validasi konfigurasi Supabase
     */
    _validateConfig() {
      if (!this.config.url || this.config.url === 'YOUR_SUPABASE_URL') {
        throw new Error('Supabase URL belum dikonfigurasi. Silakan update SUPABASE_CONFIG.url');
      }
      if (!this.config.anonKey || this.config.anonKey === 'YOUR_SUPABASE_ANON_KEY') {
        throw new Error('Supabase Anon Key belum dikonfigurasi. Silakan update SUPABASE_CONFIG.anonKey');
      }
    }

    /**
     * Set konfigurasi Supabase secara dinamis
     */
    setConfig(url, anonKey, tableName = 'player_stats') {
      this.config.url = url;
      this.config.anonKey = anonKey;
      this.config.tableName = tableName;

      // Reinitialize client dengan config baru
      this.client = new SupabaseHTTPClient(this.config.url, this.config.anonKey);

      if (window.DEBUG_MODE) {
        console.log('[Supabase Service] Configuration updated');
      }
    }

    /**
     * Initialize Supabase service
     */
    async init(handler) {
      try {
        this._validateConfig();

        this.dataHandler = handler;
        this.client = new SupabaseHTTPClient(this.config.url, this.config.anonKey);
        this.initialized = true;

        // Load initial data
        const result = await this.read();

        if (result.isOk && this.dataHandler && this.dataHandler.onDataChanged) {
          this.dataHandler.onDataChanged(result.data);
        }

        console.info('[Supabase Service] Initialized successfully ✓');
        return SupabaseResult.ok(undefined);
      } catch (error) {
        console.error('[Supabase Service] Initialization failed:', error);
        return SupabaseResult.error(error.message);
      }
    }

    /**
     * Create player stats record
     */
    async create(record) {
      try {
        if (!this.initialized) {
          throw new Error('Service not initialized. Call init() first.');
        }

        // Prepare record for Supabase - support both snake_case and camelCase
        const supabaseRecord = {
          player_name: record.player_name || record.playerName || record.name || 'Unknown',
          total_score: record.total_score || record.totalScore || 0,
          // Level scores
          level_1_score: record.level_1_score || 0,
          level_2_score: record.level_2_score || 0,
          level_3_score: record.level_3_score || 0,
          // Game statistics - support both singular and plural
          game_played: record.game_played !== undefined ? record.game_played : (record.games_played !== undefined ? record.games_played : (record.gamesPlayed || 0)),
          correct_answers: record.correct_answers !== undefined ? record.correct_answers : (record.correct_answer !== undefined ? record.correct_answer : (record.correctAnswers || 0)),
          wrong_answers: record.wrong_answers !== undefined ? record.wrong_answers : (record.wrong_answer !== undefined ? record.wrong_answer : (record.wrongAnswers || 0)),
          average_score: record.average_score !== undefined ? record.average_score : (record.averageScore || 0),
          // Other fields
          badges: typeof record.badges === 'string' ? record.badges : (record.badges || ''),
          video_watched: record.video_watched || 0,
          materials_read: record.materials_read || '',
          experiments_done: record.experiments_done || 0,
          total_questions: record.total_questions || 0,
          correct_streak: record.correct_streak || 0,
          inquiry_phases_read: record.inquiry_phases_read || '',
          level_attempts: record.level_attempts || '',
          cptp_read: record.cptp_read || false,
          hypotheses_written: record.hypotheses_written || 0,
          last_played: record.last_played || record.lastPlayed || new Date().toISOString(),
          created_at: record.created_at || new Date().toISOString()
        };

        if (window.DEBUG_MODE) {
          console.log('[Supabase Service] Creating record:', supabaseRecord);
        }

        const response = await this.client.post(this.config.tableName, supabaseRecord);

        if (!response.success) {
          throw new Error(response.error);
        }

        // Notify handler
        if (this.dataHandler && this.dataHandler.onDataChanged) {
          const allData = await this.read();
          if (allData.isOk) {
            this.dataHandler.onDataChanged(allData.data);
          }
        }

        if (window.DEBUG_MODE) {
          console.log('[Supabase Service] Created record:', response.data.id);
        }

        return SupabaseResult.ok(response.data);
      } catch (error) {
        console.error('[Supabase Service] Create failed:', error);
        return SupabaseResult.error(error.message);
      }
    }

    /**
     * Read all player stats
     */
    async read(filters = {}) {
      try {
        if (!this.initialized) {
          throw new Error('Service not initialized. Call init() first.');
        }

        const response = await this.client.get(this.config.tableName, filters);

        if (!response.success) {
          throw new Error(response.error);
        }

        // Transform Supabase data to app format - support both formats
        const transformedData = response.data.map(item => ({
          __backendId: item.id,
          id: item.id,
          // Support both snake_case (for Index.html) and camelCase (for examples)
          player_name: item.player_name,
          playerName: item.player_name,
          name: item.player_name,
          total_score: item.total_score,
          totalScore: item.total_score,
          // Level scores
          level_1_score: item.level_1_score,
          level_2_score: item.level_2_score,
          level_3_score: item.level_3_score,
          // Game statistics - support both singular and plural
          game_played: item.game_played || item.games_played,
          games_played: item.games_played || item.game_played,
          gamesPlayed: item.game_played || item.games_played,
          correct_answer: item.correct_answers || item.correct_answer,
          correct_answers: item.correct_answers || item.correct_answer,
          correctAnswers: item.correct_answers || item.correct_answer,
          wrong_answer: item.wrong_answers || item.wrong_answer,
          wrong_answers: item.wrong_answers || item.wrong_answer,
          wrongAnswers: item.wrong_answers || item.wrong_answer,
          average_score: item.average_score,
          averageScore: item.average_score,
          // Other fields
          badges: item.badges || '',
          video_watched: item.video_watched,
          materials_read: item.materials_read,
          experiments_done: item.experiments_done,
          total_questions: item.total_questions,
          correct_streak: item.correct_streak,
          inquiry_phases_read: item.inquiry_phases_read,
          level_attempts: item.level_attempts,
          cptp_read: item.cptp_read,
          hypotheses_written: item.hypotheses_written,
          last_played: item.last_played,
          lastPlayed: item.last_played,
          created_at: item.created_at,
          createdAt: item.created_at
        }));

        if (window.DEBUG_MODE) {
          console.log('[Supabase Service] Read records:', transformedData.length);
        }

        return SupabaseResult.ok(transformedData);
      } catch (error) {
        console.error('[Supabase Service] Read failed:', error);
        return SupabaseResult.error(error.message);
      }
    }

    /**
     * Update player stats
     */
    async update(record) {
      try {
        if (!this.initialized) {
          throw new Error('Service not initialized. Call init() first.');
        }

        if (!record.__backendId && !record.id) {
          throw new Error('Record must have __backendId or id to update');
        }

        const id = record.__backendId || record.id;

        // Prepare update data - support both snake_case and camelCase
        const updateData = {
          player_name: record.player_name || record.playerName || record.name,
          total_score: record.total_score !== undefined ? record.total_score : record.totalScore,
          // Level scores
          level_1_score: record.level_1_score,
          level_2_score: record.level_2_score,
          level_3_score: record.level_3_score,
          // Game statistics - support both singular and plural
          game_played: record.game_played !== undefined ? record.game_played : (record.games_played !== undefined ? record.games_played : record.gamesPlayed),
          correct_answers: record.correct_answers !== undefined ? record.correct_answers : (record.correct_answer !== undefined ? record.correct_answer : record.correctAnswers),
          wrong_answers: record.wrong_answers !== undefined ? record.wrong_answers : (record.wrong_answer !== undefined ? record.wrong_answer : record.wrongAnswers),
          average_score: record.average_score !== undefined ? record.average_score : record.averageScore,
          // Other fields
          badges: typeof record.badges === 'string' ? record.badges : (record.badges || ''),
          video_watched: record.video_watched,
          materials_read: record.materials_read,
          experiments_done: record.experiments_done,
          total_questions: record.total_questions,
          correct_streak: record.correct_streak,
          inquiry_phases_read: record.inquiry_phases_read,
          level_attempts: record.level_attempts,
          cptp_read: record.cptp_read,
          hypotheses_written: record.hypotheses_written,
          last_played: record.last_played || record.lastPlayed || new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        const response = await this.client.patch(this.config.tableName, id, updateData);

        if (!response.success) {
          throw new Error(response.error);
        }

        // Notify handler
        if (this.dataHandler && this.dataHandler.onDataChanged) {
          const allData = await this.read();
          if (allData.isOk) {
            this.dataHandler.onDataChanged(allData.data);
          }
        }

        if (window.DEBUG_MODE) {
          console.log('[Supabase Service] Updated record:', id);
        }

        return SupabaseResult.ok(response.data);
      } catch (error) {
        console.error('[Supabase Service] Update failed:', error);
        return SupabaseResult.error(error.message);
      }
    }

    /**
     * Delete player stats
     */
    async delete(record) {
      try {
        if (!this.initialized) {
          throw new Error('Service not initialized. Call init() first.');
        }

        if (!record.__backendId && !record.id) {
          throw new Error('Record must have __backendId or id to delete');
        }

        const id = record.__backendId || record.id;
        const response = await this.client.delete(this.config.tableName, id);

        if (!response.success) {
          throw new Error(response.error);
        }

        // Notify handler
        if (this.dataHandler && this.dataHandler.onDataChanged) {
          const allData = await this.read();
          if (allData.isOk) {
            this.dataHandler.onDataChanged(allData.data);
          }
        }

        if (window.DEBUG_MODE) {
          console.log('[Supabase Service] Deleted record:', id);
        }

        return SupabaseResult.ok(undefined);
      } catch (error) {
        console.error('[Supabase Service] Delete failed:', error);
        return SupabaseResult.error(error.message);
      }
    }

    /**
     * Get stats and service info
     */
    async getStats() {
      try {
        const result = await this.read();
        const players = result.isOk ? result.data : [];

        return {
          totalPlayers: players.length,
          isOnline: true,
          mode: 'supabase',
          tableName: this.config.tableName,
          lastSync: new Date().toISOString()
        };
      } catch (error) {
        console.error('[Supabase Service] Get stats failed:', error);
        return {
          totalPlayers: 0,
          isOnline: false,
          mode: 'supabase',
          error: error.message
        };
      }
    }

    /**
     * Test connection ke Supabase
     */
    async testConnection() {
      try {
        const response = await this.client.get(this.config.tableName);
        return {
          success: response.success,
          message: response.success ? 'Connection successful' : response.error,
          timestamp: new Date().toISOString()
        };
      } catch (error) {
        return {
          success: false,
          message: error.message,
          timestamp: new Date().toISOString()
        };
      }
    }
  }

  /**
   * Storage Manager - Direct Supabase Only
   */
  class StorageManager {
    constructor() {
      this.supabaseService = new SupabaseStorageService();
    }

    /**
     * Initialize Supabase
     */
    async init(handler) {
      return await this.supabaseService.init(handler);
    }

    /**
     * Configure Supabase credentials
     */
    configureSupabase(url, anonKey, tableName) {
      this.supabaseService.setConfig(url, anonKey, tableName);
    }

    /**
     * Proxy methods to Supabase service
     */
    async create(record) {
      return await this.supabaseService.create(record);
    }

    async read(filters) {
      return await this.supabaseService.read(filters);
    }

    async update(record) {
      return await this.supabaseService.update(record);
    }

    async delete(record) {
      return await this.supabaseService.delete(record);
    }

    async getStats() {
      return await this.supabaseService.getStats();
    }

    /**
     * Get service info
     */
    getInfo() {
      return {
        mode: 'supabase',
        activeService: 'supabase',
        configured: this.supabaseService.config.url !== 'YOUR_SUPABASE_URL'
      };
    }
  }

  // Export global instances
  window.supabaseStorage = new SupabaseStorageService();
  window.hybridStorageManager = new StorageManager();

  console.info('[Supabase Service] Module loaded ✓');
})();
