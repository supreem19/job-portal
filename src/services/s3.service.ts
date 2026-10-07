import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { randomUUID } from "crypto";
import { ServiceError } from "./service-error";

const getS3Config = () => {
  const bucket = process.env.AWS_S3_BUCKET;
  const region = process.env.AWS_REGION;
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

  if (!bucket || !region || !accessKeyId || !secretAccessKey) {
    throw new ServiceError(500, "AWS S3 configuration is missing");
  }

  return { bucket, region, accessKeyId, secretAccessKey };
};

export const uploadProfilePhoto = async (file: Express.Multer.File) => {
  const { bucket, region, accessKeyId, secretAccessKey } = getS3Config();
  const extension = file.originalname.split(".").pop()?.toLowerCase() ?? "jpg";
  const key = `images/${randomUUID()}.${extension}`;
  const client = new S3Client({
    region,
    credentials: { accessKeyId, secretAccessKey },
  });

  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
    }),
  );

  return `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
};
