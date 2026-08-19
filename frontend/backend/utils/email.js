const nodemailer = require('nodemailer');

let transporter;

const initializeTransporter = async () => {
  if (transporter) return; // Already initialized
  try {
    let testAccount = await nodemailer.createTestAccount();
    transporter = nodemailer.createTransport({
      host: "smtp.ethereal.email",
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });
    console.log('Ethereal Email transporter initialized.');
  } catch (err) {
    console.error('Failed to initialize Ethereal Email:', err);
  }
};

const sendWelcomeEmail = async (userEmail, username) => {
  await initializeTransporter();
  
  if (!transporter) {
    console.error('Transporter not initialized yet');
    return;
  }
  
  try {
    let info = await transporter.sendMail({
      from: '"ListenTogether Team" <noreply@listentogether.com>',
      to: userEmail,
      subject: "Welcome to ListenTogether!",
      text: `Hi ${username},\n\nWelcome to ListenTogether! Get ready to sync and vibe with your friends.\n\nCheers,\nListenTogether Team`,
      html: `<b>Hi ${username},</b><br><br>Welcome to ListenTogether! Get ready to sync and vibe with your friends.<br><br>Cheers,<br>ListenTogether Team`,
    });

    console.log("Message sent: %s", info.messageId);
    console.log("Preview URL: %s", nodemailer.getTestMessageUrl(info));
  } catch (error) {
    console.error("Error sending email:", error);
  }
};

module.exports = { sendWelcomeEmail };
