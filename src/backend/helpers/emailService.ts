import nodemailer from "nodemailer";
import QRCode from "qrcode";

interface EmailData {
  nombre: string;
  email: string;
  codigoConfirmacion: string;
  fechaRegistro: Date;
}

interface AdminNotificationData {
  nombre: string;
  email: string;
  telefono: string;
  edad: number;
  mensaje?: string;
  codigoConfirmacion: string;
  fechaRegistro: Date;
}

interface CancellationEmailData {
  nombre: string;
  email: string;
  codigoConfirmacion: string;
  razonCancelacion: string;
  fechaCancelacion: Date;
}

interface InitialRegistrationData {
  nombre: string;
  email: string;
  codigoConfirmacion: string;
  fechaRegistro: Date;
}

export async function sendInitialRegistrationEmail({
  nombre,
  email,
  codigoConfirmacion,
  fechaRegistro,
}: InitialRegistrationData) {
  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.GOOGLE_MAIL,
        pass: process.env.GOOGLE_MAIL_PASS,
      },
    });

    const fechaFormateada = new Date(fechaRegistro).toLocaleDateString(
      "es-MX",
      {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      },
    );

    const confirmationUrl = `${process.env.NEXTAUTH_URL}/api/cacha/confirm?code=${codigoConfirmacion}`;
    const subject = "🎉 Confirma tu registro - Meet & Greet con Cacha";
    const senderEmail = "supercollectiblesc12@gmail.com";

    const htmlContent = `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Confirma tu Registro - Meet & Greet con Cacha</title>
      <style>
        body {
          font-family: 'Arial', sans-serif;
          margin: 0;
          padding: 0;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: #333;
        }
        .container {
          max-width: 600px;
          margin: 0 auto;
          background: white;
          border-radius: 15px;
          overflow: hidden;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
        }
        .header {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          padding: 40px 30px;
          text-align: center;
          color: white;
        }
        .header h1 {
          margin: 0;
          font-size: 28px;
          font-weight: bold;
          text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
        }
        .header p {
          margin: 10px 0 0;
          font-size: 16px;
          opacity: 0.9;
        }
        .emoji {
          font-size: 48px;
          margin-bottom: 15px;
          display: block;
        }
        .content {
          padding: 40px 30px;
        }
        .greeting {
          font-size: 20px;
          color: #667eea;
          margin-bottom: 20px;
          font-weight: bold;
        }
        .message {
          font-size: 16px;
          line-height: 1.6;
          margin-bottom: 25px;
          color: #555;
        }
        .confirm-button {
          background: linear-gradient(135deg, #d9d9d9 0%, #f5f5f5 100%);
          color: white;
          padding: 15px 40px;
          border-radius: 50px;
          text-decoration: none;
          font-size: 18px;
          font-weight: bold;
          display: inline-block;
          margin: 30px 0;
          box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);
          transition: all 0.3s ease;
        }
        .confirm-button:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(102, 126, 234, 0.4);
        }
        .details-box {
          background: linear-gradient(135deg, #f8f9ff 0%, #e8ebff 100%);
          border-radius: 10px;
          padding: 25px;
          margin: 25px 0;
          border-left: 5px solid #667eea;
        }
        .details-title {
          font-size: 18px;
          font-weight: bold;
          color: #667eea;
          margin-bottom: 15px;
        }
        .detail-item {
          display: flex;
          align-items: center;
          margin-bottom: 10px;
          font-size: 14px;
        }
        .detail-icon {
          margin-right: 10px;
          font-size: 16px;
        }
        .warning-box {
          background: #fff8dc;
          border: 2px solid #ffd700;
          border-radius: 10px;
          padding: 20px;
          margin: 25px 0;
          text-align: center;
        }
        .footer {
          background: #f8f9fa;
          padding: 30px;
          text-align: center;
          border-top: 1px solid #eee;
        }
        .footer-logo {
          font-size: 18px;
          font-weight: bold;
          color: #667eea;
          margin-bottom: 10px;
        }
        .footer-text {
          font-size: 12px;
          color: #666;
          line-height: 1.4;
        }
        .social-links {
          margin: 15px 0;
        }
        .social-links a {
          text-decoration: none;
          color: #667eea;
          margin: 0 10px;
          font-size: 14px;
        }
        @media (max-width: 600px) {
          .container {
            margin: 0;
            border-radius: 0;
          }
          .header, .content, .footer {
            padding: 20px;
          }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <!-- Header -->
        <div class="header">
          <span class="emoji">📧</span>
          <h1>¡Confirma tu Registro!</h1>
          <p>Meet & Greet con Cacha</p>
        </div>

        <!-- Content -->
        <div class="content">
          <div class="greeting">¡Hola ${nombre}! 👋</div>
          
          <div class="message">
            ¡Gracias por registrarte para el <strong>Meet & Greet con Cacha</strong>! 
            Para completar tu registro, necesitamos que confirmes tu dirección de email.
          </div>

          <div class="message" style="text-align: center;">
            <strong>👆 Haz clic en el botón para confirmar:</strong>
          </div>

          <!-- Confirmation Button -->
          <div style="text-align: center;">
            <a href="${confirmationUrl}" class="confirm-button">
              ✅ CONFIRMAR MI REGISTRO
            </a>
          </div>

          <!-- Registration Details -->
          <div class="details-box">
            <div class="details-title">📋 Detalles de tu Registro</div>
            <div class="detail-item">
              <span class="detail-icon">👤</span>
              <strong>Nombre:</strong> &nbsp;${nombre}
            </div>
            <div class="detail-item">
              <span class="detail-icon">📧</span>
              <strong>Email:</strong> &nbsp;${email}
            </div>
            <div class="detail-item">
              <span class="detail-icon">📅</span>
              <strong>Fecha de registro:</strong> &nbsp;${fechaFormateada}
            </div>
            <div class="detail-item">
              <span class="detail-icon">🎫</span>
              <strong>Estado:</strong> &nbsp;Pendiente de confirmación
            </div>
          </div>

          <!-- Important Notice -->
          <div class="warning-box">
            <div style="font-weight: bold; color: #d97706; margin-bottom: 10px;">
              ⚠️ Importante
            </div>
            <div style="font-size: 14px; color: #92400e;">
              Tienes <strong>24 horas</strong> para confirmar tu registro.
              Si no confirmas, tu lugar podría ser asignado a otra persona.
            </div>
          </div>

          <div class="message">
            <strong>📱 ¿No puedes hacer clic?</strong><br>
            Copia y pega este enlace en tu navegador:<br>
            <code style="background: #f3f4f6; padding: 5px 10px; border-radius: 5px; font-size: 12px;">
              ${confirmationUrl}
            </code>
          </div>

          <div class="message">
            <strong>💝 ¿Tienes preguntas?</strong><br>
            No dudes en contactarnos a través de nuestros canales oficiales. 
            ¡Estamos emocionados de verte en el evento!
          </div>
        </div>

        <!-- Footer -->
        <div class="footer">
          <div class="footer-logo">Super Collectibles</div>
          <div class="social-links">
            <a href="https://www.supercollectibles.com.mx">🌐 Sitio Web</a>
            <a href="https://www.instagram.com/supercollectibles_mx">📱 Instagram</a>
            <a href="https://www.facebook.com/profile.php?id=61564208924734">📘 Facebook</a>
          </div>
          <div class="footer-text">
            Este es un email de confirmación de registro.<br>
            Por favor, confirma tu registro lo antes posible.<br>
            <br>
            <strong>Super Collectibles</strong><br>
            www.supercollectibles.com.mx<br>
            ¡Creciendo tu colección, un evento a la vez! 🚀
          </div>
        </div>
      </div>
    </body>
    </html>
    `;

    const mailOptions = {
      from: `"Super Collectibles - Evento Cacha" <${senderEmail}>`,
      to: email,
      subject,
      html: htmlContent,
    };

    await transporter.sendMail(mailOptions);

    return {
      success: true,
      message: "Email de confirmación inicial enviado exitosamente",
    };
  } catch (error) {
    console.error("Error al enviar email de confirmación inicial:", error);
    return {
      success: false,
      message: "Error al enviar email de confirmación inicial",
      error,
    };
  }
}

