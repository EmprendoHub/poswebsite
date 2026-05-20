import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import User from "@/backend/models/User";
import Customer from "@/backend/models/Customer";
import bcrypt from "bcrypt";
import { signJwtToken } from "@/lib/jwt";
import dbConnect from "@/lib/db";
import crypto from "crypto";
import axios from "axios";
import { NextResponse } from "next/server";

export const options = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_ID!,
      clientSecret: process.env.GOOGLE_SECRET!,
    }),
    CredentialsProvider({
      type: "credentials",
      credentials: {
        email: {
          label: "Email",
          type: "text",
          placeholder: "Enter your user name",
        },
        password: {
          label: "Password",
          type: "password",
          placeholder: " Enter your password",
        },
      },

      async authorize(credentials: any, request) {
        const { email, password, recaptcha, honeypot, cookie } = credentials;

        if (honeypot) {
          throw new Error("no bots thank you");
        }
        if (!cookie) {
          // Not Signed in
          throw new Error("You are not authorized no no no");
        }
        const secretKey = process?.env?.RECAPTCHA_SECRET_KEY;
        const formData = `secret=${secretKey}&response=${recaptcha}`;
        let response: any;
        try {
          response = await axios.post(
            "https://www.google.com/recaptcha/api/siteverify",
            formData,
            {
              headers: {
                "Content-Type": "application/x-www-form-urlencoded",
              },
            },
          );
        } catch (error) {
          console.log("recaptcha error:", error);
        }
        if (response && response.data?.success && response.data?.score > 0.5) {
          await dbConnect();
          const user = await User?.findOne({ email }).select("+password");

          if (!user) {
            console.log("no user error");
            throw new Error("hubo un error al iniciar session");
          }

          const comparePass = await bcrypt.compare(password, user.password);

          if (!comparePass) {
            if (user) {
              user.loginAttempts += 1;
              await user.save();
              if (user.loginAttempts >= 3) {
                throw new Error("excediste el limite de intentos");
              }
            }
            throw new Error("hubo un error al iniciar session");
          } else {
            if (user.active === false) {
              throw new Error("verify your email");
            }
            user.loginAttempts = 0;
            await user.save();
            const { password, ...currentUser } = user._doc;
            const accessToken = signJwtToken(currentUser, { expiresIn: "6d" });
            return {
              ...currentUser,
              accessToken,
            };
          }
        } else {
          console.log("fail: res.data?.score:", response.data?.score);
          return NextResponse.json({
            success: false,
            email,
            score: response.data?.score,
          });
        }
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account }: { user: any; account: any }) {
      if (account?.provider == "credentials") {
        return true;
      }
      if (account?.provider == "google") {
        await dbConnect();
        try {
          const existinguser = await User?.findOne({
            email: user.email,
          }).select("+password");

          if (!existinguser) {
            // Generate a random 64-byte token
            const verificationToken = crypto.randomBytes(64).toString("hex");

            const newUser = new User({
              email: user.email,
              name: user.name,
              verificationToken: verificationToken,
              active: true,
            });

            await newUser.save();

            // Also create a matching Customer record
            const existingCustomer = await Customer.findOne({
              email: user.email,
            });
            if (!existingCustomer) {
              const newCustomer = new Customer({
                name: user.name,
                email: user.email,
                user: newUser._id,
              });
              await newCustomer.save();
            }

            return true;
          }
          return true;
        } catch (error) {
          console.log("error saving google user", error);
          return false;
        }
      }
    },
    async jwt({
      token,
      user,
      account,
    }: {
      token: any;
      user: any;
      account: any;
    }) {
      if (account?.provider == "google") {
        if (user) {
          const existinguser = await User?.findOne({
            email: user.email,
          }).select("+password");

          const currentUser = {
            avatar: { url: user.image },
            _id: existinguser._id,
            name: user.name,
            email: user.email,
            phone: user.phone,
            role: existinguser.role,
            createdAt: existinguser.createdAt,
            updatedAt: existinguser.updatedAt,
            accessToken: account.access_token,
            stripeId: existinguser.stripe_id,
          };

          token.accessToken = account.access_token;
          token._id = currentUser._id;
          token.user = currentUser;
        }
      } else {
        if (user) {
          token.accessToken = user.accessToken;
          token._id = user._id;
          token.user = user;
          const updatedUser = await User.findById(token._id).select(
            "+password",
          );
          token.user = updatedUser;
        }
      }

      return token;
    },
    async session({ session, token }: { session: any; token: any }) {
      if (token) {
        session.user._id = token._id;
        session.user.accessToken = token.accessToken;
        session.user.createdAt = token.user.createdAt;
        session.user.role = token.user.role;
        session.user.phone = token.user.phone;
        session.user.stripeId = token.user.stripe_id || token.user.stripeId;
        session.user.assignedStore = token.user.assignedStore
          ? String(token.user.assignedStore)
          : null;
      }
      return session;
    },
  },
  pages: {
    signIn: "/iniciar",
    error: "/error",
  },

  secret: process.env.NEXTAUTH_SECRET,
};
