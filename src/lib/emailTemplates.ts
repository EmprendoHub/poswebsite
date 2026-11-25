// Pure HTML-builder functions — no server deps, safe to import in client components.

export interface ItemRefundEmailParams {
  customerName: string;
  orderId: string | number;
  item: {
    name: string;
    image?: string;
    color?: string;
    size?: string;
    price: number;
    quantity: number;
  };
  itemTotal: number;
  shippingShare: number;
  refundAmount: number;
}

export function buildItemRefundEmailHtml(p: ItemRefundEmailParams): string {
  const {
    customerName,
    orderId,
    item,
    itemTotal,
    shippingShare,
    refundAmount,
  } = p;

  const imgBlock = item.image
    ? `<td style="width:88px;padding-right:16px;vertical-align:middle;">
         <img src="${item.image}" alt="${item.name}"
              style="width:80px;height:80px;object-fit:cover;border-radius:8px;display:block;" />
       </td>`
    : "";

  const colorRow = item.color
    ? `<p style="margin:0 0 3px;color:#666;font-size:13px;">Color: ${item.color}</p>`
    : "";
  const sizeRow = item.size
    ? `<p style="margin:0 0 3px;color:#666;font-size:13px;">Talla: ${item.size}</p>`
    : "";

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <title>Reembolso de Artículo — Pedido #${orderId}</title>
</head>
<body style="font-family:Arial,sans-serif;line-height:1.6;color:#333;margin:0;padding:20px;background-color:#f5f5f5;">
  <div style="max-width:600px;margin:0 auto;">

    <!-- Header -->
    <div style="background-color:#b91c1c;color:white;padding:28px 30px;text-align:center;border-radius:10px 10px 0 0;">
      <h1 style="margin:0 0 6px;font-size:22px;font-weight:bold;">Reembolso en Proceso</h1>
      <p style="margin:0;opacity:.9;font-size:14px;">Pedido #${orderId}</p>
    </div>

    <!-- Body -->
    <div style="background-color:#fff;padding:30px;border-radius:0 0 10px 10px;box-shadow:0 2px 8px rgba(0,0,0,.08);">
      <p style="font-size:16px;margin-bottom:8px;">Estimado/a <strong>${customerName}</strong>,</p>
      <p style="font-size:14px;color:#555;margin-bottom:24px;">
        Lamentamos informarte que el siguiente artículo de tu pedido <strong>#${orderId}</strong>
        no se encuentra disponible en inventario. Procederemos con el reembolso correspondiente.
      </p>

      <!-- Item card -->
      <div style="border:1px solid #fecaca;border-left:4px solid #b91c1c;background-color:#fff8f8;
                  border-radius:0 8px 8px 0;padding:16px;margin-bottom:24px;">
        <p style="margin:0 0 12px;font-weight:bold;color:#b91c1c;font-size:13px;
                  text-transform:uppercase;letter-spacing:.5px;">Artículo Sin Disponibilidad</p>
        <table style="width:100%;border-collapse:collapse;">
          <tr>
            ${imgBlock}
            <td style="vertical-align:middle;">
              <p style="margin:0 0 4px;font-weight:bold;font-size:15px;">${item.name}</p>
              ${colorRow}
              ${sizeRow}
              <p style="margin:0;color:#666;font-size:13px;">
                Cantidad: ${item.quantity}&nbsp;·&nbsp;$${item.price.toFixed(2)} MXN c/u
              </p>
            </td>
          </tr>
        </table>
      </div>

      <!-- Breakdown -->
      <p style="font-weight:bold;font-size:15px;margin-bottom:10px;">Desglose del Reembolso</p>
      <table style="width:100%;border-collapse:collapse;margin-bottom:24px;
                    border-radius:8px;overflow:hidden;border:1px solid #e5e7eb;">
        <tr style="background-color:#f9fafb;">
          <td style="padding:10px 14px;color:#555;font-size:14px;">
            Costo del artículo (×${item.quantity})
          </td>
          <td style="padding:10px 14px;text-align:right;font-weight:600;font-size:14px;">
            $${itemTotal.toFixed(2)} MXN
          </td>
        </tr>
        <tr>
          <td style="padding:10px 14px;color:#555;font-size:14px;">
            Costo de envío proporcional
          </td>
          <td style="padding:10px 14px;text-align:right;font-weight:600;font-size:14px;">
            $${shippingShare.toFixed(2)} MXN
          </td>
        </tr>
        <tr style="background-color:#b91c1c;color:white;border-top:2px solid #991b1b;">
          <td style="padding:12px 14px;font-weight:bold;font-size:15px;">Total a Reembolsar</td>
          <td style="padding:12px 14px;text-align:right;font-weight:bold;font-size:18px;">
            $${refundAmount.toFixed(2)} MXN
          </td>
        </tr>
      </table>

      <!-- Confirmation note -->
      <div style="background-color:#f0fdf4;border-left:4px solid #16a34a;
                  padding:14px 16px;border-radius:0 8px 8px 0;margin-bottom:24px;">
        <p style="margin:0;color:#15803d;font-size:14px;">
          <strong>✓ El reembolso se reflejará en tu método de pago original en un plazo de 5–10 días hábiles.</strong>
        </p>
      </div>

      <p style="font-size:14px;color:#555;">
        Si tienes alguna duda sobre este reembolso, no dudes en contactarnos.
      </p>
      <p style="margin-top:24px;color:#999;font-size:13px;">
        <strong style="color:#555;">SuperCollectibles.com.mx</strong><br>
        ¡Gracias por tu comprensión y preferencia!
      </p>
    </div>
  </div>
</body>
</html>`;
}

// ==================== TOURNAMENT EMAIL TEMPLATES ====================

export interface TournamentRegistrationEmailParams {
  customerName: string;
  tournamentName: string;
  ticketCost: number;
  startDate: string;
  endDate: string;
  totalParticipants: number;
  totalPool: number;
  confirmationLink?: string;
}

export interface TournamentParticipantAddedEmailParams {
  customerName: string;
  tournamentName: string;
  ticketCost: number;
  startDate: string;
  endDate: string;
  totalParticipants: number;
  totalPool: number;
}

export function buildTournamentRegistrationEmailHtml(
  p: TournamentRegistrationEmailParams,
): string {
  const {
    customerName,
    tournamentName,
    ticketCost,
    startDate,
    endDate,
    totalParticipants,
    totalPool,
  } = p;

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <title>¡Inscripción Confirmada! — ${tournamentName}</title>
</head>
<body style="font-family:Arial,sans-serif;line-height:1.6;color:#333;margin:0;padding:20px;background-color:#f5f5f5;">
  <div style="max-width:600px;margin:0 auto;">

    <!-- Header -->
    <div style="background:linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%);color:white;padding:40px 30px;text-align:center;border-radius:10px 10px 0 0;">
      <h1 style="margin:0 0 8px;font-size:24px;font-weight:bold;">¡Inscripción Confirmada!</h1>
      <p style="margin:0;opacity:.95;font-size:14px;">Torneo de Cartas Coleccionables</p>
    </div>

    <!-- Body -->
    <div style="background-color:#fff;padding:30px;border-radius:0 0 10px 10px;box-shadow:0 2px 8px rgba(0,0,0,.08);">
      <p style="font-size:16px;margin-bottom:8px;">¡Hola <strong>${customerName}</strong>!</p>
      <p style="font-size:14px;color:#555;margin-bottom:24px;">
        ¡Te damos la bienvenida al torneo <strong>"${tournamentName}"</strong>! Tu inscripción ha sido confirmada exitosamente. 
        Prepárate para competir y tener la oportunidad de ganar crédito exclusivo.
      </p>

      <!-- Tournament Details -->
      <div style="background-color:#f9fafb;border-left:4px solid #7c3aed;padding:20px;border-radius:0 8px 8px 0;margin-bottom:24px;">
        <p style="margin:0 0 12px;font-weight:bold;color:#7c3aed;font-size:13px;text-transform:uppercase;letter-spacing:.5px;">
          Detalles del Torneo
        </p>
        <table style="width:100%;border-collapse:collapse;font-size:14px;">
          <tr>
            <td style="padding:6px 0;color:#555;">
              <strong>Nombre:</strong>
            </td>
            <td style="padding:6px 0;text-align:right;color:#333;">
              ${tournamentName}
            </td>
          </tr>
          <tr>
            <td style="padding:6px 0;color:#555;">
              <strong>Costo de Entrada:</strong>
            </td>
            <td style="padding:6px 0;text-align:right;color:#333;">
              $${ticketCost.toFixed(2)} MXN
            </td>
          </tr>
          <tr>
            <td style="padding:6px 0;color:#555;">
              <strong>Inicio:</strong>
            </td>
            <td style="padding:6px 0;text-align:right;color:#333;">
              ${startDate}
            </td>
          </tr>
          <tr>
            <td style="padding:6px 0;color:#555;">
              <strong>Finalización:</strong>
            </td>
            <td style="padding:6px 0;text-align:right;color:#333;">
              ${endDate}
            </td>
          </tr>
          <tr style="border-top:1px solid #e5e7eb;">
            <td style="padding:10px 0;color:#555;">
              <strong>Participantes:</strong>
            </td>
            <td style="padding:10px 0;text-align:right;color:#333;">
              ${totalParticipants}
            </td>
          </tr>
          <tr>
            <td style="padding:6px 0;color:#555;">
              <strong>Premio Total:</strong>
            </td>
            <td style="padding:6px 0;text-align:right;font-weight:bold;color:#7c3aed;font-size:15px;">
              $${totalPool.toFixed(2)} MXN
            </td>
          </tr>
        </table>
      </div>

      <!-- Prize Information -->
      <div style="background-color:#f0f9ff;border-left:4px solid #0ea5e9;padding:16px;border-radius:0 8px 8px 0;margin-bottom:24px;">
        <p style="margin:0 0 8px;font-weight:bold;color:#0369a1;font-size:13px;text-transform:uppercase;letter-spacing:.5px;">
          🏆 Oportunidad de Ganar Crédito
        </p>
        <p style="margin:0;color:#0369a1;font-size:14px;line-height:1.5;">
          El ganador del torneo recibirá <strong>$${totalPool.toFixed(2)} MXN en crédito exclusivo</strong> 
          para comprar cualquier producto de nuestra tienda. ¡Este crédito permanecerá activo durante 6 meses!
        </p>
      </div>

      <!-- Next Steps -->
      <p style="font-weight:bold;font-size:15px;margin-bottom:12px;">Próximos Pasos</p>
      <ol style="font-size:14px;color:#555;line-height:1.8;margin-bottom:24px;">
        <li>Revisa tus datos de participación en tu perfil</li>
        <li>Confirma tu asistencia cuando se inicie el torneo</li>
        <li>Participa y acumula puntos</li>
        <li>¡Esperamos a ver tu nombre en el podio!</li>
      </ol>

      <!-- Footer -->
      <p style="margin-top:24px;color:#999;font-size:13px;">
        <strong style="color:#555;">SuperCollectibles.com.mx</strong><br>
        Si tienes preguntas sobre el torneo, contáctanos directamente.<br>
        ¡Que gane el mejor! 🎉
      </p>
    </div>
  </div>
</body>
</html>`;
}

