# Cazador B2B — Prospección local gratuita

Encuentra negocios cerca de tu ubicación (GPS o dirección), detecta si tienen sitio web, y genera propuestas de tus 4 servicios listas para enviar por WhatsApp. Sin backend, sin base de datos externa, sin costo — mismo flujo de siempre: GitHub + Vercel.

## Publicarlo

1. GitHub Desktop → nuevo repositorio (ej. `cazador-b2b`) → copia estos archivos adentro.
2. Commit → Publish repository.
3. [vercel.com](https://vercel.com) → "Add New… → Project" → importa `cazador-b2b` → Deploy (detecta Vite solo).
4. Tu URL pública en un par de minutos.

## Cómo funciona (y sus límites honestos)

- **Ubicación**: usa el GPS de tu navegador/celular (gratis, sin API) o buscas una dirección con Nominatim (el buscador de direcciones de OpenStreetMap, también gratis).
- **Búsqueda de negocios**: usa la API pública de Overpass (OpenStreetMap) — gratis, sin tarjeta, sin límite fijo. La contrapartida: **la cobertura es menor que Google Maps**, sobre todo para negocios pequeños que nadie ha registrado en OpenStreetMap. Vas a encontrar más resultados en zonas ya bien mapeadas; en algunas colonias puede haber pocos o ningún resultado.
- **Detección de sitio web**: se basa en si el negocio tiene el campo "website" cargado en OpenStreetMap. Si no aparece, **no significa necesariamente que no tengan sitio** — solo que no está registrado ahí. El botón "verificar" te abre una búsqueda de Google para confirmarlo tú mismo en 5 segundos, sin necesidad de ninguna API de pago.
- **Teléfono**: igual, depende de si el negocio lo tiene cargado en OpenStreetMap. Cuando no hay teléfono, el botón de propuesta cambia a "Copiar propuesta" para que la pegues donde tú decidas contactarlos (llamada, redes sociales, en persona).
- **La API pública de Overpass a veces está saturada** (la usa mucha gente gratis) — si una búsqueda falla o tarda mucho, espera un momento e intenta de nuevo.

## Tus leads

Se guardan en este navegador (localStorage) — no se suben a ningún servidor. Usa los botones **Exportar/Importar** de vez en cuando para respaldar tu lista, sobre todo antes de borrar el navegador o cambiar de computadora.

## Si más adelante quieres mejor cobertura de datos

Cuando el negocio te lo justifique, la mejora natural es activar la API de Google Places — pero recuerda que exige tarjeta de crédito registrada desde el inicio (aunque haya cuota gratis mensual), así que solo vale la pena si ya tienes ingresos que lo respalden. Por ahora, esta versión gratuita con OpenStreetMap es el punto de partida correcto.
