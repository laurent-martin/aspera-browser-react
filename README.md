# Aspera Browser React

Aspera file browsing and transfer application built with React, TypeScript, Vite, IBM Carbon Design System and the Aspera Web SDK.

Merci @m67hoff for the inspiration!

And merci IBM Bob for the vide coding.

## 🚀 Features

- **File Navigation**: Browse directories with breadcrumb navigation
- **Two Display Modes**: Traditional list view or modern card view
- **Drag & Drop**: Upload files by drag and drop
- **Transfer Management**: Track your downloads and uploads in real-time
- **Multiple Connection Types**: Aspera Node API (node-user, access-key) and SSH/SFTP via `ascmd`
- **Internationalization**: Multi-language support (9 languages) with i18next
- **Modern Interface**: Uses IBM Carbon Design System for consistent UX
- **TypeScript**: Fully typed code for better maintainability

## 🛠️ Tech Stack

- **React 19** with TypeScript
- **Vite 8** - Ultra-fast build tool
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

# Install SSH proxy backend dependencies
cd server && npm install && cd ..

# Start both Vite dev server and SSH proxy backend (port 3000 + 3001)
npm run dev

# Start only the Vite frontend (no SSH support)
npm run dev:vite

# Start only the SSH proxy backend
npm run dev:ssh

# Build for production
npm run build

# Preview production build
npm run preview

# Generate API types from OpenAPI spec
npm run generate:api-types
```

> **Note:** SSH/SFTP connections require `ascmd` to be installed on the remote Aspera HSTS server
> (it is part of the standard Aspera HSTS installation). The SSH proxy backend runs locally on
> port `3001` and is proxied through Vite at `/api/ssh`.

### Deployment on GitHub Pages

The application can be deployed for free on GitHub Pages:

```bash
# Deployment is automatic via GitHub Actions
# Each push to main branch triggers build and deployment

# To test the GitHub Pages build locally:
npm run build:gh-pages
npm run preview:gh-pages
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
server/
├── ascmd.js            # TLV protocol implementation (ported from Go) + SSH connection factory
├── index.js            # Express backend — exposes /api/ssh/* routes
└── package.json        # Backend dependencies (express, ssh2)
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
├── services/
│   ├── SSHService.ts        # SSH/SFTP client (calls /api/ssh/* backend)
│   ├── NodeUserService.ts   # Aspera Node API — node-user auth
│   ├── AccessKeyService.ts  # Aspera Node API — access-key auth
│   ├── FileServiceFactory.ts # Selects the right service from credentials
│   └── IFileService.ts      # Common interface
├── stores/             # Zustand stores (auth, files, transfers)
├── types/              # TypeScript types and auto-generated API types
├── utils/              # Utilities (formatters, etc.)
├── App.tsx             # Main component
└── main.tsx            # Entry point
```

## 🔧 Configuration

The application supports three connection types, selectable in the login interface:

| Type | Description | Required fields |
|------|-------------|-----------------|
| `node-user` | Aspera Node API with username/password | URL, username, password |
| `access-key` | Aspera Node API with access key | URL, access key ID, secret |
| `ssh` | SSH/SFTP via `ascmd` on the remote server | `ssh://host:port`, username, password or private key |

### SSH proxy port

The SSH proxy backend listens on port `3001` by default. Override with:

```bash
SSH_PROXY_PORT=4000 npm run dev
```

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

## 🔐 SSH/SFTP Architecture

SSH connections cannot be made directly from a browser. This application uses a local Node.js proxy backend (`server/`) that:

1. Receives HTTP `POST` requests from the React frontend (`/api/ssh/*`)
2. Opens an SSH connection to the remote Aspera HSTS server
3. Executes `ascmd` — the Aspera file-system command agent — over SSH
4. Speaks the binary TLV protocol to list files, create directories, rename, delete, etc.
5. Returns JSON responses to the frontend

### Starting the SSH proxy standalone

```bash
cd server
npm install       # first time only
node index.js     # listens on http://localhost:3001

# Custom port
SSH_PROXY_PORT=4000 node index.js
```

The proxy can run on any machine reachable from the browser — it does not need to be on the same host as the React app.

### Configuring the proxy URL in the UI

When creating or editing an SSH account, the **"SSH Proxy Backend URL"** field controls which proxy the frontend calls.

| Situation | What to enter |
|-----------|---------------|
| Local dev (`npm run dev`) | Leave empty — auto-detected as `http://localhost:3001` |
| Remote proxy (e.g. deployed server) | Full URL, e.g. `https://proxy.mycompany.com` |
| GitHub Pages with external proxy | Full URL with CORS enabled on the proxy |

> **Auto-detection rule:** when the app runs on `localhost`, the proxy URL defaults to
> `http://localhost:3001`. On any other hostname the frontend uses the relative path `/api/ssh`
> (works when the proxy is co-hosted behind the same reverse proxy).

### CORS for remote deployments

If the SSH proxy runs on a different origin than the React app (e.g. GitHub Pages + remote proxy),
restrict CORS to that origin using the `ALLOWED_ORIGIN` environment variable:

```bash
ALLOWED_ORIGIN=https://<username>.github.io node index.js
```

By default (`ALLOWED_ORIGIN` unset) the proxy accepts requests from any origin.

### Available routes

| Route | Description |
|-------|-------------|
| `POST /api/ssh/info` | Get platform info |
| `POST /api/ssh/browse` | List directory contents |
| `POST /api/ssh/mkdir` | Create a directory |
| `POST /api/ssh/delete` | Delete files or directories |
| `POST /api/ssh/rename` | Rename / move |
| `POST /api/ssh/stat` | Get file metadata |
| `POST /api/ssh/download-setup` | Verify paths before download |
| `POST /api/ssh/upload-setup` | Verify destination before upload |

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
- [x] Enhanced error handling
- [ ] Unit and E2E tests
- [x] Multi-language support (9 languages)
- [x] Docker containerization
- [x] Kubernetes deployment manifests
- [x] Kubernetes operator implementation
- [x] Dark mode
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
