// Cria (ou confere) o produto Capa Dura e os preços no Stripe. Pode rodar mais de uma vez.
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

const PRICES = [
  { lookup_key: "capa-dura-mensal", unit_amount: 690, interval: "month", nickname: "Capa Dura mensal" },
  { lookup_key: "capa-dura-anual", unit_amount: 5900, interval: "year", nickname: "Capa Dura anual" },
];

const products = await stripe.products.search({ query: "metadata['estante_plan']:'capa-dura'" });
const product =
  products.data[0] ??
  (await stripe.products.create({
    name: "Estante Capa Dura",
    description: "Citações e notas ilimitadas e discussões sem limite por mês.",
    metadata: { estante_plan: "capa-dura" },
  }));
console.log(`Produto: ${product.name} (${product.id})`);

for (const p of PRICES) {
  const found = await stripe.prices.list({ lookup_keys: [p.lookup_key], active: true, limit: 1 });
  if (found.data[0]) {
    const f = found.data[0];
    console.log(`Preço ${p.lookup_key}: já existe (${(f.unit_amount / 100).toFixed(2)} ${f.currency.toUpperCase()}/${f.recurring?.interval})`);
    continue;
  }
  const price = await stripe.prices.create({
    product: product.id,
    currency: "brl",
    unit_amount: p.unit_amount,
    recurring: { interval: p.interval },
    lookup_key: p.lookup_key,
    nickname: p.nickname,
    tax_behavior: "inclusive",
  });
  console.log(`Preço ${p.lookup_key}: criado (${price.id})`);
}
console.log("Pronto.");
