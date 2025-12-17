import { NextResponse } from "next/server";
import { getEmailTemplates } from "@/lib/data/automations";

export async function GET() {
  try {
    const templates = await getEmailTemplates();
    return NextResponse.json(templates);
  } catch (error) {
    console.error("Error fetching email templates:", error);
    return NextResponse.json([], { status: 500 });
  }
}
