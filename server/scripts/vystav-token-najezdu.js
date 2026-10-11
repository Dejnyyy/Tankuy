// Vystaví token pro GET /api/najezd (poslední stav tachometru jednoho auta),
// pro prodejní stránku Golfu golf.dejny.eu. Spouštět na VPS uvnitř kontejneru,
// aby se JWT_SECRET nikam nekopíroval:
//   docker exec tankuy-api node scripts/vystav-token-najezdu.js <vehicleId>
// Token umí jen přečíst číslo z tachometru toho jednoho auta — nájezd je na
// prodejní stránce stejně veřejný, proto bez expirace (dokud se neprodá).
import jwt from 'jsonwebtoken';

const vehicleId = process.argv[2];
if (!vehicleId) {
  console.error('Použití: node scripts/vystav-token-najezdu.js <vehicleId>');
  process.exit(1);
}
const secret = process.env.JWT_SECRET;
if (!secret) {
  console.error('JWT_SECRET není nastaven.');
  process.exit(1);
}

console.log(jwt.sign({ sub: 'najezd', scope: 'mileage:read', vehicleId }, secret));
