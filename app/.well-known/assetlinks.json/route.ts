import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    const filePath = path.join(process.cwd(), 'public', '.well-known', 'assetlinks.json');
    
    // Проверяем существование файла
    if (!fs.existsSync(filePath)) {
      console.error('assetlinks.json file not found at:', filePath);
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      );
    }
    
    const fileContents = fs.readFileSync(filePath, 'utf8');
    const jsonData = JSON.parse(fileContents);
    
    // Возвращаем JSON с правильными headers для Android
    return NextResponse.json(jsonData, {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (error) {
    console.error('Error reading assetlinks.json:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

