<!-- archivos:
CFGS FP - DAW - 001 - Guía - Despliegue de aplicaciones web.pdf
Cursos CISCO.md
DigitechFP - Criterio calificativo.pdf
Xampp - Apache y MySQL - Solución de errores.pdf
-->
# Despliegue de aplicaciones web — Resumen

> En el campus solo hay de momento la **guía** de la asignatura (6 RA) y la **solución de errores de XAMPP**. Aquí tienes los conceptos clave de cada bloque, para llegar preparado, y la chuleta de XAMPP, que te sirve ya para Servidor.
> Stack del curso: **Ubuntu Server + Apache + Nginx + Docker/Compose + Tomcat o Payara/WildFly + FTP/SFTP + DNS + OpenLDAP + Git/GitHub + GitHub Actions**.

## Cómo se evalúa (mismo profesor y mismo criterio que Interfaces)
- **Examen 60 %**, presentaciones 20 % y proyectos o ejercicios 20 %, en cada trimestre (cada trimestre vale el 33 %).
- Todo es obligatorio; **una entrega tarde tiene como nota máxima un 5**.

## RA1 · Arquitecturas web
- **Cliente-servidor**; arquitectura de **2 capas** (cliente y servidor) o de **3 capas** (presentación, lógica y datos); aplicaciones monolíticas frente a distribuidas o basadas en servicios.
- **Flujo de una petición**: URL → DNS → IP:puerto → conexión TCP (TLS si es HTTPS) → petición HTTP → servidor web o de aplicaciones → base de datos → respuesta.
- **HTTP**:
  - **Métodos**: GET, POST, PUT, PATCH, DELETE.
  - **Cabeceras**: `Host`, `Content-Type`, `Cookie`…
  - **Códigos de estado**: **2xx** éxito (200 OK, 201 Created) · **3xx** redirección (301, 302, 304) · **4xx** error del cliente (400, 401 no autenticado, 403 prohibido, 404 no encontrado) · **5xx** error del servidor (500, 502 Bad Gateway, 503).
- **Puertos que hay que saberse**: HTTP 80 · HTTPS 443 · FTP 21 (control) y 20 (datos) · SSH/SFTP 22 · DNS 53 · MySQL 3306 · Tomcat 8080 · LDAP 389 (LDAPS 636).
- **Servidor web** (contenido estático y proxy: Apache, Nginx) frente a **servidor de aplicaciones** (ejecuta la lógica: Tomcat, Payara, WildFly).
- **Virtualización**: el **hipervisor** ejecuta máquinas virtuales, cada una con su propio sistema operativo. Un **contenedor** comparte el núcleo del anfitrión, así que es más ligero y arranca en segundos. Una **imagen** es la plantilla; un **contenedor** es una imagen en ejecución.
- **Nube**: IaaS (te dan la infraestructura), PaaS (la plataforma) y SaaS (el software terminado).
- **Entornos**: desarrollo → pruebas → preproducción → producción.

## Docker (lo práctico)
```bash
docker run -d --name web -p 8080:80 -v ./html:/usr/share/nginx/html nginx   # puerto anfitrión:contenedor, volumen
docker ps            # contenedores en marcha
docker images        # imágenes descargadas
docker logs web      # registro del contenedor
docker exec -it web bash   # entrar dentro del contenedor
docker stop web && docker rm web
docker compose up -d       # levantar varios servicios definidos en docker-compose.yml
```
```dockerfile
FROM php:8.3-apache
COPY . /var/www/html/
EXPOSE 80
```
- **Volúmenes**: datos persistentes (por ejemplo, la base de datos). **Variables de entorno**: configuración (`-e MYSQL_ROOT_PASSWORD=…`).

## RA2 · Servidor web (Apache y Nginx)
- **Apache**:
  - configuración en `apache2.conf` / `httpd.conf`; los sitios en `sites-available` y se activan con `a2ensite`;
  - **`DocumentRoot`** es la carpeta que se publica;
  - módulos: `a2enmod ssl rewrite headers proxy`;
  - gestionar el servicio: `systemctl start|stop|restart|status apache2`.
- **Virtual Hosts** (varias webs en un servidor), basados en nombre:
```apache
<VirtualHost *:80>
  ServerName tienda.local
  DocumentRoot /var/www/tienda
  ErrorLog ${APACHE_LOG_DIR}/tienda_error.log
  CustomLog ${APACHE_LOG_DIR}/tienda_access.log combined
</VirtualHost>
```
- **Autenticación** (quién eres) frente a **autorización** (qué puedes hacer). Permisos del sistema de archivos: usuario `www-data`, `chmod`, `chown`.
- **HTTPS y TLS**: un **certificado digital** firmado por una **CA** (autoridad certificadora) frente a uno **autofirmado** (que el navegador avisa como no seguro). En la práctica, **Let's Encrypt / Certbot**.
- **Proxy inverso**: Apache o Nginx atienden delante y reenvían al backend (Node, Tomcat…): Internet → Nginx → Tomcat → base de datos.
- **Logs**: `access.log` (peticiones) y `error.log` (errores). También rotación de logs y herramientas de centralización como ELK o Grafana/Loki.

