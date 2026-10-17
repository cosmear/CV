# Auditoría y optimización de rendimiento — 17/10/2026

Cambios locales preparados para el sitio estático existente. No se publicó el sitio ni se modificaron DNS, Analytics, Email Obfuscation o reglas de Cloudflare.

## 1. Diagnóstico

| Prioridad | Causa comprobada | Resolución |
| --- | --- | --- |
| Alta | Cinco recursos bloqueantes: dos CSS propios, dos CSS de fuentes y translations.js en el head | Una hoja consolidada; fuentes declaradas directamente; traducción inicial integrada al final del HTML |
| Alta | GSAP aplicaba opacidad cero al H1, incluso después de haberlo pintado | Se conserva desplazamiento, duración y stagger; el título permanece opaco |
| Alta | En este viewport mobile el LCP final es la foto, no siempre ARGERICH | AVIF/WebP responsive; prioridad alta justificada para la foto; sin reducir su resolución según el ancho aparente del recorte |
| Alta | Signal Lab dibujaba aproximadamente 60 veces/s fuera de pantalla | Inicio por visibilidad, cancelación de rAF, pausa del reloj y reanudación |
| Media | Barras de progreso cambiaban width durante el scroll | scaleX y quickSetter; geometría horizontal calculada al refrescar |
| Media | Scroll spy mezclaba lecturas geométricas y escrituras | Lecturas agrupadas antes de actualizar clases y atributos |
| Media | El cursor accedía a gsap aunque no hubiese cargado | Comprobación de disponibilidad y respaldo de proyectos sin pin |
| Externa | CSS servido con Cache-Control: max-age=14400 | Archivos con hash listos para reglas de caché externas |

La prueba aislada del hero no cambió significativamente el LCP agregado de Lighthouse mobile: la foto domina ese caso. En la prueba con red limitada sí se comprobó que el título original recibía opacidad cero y que la versión final no lo oculta. No se atribuye toda la mejora de LCP al cambio del H1.

## 2. Cambios implementados

- `index.html`: una hoja CSS versionada, preload exclusivo de Cabinet 800, preconnect al CDN correcto, traducciones iniciales sin solicitud bloqueante y srcset/sizes para las imágenes. Se mantienen los PNG de respaldo y las dimensiones originales.
- `css/fonts.css`: WOFF2 originales de Cabinet desde su CDN, pesos 400/500/700/800; IBM Plex Mono Latin local en 400/500. font-display:swap en todas las caras.
- `css/responsive.css`: progreso mediante transform, pausa de los efectos de Educación fuera de pantalla y scroll nativo de proyectos cuando GSAP no está disponible o se solicita reduced-motion.
- `js/main.js`: H1 visible durante la entrada, cursor tolerante a fallos de CDN, lecturas agrupadas, geometría horizontal cacheada por refresh y Signal Lab suspendido fuera de pantalla o con el documento oculto. Los tres niveles conservan 3/4/5 nodos, cinco segundos y la pausa de 1,5 s.
- `js/translations.js`: misma selección URL → preferencia guardada → navegador → ES; almacenamiento deshabilitado tolerado. Cambio de idioma notificado al scroll y al mensaje actual del juego.
- `assets/static/` y `assets/asset-manifest.json`: recursos con SHA-256 abreviado en el nombre. El manifiesto permite reconstruir desde un checkout limpio sin guardar duplicados de los intermedios de imagen.
- `scripts/optimize-images.py`: variantes sin recortar ni ampliar los PNG originales, AVIF calidad 70 y WebP 85. Requiere Pillow con AVIF; no se añade una dependencia al navegador.
- `scripts/build-assets.mjs`: build con Node y su biblioteca estándar. Conserva el orden de la cascada, inserta la traducción y versiona CSS, JS, WOFF2, AVIF, WebP y favicon. Normaliza los saltos de línea antes del hash.
- `scripts/check-assets.mjs`: valida hashes, recursos locales y JSON-LD.
- `scripts/test-browser.cjs`: suite Playwright reproducible, sin dependencia de producción.
- `.gitattributes`: los archivos generados no sufren conversiones automáticas de bytes que invalidarían sus hashes.

### Imágenes

