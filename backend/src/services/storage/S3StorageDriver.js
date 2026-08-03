const {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
} = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

/**
 * S3-compatible object storage — Cloudflare R2, DigitalOcean Spaces, Backblaze
 * B2 or AWS S3 itself. R2 and Spaces are the cheap options here because
 * neither charges for egress, and generated video is almost all egress.
 *
 * `forcePathStyle` is on because most non-AWS providers serve
 * `endpoint/bucket/key` rather than AWS's `bucket.endpoint/key` virtual-host
 * form.
 */
class S3StorageDriver {
  constructor({ endpoint, region, bucket, accessKey, secretKey, publicUrl, signedUrlTtlSeconds }) {
    this.name = 's3';
    this.bucket = bucket;
    this.publicUrl = (publicUrl || '').replace(/\/$/, '');
    this.signedUrlTtlSeconds = signedUrlTtlSeconds || 7 * 24 * 3600;

    this.client = new S3Client({
      region: region || 'auto',
      endpoint: endpoint || undefined,
      forcePathStyle: true,
      credentials: { accessKeyId: accessKey, secretAccessKey: secretKey },
    });
  }

  urlFor(key) {
    // With a CDN/public bucket URL configured the object is directly
    // addressable; otherwise callers should ask for a signed URL instead.
    return this.publicUrl ? `${this.publicUrl}/${key}` : null;
  }

  async put(key, body, contentType) {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: body,
        ContentType: contentType || 'application/octet-stream',
      })
    );

    const url = this.urlFor(key) || (await this.signedUrl(key));
    return { key, url };
  }

  async remove(key) {
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
  }

  async signedUrl(key, expiresIn = this.signedUrlTtlSeconds) {
    return getSignedUrl(this.client, new GetObjectCommand({ Bucket: this.bucket, Key: key }), {
      expiresIn,
    });
  }

  /** Used by the health check — proves credentials and bucket are both good. */
  async healthCheck() {
    await this.client.send(new HeadBucketCommand({ Bucket: this.bucket }));
    return true;
  }
}

module.exports = S3StorageDriver;
