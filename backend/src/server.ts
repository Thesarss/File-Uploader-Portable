/**
 * Express Server
 * 
 * Main server application with:
 * - File upload endpoint with multipart/form-data handling
 * - Upload history endpoint
 * - Configuration endpoint
 * - Rate limiting middleware
 * - Response compression
 * - HTTPS support
 * - Error handling
 * 
 * Requirements: 1.1, 1.4, 2.1, 2.8, 2.9, 5.1, 5.2, 5.3, 5.4, 6.1, 6.2, 7.1, 8.2, 8.3, 8.5, 9.3, 11.3, 11.4
 */

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import multer from 'multer';
import rateLimit from 'express-rate-limit';
import compression from 'compression';
import https from 'https';
import http from 'http';
import fs from 'fs';
import dotenv from 'dotenv';
import { FileService, UploadMetadata, FileInput } from './file-service';
import { HistoryService } from './history-service';
import { ConfigManager } from './config-manager';
import { ClassifierService } from './classifier-service';
import { chunkService, ChunkMetadata } from './chunk-service';

dotenv.config();

const PORT = process.env.PORT || 3000;

/**
 * Create Express app with dependency injection support
 */
export function createApp(
  fileService?: FileService,
  historyService?: HistoryService,
  configManager?: ConfigManager,
  classifierService?: ClassifierService
) {
  const app = express();

  // Initialize services with defaults if not provided
  const config = configManager || new ConfigManager();
  const classifier = classifierService || new ClassifierService();
  const history = historyService || new HistoryService();
  const files = fileService || new FileService(classifier, undefined, history, config);

  // Middleware: JSON parsing
  app.use(express.json());

  // Middleware: CORS
  const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:5173'];
  app.use(cors({
    origin: allowedOrigins,
    credentials: true,
  }));

  // Middleware: Response compression (Requirement 11.4)
  app.use(compression());

  // Middleware: Request logging
  app.use((req: Request, res: Response, next: NextFunction) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${req.method} ${req.path}`);
    next();
  });

  // Middleware: Rate limiting (Requirement 11.3)
  const rateLimitWindowMs = parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10); // 15 minutes default
  const rateLimitMaxRequests = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10);

  const limiter = rateLimit({
    windowMs: rateLimitWindowMs,
    max: rateLimitMaxRequests,
    message: 'Too many requests from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
  });

  app.use('/api/', limiter);

  // Middleware: Multer for multipart/form-data (Requirements 2.1, 9.4)
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: 524288000, // 500MB - will be validated against config
    },
  });

  /**
   * POST /api/upload
   * Upload one or multiple files
   * 
   * Requirements: 2.1, 2.8, 2.9, 6.1, 6.2, 7.1
   */
  app.post('/api/upload', upload.array('files'), async (req: Request, res: Response, next: NextFunction) => {
    try {
      const uploadedFiles = req.files as Express.Multer.File[];
      
      if (!uploadedFiles || uploadedFiles.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'No files provided',
        });
      }

      // Extract metadata from request body
      const sessionId = req.body.sessionId || `session-${Date.now()}`;
      const deviceInfo = req.body.deviceInfo || req.headers['user-agent'] || 'Unknown';

      const metadata: UploadMetadata = {
        sessionId,
        deviceInfo,
        timestamp: new Date(),
      };

      // Convert Multer files to FileInput format
      const fileInputs: FileInput[] = uploadedFiles.map(file => ({
        buffer: file.buffer,
        originalname: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
      }));

      // Process uploads
      const results = await files.handleMultipleUploads(fileInputs, metadata);

      // Determine overall success
      const successCount = results.filter(r => r.success).length;
      const failureCount = results.length - successCount;

      return res.status(200).json({
        success: successCount > 0,
        totalFiles: results.length,
        successCount,
        failureCount,
        results,
      });
    } catch (error) {
      next(error);
    }
  });

  /**
   * POST /api/upload/chunk
   * Upload file chunk for large files
   * 
   * Supports chunked upload to bypass timeout limitations
   */
  app.post('/api/upload/chunk', upload.single('chunk'), async (req: Request, res: Response, next: NextFunction) => {
    try {
      const chunkFile = req.file as Express.Multer.File;
      
      if (!chunkFile) {
        return res.status(400).json({
          success: false,
          error: 'No chunk provided',
        });
      }

      // Parse chunk metadata
      const metadata: ChunkMetadata = {
        uploadId: req.body.uploadId,
        fileName: req.body.fileName,
        chunkIndex: parseInt(req.body.chunkIndex, 10),
        totalChunks: parseInt(req.body.totalChunks, 10),
        fileSize: parseInt(req.body.fileSize, 10),
        mimeType: req.body.mimeType,
      };

      // Validate metadata
      if (!metadata.uploadId || !metadata.fileName || 
          isNaN(metadata.chunkIndex) || isNaN(metadata.totalChunks)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid chunk metadata',
        });
      }

      // Save chunk
      const result = await chunkService.saveChunk(chunkFile.buffer, metadata);

      // If upload complete, process the assembled file
      if (result.isComplete && result.finalFilePath) {
        // Read assembled file
        const assembledBuffer = await fs.promises.readFile(result.finalFilePath);
        
        // Process as normal upload
        const sessionId = req.body.sessionId || `session-${Date.now()}`;
        const deviceInfo = req.body.deviceInfo || req.headers['user-agent'] || 'Unknown';

        const uploadMetadata: UploadMetadata = {
          sessionId,
          deviceInfo,
          timestamp: new Date(),
        };

        const fileInput: FileInput = {
          buffer: assembledBuffer,
          originalname: metadata.fileName,
          mimetype: metadata.mimeType,
          size: metadata.fileSize,
        };

        const uploadResult = await files.handleUpload(fileInput, uploadMetadata);

        // Cleanup assembled file
        await fs.promises.unlink(result.finalFilePath);

        return res.status(200).json({
          success: true,
          chunkResult: result,
          uploadResult,
        });
      }

      // Return chunk upload result
      return res.status(200).json({
        success: true,
        chunkResult: result,
      });
    } catch (error) {
      next(error);
    }
  });

  /**
   * GET /api/history
   * Retrieve upload history
   * 
   * Requirements: 8.2, 8.3, 8.5
   */
  app.get('/api/history', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const sessionId = req.query.sessionId as string | undefined;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;

      let uploadHistory;
      
      if (sessionId) {
        // Get history for specific session
        uploadHistory = await history.getSessionHistory(sessionId);
      } else {
        // Get recent uploads
        uploadHistory = await history.getRecentUploads(limit);
      }

      return res.status(200).json({
        success: true,
        count: uploadHistory.length,
        uploads: uploadHistory,
      });
    } catch (error) {
      next(error);
    }
  });

  /**
   * GET /api/config
   * Return client configuration
   * 
   * Requirements: 2.7, 4.1
   */
  app.get('/api/config', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const maxFileSize = await config.getMaxFileSize();
      const supportedExtensions = classifier.getSupportedExtensions();

      // Convert Map to object for JSON serialization
      const extensionsByCategory: Record<string, string[]> = {};
      supportedExtensions.forEach((extensions, category) => {
        extensionsByCategory[category] = extensions;
      });

      return res.status(200).json({
        success: true,
        config: {
          maxFileSize,
          supportedCategories: Object.keys(extensionsByCategory),
          acceptedExtensions: extensionsByCategory,
        },
      });
    } catch (error) {
      next(error);
    }
  });

  /**
   * Health check endpoint
   */
  app.get('/health', (req: Request, res: Response) => {
    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
    });
  });

  /**
   * Error handling middleware (Requirement 7.1)
   */
  app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    console.error('Error:', err);

    // Handle Multer errors
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({
          success: false,
          error: 'File size exceeds maximum allowed size',
        });
      }
      return res.status(400).json({
        success: false,
        error: `Upload error: ${err.message}`,
      });
    }

    // Handle other errors
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: process.env.NODE_ENV === 'development' ? err.message : undefined,
    });
  });

  return app;
}

/**
 * Start server with HTTPS support if configured
 * Requirements: 1.4, 5.1, 5.2, 5.3, 5.4
 */
export function startServer(app?: express.Application): http.Server | https.Server {
  const serverApp = app || createApp();
  const httpsEnabled = process.env.HTTPS_ENABLED === 'true';

  if (httpsEnabled) {
    const sslCertPath = process.env.SSL_CERT_PATH;
    const sslKeyPath = process.env.SSL_KEY_PATH;

    if (!sslCertPath || !sslKeyPath) {
      console.error('HTTPS enabled but SSL_CERT_PATH or SSL_KEY_PATH not configured');
      process.exit(1);
    }

    try {
      const httpsOptions = {
        cert: fs.readFileSync(sslCertPath),
        key: fs.readFileSync(sslKeyPath),
      };

      const server = https.createServer(httpsOptions, serverApp);
      server.listen(PORT, () => {
        console.log(`HTTPS Server running on port ${PORT}`);
      });
      return server;
    } catch (error) {
      console.error('Failed to start HTTPS server:', error);
      process.exit(1);
    }
  } else {
    const server = http.createServer(serverApp);
    server.listen(PORT, () => {
      console.log(`HTTP Server running on port ${PORT}`);
    });
    return server;
  }
}

// Start server if this file is run directly
if (require.main === module) {
  // Initialize chunk service
  chunkService.initialize().then(() => {
    console.log('Chunk service initialized');
    const app = createApp();
    startServer(app);
  }).catch((error) => {
    console.error('Failed to initialize chunk service:', error);
    process.exit(1);
  });
}

export default createApp();
