/**
 * ascmd TLV protocol implementation for Node.js
 * Ported from aspera-api-examples/app/go/src/utils/server.go
 *
 * ascmd is the Aspera file-system command agent that runs on HSTS servers.
 * It communicates over stdin/stdout using a binary TLV (Tag-Length-Value) protocol.
 * Commands are sent as text lines prefixed with "as_", responses are binary TLV.
 */

import { Client } from 'ssh2';

// TLV constants
const TAG_SIZE = 1;
const LENGTH_SIZE = 4;
const U32_SIZE = 4;
const U64_SIZE = 8;
const END_OF_BUFFER = 0;
const ASCMD_COMMAND = 'ascmd';

// ─── TLV helpers ─────────────────────────────────────────────────────────────

/**
 * Read all TLV records from a Buffer into an array of { tag, value } objects.
 * @param {Buffer} buf
 * @returns {{ tag: number, value: Buffer }[]}
 */
function parseTLVs(buf) {
  const result = [];
  let offset = 0;
  while (offset < buf.length) {
    const tag = buf.readUInt8(offset);
    offset += TAG_SIZE;
    if (tag === END_OF_BUFFER) break;
    const length = buf.readUInt32BE(offset);
    offset += LENGTH_SIZE;
    const value = buf.slice(offset, offset + length);
    offset += length;
    result.push({ tag, value });
  }
  return result;
}

function decodeZstr(value) {
  // Remove trailing null byte
  const str = value.toString('utf8');
  return str.endsWith('\0') ? str.slice(0, -1) : str;
}

function decodeU64(value) {
  // Return as regular number (safe for file sizes up to 2^53)
  const hi = value.readUInt32BE(0);
  const lo = value.readUInt32BE(4);
  return hi * 0x100000000 + lo;
}

function decodeU32(value) {
  return value.readUInt32BE(0);
}

// ─── Response decoders ────────────────────────────────────────────────────────

function decodeInfo(data) {
  const info = { platform: '', version: '', lang: '', territory: '', codeset: '', lc_ctype: '', lc_numeric: '', lc_time: '', lc_all: '', dev: [], browse_caps: '', protocol: 1 };
  for (const { tag, value } of parseTLVs(data)) {
    switch (tag) {
      case 1: info.platform = decodeZstr(value); break;
      case 2: info.version = decodeZstr(value); break;
      case 3: info.lang = decodeZstr(value); break;
      case 4: info.territory = decodeZstr(value); break;
      case 5: info.codeset = decodeZstr(value); break;
      case 6: info.lc_ctype = decodeZstr(value); break;
      case 7: info.lc_numeric = decodeZstr(value); break;
      case 8: info.lc_time = decodeZstr(value); break;
      case 9: info.lc_all = decodeZstr(value); break;
      case 10: info.dev.push(decodeZstr(value)); break;
      case 11: info.browse_caps = decodeZstr(value); break;
      case 12: info.protocol = decodeU64(value); break;
    }
  }
  return info;
}

function decodeStat(data) {
  const stat = { name: '', size: 0, mode: 0, zmode: '', uid: 0, zuid: '', gid: 0, zgid: '', ctime: 0, zctime: '', mtime: 0, zmtime: '', atime: 0, zatime: '', symlink: '', errno: 0, errstr: '' };
  for (const { tag, value } of parseTLVs(data)) {
    switch (tag) {
      case 1: stat.name = decodeZstr(value); break;
      case 2: stat.size = decodeU64(value); break;
      case 3: stat.mode = decodeU32(value); break;
      case 4: stat.zmode = decodeZstr(value); break;
      case 5: stat.uid = decodeU32(value); break;
      case 6: stat.zuid = decodeZstr(value); break;
      case 7: stat.gid = decodeU32(value); break;
      case 8: stat.zgid = decodeZstr(value); break;
      case 9: stat.ctime = decodeU64(value); break;
      case 10: stat.zctime = decodeZstr(value); break;
      case 11: stat.mtime = decodeU64(value); break;
      case 12: stat.zmtime = decodeZstr(value); break;
      case 13: stat.atime = decodeU64(value); break;
      case 14: stat.zatime = decodeZstr(value); break;
      case 15: stat.symlink = decodeZstr(value); break;
      case 16: stat.errno = decodeU32(value); break;
      case 17: stat.errstr = decodeZstr(value); break;
    }
  }
  return stat;
}

