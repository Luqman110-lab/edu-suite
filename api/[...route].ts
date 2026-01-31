import app from '../server/index';

export default function handler(req, res) {
    // Log the incoming request for debugging
    console.log(`[Vercel Function] Method: ${req.method}, URL: ${req.url}`);

    // Vercel's catch-all route might strip the prefix, or provide relative path.
    // Express app expects /api/...
    if (!req.url.startsWith('/api') && !req.url.startsWith('/docs')) {
        req.url = '/api' + req.url;
        console.log(`[Vercel Function] Rewrote URL to: ${req.url}`);
    }

    return app(req, res);
}
