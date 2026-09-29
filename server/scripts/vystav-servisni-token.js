// Vystaví servisní token pro Platee. Spouštět na VPS uvnitř kontejneru,
// aby se JWT_SECRET nikam nekopíroval:
//   docker exec tankuy-api node scripts/vystav-servisni-token.js <email>
import jwt from 'jsonwebtoken';

const email = process.argv[2];
if (!email) {
  console.error('Použití: node scripts/vystav-servisni-token.js <email>');
  process.exit(1);
}

const secret = process.env.JWT_SECRET;
if (!secret) {
  console.error('JWT_SECRET není nastaven — token by šel podepsat fallbackem.');
  process.exit(1);
}

// Deset let: token je servisní, nikdo ho nebude ručně obnovovat. Kdyby unikl,
// nezmůže víc než číst tankování — proto je ta dlouhá platnost únosná.
const token = jwt.sign({ sub: 'platee', scope: 'entries:read', email }, secret, {
  expiresIn: '3650d',
});

console.log(token);