function decodeDir(data) {
  // A directory listing is a sequence of TLV records with tag=1, each containing a Stat
  const stats = [];
  let offset = 0;
  while (offset < data.length) {
    const tag = data.readUInt8(offset);
    offset += TAG_SIZE;
    if (tag === END_OF_BUFFER) break;
    const length = data.readUInt32BE(offset);
    offset += LENGTH_SIZE;
    const value = data.slice(offset, offset + length);
    offset += length;
    if (tag === 1) {
      stats.push(decodeStat(value));
    }
  }
  return stats;
}

function decodeCommandError(data) {
  const err = { errno: 0, errstr: '' };
  for (const { tag, value } of parseTLVs(data)) {
    switch (tag) {
      case 1: err.errno = decodeU32(value); break;
      case 2: err.errstr = decodeZstr(value); break;
    }
  }
  return err;
}

function decodeMounts(data) {
  const mounts = [];
  let current = null;
  let offset = 0;
  while (offset < data.length) {
    const tag = data.readUInt8(offset);
    offset += TAG_SIZE;
    if (tag === END_OF_BUFFER) {
      if (current) mounts.push(current);
      break;
    }
    const length = data.readUInt32BE(offset);
    offset += LENGTH_SIZE;
    const value = data.slice(offset, offset + length);
    offset += length;
    switch (tag) {
      case 1: if (current) mounts.push(current); current = { fs: decodeZstr(value), dir: '', is_a: '', total: 0, used: 0, free: 0, fcount: 0, errno: 0, errstr: '' }; break;
      case 2: if (current) current.dir = decodeZstr(value); break;
      case 3: if (current) current.is_a = decodeZstr(value); break;
      case 4: if (current) current.total = decodeU64(value); break;
      case 5: if (current) current.used = decodeU64(value); break;
      case 6: if (current) current.free = decodeU64(value); break;
      case 7: if (current) current.fcount = decodeU64(value); break;
      case 8: if (current) current.errno = decodeU32(value); break;
      case 9: if (current) current.errstr = decodeZstr(value); break;
    }
  }
  return mounts;
}

function decodeMd5sum(data) {
  for (const { tag, value } of parseTLVs(data)) {
    if (tag === 1) return decodeZstr(value);
  }
  return '';
}

/**
 * Parse a top-level TLV response from ascmd.
 * Returns { type, result } where type is one of:
 *   'stat', 'dir', 'size', 'error', 'info', 'success', 'exit', 'mounts', 'md5sum'
 */
function decodeCommandResult(tag, value) {
  switch (tag) {
    case 1: return { type: 'stat', result: decodeStat(value) };
    case 2: return { type: 'dir', result: decodeDir(value) };
    case 3: return { type: 'size', result: decodeSize(value) };
    case 4: return { type: 'error', result: decodeCommandError(value) };
    case 5: return { type: 'info', result: decodeInfo(value) };
    case 6: return { type: 'success', result: {} };
    case 7: return { type: 'exit', result: {} };
    case 8: return { type: 'mounts', result: decodeMounts(value) };
    case 9: return { type: 'md5sum', result: decodeMd5sum(value) };
    default: throw new Error(`Unknown top-level TLV tag: ${tag}`);
  }
}

function decodeSize(data) {
  const size = { size: 0, fcount: 0, dcount: 0, failed_fcount: 0, failed_dcount: 0 };
  for (const { tag, value } of parseTLVs(data)) {
    switch (tag) {
      case 1: size.size = decodeU64(value); break;
      case 2: size.fcount = decodeU32(value); break;
      case 3: size.dcount = decodeU32(value); break;
      case 4: size.failed_fcount = decodeU32(value); break;
      case 5: size.failed_dcount = decodeU32(value); break;
    }
  }
  return size;
}

// ─── AsCmd class ─────────────────────────────────────────────────────────────

/**
 * Wraps a stdin/stdout pair connected to an `ascmd` process.
 * Sends text commands prefixed with "as_", reads binary TLV responses.
 */
class AsCmd {
  constructor(stdin, stdout) {
    this.stdin = stdin;
    this.stdout = stdout;
    // Accumulate incoming binary data
    this._buf = Buffer.alloc(0);
    this._waiters = []; // queue of { resolve, reject }
    stdout.on('data', (chunk) => this._onData(chunk));
    stdout.on('error', (err) => this._onError(err));
  }

