// Cria (ou confere) os produtos Capa Dura e Ex Libris e os preços no Stripe. Pode rodar mais de uma vez.
// Uso: npm run stripe:setup   (usa a STRIPE_SECRET_KEY do .env.local; em produção, a chave live)
// Nunca imprime a chave: só diz se é de teste ou de produção.
import nextEnv from "@next/env";
import Stripe from "stripe";

nextEnv.loadEnvConfig(process.cwd());
const key = process.env.STRIPE_SECRET_KEY;
if (!key) {
  console.error("STRIPE_SECRET_KEY não definida no .env.local.");
  process.exit(1);
}
console.log(`Conta Stripe em modo ${key.startsWith("sk_live_") ? "PRODUÇÃO" : "teste"}.`);
const stripe = new Stripe(key);

const PRODUCTS = [
  {
    plan: "capa-dura",
    name: "Estante Capa Dura",
    description: "Citações e notas ilimitadas, discussões sem limite, importar do Kindle, exportar e retrospectiva completa.",
    prices: [
      { lookup_key: "capa-dura-mensal", unit_amount: 690, interval: "month", nickname: "Capa Dura mensal" },
      { lookup_key: "capa-dura-anual", unit_amount: 5900, interval: "year", nickname: "Capa Dura anual" },
    ],
  },
  {
    plan: "ex-libris",
    name: "Estante Ex Libris",
    description: "Tudo do Capa Dura, clubes de leitura privados e citação por foto sem limite.",
    prices: [
      { lookup_key: "ex-libris-mensal", unit_amount: 1490, interval: "month", nickname: "Ex Libris mensal" },
      { lookup_key: "ex-libris-anual", unit_amount: 11900, interval: "year", nickname: "Ex Libris anual" },
    ],
  },
];

for (const p of PRODUCTS) {
  const found = await stripe.products.search({ query: `metadata['estante_plan']:'${p.plan}'` });
  const product = found.data[0] ?? (await stripe.products.create({ name: p.name, description: p.description, metadata: { estante_plan: p.plan } }));
  console.log(`Produto: ${product.name} (${product.id})`);
  for (const price of p.prices) {
    const existing = await stripe.prices.list({ lookup_keys: [price.lookup_key], active: true, limit: 1 });
    if (existing.data[0]) {
      const e = existing.data[0];
      console.log(`  ${price.lookup_key}: já existe (${(e.unit_amount / 100).toFixed(2)} ${e.currency.toUpperCase()}/${e.recurring?.interval})`);
      continue;
    }
    const created = await stripe.prices.create({
      product: product.id,
      currency: "brl",
      unit_amount: price.unit_amount,
      recurring: { interval: price.interval },
      lookup_key: price.lookup_key,
      nickname: price.nickname,
      tax_behavior: "inclusive",
    });
    console.log(`  ${price.lookup_key}: criado (${created.id})`);
  }
}
console.log("Pronto.");
