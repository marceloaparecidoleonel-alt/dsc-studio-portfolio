# Deivid Santos — Visualização Arquitetônica Premium

Site profissional desenvolvido com **HTML, CSS e JavaScript Vanilla ES6**.

---

## 📁 Estrutura do Projeto

```
/
├── index.html
├── css/
│   ├── style.css        — Estilos principais (design tokens, componentes)
│   ├── animations.css   — Animações, scroll reveal, micro-interações
│   └── responsive.css   — Responsividade (desktop → mobile)
├── js/
│   ├── app.js           — Módulo principal (orquestra tudo)
│   ├── animations.js    — Cursor, parallax, counters, skill bars
│   ├── portfolio.js     — Filtros, modal de projetos, slider depoimentos
│   └── panorama.js      — Estrutura para Tour 360° (pronto para Pannellum)
└── assets/
    ├── images/          — Coloque aqui as imagens do portfólio
    │   ├── deivid-hero.jpg      (foto principal — Hero)
    │   ├── deivid-sobre.jpg     (foto — Seção Sobre)
    │   ├── projeto-01.jpg       (portfólio — Residencial)
    │   ├── projeto-02.jpg       (portfólio — Interiores)
    │   ├── projeto-03.jpg       (portfólio — Fachadas)
    │   ├── projeto-04.jpg       (portfólio — Comercial)
    │   ├── projeto-05.jpg       (portfólio — Residencial)
    │   ├── projeto-06.jpg       (portfólio — Interiores)
    │   ├── tour-sala.jpg        (tour 360° — Sala)
    │   ├── tour-quarto.jpg      (tour 360° — Quarto)
    │   ├── tour-cozinha.jpg     (tour 360° — Cozinha)
    │   ├── og-image.jpg         (Open Graph — redes sociais)
    │   └── panoramas/           (imagens equiretangulares para Pannellum)
    │       ├── pano-sala.jpg
    │       ├── pano-quarto.jpg
    │       └── pano-cozinha.jpg
    ├── icons/
    │   └── favicon.svg
    └── videos/          — (opcional) Vídeos de apresentação
```

---

## 🖼️ Imagens

Substitua os arquivos em `assets/images/` pelas imagens reais do portfólio.

- **Resolução recomendada:** mínimo 1200×800px (portfólio) / 960×1200px (hero)
- **Formato:** `.jpg` (melhor compressão) ou `.webp`
- **Tamanho:** máximo 400KB por imagem para performance

---

## 🌐 Tour 360° — Integração Pannellum

Para ativar o Tour Virtual 360°, siga os passos em `js/panorama.js`:

1. Adicione no `<head>` do `index.html`:
```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/pannellum@2.5.6/build/pannellum.css">
<script src="https://cdn.jsdelivr.net/npm/pannellum@2.5.6/build/pannellum.js"></script>
```

2. Coloque as imagens equiretangulares em `assets/images/panoramas/`

3. Substitua a função `renderPlaceholder()` em `panorama.js` pela chamada ao `pannellum.viewer()`

---

## 🔥 Firebase — Integração Futura

O projeto está preparado para integração com Firebase. Pontos marcados com `TODO (Firebase)`:

- **`js/app.js`** → Função `submitForm()` — salvar leads no Firestore
- **`js/portfolio.js`** → Carregar projetos dinamicamente
- **`index.html`** → Formulário de contato marcado com comentário

---

## 🎨 Paleta de Cores

| Token            | Cor         | Uso                    |
|------------------|-------------|------------------------|
| `--clr-bg`       | `#090909`   | Fundo principal        |
| `--clr-bg-2`     | `#111111`   | Fundo secundário       |
| `--clr-card`     | `#181818`   | Cards                  |
| `--clr-accent`   | `#D4A15A`   | Detalhes / dourado     |
| `--clr-text`     | `#FFFFFF`   | Texto principal        |
| `--clr-text-2`   | `#C7C7C7`   | Texto secundário       |

---

## ✏️ Personalização

### Alterar informações de contato
No `index.html`, pesquise por `99999-9999` e `contato@deividsantos.com.br` e substitua pelos dados reais.

### Alterar link do WhatsApp
No `index.html`, altere os links `https://wa.me/5511999999999` com o número real.

### Alterar dados dos projetos no Modal
Em `js/portfolio.js`, edite o objeto `PROJECTS_DATA` com os dados reais de cada projeto.

---

## 🚀 Como Usar

1. Abra o `index.html` em qualquer navegador moderno
2. Para desenvolvimento local com módulos ES6, use um servidor local:
   ```bash
   # Python 3
   python -m http.server 8080

   # Node.js (npx serve)
   npx serve .

   # VS Code: Live Server extension
   ```
3. Acesse `http://localhost:8080`

> **Atenção:** Por usar ES Modules (`type="module"`), o arquivo precisa ser servido via HTTP(S), não por `file://`.

---

## 📱 Responsividade

| Breakpoint | Dispositivo         |
|------------|---------------------|
| `> 1600px` | Telas 4K / ultrawide|
| `≤ 1280px` | Notebook grande     |
| `≤ 1024px` | Notebook / Tablet   |
| `≤ 768px`  | Tablet portrait     |
| `≤ 480px`  | Celular             |
| `≤ 360px`  | Celular pequeno     |

---

**Desenvolvido para Deivid Santos — Visualização Arquitetônica Premium**
