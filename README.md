# Feed

Planner de contenido para mis proyectos (Cancino, Crissis, Issi).

- **Inicio**: tarjetas de cada proyecto con avance del mes y próximo post.
- **Calendario** (`/proyecto/[slug]`): mes a mes, formato y estado de cada publicación, notas del día y análisis mensual por categoría.
- **Feed** (`/proyecto/[slug]/feed`): vista tipo Instagram con lo publicado + lo programado.

El banco de imágenes se guarda en internet (Vercel Blob privado). El resto de los datos sigue en el navegador (localStorage + IndexedDB). Toda la página pide clave (`APP_PASSWORD`).

```bash
npm run dev
```
