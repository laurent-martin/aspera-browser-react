# Aspera Browser React

Aspera file browsing and transfer application built with React, TypeScript, Vite, IBM Carbon Design System and the Aspera Web SDK.

Merci @m67hoff for the inspiration!

And merci IBM Bob for the vide coding.

## 🚀 Features

- **File Navigation**: Browse directories with breadcrumb navigation
- **Two Display Modes**: Traditional list view or modern card view
- **Drag & Drop**: Upload files by drag and drop
- **Transfer Management**: Track your downloads and uploads in real-time
- **Internationalization**: Multi-language support (English/French) with i18next
- **Modern Interface**: Uses IBM Carbon Design System for consistent UX
- **TypeScript**: Fully typed code for better maintainability

## 🛠️ Tech Stack

- **React 19** with TypeScript
- **Vite 6** - Ultra-fast build tool
- **IBM Carbon Design System** - UI Components
- **i18next + react-i18next** - Internationalization
- **Zustand** - Simple and performant state management
- **TanStack Query** - Server data management
- **TanStack Router** - Type-safe routing
- **React Hook Form + Zod** - Forms and validation
- **Axios** - HTTP requests
- **date-fns** - Date manipulation
- **openapi-typescript** - Type-safe API client generation
- **Aspera Web SDK** - File transfer integration

## 📦 Installation

### Local Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Generate API types from OpenAPI spec
npm run generate:api-types
```

### Deployment on GitHub Pages

The application can be deployed for free on GitHub Pages:

```bash
# Deployment is automatic via GitHub Actions
# Each push to main branch triggers build and deployment

# To test the GitHub Pages build locally:
npm run build:gh-pages
npm run preview
```

**Required configuration:**

1. Enable GitHub Pages in repository settings (Settings > Pages)
2. Select "GitHub Actions" as the source
3. The `.github/workflows/deploy.yml` workflow will run automatically

**Deployment URL:** `https://<username>.github.io/aspera-browser-react/`

### Deployment with Docker

```bash
# Build the Docker image
./scripts/build.sh v1.0.0

# Run with Docker
docker run -d -p 8080:80 aspera-browser:v1.0.0

# Or with Docker Compose
docker compose up -d
```

### Deployment on Kubernetes

```bash
# Deploy on Kubernetes
./scripts/deploy.sh production

# Or manually
kubectl apply -k k8s/ -n aspera-browser
```

For more details, see the [Deployment Guide](./docs/DEPLOYMENT.md).

## 🏗️ Project Structure

```text
src/
├── components/
│   ├── common/          # Reusable components (Breadcrumb, LanguageSwitcher, etc.)
│   ├── file-browser/    # File navigation components
│   ├── transfer/        # Transfer management panel
│   └── layout/          # Main application layout
├── i18n/               # i18next configuration
├── locales/            # Translation files (en, fr, de, es, ja, pt, ru, zh, ar)
│   ├── en/            # English translations
│   ├── fr/            # French translations
│   └── ...            # Other languages
├── services/           # API services (Aspera Node API)
├── stores/             # Zustand stores (auth, files, transfers)
├── types/              # TypeScript types and auto-generated API types
├── utils/              # Utilities (formatters, etc.)
├── App.tsx             # Main component
└── main.tsx            # Entry point
```

## 🔧 Configuration

The application connects to an Aspera Node API server.

- **URL**
- **Username**
- **Password**

You can modify these settings in the connection interface.

## 🔌 API Integration

The application uses a type-safe API client generated from the official IBM Aspera Node API OpenAPI specification (v4.4.6).

### Features

- **Type-safe API calls**: All API methods are fully typed with TypeScript
- **Auto-generated types**: Types are generated from the official OpenAPI spec
- **Error handling**: Custom error class with detailed error information
- **Easy regeneration**: Update types with a single command

## 🎨 Display Modes

### List View

- Table with columns: Type, Name, Size, Modified Date
- Sort by column
- Multiple selection with checkboxes
- Integrated search

### Card View

- Responsive grid display
- Visual icons for files and folders
- Selection by checkbox
- Compact information

## 🌍 Internationalization

The application supports multiple languages using i18next:

- 🇬🇧 **English** (default)
- 🇫🇷 **French**
- 🇩🇪 **German**
- 🇪🇸 **Spanish**
- 🇵🇹 **Portuguese**
- 🇷🇺 **Russian**
- 🇨🇳 **Chinese**
- 🇯🇵 **Japanese**
- 🇸🇦 **Arabic**

Language is automatically detected from browser settings and can be changed using the language switcher component.

## 🐳 Containerization & Deployment

The application is ready for production deployment with:

- **Docker**: Optimized multi-stage image with Nginx
- **Kubernetes**: Complete manifests (Deployment, Service, Ingress, ConfigMap)
- **Kubernetes Operator**: Structure for a custom operator (coming soon)
- **Automated scripts**: Simplified build and deployment

See the [Deployment Guide](./docs/DEPLOYMENT.md) for more details.

## 📋 TODO

- [x] Full integration with Aspera Web SDK for transfers
- [x] File deletion implementation
- [x] Folder creation implementation
- [x] File upload (drag & drop)
- [x] File download
- [x] Media viewer (images, videos, audio)
- [x] Video streaming support
- [ ] Enhanced error handling
- [ ] Unit and E2E tests
- [x] Multi-language support (9 languages)
- [x] Docker containerization
- [x] Kubernetes deployment manifests
- [ ] Kubernetes operator implementation
- [ ] Dark mode
- [x] SSH/SFTP support
- [x] Access key authentication
- [x] Node user authentication

## 📝 License

Apache-2.0

## 👨‍💻 Development

This project uses the latest React 2026 development practices:

- TypeScript strict mode
- ESLint for code quality
- Prettier for formatting
- Vite for ultra-fast builds
- Instant Hot Module Replacement (HMR)

## 🤝 Contributing

Contributions are welcome! Feel free to open an issue or pull request.

## Credits

- <https://github.com/m67hoff/aspera-browser>
