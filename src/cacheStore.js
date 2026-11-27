'use strict';

const fs = require('fs');
const path = require('path');

const VERSION = 1;
const MAX_ENTRIES = 20000;
const SAVE_DEBOUNCE_MS = 800;

/**
 * 译文缓存落盘。内存里用 Map 保持插入顺序，超出上限从最旧的开始淘汰。
 * 写盘走 tmp + rename，避免进程退出时留下半截 JSON。
 */
class CacheStore {
  constructor(filePath) {
    this.filePath = filePath;
    this.entries = new Map();
    this.timer = undefined;
  }

  async load() {
    try {
      const raw = await fs.promises.readFile(this.filePath, 'utf8');
      const parsed = JSON.parse(raw);
      if (!parsed || parsed.version !== VERSION || !Array.isArray(parsed.entries)) return;
      for (const pair of parsed.entries) {
        if (Array.isArray(pair) && typeof pair[0] === 'string' && typeof pair[1] === 'string') {
          this.entries.set(pair[0], pair[1]);
        }
      }
      this.trim();
    } catch (error) {
      if (error && error.code !== 'ENOENT') {
        console.warn('[mdBilingual] 读取译文缓存失败，本次从空缓存开始：' + (error.message || error));
      }
    }
  }

  get(key) {
    return this.entries.get(key);
  }

  set(key, value) {
    if (this.entries.has(key)) this.entries.delete(key);
    this.entries.set(key, value);
    this.trim();
    this.scheduleSave();
  }

  clear() {
    this.entries.clear();
    this.scheduleSave();
  }

  get size() {
    return this.entries.size;
  }

  trim() {
    while (this.entries.size > MAX_ENTRIES) {
      this.entries.delete(this.entries.keys().next().value);
    }
  }

  scheduleSave() {
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      this.timer = undefined;
      this.flush().catch(() => {});
    }, SAVE_DEBOUNCE_MS);
  }

  async flush() {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = undefined;
    }
    const tmp = this.filePath + '.tmp';
    try {
      await fs.promises.mkdir(path.dirname(this.filePath), { recursive: true });
      await fs.promises.writeFile(tmp, JSON.stringify({ version: VERSION, entries: [...this.entries] }), 'utf8');
      await fs.promises.rename(tmp, this.filePath);
    } catch (error) {
      console.warn('[mdBilingual] 写入译文缓存失败：' + (error && error.message || error));
    }
  }
}

module.exports = { CacheStore };