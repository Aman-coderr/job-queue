import sharp from "sharp";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { s3Client } from "shared";
import * as crypto from "crypto";

export async function imageResizeExecutor(fileUrl: string, width: number, height: number,): Promise<string> {
  const response = await fetch(fileUrl);
  if (!response.ok) {
    throw new Error(`Failed to Fetch original image: ${response.statusText}`);
  }
  const originalBuffer = Buffer.from(await response.arrayBuffer());

  const resizedBuffer = await sharp(originalBuffer)
    .resize(width, height)
    .toBuffer();

  const resultKey = `resized-${crypto.randomUUID()}.jpg`;

  await s3Client.send(
    new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: resultKey,
      Body: resizedBuffer,
      ContentType: "image/jpeg",
    })
  );
  const resultUrl = `${process.env.R2_PUBLIC_URL}/${resultKey}`;
  return resultUrl;

}
