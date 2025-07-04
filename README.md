# SEO Description Generator v2

A professional AI-powered tool for generating SEO-optimized descriptions following strict brand guidelines. Built with Node.js, Express, and vanilla JavaScript for a clean, fast, and maintainable solution.

## Features

- **AI-Powered Generation**: Uses OpenAI GPT-4 for high-quality content creation
- **Brand Guidelines Compliance**: Enforces tone, voice, and content structure rules
- **Parallel Processing**: Generate descriptions for multiple pages simultaneously
- **Search Volume Data**: Integration with DataForSEO for keyword metrics
- **Competitor Analysis** (Optional): Analyze top SERP competitors for content insights
- **Multi-language Support**: Generate descriptions in 10+ languages
- **Real-time Cost Tracking**: Monitor token usage and estimated costs
- **Professional UI**: Clean, responsive design with smooth animations

## Prerequisites

- Node.js 16+ and npm
- DataForSEO account (for search volume and SERP data)
- OpenAI API key (for content generation)

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
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
- **DATAFORSEO_LOGIN & PASSWORD**: Get from [DataForSEO](https://dataforseo.com/)

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
  "includeSearchVolume": true,
  "includeCompetitorAnalysis": false
}
```

### `POST /api/search-volume`
Get search volume data for keywords.

### `POST /api/analyze-competitors`
Analyze top SERP competitors for a keyword.

## Architecture

### Backend Structure
```
├── server.js              # Main Express server
├── config/
│   └── constants.js       # Brand guidelines and configuration
├── services/
│   ├── dataForSEO.js     # DataForSEO API integration
│   └── openAI.js         # OpenAI service with retry logic
├── utils/
│   ├── logger.js         # Structured logging utility
│   └── tokenCounter.js   # Token counting and cost calculation
```

### Frontend Structure
```
├── public/
│   ├── index.html        # Main HTML with semantic structure
│   ├── styles.css        # Professional CSS with CSS variables
│   └── app.js           # Clean JavaScript application logic
```

## Key Features Explained

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

Edit `config/constants.js` to modify:
- Brand guidelines and tone
- API endpoints and models
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

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

[Your License Here]

## Support

For issues or questions, please create an issue in the repository. 