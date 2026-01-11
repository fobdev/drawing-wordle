import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const today = new Date().toISOString().split("T")[0];
    const response = await fetch(
      `https://www.nytimes.com/svc/wordle/v2/${today}.json`
    );
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 });
  }
}