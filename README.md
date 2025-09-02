CareYourCar — Seguimiento de mantenimiento de coches

Resumen
- App móvil (React Native + Expo) lista para publicar en App Store y Google Play más adelante.
- Permite registrar coches y anotar mantenimientos (aceite, neumáticos, filtros, correa, frenos, etc.).
- Arquitectura preparada para almacenamiento local (repo en memoria hoy, SQLite después) y recordatorios.

Stack
- Expo SDK 51, React Native 0.74, TypeScript.
- React Navigation para navegación.
- Futuro: expo-sqlite para persistencia, expo-notifications para recordatorios.

Estructura
- `App.tsx`: navegación principal.
- `src/models.ts`: tipos de dominio (Vehicle, MaintenanceRecord).
- `src/repository/Repo.ts`: interfaz de repositorio e implementación en memoria.
- `src/screens/*`: pantallas base (lista de coches, detalle, alta coche, alta mantenimiento).

Primeros pasos
1) Requisitos: Node 18+, npm o pnpm, Expo CLI (opcional).
2) Instalar dependencias: `npm install`.
3) Ejecutar en desarrollo: `npm start` y escanear QR con Expo Go o `npm run android` / `npm run ios`.

Roadmap inmediato
- Persistencia con SQLite (expo-sqlite) y migraciones.
- Recordatorios de mantenimiento (por fecha y por km) con expo-notifications.
- Edición/eliminación de registros, filtros y búsqueda.
- Exportación/backup (CSV/JSON) y, opcional, sincronización en la nube.

Publicación
- Expo EAS para builds nativas firmadas (iOS/Android).
- Configurar iconos, splash, permisos y privacidad antes de subir a tiendas.

