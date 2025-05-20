import type { NextApiRequest, NextApiResponse } from "next";
import formidable from "formidable";
import fs from "fs";
import path from "path";

export const config = {
  api: {
    bodyParser: false, // Next.js의 기본 bodyParser 비활성화
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  // 업로드된 파일 저장 경로 설정
  const uploadDir = path.join(process.cwd(), "public", "uploads");
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  const form = formidable({
    uploadDir: uploadDir, // ✅ 여기 수정됨
    keepExtensions: true, // ✅ 여기 수정됨
    maxFileSize: 5 * 1024 * 1024, // (선택) 최대 파일 크기 설정 (5MB)
    multiples: false, // (선택) 다중 파일 업로드 허용 여부
  });

  try {
    const [fields, files] = await form.parse(req);

    const file = files["file"]?.[0]; // 📌 배열에서 첫 번째 파일 가져오기
    if (!file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const newPath = path.join(uploadDir, file.newFilename);
    fs.renameSync(file.filepath, newPath); // 파일 이동

    return res.status(200).json({ url: `/uploads/${file.newFilename}` });
  } catch (err) {
    return res.status(500).json({ error: "File upload failed" });
  }
}