export async function sendCachaConfirmationEmail({
  nombre,
  email,
  codigoConfirmacion,
  fechaRegistro,
}: EmailData) {
  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.GOOGLE_MAIL,
        pass: process.env.GOOGLE_MAIL_PASS,
      },
    });

    // Generar QR Code como buffer para adjuntar al email
    const qrCodeBuffer = await QRCode.toBuffer(codigoConfirmacion, {
      width: 200,
      margin: 2,
      color: {
        dark: "#31215c",
        light: "#ffffff",
      },
      type: "png",
    });

    const fechaFormateada = new Date(fechaRegistro).toLocaleDateString(
      "es-MX",
      {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      },
    );

    const subject = "🎉 ¡Registro Confirmado! - Meet & Greet con Cacha";
    const senderEmail = "supercollectiblesc12@gmail.com";

    const htmlContent = `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Confirmación de Registro - Meet & Greet con Cacha</title>
      <style>
        body {
          font-family: 'Arial', sans-serif;
          margin: 0;
          padding: 0;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: #333;
        }
        .container {
          max-width: 600px;
          margin: 0 auto;
          background: white;
          border-radius: 15px;
          overflow: hidden;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
        }
        .header {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          padding: 40px 30px;
          text-align: center;
          color: white;
        }
        .header h1 {
          margin: 0;
          font-size: 28px;
          font-weight: bold;
          text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
        }
        .header p {
          margin: 10px 0 0;
          font-size: 16px;
          opacity: 0.9;
        }
        .emoji {
          font-size: 48px;
          margin-bottom: 15px;
          display: block;
        }
        .content {
          padding: 40px 30px;
        }
        .greeting {
          font-size: 20px;
          color: #667eea;
          margin-bottom: 20px;
          font-weight: bold;
        }
        .message {
          font-size: 16px;
          line-height: 1.6;
          margin-bottom: 25px;
          color: #555;
        }
        .details-box {
          background: linear-gradient(135deg, #f8f9ff 0%, #e8ebff 100%);
          border-radius: 10px;
          padding: 25px;
          margin: 25px 0;
          border-left: 5px solid #667eea;
        }
        .details-title {
          font-size: 18px;
          font-weight: bold;
          color: #667eea;
          margin-bottom: 15px;
        }
        .detail-item {
          display: flex;
          align-items: center;
          margin-bottom: 10px;
          font-size: 14px;
        }
        .detail-icon {
          margin-right: 10px;
          font-size: 16px;
        }
        .qr-container {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 30px;
          border-radius: 15px;
          text-align: center;
          margin: 30px 0;
          box-shadow: 0 8px 25px rgba(102, 126, 234, 0.3);
        }
        .qr-title {
          font-size: 20px;
          font-weight: bold;
          margin-bottom: 15px;
          text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
        }
        .qr-code {
          background: white;
          padding: 20px;
          border-radius: 10px;
          display: inline-block;
          margin: 15px 0;
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
        }
        .qr-instructions {
          font-size: 14px;
          opacity: 0.9;
          margin-top: 10px;
        }
        .event-info {
          background: #f0f4ff;
          border-radius: 10px;
          padding: 20px;
          margin: 25px 0;
        }
        .event-title {
          font-size: 16px;
          font-weight: bold;
          color: #333;
          margin-bottom: 15px;
          text-align: center;
        }
        .event-item {
          display: flex;
          align-items: center;
          margin-bottom: 8px;
          font-size: 14px;
        }
        .footer {
          background: #f8f9fa;
          padding: 30px;
          text-align: center;
          border-top: 1px solid #eee;
        }
        .footer-logo {
          font-size: 18px;
          font-weight: bold;
          color: #667eea;
          margin-bottom: 10px;
        }
        .footer-text {
          font-size: 12px;
          color: #666;
          line-height: 1.4;
        }
        .social-links {
          margin: 15px 0;
        }
        .social-links a {
          text-decoration: none;
          color: #667eea;
          margin: 0 10px;
          font-size: 14px;
        }
        @media (max-width: 600px) {
          .container {
            margin: 0;
            border-radius: 0;
          }
          .header, .content, .footer {
            padding: 20px;
          }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <!-- Header -->
        <div class="header">
          <span class="emoji">🎉</span>
          <h1>¡Registro Confirmado!</h1>
          <p>Meet & Greet con Cacha</p>
        </div>

        <!-- Content -->
        <div class="content">
          <div class="greeting">¡Hola ${nombre}! 👋</div>
          
          <div class="message">
            ¡Felicidades! Tu registro para el <strong>Meet & Greet con Cacha</strong> ha sido confirmado exitosamente. 
            Estamos emocionados de tenerte en este evento exclusivo.
          </div>

          <!-- QR Code -->
          <div class="qr-container">
            <div class="qr-title">🎫 Tu Código QR de Acceso</div>
            <div class="qr-code">
              <img src="cid:qrcode" alt="Código QR - ${codigoConfirmacion}" style="width: 200px; height: 200px;" />
            </div>
            <div class="qr-instructions">
              Presenta este código QR en el evento para acceder<br>
              <strong>Código: ${codigoConfirmacion}</strong>
            </div>
          </div>

          <!-- Registration Details -->
          <div class="details-box">
            <div class="details-title">📋 Detalles de tu Registro</div>
            <div class="detail-item">
              <span class="detail-icon">👤</span>
              <strong>Nombre:</strong> &nbsp;${nombre}
            </div>
            <div class="detail-item">
              <span class="detail-icon">📧</span>
              <strong>Email:</strong> &nbsp;${email}
            </div>
            <div class="detail-item">
              <span class="detail-icon">📅</span>
              <strong>Fecha de registro:</strong> &nbsp;${fechaFormateada}
            </div>
            <div class="detail-item">
              <span class="detail-icon">🎫</span>
              <strong>Estado:</strong> &nbsp;Confirmado
            </div>
          </div>

          <!-- Event Information -->
          <div class="event-info">
            <div class="event-title">🎪 Información del Evento</div>
            <div class="event-item">
              <span class="detail-icon">🎵</span>
              Música en vivo by LLOVET
            </div>
            <div class="event-item">
              <span class="detail-icon">👕</span>
              Drop oficial de merchandise exclusivo
            </div>
            <div class="event-item">
              <span class="detail-icon">📸</span>
              Sesión de fotos y autógrafos con Cacha
            </div>
            <div class="event-item">
              <span class="detail-icon">🎁</span>
              Sorpresas y actividades especiales
            </div>
          </div>

          <div class="message">
            <strong>📍 Próximos pasos:</strong><br>
            • Te esperamos este Sábado 01 de Noviembre a las 2:00 PM en El Centro Magno - Av. Ignacio L Vallarta 2425, Arcos Vallarta, 44130 Guadalajara, Jal.<br>
            • Presenta tu código QR al llegar al evento para acceder<br>
            • Guarda este email o toma captura de pantalla del QR<br>
            • Mantente atento a tu email para más información<br>
            • Síguenos en redes sociales para actualizaciones
          </div>

          <div class="message">
            <strong>💝 ¿Tienes preguntas?</strong><br>
            No dudes en contactarnos a través de nuestros canales oficiales. 
            ¡Estamos aquí para hacer de este evento una experiencia inolvidable!
          </div>
        </div>

        <!-- Footer -->
        <div class="footer">
          <div class="footer-logo">Super Collectibles</div>
          <div class="social-links">
            <a href="https://www.supercollectibles.com.mx">🌐 Sitio Web</a>
            <a href="https://www.instagram.com/supercollectibles_mx">📱 Instagram</a>
            <a href="https://www.facebook.com/profile.php?id=61564208924734">📘 Facebook</a>
          </div>
          <div class="footer-text">
            Este es un email automático de confirmación.<br>
            Por favor, no respondas a este mensaje.<br>
            <br>
            <strong>Super Collectibles</strong><br>
            www.supercollectibles.com.mx<br>
            ¡Creciendo tu colección, un evento a la vez! 🚀
          </div>
        </div>
      </div>
    </body>
    </html>
    `;

    const mailOptions = {
      from: `"Super Collectibles - Evento Cacha" <${senderEmail}>`,
      to: email,
      subject,
      html: htmlContent,
      attachments: [
        {
          filename: `qr-cacha-${codigoConfirmacion}.png`,
          content: qrCodeBuffer,
          cid: "qrcode", // Contenido embebido con ID para referenciar en HTML
        },
      ],
    };

    await transporter.sendMail(mailOptions);

    return {
      success: true,
      message: "Email de confirmación enviado exitosamente",
    };
  } catch (error) {
    console.error("Error al enviar email de confirmación:", error);
    return {
      success: false,
      message: "Error al enviar email de confirmación",
      error,
    };
  }
}

