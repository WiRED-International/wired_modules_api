const { S3Client } = require('@aws-sdk/client-s3');

const region = process.env.AWS_REGION || 'us-east-1';

const healthMapBucket =
  process.env.HEALTHMAP_S3_BUCKET || 'wired-healthmap-bucket';

const moduleZipPrefix = 'zips/';

const s3Client = new S3Client({
  region,
  credentials: {
    accessKeyId: process.env.HEALTHMAP_S3_ACCESS_KEY_ID,
    secretAccessKey: process.env.HEALTHMAP_S3_SECRET_ACCESS_KEY,
  },
});

module.exports = {
  s3Client,
  region,
  healthMapBucket,
  moduleZipPrefix,
};