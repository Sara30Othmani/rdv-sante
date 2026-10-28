import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";

const HOST = process.env.MAILTRAP_HOST || "smtp.mailtrap.io";
const PORT = Number(process.env.MAILTRAP_PORT) || 587;
const USER = process.env.MAILTRAP_USER || "";
const PASS = process.env.MAILTRAP_PASS || "";
const FROM = process.env.MAILTRAP_FROM || "RDV Santé <noreply@rdv-sante.local>";

let transporter: Transporter | null = null;

function getTransporter(): Transporter {
  if (transporter) return transporter;
  transporter = nodemailer.createTransport({
    host: HOST,
    port: PORT,
    auth: USER && PASS ? { user: USER, pass: PASS } : undefined,
    secure: false,
  });
  return transporter;
}

export type MailOptions = {
  to: string;
  subject: string;
  html: string;
  text?: string;
};

/** Envoie un e-mail via Mailtrap (ou la console en mode démo si non configuré). */
export async function sendMail({ to, subject, html, text }: MailOptions): Promise<boolean> {
  const from = FROM;
  if (!USER || !PASS) {
    // Mode démo : on affiche dans la console pour ne pas casser le développement.
    console.log("[mailer] Configuration Mailtrap absente — e-mail simulaire :");
    console.log(`  To: ${to}`);
    console.log(`  Subject: ${subject}`);
    console.log(`  Body: ${text ?? html}`);
    return true;
  }

  try {
    const t = getTransporter();
    await t.sendMail({ from, to, subject, html, text });
    return true;
  } catch (e) {
    console.error("[mailer] Échec d'envoi :", e);
    return false;
  }
}

/** Construit l'URL absolue de vérification d'e-mail. */
export function buildEmailVerificationUrl(token: string): string {
  const base = process.env.APP_URL || "http://localhost:3000";
  return `${base}/verify-email?token=${encodeURIComponent(token)}`;
}

/** Construit l'URL absolue de réinitialisation de mot de passe. */
export function buildPasswordResetUrl(token: string): string {
  const base = process.env.APP_URL || "http://localhost:3000";
  return `${base}/reset-password?token=${encodeURIComponent(token)}`;
}

/** Modèle d'e-mail de vérification. */
export function emailVerificationHtml(name: string, url: string): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; color: #1e293b;">
      <h2 style="color: #087f8c;">Vérifiez votre adresse e-mail</h2>
      <p>Bonjour <strong>${escapeHtml(name)}</strong>,</p>
      <p>Merci de vous être inscrit sur <strong>RDV Santé</strong>. Cliquez sur le bouton ci-dessous pour vérifier votre adresse e-mail et activer votre compte.</p>
      <p style="margin: 24px 0;">
        <a href="${url}" style="background: #087f8c; color: #ffffff; padding: 12px 22px; border-radius: 8px; text-decoration: none; font-weight: 600;">Vérifier mon e-mail</a>
      </p>
      <p style="color: #64748b; font-size: 0.85rem;">Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur :<br/>
        <a href="${url}" style="color: #087f8c; word-break: break-all;">${url}</a>
      </p>
      <p style="color: #64748b; font-size: 0.85rem;">Ce lien expire dans 24 heures.</p>
    </div>
  `;
}

/** Modèle d'e-mail de réinitialisation de mot de passe. */
export function passwordResetHtml(name: string, url: string): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; color: #1e293b;">
      <h2 style="color: #087f8c;">Réinitialisation de votre mot de passe</h2>
      <p>Bonjour <strong>${escapeHtml(name)}</strong>,</p>
      <p>Vous avez demandé la réinitialisation de votre mot de passe sur <strong>RDV Santé</strong>. Cliquez sur le bouton ci-dessous pour en définir un nouveau.</p>
      <p style="margin: 24px 0;">
        <a href="${url}" style="background: #087f8c; color: #ffffff; padding: 12px 22px; border-radius: 8px; text-decoration: none; font-weight: 600;">Réinitialiser mon mot de passe</a>
      </p>
      <p style="color: #64748b; font-size: 0.85rem;">Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur :<br/>
        <a href="${url}" style="color: #087f8c; word-break: break-all;">${url}</a>
      </p>
      <p style="color: #64748b; font-size: 0.85rem;">Ce lien expire dans 1 heure. Si vous n'êtes pas à l'origine de cette demande, vous pouvez l'ignorer.</p>
    </div>
  `;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}