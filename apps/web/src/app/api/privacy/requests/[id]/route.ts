import { createSupabaseServerClient } from '@/lib/supabase/server';
import { db, users } from '@apexium/db';
import { eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { reviewDataSubjectRequest } from '@apexium/db';

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  
  const [dbUser] = await db.select().from(users).where(eq(users.id, user.id as any)).limit(1);
  if (!dbUser?.schoolId) return NextResponse.json({ error: 'No school context' }, { status: 403 });
  
  const schoolId = dbUser.schoolId;

  try {
    const body = await req.json();
    const request = await reviewDataSubjectRequest({
      requestId: params.id,
      schoolId,
      adminUserId: dbUser.id,
      status: body.status,
      adminNotes: body.adminNotes,
    });
    return NextResponse.json(request);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
