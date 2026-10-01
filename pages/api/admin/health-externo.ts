import { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Método não permitido' });
  }

  const API_EXTERNA_BASE = 'http://ec2-15-229-152-29.sa-east-1.compute.amazonaws.com';
  const username = process.env.API_EXTERNA_USERNAME;
  const password = process.env.API_EXTERNA_PASSWORD;

  const result = {
    status: 'unknown',
    api_online: false,
    credentials_configured: !!(username && password),
    database_connected: false,
    timestamp: new Date().toISOString(),
    details: ''
  };

  try {
    // 1. Verificar se a API está online via endpoint /health
    const healthResponse = await axios.get(`${API_EXTERNA_BASE}/health`, { timeout: 5000 });
    
    if (healthResponse.status === 200) {
      result.api_online = true;
      result.database_connected = healthResponse.data?.database === 'connected';
      result.status = result.credentials_configured ? 'connected' : 'online_no_credentials';
    } else {
      result.status = 'error_status';
      result.details = `API respondeu com status ${healthResponse.status}`;
    }
  } catch (error: any) {
    result.api_online = false;
    result.status = 'offline';
    result.details = error.message;
  }

  return res.status(200).json(result);
}
