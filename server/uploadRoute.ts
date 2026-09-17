/**
 * VonWork Document Upload Route
 * Handles multipart/form-data file uploads for the Knowledge Base.
 * Uses multer for parsing, then uploads to S3 and triggers the processing pipeline.
 */

import type { Express, Request, Response } from "express";
import multer from "multer";
import { getDb } from "./db";
import { kbDocuments, knowledgeBases } from "../drizzle/schema";
import { storagePut } from "./storage";
import { processDocument } from "./knowledgeBase";
import { eq, and } from "drizzle-orm";
import { sdk } from "./_core/sdk";

const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/msword",
  "text/plain",
  "text/markdown",
  "text/csv",
  "application/csv",
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file type: ${file.mimetype}`));
    }
  },
});

export function registerUploadRoutes(app: Express) {
  // POST /api/kb/upload
  app.post(
    "/api/kb/upload",
    upload.single("file"),
    async (req: Request, res: Response) => {
      try {
        // Auth: verify session cookie
        const user = await sdk.authenticateRequest(req).catch(() => null);
        if (!user) {
          return res.status(401).json({ error: "Unauthorized" });
        }

        const kbId = parseInt(req.body.kbId, 10);
        if (!kbId || isNaN(kbId)) {
          return res.status(400).json({ error: "kbId is required" });
        }

        if (!req.file) {
          return res.status(400).json({ error: "No file uploaded" });
        }

        const db = await getDb();
        if (!db) {
          return res.status(500).json({ error: "Database unavailable" });
        }

        // Verify user owns this KB
        const [kb] = await db
          .select()
          .from(knowledgeBases)
          .where(and(eq(knowledgeBases.id, kbId), eq(knowledgeBases.userId, user.id)))
          .limit(1);

        if (!kb) {
          return res.status(404).json({ error: "Knowledge base not found" });
        }

        // Upload file to S3
        const fileKey = `kb/${user.id}/${kbId}/${Date.now()}-${req.file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
        const { url: fileUrl } = await storagePut(fileKey, req.file.buffer, req.file.mimetype);

        // Create document record (status: pending)
        const [insertResult] = await db.insert(kbDocuments).values({
          kbId,
          userId: user.id,
          filename: req.file.originalname,
          fileUrl,
          fileKey,
          mimeType: req.file.mimetype,
          status: "pending",
        });

        const docId = (insertResult as any).insertId as number;

        // Process asynchronously (don't await — return immediately)
        processDocument(docId, req.file.buffer, req.file.mimetype).catch((err) => {
          console.error(`[KB] Processing failed for doc ${docId}:`, err);
        });

        return res.json({
          success: true,
          docId,
          filename: req.file.originalname,
          status: "processing",
          message: "Document uploaded. Processing in background — refresh in a few seconds.",
        });
      } catch (err: any) {
        console.error("[KB Upload] Error:", err);
        return res.status(500).json({ error: err.message ?? "Upload failed" });
      }
    }
  );
}