export async function sendAdminNotificationEmail({
  nombre,
  email,
  telefono,
  edad,
  mensaje,
  codigoConfirmacion,
  fechaRegistro,
}: AdminNotificationData) {
  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.GOOGLE_MAIL,
        pass: process.env.GOOGLE_MAIL_PASS,
      },
    });

    const fechaFormateada = new Date(fechaRegistro).toLocaleDateString(
      "es-MX",
      {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      },
    );

    const subject = "🎉 Nuevo registro para Meet & Greet con Cacha";
    const senderEmail = "supercollectiblesc12@gmail.com";
    const adminEmail = process.env.ADMIN_EMAIL || senderEmail;

    const htmlContent = `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Nuevo Registro - Meet & Greet con Cacha</title>
      <style>
        body {
          font-family: 'Arial', sans-serif;
          margin: 0;
          padding: 20px;
          background: #f5f5f5;
          color: #333;
        }
        .container {
          max-width: 600px;
          margin: 0 auto;
          background: white;
          border-radius: 10px;
          overflow: hidden;
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
        }
        .header {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          padding: 30px;
          text-align: center;
          color: white;
        }
        .header h1 {
          margin: 0;
          font-size: 24px;
        }
        .content {
          padding: 30px;
        }
        .info-box {
          background: #f8f9ff;
          border-left: 4px solid #667eea;
          padding: 20px;
          margin: 20px 0;
          border-radius: 0 8px 8px 0;
        }
        .info-row {
          display: flex;
          margin-bottom: 10px;
          font-size: 14px;
        }
        .info-label {
          font-weight: bold;
          width: 120px;
          color: #667eea;
        }
        .info-value {
          flex: 1;
        }
        .message-box {
          background: #fff9e6;
          border: 1px solid #ffd700;
          padding: 15px;
          border-radius: 8px;
          margin: 15px 0;
        }
        .footer {
          background: #f8f9fa;
          padding: 20px;
          text-align: center;
          font-size: 12px;
          color: #666;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🎯 Nuevo Registro Recibido</h1>
          <p>Meet & Greet con Cacha</p>
        </div>
        
        <div class="content">
          <p><strong>¡Hola Admin!</strong></p>
          <p>Se ha registrado una nueva persona para el evento Meet & Greet con Cacha.</p>
          
          <div class="info-box">
            <h3 style="margin-top: 0; color: #667eea;">📋 Información del Participante</h3>
            <div class="info-row">
              <span class="info-label">Nombre:</span>
              <span class="info-value">${nombre}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Email:</span>
              <span class="info-value">${email}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Teléfono:</span>
              <span class="info-value">${telefono}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Edad:</span>
              <span class="info-value">${edad} años</span>
            </div>
            <div class="info-row">
              <span class="info-label">Código:</span>
              <span class="info-value"><strong>${codigoConfirmacion}</strong></span>
            </div>
            <div class="info-row">
              <span class="info-label">Registro:</span>
              <span class="info-value">${fechaFormateada}</span>
            </div>
          </div>
          
          ${
            mensaje
              ? `
          <div class="message-box">
            <h4 style="margin-top: 0;">💬 Mensaje para Cacha:</h4>
            <p style="margin-bottom: 0; font-style: italic;">"${mensaje}"</p>
          </div>
          `
              : ""
          }
          
          <p><strong>📊 Próximos pasos:</strong></p>
          <ul>
            <li>El participante ha recibido un email de confirmación automáticamente</li>
            <li>Su código de confirmación es: <strong>${codigoConfirmacion}</strong></li>
            <li>Revisa el panel de admin para gestionar todos los registros</li>
          </ul>
        </div>
        
        <div class="footer">
          <p>Sistema de registro automático - Super Collectibles</p>
          <p>www.supercollectibles.com.mx</p>
        </div>
      </div>
    </body>
    </html>
    `;

    const mailOptions = {
      from: `"Sistema Cacha Event" <${senderEmail}>`,
      to: adminEmail,
      subject,
      html: htmlContent,
    };

    await transporter.sendMail(mailOptions);

    return {
      success: true,
      message: "Notificación admin enviada exitosamente",
    };
  } catch (error) {
    console.error("Error al enviar notificación admin:", error);
    return {
      success: false,
      message: "Error al enviar notificación admin",
      error,
    };
  }
}

