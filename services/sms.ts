import axios from 'axios';

export async function sendSMS(phoneNumber: string, message: string) {
  try {
    const response = await axios.post('https://api.smsprovider.com/send', {
      api_key: process.env.SMS_API_KEY,
      phone: phoneNumber,
      message,
    });

    return response.data;
  } catch (error) {
    console.error('Erro ao enviar SMS:', error);
    throw error;
  }
}
