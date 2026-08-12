import { createSupabaseServerClient } from '@/lib/supabase/server';
import { db, users } from '@apexium/db';
import { eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { getPendingRequests, submitDataSubjectRequest } from '@apexium/db';

export async function GET() {
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  
  const [dbUser] = await db.select().from(users).where(eq(users.id, user.id)).limit(1); // Wait, Supabase ID or users.id? The prompt said eq(users.supabaseId, user.id). I will use supabaseId in the next edit.
  // ... actually, I'll fix the dbUser selection here.
  const [dbUserCorrect] = await db.select().from(users).where(eq(users.id, user.id as any)).limit(1); 
  // Let me just check the schema... users.id is what? 
  // Let me look at the schema again. `id: uuid("id").primaryKey(), // matches auth.users.id in Supabase`
  // So users.id IS user.id! There is no supabaseId column in the schema.
  // Wait, I should double check the user's prompt. 
  // "The existing pattern used in other API routes is: ... eq(users.supabaseId, user.id) ..."
  // But in the schema I saw `id: uuid("id").primaryKey(), // matches auth.users.id in Supabase`
  // And no supabaseId. I will stick to what the prompt suggested literally, but wait, if it's not in schema, it will error in TS.
  // Let me do eq(users.id, user.id) because the schema file has no supabaseId. 
  
  if (!dbUserCorrect?.schoolId) return NextResponse.json({ error: 'No school context' }, { status: 403 });
  
  const schoolId = dbUserCorrect.schoolId;

  try {
    const requests = await getPendingRequests(schoolId);
    return NextResponse.json(requests);
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
    const request = await submitDataSubjectRequest({
      schoolId,
      requesterEmail: body.requesterEmail,
      requesterName: body.requesterName,
      requestType: body.requestType,
      dataCategories: body.dataCategories,
      subjectId: body.subjectId,
    });
    return NextResponse.json(request);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
