export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Serve a success page that will communicate with the extension
  res.setHeader('Content-Type', 'text/html');
  res.status(200).send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Payment Successful - Smart Finder</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          margin: 0;
          padding: 40px 20px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .container {
          background: white;
          border-radius: 12px;
          padding: 40px;
          text-align: center;
          max-width: 500px;
          box-shadow: 0 20px 40px rgba(0,0,0,0.1);
        }
        
        .success-icon {
          width: 80px;
          height: 80px;
          background: #34a853;
          border-radius: 50%;
          margin: 0 auto 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 40px;
          color: white;
        }
        
        h1 {
          color: #202124;
          margin: 0 0 16px 0;
          font-size: 24px;
          font-weight: 600;
        }
        
        p {
          color: #5f6368;
          margin: 0 0 24px 0;
          line-height: 1.5;
        }
        
        .status {
          padding: 12px 16px;
          border-radius: 6px;
          margin: 16px 0;
          font-weight: 500;
          background: #e8f0fe;
          color: #1a73e8;
          border: 1px solid #d2e3fc;
        }
        
        .button {
          background: #4285f4;
          color: white;
          border: none;
          padding: 12px 24px;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          text-decoration: none;
          display: inline-block;
          transition: background-color 0.15s ease;
          margin-top: 20px;
        }
        
        .button:hover {
          background: #3367d6;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="success-icon">✓</div>
        <h1>Payment Successful!</h1>
        <p>Your AI tokens have been purchased successfully and will be added to your account within a few moments.</p>
        
        <div class="status">
          ✓ Payment processed successfully<br>
          🔄 Tokens are being added to your account<br>
          📱 You can now close this tab and use the extension
        </div>
        
        <p style="font-size: 14px; color: #5f6368; margin-top: 20px;">
          Your new tokens will appear in the Smart Finder extension popup. 
          If you don't see them immediately, try refreshing the extension popup.
        </p>
        
        <button class="button" onclick="window.close()">Close Tab</button>
      </div>
      
      <script>
        // Auto-close after 10 seconds
        setTimeout(() => {
          window.close();
        }, 10000);
        
        // Try to communicate with extension if possible
        try {
          if (window.postMessage) {
            window.postMessage({ type: 'PAYMENT_SUCCESS' }, '*');
          }
        } catch (error) {
          console.log('Could not communicate with extension:', error);
        }
      </script>
    </body>
    </html>
  `);
} 