import { redirect } from "next/navigation";

interface Props {
  params: {
    slug: string;
  };
}

export default function SchoolSlugLandingPage({ params }: Props) {
  redirect(`/s/${params.slug}/auth/login`);
}
