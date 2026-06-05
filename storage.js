const crypto = require("crypto");
const { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } = require("@aws-sdk/client-s3");

const R2_TOTAL_BYTES = 10 * 1024 * 1024 * 1024;

function createAttachmentStorage() {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucket = process.env.R2_BUCKET;
  const publicBaseUrl = process.env.R2_PUBLIC_BASE_URL;
  const enabled = Boolean(accountId && accessKeyId && secretAccessKey && bucket && publicBaseUrl);

  if (!enabled) {
    return {
      enabled: false,
      totalBytes: R2_TOTAL_BYTES,
      async saveAttachment(attachment) {
        return attachment;
      },
      async getAttachment() {
        return null;
      },
      async deleteAttachment() {},
    };
  }

  const client = new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  });

  return {
    enabled: true,
    totalBytes: R2_TOTAL_BYTES,
    async saveAttachment(attachment) {
      if (!attachment?.buffer) {
        return attachment;
      }

      const key = buildAttachmentKey(attachment.name);
      await client.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: key,
          Body: attachment.buffer,
          ContentType: attachment.type || "application/octet-stream",
        })
      );

      return {
        name: attachment.name,
        type: attachment.type,
        data: `${publicBaseUrl.replace(/\/$/, "")}/${key}`,
        storageKey: key,
        size: attachment.size,
      };
    },
    async getAttachment(attachment) {
      if (!attachment?.storageKey) {
        return null;
      }

      const result = await client.send(new GetObjectCommand({ Bucket: bucket, Key: attachment.storageKey }));
      const bytes = await streamToBuffer(result.Body);

      return {
        data: bytes,
        type: attachment.type || result.ContentType || "application/octet-stream",
        name: attachment.name || "attachment",
      };
    },
    async deleteAttachment(attachment) {
      if (!attachment?.storageKey) {
        return;
      }

      await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: attachment.storageKey }));
    },
  };
}

function buildAttachmentKey(name) {
  const safeName = String(name || "attachment").replace(/[^\w.\-]+/g, "_").slice(-80);
  return `attachments/${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}-${safeName}`;
}

async function streamToBuffer(stream) {
  if (!stream) {
    return Buffer.alloc(0);
  }

  if (stream.transformToByteArray) {
    return Buffer.from(await stream.transformToByteArray());
  }

  const chunks = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

module.exports = { createAttachmentStorage, R2_TOTAL_BYTES };