Los tamaños de selección consideran `max(ancho de la imagen CSS, alto × relación de aspecto)`, el escalado de la animación y DPR. Por ejemplo, la foto del hero ocupa 432 px de alto en mobile: un contenedor de 390 px de ancho no justifica una fuente de 390 px. A DPR 3 se sigue seleccionando la variante completa de 1672 px; no se inventa detalle ampliando el original.

| AVIF | Original | Variante máxima | Variante menor |
| --- | ---: | ---: | ---: |
| Hero | 144.940 B | 95.846 B / 1672 px | 45.876 B / 960 px |
| Perfil | 102.515 B | 76.092 B / 1672 px | 37.000 B / 960 px |
| Experiencia | 175.094 B | 112.760 B / 1915 px | 43.208 B / 960 px |
| Loop Smiths automation | 207.097 B | 137.043 B / 1672 px | 67.162 B / 960 px |
| Contacto | 37.998 B | 29.802 B / 1672 px | 14.508 B / 960 px |
| Eclipsed Fates cover | 53.869 B | 45.639 B / 1080 px | 18.054 B / 540 px |
| Logo Loop Smiths | 11.369 B | 10.090 B / 512 px | 2.253 B / 128 px |

Onna ya pesa 7.131 B en AVIF; se conserva. Las imágenes originales no utilizadas no se descargan ni se eliminan. Las fotos fuera de pantalla mantienen lazy loading, decoding async y prioridad baja.

### Fuentes y licencia

IBM Plex se distribuye con su licencia SIL OFL original en `assets/fonts/OFL-IBM-Plex.txt`. Se usan los subconjuntos Latin oficiales, que cubren los textos ES/EN.

