# SPOTZ · Ensenada

Mapa de spots de street para BMX y skate en Ensenada, B.C. La comunidad registra los spots, reporta cambios y un admin modera.

---

## Arquitectura

```
Navegador (Next.js / React)
  │  mapa (MapLibre + estilos de MapTiler: oscuro y satélite)
  │  formularios → fetch multipart (las fotos se comprimen en el navegador)
  ▼
Rutas API de Next.js  (/api/*)          ← validan todo lo que entra
  │  service_role key (solo en el servidor)
  ▼
Supabase
  ├─ Postgres: spots · spot_photos · reports   (RLS activo, sin políticas públicas)
  └─ Storage:  bucket "spot-photos" (lectura pública, escritura solo desde el servidor)

/admin  →  middleware verifica una cookie firmada (HMAC) → páginas del servidor
```

**Decisiones clave**

- **Sin cuentas de usuario.** Leer, crear spots y enviar reportes no pide login. Toda escritura pasa por rutas API que validan los campos, el tipo y el tamaño de la foto y que la ubicación esté dentro de Ensenada. Hay un campo honeypot contra bots.
- **La base de datos no se expone al navegador.** RLS está activado sin políticas, así que la anon key no puede leer ni escribir nada. Solo el servidor habla con Supabase.
- **Los reportes no modifican nada directamente.** Se guardan como `pending`. Al aprobar uno, el estado del spot se actualiza y la foto de evidencia pasa a la galería.
- **Admin con una sola contraseña** (`ADMIN_PASSWORD`). La sesión es una cookie `httpOnly` y `SameSite=Strict`, firmada con `ADMIN_SESSION_SECRET`, que dura 12 h. El middleware protege `/admin/*` y `/api/admin/*`, y además cada ruta admin vuelve a verificar la sesión.

### Estructura

```
spotz/
├─ supabase/schema.sql          Tablas, índices, RLS y bucket de fotos
├─ public/                      Coloca aquí tu pin.png
└─ src/
   ├─ middleware.ts             Protección de /admin
   ├─ lib/
   │  ├─ geo.ts                 Límites de Ensenada, radios, distancia, link "Cómo llegar"
   │  ├─ types.ts               Tipos de spot, estados
   │  ├─ validation.ts          Validación del servidor
   │  ├─ supabase.ts            Cliente del servidor + subida de fotos
   │  ├─ session.ts             Cookie de admin firmada
   │  └─ image-client.ts        Compresión de fotos en el navegador
   ├─ components/
   │  ├─ SpotzApp.tsx           Mapa principal, radio, ubicación, flujo de "+ Spot"
   │  ├─ SpotPin.tsx            Pin personalizado (SVG con sprocket o tu PNG)
   │  ├─ Sprocket.tsx           Sprocket BMX generada por código
   │  ├─ SpotSheet.tsx          Detalle, galería y reporte
   │  ├─ CreateSpotForm.tsx     Formulario de nuevo spot
   │  └─ admin/                 Editor, fotos, acciones de reportes
   └─ app/
      ├─ page.tsx               Mapa
      ├─ admin/                 Panel (reportes · spots · editar spot)
      └─ api/                   spots, reports, admin/*
```

---

## Instalación

Requisitos: Node 18.18 o superior (probado con Node 24), una cuenta de Supabase y una cuenta gratis de MapTiler.

```bash
cd spotz
npm install
cp .env.example .env.local
```

### 1. Supabase

