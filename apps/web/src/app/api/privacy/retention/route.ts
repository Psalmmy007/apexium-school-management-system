import { getSessionUser } from '@/lib/auth/session';
import { NextResponse } from 'next/server';
import { getRetentionPolicies, setRetentionPolicy } from '@apexium/db';

export async function GET() {
  const user = await getSessionUser();
  if (!user || !user.schoolId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const policies = await getRetentionPolicies(user.schoolId);
    return NextResponse.json(policies);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user || !user.schoolId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await req.json();
    const policy = await setRetentionPolicy({
      schoolId: user.schoolId,
      ...body,
    });
    return NextResponse.json(policy);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
