import ErrorComponent from "./_components/ErrorComponent";

async function containsVerifyEmail(str: string) {
  return str.toLowerCase().includes("verify your email");
}

async function containsLoginError(str: string) {
  return str.toLowerCase().includes("hubo un error al iniciar session");
}

async function exceededAttemptsError(str: string) {
  return str.toLowerCase().includes("excediste el limite de intentos");
}

async function botLoginError(str: string) {
  return str.toLowerCase().includes("no bots thank you");
}

async function NoCookieLoginError(str: string) {
  return str.toLowerCase().includes("you are not authorized no no no");
}

const ErrorPage = async ({
  searchParams,
}: {
  searchParams: Promise<any>;
}) => {
  const resolvedSearchParams = await searchParams;
  const ifEmailNotVerified = await containsVerifyEmail(
    resolvedSearchParams.error,
  );
  const ifLoginError = await containsLoginError(resolvedSearchParams.error);
  const ifExceededAttempts = await exceededAttemptsError(
    resolvedSearchParams.error,
  );
  const ifBotLoginAttempt = await botLoginError(resolvedSearchParams.error);
  const ifNoCookieLoginError = await NoCookieLoginError(
    resolvedSearchParams.error,
  );
  return (
    <ErrorComponent
      ifEmailNotVerified={ifEmailNotVerified}
      ifLoginError={ifLoginError}
      ifExceededAttempts={ifExceededAttempts}
      ifBotLoginAttempt={ifBotLoginAttempt}
      ifNoCookieLoginError={ifNoCookieLoginError}
    />
  );
};

export default ErrorPage;
