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

  // Serve a cancelled page
  res.setHeader('Content-Type', 'text/html');
  res.status(200).send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Payment Cancelled - Smart Finder</title>
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
        
        .cancel-icon {
          width: 80px;
          height: 80px;
          background: #ea8600;
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
          background: #fef7e0;
          color: #ea8600;
          border: 1px solid #fce8b2;
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
          margin: 0 8px;
        }
        
        .button:hover {
          background: #3367d6;
        }
        
        .button.secondary {
          background: #f8f9fa;
          color: #5f6368;
          border: 1px solid #dadce0;
        }
        
        .button.secondary:hover {
          background: #f1f3f4;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="cancel-icon">⚠</div>
        <h1>Payment Cancelled</h1>
        <p>Your payment was cancelled. No charges were made to your account.</p>
        
        <div class="status">
          ℹ️ No payment was processed<br>
          💳 Your card was not charged<br>
          🔄 You can try purchasing tokens again anytime
        </div>
        
        <p style="font-size: 14px; color: #5f6368; margin-top: 20px;">
          You can return to the Smart Finder extension and try purchasing tokens again whenever you're ready.
        </p>
        
        <div style="margin-top: 32px;">
          <button class="button" onclick="window.close()">Close Tab</button>
        </div>
      </div>
      
      <script>
        // Auto-close after 5 seconds
        setTimeout(() => {
          window.close();
        }, 5000);
      </script>
    </body>
    </html>
  `);
} 