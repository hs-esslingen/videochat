import * as nodemailer from "nodemailer";
import { getLogger, configure } from "log4js";
export const logger = getLogger();

export class Email {
  constructor() {
    if (process.env.NODE_ENV === "development") {
      nodemailer.createTestAccount(this.setupTestAccount);
    } else {
    }
  }

  async setupAccount() {
    let mailConfig;
    mailConfig = {
      host: process.env.MAIL_HOST,
      port: process.env.MAIL_PORT,
      auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS,
      },
    };
  }

  async setupTestAccount(err: Error, account: nodemailer.TestAccount) {
    let mailConfig;
    mailConfig = {
      host: account.smtp.host,
      port: account.smtp.port,
      secure: account.smtp.secure,
      auth: {
        user: account.user,
        pass: account.pass,
      },
    };

    const transporter = nodemailer.createTransport(mailConfig);

    // Message object
    const message = {
      from: "Sender Name <sender@example.com>",
      to: "Recipient <recipient@example.com>",
      subject: "Videochat test notification",
      text:
        "This is a test message from videochat. Click on the following link",
      html: "<p><b>Hello</b> to myself!</p>",
    };

    const info = await transporter.sendMail(message);
    logger.debug("Message sent: ", info.messageId);
    // Preview only available when sending through an Ethereal account
    logger.debug("Preview URL: ", nodemailer.getTestMessageUrl(info));
  }
}
