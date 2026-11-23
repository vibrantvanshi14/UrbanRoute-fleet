// npm install express cors
const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

const payments = new Map();

app.post('/api/payment-init', (req, res) => {
  const { txnRef, stationName, dateVal, timeSlot, vehicleName, amount } = req.body || {};
  if (!txnRef) return res.status(400).json({ error: 'txnRef is required' });

  if (!payments.has(txnRef)) {
    payments.set(txnRef, {
      txnRef,
      stationName: stationName || 'Charging Station',
      dateVal: dateVal || '',
      timeSlot: timeSlot || '',
      vehicleName: vehicleName || 'EV Driver',
      amount: Number(amount) || 50,
      status: 'PENDING',
      verified: false,
      paymentId: null,
      message: '',
      createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    });
  }

  return res.json({ ok: true, payment: payments.get(txnRef) });
});

app.get('/api/payment-status/:txnRef', (req, res) => {
  const { txnRef } = req.params;
  const expectedAmount = Number(req.query.expectedAmount || 50);

  if (!payments.has(txnRef)) {
    payments.set(txnRef, {
      txnRef,
      stationName: 'EV Charging Slot',
      dateVal: '',
      timeSlot: '',
      vehicleName: 'EV Driver',
      amount: expectedAmount,
      status: 'PENDING',
      verified: false,
      paymentId: null,
      message: '',
      createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    });
  }

  const record = payments.get(txnRef);
  return res.json({
    status: record.status,
    verified: record.verified,
    amount: record.amount,
    paymentId: record.paymentId,
    message: record.message
  });
});

app.get('/api/admin/payments', (req, res) => {
  res.json(Array.from(payments.values()).reverse());
});

app.post('/api/admin/payments/:txnRef/approve', (req, res) => {
  const { txnRef } = req.params;
  const record = payments.get(txnRef);
  if (!record) return res.status(404).json({ error: 'Transaction not found' });

  record.status = 'SUCCESS';
  record.verified = true;
  record.paymentId = 'UPI-' + txnRef;
  record.message = '₹50.00 verified in urbanroutefleet@ibl';
  res.json({ ok: true, payment: record });
});

app.post('/api/admin/payments/:txnRef/fail', (req, res) => {
  const { txnRef } = req.params;
  const record = payments.get(txnRef);
  if (!record) return res.status(404).json({ error: 'Transaction not found' });

  record.status = 'FAILED';
  record.verified = false;
  record.message = '₹50.00 payment was not received in urbanroutefleet@ibl.';
  res.json({ ok: true, payment: record });
});

