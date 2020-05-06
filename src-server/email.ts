import * as nodemailer from "nodemailer";
import { getLogger, configure } from "log4js";
import * as SMTPTransport from "nodemailer/lib/smtp-transport";
import * as Mail from "nodemailer/lib/mailer";
export const logger = getLogger();

export class Email {
  private transporter: Mail;

  readonly SENDER_NAME = process.env.MAIL_SENDER_NAME || "HSE Chat";
  readonly SENDER_EMAIL =
    process.env.MAIL_SENDER_EMAIL || "noreply@hse-chat.app";
  // private transporter
  constructor() {
    if (process.env.NODE_ENV === "development") {
      this.setupTestAccount();
    } else {
      this.setupAccount();
    }
  }

  private setupAccount() {
    const mailConfig: SMTPTransport.Options = {
      host: process.env.MAIL_HOST,
      port: parseInt(process.env.MAIL_PORT, 10),
      auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS,
      },
    };
    this.transporter = nodemailer.createTransport(mailConfig);
  }

  private setupTestAccount() {
    nodemailer.createTestAccount((err, account) => {
      const mailConfig: SMTPTransport.Options = {
        host: account.smtp.host,
        port: account.smtp.port,
        secure: account.smtp.secure,
        auth: {
          user: account.user,
          pass: account.pass,
        },
      };
      this.transporter = nodemailer.createTransport(mailConfig);
    });
  }

  async sendMail(
    recipientName: string,
    recipientMail: string,
    subject: string,
    text,
    html
  ) {
    // Message object
    const message = {
      from: `${this.SENDER_NAME} <${this.SENDER_EMAIL}>`,
      to: `${recipientName} <${recipientMail}>`,
      subject,
      text,
      html,
    };

    const info = await this.transporter.sendMail(message);
    logger.debug("Message sent: ", info.messageId);
    // Preview only available when sending through an Ethereal account
    logger.debug("Preview URL: ", nodemailer.getTestMessageUrl(info));
  }
}

type MailConfig = {
  host: string;
  port: string;
  auth: {
    user: string;
    pass: string;
  };
};