export function buildTournamentParticipantAddedEmailHtml(
  p: TournamentParticipantAddedEmailParams,
): string {
  const {
    customerName,
    tournamentName,
    ticketCost,
    startDate,
    endDate,
    totalParticipants,
    totalPool,
  } = p;

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <title>¡Agregado al Torneo! — ${tournamentName}</title>
</head>
<body style="font-family:Arial,sans-serif;line-height:1.6;color:#333;margin:0;padding:20px;background-color:#f5f5f5;">
  <div style="max-width:600px;margin:0 auto;">

    <!-- Header -->
    <div style="background:linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%);color:white;padding:40px 30px;text-align:center;border-radius:10px 10px 0 0;">
      <h1 style="margin:0 0 8px;font-size:24px;font-weight:bold;">¡Te Hemos Agregado al Torneo!</h1>
      <p style="margin:0;opacity:.95;font-size:14px;">Torneo de Cartas Coleccionables</p>
    </div>

    <!-- Body -->
    <div style="background-color:#fff;padding:30px;border-radius:0 0 10px 10px;box-shadow:0 2px 8px rgba(0,0,0,.08);">
      <p style="font-size:16px;margin-bottom:8px;">¡Hola <strong>${customerName}</strong>!</p>
      <p style="font-size:14px;color:#555;margin-bottom:24px;">
        ¡Excelente noticia! Has sido agregado a <strong>"${tournamentName}"</strong>. 
        Prepárate para competir y tener la oportunidad de ganar crédito exclusivo.
      </p>

      <!-- Tournament Details -->
      <div style="background-color:#f9fafb;border-left:4px solid #7c3aed;padding:20px;border-radius:0 8px 8px 0;margin-bottom:24px;">
        <p style="margin:0 0 12px;font-weight:bold;color:#7c3aed;font-size:13px;text-transform:uppercase;letter-spacing:.5px;">
          Detalles del Torneo
        </p>
        <table style="width:100%;border-collapse:collapse;font-size:14px;">
          <tr>
            <td style="padding:6px 0;color:#555;">
              <strong>Nombre:</strong>
            </td>
            <td style="padding:6px 0;text-align:right;color:#333;">
              ${tournamentName}
            </td>
          </tr>
          <tr>
            <td style="padding:6px 0;color:#555;">
              <strong>Costo de Entrada:</strong>
            </td>
            <td style="padding:6px 0;text-align:right;color:#333;">
              $${ticketCost.toFixed(2)} MXN
            </td>
          </tr>
          <tr>
            <td style="padding:6px 0;color:#555;">
              <strong>Inicio:</strong>
            </td>
            <td style="padding:6px 0;text-align:right;color:#333;">
              ${startDate}
            </td>
          </tr>
          <tr>
            <td style="padding:6px 0;color:#555;">
              <strong>Finalización:</strong>
            </td>
            <td style="padding:6px 0;text-align:right;color:#333;">
              ${endDate}
            </td>
          </tr>
          <tr style="border-top:1px solid #e5e7eb;">
            <td style="padding:10px 0;color:#555;">
              <strong>Participantes:</strong>
            </td>
            <td style="padding:10px 0;text-align:right;color:#333;">
              ${totalParticipants}
            </td>
          </tr>
          <tr>
            <td style="padding:6px 0;color:#555;">
              <strong>Premio Total:</strong>
            </td>
            <td style="padding:6px 0;text-align:right;font-weight:bold;color:#7c3aed;font-size:15px;">
              $${totalPool.toFixed(2)} MXN
            </td>
          </tr>
        </table>
      </div>

      <!-- Prize Information -->
      <div style="background-color:#f0f9ff;border-left:4px solid #0ea5e9;padding:16px;border-radius:0 8px 8px 0;margin-bottom:24px;">
        <p style="margin:0 0 8px;font-weight:bold;color:#0369a1;font-size:13px;text-transform:uppercase;letter-spacing:.5px;">
          🏆 Oportunidad de Ganar Crédito
        </p>
        <p style="margin:0;color:#0369a1;font-size:14px;line-height:1.5;">
          El ganador del torneo recibirá <strong>$${totalPool.toFixed(2)} MXN en crédito exclusivo</strong> 
          para comprar cualquier producto de nuestra tienda. ¡Este crédito permanecerá activo durante 6 meses!
        </p>
      </div>

      <!-- Action Steps -->
      <p style="font-weight:bold;font-size:15px;margin-bottom:12px;">¿Qué Sigue?</p>
      <ol style="font-size:14px;color:#555;line-height:1.8;margin-bottom:24px;">
        <li>Revisa tus datos de participación en tu perfil</li>
        <li>Confirma tu asistencia cuando se inicie el torneo</li>
        <li>Participa y acumula puntos</li>
        <li>¡Esperamos a ver tu nombre en el podio!</li>
      </ol>

      <!-- Footer -->
      <p style="margin-top:24px;color:#999;font-size:13px;">
        <strong style="color:#555;">SuperCollectibles.com.mx</strong><br>
        Si tienes preguntas sobre el torneo, contáctanos directamente.<br>
        ¡Que gane el mejor! 🎉
      </p>
    </div>
  </div>
</body>
</html>`;
}

export interface TournamentWinnerEmailParams {
  customerName: string;
  tournamentName: string;
  creditAmount: number;
  expiryDate: string;
  badgesWon?: string[];
  totalParticipants: number;
  position: "1st" | "2nd" | "3rd";
}

export function buildTournamentWinnerEmailHtml(
  p: TournamentWinnerEmailParams,
): string {
  const {
    customerName,
    tournamentName,
    creditAmount,
    expiryDate,
    badgesWon,
    totalParticipants,
  } = p;

  const badgeHtml =
    badgesWon && badgesWon.length > 0
      ? `<p style="margin:0 0 8px;font-weight:bold;color:#059669;font-size:13px;text-transform:uppercase;letter-spacing:.5px;">
           🏅 Insignias Ganadas
         </p>
         <div style="margin-bottom:16px;display:flex;flex-wrap:wrap;gap:10px;">
           ${badgesWon.map((badge) => `<div style="background-color:#d1fae5;padding:8px 12px;border-radius:6px;font-size:12px;color:#065f46;font-weight:600;">${badge}</div>`).join("")}
         </div>`
      : "";

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <title>¡Felicidades! Ganaste el Torneo — ${tournamentName}</title>
</head>
<body style="font-family:Arial,sans-serif;line-height:1.6;color:#333;margin:0;padding:20px;background-color:#f5f5f5;">
  <div style="max-width:600px;margin:0 auto;">

    <!-- Header with Celebration -->
    <div style="background:linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%);color:#1f2937;padding:40px 30px;text-align:center;border-radius:10px 10px 0 0;position:relative;overflow:hidden;">
      <div style="position:absolute;top:10px;right:20px;font-size:40px;">🎉</div>
      <div style="position:absolute;top:20px;left:20px;font-size:40px;">🏆</div>
      <h1 style="margin:0 0 8px;font-size:28px;font-weight:bold;">¡FELICIDADES!</h1>
      <p style="margin:0;opacity:.95;font-size:16px;">¡Eres el Ganador del Torneo!</p>
    </div>

    <!-- Body -->
    <div style="background-color:#fff;padding:30px;border-radius:0 0 10px 10px;box-shadow:0 2px 8px rgba(0,0,0,.08);">
      <p style="font-size:16px;margin-bottom:8px;">¡Hola <strong>${customerName}</strong>!</p>
      <p style="font-size:14px;color:#555;margin-bottom:24px;">
        ¡Nos complace informarte que has sido seleccionado como ganador del torneo 
        <strong>"${tournamentName}"</strong> entre ${totalParticipants} participantes! 
        Tu dedicación y habilidad te han llevado a la victoria.
      </p>

      <!-- Credit Award -->
      <div style="background:linear-gradient(135deg, #22c55e 0%, #16a34a 100%);color:white;padding:24px;border-radius:8px;margin-bottom:24px;text-align:center;box-shadow:0 4px 12px rgba(34, 197, 94, .2);">
        <p style="margin:0 0 8px;font-size:13px;text-transform:uppercase;letter-spacing:1px;opacity:.9;">
          Crédito Ganado
        </p>
        <div style="font-size:36px;font-weight:bold;margin:12px 0;">
          $${creditAmount.toFixed(2)} MXN
        </div>
        <p style="margin:12px 0 0;font-size:13px;opacity:.85;">
          Disponible para gastar en cualquier producto hasta ${expiryDate}
        </p>
      </div>

      <!-- Badges -->
      ${badgeHtml}

      <!-- How to Use Credit -->
      <div style="background-color:#f9fafb;border-left:4px solid #22c55e;padding:16px;border-radius:0 8px 8px 0;margin-bottom:24px;">
        <p style="margin:0 0 12px;font-weight:bold;color:#16a34a;font-size:13px;text-transform:uppercase;letter-spacing:.5px;">
          Cómo Usar Tu Crédito
        </p>
        <ol style="margin:0;padding-left:20px;font-size:14px;color:#555;line-height:1.6;">
          <li>Accede a tu cuenta en SuperCollectibles.com.mx</li>
          <li>Ve a tu Dashboard de Crédito</li>
          <li>Selecciona los productos que desees comprar</li>
          <li>Aplica tu crédito en el carrito de compras</li>
          <li>¡Completa tu compra con tu premio!</li>
        </ol>
      </div>

      <!-- Important Info -->
      <div style="background-color:#fef3c7;border-left:4px solid #f59e0b;padding:16px;border-radius:0 8px 8px 0;margin-bottom:24px;">
        <p style="margin:0;color:#92400e;font-size:13px;line-height:1.6;">
          <strong>⏰ Importante:</strong> Tu crédito expirará el <strong>${expiryDate}</strong>. 
          Recuerda usarlo antes de esa fecha para no perderlo. Te enviaremos un recordatorio 
          2 semanas antes de que expire.
        </p>
      </div>

      <!-- Footer -->
      <p style="margin-top:24px;color:#999;font-size:13px;">
        <strong style="color:#555;">SuperCollectibles.com.mx</strong><br>
        Gracias por participar en nuestro torneo. ¡Esperamos verte en el próximo!
      </p>
    </div>
  </div>
</body>
</html>`;
}

