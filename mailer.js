import nodemailer from 'nodemailer'
import dotenv from 'dotenv'

dotenv.config()

let transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.MY_EMAIL,
        pass: process.env.MY_EMAIL_PASSWORD
    }
})

export const sendMail = async (text) => {
    const info = await transporter.sendMail({
        from:` "Leon Winde <${process.env.MY_EMAIL}>`,
        to: "leon.winde@gmx.de",
        subject: 'YOU HAVE SHIT TODO',
        text
    })
    console.log(`Message sent: ${info.messageId}`);
}