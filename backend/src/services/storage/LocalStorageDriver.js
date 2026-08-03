const fs = require('fs/promises');
const path = require('path');

/**
 * Disk-backed storage, served by the `/uploads` static mount in app.js.
 *
 * Fine for local development and single-box demos, and deliberately kept
 * around as a fallback so the app still boots with no S3 credentials. It is
 * not what production should run on: files live on one server's disk, so they
 * vanish on a rebuild and are invisible to a second instance.
 */
class LocalStorageDriver {
  constructor({ root, publicBaseUrl }) {
    this.name = 'local';
    this.root = root;
    this.publicBaseUrl = (publicBaseUrl || '').replace(/\/$/, '');
  }

  urlFor(key) {
    return `${this.publicBaseUrl}/uploads/${key}`;
  }

  async put(key, body) {
    const destination = path.join(this.root, key);
    await fs.mkdir(path.dirname(destination), { recursive: true });
    await fs.writeFile(destination, body);
    return { key, url: this.urlFor(key) };
  }

  async remove(key) {
    await fs.unlink(path.join(this.root, key)).catch(() => {});
  }

  /** Local files are already reachable at a stable path — nothing to sign. */
  async signedUrl(key) {
    return this.urlFor(key);
  }
}

module.exports = LocalStorageDriver;