  _onData(chunk) {
    this._buf = Buffer.concat([this._buf, chunk]);
    this._tryFlush();
  }

  _onError(err) {
    for (const { reject } of this._waiters) reject(err);
    this._waiters = [];
  }

  _tryFlush() {
    while (this._waiters.length > 0) {
      // Need at least TAG_SIZE + LENGTH_SIZE bytes to know the frame length
      if (this._buf.length < TAG_SIZE + LENGTH_SIZE) return;
      const tag = this._buf.readUInt8(0);
      const length = this._buf.readUInt32BE(TAG_SIZE);
      const frameSize = TAG_SIZE + LENGTH_SIZE + length;
      if (this._buf.length < frameSize) return;
      const value = this._buf.slice(TAG_SIZE + LENGTH_SIZE, frameSize);
      this._buf = this._buf.slice(frameSize);
      const { resolve, reject } = this._waiters.shift();
      try {
        resolve(decodeCommandResult(tag, value));
      } catch (e) {
        reject(e);
      }
    }
  }

  /** Wait for the next TLV response frame */
  _readResponse() {
    return new Promise((resolve, reject) => {
      this._waiters.push({ resolve, reject });
      this._tryFlush();
    });
  }

  /** Send a command (without leading "as_" and trailing newline) */
  _send(command) {
    this.stdin.write(`as_${command}\n`);
  }

  /** Send a command and return the decoded result */
  async _execute(command, ...args) {
    let full = command;
    if (args.length > 0) {
      const quoted = args.map(a => `"${a.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`);
      full += ' ' + quoted.join(' ');
    }
    this._send(full);
    const result = await this._readResponse();
    if (result.type === 'error') {
      throw new Error(`ascmd error (${result.result.errno}): ${result.result.errstr}`);
    }
    return result;
  }

  /** Read the initial info TLV sent by ascmd on startup */
  async readInitialInfo() {
    const result = await this._readResponse();
    if (result.type !== 'info') {
      throw new Error(`Expected initial info TLV (tag 5), got type=${result.type}`);
    }
    return result.result;
  }

  async info() { return (await this._execute('info')).result; }
  async ls(path) { return (await this._execute('ls', path)).result; }
  async rm(path) { await this._execute('rm', path); }
  async mkdir(path) { await this._execute('mkdir', path); }
  async mv(src, dst) { await this._execute('mv', src, dst); }
  async cp(src, dst) { await this._execute('cp', src, dst); }
  async du(path) { return (await this._execute('du', path)).result; }
  async df() { return (await this._execute('df')).result; }
  async md5sum(path) { return (await this._execute('md5sum', path)).result; }
  async terminate() { this._send('exit'); }
}

// ─── SSH connection factory ───────────────────────────────────────────────────

/**
 * Open an SSH connection, exec `ascmd`, and return a ready AsCmd instance.
 * @param {{ host, port, username, password?, privateKey?, passphrase? }} opts
 * @returns {Promise<{ ascmd: AsCmd, cleanup: () => void }>}
 */
export async function connectAscmd(opts) {
  const { host, port, username, password, privateKey, passphrase } = opts;

  const client = new Client();

  await new Promise((resolve, reject) => {
    client.on('ready', resolve).on('error', reject);

    const authMethod = password != null
      ? { password }
      : { privateKey, passphrase };

    client.connect({
      host,
      port: Number(port) || 22,
      username,
      ...authMethod,
      // Accept any host key – for a production system use hostVerifier
      hostVerifier: () => true,
    });
  });

  const stream = await new Promise((resolve, reject) => {
    client.exec(ASCMD_COMMAND, (err, s) => {
      if (err) reject(err);
      else resolve(s);
    });
  });

  const ascmd = new AsCmd(stream.stdin, stream);
  // Consume the initial info frame ascmd sends on startup
  await ascmd.readInitialInfo();

  const cleanup = () => {
    try { ascmd.terminate(); } catch (_) { /* ignore */ }
    try { stream.close(); } catch (_) { /* ignore */ }
    try { client.end(); } catch (_) { /* ignore */ }
  };

  return { ascmd, cleanup };
}
