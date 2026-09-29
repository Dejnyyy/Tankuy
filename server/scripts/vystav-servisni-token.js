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

// Rok. Token sice umí jen číst, ale to čtení zahrnuje souřadnice stanic, časy,
// stav tachometru a poznámky — tedy záznam o tom, kde auto bylo a kdy. Delší
// platnost by znamenala, že případný únik zůstane využitelný roky.
//
// Až vyprší, Platee přestane palivo aktualizovat a v přehledu i v nastavení to
// přizná ("synchronizace selhává", u čísla bude datum kopie). Nový token se
// vystaví tímhle skriptem, postup je v NASAZENI.md v repu Platee.
const token = jwt.sign({ sub: 'platee', scope: 'entries:read', email }, secret, {
  expiresIn: '365d',
});

console.log(token);
