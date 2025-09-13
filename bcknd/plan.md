# Plan de Implementación para Autenticación de Usuario con Supabase y JWT

## Estado Actual
- Creada tabla de usuarios con email, password_hash, role y timestamps
- Dependencias existentes: dotenv, express, nodemon
- Documentados paquetes requeridos: @supabase/supabase-js, jsonwebtoken, bcryptjs

## Paquetes Requeridos a Instalar

### Cliente Supabase
```bash
npm install @supabase/supabase-js
```

### Biblioteca JWT
```bash
npm install jsonwebtoken
```

### bcrypt para Hash de Contraseñas (Alternativa a pgcrypto)
```bash
npm install bcryptjs
```

## Pasos de Implementación

1. ✅ Diseñar estructura de tabla de usuario con columna de rol y manejo adecuado de contraseñas
2. ✅ Crear migración de tabla de usuario con email, password_hash, role y otros campos necesarios
3. ✅ Instalar paquetes requeridos de Supabase y JWT en la aplicación Node.js
4. ✅ Crear endpoint de registro de usuario con hash de contraseñas usando pgcrypto
5. ✅ Crear endpoint de inicio de sesión de usuario con generación de token JWT
6. ✅ Implementar middleware de autenticación JWT para protección de rutas
7. [-] Crear middleware isAdmin para operaciones solo de administradores
8. [ ] Agregar autenticación a rutas existentes según sea necesario
9. [ ] Probar toda la funcionalidad de autenticación y autorización

## Plan de Implementación de Server.js

El archivo server.js actual necesita ser expandido para incluir:

1. Inicialización de cliente Supabase usando variables de entorno
2. Configuración de secreto JWT
3. Middleware para parsear solicitudes JSON
4. Endpoint de registro de usuario (`POST /register`)
5. Endpoint de inicio de sesión de usuario (`POST /login`)
6. Middleware de autenticación JWT
7. Middleware isAdmin
8. Rutas protegidas que requieren autenticación

### Endpoint de Registro de Usuario
- Aceptar email y contraseña en el cuerpo de la solicitud
- Validar formato de email y fortaleza de contraseña
- Hashear contraseña usando bcrypt (como alternativa a pgcrypto para implementación Node.js)
- Insertar usuario en tabla de usuarios de Supabase con 'user' como rol por defecto
- Retornar mensaje de éxito o error apropiado

### Endpoint de Inicio de Sesión de Usuario
- Aceptar email y contraseña en el cuerpo de la solicitud
- Validar formato de email
- Consultar tabla de usuarios de Supabase para usuario con email coincidente
- Comparar contraseña proporcionada con hash almacenado usando bcrypt
- Si es válido, generar token JWT conteniendo ID de usuario y rol
- Retornar token al cliente para uso en solicitudes subsiguientes

### Middleware de Autenticación JWT
- Extraer token JWT del header de Authorization
- Verificar token usando secreto JWT
- Si es válido, adjuntar información de usuario (ID, rol) al objeto de solicitud
- Si es inválido o faltante, retornar error 401 No Autorizado
- Usado para proteger rutas que requieren autenticación

### Middleware isAdmin
- Debe ser usado después del middleware de autenticación JWT
- Verificar si el usuario autenticado tiene rol 'admin'
- Si sí, permitir que la solicitud proceda
- Si no, retornar error 403 Prohibido
- Puede aplicarse a rutas que requieren privilegios de administrador (ej. operaciones DELETE)

### Agregar Autenticación a Rutas Existentes
- Identificar cuáles rutas existentes necesitan protección
- Aplicar middleware de autenticación JWT a rutas que deberían ser accesibles solo para usuarios autenticados
- Aplicar middleware isAdmin a rutas que deberían ser accesibles solo para usuarios administradores (ej. operaciones DELETE)
- Considerar cuáles rutas deberían permanecer públicas (ej. página de inicio, registro, inicio de sesión)

### Plan de Pruebas
- Probar registro de usuario con datos válidos e inválidos
- Probar inicio de sesión con credenciales correctas e incorrectas
- Probar generación y verificación de tokens JWT
- Probar middleware de autenticación JWT con tokens válidos e inválidos
- Probar middleware isAdmin con usuarios administradores y no administradores
- Probar rutas protegidas con y sin autenticación
- Probar rutas solo de administradores con y sin privilegios de administrador
- Probar casos límite y manejo de errores

### Variables de Entorno Necesarias
- SUPABASE_URL (del .env existente)
- SUPABASE_ANON_KEY (del .env existente)
- JWT_SECRET (nuevo - a agregar al .env)