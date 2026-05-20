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
