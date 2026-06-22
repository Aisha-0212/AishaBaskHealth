# URL Shortener

Built with Bun, Express, and MySQL.

## How to run

1. Install dependencies:
   bun install

2. Set up your .env file with your MySQL password (copy from .env.example)

3. Create the database tables:
   mysql -u root -p < sql/schema.sql

4. Start the server:
   bun run dev

## Endpoints

POST /shorten
Body: { "longUrl": "https://example.com" }
Returns a short URL

GET /:shortCode
Redirects to the original URL and records the click

GET /analytics/:shortCode
Returns click count and recent click history

## Rate limiting

10 requests per 60 seconds per IP. Returns 429 if exceeded.
