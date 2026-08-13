import { getSessionUser } from '@/lib/auth/session';
import { NextResponse } from 'next/server';
import { getPendingRequests, submitDataSubjectRequest } from '@apexium/db';

export async function GET() {
  const user = await getSessionUser();
  if (!user || !user.schoolId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const requests = await getPendingRequests(user.schoolId);
    return NextResponse.json(requests);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user || !user.schoolId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await req.json();
    const dsr = await submitDataSubjectRequest({
      schoolId: user.schoolId,
      ...body,
    });
    return NextResponse.json(dsr);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
