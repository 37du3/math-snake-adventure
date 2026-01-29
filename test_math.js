const MathEngine = require('./math_engine.js');
const engine = new MathEngine();

console.log("=== Testing Math Engine ===");

['BRONZE', 'SILVER', 'GOLD', 'DIAMOND'].forEach((tier, index) => {
    console.log(`\nTesting Tier: ${tier}`);
    for (let i = 0; i < 3; i++) {
        const q = engine.generateQuestion(index);
        console.log(`[${i}] Q: ${q.text} | A: ${q.answer} | Opts: ${q.distractors.join(', ')}`);

        // Basic Validation
        if (!q.text || q.answer === undefined || !q.distractors || q.distractors.length !== 2) {
            console.error("❌ Invalid Structure");
            process.exit(1); // Fail CI
        }
    }
});
console.log("✅ All tests passed!");

