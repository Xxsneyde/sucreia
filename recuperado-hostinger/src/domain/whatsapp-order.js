// Recuperado de hbuilds/last-source/server.mjs (Hostinger). Tipos TS eliminados por esbuild.
function whatsappDigits(phone) {
  if (!phone || !/^\+?[1-9]\d{9,14}$/.test(phone)) return null;
  return /^3\d{9}$/.test(phone) ? "57" + phone : phone.replace("+", "");
}
var orderCode = (id) => id.slice(0, 6).toUpperCase();
function orderMessage(order2) {
  const lines = order2.lines.map(
    (l) => `\u2022 ${l.quantity} \xD7 ${l.name} \u2014 ${currency(l.price * l.quantity)}`
  );
  return [
    `Hola, ${order2.storeName} \u{1F44B}`,
    "Quiero hacer este pedido que arm\xE9 en SucreIA:",
    "",
    ...lines,
    "",
    `*Total: ${currency(order2.total)}*`,
    ...order2.note.trim() ? ["", `Nota: ${order2.note.trim()}`] : [],
    "",
    `Pedido ${orderCode(order2.id)}. \xBFMe confirmas disponibilidad, forma de pago y entrega?`
  ].join("\n");
}
function orderLink(phone, message) {
  const digits = whatsappDigits(phone);
  return digits ? `https://wa.me/${digits}?text=${encodeURIComponent(message)}` : null;
}
