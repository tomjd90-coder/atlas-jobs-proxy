// Vercel Serverless Function (Node.js) to proxy the GraphQL request to Atlas API.
// This bypasses CORS security policies that block client-side requests from Squarespace.

// The fixed endpoint for the Atlas API
const ATLAS_API_URL = 'https://api.recruitwithatlas.com/public-graphql';

// Your confirmed agency alias
const AGENCY_ALIAS = "pobl";

// The complete, raw JSON request body as a string literal. 
// Note: \n (newline) characters are intentionally included and escaped (\\n) 
// to ensure the query string meets the exact, strict formatting required by the Atlas GraphQL parser.
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

module.exports = async (req, res) => {
    // Vercel functions only run on the specified route, so we only need to check the request method.
    if (req.method !== 'POST') {
        // Return 405 Method Not Allowed for direct GET requests
        res.setHeader('Allow', 'POST');
        res.status(405).json({ error: "Method Not Allowed. Use POST." });
        return;
    }

    try {
        // 1. Send POST request to Atlas API
        const atlasResponse = await fetch(ATLAS_API_URL, {
            method: 'POST',
            headers: {
                // Ensure the Content-Type header is strictly application/json
                'Content-Type': 'application/json; charset=utf-8',
            },
            // Send the pre-formatted raw string body
            body: RAW_REQUEST_BODY_STRING,
        });

        // 2. Handle non-200 responses from Atlas API
        if (!atlasResponse.ok) {
            const errorText = await atlasResponse.text();
            
            // Log the full error to the Vercel console for debugging
            console.error(`Atlas API HTTP Error: ${atlasResponse.status}`, errorText);

            // Forward the error status and a descriptive message to the front-end
            return res.status(400).json({ 
                error: `Atlas API HTTP Error: ${atlasResponse.status}`,
                details: errorText.substring(0, 500) // Truncate long errors
            });
        }

        // 3. Forward the successful JSON response to the front-end
        const data = await atlasResponse.json();
        
        // Allow all origins (required for Squarespace to read the response)
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Content-Type', 'application/json');
        res.status(200).json(data);

    } catch (error) {
        console.error('Proxy Fetch Error:', error);
        // Return 500 status for connection or internal errors
        res.status(500).json({ error: 'Internal Proxy Error', details: error.message });
    }
};
