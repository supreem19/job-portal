import { DeleteObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { randomUUID } from "crypto";
import { extname } from "path";
import { ServiceError } from "./service-error";

const imageExtensions = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
]);
const resumeSignatures = new Map([
  [".pdf", Buffer.from("%PDF-")],
  [".doc", Buffer.from("d0cf11e0a1b11ae1", "hex")],
  [".docx", Buffer.from("504b0304", "hex")],
]);

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

let client: S3Client | undefined;

const getS3Client = () => {
  if (!client) {
    const { region, accessKeyId, secretAccessKey } = getS3Config();
    client = new S3Client({
      region,
      credentials: { accessKeyId, secretAccessKey },
    });
  }
  return client;
};

const uploadFile = async (file: Express.Multer.File, key: string) => {
  const { bucket, region } = getS3Config();

  await getS3Client().send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
    }),
  );

  return `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
};

export const uploadProfilePhoto = async (file: Express.Multer.File) => {
  const extension = imageExtensions.get(file.mimetype);
  if (!extension) {
    throw new ServiceError(400, "Only JPEG, PNG, and WebP images are allowed");
  }
  return uploadFile(file, `images/${randomUUID()}.${extension}`);
};

const validateResume = (file: Express.Multer.File) => {
  const extension = extname(file.originalname).toLowerCase();
  const signature = resumeSignatures.get(extension);
  if (!signature || !file.buffer.subarray(0, signature.length).equals(signature)) {
    throw new ServiceError(400, "Resume content does not match its file type");
  }
  return extension;
};

export const uploadResume = async (file: Express.Multer.File) => {
  const extension = validateResume(file);
  return uploadFile(file, `resume/${randomUUID()}${extension}`);
};

// Cleanup must not hide the original failure or undo a committed database update.
export const cleanupUploadedFiles = async (urls: (string | undefined)[]) => {
  const results = await Promise.allSettled(
    urls.filter((url): url is string => Boolean(url)).map(async (url) => {
      const { bucket, region } = getS3Config();
      const prefix = `https://${bucket}.s3.${region}.amazonaws.com/`;
      if (!url.startsWith(prefix)) return;
      const key = url.slice(prefix.length);
      if (!/^(images|resume)\/[0-9a-f-]{36}\.(jpg|jpeg|png|webp|pdf|doc|docx)$/.test(key)) {
        return;
      }
      await getS3Client().send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
    }),
  );
  for (const result of results) {
    if (result.status === "rejected") {
      console.error("Unable to clean up S3 file", result.reason);
    }
  }
};

export interface UserUploadFiles {
  profilePhoto?: Express.Multer.File | undefined;
  resume?: Express.Multer.File | undefined;
}

export const uploadRegistrationFiles = async (files: UserUploadFiles) => {
  if (files.resume) validateResume(files.resume);
  const [resumeResult, photoResult] = await Promise.allSettled([
    files.resume ? uploadResume(files.resume) : Promise.resolve(undefined),
    files.profilePhoto ? uploadProfilePhoto(files.profilePhoto) : Promise.resolve(undefined),
  ]);
  if (resumeResult.status === "rejected" || photoResult.status === "rejected") {
    await cleanupUploadedFiles(
      [resumeResult, photoResult].flatMap(
        (result) => result.status === "fulfilled" ? [result.value] : [],
      ),
    );
    if (resumeResult.status === "rejected") throw resumeResult.reason;
    if (photoResult.status === "rejected") throw photoResult.reason;
  }
  const resumeUrl = resumeResult.value;
  const profilePhoto = photoResult.value;
  return {
    profilePhoto,
    resume: resumeUrl && files.resume
      ? { url: resumeUrl, originalName: files.resume.originalname }
      : undefined,
  };
};
