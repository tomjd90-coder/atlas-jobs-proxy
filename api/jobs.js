// Vercel Serverless Function to proxy a GraphQL request to the Atlas API.

const ATLAS_API_URL = 'https://api.recruitwithatlas.com/public-graphql';
const AGENCY_ALIAS = "pobl";

// The complete, raw JSON request body as a string literal.
const RAW_REQUEST_BODY_STRING = JSON.stringify({
    "operationName": "GetPublicJobOpenings",
    "variables": {
        "page": 1,
        "limit": 50,
        "input": {
            "agencyAlias": AGENCY_ALIAS
        }
    },
    "query": "query GetPublicJobOpenings($input: PublicJobOpeningInput!, $limit: Int!, $page: Int!) {\\n publicJobOpenings(input: $input, limit: $limit, page: $page) {\\n items {\\n ...PublicJobOpening\\n __typename\\n }\\n __typename\\n }\\n}\\n\\nfragment PublicJobOpening on PublicJobOpening {\\n id\\n jobRole\\n location {\\n ...Location\\n __typename\\n }\\n contractType\\n salary\\n salaryCurrency\\n __typename\\n}\\n\\nfragment Location on Location {\\n name\\n country\\n locality\\n region\\n geo\\n street_address\\n postal_code\\n __typename\\n}"
});

// A helper function to set all necessary CORS headers
function setCorsHeaders(res) {
    res.setHeader('Access-Control-Allow-Origin', '*'); // Allows requests from any domain
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

module.exports = async (req, res) => {
    // 1. Handle the browser's CORS Preflight (OPTIONS) request
    if (req.method === 'OPTIONS') {
        setCorsHeaders(res);
        res.status(204).end(); // Respond with "No Content" for a successful preflight
        return;
    }
    
    // 2. Set CORS Headers for the actual POST response
    setCorsHeaders(res);

    // Ensure only POST requests proceed
    if (req.method !== 'POST') {
        res.setHeader('Allow', 'POST');
        res.status(405).json({ error: "Method Not Allowed. Please use POST." });
        return;
    }

    try {
        // 3. Forward the POST request to the Atlas API
        const atlasResponse = await fetch(ATLAS_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json; charset=utf-8',
            },
            body: RAW_REQUEST_BODY_STRING,
        });

        // 4. Handle non-successful (e.g., 400, 500) responses from Atlas
        if (!atlasResponse.ok) {
            const errorText = await atlasResponse.text();
            console.error(`Atlas API Error: ${atlasResponse.status}`, errorText);
            return res.status(atlasResponse.status).json({ 
                error: 'Failed to fetch data from Atlas API.',
                details: errorText 
            });
        }

        // 5. Forward the successful JSON response from Atlas to the client
        const data = await atlasResponse.json();
        res.status(200).json(data);

    } catch (error) {
        console.error('Proxy Fetch Error:', error);
        res.status(500).json({ error: 'An internal error occurred in the proxy.', details: error.message });
    }
};
