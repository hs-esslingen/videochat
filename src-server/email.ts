import * as nodemailer from "nodemailer";
import { getLogger, configure } from "log4js";
export const logger = getLogger();

export class Email {
  constructor() {
    nodemailer.createTestAccount(this.setupTestAccount);
  }

  async setupTestAccount(err: Error, account: nodemailer.TestAccount) {
    // Generate SMTP service account from ethereal.email
    if (err) {
      console.error(
        "Error: " +
          err.name +
          " ,Failed to create a testing account: " +
          err.message
      );
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

    transporter.sendMail(message, (errSend: Error, info: any) => {
      if (errSend) {
        console.log("Error occurred. " + err.message);
        return process.exit(1);
      }
      console.log("Message sent: %s", info.messageId);
      // Preview only available when sending through an Ethereal account
      console.log("Preview URL: %s", nodemailer.getTestMessageUrl(info));
    });
  }
}
