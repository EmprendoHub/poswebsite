import { getCookiesName } from "@/backend/helpers";
import GoogleCaptchaWrapper from "@/components/layouts/GoogleCaptchaWrapper";
import RegisterFormComponent from "@/components/layouts/RegisterComponent";
import { cookies } from "next/headers";

const RegisterPage = () => {
  //set cookies
  const nextCookies = cookies();
  const cookieName = getCookiesName();
  const nextAuthSessionToken = nextCookies.get(cookieName);
  const cookie = `${cookieName}=${nextAuthSessionToken?.value}`;
  return (
    <GoogleCaptchaWrapper>
      <RegisterFormComponent cookie={cookie} />
    </GoogleCaptchaWrapper>
  );
};
export default RegisterPage;
