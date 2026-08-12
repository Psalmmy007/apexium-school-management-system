import { createSupabaseServerClient } from '@/lib/supabase/server';
import { db, users } from '@apexium/db';
import { eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { getRetentionPolicies, setRetentionPolicy } from '@apexium/db';

export async function GET() {
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  
  const [dbUser] = await db.select().from(users).where(eq(users.id, user.id as any)).limit(1);
  if (!dbUser?.schoolId) return NextResponse.json({ error: 'No school context' }, { status: 403 });
  
  const schoolId = dbUser.schoolId;

  try {
    const policies = await getRetentionPolicies(schoolId);
    return NextResponse.json(policies);
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
    const policy = await setRetentionPolicy({
      schoolId,
      dataCategory: body.dataCategory,
      retentionYears: body.retentionYears,
      legalBasisNote: body.legalBasisNote,
    });
    return NextResponse.json(policy);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
