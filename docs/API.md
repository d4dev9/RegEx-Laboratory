# API

Endpoints REST de RegexLab. Todos viven bajo `/api` y responden en JSON.

La autenticación se hace con una cookie de sesión `HttpOnly`. El token de
acceso nunca está en el HTML ni llega al JavaScript del cliente, y el navegador
nunca contacta con el servicio de autenticación: todo pasa por este origen.

---

## Sesión y cuenta

| Ruta | Método | Qué hace |
| --- | --- | --- |
| `/api/auth` | `GET` | Devuelve la sesión actual: `{ "user": null }` si no hay sesión, o el usuario |
| `/api/auth` | `POST` | Inicia el flujo OAuth o intercambia el código de callback |
| `/api/auth` | `DELETE` | Cierra la sesión y revoca el token de renovación |
| `/api/account` | `GET` | Devuelve los datos de la cuenta |
| `/api/account` | `PATCH` | Actualiza el alias visible de la cuenta |
| `/api/account` | `DELETE` | Borra la cuenta: la fila de la base de datos y la identidad de autenticación |

Borrar la cuenta elimina **las dos** cosas. Borrar solo la fila dejaría un token
vivo que recrearía la cuenta en la siguiente petición.

---

## Patrones

| Ruta | Método | Qué hace |
| --- | --- | --- |
| `/api/patterns` | `GET` | Lista los patrones guardados de la cuenta, con búsqueda y orden |
| `/api/patterns` | `POST` | Crea un patrón guardado |
| `/api/patterns/[id]` | `GET` | Devuelve un patrón guardado. Solo su propietario: para el resto, `404` |
| `/api/patterns/[id]` | `PATCH` | Actualiza nombre, modificadores, etiquetas, visibilidad o el texto compartido |
| `/api/patterns/[id]` | `DELETE` | Borra el patrón y sus casos de prueba |
| `/api/test-cases` | `POST` | Añade casos de prueba a un patrón |
| `/api/public/patterns/[id]` | `GET` | Lectura anónima de un patrón publicado, con su texto compartido si lo tiene |

Un patrón es visible para el público cuando está marcado como público. El texto
de ejemplo se publica solo si su autor lo marca como tal, y un patrón que deja
de ser público deja de arrastrarlo.

---

## Público

| Ruta | Método | Qué hace |
| --- | --- | --- |
| `/api/starter-patterns` | `GET` | La biblioteca pública de 21 patrones, con caché |
| `/api/explain` | `POST` | Tokeniza, explica y exporta un patrón **sin ejecutarlo nunca** |
| `/api/health` | `GET` | Sonda de disponibilidad: `{ "status": "ok", "db": "reachable" }` |

`/api/explain` es la única forma de analizar un patrón en el servidor, y no
llega a ejecutar la expresión: solo la analiza. Por eso puede usarse para
patrones que el navegador no ejecutaría.

---

## Errores

| Código | Cuándo |
| --- | --- |
| `400` | Los datos no superaron la validación |
| `401` | Falta la sesión o no es válida |
| `403` | La petición está autenticada pero no permitida, por ejemplo un origen no autorizado |
| `404` | El recurso no existe **o** no es tuyo. No se distingue entre los dos casos |
| `413` | El cuerpo de la petición supera el límite permitido |
| `429` | Se ha superado el límite de peticiones o la cuota de la cuenta |
| `500` | Error interno del servidor |
