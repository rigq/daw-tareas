<!-- archivos:
P1.pdf
PRESENTACION  CS DIGITECH 26-27.pptx
TEMA 0 CS DIGITECH 26-27.pptx
-->
# Ciberseguridad — Resumen

> Contenido de la 1ª evaluación: la **terminología del Tema 1** (activos, vulnerabilidades, amenazas, riesgo, ataque, impacto) y los **datos clave del informe Unit42** de la Práctica 0. El profesor **resta puntos por faltas de ortografía**: −0,1 por cada tilde y −0,2 por cualquier otra falta, hasta −1 en el examen.

## Cómo se evalúa
- **Prueba escrita: mínimo un 5** para poder hacer media con las prácticas.
- **Prácticas: todas obligatorias**, con una **media de al menos 4**.
  - Si no entregas alguna, **no te evalúa**.
  - Cada práctica tiene una fecha límite y una fecha tope posterior; entregar tarde o en un formato incorrecto puede costar hasta 1 punto.
- **Actitud**: se parte de 10 puntos por trimestre y se van restando (es subjetiva y no se puede reclamar).
- **1ª y 2ª evaluación**:
  - aprobarlas **libera materia** para la ordinaria;
  - no hay recuperación parcial, pero puedes volver a presentarte en la ordinaria para subir nota y se queda la más alta.
- **Extraordinaria**: hay que sacar un 5, la **nota máxima es un 5** y las prácticas hay que entregarlas igualmente.
- **Faltas**: con un **20 % de faltas sin justificar** pierdes el examen de esa evaluación. Los justificantes se entregan en un máximo de 7 días.

## Tema 1 · Terminología (lo que más cae)

### Activos
Son los recursos TIC de la empresa que hay que proteger:

| Tipo | Ejemplos |
|---|---|
| **De información** | Datos de bases de datos, código, registros de clientes, contratos, manuales |
| **De software** | Aplicaciones, sistemas operativos, programas a medida, herramientas de desarrollo |
| **Físicos** | Servidores, portátiles, móviles, equipos de red, almacenamiento, instalaciones |
| **Personal** | Directivos, proveedores, contratistas |
| **Servicios** | Nube, proveedores de Internet, electricidad, climatización |

**Directrices sobre activos:**
- inventario (de lo tangible y lo intangible) y un **propietario** para cada uno;
- uso aceptable;
- **clasificación** de la información según su **valor, criticidad y sensibilidad**, con etiquetado y procedimientos de manipulación;
- devolución de activos;
- gestión de soportes (transporte y **borrado seguro**).

### Vulnerabilidad
- Es un **fallo o debilidad** en el diseño, la implementación, la configuración o la gestión de un sistema, que un atacante puede aprovechar.
- Pone en peligro la **confidencialidad, la integridad o la disponibilidad** (la **tríada CIA**).
- **CVE** (*Common Vulnerabilities and Exposures*): catálogo público que mantiene **MITRE**, con identificadores del tipo **CVE-AAAA-NNNNN**.
- **CCE** (*Common Configuration Enumeration*): catálogo de fallos **de configuración**.

### Amenaza
- Es cualquier circunstancia, evento o acción que **puede causar daño aprovechando una vulnerabilidad**.
- Puede ser **intencionada, accidental o físico-ambiental**, y de origen **externo o interno**. Las internas suelen ser más peligrosas, porque el atacante ya tiene acceso y conoce el sistema.
- La **ISO 27001** recomienda la **defensa en profundidad**: **mínimo privilegio**, acciones supervisadas y acuerdos de confidencialidad.

### Riesgo y ataque
- **Riesgo**: la **probabilidad** de que una amenaza se materialice aprovechando una vulnerabilidad. Es el **eje de la ISO/IEC 27001**.
- **Ataque**: un riesgo con probabilidad del 100 %, es decir, un **riesgo materializado**. Un ataque es un **incidente de seguridad**.
- **El sistema 100 % seguro no existe.**
- **Gestión de riesgos**: primero se **evalúan** (identificar, medir la probabilidad y estimar el impacto) y después se **tratan** de una de estas formas:
  - **Mitigar**: aplicar controles que reduzcan el riesgo.
  - **Transferir**: pasar el riesgo a otro, por ejemplo con un seguro.
  - **Aceptar**: asumirlo conscientemente.
  - **Evitar**: eliminar la actividad que lo genera.
- **Gestión de ataques**: herramientas de detección (**SIEM, IDS, IPS**) → **contención y respuesta** con procedimientos documentados → **recuperación** con el **BCP** (plan de continuidad del negocio) y el **DRP** (plan de recuperación ante desastres) → **mejora continua**.

