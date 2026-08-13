import { getSessionUser } from '@/lib/auth/session';
import { NextResponse } from 'next/server';
import { reviewDataSubjectRequest } from '@apexium/db';

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const user = await getSessionUser();
  if (!user || !user.schoolId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await req.json();
    const reviewed = await reviewDataSubjectRequest({
      requestId: params.id,
      schoolId: user.schoolId,
      adminUserId: user.id,
      status: body.status,
      adminNotes: body.adminNotes,
    });
    return NextResponse.json(reviewed);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
