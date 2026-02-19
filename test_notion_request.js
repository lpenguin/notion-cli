import { Client } from '@notionhq/client';

const client = new Client({ auth: process.env.NOTION_TOKEN });

async function test() {
    try {
        console.log('Testing raw request to v1/databases/{id}/query...');
        const response = await client.request({
            path: 'databases/3096b2b7cea5804bad2ec6c0e54086da/query',
            method: 'POST',
            body: {}
        });
        console.log('SUCCESS! Results count:', response.results.length);
    } catch (error) {
        console.error('FAILURE:', error);
    }
}

test();
