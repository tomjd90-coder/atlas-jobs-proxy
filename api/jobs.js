/**
 * ATLAS JOBS PROXY SERVERLESS FUNCTION (NODE.JS)
 * This function is the only one that talks to the Atlas API, bypassing CORS.
 * FIX: Using a highly escaped, single-line query string to satisfy the strict GraphQL parser.
 */

// --- CONFIGURATION ---
const ATLAS_API_URL = 'https://api.recruitwithatlas.com/public-graphql';
const AGENCY_ALIAS = "pobl"; 

// --- GRAPHQL QUERY (Single-line, escaped string for strict API parsers) ---
// This exact structure matches the 'query' value inside the 'curl --data-raw' command.
const ATLAS_GRAPHQL_QUERY = "query GetPublicJobOpenings($input: PublicJobOpeningInput!, $limit: Int!, $page: Int!) {\\n publicJobOpenings(input: $input, limit: $limit, page: $page) {\\n items {\\n ...PublicJobOpening\\n __typename\\n }\\n __typename\\n }\\n}\\n\\nfragment PublicJobOpening on PublicJobOpening {\\n id\\n jobRole\\n location {\\n ...Location\\n __typename\\n }\\n contractType\\n salary\\n salaryCurrency\\n __typename\\n}\\n\\nfragment Location on Location {\\n name\\n country\\n locality\\n region\\n geo\\n street_address\\n postal_code\\n __typename\\n}";


const getJobsPayload = () => JSON.stringify({
    operationName: "GetPublicJobOpenings",
    variables: {
        page: 1,
        limit: 50,
        input: {
            agencyAlias: AGENCY_ALIAS
        }
    },
    query: ATLAS_GRAPHQL_QUERY
});


// Standard Vercel/Node.js Function Handler
module.exports = async (req, res) => {
    // Set CORS Headers to allow the Squarespace domain to access the data
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    // Handle preflight OPTIONS request
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }
    
    if (req.method !== 'POST') {
        res.status(405).send('Method Not Allowed. Use POST.');
        return;
    }

    try {
        // Make the secure server-to-server POST request to Atlas API
        const atlasResponse = await fetch(ATLAS_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: getJobsPayload()
        });
        
        // Check for API errors and forward the response
        if (!atlasResponse.ok) {
            const errorBody = await atlasResponse.text();
            res.status(atlasResponse.status).send(`Atlas API HTTP Error: ${atlasResponse.status} - ${errorBody}`);
            return;
        }

        // Send the successful JSON data back to the Squarespace page
        const data = await atlasResponse.json();
        res.status(200).json(data);
        
    } catch (error) {
        console.error('Proxy Fetch Error:', error);
        res.status(500).send('Internal Server Error: Failed to connect to the Atlas API.');
    }
};
