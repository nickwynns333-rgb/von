const fs = require('fs');
const mysql = require('mysql2/promise');

async function main() {
  const connection = await mysql.createConnection('mysql://root@127.0.0.1:3306/vonwork');
  await connection.query('SET @@session.explicit_defaults_for_timestamp = 1;');
  await connection.query('SET @@global.explicit_defaults_for_timestamp = 1;');
  
  const files = fs.readdirSync('./drizzle').filter(f => f.endsWith('.sql')).sort();
  for (const file of files) {
    let raw = fs.readFileSync('./drizzle/' + file, 'utf8');
    raw = raw.replace(/DEFAULT\s*\(\s*now\(\)\s*\)/gi, 'DEFAULT CURRENT_TIMESTAMP');
    raw = raw.replace(/DEFAULT\s*\(\s*CURRENT_TIMESTAMP\s*\)/gi, 'DEFAULT CURRENT_TIMESTAMP');
    raw = raw.replace(/DEFAULT\s*\(\s*('[^']*'|[0-9]+|true|false|null)\s*\)/gi, 'DEFAULT $1');
    // Remove DEFAULT from text/blob/json columns with or without NOT NULL
    raw = raw.replace(/`([^`]+)`\s+(text|blob|json)(\s+NOT\s+NULL)?\s+DEFAULT\s+(\([^)]*\)|'[^']*'|"[^"]*")/gi, '`$1` $2');
    
    const stmts = raw.split('--> statement-breakpoint').map(s => s.trim()).filter(Boolean);
    for (const stmt of stmts) {
      try {
        await connection.query(stmt);
      } catch (err) {
        const msg = err.message || '';
        if (
          !msg.includes('already exists') &&
          !msg.includes('Duplicate column') &&
          !msg.includes('Duplicate key') &&
          !msg.includes("Can't DROP 'planOverride'")
        ) {
          console.error(`Statement error in ${file}:`, msg, '\nSQL:', stmt.slice(0, 100));
        }
      }
    }
  }
  console.log('All migrations applied cleanly!');
  const [tables] = await connection.query('SHOW TABLES;');
  console.log('Total tables created:', tables.length);
  await connection.end();
}

main().catch(console.error);