app.get('/admin', (req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Urban Route Fleet — UPI Admin</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Instrument+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@500;700&family=Sora:wght@600;700;800&display=swap" rel="stylesheet" />
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Instrument Sans', -apple-system, BlinkMacSystemFont, sans-serif;
      background: radial-gradient(ellipse 80% 60% at 50% 0%, rgba(22, 84, 64, 0.45) 0%, transparent 70%), #051812;
      color: #f7fcf9;
      min-height: 100vh;
      padding: 24px 16px;
      -webkit-font-smoothing: antialiased;
    }
    .wrap { max-width: 560px; margin: 0 auto; }
    .header {
      background: #0d3226;
      border: 1px solid rgba(180, 240, 90, 0.2);
      border-radius: 20px;
      padding: 20px 22px;
      margin-bottom: 16px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
    }
    .eyebrow { font-family: 'JetBrains Mono', monospace; font-size: 10px; font-weight: 700; letter-spacing: 0.12em; color: #b4f05a; margin-bottom: 4px; }
    .header h1 { font-family: 'Sora', sans-serif; font-size: 19px; font-weight: 700; letter-spacing: -0.02em; }
    .live-pill {
      font-family: 'JetBrains Mono', monospace;
      font-size: 11px;
      font-weight: 700;
      background: rgba(180, 240, 90, 0.14);
      color: #b4f05a;
      padding: 6px 12px;
      border-radius: 999px;
      white-space: nowrap;
    }
    .hint {
      font-size: 13px;
      color: rgba(215, 238, 228, 0.78);
      background: #08241b;
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 14px;
      padding: 12px 16px;
      margin-bottom: 16px;
      line-height: 1.5;
    }
    .hint strong { color: #ffffff; }
    .list { display: flex; flex-direction: column; gap: 12px; }
    .empty {
      background: rgba(255, 255, 255, 0.03);
      border: 1px dashed rgba(255, 255, 255, 0.18);
      border-radius: 18px;
      padding: 36px 20px;
      text-align: center;
      color: rgba(215, 238, 228, 0.55);
      font-size: 13.5px;
    }
    .card {
      background: #0d3226;
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 18px;
      padding: 18px;
      box-shadow: 0 12px 30px rgba(0, 0, 0, 0.28);
    }
    .top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; gap: 8px; }
    .ref { font-family: 'JetBrains Mono', monospace; font-size: 11px; font-weight: 600; color: rgba(215, 238, 228, 0.6); }
    .badge { font-family: 'JetBrains Mono', monospace; font-size: 10.5px; font-weight: 700; padding: 3px 10px; border-radius: 999px; }
    .badge.PENDING { background: rgba(251, 191, 36, 0.16); color: #fde68a; }
    .badge.SUCCESS { background: rgba(180, 240, 90, 0.18); color: #b4f05a; }
    .badge.FAILED { background: rgba(239, 68, 68, 0.16); color: #fca5a5; }
    .station { font-family: 'Sora', sans-serif; font-size: 16px; font-weight: 700; margin-bottom: 4px; color: #ffffff; }
    .meta { font-size: 13px; color: rgba(215, 238, 228, 0.78); margin-bottom: 14px; line-height: 1.45; }
    .meta strong { color: #b4f05a; }
    .actions { display: grid; grid-template-columns: 1.35fr 1fr; gap: 10px; }
    button {
      height: 42px;
      border-radius: 999px;
      border: none;
      font-family: 'Sora', sans-serif;
      font-size: 13px;
      font-weight: 700;
      cursor: pointer;
    }
    .btn-ok { background: linear-gradient(135deg, #d7ff94, #b4f05a); color: #07241b; }
    .btn-ok:hover { filter: brightness(1.06); }
    .btn-fail { background: rgba(239, 68, 68, 0.14); color: #fca5a5; border: 1px solid rgba(248, 113, 113, 0.4); }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="header">
      <div>
        <div class="eyebrow">URBAN ROUTE FLEET · UPI ADMIN</div>
        <h1>Verify ₹50 GPay / PhonePe</h1>
      </div>
      <div class="live-pill">● Live (2s)</div>
    </div>

    <div class="hint">
      Check your GPay / PhonePe app for <strong>₹50.00</strong> received on <strong>urbanroutefleet@ibl</strong>.
      Tap <strong>Confirm ₹50 Received</strong> to print the user's ticket, or <strong>Mark Failed</strong> if not received.
    </div>

    <div class="list" id="paymentList">
      <div class="empty">Waiting for a user to open the ₹50 UPI QR on navigation.html...</div>
    </div>
  </div>

  <script>
    async function loadPayments() {
      try {
        const res = await fetch('/api/admin/payments');
        const list = await res.json();
        const container = document.getElementById('paymentList');

        if (!Array.isArray(list) || list.length === 0) {
          container.innerHTML = '<div class="empty">Waiting for a user to open the ₹50 UPI QR on navigation.html...</div>';
          return;
        }

        container.innerHTML = list.map((p) => {
          const actions = p.status === 'PENDING'
            ? \`<div class="actions">
                 <button class="btn-ok" onclick="decide('\${p.txnRef}', 'approve')">Confirm ₹\${p.amount} Received ✓</button>
                 <button class="btn-fail" onclick="decide('\${p.txnRef}', 'fail')">Mark Failed ✕</button>
               </div>\`
            : '';

          return \`
            <div class="card">
              <div class="top">
                <span class="ref">REF: \${p.txnRef} &middot; \${p.createdAt}</span>
                <span class="badge \${p.status}">\${p.status}</span>
              </div>
              <div class="station">\${p.stationName}</div>
              <div class="meta">
                <strong>₹\${p.amount}.00</strong> &middot; \${p.vehicleName}
                \${p.dateVal ? '<br/>Slot: ' + p.dateVal + ' · ' + p.timeSlot : ''}
              </div>
              \${actions}
            </div>
          \`;
        }).join('');
      } catch {}
    }

    async function decide(txnRef, action) {
      await fetch('/api/admin/payments/' + encodeURIComponent(txnRef) + '/' + action, { method: 'POST' });
      loadPayments();
    }

    loadPayments();
    setInterval(loadPayments, 2000);
  </script>
</body>
</html>`);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log('Urban Route Fleet Server running!');
  console.log('User App   : http://localhost:' + PORT + '/navigation.html');
  console.log('Admin Panel: http://localhost:' + PORT + '/admin');
});