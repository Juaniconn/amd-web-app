import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const UPLOAD_DIR = path.join(process.cwd(), "..", "ebay-automation", "public", "inventory-images");

// Asegurar que el directorio existe
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No se proporcionó archivo" }, { status: 400 });
    }

    // Validar tipo de archivo
    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: "Tipo de archivo no permitido" }, { status: 400 });
    }

    // Validar tamaño (máx 10MB)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json({ error: "Archivo demasiado grande (máx 10MB)" }, { status: 400 });
    }

    // Generar nombre único
    const ext = path.extname(file.name) || ".jpg";
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(7);
    const filename = `${timestamp}-${random}${ext}`;
    const filepath = path.join(UPLOAD_DIR, filename);

    // Guardar archivo
    const bytes = await file.arrayBuffer();
    fs.writeFileSync(filepath, Buffer.from(bytes));

    return NextResponse.json({
      success: true,
      filename,
      url: `/inventory-images/${filename}`,
      size: file.size,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET() {
  try {
    const files = fs.readdirSync(UPLOAD_DIR);
    const images = files
      .filter((f) => /\.(jpg|jpeg|png|webp|gif)$/i.test(f))
      .map((f) => ({
        filename: f,
        url: `/inventory-images/${f}`,
      }));
    return NextResponse.json({ images, total: images.length });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const filename = searchParams.get("filename");

    if (!filename) {
      return NextResponse.json({ error: "Nombre de archivo requerido" }, { status: 400 });
    }

    const filepath = path.join(UPLOAD_DIR, filename);

    if (!fs.existsSync(filepath)) {
      return NextResponse.json({ error: "Archivo no encontrado" }, { status: 404 });
    }

    fs.unlinkSync(filepath);
    return NextResponse.json({ success: true, deleted: filename });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
