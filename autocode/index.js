// This Webhook sends an email with transaction data whenever a transaction 
// is mined within the Alchemy API key

// Be sure to first add your SendGrid API key in the ENV VAR settings

const lib = require('lib')({token: process.env.STDLIB_SECRET_TOKEN});

// console.log(process.env.SENDGRID_API_KEY.substring(0,5));
// console.log(context.http.json);

const req = await fetch('https://api.sendgrid.com/v3/mail/send', {
  method: "POST",
  headers: {
    'Authorization': `Bearer ${process.env.SENDGRID_API_KEY}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    "personalizations": [{
      "to": [{"email": "YOUR_APPROVED_EMAIL@example.com"}]}],
      "from": {"email": "YOUR_APPROVED_EMAIL@example.com"},
      "subject": "Liquidation occurred!",
      "content": [{"type": "text/plain", "value": `${JSON.stringify(context.http.json, null, 4)}`}
    ]}),
});

// console.log('sendgrid api response', req);

return '';
