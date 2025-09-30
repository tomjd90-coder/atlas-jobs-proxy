// Vercel Serverless Function for testing purposes.
// This function ignores the Atlas API and returns a simple, hardcoded JSON response.

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

    // 3. Send back a simple, predictable JSON object for the test
    // This bypasses the Atlas API entirely.
    const testData = {
        data: {
            publicJobOpenings: {
                items: [
                    {
                        id: "test-001",
                        jobRole: "Test Job: Success!",
                        location: { name: "Vercel, UK" },
                        contractType: "Permanent",
                        salary: "100000",
                        salaryCurrency: "GBP"
                    }
                ]
            }
        }
    };
    
    // 4. Return the test data with a 200 OK status
    res.status(200).json(testData);
};