## RA3 · Servidores de aplicaciones
- **Tomcat, Payara, WildFly** (Java/Jakarta EE). Se despliegan **artefactos**, por ejemplo un **WAR**, en un **contexto** (`/miapp`).
- Recursos: conexiones a la base de datos y **pools de conexiones**, sesiones, usuarios, roles y *realms* de seguridad.
- Despliegue, redespliegue y retirada; pruebas de carga básicas y diagnóstico con los logs.

## RA4 · Transferencia de archivos
- **FTP**: puerto **21** para el control y **20** para los datos (en modo activo).
  - **Activo**: el servidor abre la conexión de datos hacia el cliente, lo que da problemas con NAT y cortafuegos.
  - **Pasivo**: el cliente abre ambas conexiones; es el modo habitual.
- Usuarios locales, **anónimos** y en grupos; directorios, permisos y cuotas.
- **FTPS** = FTP sobre TLS. **SFTP = transferencia de archivos sobre SSH** (puerto 22), **no** es "FTP cifrado".
- Clientes: `ftp`/`lftp` por línea de comandos; **FileZilla** y **WinSCP** con interfaz gráfica.

## RA5 · DNS y LDAP
- **Resolución**: resolver local → servidor recursivo → **raíz** → **TLD** (.es, .com) → **autoritativo**, con **caché** en cada paso.
- **Registros DNS**:

| Registro | Para qué |
|---|---|
| **A** | Nombre → IPv4 |
| **AAAA** | Nombre → IPv6 |
| **CNAME** | Alias de otro nombre |
| **MX** | Servidor de correo |
| **NS** | Servidores de nombres de la zona |
| **TXT** | Texto (SPF, verificaciones) |
| **SOA** | Datos de la zona |
| **TTL** | Tiempo que dura en caché |

- Diagnóstico: `nslookup`, `dig`, `host`.
- **LDAP**: un directorio jerárquico (el árbol **DIT**). Cada entrada tiene un **DN** (*Distinguished Name*, por ejemplo `uid=ana,ou=alumnos,dc=daw,dc=local`) y atributos. Sirve para la **autenticación centralizada** de usuarios y grupos. Implementación de referencia: OpenLDAP.

## RA6 · Documentación, Git y CI/CD
- **Documentación**: técnica, de usuario, de instalación y de despliegue; en formatos Markdown (README), HTML o PDF.
- **Git**: *working directory* → **staging** (`git add`) → **commit**.

```bash
git init | git clone URL | git status | git add . | git commit -m "msg" | git log | git diff
git remote add origin URL | git push | git pull | git fetch
git switch -c rama | git merge rama   # ramas; si hay conflicto, se edita el archivo y se hace commit
git tag v1.0
```
- **Trabajo en equipo**: ramas de características, **Pull Requests** y revisión de código.
- **Seguridad**: **nunca** subas contraseñas, claves de API ni archivos `.env` al repositorio. Usa `.gitignore`, tokens o SSH, y los *secrets* del servicio de CI.
- **CI/CD**: un **pipeline** con las fases Commit → **Build** → **Test** → **Deploy**, que se dispara con cada push. Herramientas: GitHub Actions, GitLab CI, Jenkins.

```yaml
# .github/workflows/ci.yml
on: push
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npm test
```

## Chuleta XAMPP (errores frecuentes)
| Problema | Solución |
|---|---|
| **Apache no arranca** (el puerto 80 o 443 está ocupado) | En `httpd.conf`: `Listen 8080` y `ServerName localhost:8080`. En `httpd-ssl.conf`: `Listen 4430`. Entra por `http://localhost:8080/dashboard/` |
| **MySQL no arranca** (motor Aria corrupto) | Copia de seguridad de `mysql\data`, borra `aria_log.*`, ejecuta `.\aria_chk.exe -r ..\data\mysql\plugin.MAI` en `mysql\bin` como administrador y, si sigue fallando, restaura desde `mysql\backup` |
| **MySQL no arranca** (puerto ocupado) | En `my.ini`, cambia 3306 por **3308** (y luego en PHP conecta con `mysqli_connect("localhost:3308", …)`) |
| **phpMyAdmin no entra** | En `phpMyAdmin\config.inc.php`, pon el `user` y el `password` correctos. Si no sabes la contraseña: `mysql -u root`, después `ALTER USER 'root'@'localhost' IDENTIFIED BY '…'; FLUSH PRIVILEGES;` |

## Lo más importante para el examen
1. Diferencias entre **servidor web y de aplicaciones**, **máquina virtual y contenedor**, **imagen y contenedor**, y **IaaS, PaaS y SaaS**.
2. **HTTP**: métodos, familias de códigos de estado y puertos estándar.
3. **Virtual Hosts** y `DocumentRoot`; HTTPS con certificados (CA o autofirmado).
4. **FTP activo y pasivo**; **SFTP va sobre SSH**.
5. **Tipos de registro DNS** y orden de la resolución.
6. **Flujo de Git** y fases de un pipeline de CI/CD; no subir nunca secretos al repositorio.
