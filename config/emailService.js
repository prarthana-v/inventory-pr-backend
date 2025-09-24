// utils/emailService.js

const nodemailer = require('nodemailer');

const sendEmail = async (options) => {
    // 1. Create a transporter (the service that will send the email, e.g., Gmail)
    // NOTE: For Gmail, you may need to use an "App Password" if you have 2-Factor Auth enabled.
    const transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST, // e.g., 'smtp.gmail.com'
        port: process.env.EMAIL_PORT, // e.g., 587
        secure: false, // true for 465, false for other ports
        auth: {
            user: process.env.EMAIL_USER, // Your email address
            pass: process.env.EMAIL_PASS, // Your email password or app password
        },
    });

    // 2. Define the email options
    const mailOptions = {
        from: `Your App Name <${process.env.EMAIL_USER}>`,
        to: options.email,
        subject: options.subject,
        text: options.message,
        // html: '<b>Hello world?</b>' // You can also send HTML
    };

    // 3. Actually send the email
    await transporter.sendMail(mailOptions);
};

module.exports = sendEmail;