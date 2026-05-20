import * as minio from "minio";

const mc = new minio.Client({
  endPoint: "minio.salvawebpro.com",
  port: 9000,
  useSSL: true,
  accessKey: process.env.MINIO_ACCESS!,
  secretKey: process.env.MINIO_SECRET!,
});

export { mc };
