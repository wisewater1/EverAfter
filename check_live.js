async function check() {
    const r = await fetch('https://everafterai.net/?v=' + Date.now());
    const html = await r.text();
    const match = html.match(/src="([\/A-Za-z0-9_\.-]+\.js)"/);
    if (!match) return console.log('No JS found in HTML:\n', html.substring(0, 500));
    const jsUrl = 'https://everafterai.net' + match[1];
    console.log('Fetching', jsUrl);
    const js = await (await fetch(jsUrl)).text();
    if (js.includes('sb_publishable')) console.log('SUCCESS: Anon key found!');
    else console.log('ERROR: Anon key missing!');
    if (js.includes('sncvecvgxwkkxnxbvglv')) console.log('SUCCESS: URL found!');
    else console.log('ERROR: URL missing!');
    if (js.includes('DIAGNOSTIC BUILD TRACE')) console.log('SUCCESS: DIAGNOSTIC TRACE FOUND! DEPLOY SUCCEEDED!');
    else console.log('ERROR: Output is an OLD VERSION. Deploy has not succeeded yet.');
}
check();