1. Crea un proyecto en [supabase.com](https://supabase.com).
2. Ve a **SQL Editor**, pega todo el contenido de `supabase/schema.sql` y ejecútalo. Esto crea las tablas y el bucket `spot-photos`.
3. En **Project Settings → API**, copia:
   - `Project URL` → `SUPABASE_URL`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY` (es secreta: nunca la publiques ni le pongas el prefijo `NEXT_PUBLIC_`)

### 2. Mapa (MapTiler, gratis y sin tarjeta)

1. Crea una cuenta en [cloud.maptiler.com](https://cloud.maptiler.com/auth/widget?next=https://cloud.maptiler.com/maps/).
2. Ve a **Account → API keys** y copia la **Default key** en `NEXT_PUBLIC_MAPTILER_KEY`.
3. Recomendado: edita la key y en **Allowed HTTP origins** agrega `localhost` y, después, tu dominio de Vercel.

Estilos que se usan: `streets-v2-dark` (Mapa) y `hybrid` (Satélite). Se cambian en `src/lib/config.ts`.

Los botones **Cómo llegar** y **Street View** abren Google Maps con links públicos, así que no necesitan clave ni facturación de Google.

### 3. Admin

```bash
# Secreto para firmar la sesión
openssl rand -hex 32
```

- `ADMIN_PASSWORD`: una contraseña larga de al menos 12 caracteres.
- `ADMIN_SESSION_SECRET`: el valor que imprimió el comando anterior.

### 4. Ejecutar

```bash
npm run dev
```

- Mapa: http://localhost:3000
- Admin: http://localhost:3000/admin

Para producción, sube el proyecto a **Vercel**, pega las mismas variables de entorno y despliega. Los navegadores exigen HTTPS para dar la ubicación del usuario, y Vercel ya lo incluye.

---

## Usar tu propio pin PNG

1. Guarda tu archivo como `public/pin.png`. Se recomienda 88×112 px (el doble de 44×56) con fondo transparente y la punta del pin en el centro del borde inferior.
2. En `.env.local`, agrega `NEXT_PUBLIC_PIN_IMAGE_URL=/pin.png`.
3. Reinicia `npm run dev`.

Todos los spots usarán tu PNG. La etiqueta **Nuevo** (spots de menos de 14 días) y el punto naranja de **Dudoso** se siguen dibujando encima del pin. Para cambiar los días, edita `NEW_SPOT_DAYS` en `src/lib/format.ts`.

---

## Qué hace cada parte

| Función | Dónde |
|---|---|
| Detecta tu ubicación y muestra los spots en un radio de 200, 300, 400 o 500 m, o en toda la ciudad | `SpotzApp.tsx` |
| Botón "Mi ubicación" y cambio entre Mapa y Satélite | `SpotzApp.tsx` |
| Botón "Street View" para ver el spot antes de ir | `SpotSheet.tsx` |
| Mapa limitado a Ensenada | `ENSENADA_BOUNDS` en `lib/geo.ts` |
| Tarjeta con foto, tipos, estado, distancia, fecha, autor, galería, "Cómo llegar" y "Street View" | `SpotSheet.tsx` |
| "+ Spot": primero se coloca el pin moviendo el mapa y luego se llena el formulario | `SpotzApp.tsx` + `CreateSpotForm.tsx` |
| Reporte con nuevo estado, comentario y foto de evidencia (queda pendiente) | `SpotSheet.tsx` → `/api/reports` |
| Admin: ver, editar y eliminar spots, aprobar o rechazar reportes, manejar fotos | `app/admin/*` |

Si no te da la ubicación (permiso negado o estás fuera de Ensenada), SPOTZ muestra toda la ciudad y desactiva los radios.

## Notas para producción

- **Límite de subida:** en Vercel, cada petición acepta máximo 4.5 MB. Las fotos se reducen en el navegador a 1600 px en JPEG (casi siempre menos de 600 KB). Si alguien sube un formato que el navegador no puede procesar, el servidor lo rechaza con un mensaje claro.
- **Spam:** la app es abierta, así que si empieza a llegar spam puedes agregar un límite de peticiones por IP en `/api/spots` y `/api/reports` (por ejemplo, con Upstash Ratelimit) o Cloudflare Turnstile.
- **Acceso general:** según el brief, se controla desde fuera de la app (por ejemplo, con Vercel Password Protection o Cloudflare Access).
