const mysql = require('mysql2/promise');

async function seed() {
  const connection = await mysql.createConnection('mysql://root@127.0.0.1:3306/vonwork');
  
  // Seed admin user
  await connection.query(`
    INSERT INTO users (id, openId, name, email, loginMethod, role, createdAt, updatedAt, lastSignedIn)
    VALUES (1, 'demo-admin', 'VonWork Admin', 'admin@vonwork.ai', 'local', 'admin', NOW(), NOW(), NOW())
    ON DUPLICATE KEY UPDATE name = 'VonWork Admin', role = 'admin', lastSignedIn = NOW();
  `);

  // Seed credits for admin user
  await connection.query(`
    INSERT INTO credits (userId, balance, lifetimePurchased, lifetimeUsed, updatedAt)
    VALUES (1, 100000, 100000, 0, NOW())
    ON DUPLICATE KEY UPDATE balance = GREATEST(balance, 50000);
  `);

  // Seed plans
  const plans = [
    { name: 'Starter', slug: 'starter', priceMonthly: '499.00', priceAnnual: '4990.00', creditsPerMonth: 5000, maxAgents: 3, maxClients: 0, sortOrder: 1, features: JSON.stringify(['3 AI Agents', '5,000 Credits/mo', 'AI Chat', 'AI Receptionist', 'Knowledge Base', 'Email Support']) },
    { name: 'Pro', slug: 'pro', priceMonthly: '997.00', priceAnnual: '9970.00', creditsPerMonth: 15000, maxAgents: 10, maxClients: 0, sortOrder: 2, features: JSON.stringify(['10 AI Agents', '15,000 Credits/mo', 'All AI Features', 'AI Video Sales Agent', 'AI Outbound Dialer', 'Priority Support']) },
    { name: 'Business', slug: 'business', priceMonthly: '1997.00', priceAnnual: '19970.00', creditsPerMonth: 50000, maxAgents: 25, maxClients: 0, sortOrder: 3, features: JSON.stringify(['25 AI Agents', '50,000 Credits/mo', 'All Pro Features', 'AI CRM', 'Automation Builder', 'API Access', 'Dedicated Support']) },
    { name: 'Enterprise', slug: 'enterprise', priceMonthly: '4997.00', priceAnnual: '49970.00', creditsPerMonth: 200000, maxAgents: 100, maxClients: 0, sortOrder: 4, features: JSON.stringify(['Unlimited AI Agents', '200,000 Credits/mo', 'All Business Features', 'Custom Integrations', 'SLA', 'Dedicated Account Manager']) },
    { name: 'Agency', slug: 'agency', priceMonthly: '2997.00', priceAnnual: '29970.00', creditsPerMonth: 100000, maxAgents: 50, maxClients: 50, sortOrder: 5, features: JSON.stringify(['50 Client Accounts', '100,000 Credits/mo', 'White Label', 'Custom Domain', 'Client Management', 'Revenue Share', 'Agency Dashboard']) },
  ];

  for (const p of plans) {
    await connection.query(`
      INSERT INTO plans (name, slug, priceMonthly, priceAnnual, creditsPerMonth, maxAgents, maxClients, features, sortOrder, isActive)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, true)
      ON DUPLICATE KEY UPDATE name = VALUES(name), priceMonthly = VALUES(priceMonthly), priceAnnual = VALUES(priceAnnual), creditsPerMonth = VALUES(creditsPerMonth);
    `, [p.name, p.slug, p.priceMonthly, p.priceAnnual, p.creditsPerMonth, p.maxAgents, p.maxClients, p.features, p.sortOrder]);
  }

  // Seed credit packs
  const packs = [
    { name: 'Starter Pack', credits: 1000, priceUsd: '9.00', sortOrder: 1 },
    { name: 'Growth Pack', credits: 5000, priceUsd: '39.00', sortOrder: 2 },
    { name: 'Power Pack', credits: 15000, priceUsd: '99.00', sortOrder: 3 },
    { name: 'Enterprise Pack', credits: 50000, priceUsd: '299.00', sortOrder: 4 },
  ];

  for (const pack of packs) {
    await connection.query(`
      INSERT INTO credit_packs (name, credits, priceUsd, sortOrder, isActive)
      VALUES (?, ?, ?, ?, true)
      ON DUPLICATE KEY UPDATE credits = VALUES(credits), priceUsd = VALUES(priceUsd);
    `, [pack.name, pack.credits, pack.priceUsd, pack.sortOrder]);
  }

  // Seed active subscription for demo admin
  await connection.query(`
    INSERT INTO subscriptions (userId, planId, status, stripeSubscriptionId, currentPeriodEnd, createdAt, updatedAt)
    VALUES (1, 3, 'active', 'sub_demo_admin', DATE_ADD(NOW(), INTERVAL 1 YEAR), NOW(), NOW())
    ON DUPLICATE KEY UPDATE status = 'active';
  `);

  console.log('Database seeded successfully!');
  await connection.end();
}

seed().catch(console.error);
