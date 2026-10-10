const { PutObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

const {
  s3Client,
  region,
  healthMapBucket,
  moduleZipPrefix,
} = require('./s3Client');

const createModuleUploadUrl = async ({
  fileName,
  contentType,
  existingKey = null,
  uploadId = null,
}) => {
  const safeFileName = fileName
    .trim()
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/_+/g, '_');

  const key =
    existingKey && uploadId
      ? `${moduleZipPrefix}${safeFileName.replace(/\.zip$/i, '')}_${uploadId}.zip`
      : existingKey || `${moduleZipPrefix}${safeFileName}`;

  const command = new PutObjectCommand({
    Bucket: healthMapBucket,
    Key: key,
    ContentType: contentType,
    ...(uploadId ? { Metadata: { uploadId } } : {}),
  });

  const uploadUrl = await getSignedUrl(s3Client, command, {
    expiresIn: 300,
    unhoistableHeaders: new Set(['x-amz-meta-uploadid']),
  });

  const downloadLink =
    `https://${healthMapBucket}.s3.${region}.amazonaws.com/${key}`;

  return {
    uploadUrl,
    downloadLink,
    key,
    fileName: safeFileName,
  };
};

module.exports = createModuleUploadUrl;