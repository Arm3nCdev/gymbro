# 🏋️‍♂️ GymBro — Sistema Integral de Gestión para Gimnasios & Centros de Fitness

**GymBro** es una plataforma web y aplicación progresiva (PWA) moderna, rápida y diseñada específicamente para la gestión operativa, comercial y deportiva de gimnasios. Conecta en tiempo real la administración del gimnasio, los entrenadores y los alumnos desde cualquier dispositivo (PC de recepción, notebooks, tablets y celulares iOS/Android).

---

## 📌 Tabla de Contenidos
1. [Características Principales](#-características-principales)
2. [Estructura de Portales & Accesos](#-estructura-de-portales--accesos)
3. [Reglas de Negocio Implementadas](#-reglas-de-negocio-implementadas)
4. [Privacidad y Seguridad entre Profesores](#-privacidad-y-seguridad-entre-profesores)
5. [Autenticación Independiente (Sin Pantallas de Google)](#-autenticación-independiente-sin-pantallas-de-google)
6. [Sincronización & Estabilidad Móvil (iPhone/Safari)](#-sincronización--estabilidad-móvil-iphonesafari)
7. [Despliegue en Producción & Dominio Propio](#-despliegue-en-producción--dominio-propio)
8. [Stack Tecnológico](#-stack-tecnológico)
9. [Instalación y Uso en Desarrollo](#-instalación-y-uso-en-desarrollo)

---

## 🚀 Características Principales

- **Multi-Portal Aislado:** Vistas independientes para el Dueño, los Entrenadores y los Alumnos.
- **Relación Dinámica 1 a N:** Asignación de múltiples alumnos por profesor según su especialidad y turno (Mañana, Tarde o Noche).
- **Desglose de Membresías & Cuotas:**
  - Acceso libre por cuenta propia (pase diario o cuota mensual básica).
  - Plus de entrenamiento personalizado adicional según el profesor y turno asignado.
- **Editor de Rutinas Semanal Interactivo:** Rutinas de lunes a sábado con biblioteca de ejercicios por grupo muscular (Pecho, Espalda, Piernas, Hombros, Brazos, Core y Cardio), series, repeticiones, peso en kg, descansos y notas.
- **Control de Asistencia & Cumpleaños:** Detección de rachas, días de ausencia y cálculo automático de edad y cumpleaños con avisos visuales.
- **Avisos de Cobro y Bromas de Ausencia:** Notificaciones divertidas mediante la mascota GymBro para motivar a los alumnos que faltan a entrenar.
- **Generador de QR y Enlaces Dinámicos:** Módulo interactivo para descargar o compartir códigos QR para mostradores de recepción y WhatsApp.

---

## 🌐 Estructura de Portales & Accesos

Los accesos están estructurados mediante **Hash Routing** para garantizar funcionamiento inmediato sin caídas ni errores de servidor:

| Portal | Ruta Recomendada | Ruta Directa | Función | Credenciales por Defecto |
| :--- | :--- | :--- | :--- | :--- |
| 👑 **Dueño / Administración** | `/#/dueno` | `/dueno` | Control de caja, socios, asignaciones, finanzas y configuración | **Usuario:** `rony`<br>**Clave:** `123` |
| 🏋️‍♂️ **Entrenadores / Profesores** | `/#/coach` | `/coach` | Rutinas semanales, atletas asignados y seguimiento de peso | Registro propio o creado por el dueño |
| 📱 **Alumnos / Socios** | `/#/alumno` | `/alumno` | Rutina diaria, pagos, progreso de peso y mensajes | Registro mediante QR o por el gimnasio |

---

## 💼 Reglas de Negocio Implementadas

### 1. Relación 1 a N de Profesor a Alumnos
- Un entrenador puede tener a su cargo una cantidad variable de atletas (por ejemplo, Profe Marcelo con 3 alumnos en el turno mañana, y Profe Nico con 5 o más alumnos).
- Los entrenadores visualizan claramente el turno (Mañana, Tarde, Noche) y el horario pactado con cada uno de sus alumnos.

### 2. Membresía Base vs. Entrenamiento Personalizado
- **Entrenamiento por cuenta propia (Libre):** El alumno abona únicamente la cuota base del gimnasio (ej. ₲ 180.000 mensual o ₲ 15.000 pase diario) y entrena de forma autónoma.
- **Entrenamiento Personalizado:** Se desglosa en el recibo y en la pantalla del alumno:  
  $$\text{Cuota Total} = \text{Membresía Base del Gimnasio} + \text{Plus de Personalización del Profesor}$$

---

## 🔒 Privacidad y Seguridad entre Profesores

Se implementó una regla de aislamiento estricto a nivel de código (`TrainerPortal.tsx`):
- **Aislamiento de Rutinas:** El **Profesor A no puede ver ni modificar** los ejercicios ni el plan de entrenamiento asignado por el **Profesor B**.
- **Filtrado de Atletas:** Cada entrenador solo tiene acceso en su lista de alumnos, en su editor de rutinas y en el panel de peso a los socios que tiene formalmente asignados.
- Se eliminaron listas globales compartidas entre entrenadores para garantizar la confidencialidad de la metodología de cada preparador físico.

---

## 🔑 Autenticación Independiente (Sin Pantallas de Google)

- El sistema cuenta con autenticación y base de datos **100% interna e independiente de Google Cloud / Google AI Studio**.
- Los clientes y socios no requieren cuenta de Google ni reciben pantallas de verificación externa.
- Se limpiaron todos los usuarios y atletas de prueba ficticios, dejando el sistema limpio para producción con **Rony** como Administrador.
- El botón de **"Guía de entrega al cliente"** está restringido y **solo es visible para el Dueño** en su pantalla de inicio.

---

## 📱 Sincronización & Estabilidad Móvil (iPhone/Safari)

Se realizaron optimizaciones críticas para evitar que el sistema se pause o muestre errores en teléfonos móviles:
1. **Prevención de Error 404 en iOS:**
   - Incorporación de `vercel.json` con reglas de reescritura (`rewrites` hacia `/index.html`).
   - Uso prioritario de enlaces con Hash (`/#/dueno`, `/#/coach`, `/#/alumno`) para que el navegador Safari cargue la aplicación de forma instantánea.
2. **Eliminación de Congelamientos ("Servidor Pausado"):**
   - Implementación de `AbortController` con corte a los 2.8 segundos en las peticiones a la API. Si el servidor entra en reposo, la aplicación cambia de inmediato a **modo offline-first local (`localStorage`)** sin congelar la pantalla.
   - Ciclo de sincronización optimizado a 8 segundos para ahorrar memoria y batería en smartphones.

---

## 🌍 Despliegue en Producción & Dominio Propio

### Despliegue en Vercel
1. Conectar el repositorio en [Vercel](https://vercel.com).
2. Asegurar que el archivo `vercel.json` esté en la raíz del proyecto.
3. Compartir las URLs con `#` para entrega inmediata a los clientes.

### Uso con Dominio Propio (ej. `local.net.py` o `.com.py`)
- Al asociar un dominio personalizado en el panel de Vercel (*Settings > Domains*):
  - Las pantallas de carga de AI Studio **desaparecen por completo**.
  - En el modal de **Accesos y QR** de la aplicación, el dueño puede escribir su dominio propio (`local.net.py`) para que todos los códigos QR y enlaces para imprimir se generen automáticamente con su propia marca.

### Servidor 24/7 Continuo (Para Base de Datos Centralizada)
Para instalaciones donde se requiera que la computadora de recepción y los celulares de los entrenadores compartan la misma base de datos en tiempo real continuo, se recomienda desplegar el proyecto en **Render.com** o **Railway.app** mediante `"npm start"`, permitiendo que el servidor Node.js (`server.ts`) se mantenga activo 24/7 sin pausas.

---

## 🛠️ Stack Tecnológico

- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS v4, Lucide React, Motion.
- **Backend & Almacenamiento:** Express, Node.js, `gym_database.json` persistente y almacenamiento local `localStorage` offline-first.
- **Utilidades:** QRCode (`qrcode`), Canvas Confetti, PWA Service Worker.

---

## 💻 Instalación y Uso en Desarrollo

### 1. Clonar e Instalar Dependencias
```bash
npm install
```

### 2. Iniciar Servidor de Desarrollo
```bash
npm run dev
```
La aplicación iniciará en `http://localhost:3000`.

### 3. Compilar para Producción
```bash
npm run build
```

### 4. Ejecutar Servidor en Producción
```bash
npm start
```
