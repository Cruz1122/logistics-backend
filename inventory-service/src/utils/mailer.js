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

const sendStockEmail = async (email, subject, message) => {
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
                      <h1 align="center" style="margin-top: 0; color:black;">${subject}</h1>
                      <p style="font-size: 18px; color: #575757;">Hi <strong style="color:black;">Dispatcher</strong>,</p>
                      <div style="margin: 30px 0;">
                        <p style="font-size: 16px; color: #333;">${message}</p>
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
    console.error("Error sending email:", error);
    return false;
  }
};

const sendManagerEmail = async (email, subject, message, password) => {
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
                      <h1 align="center" style="margin-top: 0; color:black;">${subject}</h1>
                      <p style="font-size: 18px; color: #575757;">Hi <strong style="color:black;">Manager</strong>,</p>
                      <div style="margin: 30px 0;">
                        <p style="font-size: 16px; color: #333;">${message}</p>
                        <p style="font-size: 16px; color: #333;">
                          Please sign in using your email and the following temporary password:
                        </p>
                        <p style="font-size: 18px; color: #1e3a8a; font-weight: bold; margin: 16px 0;">${password}</p>
                        <p style="font-size: 16px; color: #333;">
                          For security, please change your password after your first login.
                        </p>
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
  }
  catch (error) {
    console.error("Error sending email:", error);
    return false;
  }
}

module.exports = {
  sendStockEmail,
  sendManagerEmail
};
