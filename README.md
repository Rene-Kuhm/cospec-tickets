# COSPEC — Sistema de Reclamos Técnicos

## Levantar el sistema

```bash
cd ~/cospec-tickets
docker compose up --build -d
```

Esperá ~1-2 minutos la primera vez para que builds.

- **App web:** http://localhost
- **Evolution API (WhatsApp):** http://localhost:8080

---

## Usuarios por defecto (password: `cospec123`)

| Usuario       | Rol         |
|---------------|-------------|
| `admin`       | Admin       |
| `secretaria1` | Secretaria  |
| `secretaria2` | Secretaria  |
| `tecnico1`    | Técnico     |
| `tecnico2`    | Técnico     |
| `tecnico3`    | Técnico     |
| `tecnico4`    | Técnico     |

---

## Configurar WhatsApp

1. Abrir http://localhost:8080/manager
2. Crear instancia llamada `cospec`
3. Escanear QR con el celular que va a mandar los mensajes
4. En el admin, cargar el número de WhatsApp de cada técnico (formato: `5493511234567`)

---

## Ver logs

```bash
docker compose logs -f backend
docker compose logs -f frontend
```

## Detener

```bash
docker compose down
```
