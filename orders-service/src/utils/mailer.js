const nodemailer = require("nodemailer");
require("dotenv").config();


/**
 * Configures the Nodemailer transporter for sending emails using Gmail SMTP.
 */
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


/**
 * Sends an order tracking code email to the specified recipient.
 * @param {Object} params - The email parameters.
 * @param {string} params.fullName - The full name of the recipient.
 * @param {string} params.subject - The subject of the email.
 * @param {string} params.code - The tracking code to send.
 * @param {string} params.email - The recipient's email address.
 * @returns {Promise<boolean>} Returns true if the email was sent successfully, otherwise false.
 */
const sendTrackingCodeEmail = async ({ fullName, subject, code, email }) => {
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
                        <p style="font-size: 24px; color: #575757;">Hi <strong style="color:black;">${fullName}</strong>,</p><p style="font-size: 24px; color: #575757;">Thank you for ordering!</p>
                        <p style="font-size: 24px; color: #575757;"><strong style="color:black;">Track</strong> your order with the code below:</p>
                        <div style="text-align: center; margin: 30px 0;">
                          <span
                            style="display: inline-block; font-size: 32px; background: linear-gradient(90deg, #33a8e7, #1e3a8a); color: white; padding: 10px 20px; border-radius: 8px; letter-spacing: 2px;"><strong>${code}</strong></span>
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

module.exports = {
    sendTrackingCodeEmail,
};