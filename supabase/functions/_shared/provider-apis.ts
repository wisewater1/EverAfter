export interface ProviderDataFetchOptions {
  accessToken: string;
  startDate: Date;
  endDate: Date;
}

export async function fetchDexcomData(options: ProviderDataFetchOptions): Promise<any> {
  const { accessToken, startDate, endDate } = options;

  const url = new URL('https://sandbox-api.dexcom.com/v3/users/self/egvs');
  url.searchParams.set('startDate', startDate.toISOString());
  url.searchParams.set('endDate', endDate.toISOString());

  const response = await fetch(url.toString(), {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Dexcom API error: ${response.status} ${await response.text()}`);
  }

  return await response.json();
}

export async function fetchFitbitData(options: ProviderDataFetchOptions): Promise<any> {
  const { accessToken, startDate, endDate } = options;

  const dateStr = endDate.toISOString().split('T')[0];

  const [activities, heart, sleep] = await Promise.all([
    fetch(`https://api.fitbit.com/1/user/-/activities/date/${dateStr}.json`, {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    }).then(r => r.json()),

    fetch(`https://api.fitbit.com/1/user/-/activities/heart/date/${dateStr}/1d.json`, {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    }).then(r => r.json()),

    fetch(`https://api.fitbit.com/1.2/user/-/sleep/date/${dateStr}.json`, {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    }).then(r => r.json()),
  ]);

  return { activities, heart, sleep };
}

export async function fetchOuraData(options: ProviderDataFetchOptions): Promise<any> {
  const { accessToken, startDate, endDate } = options;

  const start = startDate.toISOString().split('T')[0];
  const end = endDate.toISOString().split('T')[0];

  const [sleep, activity, readiness] = await Promise.all([
    fetch(`https://api.ouraring.com/v2/usercollection/daily_sleep?start_date=${start}&end_date=${end}`, {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    }).then(r => r.json()),

    fetch(`https://api.ouraring.com/v2/usercollection/daily_activity?start_date=${start}&end_date=${end}`, {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    }).then(r => r.json()),

    fetch(`https://api.ouraring.com/v2/usercollection/daily_readiness?start_date=${start}&end_date=${end}`, {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    }).then(r => r.json()),
  ]);

  return { sleep, activity, readiness };
}

export async function fetchTerraData(options: ProviderDataFetchOptions): Promise<any> {
  const { accessToken, startDate, endDate } = options;

  const start = startDate.toISOString().split('T')[0];
  const end = endDate.toISOString().split('T')[0];

  const devId = Deno.env.get('TERRA_DEV_ID');
  const apiKey = Deno.env.get('TERRA_API_KEY');

  if (!devId || !apiKey) {
    throw new Error('Terra credentials not configured');
  }

  const [activity, body, daily, sleep] = await Promise.all([
    fetch(`https://api.tryterra.co/v2/activity?start_date=${start}&end_date=${end}`, {
      headers: {
        'dev-id': devId,
        'x-api-key': apiKey,
        'Authorization': `Bearer ${accessToken}`,
      }
    }).then(r => r.json()),

    fetch(`https://api.tryterra.co/v2/body?start_date=${start}&end_date=${end}`, {
      headers: {
        'dev-id': devId,
        'x-api-key': apiKey,
        'Authorization': `Bearer ${accessToken}`,
      }
    }).then(r => r.json()),

    fetch(`https://api.tryterra.co/v2/daily?start_date=${start}&end_date=${end}`, {
      headers: {
        'dev-id': devId,
        'x-api-key': apiKey,
        'Authorization': `Bearer ${accessToken}`,
      }
    }).then(r => r.json()),

    fetch(`https://api.tryterra.co/v2/sleep?start_date=${start}&end_date=${end}`, {
      headers: {
        'dev-id': devId,
        'x-api-key': apiKey,
        'Authorization': `Bearer ${accessToken}`,
      }
    }).then(r => r.json()),
  ]);

  return { activity, body, daily, sleep };
}

export async function fetchProviderData(
  provider: string,
  options: ProviderDataFetchOptions
): Promise<any> {
  switch (provider.toLowerCase()) {
    case 'dexcom':
      return await fetchDexcomData(options);
    case 'fitbit':
      return await fetchFitbitData(options);
    case 'oura':
      return await fetchOuraData(options);
    case 'terra':
      return await fetchTerraData(options);
    default:
      throw new Error(`Unsupported provider: ${provider}`);
  }
}
