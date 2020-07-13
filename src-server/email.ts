import * as nodemailer from 'nodemailer';
import {getLogger} from 'log4js';
import * as SMTPTransport from 'nodemailer/lib/smtp-transport';
import * as Mail from 'nodemailer/lib/mailer';
export const logger = getLogger();

/**
 * email service for sending emails
 *
 * @export
 * @class Email
 */
export class Email {
  private transporter?: Mail;

  readonly SENDER_NAME = process.env.MAIL_SENDER_NAME || 'HSE Chat';
  readonly SENDER_EMAIL = process.env.MAIL_SENDER_EMAIL || 'noreply@hse-chat.app';
  // private transporter
  // constructor() {
  //   if (process.env.NODE_ENV === 'development') {
  //     this.setupTestAccount();
  //   } else {
  //     this.setupAccount();
  //   }
  // }

  /**
   * initialize a mail account configured with environment variables
   *
   * @private
   * @memberof Email
   */
  private setupAccount() {
    if (!process.env.MAIL_PORT) process.env.MAIL_PORT = '465';
    const mailConfig: SMTPTransport.Options = {
      host: process.env.MAIL_HOST,
      port: parseInt(process.env.MAIL_PORT, 10),
      auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS,
      },
    };
    this.transporter = nodemailer.createTransport(mailConfig);
    this.verifyConnection();
  }

  /**
   * initialize a test mail account from nodemailer
   *
   * @private
   * @memberof Email
   */
  private setupTestAccount() {
    nodemailer.createTestAccount((err: Error | null, account: nodemailer.TestAccount) => {
      if (err) {
        logger.error('setup test account failed: ' + err);
      }
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
      this.verifyConnection();
    });
  }

  /**
   * verifies the configured connection to the mail provider
   *
   * @private
   * @memberof Email
   */
  private verifyConnection() {
    // verify connection configuration
    this.transporter?.verify((error: Error | null, success: true) => {
      if (error) {
        logger.error(error);
      }
      if (success) {
        logger.trace('Server is ready to take our messages');
      } else {
        logger.error('no success on verifing smtp connection');
      }
    });
  }

  /**
   * send a mail from mail account to recipient
   *
   * @param {string} recipientName name of recipient
   * @param {string} recipientMail mail address of recipient
   * @param {string} subject of the mail
   * @param {string} text message in text format
   * @param {string} html message in html format
   * @memberof Email
   */
  async sendMail(recipientName: string, recipientMail: string, subject: string, text: string, html: string) {
    // Message object
    const message = {
      from: `${this.SENDER_NAME} <${this.SENDER_EMAIL}>`,
      to: `${recipientName} <${recipientMail}>`,
      subject,
      text,
      html,
    };

    const info = await this.transporter?.sendMail(message);
    logger.debug('E-Mail sent! messageID: ', info?.messageId, ' - envelope: ', info?.envelope);

    if (process.env.NODE_ENV === 'development' && info) {
      // Preview only available when sending through an Ethereal account
      logger.debug('Preview URL: ', nodemailer.getTestMessageUrl(info));
    }
  }
}