La licencia oficial descargada de Fontshare, FFL 2.0 del 17/08/2026, permite self-hosting para sitios propios, pero restringe la redistribución en repositorios y las modificaciones/subsetting. Para este repositorio público se conservan los WOFF2 oficiales del CDN, sin copiarlos, convertirlos ni modificarlos. La licencia se incluye como referencia en `assets/fonts/FFL-Cabinet-Grotesk.txt`. Se elimina la hoja de la API y se conecta directamente con cdn.fontshare.com. Se mantienen exactamente las familias originales. [Fontshare](https://www.fontshare.com/licenses), [licencia de IBM](https://github.com/IBM/plex/blob/master/LICENSE.txt).

No se introducen ajustes métricos aproximados que puedan alterar el diseño. El CLS medido está ampliamente por debajo de 0,1.

## 3. Comparación verificable

Lighthouse **12.8.2**, Chrome headless, perfil mobile estándar con throttling **simulado**, caché fría y servidor local con gzip. Medianas de tres corridas antes y tres de la implementación final, realizadas de forma secuencial. Las fuentes y GSAP siguen accediéndose por sus URL reales. No son resultados de PageSpeed en producción ni datos de usuarios reales.

| Métrica | Antes | Final |
| --- | ---: | ---: |
| Performance | 86 | **92** (91–94) |
| FCP | 2,581 s | **2,120 s** |
| LCP | 3,606 s | **2,854 s** |
| TBT | 0 ms | **154 ms** (0–171) |
| CLS | 0,000830 | **0** (máximo 0,000274) |
| Speed Index | 2,581 s | **2,120 s** |
| Transferencia inicial | 405.492 B | **328.628 B** |
| Solicitudes de red iniciales, sin data: | 17 | **13** |
| Recursos bloqueantes | 5 | **1** |

La reducción de LCP simulado es aproximadamente **21 %** y la de transferencia inicial **19 %**. La transferencia corresponde a la carga auditada, incluyendo la foto de Perfil que entra en el umbral lazy del navegador, no a descargar todas las imágenes tras recorrer toda la página.

**TBT no mejoró.** Hay variación en cuándo ScrollTrigger realiza su tarea de inicialización respecto de FCP. La traza final todavía contiene una tarea larga de ScrollTrigger. Aun así, el trabajo total de scripting y el trabajo continuo disminuyeron; no corresponde presentar TBT como una mejora ni prometer cero reflows.

### Prueba adicional de throttling real por CDP

390×844, DPR 2, navegador EN, 150 ms de latencia, 1,6 Mbps de descarga, 750 Kbps de subida y CPU ×4; una corrida por versión. Estos valores observados se muestran separados del modelo simulado de Lighthouse.

| Métrica observada | Antes | Después |
| --- | ---: | ---: |
| LCP | 2,472 s | **1,992 s** |
| FCP | 1,208 s | 1,256 s |
| CLS | 0,001975 | 0,001577 |
| Idioma en el primer paint | ES, luego EN | **EN** |
| Mutaciones que ocultan el H1 | 10 | **0** |

No se afirma una mejora de FCP en esta corrida adicional: varió 48 ms. El LCP observado sí quedó por debajo de 2,5 s; el LCP de Lighthouse simulado todavía supera esa meta orientativa.

### Hilo principal y scroll

Prueba de escritorio a 1440×900, condiciones iguales en ambas versiones; una corrida por caso:

| Trabajo medido con CDP | Antes | Después |
| --- | ---: | ---: |
| Dibujos del canvas fuera de pantalla | ~60/s | **0/s** |
| Tiempo de tareas en 3 s de reposo | 187,56 ms | **42,30 ms** |
| Layouts al recorrer proyectos en 60 pasos | 64 | **5** |
| Tiempo de layout de ese recorrido | 6,425 ms | **0,760 ms** |
| Tiempo de tareas de ese recorrido | 240,90 ms | **114,12 ms** |

### Experimentos descartados

| Experimento | Resultado de laboratorio | Decisión |
| --- | --- | --- |
| Solo cambiar la entrada del hero | LCP 3,606 → 3,604 s | Sin mejora agregada; se conserva únicamente quitar opacity:0 al H1 por su visibilidad comprobada. Se restauró el reveal angular original de la foto |
| CSS completo inline | 92 puntos; TBT ~93 ms en la corrida aislada | Descartado frente a la entrega consolidada; aumenta el HTML |
| Critical CSS automático + CSS restante asíncrono | 92 puntos; LCP 3,005 s | Descartado; no gana rendimiento y añade complejidad/posible FOUC al recorrer temprano la página |
| ScrollTrigger después de dos rAF | 92 puntos; TBT 150 ms | Descartado; no mejora la experiencia medida |
| Cabinet variable oficial | Ahorra ~21 KB y dos solicitudes; 92 puntos, TBT 161 ms | Descartado; no demuestra mejora global frente a las caras originales |

## 4. Caché y cambios externos pendientes

### Hosting comprobado

La respuesta pública del 17/10/2026 contiene `Server: cloudflare` y cabeceras de GitHub/Fastly (`x-github-request-id`, `x-served-by`, `via: varnish`). El HTML tiene `max-age=600` y estado DYNAMIC; el CSS `max-age=14400` y REVALIDATED. Confirma GitHub Pages detrás de Cloudflare. No se añadió `_headers`: GitHub Pages no lo interpreta como Cloudflare Pages.

Los hashes resuelven el versionado en código. **El TTL de producción no cambia hasta configurar Cloudflare y desplegar los nuevos archivos.** Las siguientes reglas son propuestas para aplicar con autorización; no se han creado.

### Regla de caché: CV assets versionados

En la zona `cosmeargerich.com.ar`, abrir **Caching → Cache Rules → Create rule**, usar expresión personalizada:

```text
(http.host eq "cosmeargerich.com.ar" and starts_with(http.request.uri.path, "/assets/static/"))
```

- Cache eligibility: **Eligible for cache**.
- Edge TTL: **Ignore cache-control header**, un año, 31.536.000 segundos.
- Status Code TTL: 200–299 → 31.536.000; 300–499 → 0 (revalidar); 500–599 → -1 (no almacenar).
- Browser TTL: **Respect origin**. La cabecera hacia el navegador se define con la regla de respuesta siguiente.
- Conservar la clave de caché predeterminada; no ignorar parámetros globalmente.
- Revisar el orden frente a reglas existentes que puedan sobrescribir estos valores.

Estos controles tienen semánticas diferentes para edge y navegador. [Configuración oficial de Cache Rules](https://developers.cloudflare.com/cache/how-to/cache-rules/settings/).

En **Rules → Transform Rules → Modify Response Header**, crear `CV immutable 200`:

```text
(http.host eq "cosmeargerich.com.ar"
 and starts_with(http.request.uri.path, "/assets/static/")
 and http.response.code eq 200)
```

Acción **Set static**, header `Cache-Control`, valor:

```text
public, max-age=31536000, immutable
```

La condición 200 evita dar un año de caché de navegador a una URL inexistente. La regla de headers no configura por sí sola el caché de edge; por eso se propone también la Cache Rule. Verificar la disponibilidad del campo de respuesta en el plan de la zona. [Transform Rules](https://developers.cloudflare.com/rules/transform/response-header-modification/), [campos disponibles](https://developers.cloudflare.com/rules/transform/response-header-modification/reference/fields-functions/).

### HTML siempre revalidable

Crear Cache Rule `CV HTML`, con expresión:

```text
(http.host eq "cosmeargerich.com.ar" and http.request.uri.path in {"/" "/index.html"})
```

Elegir **Bypass cache**. Crear una regla de response headers con la misma condición y Set static `Cache-Control`:

```text
no-cache, max-age=0, must-revalidate
```

No aplicar immutable a HTML, a los PNG de las tarjetas sociales, al PDF o a nombres de assets sin hash.

### Despliegue y verificación posteriores

1. Publicar HTML y los 49 recursos del manifiesto en la misma entrega. GitHub Pages sigue sirviendo el sitio estático desde la raíz; no necesita Node en producción.
2. Purgar en Cloudflare solamente `/` y `/index.html` si existe una copia anterior. No hace falta purgar archivos con hash nuevo.
3. Conservar archivos versionados antiguos mientras puedan existir HTML/cache/clientes que aún los referencien. El build no los elimina automáticamente. La limpieza local de los experimentos solo afecta archivos que nunca fueron publicados.
4. Comprobar dos veces con `curl.exe -I` una URL nueva del manifiesto: 200, `max-age=31536000, immutable`, y HIT tras poblar el edge. Comprobar que una URL inventada no recibe immutable.
5. Comprobar HTML: revalidación y ausencia de un TTL prolongado. Cambiar un CSS, reconstruir y verificar que el HTML referencia un hash diferente.
6. Repetir PageSpeed mobile/desktop tres veces. Revisar los percentiles reales de CrUX/Analytics cuando exista suficiente tráfico; no usar una corrida de laboratorio para afirmar INP real.

### Recursos de Cloudflare

La inspección del navegador de producción confirmó `email-decode.min.js`, `static.cloudflareinsights.com/beacon.min.js/...` y una llamada `/cdn-cgi/rum` con 204. Los scripts GSAP servidos por cdnjs son dependencias declaradas por el repositorio, aunque su host también contenga la palabra Cloudflare.

| Control | Recursos | Estado |
| --- | --- | --- |
| Repositorio | CSS, JS propio, fuentes, imágenes; referencias de GSAP/ScrollTrigger | Optimizados localmente |
| Inyectado por Cloudflare | Email decoding, beacon, RUM | No se modificó código minificado ni se desactivaron |
| Configuración externa | TTL, headers y ajustes de Analytics/Email Obfuscation | Requiere acceso/autorización a la zona |

No se midió una penalización material atribuible exclusivamente al beacon o al decoder; la comparación local no los incluye. No hay evidencia para justificar desactivarlos como parte de este cambio.

Si más adelante se demuestra que no se necesitan: en **Web Analytics**, seleccionar el sitio y desactivar la instalación automática; se perderá la recogida correspondiente de visitas/rendimiento. Para el decoder, desactivar **Email Address Obfuscation** en la configuración de **Scrape Shield**; se pierde la ocultación del correo frente a scrapers y queda el mailto original del HTML. La ubicación del control puede variar con el dashboard. [Web Analytics](https://developers.cloudflare.com/web-analytics/get-started/), [Email Address Obfuscation](https://developers.cloudflare.com/waf/tools/scrape-shield/email-address-obfuscation/).

## 5. Pruebas y evidencia

**79 comprobaciones Playwright: aprobadas.** Chrome aislado; Browser plugin no disponible, se utilizó Playwright instalado en el runtime. Viewports 1440, 1920, 768, 390 y 320 px, altura 900 px; comprobación adicional 390×844 con DPR 3.

Verificado: identidad de página, H1, ausencia de overflow, ES/EN, recarga con preferencia guardada, precedencia del parámetro lang, aria-label del canvas, menú mobile completo y cierre al navegar, pin horizontal/progreso/scroll spy, cursor, ausencia de excepciones y recursos HTTP fallidos, juego de tres niveles, victoria, derrota, reset, flechas, pausa fuera de pantalla y reloj preservado, mensajes traducidos, reduced-motion, sin JS, bloqueo separado de GSAP y ScrollTrigger y almacenamiento deshabilitado. Tab alcanza el enlace para saltar al contenido.

Los textos visibles originales, todos los atributos de enlaces, metadatos/canonical y los tres bloques JSON-LD se compararon y son idénticos. `git diff --check`, validación de los 49 hashes y reconstrucción idempotente: aprobados.

Capturas antes/después del hero en los cinco tamaños; capturas de Perfil, Experiencia, Educación, Proyectos y Contacto a 1440 y 390 px. La diferencia media por canal de las capturas iniciales va de 0,246 a 1,421 sobre 255; incluye la compresión de la foto. Se revisó la composición visual; esto no equivale a una prueba perceptual exhaustiva de todos los dispositivos.

Evidencia local de esta sesión:

`C:/Users/carge/.codex/visualizations/2026/10/17/01a14c07-4c57-7d41-bc2a-a15ec25f8d93/performance/`

- `lighthouse-before-{1,2,3}.report.{json,html}`: línea base inmutable del código inicial.
- `lighthouse-final-{1,2,3}.report.{json,html}`: implementación final.
- `advanced-results.json`: throttling real, CPU/scroll e inventario Cloudflare.
- `baseline-browser.json`: selección original de imágenes, fuentes y dibujos por segundo.
- `final-qa/qa-results.json`: 79 comprobaciones y sus resultados.
- `static-visual-verification.json`: comparación de capturas iniciales.
- `before/`, `server.cjs`, `advanced.cjs`, `verify.py`: reproducción local de las comparaciones.

## 6. Mantenimiento y pendientes

Editar los contenidos en `index.html`, estilos en `css/`, código en `js/`. Después de un cambio:

```powershell
node scripts/build-assets.mjs
node scripts/check-assets.mjs
```

Solo si cambia un PNG maestro:

```powershell
python scripts/optimize-images.py
node scripts/build-assets.mjs
node scripts/check-assets.mjs
```

Las variantes intermedias se ignoran en Git; los archivos finales de `assets/static/` y el manifiesto sí forman parte de la entrega. No editar los archivos con hash manualmente. Una instalación limpia puede reconstruir CSS/JS reutilizando las imágenes versionadas del manifiesto. Requiere Node moderno; no hay dependencias npm para el build.

Para pruebas funcionales, servir la raíz con cualquier servidor estático y ejecutar con Playwright instalado en el entorno de desarrollo:

```powershell
python -m http.server 4173 --bind 127.0.0.1
# En otra terminal; el segundo argumento opcional es un directorio de evidencia.
node scripts/test-browser.cjs http://127.0.0.1:4173
```

Para repetir Lighthouse con la misma versión utilizada aquí:

```powershell
npx lighthouse@12.8.2 http://127.0.0.1:4173/ --chrome-flags="--headless --no-sandbox" --only-categories=performance --output=json --output=html --output-path=./audit/lighthouse
```

Ejecutar tres veces de forma secuencial, con caché fría y sin otras pruebas de navegador simultáneas. Crear previamente `audit/` si hace falta. Comparar medianas y conservar JSON/HTML originales.

Pendiente externo: aplicar las reglas propuestas y verificar los headers tras un despliegue autorizado. Pendiente de campo: INP/CrUX y validación de caché real en visitas repetidas. Safari/Firefox y dispositivos físicos no se probaron; teclado y accesibilidad se verificaron en los casos descritos, sin afirmar una auditoría WCAG completa. La pausa por visibilidad de la pestaña está implementada; la suite comprueba directamente la pausa por intersección.

## 7. Resultado final

Se mejora la carga inicial, se reducen solicitudes y bytes, se elimina el trabajo del minijuego fuera de vista y disminuyen los layouts del scroll horizontal. Se conservan la composición, familias tipográficas, paleta, textos, enlaces, recorte y reveal angular de la foto, animaciones de scroll, navegación y reglas del juego.

El objetivo de 90 puntos se cumple en las tres corridas finales. El objetivo orientativo LCP ≤2,5 s se cumple en la prueba observada con CDP, pero todavía no en el modelo estándar de Lighthouse. TBT sigue siendo un punto a vigilar. El próximo trabajo útil es validar la entrega real de Cloudflare y perfilar la inicialización de ScrollTrigger en dispositivos físicos antes de introducir más diferimiento o complejidad.
