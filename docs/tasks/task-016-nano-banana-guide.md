# 🍌 Nano Banana Pro - Guía Práctica

> Generación y edición de imágenes con Gemini 3 Pro Image via OpenClaw.

## Setup

- **Requisitos:** `uv` (Python package runner), `GEMINI_API_KEY`
- **Script:** `{baseDir}/scripts/generate_image.py` (skill path de OpenClaw)
- **Modelo:** `gemini-3-pro-image-preview`

## Comandos Básicos

### Generar imagen desde cero

```bash
uv run {baseDir}/scripts/generate_image.py \
  --prompt "descripción detallada" \
  --filename "2026-02-18-output.png" \
  --resolution 1K
```

### Editar una imagen existente

```bash
uv run {baseDir}/scripts/generate_image.py \
  --prompt "instrucciones de edición" \
  --filename "output.png" \
  -i "/path/to/input.png" \
  --resolution 2K
```

### Composición multi-imagen (hasta 14 imágenes)

```bash
uv run {baseDir}/scripts/generate_image.py \
  --prompt "combine these into a collage" \
  --filename "output.png" \
  -i img1.png -i img2.png -i img3.png
```

## Parámetros

| Param | Short | Descripción |
|-------|-------|-------------|
| `--prompt` | `-p` | Prompt de texto (requerido) |
| `--filename` | `-f` | Archivo de salida PNG (requerido) |
| `--input-image` | `-i` | Imagen(es) de entrada para edición (repetible, max 14) |
| `--resolution` | `-r` | `1K` (default), `2K`, `4K` |
| `--api-key` | `-k` | API key (override de env var) |

**Auto-resolución:** Si pasás imágenes de entrada y no especificás resolución, el script detecta automáticamente basado en la dimensión más grande del input.

## Guía de Prompts Efectivos

### Para generación

- **Sé específico:** "A golden retriever sitting on a red couch in a sunlit living room, photorealistic" > "a dog"
- **Incluí estilo:** "watercolor painting of...", "3D render of...", "minimalist flat illustration of..."
- **Mencioná iluminación:** "soft morning light", "dramatic backlight", "studio lighting"
- **Composición:** "close-up", "bird's eye view", "centered", "rule of thirds"

### Para edición

- **Sé directo:** "Change the sky to sunset colors"
- **Referí elementos:** "Remove the person on the left", "Make the car red instead of blue"
- **Preservá contexto:** "Keep everything the same but add snow on the ground"

## Casos de Uso

### Social Media
```bash
# Instagram post
--prompt "Minimalist product photo of a coffee cup on marble surface, warm tones, Instagram aesthetic" --resolution 2K

# Twitter/X header
--prompt "Abstract gradient background in brand colors blue and purple, wide format" --resolution 2K
```

### Presentaciones
```bash
# Slide background
--prompt "Clean corporate background with subtle geometric patterns, light blue, professional" --resolution 2K

# Concept illustration
--prompt "Isometric illustration of a cloud computing infrastructure, modern flat style" --resolution 1K
```

### Mockups y Prototipos
```bash
# UI mockup
--prompt "Mobile app screenshot showing a food delivery interface, modern Material Design" --resolution 2K

# Logo concept
--prompt "Minimalist logo for a tech startup called 'Volta', lightning bolt motif, clean lines" --resolution 1K
```

### Editing Workflow
```bash
# 1. Generar base
uv run generate_image.py -p "product on white background" -f base.png -r 2K

# 2. Editar/refinar
uv run generate_image.py -p "add soft shadows and reflections" -f refined.png -i base.png

# 3. Componer con otros elementos
uv run generate_image.py -p "place product in lifestyle kitchen scene" -f final.png -i refined.png -i kitchen-bg.png
```

## Limitaciones y Best Practices

### Limitaciones
- Máximo 14 imágenes de entrada por request
- Modelo es `gemini-3-pro-image-preview` (preview = puede cambiar)
- No hay control de seed/reproducibilidad
- Content safety filters de Google aplican
- Output siempre PNG (RGB)

### Best Practices
- **Filenames con timestamp:** `2026-02-18-12-30-00-description.png`
- **No leer la imagen de vuelta** en el chat — solo reportar el path guardado
- El script imprime `MEDIA:` para auto-attach en providers soportados
- Para iteraciones, usar el output anterior como input (`-i previous.png`)
- Resolución 1K para drafts rápidos, 2K para calidad, 4K para print
- Imágenes RGBA se convierten a RGB con fondo blanco automáticamente

### Tips de OpenClaw
- La API key se puede configurar en `~/.openclaw/openclaw.json` bajo `skills."nano-banana-pro".apiKey`
- `{baseDir}` se resuelve automáticamente al path del skill en OpenClaw
