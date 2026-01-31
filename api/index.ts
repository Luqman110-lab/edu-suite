import app from '../server/index';

export default function handler(req, res) {
    // Vercel Serverless Function Wrapper
    // Ensure the app handles the request
    return app(req, res);
}
