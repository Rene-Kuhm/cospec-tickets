const axios = require('axios');

async function sendWhatsApp(phone, text) {
  if (!phone) return;
  const url = `${process.env.EVOLUTION_API_URL}/message/sendText/${process.env.EVOLUTION_INSTANCE}`;
  try {
    await axios.post(url, { number: phone, text }, {
      headers: { apikey: process.env.EVOLUTION_API_KEY },
      timeout: 5000,
    });
    console.log(`📱 WhatsApp enviado a ${phone}`);
  } catch (err) {
    console.warn(`⚠️  WhatsApp falló para ${phone}: ${err.message}`);
  }
}

module.exports = { sendWhatsApp };
