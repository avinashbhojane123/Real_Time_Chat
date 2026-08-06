// Source - https://stackoverflow.com/a/76527460
// Posted by Yusuf
// Retrieved 2026-08-06, License - CC BY-SA 4.0
// Enhanced for dynamic HTTP/HTTPS support, environment variable configuration, and AWS Lambda deployment.

const http = require('http');
const https = require('https');

exports.handler = async (event, context) => {
  // Determine target URL from event parameter, environment variable, or fallback
  const rawUrl =
    (event && event.url) ||
    process.env.RENDER_SERVER_URL ||
    process.env.TARGET_URL ||
    'https://yoursitehere.onrender.com';

  // Automatically append ping route if missing
  let url = rawUrl.replace(/\/+$/, '');
  if (!url.includes('/api/keep-alive') && !url.includes('/api/ping')) {
    url = `${url}/api/keep-alive/ping`;
  }

  const parsedUrl = new URL(url);
  const client = parsedUrl.protocol === 'https:' ? https : http;

  return new Promise((resolve, reject) => {
    const req = client.get(url, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });

      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 400) {
          resolve({
            statusCode: 200,
            body: JSON.stringify({
              message: 'Server pinged successfully',
              targetUrl: url,
              statusCode: res.statusCode,
              responseBody: body,
              timestamp: new Date().toISOString(),
            }),
          });
        } else {
          reject(
            new Error(
              `Server ping failed for ${url} with status code: ${res.statusCode}. Response: ${body}`,
            ),
          );
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error(`Server ping to ${url} timed out after 10 seconds`));
    });

    req.end();
  });
};

// Allow direct execution locally for testing (node lambda/keepAliveHandler.js)
if (require.main === module) {
  exports
    .handler({ url: process.env.RENDER_SERVER_URL || 'http://localhost:10000/api/keep-alive/ping' })
    .then((res) => console.log('Ping Result:', JSON.parse(res.body)))
    .catch((err) => console.error('Ping Error:', err.message));
}
