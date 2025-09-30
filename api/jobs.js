// Vercel Serverless Function (Node.js) to proxy the GraphQL request to Atlas API.

// The fixed endpoint for the Atlas API
const ATLAS_API_URL = 'https://api.recruitwithatlas.com/public-graphql';

// Your confirmed agency alias
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


// Function to set all necessary CORS headers
function setCorsHeaders(res) {
    // Allows requests from any domain (*)
    res.setHeader('Access-Control-Allow-Origin', '*'); 
    // Allows the browser to send POST requests with specific headers
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    // Cache preflight request for 86400 seconds (1 day)
    res.setHeader('Access-Control-Max-Age', '86400');
}

module.exports = async (req, res) => {
    // 1. Handle CORS Preflight (OPTIONS request)
    if (req.method === 'OPTIONS') {
        setCorsHeaders(res);
        res.status(204).end(); // Send empty response for successful preflight
        return;
    }
    
    // 2. Set CORS Headers for the actual POST response
    setCorsHeaders(res);

    if (req.method !== 'POST') {
        res.status(405).json({ error: "Method Not Allowed. Use POST." });
        return;
    }

    try {
        // 3. Send POST request to Atlas API
        const atlasResponse = await fetch(ATLAS_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json; charset=utf-8',
            },
            body: RAW_REQUEST_BODY_STRING,
        });

        // 4. Handle non-200 responses from Atlas API
        if (!atlasResponse.ok) {
            const errorText = await atlasResponse.text();
            
            console.error(`Atlas API HTTP Error: ${atlasResponse.status}`, errorText);

            return res.status(400).json({ 
                error: `Atlas API HTTP Error: ${atlasResponse.status}`,
                details: errorText.substring(0, 500)
            });
        }

        // 5. Forward the successful JSON response to the front-end
        const data = await atlasResponse.json();
        
        res.setHeader('Content-Type', 'application/json');
        res.status(200).json(data);

    } catch (error) {
        console.error('Proxy Fetch Error:', error);
        res.status(500).json({ error: 'Internal Proxy Error', details: error.message });
    }
};
