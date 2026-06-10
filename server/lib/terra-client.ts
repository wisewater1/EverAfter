import axios from 'axios';

const TERRA_BASE_URL = 'https://api.tryterra.co/v2';

interface TerraWidgetSession {
  url: string;
  session_id: string;
  expires_at: string;
}

interface TerraTokens {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  user_id: string;
  scope?: string;
}

export class TerraClient {
  private apiKey: string;
  private devId: string;

  constructor() {
    this.apiKey = process.env.TERRA_API_KEY || '';
    this.devId = process.env.TERRA_DEV_ID || '';

    if (!this.apiKey || !this.devId) {
      console.warn('⚠️ TERRA_API_KEY or TERRA_DEV_ID not set. Terra integration will not work.');
    }
  }

  async generateWidgetSession(
    referenceId: string,
    redirectUrl: string
  ): Promise<TerraWidgetSession> {
    const response = await axios.post(
      `${TERRA_BASE_URL}/auth/generateWidgetSession`,
      {
        reference_id: referenceId,
        providers: 'FITBIT,OURA,WHOOP,GARMIN,APPLE',
        auth_success_redirect_url: redirectUrl,
        language: 'en',
      },
      {
        headers: {
          'dev-id': this.devId,
          'x-api-key': this.apiKey,
        },
      }
    );

    return response.data;
  }

  async exchangeToken(code: string): Promise<TerraTokens> {
    const response = await axios.post(
      `${TERRA_BASE_URL}/auth/exchangeToken`,
      {
        code,
      },
      {
        headers: {
          'dev-id': this.devId,
          'x-api-key': this.apiKey,
        },
      }
    );

    return response.data;
  }

  async getUserData(userId: string, type: string) {
    const response = await axios.get(`${TERRA_BASE_URL}/user/${type}`, {
      params: { user_id: userId },
      headers: {
        'dev-id': this.devId,
        'x-api-key': this.apiKey,
      },
    });

    return response.data;
  }
}
