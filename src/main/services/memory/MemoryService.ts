// import { Client, createClient } from '@libsql/client'
import { loggerService } from '@logger'
import Embeddings from '@main/knowledge/embeddings/Embeddings'
import type {
  AddMemoryOptions,
  AssistantMessage,
  MemoryConfig,
  MemoryHistoryItem,
  MemoryItem,
  MemoryListOptions,
  MemorySearchOptions
} from '@types'
import crypto from 'crypto'
import { app } from 'electron'
import path from 'path'

import { MemoryQueries } from './queries'

const logger = loggerService.withContext('MemoryService')

export interface EmbeddingOptions {
  model: string
  provider: string
  apiKey: string
  apiVersion?: string
  baseURL: string
  dimensions?: number
  batchSize?: number
}

export interface VectorSearchOptions {
  limit?: number
  threshold?: number
  userId?: string
  agentId?: string
  filters?: Record<string, any>
}

export interface SearchResult {
  memories: MemoryItem[]
  count: number
  error?: string
}

export class MemoryService {
  private static instance: MemoryService | null = null
  private db: null = null
  private isInitialized = false
  private embeddings: Embeddings | null = null
  private config: MemoryConfig | null = null
  private static readonly UNIFIED_DIMENSION = 1536
  private static readonly SIMILARITY_THRESHOLD = 0.85

  private constructor() {
    // Private constructor to enforce singleton pattern
  }

  public static getInstance(): MemoryService {
    if (!MemoryService.instance) {
      MemoryService.instance = new MemoryService()
    }
    return MemoryService.instance
  }

  public static reload(): MemoryService {
    if (MemoryService.instance) {
      MemoryService.instance.close()
    }
    MemoryService.instance = new MemoryService()
    return MemoryService.instance
  }

  /**
   * Initialize the database connection and create tables
   */
  private async init(): Promise<void> {
    if (this.isInitialized && this.db) {
      return
    }

    try {
      const userDataPath = app.getPath('userData')
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const dbPath = path.join(userDataPath, 'memories.db')

      this.db = ''
      // createClient({
      //   url: `file:${dbPath}`,
      //   intMode: 'number'
      // })

      // Create tables
      await this.createTables()
      this.isInitialized = true
      logger.debug('Memory database initialized successfully')
    } catch (error) {
      logger.error('Failed to initialize memory database:', error as Error)
      throw new Error(
        `Memory database initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  private async createTables(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized')

    // Create memories table with native vector support
    await this.db.execute(MemoryQueries.createTables.memories)

    // Create memory history table
    await this.db.execute(MemoryQueries.createTables.memoryHistory)

    // Create indexes
    await this.db.execute(MemoryQueries.createIndexes.userId)
    await this.db.execute(MemoryQueries.createIndexes.agentId)
    await this.db.execute(MemoryQueries.createIndexes.createdAt)
    await this.db.execute(MemoryQueries.createIndexes.hash)
    await this.db.execute(MemoryQueries.createIndexes.memoryHistory)

    // Create vector index for similarity search
    try {
      await this.db.execute(MemoryQueries.createIndexes.vector)
    } catch (error) {
      // Vector index might not be supported in all versions
      logger.warn('Failed to create vector index, falling back to non-indexed search:', error as Error)
    }
  }

  /**
   * Add new memories from messages
   */
  public async add(messages: string | AssistantMessage[], options: AddMemoryOptions): Promise<SearchResult> {
    await this.init()
    if (!this.db) throw new Error('Database not initialized')

    const { userId, agentId, runId, metadata } = options

    try {
      // Convert messages to memory strings
      const memoryStrings = Array.isArray(messages)
        ? messages.map((m) => (typeof m === 'string' ? m : m.content))
        : [messages]
      const addedMemories: MemoryItem[] = []

      for (const memory of memoryStrings) {
        const trimmedMemory = memory.trim()
        if (!trimmedMemory) continue

        // Generate hash for deduplication
        const hash = crypto.createHash('sha256').update(trimmedMemory).digest('hex')

        // Check if memory already exists
        const existing = await this.db.execute({
          sql: MemoryQueries.memory.checkExistsIncludeDeleted,
          args: [hash]
        })

        if (existing.rows.length > 0) {
          const existingRecord = existing.rows[0] as any
          const isDeleted = existingRecord.is_deleted === 1

          if (!isDeleted) {
            // Active record exists, skip insertion
            logger.debug(`Memory already exists with hash: ${hash}`)
            continue
          } else {
            // Deleted record exists, restore it instead of inserting new one
            logger.debug(`Restoring deleted memory with hash: ${hash}`)

            // Generate embedding if model is configured
            let embedding: number[] | null = null
            const embedderApiClient = this.config?.embedderApiClient
            if (embedderApiClient) {
              try {
                embedding = await this.generateEmbedding(trimmedMemory)
                logger.debug(
                  `Generated embedding for restored memory with dimension: ${embedding.length} (target: ${this.config?.embedderDimensions || MemoryService.UNIFIED_DIMENSION})`
                )
              } catch (error) {
                logger.error('Failed to generate embedding for restored memory:', error as Error)
              }
            }

            const now = new Date().toISOString()

            // Restore the deleted record
            await this.db.execute({
              sql: MemoryQueries.memory.restoreDeleted,
              args: [
                trimmedMemory,
                embedding ? this.embeddingToVector(embedding) : null,
                metadata ? JSON.stringify(metadata) : null,
                now,
                existingRecord.id
              ]
            })

            // Add to history
            await this.addHistory(existingRecord.id, null, trimmedMemory, 'ADD')

            addedMemories.push({
              id: existingRecord.id,
              memory: trimmedMemory,
              hash,
              createdAt: now,
              updatedAt: now,
              metadata
            })
            continue
          }
        }

        // Generate embedding if model is configured
        let embedding: number[] | null = null
        if (this.config?.embedderApiClient) {
          try {
            embedding = await this.generateEmbedding(trimmedMemory)
            logger.debug(
              `Generated embedding with dimension: ${embedding.length} (target: ${this.config?.embedderDimensions || MemoryService.UNIFIED_DIMENSION})`
            )

            // Check for similar memories using vector similarity
            const similarMemories = await this.hybridSearch(trimmedMemory, embedding, {
              limit: 5,
              threshold: 0.1, // Lower threshold to get more candidates
              userId,
              agentId
            })

            // Check if any similar memory exceeds the similarity threshold
            if (similarMemories.memories.length > 0) {
              const highestSimilarity = Math.max(...similarMemories.memories.map((m) => m.score || 0))
              if (highestSimilarity >= MemoryService.SIMILARITY_THRESHOLD) {
                logger.debug(
                  `Skipping memory addition due to high similarity: ${highestSimilarity.toFixed(3)} >= ${MemoryService.SIMILARITY_THRESHOLD}`
                )
                logger.debug(`Similar memory found: 

