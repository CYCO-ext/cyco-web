import { NextResponse } from "next/server";

const BASE_API_URL = process.env.BASE_API_URL;

export async function GET() {
  if (!BASE_API_URL) {
    return NextResponse.json({ error: "BASE_API_URL não configurada" }, { status: 500 });
  }

  const res = await fetch(`${BASE_API_URL}/vehicle`);
  const data = await res.json().catch(() => null);
  return NextResponse.json(data, { status: res.status });
}
