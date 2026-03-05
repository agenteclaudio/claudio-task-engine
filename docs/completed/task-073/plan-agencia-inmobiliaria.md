# Plan: Agencia Inmobiliaria Automatizada + Negocio de Websites

## Contexto
Pablo pidió analizar dos vertientes:
1. **Pipeline automatizado para inmobiliarias argentinas** (inspirado en Unloopa + Felix/Nat Eliason)
2. **Replicar el negocio Unloopa con nuestro stack** (Claudio autónomo vendiendo websites)

---

## Vertiente 1: Pipeline End-to-End para Inmobiliarias Argentinas

### El Modelo Unloopa
Unloopa es un SaaS ($49-$149/mo) que vende un bot de Telegram conectado a OpenClaw. El pipeline:
1. **Lead scraping**: Google Maps → negocios locales sin web o con web mala
2. **Website generation**: AI genera sitio personalizado para cada lead
3. **Video walkthrough**: Graba un loom/video mostrando el sitio
4. **Email outreach**: Emails personalizados con link al sitio + video
5. **AI voice calling** (plan Pro): Llamadas automáticas que suenan humanas, manejo de objeciones, booking de reuniones

### El Modelo Felix (Nat Eliason)
Felix es un agente OpenClaw que actúa como "CEO" de una empresa real. No vende websites — es un agente operativo que:
- Maneja proyectos, escribe código, gestiona comunicaciones
- Tiene sistema de memoria de 3 capas
- Opera autónomamente con delegación a sub-agentes
- Vende una guía ($29) sobre cómo replicar el setup
- Clave: la relación humano-AI como "trust ladder" — autonomía creciente

### Aplicación al Mercado Inmobiliario Argentino

**Oportunidad**: El mercado inmobiliario argentino es fragmented, low-tech, y relational. La mayoría de las inmobiliarias operan con:
- WhatsApp manual para leads
- Publicaciones manuales en portales (ZonaProp, Argenprop, MercadoLibre Inmuebles)
- Sin CRM, sin seguimiento automatizado
- Websites genéricos o inexistentes

**Pipeline propuesto**:

```
┌─────────────────────────────────────────────────┐
│  1. LEAD CAPTURE                                │
│  - Scraping portales (ZonaProp, ML Inmuebles)   │
│  - Google Maps inmobiliarias sin web             │
│  - Monitoring de nuevas publicaciones            │
└──────────────┬──────────────────────────────────┘
               ▼
┌─────────────────────────────────────────────────┐
│  2. WEBSITE GENERATION                          │
│  - Template inmobiliaria con propiedades         │
│  - Integración con portal data (fotos, precios) │
│  - SEO local automático                          │
│  - CC + Figma pipeline ya funcional              │
└──────────────┬──────────────────────────────────┘
               ▼
┌─────────────────────────────────────────────────┐
│  3. OUTREACH AUTOMATIZADO                       │
│  - WhatsApp Business API (clave en Argentina)    │
│  - Email personalizado con preview del sitio     │
│  - Video walkthrough del sitio generado          │
│  - Follow-up secuencia: 3 touchpoints en 10 días│
└──────────────┬──────────────────────────────────┘
               ▼
┌─────────────────────────────────────────────────┐
│  4. DEMO GENERATOR                              │
│  - Demo en vivo del sitio generado               │
│  - Dashboard simulado con métricas               │
│  - Propuesta de valor: "tu inmobiliaria online   │
│    en 48hs sin hacer nada"                       │
└──────────────┬──────────────────────────────────┘
               ▼
┌─────────────────────────────────────────────────┐
│  5. PRODUCTIZACIÓN                              │
│  - Plan básico: website + portal sync            │
│  - Plan pro: + CRM + seguimiento automático      │
│  - Plan enterprise: + voice calling + analytics  │
│  - Pricing: $15K-50K ARS/mes (flexible)          │
└─────────────────────────────────────────────────┘
```

### Herramientas del Ecosistema Real Estate AI (referencia)
- **Follow Up Boss**: CRM líder en US, tiene API + integraciones AI
- **Ylopo**: Lead capture + AI nurturing, texting assistant
- **EliseAI**: Conversational AI para property management
- **REsimpli**: CRM para investors, drip campaigns, ringless voicemail
- **Mod AI**: AI agents para Follow Up Boss (engagement, calificación, booking)
- **Lindy.ai**: AI agents genéricos con casos de uso inmobiliarios

### Lo que ya tenemos vs lo que falta