export async function sendCachaCancellationEmail({
  nombre,
  email,
  codigoConfirmacion,
  razonCancelacion,
  fechaCancelacion,
}: CancellationEmailData) {
  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.GOOGLE_MAIL,
        pass: process.env.GOOGLE_MAIL_PASS,
      },
    });

    const fechaFormateada = new Date(fechaCancelacion).toLocaleDateString(
      "es-MX",
      {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      },
    );

    const subject = "😔 Cancelación de registro - Meet & Greet con Cacha";
    const senderEmail = "supercollectiblesc12@gmail.com";

    const htmlContent = `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Cancelación de Registro - Meet & Greet con Cacha</title>
      <style>
        body {
          font-family: 'Arial', sans-serif;
          margin: 0;
          padding: 0;
          background: linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%);
          color: #333;
        }
        .container {
          max-width: 600px;
          margin: 0 auto;
          background: white;
          border-radius: 15px;
          overflow: hidden;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
        }
        .header {
          background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
          padding: 40px 30px;
          text-align: center;
          color: white;
        }
        .header h1 {
          margin: 0;
          font-size: 28px;
          font-weight: bold;
          text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
        }
        .header p {
          margin: 10px 0 0;
          font-size: 16px;
          opacity: 0.9;
        }
        .emoji {
          font-size: 48px;
          margin-bottom: 15px;
          display: block;
        }
        .content {
          padding: 40px 30px;
        }
        .greeting {
          font-size: 20px;
          color: #ef4444;
          margin-bottom: 20px;
          font-weight: bold;
        }
        .message {
          font-size: 16px;
          line-height: 1.6;
          margin-bottom: 25px;
          color: #555;
        }
        .details-box {
          background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%);
          border-radius: 10px;
          padding: 25px;
          margin: 25px 0;
          border-left: 5px solid #ef4444;
        }
        .details-title {
          font-size: 18px;
          font-weight: bold;
          color: #ef4444;
          margin-bottom: 15px;
        }
        .detail-item {
          display: flex;
          align-items: center;
          margin-bottom: 10px;
          font-size: 14px;
        }
        .detail-icon {
          margin-right: 10px;
          font-size: 16px;
        }
        .reason-box {
          background: #fffbeb;
          border: 2px solid #fbbf24;
          border-radius: 10px;
          padding: 20px;
          margin: 25px 0;
        }
        .reason-title {
          font-size: 16px;
          font-weight: bold;
          color: #d97706;
          margin-bottom: 10px;
        }
        .reason-text {
          color: #92400e;
          line-height: 1.5;
          font-style: italic;
        }
        .contact-box {
          background: #f0f9ff;
          border-radius: 10px;
          padding: 20px;
          margin: 25px 0;
          text-align: center;
        }
        .footer {
          background: #f8f9fa;
          padding: 30px;
          text-align: center;
          border-top: 1px solid #eee;
        }
        .footer-logo {
          font-size: 18px;
          font-weight: bold;
          color: #ef4444;
          margin-bottom: 10px;
        }
        .footer-text {
          font-size: 12px;
          color: #666;
          line-height: 1.4;
        }
        .social-links {
          margin: 15px 0;
        }
        .social-links a {
          text-decoration: none;
          color: #ef4444;
          margin: 0 10px;
          font-size: 14px;
        }
        @media (max-width: 600px) {
          .container {
            margin: 0;
            border-radius: 0;
          }
          .header, .content, .footer {
            padding: 20px;
          }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <!-- Header -->
        <div class="header">
          <span class="emoji">😔</span>
          <h1>Registro Cancelado</h1>
          <p>Meet & Greet con Cacha</p>
        </div>

        <!-- Content -->
        <div class="content">
          <div class="greeting">Hola ${nombre}, 👋</div>
          
          <div class="message">
            Lamentamos informarte que tu registro para el <strong>Meet & Greet con Cacha</strong> 
            ha sido cancelado. Entendemos que esto puede ser decepcionante y nos disculpamos por cualquier inconveniente.
          </div>

          <!-- Registration Details -->
          <div class="details-box">
            <div class="details-title">📋 Detalles de tu Registro Cancelado</div>
            <div class="detail-item">
              <span class="detail-icon">👤</span>
              <strong>Nombre:</strong> &nbsp;${nombre}
            </div>
            <div class="detail-item">
              <span class="detail-icon">📧</span>
              <strong>Email:</strong> &nbsp;${email}
            </div>
            <div class="detail-item">
              <span class="detail-icon">🎫</span>
              <strong>Código de confirmación:</strong> &nbsp;${codigoConfirmacion}
            </div>
            <div class="detail-item">
              <span class="detail-icon">📅</span>
              <strong>Fecha de cancelación:</strong> &nbsp;${fechaFormateada}
            </div>
          </div>

          <!-- Cancellation Reason -->
          <div class="reason-box">
            <div class="reason-title">📝 Motivo de la Cancelación</div>
            <div class="reason-text">"${razonCancelacion}"</div>
          </div>

          <div class="message">
            <strong>💬 ¿Tienes preguntas?</strong><br>
            Si tienes alguna duda sobre esta cancelación o necesitas más información, 
            no dudes en contactarnos. Nuestro equipo está disponible para ayudarte.
          </div>

          <!-- Contact Information -->
          <div class="contact-box">
            <div style="font-weight: bold; color: #0ea5e9; margin-bottom: 10px;">
              📞 Mantente en contacto
            </div>
            <div style="font-size: 14px; color: #0369a1;">
              Síguenos en nuestras redes sociales para estar al tanto de futuros eventos y oportunidades.
              ¡Esperamos verte en próximas ocasiones!
            </div>
          </div>

          <div class="message">
            Gracias por tu comprensión y esperamos poder ofrecerte una mejor experiencia en el futuro.
          </div>
        </div>

        <!-- Footer -->
        <div class="footer">
          <div class="footer-logo">Super Collectibles</div>
          <div class="social-links">
            <a href="https://www.supercollectibles.com.mx">🌐 Sitio Web</a>
            <a href="#">📱 Instagram</a>
            <a href="#">📘 Facebook</a>
          </div>
          <div class="footer-text">
            Este es un email automático de cancelación.<br>
            Por favor, no respondas a este mensaje.<br>
            <br>
            <strong>Super Collectibles</strong><br>
            www.supercollectibles.com.mx<br>
            Siempre buscando brindarte las mejores experiencias 💫
          </div>
        </div>
      </div>
    </body>
    </html>
    `;

    const mailOptions = {
      from: `"Super Collectibles - Evento Cacha" <${senderEmail}>`,
      to: email,
      subject,
      html: htmlContent,
    };

    await transporter.sendMail(mailOptions);

    return {
      success: true,
      message: "Email de cancelación enviado exitosamente",
    };
  } catch (error) {
    console.error("Error al enviar email de cancelación:", error);
    return {
      success: false,
      message: "Error al enviar email de cancelación",
      error,
    };
  }
}

