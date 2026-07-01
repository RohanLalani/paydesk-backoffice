import { VerifyEmailScreen } from "@/src/components/auth/VerifyEmailScreen";

type VerifyEmailPageProps = {
  searchParams: Promise<{
    token?: string | string[];
    type?: string | string[];
  }>;
};

function firstValue(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function VerifyEmailPage({
  searchParams,
}: VerifyEmailPageProps) {
  const params = await searchParams;

  return (
    <VerifyEmailScreen
      token={firstValue(params.token)}
      type={firstValue(params.type)}
    />
  );
}
