const nodemailer = require("nodemailer");
require("dotenv").config();

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
  tls: {
    rejectUnauthorized: false,
  },
});

const sendVerificationEmail = async (email, code, fullName, subject) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: subject,
    html: `
      <div>
        <title>${subject}</title>

        <body style="margin: 0; padding: 0; background-color: #f4f4f4; font-family: Arial, sans-serif;">
          <table align="center" width="100%" cellpadding="0" cellspacing="0"
            style="background-color: #f4f4f4; padding: 40px 0;">
            <tr>
              <td>
                <table align="center" width="600" cellpadding="0" cellspacing="0"
                  style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); overflow: hidden;">
                  <tr>
                    <td style="background: linear-gradient(90deg, #33a8e7, #1e3a8a); padding: 20px; text-align: center;">
                      <h1 style="color: white; margin: 0;">LogicSmart360</h1>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 30px; color: #333;">
                      <h1 align="center"style="margin-top: 0; color:black;">${subject}</h2>
                        <p style="font-size: 24px; color: #575757;">Hi <strong style="color:black;">${fullName}</strong>,</p>
                        <p style="font-size: 24px; color: #575757;">Your code for <strong style="color:black;">${subject}</strong> is:</p>
                        <div style="text-align: center; margin: 30px 0;">
                          <span
                            style="display: inline-block; font-size: 32px; background: linear-gradient(90deg, #33a8e7, #1e3a8a); color: white; padding: 10px 20px; border-radius: 8px; letter-spacing: 2px;"><strong>${code}</strong></span>
                          <p style="font-size: 14px; color: #777;">This code expires in 15 minutes.</p>
                        </div>
                    </td>
                  </tr>
                  <tr>
                    <td
                      style="background: linear-gradient(90deg, #33a8e7, #1e3a8a); color: white; text-align: center; padding: 20px; font-size: 12px;">
                      &copy; 2025 LogicSmart360 - All rights reserved
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    console.error("Error sending verification email:", error);
    return false;
  }
};

module.exports = {
  sendVerificationEmail,
};
