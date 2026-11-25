import nodemailer from "nodemailer";
import {
  buildTournamentRegistrationEmailHtml,
  buildTournamentParticipantAddedEmailHtml,
  buildTournamentWinnerEmailHtml,
  buildCreditExpiryReminderEmailHtml,
  TournamentRegistrationEmailParams,
  TournamentParticipantAddedEmailParams,
  TournamentWinnerEmailParams,
  CreditExpiryReminderEmailParams,
} from "./emailTemplates";

// Initialize nodemailer transporter
const getTransporter = () => {
  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.GOOGLE_MAIL,
      pass: process.env.GOOGLE_MAIL_PASS,
    },
  });
};

const SENDER_EMAIL = "supercollectiblesc12@gmail.com";
const SENDER_NAME = "SuperCollectibles.com.mx";

/**
 * Send tournament registration confirmation email
 */
export async function sendTournamentRegistrationEmail(
  params: TournamentRegistrationEmailParams & { recipientEmail: string },
): Promise<{ success: boolean; error?: string }> {
  try {
    const transporter = getTransporter();
    const html = buildTournamentRegistrationEmailHtml(params);

    await transporter.sendMail({
      from: `"${SENDER_NAME}" <${SENDER_EMAIL}>`,
      to: params.recipientEmail,
      subject: `¡Inscripción Confirmada! — ${params.tournamentName}`,
      html,
    });

    return { success: true };
  } catch (error: any) {
    console.error("Error sending tournament registration email:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Send email when participant is manually added to tournament
 */
export async function sendTournamentParticipantAddedEmail(
  params: TournamentParticipantAddedEmailParams & { recipientEmail: string },
): Promise<{ success: boolean; error?: string }> {
  try {
    const transporter = getTransporter();
    const html = buildTournamentParticipantAddedEmailHtml(params);

    await transporter.sendMail({
      from: `"${SENDER_NAME}" <${SENDER_EMAIL}>`,
      to: params.recipientEmail,
      subject: `¡Te Hemos Agregado! — ${params.tournamentName}`,
      html,
    });

    return { success: true };
  } catch (error: any) {
    console.error("Error sending tournament participant added email:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Send tournament winner announcement with credit notification
 */
export async function sendTournamentWinnerEmail(
  params: TournamentWinnerEmailParams & { recipientEmail: string },
): Promise<{ success: boolean; error?: string }> {
  try {
    const transporter = getTransporter();
    const html = buildTournamentWinnerEmailHtml(params);

    await transporter.sendMail({
      from: `"${SENDER_NAME}" <${SENDER_EMAIL}>`,
      to: params.recipientEmail,
      subject: `¡Felicidades! Ganaste el Torneo — ${params.tournamentName}`,
      html,
    });

    return { success: true };
  } catch (error: any) {
    console.error("Error sending tournament winner email:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Send credit expiry reminder email (14 days before expiration)
 */
export async function sendCreditExpiryReminderEmail(
  params: CreditExpiryReminderEmailParams & { recipientEmail: string },
): Promise<{ success: boolean; error?: string }> {
  try {
    const transporter = getTransporter();
    const html = buildCreditExpiryReminderEmailHtml(params);

    await transporter.sendMail({
      from: `"${SENDER_NAME}" <${SENDER_EMAIL}>`,
      to: params.recipientEmail,
      subject: `Recordatorio: Tu Crédito Expira en ${params.daysRemaining} Días`,
      html,
    });

    return { success: true };
  } catch (error: any) {
    console.error("Error sending credit expiry reminder email:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Send bulk email (for cron jobs)
 * Used for expiry reminders and other batch operations
 */
export async function sendBulkTournamentEmails(
  recipients: Array<{
    email: string;
    name: string;
    type: "registration" | "winner" | "expiry_reminder";
    params: any;
  }>,
): Promise<{
  success: number;
  failed: number;
  errors: Array<{ email: string; error: string }>;
}> {
  const transporter = getTransporter();
  let success = 0;
  let failed = 0;
  const errors: Array<{ email: string; error: string }> = [];

  for (const recipient of recipients) {
    try {
      let html: string;
      let subject: string;

      switch (recipient.type) {
        case "registration":
          html = buildTournamentRegistrationEmailHtml(recipient.params);
          subject = `¡Inscripción Confirmada! — ${recipient.params.tournamentName}`;
          break;
        case "winner":
          html = buildTournamentWinnerEmailHtml(recipient.params);
          subject = `¡Felicidades! Ganaste el Torneo — ${recipient.params.tournamentName}`;
          break;
        case "expiry_reminder":
          html = buildCreditExpiryReminderEmailHtml(recipient.params);
          subject = `Recordatorio: Tu Crédito Expira en ${recipient.params.daysRemaining} Días`;
          break;
        default:
          throw new Error("Invalid email type");
      }

      await transporter.sendMail({
        from: `"${SENDER_NAME}" <${SENDER_EMAIL}>`,
        to: recipient.email,
        subject,
        html,
      });

      success++;
    } catch (error: any) {
      failed++;
      errors.push({
        email: recipient.email,
        error: error.message,
      });
      console.error(`Error sending email to ${recipient.email}:`, error);
    }
  }

  return { success, failed, errors };
}
