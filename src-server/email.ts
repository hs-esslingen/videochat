import * as nodemailer from "nodemailer";
import { getLogger, configure } from "log4js";
export const logger = getLogger();

export class Email {
  constructor() {
    if (process.env.DEBUG === "true") {
      nodemailer.createTestAccount(this.setupTestAccount);
    } else {
    }
  }

  async setupTestAccount(err: Error, account: nodemailer.TestAccount) {
    // Generate SMTP service account from ethereal.email
    if (err) {
      logger.error("Failed to create a testing account: ", err.message);
      return process.exit(1);
    }

    console.log("Credentials obtained, sending message...");

    // Create a SMTP transporter object
    const transporter = nodemailer.createTransport({
      host: account.smtp.host,
      port: account.smtp.port,
      secure: account.smtp.secure,
      auth: {
        user: account.user,
        pass: account.pass,
      },
    });

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