export interface CreditExpiryReminderEmailParams {
  customerName: string;
  creditAmount: number;
  expiryDate: string;
  daysRemaining: number;
}

export function buildCreditExpiryReminderEmailHtml(
  p: CreditExpiryReminderEmailParams,
): string {
  const { customerName, creditAmount, expiryDate, daysRemaining } = p;

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <title>Recordatorio: Tu Crédito Expira Pronto</title>
</head>
<body style="font-family:Arial,sans-serif;line-height:1.6;color:#333;margin:0;padding:20px;background-color:#f5f5f5;">
  <div style="max-width:600px;margin:0 auto;">

    <!-- Header -->
    <div style="background:linear-gradient(135deg, #f59e0b 0%, #d97706 100%);color:white;padding:40px 30px;text-align:center;border-radius:10px 10px 0 0;">
      <h1 style="margin:0 0 8px;font-size:24px;font-weight:bold;">⏰ Recordatorio Importante</h1>
      <p style="margin:0;opacity:.95;font-size:14px;">Tu crédito está a punto de expirar</p>
    </div>

    <!-- Body -->
    <div style="background-color:#fff;padding:30px;border-radius:0 0 10px 10px;box-shadow:0 2px 8px rgba(0,0,0,.08);">
      <p style="font-size:16px;margin-bottom:8px;">¡Hola <strong>${customerName}</strong>!</p>
      <p style="font-size:14px;color:#555;margin-bottom:24px;">
        Queremos recordarte que tienes crédito disponible en tu cuenta que expirará pronto. 
        No queremos que pierdas esta valiosa oportunidad de conseguir tus artículos favoritos.
      </p>

      <!-- Credit Summary -->
      <div style="background:linear-gradient(135deg, #fef3c7 0%, #fef08a 100%);border:2px solid #f59e0b;padding:20px;border-radius:8px;margin-bottom:24px;">
        <table style="width:100%;border-collapse:collapse;font-size:14px;">
          <tr>
            <td style="padding:8px 0;color:#92400e;">
              <strong>Crédito Disponible:</strong>
            </td>
            <td style="padding:8px 0;text-align:right;color:#1f2937;font-weight:bold;font-size:18px;">
              $${creditAmount.toFixed(2)} MXN
            </td>
          </tr>
          <tr>
            <td style="padding:8px 0;color:#92400e;">
              <strong>Fecha de Expiración:</strong>
            </td>
            <td style="padding:8px 0;text-align:right;color:#b45309;font-weight:bold;">
              ${expiryDate}
            </td>
          </tr>
          <tr>
            <td style="padding:8px 0;color:#92400e;">
              <strong>Tiempo Restante:</strong>
            </td>
            <td style="padding:8px 0;text-align:right;color:#b45309;font-weight:bold;">
              ${daysRemaining} días
            </td>
          </tr>
        </table>
      </div>

      <!-- Urgency Message -->
      <div style="background-color:#fee2e2;border-left:4px solid #dc2626;padding:16px;border-radius:0 8px 8px 0;margin-bottom:24px;">
        <p style="margin:0;color:#991b1b;font-size:14px;line-height:1.6;">
          <strong>¡Acto rápido!</strong> Después del ${expiryDate}, tu crédito se perderá automáticamente. 
          No habrá forma de recuperarlo, así que te recomendamos que lo uses lo antes posible.
        </p>
      </div>

      <!-- Call to Action -->
      <div style="text-align:center;margin-bottom:24px;">
        <a href="https://supercollectibles.com.mx/perfil" style="background:linear-gradient(135deg, #f59e0b 0%, #d97706 100%);color:white;padding:14px 32px;border-radius:6px;text-decoration:none;font-weight:bold;font-size:15px;display:inline-block;">
          Ver Mis Créditos y Comprar Ahora
        </a>
      </div>

      <!-- Products Suggestion -->
      <p style="font-weight:bold;font-size:15px;margin-bottom:12px;">¿Qué Puedes Comprar?</p>
      <p style="font-size:14px;color:#555;margin-bottom:24px;">
        Tu crédito se puede usar para comprar cualquier producto en nuestra tienda, incluyendo:
      </p>
      <ul style="font-size:14px;color:#555;margin-bottom:24px;line-height:1.8;">
        <li>Cartas Coleccionables</li>
        <li>Productos Exclusivos</li>
        <li>Paquetes Especiales</li>
        <li>¡Y mucho más!</li>
      </ul>

      <!-- Footer -->
      <p style="margin-top:24px;color:#999;font-size:13px;">
        <strong style="color:#555;">SuperCollectibles.com.mx</strong><br>
        Si tienes preguntas sobre tu crédito, contáctanos.<br>
        ¡Esperamos tu compra pronto! 🎁
      </p>
    </div>
  </div>
</body>
</html>`;
}

// ============================================================================
// INVENTORY AUDIT MONTHLY REPORT EMAIL
// ============================================================================

export interface AuditReportParams {
  storeName: string;
  storeSlug: string;
  stats: {
    monthYear: string;
    totalProducts: number;
    auditedProducts: number;
    notAuditedProducts: number;
    auditPercentage: number;
    finalizedSessionsCount: number;
    categoriesBreakdown: Array<{ category: string; notAuditedCount: number }>;
  };
  notAuditedProducts: Array<{
    sku: string;
    name: string;
    currentQuantity: number;
    category: string;
    lastAudited: Date | null;
  }>;
  monthStart: Date;
  monthEnd: Date;
  recipientEmail: string;
}

export function buildAuditReportHtml(params: AuditReportParams): string {
  const { storeName, stats, notAuditedProducts } = params;

  // Format dates
  const monthYear = new Date(stats.monthYear).toLocaleString("es-MX", {
    month: "long",
    year: "numeric",
  });

  // Build products table rows
  const productsTableRows = notAuditedProducts
    .map(
      (p) => `
    <tr>
      <td style="padding:12px 8px;border-bottom:1px solid #eee;font-size:13px;font-weight:500;">${p.sku}</td>
      <td style="padding:12px 8px;border-bottom:1px solid #eee;font-size:13px;">${p.name}</td>
      <td style="padding:12px 8px;border-bottom:1px solid #eee;font-size:13px;text-align:center;font-weight:500;">${p.currentQuantity}</td>
      <td style="padding:12px 8px;border-bottom:1px solid #eee;font-size:13px;">${p.category}</td>
      <td style="padding:12px 8px;border-bottom:1px solid #eee;font-size:13px;">${
        p.lastAudited
          ? new Date(p.lastAudited).toLocaleDateString("es-MX")
          : "Nunca"
      }</td>
    </tr>
  `,
    )
    .join("");

  // Build categories breakdown rows
  const categoriesRows = stats.categoriesBreakdown
    .map(
      (c) => `
    <tr>
      <td style="padding:10px 12px;border-bottom:1px solid #f0f0f0;font-size:13px;">${c.category}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #f0f0f0;font-size:13px;text-align:center;font-weight:500;color:#d9534f;">${c.notAuditedCount}</td>
    </tr>
  `,
    )
    .join("");

  // Calculate progress bar width
  const progressPercentage = stats.auditPercentage;
  const progressColor =
    progressPercentage >= 80
      ? "#5cb85c"
      : progressPercentage >= 50
        ? "#f0ad4e"
        : "#d9534f";

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <title>Reporte Mensual de Auditoría de Inventario - ${monthYear}</title>
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f5f5f5; }
    .container { max-width: 900px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; }
    .header h1 { margin: 0; font-size: 28px; font-weight: 600; }
    .header p { margin: 8px 0 0 0; font-size: 14px; opacity: 0.9; }
    .content { padding: 30px; }
    .section { margin-bottom: 30px; }
    .section-title { font-size: 18px; font-weight: 600; color: #333; margin-bottom: 15px; padding-bottom: 10px; border-bottom: 2px solid #667eea; }
    .stats-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin-bottom: 20px; }
    .stat-card { background-color: #f9f9f9; padding: 15px; border-radius: 6px; border-left: 4px solid #667eea; }
    .stat-label { font-size: 12px; color: #999; text-transform: uppercase; font-weight: 600; }
    .stat-value { font-size: 24px; font-weight: 700; color: #333; margin-top: 5px; }
    .progress-container { background-color: #f0f0f0; border-radius: 20px; overflow: hidden; height: 24px; margin-top: 10px; }
    .progress-bar { height: 100%; background-color: ${progressColor}; width: ${progressPercentage}%; transition: width 0.3s ease; display: flex; align-items: center; justify-content: flex-end; padding-right: 8px; color: white; font-size: 11px; font-weight: 600; }
    .alert { background-color: #fff3cd; border: 1px solid #ffc107; padding: 15px; border-radius: 6px; margin-bottom: 20px; }
    .alert-title { font-weight: 600; color: #856404; margin-bottom: 5px; }
    .alert-text { color: #856404; font-size: 13px; }
    .table { width: 100%; border-collapse: collapse; margin-top: 15px; }
    .table thead { background-color: #f9f9f9; }
    .table th { padding: 12px 8px; text-align: left; font-size: 12px; font-weight: 600; color: #666; text-transform: uppercase; border-bottom: 2px solid #ddd; }
    .table td { padding: 12px 8px; border-bottom: 1px solid #eee; font-size: 13px; }
    .table tbody tr:hover { background-color: #f9f9f9; }
    .text-center { text-align: center; }
    .text-right { text-align: right; }
    .text-muted { color: #999; }
    .badge { display: inline-block; padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; }
    .badge-warning { background-color: #fff3cd; color: #856404; }
    .badge-danger { background-color: #f8d7da; color: #721c24; }
    .badge-success { background-color: #d4edda; color: #155724; }
    .footer { background-color: #f9f9f9; padding: 20px 30px; border-top: 1px solid #eee; text-align: center; color: #999; font-size: 12px; }
    @media (max-width: 600px) {
      .stats-grid { grid-template-columns: 1fr; }
      .table { font-size: 12px; }
      .table th, .table td { padding: 8px 4px; }
    }
  </style>
</head>
<body>
  <div class="container">
    <!-- Header -->
    <div class="header">
      <h1>📊 Reporte de Auditoría de Inventario</h1>
      <p>${storeName} • ${monthYear}</p>
    </div>

    <!-- Content -->
    <div class="content">
      <!-- Alert -->
      <div class="alert">
        <div class="alert-title">⚠️ Productos Pendientes de Auditar</div>
        <div class="alert-text">
          Se han identificado <strong>${stats.notAuditedProducts} productos</strong> que aún no han sido incluidos en una auditoría finalizada durante este mes.
          Por favor, revise la lista a continuación y programe las auditorías necesarias.
        </div>
      </div>

      <!-- Summary Section -->
      <div class="section">
        <h2 class="section-title">📈 Resumen General</h2>
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-label">Total de Productos</div>
            <div class="stat-value">${stats.totalProducts}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Productos Auditados</div>
            <div class="stat-value" style="color: #5cb85c;">${stats.auditedProducts}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Productos Pendientes</div>
            <div class="stat-value" style="color: #d9534f;">${stats.notAuditedProducts}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Sesiones Finalizadas</div>
            <div class="stat-value">${stats.finalizedSessionsCount}</div>
          </div>
        </div>

        <!-- Progress Bar -->
        <div style="margin-top: 20px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
            <span style="font-weight: 600; color: #333;">Cobertura de Auditoría</span>
            <span style="font-weight: 600; color: ${progressColor};">${stats.auditPercentage}%</span>
          </div>
          <div class="progress-container">
            <div class="progress-bar">${stats.auditPercentage}%</div>
          </div>
        </div>
      </div>

      <!-- Categories Breakdown -->
      <div class="section">
        <h2 class="section-title">📂 Desglose por Categoría (No Auditados)</h2>
        <table class="table">
          <thead>
            <tr>
              <th>Categoría</th>
              <th class="text-right">Cantidad</th>
            </tr>
          </thead>
          <tbody>
            ${categoriesRows}
          </tbody>
        </table>
      </div>

      <!-- Products Not Audited -->
      <div class="section">
        <h2 class="section-title">📋 Productos Pendientes de Auditar</h2>
        <p style="color: #666; font-size: 13px; margin-bottom: 15px;">
          Total: <strong>${stats.notAuditedProducts}</strong> productos requieren auditoría
        </p>
        <div style="overflow-x: auto;">
          <table class="table">
            <thead>
              <tr>
                <th style="width: 15%;">SKU</th>
                <th style="width: 35%;">Nombre del Producto</th>
                <th style="width: 15%; text-align: center;">Stock Actual</th>
                <th style="width: 20%;">Categoría</th>
                <th style="width: 15%;">Última Auditoría</th>
              </tr>
            </thead>
            <tbody>
              ${productsTableRows}
            </tbody>
          </table>
        </div>
      </div>

      <!-- Action Items -->
      <div class="section">
        <h2 class="section-title">✅ Próximos Pasos</h2>
        <ol style="color: #555; font-size: 13px; line-height: 1.8;">
          <li>Revise los productos listados en la tabla anterior</li>
          <li>Programe sesiones de auditoría para los productos pendientes</li>
          <li>Asegúrese de que todos los productos sean contados antes de fin de mes</li>
          <li>Finalice las sesiones de auditoría en el sistema</li>
          <li>Recibirá un reporte actualizado la próxima semana</li>
        </ol>
      </div>
    </div>

    <!-- Footer -->
    <div class="footer">
      <p style="margin: 0;">
        <strong>SuperCollectibles - Sistema de Auditoría de Inventario</strong><br>
        Reporte generado automáticamente el ${new Date().toLocaleDateString(
          "es-MX",
          {
            year: "numeric",
            month: "long",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          },
        )}<br>
        Este es un mensaje automático. Por favor no responda a este correo.
      </p>
    </div>
  </div>
</body>
</html>`;
}
