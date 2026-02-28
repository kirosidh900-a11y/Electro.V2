import { transporter } from "../config/mailer.js";

export const sendEmail = async ({ email, name, otp }) => {
  const mailOptions = {
    from: `"Electro Support" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: "Your OTP Verification Code",
    html: `
      <div style="font-family: Arial; padding: 20px;">
        <h2>Hi ${name || "User"},</h2>
        <p>Your OTP for signup is:</p>
        <h1 style="color:#FF4D4D;">${otp}</h1>
        <p>This OTP is valid for 1 minute.</p>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
};

