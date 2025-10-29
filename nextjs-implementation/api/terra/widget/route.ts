import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { providers } = await req.json().catch(() => ({ providers: [] }));

    const apiKey = process.env.TERRA_API_KEY;
    const devId = process.env.TERRA_DEV_ID;
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;

    if (!apiKey || !devId) {
      return NextResponse.json(
        { error: 'Terra configuration missing. Please set TERRA_API_KEY and TERRA_DEV_ID.' },
        { status: 500 }
      );
    }

    const defaultProviders = [
      'FITBIT',
      'OURA',
      'GARMIN',
      'DEXCOM',
      'FREESTYLELIBRE',
      'WITHINGS',
      'POLAR',
    ];

    const res = await fetch(
      'https://api.tryterra.co/v2/auth/generateWidgetSession',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          accept: 'application/json',
          'x-api-key': apiKey,
          'dev-id': devId,
        },
        body: JSON.stringify({
          providers: providers.length > 0 ? providers : defaultProviders,
          language: 'en',
          reference_id: `EA-${Date.now()}`,
          auth_success_redirect_url: `${baseUrl}/terra/return?status=success`,
          auth_failure_redirect_url: `${baseUrl}/terra/return?status=failure`,
        }),
      }
    );

    const data = await res.json();

    if (!res.ok || !data.url) {
      return NextResponse.json(
        { error: 'Terra API error', details: data },
        { status: res.status }
      );
    }

    return NextResponse.json({
      url: data.url,
      session_id: data.session_id,
      expires_in: data.expires_in,
    });
  } catch (error) {
    console.error('Error generating widget session:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
