import app from '../server/index';

export default function handler(req, res) {
    // Log the incoming request for debugging
    console.log(`[Vercel Function] Method: ${req.method}, URL: ${req.url}`);

    // Explicitly handle Vercel's behavior where it might strip /api prefix sometimes?
    // Actually, normally req.url implies the full path relative to the domain?
    // If req.url is "/api/login", Express will match app.post("/api/login").

    return app(req, res);
}
