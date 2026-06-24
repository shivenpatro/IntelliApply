const { createAuthClient } = require('better-auth/client');

const client = createAuthClient({
    baseURL: 'https://ep-green-glade-ajuf7urf.neonauth.c-3.us-east-2.aws.neon.tech/neondb/auth'
});

console.log(Object.keys(client));
console.log(Object.keys(client.signIn));
console.log(Object.keys(client.signIn.social));