// ─── Order confirmation emails (admin + customer) ────────────────────────────

export async function sendOrderConfirmationEmails(
  order: any,
  paymentDetails: { method: string; reference: string },
  options: { adminOnly?: boolean } = {},
) {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.GOOGLE_MAIL,
      pass: process.env.GOOGLE_MAIL_PASS,
    },
  });

  // Lazy-load Address model to avoid circular imports in edge cases
  const Address = (await import("@/backend/models/Address")).default;

  // Fetch saved delivery address as fallback (same as AdminOneOrder / getOneOrder)
  let deliveryAddress: any = null;
  try {
    if (order.user) {
      deliveryAddress = await Address.findOne({ user: order.user });
    }
  } catch (e) {
    console.error("Error fetching delivery address fallback:", e);
  }

  // Format order items HTML
  const orderItemsHTML = order.orderItems
    .map(
      (item: any) => `
    <tr>
      <td style="padding: 8px; border-bottom: 1px solid #ddd;">${item.name}</td>
      <td style="padding: 8px; border-bottom: 1px solid #ddd;">${item.color || "-"} / ${item.size || "-"}</td>
      <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: center;">${item.quantity}</td>
      <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right;">$${item.price.toFixed(2)} MXN</td>
      <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right;">$${(item.price * item.quantity).toFixed(2)} MXN</td>
    </tr>`,
    )
    .join("");

  const totalOrderAmount = order.orderItems.reduce(
    (acc: number, item: any) => acc + item.quantity * item.price,
    0,
  );
  const shippingCost = order.ship_cost || 0;
  const totalWithShipping = totalOrderAmount + shippingCost;

  // Parse shippingInfo
  let shippingInfo = order.shippingInfo;
  if (typeof shippingInfo === "string") {
    try {
      shippingInfo = JSON.parse(shippingInfo);
    } catch (e) {
      shippingInfo = {};
    }
  }

  // Address fields — shippingInfo first, fallback to deliveryAddress
  const street = shippingInfo?.street || deliveryAddress?.street || "";
  const city = shippingInfo?.city || deliveryAddress?.city || "";
  const province =
    shippingInfo?.province ||
    shippingInfo?.state ||
    deliveryAddress?.province ||
    "";
  const zipCode =
    shippingInfo?.zip_code ||
    shippingInfo?.zipCode ||
    deliveryAddress?.zip_code ||
    "";
  const country = shippingInfo?.country || deliveryAddress?.country || "México";
  const phone =
    shippingInfo?.phone || deliveryAddress?.phone || order.phone || "";
  const carrier =
    shippingInfo?.carrier || shippingInfo?.shippingMethod?.carrier || "";
  const service =
    shippingInfo?.service ||
    shippingInfo?.shippingMethod?.service ||
    shippingInfo?.shippingMethod?.serviceName ||
    "";
  const estimatedDays =
    shippingInfo?.estimatedDays ||
    shippingInfo?.shippingMethod?.estimatedDays ||
    0;
  const trackingNumber = order.trackingNumber || "Pendiente";
  const labelUrl = order.labelUrl || "";

  const tableStyle = `width: 100%; border-collapse: collapse; margin: 15px 0;`;
  const thStyle = `background-color: #4CAF50; color: white; padding: 10px; text-align: left;`;

  const totalsRowsHTML = `
    <tr style="font-weight: bold; background-color: #f0f0f0;">
      <td colspan="4" style="padding: 8px; text-align: right;">Subtotal:</td>
      <td style="padding: 8px; text-align: right;">$${totalOrderAmount.toFixed(2)} MXN</td>
    </tr>
    <tr style="font-weight: bold; background-color: #f0f0f0;">
      <td colspan="4" style="padding: 8px; text-align: right;">Envío:</td>
      <td style="padding: 8px; text-align: right;">$${shippingCost.toFixed(2)} MXN</td>
    </tr>
    <tr style="font-weight: bold; background-color: #4CAF50; color: white;">
      <td colspan="4" style="padding: 8px; text-align: right;">Total Pagado:</td>
      <td style="padding: 8px; text-align: right;">$${totalWithShipping.toFixed(2)} MXN</td>
    </tr>`;

  const addressBlockHTML = `
    <div style="background-color: white; padding: 15px; margin: 10px 0; border-radius: 5px;">
      <h3>Dirección de Envío:</h3>
      <p>${street}</p>
      <p>${city}, ${province} ${zipCode}</p>
      <p>${country}</p>
      ${phone ? `<p><strong>Teléfono:</strong> ${phone}</p>` : ""}
      <p><strong>Método de envío:</strong> ${carrier} - ${service}</p>
      ${trackingNumber !== "Pendiente" ? `<p><strong>Número de rastreo:</strong> ${trackingNumber}</p>` : ""}
      ${labelUrl ? `<p><strong>Etiqueta de envío:</strong> <a href="${labelUrl}" target="_blank">Descargar</a></p>` : ""}
    </div>`;

  // ── Admin email ──────────────────────────────────────────────────────────
  const salesEmailHTML = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #4CAF50; color: white; padding: 20px; text-align: center; }
    .content { padding: 20px; background-color: #f9f9f9; }
    table { ${tableStyle} }
    th { ${thStyle} }
  </style>
</head>
<body>
  <div class="container">
    <div class="header"><h1>🎉 Nuevo Pedido Pagado</h1></div>
    <div class="content">
      <div style="background-color: white; padding: 15px; margin: 10px 0; border-radius: 5px;">
        <h2>Detalles del Pedido: ${order._id}</h2>
        <p><strong>Cliente:</strong> ${order.customerName}</p>
        <p><strong>Email:</strong> ${order.email}</p>
        <p><strong>Teléfono:</strong> ${order.phone || "No proporcionado"}</p>
        <p><strong>Fecha:</strong> ${new Date(order.createdAt).toLocaleString("es-MX")}</p>
        <p><strong>Estado:</strong> ${order.orderStatus}</p>
        <p><strong>Método de Pago:</strong> ${paymentDetails.method}</p>
        <p><strong>Referencia:</strong> ${paymentDetails.reference}</p>
      </div>
      <h3>Artículos del Pedido:</h3>
      <table>
        <thead>
          <tr>
            <th>Producto</th><th>Variante</th>
            <th style="text-align:center;">Cant.</th>
            <th style="text-align:right;">Precio</th>
            <th style="text-align:right;">Subtotal</th>
          </tr>
        </thead>
        <tbody>${orderItemsHTML}${totalsRowsHTML}</tbody>
      </table>
      ${addressBlockHTML}
      <p style="margin-top: 20px; color: #666;"><strong>SuperCollectibles.com.mx</strong><br>Equipo de Ventas</p>
    </div>
  </div>
</body>
</html>`;

  // ── Customer email ───────────────────────────────────────────────────────
  const customerEmailHTML = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #4CAF50; color: white; padding: 20px; text-align: center; }
    .content { padding: 20px; background-color: #f9f9f9; }
    table { ${tableStyle} }
    th { ${thStyle} }
  </style>
</head>
<body>
  <div class="container">
    <div class="header"><h1>¡Gracias por tu compra!</h1></div>
    <div class="content">
      <p>Estimado/a ${order.customerName},</p>
      <p>Hemos recibido tu pago exitosamente. Tu pedido está siendo procesado y lo enviaremos pronto.</p>
      <div style="background-color: white; padding: 15px; margin: 10px 0; border-radius: 5px;">
        <h2>Detalles del Pedido: ${order._id}</h2>
        <p><strong>Fecha:</strong> ${new Date(order.createdAt).toLocaleString("es-MX")}</p>
        <p><strong>Estado:</strong> ${order.orderStatus}</p>
      </div>
      <h3>Artículos del Pedido:</h3>
      <table>
        <thead>
          <tr>
            <th>Producto</th><th>Variante</th>
            <th style="text-align:center;">Cant.</th>
            <th style="text-align:right;">Precio</th>
            <th style="text-align:right;">Subtotal</th>
          </tr>
        </thead>
        <tbody>${orderItemsHTML}${totalsRowsHTML}</tbody>
      </table>
      <div style="background-color: white; padding: 15px; margin: 10px 0; border-radius: 5px;">
        <h3>Dirección de Envío:</h3>
        <p>${street}</p>
        <p>${city}, ${province} ${zipCode}</p>
        <p>${country}</p>
        ${phone ? `<p><strong>Teléfono:</strong> ${phone}</p>` : ""}
        <p><strong>Método de envío:</strong> ${carrier} - ${service}</p>
        <p><strong>Tiempo estimado:</strong> ${estimatedDays} días hábiles</p>
        ${trackingNumber !== "Pendiente" ? `<p><strong>Número de rastreo:</strong> ${trackingNumber}</p>` : ""}
        ${labelUrl ? `<p><strong>Rastrea tu pedido:</strong> <a href="https://supercollectibles.com.mx/rastreo/${trackingNumber}" target="_blank">Ver rastreo</a></p>` : ""}
      </div>
      <p style="margin-top: 20px;">Si tienes alguna pregunta sobre tu pedido, no dudes en contactarnos.</p>
      <p style="color: #666;"><strong>SuperCollectibles.com.mx</strong><br>¡Gracias por tu preferencia!</p>
    </div>
  </div>
</body>
</html>`;

  try {
    await transporter.sendMail({
      from: process.env.GOOGLE_MAIL,
      to: "supercollectiblesc12@gmail.com",
      subject: `Nuevo Pedido Pagado - ${order._id}`,
      html: salesEmailHTML,
    });

    if (!options.adminOnly && order.email) {
      await transporter.sendMail({
        from: process.env.GOOGLE_MAIL,
        to: order.email,
        subject: `Confirmación de Pedido - SuperCollectibles`,
        html: customerEmailHTML,
      });
    }

    console.log("Order confirmation emails sent successfully");
  } catch (error) {
    console.error("Error sending order confirmation emails:", error);
    throw error;
  }
}

// ── Per-item refund notification ─────────────────────────────────────────────
export async function sendItemRefundEmail(params: {
  order: any;
  item: any;
  itemTotal: number;
  shippingShare: number;
  refundAmount: number;
}) {
  const { order, item, itemTotal, shippingShare, refundAmount } = params;

  if (!order.email) {
    console.warn("sendItemRefundEmail: order has no email, skipping.");
    return;
  }

  const { buildItemRefundEmailHtml } = await import("@/lib/emailTemplates");

  const html = buildItemRefundEmailHtml({
    customerName: order.customerName ?? order.email,
    orderId: order.orderId ?? order._id?.toString() ?? "",
    item,
    itemTotal,
    shippingShare,
    refundAmount,
  });

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.GOOGLE_MAIL,
      pass: process.env.GOOGLE_MAIL_PASS,
    },
  });

  await transporter.sendMail({
    from: `"SuperCollectibles" <${process.env.GOOGLE_MAIL}>`,
    to: order.email,
    subject: `Reembolso procesado — Pedido #${order.orderId ?? order._id}`,
    html,
  });
}
