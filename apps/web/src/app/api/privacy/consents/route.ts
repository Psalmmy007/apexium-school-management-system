import { getSessionUser } from '@/lib/auth/session';
import { NextResponse } from 'next/server';
import { getSchoolConsents, recordConsent } from '@apexium/db';

export async function GET() {
  const user = await getSessionUser();
  if (!user || !user.schoolId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const consents = await getSchoolConsents(user.schoolId);
    return NextResponse.json(consents);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user || !user.schoolId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await req.json();
    const consent = await recordConsent({
      schoolId: user.schoolId,
      ...body,
    });
    return NextResponse.json(consent);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
