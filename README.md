# Online Clipboard

A simple, secure, and feature-rich online clipboard service built with Cloudflare Workers. Share text and markdown content with automatic expiration and optional one-time viewing.

## Features

- 📋 **Markdown Support**: Full markdown rendering with live preview
- 🌐 **Bilingual Interface**: English and Chinese (中文) language support
- ⏱️ **TTL (Time To Live)**: Automatic expiration after a configurable time (default: 10 minutes)
- 🔥 **Read Once**: Optional "burn after reading" - content is deleted after first view
- �� **Code Block Copying**: One-click copy buttons for code blocks (appear on hover)
- 🎨 **Modern UI**: Clean, responsive design with gradient backgrounds
- ⚡ **Fast & Global**: Powered by Cloudflare Workers edge network

## Tech Stack

- **Runtime**: Cloudflare Workers
- **Language**: TypeScript
- **Storage**: Cloudflare KV
- **Markdown**: [marked.js](https://marked.js.org/)

## Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- Cloudflare account
- Wrangler CLI installed globally or via npm

## Installation

1. Install dependencies:

```bash
npm install
```

2. Configure Cloudflare KV namespace:

   - Create a KV namespace in your Cloudflare dashboard
   - Update the `kv_namespaces` section in `wrangler.jsonc` with your namespace ID

3. Login to Cloudflare:

```bash
npx wrangler login
```

## Development

Start the development server:

```bash
npm run dev
# or
npm start
```

The service will be available at `http://localhost:8787`

## Deployment

Deploy to Cloudflare Workers:

```bash
npm run deploy
```

## Usage

### Creating a Clipboard Entry

1. Visit the root URL (`/`)
2. Select your preferred language (English/中文)
3. Enter your content (supports Markdown syntax)
4. Configure options:
   - **Read Once**: Check to delete content after first viewing (enabled by default)
   - **TTL**: Set expiration time in seconds (minimum 60 seconds, default 600 seconds)
5. Click "Create Clipboard" / "创建剪贴板"
6. Copy the generated link to share

### Viewing a Clipboard Entry

- Visit the generated link (e.g., `https://your-domain.com/{id}`)
- The content will be displayed with markdown rendering
- Metadata shown:
  - Creation timestamp
  - Read Once status (Yes/No with color coding)
  - Time remaining until expiration (live countdown)
- If "Read Once" is enabled, the entry is deleted after viewing

### Markdown Features

- Headers, lists, links, images
- Code blocks with syntax highlighting
- Inline code
- Blockquotes
- Tables
- And more standard markdown features

### Code Block Copying

- Hover over any code block (```) to reveal the copy button
- Click to copy the code content to clipboard
- Button shows "Copied!" feedback

## API

### POST `/`

Create a new clipboard entry.

**Request Body:**

```json
{
	"content": "Your clipboard content",
	"readOnce": true,
	"ttl": 600,
	"lang": "en"
}
```

**Response:**

```json
{
	"id": "uuid-here"
}
```

### GET `/{id}`

Retrieve a clipboard entry. Returns HTML page with rendered content.

**Note**: If `readOnce` is true, the entry is deleted after this request.

### GET `/`

Returns the HTML creation page.

## Configuration

### TTL (Time To Live)

- Default: 600 seconds (10 minutes)
- Minimum: 60 seconds
- Maximum: Determined by Cloudflare KV limits
- After expiration, entries are automatically deleted

### KV Namespace

The service uses Cloudflare KV for storage. Configure in `wrangler.jsonc`:

```jsonc
{
	"kv_namespaces": [
		{
			"binding": "CLIPS",
			"id": "your-namespace-id"
		}
	]
}
```

## Project Structure

```
├── src/
│   └── index.ts          # Main worker code
├── test/                  # Test files
├── package.json          # Dependencies and scripts
├── wrangler.jsonc        # Cloudflare Workers configuration
└── tsconfig.json         # TypeScript configuration
```

## Development Scripts

- `npm run dev` - Start development server
- `npm run deploy` - Deploy to Cloudflare Workers
- `npm test` - Run tests
- `npm run cf-typegen` - Generate Cloudflare types

## Browser Support

- Modern browsers with ES6+ support
- Clipboard API support required for copy functionality
- Works on desktop and mobile devices
