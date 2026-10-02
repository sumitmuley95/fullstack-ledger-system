const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        type: 'OAuth2',
        user: process.env.EMAIL_USER,
        clientId: process.env.CLIENT_ID,
        clientSecret: process.env.CLIENT_SECRET,
        refreshToken: process.env.REFRESH_TOKEN,
    },
});

// Verify the connection configuration
transporter.verify((error, success) => {
    if (error) {
        console.error('Error connecting to email server:', error);
    } else {
        console.log('Email server is ready to send messages');
    }
});

function escapeHtml(value) {
    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;")
}

function formatRupees(paise) {
    return (paise / 100).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
// Function to send email
const sendEmail = async (to, subject, text, html) => {
    try {
        const info = await transporter.sendMail({
            from: `"Ledger Banking System" <${process.env.EMAIL_USER}>`, // sender address
            to, // list of receivers
            subject, // Subject line
            text, // plain text body
            html, // html body
        });

        console.log('Message sent: %s', info.messageId);
    } catch (error) {
        console.error('Error sending email:', error)
        throw error
    }
};


async function sendRegistrationEmail(userEmail, name) {
    const subject = 'Welcome to Ledger Banking System!'
    const text = `Hello ${name},\n\nThank you for registering at Ledger Banking System. We're excited to have you on board!\n\nBest regards,\nThe Ledger Banking System Team`
    const html = `<p>Hello ${escapeHtml(name)},</p><p>Thank you for registering at Ledger Banking System. We're excited to have you on board!</p><p>Best regards,<br>The Ledger Banking System Team</p>`

    await sendEmail(userEmail, subject, text, html)
}

async function sendTransactionEmail(userEmail, name, amountPaise, toAccount) {
    const amount = formatRupees(amountPaise)
    const subject = 'Transaction Successful'
    const text = `Hello ${name},\n\nYour transfer of ₹${amount} to account ${toAccount} was successful.\n\nBest regards,\nThe Ledger Banking System Team`
    const html = `<p>Hello ${escapeHtml(name)},</p><p>Your transfer of ₹${amount} to account ${escapeHtml(toAccount)} was successful.</p><p>Best regards,<br>The Ledger Banking System Team</p>`

    await sendEmail(userEmail, subject, text, html)
}

async function sendTransactionFailureEmail(userEmail, name, amountPaise, toAccount) {
    const amount = formatRupees(amountPaise)
    const subject = 'Transaction Failed'
    const text = `Hello ${name},\n\nYour transfer of ₹${amount} to account ${toAccount} has failed. Please try again later.\n\nBest regards,\nThe Ledger Banking System Team`
    const html = `<p>Hello ${escapeHtml(name)},</p><p>Your transfer of ₹${amount} to account ${escapeHtml(toAccount)} has failed. Please try again later.</p><p>Best regards,<br>The Ledger Banking System Team</p>`

    await sendEmail(userEmail, subject, text, html)
}

module.exports = {
    sendRegistrationEmail,
    sendTransactionEmail,
    sendTransactionFailureEmail
};