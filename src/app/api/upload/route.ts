// User-owned upload route. On Vercel it stores files in Vercel Blob.
import 'server-only';
import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/require-auth';

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB
const ALLOWED_EXTENSIONS = ['.pdf', '.docx'];
const ALLOWED_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

async function extractText(buffer: Buffer, ext: string): Promise<string> {
  if (ext === '.docx') {
    const mammoth = await import('mammoth');
    const parsed = await mammoth.extractRawText({ buffer });
    return parsed.value;
  }

  const pdfParse = (await import('pdf-parse')).default;
  const parsed = await pdfParse(buffer);
  return parsed.text;
}

export async function POST(req: Request) {
  try {
    await requireAuth(req);
  } catch (res) {
    return res as Response;
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400 });
  }

  const file = formData.get('file');
  if (!file || typeof file === 'string') {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 });
  }

  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Invalid file' }, { status: 400 });
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: 'File too large (max 10 MB)' }, { status: 400 });
  }

  const ext = `.${(file.name.split('.').pop() ?? '').toLowerCase()}`;
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return NextResponse.json({ error: 'Invalid file type - PDF or DOCX only' }, { status: 400 });
  }

  if (file.type && !ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: 'Invalid MIME type' }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    try {
      const text = await extractText(buffer, ext);
      return NextResponse.json({
        url: null,
        text,
        filename: file.name,
        size: file.size,
        mimeType: file.type,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[upload] local resume extraction failed: ${msg}`);
      return NextResponse.json({ error: 'Could not extract resume text' }, { status: 500 });
    }
  }

  try {
    const { put } = await import('@vercel/blob');
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '-');
    const pathname = `resumes/${crypto.randomUUID()}-${safeName}`;
    const blob = await put(pathname, file, {
      access: 'public',
      contentType: file.type,
    });

    let text = '';
    try {
      text = await extractText(buffer, ext);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[upload] resume extraction after Blob upload failed: ${msg}`);
    }

    return NextResponse.json({
      url: blob.url,
      text,
      filename: file.name,
      size: file.size,
      mimeType: file.type,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    // biome-ignore lint/suspicious/noConsole: structured server-side error logging for Blob diagnostics
    console.error(`[upload] Vercel Blob upload failed: ${msg}`);
    try {
      const text = await extractText(buffer, ext);
      return NextResponse.json({
        url: null,
        text,
        filename: file.name,
        size: file.size,
        mimeType: file.type,
      });
    } catch {
      return NextResponse.json({ error: 'Upload service unavailable' }, { status: 502 });
    }
  }
}
