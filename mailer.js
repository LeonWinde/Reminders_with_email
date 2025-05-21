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
        to: process.env.TARGET_EMAIL,
        subject: 'YOU HAVE SHIT TODO',
        text
    })
    console.log(`Message sent: ${info.messageId}`);
}
export const sendHTMLMail = async (html) => {
    const info = await transporter.sendMail({
        from:` "Leon Winde <${process.env.MY_EMAIL}>`,
        to: process.env.TARGET_EMAIL,
        subject: 'YOU HAVE SHIT TODO',
        html
    })
    console.log(`Message sent: ${info.messageId}`);
}