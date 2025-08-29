import { S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { config } from './index';

// Create S3 client
export const s3Client = new S3Client({
  region: config.aws.region,
  credentials: {
    accessKeyId: config.aws.accessKeyId,
    secretAccessKey: config.aws.secretAccessKey,
  },
});

export const s3Config = {
  bucketName: config.aws.s3.bucketName,
  region: config.aws.s3.region,
};

// Helper function to generate pre-signed upload URL
export const generateUploadUrl = async (key: string, contentType: string, expiresIn = 3600) => {
  const command = new PutObjectCommand({
    Bucket: s3Config.bucketName,
    Key: key,
    ContentType: contentType,
  });

  return await getSignedUrl(s3Client, command, { expiresIn });
};

// Helper function to generate pre-signed download URL
export const generateDownloadUrl = async (key: string, expiresIn = 3600) => {
  const command = new GetObjectCommand({
    Bucket: s3Config.bucketName,
    Key: key,
  });

  return await getSignedUrl(s3Client, command, { expiresIn });
};

// Helper function to get public S3 URL
export const getPublicUrl = (key: string) => {
  return `https://${s3Config.bucketName}.s3.${s3Config.region}.amazonaws.com/${key}`;
};