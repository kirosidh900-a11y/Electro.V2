import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import userSchema from "../models/userSchema.model.js";
import dotenv from "dotenv";
import { createRef } from "../utils/auth.utils.js";
import AppError from "../utils/AppError.js";

dotenv.config();

// GENERATE UNIQUE REFERRAL CODE

const generateUniqueReferralCode = async () => await createRef();

// GOOGLE STRATEGY - USER

passport.use(
  "google-user",
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: "http://localhost:3000/auth/google-user/callback",
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email =
          profile.emails?.length > 0 ? profile.emails[0].value : null;

        if (!email) {
          return done(null, false, {
            message: "Email not available from Google",
          });
        }

        let user = await userSchema.findOne({ email });

        // BLOCK CHECK
        if (user && user.isBlock) {
          return done(null, false, {
            message: "Your account has been blocked ❌",
          });
        }

        // CREATE NEW USER IF NOT EXISTS
        if (!user) {
          const referralCode = await generateUniqueReferralCode();

          user = await userSchema.create({
            name: profile.displayName || "User",
            email,
            googleId: profile.id,
            referralCode,
          });
        }

        // If user exists but googleId not saved
        if (user && !user.googleId) {
          user.googleId = profile.id;
          await user.save();
        }

        return done(null, user);
      } catch (err) {
        return done(null, false, {
          message: "Authentication failed",
        });
      }
    },
  ),
);

export default passport;