| Componente | Estado | Qué falta |
|---|---|---|
| Website generation | ✅ CC + Figma pipeline funcional | Templates inmobiliarios específicos |
| Lead scraping | 🟡 Browser headless funcional | Script para Google Maps + portales AR |
| Email outreach | ✅ AgentMail operativo | Templates de outreach, secuencias |
| WhatsApp outreach | 🟡 WhatsApp Business API | Necesita número dedicado + API access |
| AI Voice calling | ❌ No tenemos | Integrar Bland.ai, Vapi, o Retell |
| CRM | ❌ No tenemos | Supabase como backend, o integrar Follow Up Boss |
| Video walkthrough | 🟡 Remotion investigado | Implementar pipeline de video automático |
| Portal monitoring | ❌ No tenemos | Scraping ZonaProp/ML |

---

## Vertiente 2: Negocio de Websites à la Unloopa (Claudio Autónomo)

### Viabilidad
El negocio de Unloopa es esencialmente: find businesses without websites → generate one → cold outreach → sell hosting.

**Nuestro stack actual ya puede:**
1. Scrape Google Maps (browser headless) ✅
2. Generate websites (CC + Figma) ✅
3. Send personalized emails (AgentMail) ✅
4. Operate autonomously (OpenClaw + crons) ✅

**Lo que falta:**
1. **Cobro**: Necesita método de pago (Stripe? MercadoPago?)
2. **Hosting**: Necesita hosting para los sitios generados (Vercel free tier, Cloudflare Pages)
3. **Dominio**: Compra de dominios automatizada (Namecheap API, Cloudflare)
4. **Outreach en español**: Templates y secuencias adaptadas a Argentina
5. **Lead qualification**: Criterio para qué negocios targetear

### Plan de Implementación (Si Pablo lo aprueba)

**Fase 1: Proof of Concept (1 semana)**
- Elegir un nicho (ej: "restaurantes en Zona Norte")
- Scrape 50 negocios sin web de Google Maps
- Generar 5 websites de muestra con CC
- Crear template de email outreach
- Enviar manualmente los primeros 5

**Fase 2: Automatización (2 semanas)**
- Script de scraping automático
- Pipeline CC para generación batch
- Secuencia de emails automatizada (3 touchpoints)
- Hosting en Cloudflare Pages (gratis)

**Fase 3: Escala (ongoing)**
- 50 outreach/día automatizado
- AI voice follow-up (Bland.ai ~$0.07/min)
- Landing page propia del servicio
- MercadoPago para cobro recurrente

### Pricing para Argentina
- **Setup**: $0 (gratis, el gancho)
- **Hosting + mantenimiento**: $8.000-15.000 ARS/mes
- **Con dominio propio**: +$3.000 ARS/mes
- **Actualización de contenido**: incluida

### Riesgos
1. **Saturación rápida**: Si funciona, otros lo copian
2. **Calidad percibida**: Websites AI-generated pueden verse genéricos
3. **Soporte**: ¿Quién maneja al cliente? Claudio no puede hacer support calls
4. **Legal**: Necesita facturar, lo cual ya está resuelto (Monotributo Pablo)
5. **Time investment de Pablo**: Mínimo pero no cero (aprobaciones, setup inicial)

---

## Recomendación

### Corto plazo (esta semana)
1. **Vertiente 2 primero** — es más simple, más rápido de validar, y Pablo no necesita hacer casi nada
2. Elegir nicho, generar 5 websites de prueba, enviar outreach manual
3. Si 1/5 responde positivamente → automatizar

### Mediano plazo (1-2 meses)
4. Si websites funciona → reinvertir en pipeline inmobiliario (Vertiente 1)
5. El pipeline inmobiliario es más complejo pero más rentable

### Lo que necesito de Pablo para arrancar
- ✅/❌ Aprobación para arrancar Vertiente 2
- Nicho preferido (restaurantes, consultorios, comercios, etc.)
- Método de cobro (MercadoPago business?)
- ¿Quiere estar en el loop del outreach o full autonomía?

---

## Referencias
- Unloopa: https://openclaw.unloopa.com/ ($49-149/mo, Telegram bot + OpenClaw)
- Unloopa Reddit (Jan 2026): https://www.reddit.com/r/SaaS/comments/1q8f4e2/
- Felix Craft: https://felixcraft.ai/ ($29 playbook, AI-as-CEO model)
- Nat Eliason/Felix video: https://x.com/nateliason/status/2024953009524932705
- AI Real Estate Lead Gen (Lindy): https://www.lindy.ai/blog/how-to-use-ai-for-real-estate-lead-generation
- AI Agents Real Estate: https://aiagentskit.com/blog/ai-agents-real-estate-lead-generation/
- Argentina Proptech: Forecast $301.6B global (2025)
