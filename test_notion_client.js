import { Client } from '@notionhq/client';
const client = new Client({ auth: 'test' });
console.log('databases.retrieve:', typeof client.databases.retrieve);
console.log('databases.query:', typeof client.databases.query);
console.log('dataSources.query:', typeof client.dataSources.query);
