const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const parseAIJson = (raw) => {
    if (!raw) return {};
    try {
        if (typeof raw === 'string') {
            // Next.js JSON API response actually double-serializes JSON sometimes, 
            // or returns strings with escaped quotes.
            let clean = raw.trim();
            if (clean.startsWith('```')) {
                clean = clean.replace(/^```(json)?\n?/i, '').replace(/\n?```$/i, '').trim();
            }
            return JSON.parse(clean);
        }
        return raw;
    } catch (err) {
        console.error('Failed to parse AI JSON:', err);
        return {};
    }
};

async function main() {
    const policies = await prisma.policy.findMany({ orderBy: { uploadedAt: 'desc' }, take: 1 });
    const policy = policies[0];
    console.log('--- RAW DB STRING ---');
    console.log(policy.acord_fields_json);

    // Simulate what standard Next.js NextResponse.json() does
    const serialized = JSON.parse(JSON.stringify(policy));

    console.log('--- PARSED OBJECT IN UI ---');
    const parsed = parseAIJson(serialized.acord_fields_json);
    console.log(parsed);
    console.log('--- OBJECT KEYS LENGTH ---');
    console.log(Object.keys(parsed).length);
}
main();
