import { createSupabaseServerClient } from '@/lib/supabase/server';
import { db, users } from '@apexium/db';
import { eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { getSchoolConsents, recordConsent } from '@apexium/db';

export async function GET() {
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  
  const [dbUser] = await db.select().from(users).where(eq(users.id, user.id as any)).limit(1);
  if (!dbUser?.schoolId) return NextResponse.json({ error: 'No school context' }, { status: 403 });
  
  const schoolId = dbUser.schoolId;

  try {
    const consents = await getSchoolConsents(schoolId);
    return NextResponse.json(consents);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  
  const [dbUser] = await db.select().from(users).where(eq(users.id, user.id as any)).limit(1);
  if (!dbUser?.schoolId) return NextResponse.json({ error: 'No school context' }, { status: 403 });
  
  const schoolId = dbUser.schoolId;

  try {
    const body = await req.json();
    const consent = await recordConsent({
      schoolId,
      dataSubjectId: body.dataSubjectId,
      subjectType: body.subjectType,
      dataCategory: body.dataCategory,
      legalBasis: body.legalBasis,
      consentText: body.consentText,
      expiresAt: body.expiresAt ? new Date(body.expiresAt) : undefined,
      ipAddress: body.ipAddress,
    });
    return NextResponse.json(consent);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
