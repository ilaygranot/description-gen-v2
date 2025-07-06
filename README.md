# SEO Description Generator v2

A professional AI-powered tool for generating SEO-optimized descriptions following strict brand guidelines. Built with Node.js, Express, and vanilla JavaScript for a clean, fast, and maintainable solution.

## Features

- **Multiple AI Models**: Switch seamlessly between OpenAI **GPT-4o** and Google **Gemini 2.0 Flash**
- **AI-Powered Generation**: Marketing copy perfectly aligned with brand guidelines
- **Ultra-Low Cost Option**: Gemini is ~8× cheaper than GPT-4o while keeping quality high
- **Template-Driven Prompts**: All copy rules live in editable files under `/prompts`
- **Strict Brand Compliance**: Tone, voice, structure, and word-count are all enforced automatically
- **Parallel Processing**: Up to 3 pages generated concurrently for speed
- **Search-Volume Metrics** *(optional)*: Pulls Google Ads volume & CPC via DataForSEO
- **Competitor Analysis** *(optional)*: AI digests top SERP pages and injects insights
- **SeatPick Safety Net**: Alerts you when *SeatPick* already ranks in the top-3, so you can reconsider edits
- **Auto-Favicons**: Displays top competitor favicons below each description for quick visual scan
- **Session Memory**: Saves your last 10 generation sessions in localStorage for instant recall
- **Dark Mode**: One-click light/dark theme with persistent preference
- **Real-Time Cost Badge**: Tiny badge in the header continuously tracks session cost
- **Professional UI/UX**: Modern two-column layout, tooltips on every advanced option, smooth micro-animations

### Quick Demo
 *(GIF/Screenshot placeholder – drag a screenshot into this section in your fork)*

## Prerequisites

- Node.js 16+ and npm
- DataForSEO account (for search volume and SERP data)
- At least one AI service:
  - OpenAI API key (for GPT-4o model)
  - Google Gemini API key (for Gemini 2.0 Flash model)

## Installation

1. Clone the repository:
```bash
git clone https://github.com/ilaygranot/description-gen-v2
cd description-generator-v2
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
npm run setup
```
This will create a `.env` file with placeholders. Edit this file and add your actual API credentials:
- **OPENAI_API_KEY**: Get from [OpenAI Platform](https://platform.openai.com/api-keys)
- **GEMINI_API_KEY**: Get from [Google AI Studio](https://makersuite.google.com/app/apikey)
- **DATAFORSEO_LOGIN & PASSWORD**: Get from [DataForSEO](https://dataforseo.com/)

Note: You need at least one AI service configured (OpenAI or Gemini)

## Usage

### Development Mode
```bash
npm run dev
```
This starts the server with nodemon for auto-reload on file changes.

### Production Mode
```bash
npm start
```

Access the application at `http://localhost:3000`

## API Endpoints

### `POST /api/generate`
Generate SEO descriptions for multiple pages.

**Request Body:**
```json
{
  "pages": ["Arsenal tickets", "Beyoncé tickets"],
  "language": "English",
  "model": "gpt-4o",
  "includeSearchVolume": true,
  "includeCompetitorAnalysis": false
}
```

**Available Models:**
- `gpt-4o`  — OpenAI GPT-4o *(US $2.50 / 1M input • US $10 / 1M output)*
- `gemini-2.0-flash`  — Google Gemini Flash *(US $0.30 / 1M input • US $2.50 / 1M output)*

> ℹ️  **Tip:** GPT-4o gives the very best quality, but Gemini Flash is significantly cheaper and almost as good for most marketing copy.

### `POST /api/search-volume`
Get search volume data for keywords.

### `POST /api/analyze-competitors`
Analyze top SERP competitors for a keyword.

## Architecture

### Backend Structure
```
├── server.js              # Main Express server
├── config/
│   └── constants.js       # Core configuration (token prices, rate limits, default models)
├── prompts/
│   ├── system.txt               # Global brand guidelines template
│   ├── description_user.txt     # Per-page user prompt template
│   └── competitor_analysis.txt  # Competitor analysis prompt template
├── services/
│   ├── dataForSEO.js      # DataForSEO API integration
│   ├── openAI.js          # OpenAI service
│   └── gemini.js          # Google Gemini service
├── utils/
│   ├── prompt.js          # Tiny template engine for /prompts
│   ├── logger.js          # Structured logging utility
│   └── tokenCounter.js    # Token counting and cost calculation
```

### Frontend Structure
```
├── public/
│   ├── index.html        # Main HTML with semantic structure
│   ├── styles.css        # Professional CSS with CSS variables
│   └── app.js           # Clean JavaScript application logic
```

## Key Features Explained

### Multi-Model Support
- **GPT-4o**: Premium quality with higher cost
- **Gemini 2.0 Flash**: Cost-effective alternative (8x cheaper on input)
- Both models follow the same brand guidelines and quality standards
- Easy switching between models in the UI

### Brand Guidelines Enforcement
The system enforces:
- Content length: 350-500 words (with retry logic)
- Tone: Conversational, relatable, fan perspective
- Format: Bold first keyword mention, evergreen content
- Style: Active voice, minimal exclamations

### Parallel Processing
- Processes up to 3 pages concurrently
- Efficient API usage with batching
- Progress tracking for user feedback

### Cost Optimization
- Real-time token counting before API calls
- Detailed cost breakdown per description
- Aggregate cost tracking for sessions

## Configuration

- Most copy rules now live in the template files under `prompts/`:
  - `prompts/system.txt` – global brand guidelines, tone & writing rules
  - `prompts/description_user.txt` – per-page user prompt
  - `prompts/competitor_analysis.txt` – competitor insights prompt

- Technical settings can be tweaked in `config/constants.js`:
  - Default models and API endpoints
  - Rate limits and retry settings
  - Token pricing

## Error Handling

- Graceful degradation for failed API calls
- Detailed error messages with troubleshooting tips
- Automatic retry logic for word count compliance
- Rate limiting protection

## Performance

- Lightweight vanilla JavaScript frontend
- Efficient parallel processing
- Optimized API calls with caching potential
- Fast page load with minimal dependencies

## Security

- Environment variables for sensitive data
- Helmet.js for security headers
- Rate limiting on API endpoints
- Input validation and sanitization
