/**
 * SSH proxy backend for aspera-browser-react
 *
 * Exposes HTTP routes under /api/ssh/* that the frontend SSHService calls.
 * Each request opens a fresh ascmd session, executes the operation, and closes.
 *
 * Environment variables:
 *   SSH_PROXY_PORT    - port to listen on (default: 3001)
 *   ALLOWED_ORIGIN    - CORS allowed origin (default: *, set to e.g. https://user.github.io for production)
 */

import express from 'express';
import cors from 'cors';
import { connectAscmd } from './ascmd.js';

const app = express();
const PORT = process.env.SSH_PROXY_PORT || 3001;

app.use(cors({ origin: process.env.ALLOWED_ORIGIN || '*' }));
app.use(express.json());

// ─── Helper ──────────────────────────────────────────────────────────────────

/**
 * Extract SSH connection params from request body.
 * Supports password and privateKey auth methods.
 */
function connOpts(body) {
  const { host, port, username, authMethod, password, privateKey, passphrase } = body;
  if (!host || !username) {
    throw new Error('Missing required fields: host, username');
  }
  return {
    host,
    port: Number(port) || 22,
    username,
    ...(authMethod === 'password' ? { password } : { privateKey, passphrase }),
  };
}

/**
 * Wraps a route handler: opens an ascmd session, runs fn(ascmd, req, res),
 * then always cleans up the connection.
 */
function withAscmd(fn) {
  return async (req, res) => {
    let cleanup = null;
    try {
      const { ascmd, cleanup: c } = await connectAscmd(connOpts(req.body));
      cleanup = c;
      await fn(ascmd, req, res);
    } catch (err) {
      console.error('[ssh-proxy]', err.message);
      if (!res.headersSent) {
        res.status(500).json({ error: err.message });
      }
    } finally {
      if (cleanup) cleanup();
    }
  };
}

// ─── Routes ──────────────────────────────────────────────────────────────────

/**
 * POST /api/ssh/info
 * Returns platform information from ascmd.
 * Body: { host, port, username, authMethod, password? | privateKey?, passphrase? }
 */
app.post('/api/ssh/info', withAscmd(async (ascmd, _req, res) => {
  const info = await ascmd.info();
  res.json(info);
}));

/**
 * POST /api/ssh/browse
 * List directory contents.
 * Body: { ...conn, path }
 */
app.post('/api/ssh/browse', withAscmd(async (ascmd, req, res) => {
  const { path } = req.body;
  if (!path) return res.status(400).json({ error: 'Missing path' });

  const stats = await ascmd.ls(path);

  // Normalise to the SSHFileListResponse shape expected by SSHService
  const files = stats.map(stat => ({
    filename: stat.name,
    attrs: {
      size: stat.size,
      // ascmd sets mode=0; use zmode string instead ("d..." = directory)
      isDirectory: stat.zmode?.startsWith('d') ?? false,
      mtime: stat.mtime,
      atime: stat.atime,
      uid: stat.uid,
      gid: stat.gid,
    },
  }));

  res.json({ files });
}));

/**
 * POST /api/ssh/mkdir
 * Create a directory.
 * Body: { ...conn, path }
 */
app.post('/api/ssh/mkdir', withAscmd(async (ascmd, req, res) => {
  const { path } = req.body;
  if (!path) return res.status(400).json({ error: 'Missing path' });
  await ascmd.mkdir(path);
  res.json({ ok: true });
}));

/**
 * POST /api/ssh/delete
 * Delete files or directories.
 * Body: { ...conn, paths: string[] }
 */
app.post('/api/ssh/delete', withAscmd(async (ascmd, req, res) => {
  const { paths } = req.body;
  if (!Array.isArray(paths) || paths.length === 0) {
    return res.status(400).json({ error: 'Missing paths array' });
  }
  for (const p of paths) {
    await ascmd.rm(p);
  }
  res.json({ ok: true });
}));

/**
 * POST /api/ssh/rename
 * Rename / move a file or directory.
 * Body: { ...conn, oldPath, newPath }
 */
app.post('/api/ssh/rename', withAscmd(async (ascmd, req, res) => {
  const { oldPath, newPath } = req.body;
  if (!oldPath || !newPath) {
    return res.status(400).json({ error: 'Missing oldPath or newPath' });
  }
  await ascmd.mv(oldPath, newPath);
  res.json({ ok: true });
}));

/**
 * POST /api/ssh/stat
 * Get information about a specific file or directory.
 * Body: { ...conn, path }
 */
app.post('/api/ssh/stat', withAscmd(async (ascmd, req, res) => {
  const { path } = req.body;
  if (!path) return res.status(400).json({ error: 'Missing path' });
  const stats = await ascmd.ls(path);
  // ls on a single file returns a one-element array
  res.json(stats[0] ?? {});
}));

/**
 * POST /api/ssh/download-setup
 * Verify paths exist before initiating a download transfer.
 * Body: { ...conn, paths: string[] }
 */
app.post('/api/ssh/download-setup', withAscmd(async (ascmd, req, res) => {
  const { paths } = req.body;
  if (!Array.isArray(paths) || paths.length === 0) {
    return res.status(400).json({ error: 'Missing paths array' });
  }
  const stats = await Promise.all(paths.map(p => ascmd.ls(p)));
  res.json({ paths: stats.flat() });
}));

/**
 * POST /api/ssh/upload-setup
 * Verify destination exists before initiating an upload transfer.
 * Body: { ...conn, paths: string[], destination: string }
 */
app.post('/api/ssh/upload-setup', withAscmd(async (ascmd, req, res) => {
  const { destination } = req.body;
  if (!destination) return res.status(400).json({ error: 'Missing destination' });
  const stats = await ascmd.ls(destination);
  res.json({ destination: stats[0] ?? {} });
}));

// ─── Start ───────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`[ssh-proxy] listening on http://localhost:${PORT}`);
});
