/**
 * ATLAS JOBS PROXY SERVERLESS FUNCTION (NODE.JS)
 * * This function bypasses CORS restrictions by fetching data server-side
 * and adding the necessary 'Access-Control-Allow-Origin' header for Squarespace.
 */

// --- CONFIGURATION ---
const ATLAS_API_URL = 'https://api.recruitwithatlas.com/public-graphql';
const AGENCY_ALIAS = "pobl"; 

// --- GRAPHQL QUERY (Exact structure from documentation) ---
const ATLAS_GRAPHQL_QUERY = `
    query GetPublicJobOpenings($input: PublicJobOpeningInput!, $limit: Int!, $page: Int!) {
        publicJobOpenings(input: $input, limit: $limit, page: $page) {
            items {
                ...PublicJobOpening
                __typename
            }
            __typename
        }
    }
    
    fragment PublicJobOpening on PublicJobOpening {
        id
        jobRole
        location {
            ...Location
            __typename
        }
        contractType
        salary
        salaryCurrency
        __typename
        // REMINDER: Add the field for the application link here once confirmed (e.g., publicUrl)
    }
    
    fragment Location on Location {
        name
        country
        locality
        region
        geo
        street_address
        postal_code
        __typename
    }
`;

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
    // 1. Set CORS Headers to allow Squarespace to access the data
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
        // 2. Make the secure server-to-server POST request to Atlas API
        const atlasResponse = await fetch(ATLAS_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: getJobsPayload()
        });
        
        // 3. Check for API errors and forward the response
        if (!atlasResponse.ok) {
            const errorBody = await atlasResponse.text();
            res.status(atlasResponse.status).send(`Atlas API HTTP Error: ${atlasResponse.status} - ${errorBody}`);
            return;
        }

        // 4. Send the successful JSON data back to the Squarespace page
        const data = await atlasResponse.json();
        res.status(200).json(data);
        
    } catch (error) {
        console.error('Proxy Fetch Error:', error);
        res.status(500).send('Internal Server Error: Failed to connect to the Atlas API.');
    }
};

