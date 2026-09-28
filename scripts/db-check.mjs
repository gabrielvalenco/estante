// Confere a conexão com o banco e se as migrações foram aplicadas.
// Uso: DATABASE_URL="..." npm run db:check   (sem a variável, usa o .env.local)
// Nunca imprime a URL nem a senha: só o host e o resultado.
import nextEnv from "@next/env";
import postgres from "postgres";

nextEnv.loadEnvConfig(process.cwd());

const raw = process.env.DATABASE_URL;
if (!raw) {
  console.error("DATABASE_URL não definida.");
  process.exit(1);
}

let url;
try {
  url = new URL(raw);
  if (!/^postgres(ql)?:$/.test(url.protocol)) throw new Error();
} catch {
  console.error("DATABASE_URL não é uma connection string do Postgres.");
  console.error('Ela deve começar com "postgresql://". Copie do Neon: botão Connect, versão com -pooler no host.');
  process.exit(1);
}
url.searchParams.delete("channel_binding"); // mesmo ajuste de lib/db/url.ts
console.log(`Conectando em ${url.hostname} / banco ${url.pathname.slice(1)} ...`);

const sql = postgres(url.toString(), { prepare: false, max: 1, connect_timeout: 15 });

try {
  const tables = await sql`
    select table_name from information_schema.tables
    where table_schema = 'public' order by table_name`;
  const names = tables.map((t) => t.table_name);
  console.log("Conexão OK.");
  console.log("Tabelas:", names.length ? names.join(", ") : "(nenhuma)");

  const [migrations] = await sql`
    select count(*)::int as n from information_schema.tables
    where table_schema = 'drizzle' and table_name = '__drizzle_migrations'`;
  if (migrations.n) {
    const [{ n }] = await sql`select count(*)::int as n from drizzle.__drizzle_migrations`;
    console.log("Migrações aplicadas:", n);
  } else {
    console.log("Migrações aplicadas: 0 (rode npm run db:migrate)");
  }

  const ok = names.includes("profiles") && names.includes("entries");
  console.log(ok ? "\nTudo certo: o banco está pronto." : "\nFaltam tabelas: rode npm run db:migrate.");
  process.exitCode = ok ? 0 : 1;
} catch (err) {
  // Falha de rede vem como AggregateError: mensagem vazia e os detalhes em `errors`.
  const inner = err.errors?.[0];
  const code = err.code ?? inner?.code;
  console.error("\nFalhou:", err.message || inner?.message || String(err));
  if (code) console.error("Código:", code);
  const hints = {
    ECONNREFUSED: "Nada respondendo nesse endereço. Localmente: o Docker está aberto e o container rodando?",
    ENOTFOUND: "Host não encontrado. Confira se a URL foi copiada inteira.",
    "28P01": "Senha recusada. Se você trocou a senha no Neon, copie a connection string nova.",
    "3D000": "Esse banco não existe no servidor. Confira o nome depois da última / na URL.",
  };
  if (hints[code]) console.error("Dica:", hints[code]);
  process.exitCode = 1;
} finally {
  await sql.end({ timeout: 5 });
}
