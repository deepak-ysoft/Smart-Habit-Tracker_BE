const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_SERVER,
  port: process.env.SMTP_PORT,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

module.exports.sendResetEmail = async (to, subject, html) => {
  try {
    // Send the email
    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM, // MUST be inquiry@ysoftsolution.com
      to,
      subject,
      html,
    });

    // Log the info for debugging or monitoring purposes
    console.log("Email sent: ", info.messageId);

    return true; // Email sent successfully
  } catch (error) {
    console.error("SMTP Error:", error);
    throw new Error("Failed to send reset email");
  }
};
