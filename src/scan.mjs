import { readdir, open, realpath } from 'node:fs/promises';
import { constants } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';

const OMIT = new Set(['.git', 'node_modules', '.venv', 'vendor', 'dist', 'coverage']);
const MAX_FILE = 512 * 1024;
const MAX_TOTAL = 16 * 1024 * 1024;
const MAX_FILES = 10000;
const TEXT = /\.(?:md|json|ya?ml|toml|cff|txt)$/i;

export async function snapshot(directory) {
  const root = await realpath(directory);
  const files = new Map();
  const blobShas = new Map();
  const skipped = [];
  let count = 0;
  let total = 0;
  let bounded = false;
  async function walk(dir, depth = 0) {
    if (depth > 24) { skipped.push({ path: path.relative(root, dir), reason: 'depth-limit' }); return; }
    for (const item of (await readdir(dir, { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name, 'en'))) {
      if (++count > MAX_FILES) { bounded = true; return; }
      const full = path.join(dir, item.name);
      const relative = path.relative(root, full).split(path.sep).join('/');
      if (item.isSymbolicLink()) { skipped.push({ path: relative, reason: 'symlink' }); continue; }
      if (item.isDirectory()) { if (!OMIT.has(item.name)) await walk(full, depth + 1); continue; }
      if (!item.isFile()) { skipped.push({ path: relative, reason: 'special-file' }); continue; }
      files.set(relative, null);
      if (!TEXT.test(item.name) && !/^(?:README|LICENSE|COPYING|\.editorconfig|\.gitattributes|CODEOWNERS)$/i.test(item.name)) continue;
      // Reject symlinks and realpath escapes, including symlinked parent directories.
      // This is a best-effort read boundary, not a sandbox against concurrent mutations.
      let handle;
      try {
        const resolved = await realpath(full);
        if (resolved !== full || !(resolved.startsWith(root + path.sep))) throw new Error('unsafe-path');
        handle = await open(full, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0));
        const stat = await handle.stat();
        if (!stat.isFile()) throw new Error('special-file');
        if (stat.size > MAX_FILE || total + stat.size > MAX_TOTAL) throw new Error('size-limit');
        const buffer = Buffer.alloc(Math.min(stat.size + 1, MAX_FILE + 1));
        let bytesRead = 0;
        while (bytesRead < buffer.length) {
          const chunk = await handle.read(buffer, bytesRead, buffer.length - bytesRead, bytesRead);
          if (!chunk.bytesRead) break;
          bytesRead += chunk.bytesRead;
        }
        if (bytesRead > stat.size) throw new Error('changed-during-read');
        total += bytesRead;
        const raw = buffer.subarray(0, bytesRead);
        blobShas.set(relative, createHash('sha1').update(`blob ${bytesRead}\0`).update(raw).digest('hex'));
        files.set(relative, raw.toString('utf8'));
      } catch (error) { skipped.push({ path: relative, reason: ['size-limit','unsafe-path','special-file','changed-during-read'].includes(error.message) ? error.message : 'unreadable' }); }
      finally { await handle?.close(); }
    }
  }
  await walk(root);
  if (bounded) skipped.push({ path: '.', reason: 'entry-limit' });
  return { files, blobShas, skipped, bytesRead: total };
}

export function stripCode(text) {
  let fence = null;
  return text.split('\n').map(line => {
    const match = line.match(/^ {0,3}(`{3,}|~{3,})/);
    if (match) {
      if (!fence) fence = match[1];
      else if (match[1][0] === fence[0] && match[1].length >= fence.length) fence = null;
      return '';
    }
    return fence ? '' : line.replace(/`[^`]*`/g, '');
  }).join('\n').replace(/<!--[\s\S]*?-->/g, '');
}

export function headingIds(text) {
  const counts = new Map();
  return new Set(stripCode(text).split('\n').flatMap(line => {
    const match = line.match(/^ {0,3}#{1,6}\s+(.+?)\s*#*\s*$/);
    if (!match) return [];
    const base = match[1].toLowerCase().replace(/[^\p{L}\p{N}_\-\s]/gu, '').replace(/\s/g, '-');
    const count = counts.get(base) ?? 0; counts.set(base, count + 1);
    return [count ? `${base}-${count}` : base];
  }));
}

// Covers simple inline and reference Markdown links, images, ATX headings.
// Complex CommonMark/HTML is deferred rather than silently marked valid.
export function localLinks(files) {
  const broken = [], deferred = [];
  let inspected = 0;
  const directories = new Set(['.']);
  for (const name of files.keys()) {
    let dir = path.posix.dirname(name);
    while (dir !== '.') { directories.add(dir); dir = path.posix.dirname(dir); }
  }
  for (const [name, raw] of files) {
    if (!name.endsWith('.md') || name.startsWith('templates/')) continue;
    if (raw === null) { deferred.push(`${name}: unreadable`); continue; }
    const text = stripCode(raw);
    if (/<[a-z][^>]*>|\]\([^\n]*\([^\n]*\)/i.test(text)) deferred.push(`${name}: complex HTML or nested destination`);
    const refs = new Map([...text.matchAll(/^ {0,3}\[([^\]]+)\]:\s*<?([^\s>]+)>?/gm)].map(m => [m[1].trim().toLowerCase(), m[2]]));
    const links = [...text.matchAll(/\[[^\]\n]*\]\(\s*<?([^\s)>]+)>?(?:\s+["'][^\n]*?["'])?\s*\)/g)].map(m => m[1]);
    for (const m of text.matchAll(/\[([^\]\n]+)\]\[([^\]\n]*)\]/g)) {
      const id = (m[2] || m[1]).trim().toLowerCase();
      if (refs.has(id)) links.push(refs.get(id)); else broken.push(`${name}: undefined reference ${id}`);
    }
    // Reference definitions are checked even when unused; shortcut references are not parsed.
    links.push(...refs.values());
    for (const link of new Set(links)) {
      if (/^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(link)) continue;
      let decoded;
      try { decoded = decodeURIComponent(link); } catch { broken.push(`${name}: malformed URL ${link}`); continue; }
      if (decoded.includes('\\') || decoded.startsWith('/')) { deferred.push(`${name}: platform-relative ${link}`); continue; }
      const hash = decoded.indexOf('#');
      const fragment = hash < 0 ? '' : decoded.slice(hash + 1);
      const dest = (hash < 0 ? decoded : decoded.slice(0, hash)).split('?')[0];
      const target = dest ? path.posix.normalize(path.posix.join(path.posix.dirname(name), dest)) : name;
      if (target === '..' || target.startsWith('../')) { broken.push(`${name}: path escapes repository ${link}`); continue; }
      inspected++;
      if (inspected > 20000) { deferred.push('Local-link target budget exhausted.'); return { inspected: 20000, broken, deferred }; }
      const directory = directories.has(target.replace(/\/$/, ''));
      if (!files.has(target) && !directory && target !== '.') { broken.push(`${name}: missing ${link}`); continue; }
      if (fragment && files.has(target) && target.endsWith('.md')) {
        const content = files.get(target);
        if (content === null) { deferred.push(`${name}: unreadable anchor target`); continue; }
        if (!headingIds(content).has(fragment)) deferred.push(`${name}: unresolved anchor ${link} (verify GitHub rendering)`);
      }
    }
  }
  return { inspected, broken, deferred };
}
