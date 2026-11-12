# Deploy en Vercel

## Requisitos

- Node.js >= 20.19 (fijado en `package.json` → `engines`)
- Un proyecto de Supabase con Auth activo. El acceso es solo con Google y GitHub,
  vía OAuth. No hay contraseñas ni códigos por correo.
- PostgreSQL accesible. El proyecto está probado contra Supabase; el CA privado
  de PgBouncer viene embebido en `src/lib/supabase-ca.ts`.

## Antes del primer deploy

```bash
npm ci
npx prisma migrate deploy   # usa DIRECT_URL, nunca DATABASE_URL
npm run verify              # lint + typecheck + build
```

`prisma migrate deploy` DEBE apuntar a la sesión pooler (puerto 5432). Con
`DATABASE_URL` (puerto 6543, transaction mode) se queda colgado, porque el motor
de migraciones necesita advisory locks y estado de sesión.

## Configuración en Vercel

| Ajuste | Valor |
| --- | --- |
| Framework preset | Next.js (autodetectado) |
| Install Command | `npm ci` |
| Build Command | `prisma generate && next build` |
| Node.js Version | 22.x |
| Output | Default (no static export: hay rutas dinámicas) |

Copia todas las variables de `.env.example`. Los cuatro pasos que más se olvidan:

1. **`SUPABASE_SERVICE_ROLE_KEY`.** Solo la usa el borrado de cuenta, para
   eliminar la identidad en `auth.users`. Sin ella la ruta responde 502 con un
   aviso de borrado parcial: los datos de la app se borran, el acceso no.
2. **`NEXT_PUBLIC_SITE_URL`.** Sin él el sitemap sale vacío y los enlaces de
   OpenGraph apuntan al dominio por defecto.
3. **Proveedores OAuth.** Google y GitHub están apagados por defecto en un
   proyecto nuevo. Los botones se renderizan igualmente; habilita el proveedor y
   añade su client id y secret para que funcionen. En Site URL y en la lista de
   redirecciones permitidas debe aparecer `https://TU-DOMINIO/auth/callback`.

## Orden correcto de las operaciones

El dominio debe existir **antes** de habilitar los proveedores OAuth, porque
Google y GitHub validan las URI de redirección contra la configuración del
proyecto de Supabase.

1. Despliega con las tres variables de Supabase ya configuradas.
2. Añade el dominio en Vercel y anótalo en Supabase → Authentication → URL
   Configuration.
3. Habilita Google y GitHub con `https://TU-DOMINIO/auth/callback` como
   redirección permitida.
4. Redespliega (las variables `NEXT_PUBLIC_*` se compilan en el build, así que
   cambiarlas exige un redeploy, no basta con reiniciar).

## Migraciones

`npm run build` ejecuta `prisma generate`, pero **no** `migrate deploy`: un build
no debería tocar el esquema. Lanza las migraciones como un paso separado, antes
del despliegue o como job de CI.

### La migración inicial consolidada

`prisma/migrations` contiene una sola migración, `init`, que construye el
esquema completo partiendo de una base vacía: tablas, índices, claves
foráneas, seguridad a nivel de fila, políticas y revocación de privilegios.

```bash
npx prisma migrate deploy
```

**No se puede regenerar con `prisma migrate dev`.** Prisma no sabe expresar
seguridad a nivel de fila ni políticas en `schema.prisma`, así que una
migración generada automáticamente dejaría la base sin la capa que impide que
una clave `anon` filtrada lea datos privados. El archivo es SQL escrito a mano
y verificado contra el estado real de una base en producción.

**Sobre una base que ya tiene el historial incremental.** Esta migración
consolida en un único archivo un historial de seis migraciones que se aplicaron
por partes. Si tu base ya tiene esas seis aplicadas, no apliques esta: su
tabla `_prisma_migrations` registra los nombres antiguos y `migrate deploy` las
dará por divergentes. Para una base existente, sigue el historial incremental.

### Comparar una base con el esquema

```bash
npx prisma migrate status
npx prisma db pull --print    # vuelca el esquema real de la base
```

## Alternativa: Docker

```dockerfile
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci

FROM node:22-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0
COPY --from=build /app/public ./public
COPY --from=build /app/.next ./.next
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./package.json
EXPOSE 3000
CMD ["npm", "run", "start"]
```

Recuerda: el proxy (`src/proxy.ts`) necesita el **runtime de Node**. Si despliegas
en un entorno que solo admite Edge, el rate limiter en memoria no funcionará.

## Verificación post-despliegue

```bash
curl -s https://TU-DOMINIO/api/health          # {"status":"ok","db":"reachable"}
curl -s https://TU-DOMINIO/robots.txt
curl -s https://TU-DOMINIO/sitemap.xml | head
curl -sI https://TU-DOMINIO/ | grep -i content-security-policy
curl -s https://TU-DOMINIO/api/starter-patterns | head -c 120
curl -s https://TU-DOMINIO/api/auth            # {"user":null}
```

Entra con Google o con GitHub y comprueba, en este orden: que el patrón se
guarda, que aparece en "Mis patrones", que `/p/<id>` se renderiza con el nombre
del autor, y que "Eliminar cuenta" deja la cabecera en "Iniciar sesión".

Antes de desplegar, `npm run verify` tiene que estar en verde. Si el cambio
toca la interfaz, la comprobación en navegador es obligatoria: ver
[`TESTING.md`](TESTING.md).

---

## Lo que hay que tener en cuenta al operar

- **Google y GitHub.** Apagados por defecto; hay que habilitarlos y registrar
  `https://TU-DOMINIO/auth/callback`. Los botones se ven siempre.
- **`SUPABASE_SERVICE_ROLE_KEY`** es de solo servidor. Nunca al navegador.
- **No hay webhook.** La fila de usuario se crea en la primera petición
  autenticada (`getDbUser` en `src/lib/auth/session.ts`). Por eso el borrado de
  cuenta tiene que eliminar la identidad en `auth.users`: si no, un token vivo
  recrearía la fila en la siguiente petición.
- **Los botones de Google y GitHub se renderizan aunque el proveedor esté
  apagado.** Un proveedor sin configurar se manifiesta como un error de CORS o
  un 502 en el callback, no como una interfaz rota.