### Impacto
- Es la **consecuencia, el coste o el daño** que sufre la organización cuando el incidente se materializa (impacto alto, bajo…).
- **Fórmula clave: Riesgo = Amenaza × Vulnerabilidad × Impacto.**
- **Tipos de impacto**:
  - **en la confidencialidad**: filtraciones o robo de información;
  - **en la integridad**: datos manipulados;
  - **en la disponibilidad**: servicios caídos, por ejemplo por un **DDoS**;
  - **económico**: recuperación, demandas, multas;
  - **reputacional**: pérdida de confianza;
  - **operativo**: recursos gastados en gestionar el incidente;
  - **normativo**: sanciones por el **RGPD** (GDPR);
  - **acumulado**: efecto en cadena, como un malware que se propaga.

### Ejercicio P1 (reflexión en clase)
Tratarte a ti mismo como una empresa e identificar tus activos, sus vulnerabilidades, las amenazas, el riesgo y el impacto.
Ejemplo: el **móvil** es un activo. Una vulnerabilidad es que se puede estropear o que te lo roben. Una amenaza es dejarlo de noche junto a la ventana y que el cambio de temperatura lo dañe. El riesgo es bajo en casa y alto si estás de acampada.

## Informe Unit42 2026 (Práctica 0): los datos clave
- **Las 4 tendencias**:
  1. **La IA multiplica la fuerza de los atacantes**: comprime todo el ciclo del ataque.
  2. **La identidad es la vía más fiable para atacar**: tuvo un papel en casi el 90 % de las investigaciones.
  3. **La cadena de suministro de software** va más allá del código vulnerable: los atacantes abusan de las integraciones SaaS, las herramientas de proveedores y las dependencias.
  4. **Los actores estatales** adaptan el sigilo y la persistencia a las empresas modernas (empleos falsos, identidades sintéticas, ataques a la virtualización).
- **Velocidad**: el **25 % de intrusiones más rápidas exfiltró datos en 72 minutos en 2025**, frente a **285 minutos en 2024** (casi cuatro veces más rápido). Los incidentes con exfiltración en menos de una hora pasaron del 19 % al 22 %.
- **La identidad es el nuevo perímetro**: con SaaS, la nube y entornos híbridos, el perímetro de red importa menos. El **65 % de los accesos iniciales usa técnicas de identidad**. En el análisis de **más de 680.000 identidades en la nube**, el **99 % tenía permisos excesivos** (algunos sin usar en 60 días o más).
- **Vectores de acceso inicial**:
  - **Phishing (22 %) y explotación de vulnerabilidades (22 %) empatan** como los más frecuentes.
  - En las **grandes empresas**, las vulnerabilidades llegan al **26 %** y el phishing baja al **17 %**. Tienen mejor filtrado del correo y más concienciación, pero también entornos grandes con sistemas heredados y parches desiguales.
- **Ransomware y extorsión**: el **cifrado bajó al 78 %** de los casos de extorsión (antes era el 90 % o más). Los atacantes ven el cifrado como **opcional** y apuestan por el **robo de datos y la extorsión**. El **41 % de las víctimas restauró desde copias de seguridad sin pagar**, pero en el **26 % de los casos los atacantes afectaron a las copias**.
- **Cadena de suministro**: **más del 60 % de las vulnerabilidades** en aplicaciones nativas de la nube están en **dependencias transitivas** (indirectas). Los atacantes **inyectan paquetes maliciosos** (por ejemplo, en npm) que se ejecutan durante la **instalación o la compilación**, así que comprometen los pipelines **antes del despliegue** y eluden la detección en tiempo de ejecución.
- **Otros datos**: el **87 %** de las intrusiones usó **varias superficies de ataque**; el **48 %** pasó por el **navegador**; en **más del 90 %** de las brechas influyeron fallos evitables (poca visibilidad, controles incoherentes, exceso de confianza). Las defensas recomendadas son **confianza cero**, reforzar la **IAM** y un **SOC** con la respuesta automatizada.

## Lo más importante para el examen
1. **Definir y distinguir** activo, vulnerabilidad, amenaza, riesgo, ataque e impacto, con un ejemplo de cada uno.
2. **Riesgo = Amenaza × Vulnerabilidad × Impacto**; el sistema 100 % seguro no existe.
3. Las **4 formas de tratar un riesgo**: mitigar, transferir, aceptar y evitar.
4. La **tríada CIA** y los tipos de impacto.
5. **CVE** (MITRE, CVE-AAAA-NNNNN) frente a **CCE**; **ISO 27001**, defensa en profundidad y mínimo privilegio.
6. Las **cifras de Unit42**: 72 frente a 285 minutos, 65 %, 99 %, 22 % y 22 %, 78 %, 41 % y 26 %, más del 60 % en dependencias transitivas.
7. **Cuidado con la ortografía**: cada tilde resta 0,1 puntos.
